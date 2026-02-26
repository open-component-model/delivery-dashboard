import sqp from 'search-query-parser'

export function buildPrefillText(prefill) {
  if (!prefill) return ''
  const s = String(prefill).trim()
  const isCVE = /^CVE-\d{4}-\d{4,}$/i.test(s)
  return isCVE
    ? `type:finding/vulnerability data.cve:${s.toUpperCase()}`
    : `type:finding/vulnerability data.package_name:*${s}*`
}

function stripQuotes(s) {
  const v = String(s ?? '').trim()
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1)
  }
  return v
}

function extractCmp(query) {
  const cmps = []
  const re = /(^|\s)(-?)([A-Za-z_][\w.]*?)\s*(>=|<=|==|!=|>|<)\s*("[^"]*"|'[^']*'|[^\s]+)/g
  const rest = (query || '').replace(re, (m, ws, neg, field, op, value) => {
    cmps.push({ neg: neg === '-', field, op, value: stripQuotes(value) })
    return ws
  })
  return { rest, cmps }
}

function extractFreeTextTerms(q) {
  const stripped = String(q || '')
    .replace(/(^|\s)-?[A-Za-z_][\w.]*:("[^"]*"|'[^']*'|[^\s]+)/g, ' ')
    .trim()

  const tokens = []
  const re = /"([^"]+)"|'([^']+)'|([^\s]+)/g
  let m
  while ((m = re.exec(stripped))) {
    const t = (m[1] || m[2] || m[3] || '').trim()
    if (t) tokens.push(t)
  }
  return tokens
}

export function parseQueryToCriteria(query, { allowedFields, rangeFields = [] }) {
  const q0 = String(query || '')
  const { rest: q1, cmps } = extractCmp(q0)

  const dynamicDataKeys = new Set(
    [...q1.matchAll(/\b(data\.[A-Za-z_][\w.]*)\s*:/g)].map(m => m[1])
  )

  const allowedSet =
    allowedFields instanceof Set ? allowedFields : new Set(Array.from(allowedFields || []))

  const keywords = new Set(['ocm', ...allowedSet, ...dynamicDataKeys])

  const options = {
    keywords: Array.from(keywords),
    ranges: rangeFields || [],
    tokenize: true,
    alwaysArray: true,
    offsets: false,
  }

  const parsed = sqp.parse(q1 || '', options) || {}

  const criteria = []
  const errors = []

  const add = (c) => criteria.push(c)
  const addAM = (attr, obj) => add({ type: 'artefact-metadata', attr, ...obj })

  // comparisons
  for (const c of cmps) {
    const isKnown = c.field.startsWith('data.') || keywords.has(c.field)
    if (!isKnown) {
      errors.push({ code: 'unknown_field', field: c.field })
      continue
    }
    if (c.field === 'ocm') {
      errors.push({ code: 'invalid_operator', field: 'ocm' })
      continue
    }

    addAM(c.field, {
      op: 'cmp',
      cmp: c.op,
      value: c.value,
      ...(c.neg ? { mode: 'exclude' } : {}),
    })
  }

  // key:value / key:[..] / ranges
  for (const field of options.keywords) {
    const v = parsed[field]
    if (v == null) continue

    // range object {from,to}
    const asRangeObj = Array.isArray(v) && v.length === 1 && typeof v[0] === 'object' ? v[0] : v
    if (asRangeObj && typeof asRangeObj === 'object' && asRangeObj.from !== undefined && asRangeObj.to !== undefined) {
      if (field === 'ocm') {
        errors.push({ code: 'invalid_operator', field: 'ocm' })
      } else {
        addAM(field, { op: 'range', gte: asRangeObj.from, lte: asRangeObj.to })
      }
      continue
    }

    const values = Array.isArray(v) ? v.map(stripQuotes) : [stripQuotes(v)]

    if (field === 'ocm') {
      values.forEach(val => add({ type: 'ocm', value: val }))
      continue
    }

    if (values.length > 1) addAM(field, { op: 'in', values })
    else addAM(field, { op: 'eq', value: values[0] })
  }

  // excludes: -field:value
  if (parsed.exclude) {
    for (const [field, v] of Object.entries(parsed.exclude)) {
      if (!keywords.has(field) && !String(field).startsWith('data.')) continue

      const values = Array.isArray(v) ? v.map(stripQuotes) : [stripQuotes(v)]

      if (field === 'ocm') {
        values.forEach(val => add({ type: 'ocm', value: val, mode: 'exclude' }))
        continue
      }

      if (values.length > 1) addAM(field, { op: 'in', values, mode: 'exclude' })
      else addAM(field, { op: 'eq', value: values[0], mode: 'exclude' })
    }
  }

  const free = extractFreeTextTerms(q1)
  const seen = new Set()
  const stop = new Set(['and', 'or', 'not'])

  for (const t0 of free) {
    let t = String(t0).trim()
    if (!t) continue

    let exclude = false
    if (t.startsWith('-') && t.length > 1) {
      exclude = true
      t = t.slice(1).trim()
      if (!t) continue
    }

    const key = t.toLowerCase()
    if (stop.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)

    add({ type: 'fulltext', value: t, ...(exclude ? { mode: 'exclude' } : {}) })
  }

  return { criteria, errors }
}
