import React from 'react'
import PropTypes from 'prop-types'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Paper,
  Popover,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SearchIcon from '@mui/icons-material/Search'

import Link from '@mui/material/Link'
import { Link as RouterLink } from 'react-router-dom'

import { getQueryFields, runSearchQuery } from '../api'
import { buildPrefillText, parseQueryToCriteria } from '../util/searchDsl'

import {
  categorisationValueToColor,
  findingCfgForType,
  findCategorisationById,
  FINDING_TYPES,
} from '../findings'

const categorisationField = 'data.severity'

// normalizes whitespace to make term matching/removal predictable.
// example: normalizeSpaces('  foo   bar \n baz  ') -> 'foo bar baz'
const normalizeSpaces = (s) => {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

// escapes a string so it can be safely embedded into a RegExp pattern.
// example: escapeRegExp('a.b*') -> 'a\\.b\\*'
const escapeRegExp = (str) => {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// quotes a value if it contains whitespace or quotes, so it stays one DSL token.
// example: quoteIfNeeded('foo bar') -> '"foo bar"'
const quoteIfNeeded = (v) => {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/[\s"]/g.test(s)) return `"${s.replaceAll('"', '\\"')}"`
  return s
}

// removes all terms for a given field (both include and exclude), regardless of value.
// example: removeFieldTerm('type:a -type:b x:y', 'type') -> 'x:y'
const removeFieldTerm = (q, field) => {
  const re = new RegExp(`(^|\\s)-?${escapeRegExp(field)}:("[^"]*"|'[^']*'|[^\\s]+)`, 'g')
  return normalizeSpaces(String(q || '').replace(re, '$1'))
}

// upserts a field term: removes existing terms for that field, then appends the new one.
// example: upsertFieldTerm('type:a x:y', 'type', 'b') -> 'x:y type:b'
const upsertFieldTerm = (q, field, value, { exclude = false } = {}) => {
  const cleaned = removeFieldTerm(q, field)
  const term = `${exclude ? '-' : ''}${field}:${value}`
  return normalizeSpaces(cleaned ? `${cleaned} ${term}` : term)
}

// removes a specific field:value token (exact token match), optionally with '-' prefix.
// example: removeFieldValueTerm('sev:LOW sev:HIGH', 'sev', 'LOW') -> 'sev:HIGH'
const removeFieldValueTerm = (q, field, valueToken) => {
  const fv = `${escapeRegExp(field)}:${escapeRegExp(valueToken)}`
  const re = new RegExp(`(^|\\s)-?${fv}(?=\\s|$)`, 'g')
  return normalizeSpaces(String(q || '').replace(re, '$1'))
}

// checks whether the query contains a specific field:value token (include or exclude).
// example: hasFieldValueTerm('-sev:LOW x:y', 'sev', 'LOW') -> true
const hasFieldValueTerm = (q, field, valueToken) => {
  const fv = `${escapeRegExp(field)}:${escapeRegExp(valueToken)}`
  const re = new RegExp(`(^|\\s)-?${fv}(?=\\s|$)`)
  return re.test(String(q || ''))
}

// Removes one pair of matching outer quotes from a token and unescapes inner quotes.
// Example: '"foo bar"' -> 'foo bar', "'a\\'b'" -> "a'b"
const unquoteToken = (t) => {
  const s = String(t || '')
  const isDoubleQuoted = s.startsWith('"') && s.endsWith('"')
  const isSingleQuoted = s.startsWith('\'') && s.endsWith('\'')

  if (isDoubleQuoted || isSingleQuoted) {
    return s.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\'', '\'')
  }

  return s
}

// extracts terms of the form field:value or -field:value from the query string.
// example: extractFieldTerms('ocm:foo:1.2.3 -ocm:"bar baz"', 'ocm')
// returns [{mode:'include', value:'foo:1.2.3'}, {mode:'exclude', value:'bar baz'}]
const extractFieldTerms = (q, field) => {
  const re = new RegExp(
    `(^|\\s)(-)?${escapeRegExp(field)}:("[^"]*"|'[^']*'|[^\\s]+)`,
    'g'
  )
  const out = []
  const s = String(q || '')
  let m
  while ((m = re.exec(s))) {
    out.push({
      mode: m[2] ? 'exclude' : 'include',
      value: unquoteToken(m[3]),
    })
  }
  return out
}

// splits an OCM scope token into component name and optional version.
// example: 'ocm.software/x:1.2.3' -> {name:'ocm.software/x', version:'1.2.3'}
const splitOcmValue = (v) => {
  const s = String(v || '').trim()
  const i = s.indexOf(':')
  if (i < 0) return { name: s, version: null }
  return { name: s.slice(0, i), version: s.slice(i + 1) || null }
}

const ensureTerm = (query, term) => {
  const normalizedQuery = normalizeSpaces(query)
  if (!normalizedQuery) return term
  if (normalizedQuery.split(' ').includes(term)) return normalizedQuery
  return normalizeSpaces(`${normalizedQuery} ${term}`)
}

const categorisationId = (categorisation) => {
  if (!categorisation) return ''
  if (typeof categorisation === 'string') return categorisation
  return categorisation.id
}

const categorisationLabel = (categorisation) => {
  if (!categorisation) return ''
  if (typeof categorisation === 'string') return categorisation
  return categorisation.display_name
}

const HelpPopover = ({ anchorEl, onClose, examples = [], onPickExample }) => {
  const open = Boolean(anchorEl)

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ p: 2, maxWidth: 760 }}>
        <Typography variant='subtitle2' gutterBottom>
          Query DSL — Syntax & Examples
        </Typography>

        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
          Short form: <b>field:value</b> · Exclude: <b>-field:value</b> · Wildcard: <b>*</b>
        </Typography>

        <Box sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {[
            'field:value',
            '-field:value',
            '',
            'Free text:',
            'kerberos   # searches in default fields (summary/cve/package/...)',
            '',
            'Combining terms:',
            '- different fields => AND (space-separated)',
            '- repeated values for the same field are supported by the query syntax',
            '',
            'Finding type:',
            'type:finding/vulnerability',
            'Severity quick-filters are available when exactly one finding type is selected.',
            '',
            'OCM scope:',
            'ocm:acme.org/my-comp              # scope by component name (any version)',
            'ocm:acme.org/my-comp:1.2.3        # scope by component name + version',
            'Include dependencies requires a versioned ocm: value.',
            '',
            'Examples:',
            'type:finding/vulnerability data.cve:CVE-2024-1234',
            `${categorisationField}:LOW ${categorisationField}:postpone`,
            'data.package_name:*openssl*',
            'data.osid.PRETTY_NAME:*Alpine*',
            'ocm:acme.org/my-comp:1.2.3',
            '-ocm:acme.org/my-comp:1.2.3',
          ].join('\n')}
        </Box>

        {examples.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle2' gutterBottom>
              Insert examples
            </Typography>

            <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
              {examples.map((ex) => (
                <Button
                  key={ex.label}
                  size='small'
                  variant='contained'
                  onClick={() => onPickExample?.(ex.q)}
                >
                  {ex.label}
                </Button>
              ))}
            </Stack>

            <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
              Tip: You can edit after inserting. Use <b>Ctrl/Cmd + Enter</b> to run.
            </Typography>
          </>
        )}
      </Box>
    </Popover>
  )
}
HelpPopover.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func.isRequired,
  examples: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      q: PropTypes.string.isRequired,
    })
  ),
  onPickExample: PropTypes.func,
}

const MetadataBrowserTab = ({ component, prefill, findingCfgs = [] }) => {
  const [query, setQuery] = React.useState(buildPrefillText(prefill))

  const [scopeRecursive, setScopeRecursive] = React.useState(false)

  const [rows, setRows] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const [fields, setFields] = React.useState([])
  const allowed = React.useMemo(() => new Set(fields.map((f) => f.name ?? f)), [fields])
  const rangeFields = React.useMemo(
    () => (fields || []).filter((f) => f.type === 'datetime').map((f) => f.name),
    [fields]
  )

  const [helpAnchor, setHelpAnchor] = React.useState(null)
  const [lint, setLint] = React.useState({ attributes: [], unknown: [] })

  const pageSize = 50
  const [cursor, setCursor] = React.useState(null)         // current page cursor
  const [nextCursor, setNextCursor] = React.useState(null) // cursor for next page
  const [cursorStack, setCursorStack] = React.useState([]) // for prev

  const ocmTerms = React.useMemo(() => extractFieldTerms(query, 'ocm'), [query])
  const includeOcmValues = React.useMemo(
    () => ocmTerms.filter((t) => t.mode !== 'exclude').map((t) => t.value),
    [ocmTerms]
  )

  const activeScope = includeOcmValues.length === 1 ? includeOcmValues[0] : null
  const activeScopeParts = React.useMemo(
    () => (activeScope ? splitOcmValue(activeScope) : null),
    [activeScope]
  )

  const hasScopeVersion = Boolean(activeScopeParts?.version)
  const hasScope = Boolean(activeScope)
  const page = cursorStack.length + 1


  React.useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const info = await getQueryFields()
        if (abort) return
        setFields(info.fields || [])
      } catch {
        setFields([
          { name: 'ocm', type: 'string', ops: ['eq'] },
          { name: 'type', type: 'string', ops: ['eq', 'in'] },
          { name: 'data.cve', type: 'string', ops: ['eq', 'in'] },
          { name: 'data.package_name', type: 'string', ops: ['eq', 'in'] },
          { name: 'meta.creation_date', type: 'datetime', ops: ['range', 'eq'] },
        ])
      }
    })()
    return () => { abort = true }
  }, [])

  React.useEffect(() => {
    if (!prefill) return
    setQuery(buildPrefillText(prefill))
  }, [prefill])

  React.useEffect(() => {
    if (!query?.trim()) {
      setLint({ attributes: [], unknown: [] })
      return
    }

    const out = parseQueryToCriteria(query, { allowedFields: allowed, rangeFields })
    const attrs = new Set()

    for (const c of out.criteria || []) {
      if (c.type === 'ocm') attrs.add('ocm')
      if (c.type === 'artefact-metadata' && c.attr) attrs.add(c.attr)
    }

    setLint({
      attributes: Array.from(attrs),
      unknown: (out.errors || [])
        .filter((e) => e?.code === 'unknown_field')
        .map((e) => e.field)
        .filter(Boolean),
    })
  }, [query, allowed, rangeFields])


  React.useEffect(() => {
    if (!hasScopeVersion && scopeRecursive) {
      setScopeRecursive(false)
      clearResults()
    }
  }, [hasScopeVersion, scopeRecursive])

  const clearResults = () => {
    setRows(null)
    setError(null)
    setCursor(null)
    setNextCursor(null)
    setCursorStack([])
  }

  const run = async ({ cursor: cursorArg = null, resetPaging = false } = {}) => {
    setLoading(true)
    setError(null)

    try {
      const out = parseQueryToCriteria(query, { allowedFields: allowed, rangeFields })
      if (out.errors?.length) {
        const unknown = out.errors
          .filter((e) => e?.code === 'unknown_field')
          .map((e) => e.field)
          .filter(Boolean)

        setError(
          unknown.length
            ? `Unknown fields: ${unknown.join(', ')}`
            : `Invalid query: ${out.errors.map((e) => e.field).filter(Boolean).join(', ') || 'check syntax'}`
        )
        setRows([])
        setNextCursor(null)
        return
      }

      if (resetPaging) {
        setCursorStack([])
        setCursor(null)
        cursorArg = null
      }

      const nonOcmCriteria = (out.criteria || []).filter((c) => c.type !== 'ocm')

      const ocmCriteria = ocmTerms.map((t) => ({
        type: 'ocm',
        value: t.value,
        ...(t.mode === 'exclude' ? { mode: 'exclude' } : {}),
        ...(t.mode !== 'exclude' ? { recursive: scopeRecursive } : {}),
      }))

      const criteriaWithRecursive = [...nonOcmCriteria, ...ocmCriteria]

      const payload = {
        criteria: criteriaWithRecursive,
        limit: pageSize,
        sort: [
          { field: 'meta.creation_date', order: 'desc' },
          { field: 'id', order: 'desc' },
        ],
        ...(cursorArg ? { cursor: cursorArg } : {}),
      }

      const res = await runSearchQuery(payload)

      setRows(res?.items || [])
      setNextCursor(res?.nextCursor || null)

      setCursor(cursorArg)
    } catch (e) {
      setError(e?.message || 'Request failed')
      setRows([])
      setNextCursor(null)
    } finally {
      setLoading(false)
    }
  }

  const selectedTypes = React.useMemo(() => {
    const terms = extractFieldTerms(query, 'type')
    return terms
      .filter((t) => t.mode !== 'exclude')
      .flatMap((t) => String(t.value || '').split(','))
      .map((v) => v.trim())
      .filter(Boolean)
  }, [query])

  const singleSelectedType = selectedTypes.length === 1 ? selectedTypes[0] : null
  const hasMultipleSelectedTypes = selectedTypes.length > 1

  const selectedFindingCfg = React.useMemo(() => {
    if (!singleSelectedType) return undefined
    return findingCfgForType({ findingType: singleSelectedType, findingCfgs })
  }, [singleSelectedType, findingCfgs])

  const availableCategorisations = React.useMemo(() => {
    const categorisations = selectedFindingCfg?.categorisations
    return Array.isArray(categorisations) ? categorisations : []
  }, [selectedFindingCfg])

  const findingTypeEntries = React.useMemo(
    () => Object.entries(FINDING_TYPES || {}).sort(([a], [b]) => a.localeCompare(b)),
    []
  )

  const setFindingType = (typeValue) => {
    setQuery((prev) => {
      let q = upsertFieldTerm(prev, 'type', typeValue)
      // clear type-specific categorisation filters to avoid stale selections
      q = removeFieldTerm(q, categorisationField)
      return q
    })
    clearResults()
  }

  const clearFindingType = () => {
    setQuery((prev) => {
      let q = removeFieldTerm(prev, 'type')
      q = removeFieldTerm(q, categorisationField)
      return q
    })
    clearResults()
  }

  const toggleCategorisation = (categorisationIdRaw) => {
    const token = quoteIfNeeded(categorisationIdRaw)
    setQuery((prev) => {
      if (hasFieldValueTerm(prev, categorisationField, token)) {
        return removeFieldValueTerm(prev, categorisationField, token)
      }
      const term = `${categorisationField}:${token}`
      return normalizeSpaces(prev ? `${prev} ${term}` : term)
    })
    clearResults()
  }

  const clearCategorisations = () => {
    setQuery((prev) => removeFieldTerm(prev, categorisationField))
    clearResults()
  }

  const insertCveTemplate = () => {
    setQuery((prev) => {
      let q = prev
      q = ensureTerm(q, 'type:finding/vulnerability')
      q = upsertFieldTerm(q, 'data.cve', 'CVE-2024-1234')
      return q
    })
    clearResults()
  }

  const insertPackageTemplate = () => {
    setQuery((prev) => {
      let q = prev
      q = ensureTerm(q, 'type:finding/vulnerability')
      q = upsertFieldTerm(q, 'data.package_name', '*openssl*')
      return q
    })
    clearResults()
  }

  const examples = React.useMemo(
    () => [
      { label: 'Vulns for CVE', q: 'type:finding/vulnerability data.cve:CVE-2024-1234' },
      { label: 'Package contains openssl', q: 'data.package_name:*openssl*' },
      { label: 'Categorisation filter', q: `${categorisationField}:HIGH ${categorisationField}:CRITICAL` },
    ],
    []
  )
  const getRowCategorisation = React.useCallback(
    (rowType, categorisationId) => {
      if (!rowType) return null
      const findingCfg = findingCfgForType({ findingType: rowType, findingCfgs })
      if (!findingCfg) return null

      return findCategorisationById({
        id: categorisationId,
        findingCfg,
      })
    },
    [findingCfgs]
  )

  const renderDetails = React.useCallback((row) => {
    const rowType = row.meta?.type ?? row.type ?? ''
    const categorisationId = row.data?.severity ?? ''
    const categorisation = getRowCategorisation(rowType, categorisationId)

    const categorisationLabel = categorisation?.display_name ?? String(categorisationId || '')
    const categorisationColor = categorisation
      ? categorisationValueToColor(categorisation.value)
      : 'default'

    const cve = row.data?.cve
    const pkg = row.data?.package_name
    const pkgVer = row.data?.package_version
    const reportUrl = row.data?.report_url

    return (
      <Stack spacing={0.5} sx={{ minWidth: 260 }}>
        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ flexWrap: 'wrap' }}>
          {categorisationId ? (
            <Chip
              size='small'
              variant='outlined'
              label={categorisationLabel}
              color={categorisationColor}
            />
          ) : null}

          {cve ? (
            <Chip
              size='small'
              variant='outlined'
              label={cve}
            />
          ) : null}

          {reportUrl ? (
            <Link
              href={reportUrl}
              target='_blank'
              rel='noreferrer'
              underline='hover'
              sx={{ fontSize: 13 }}
            >
              report
            </Link>
          ) : null}
        </Stack>

        {(pkg || pkgVer) ? (
          <Typography variant='caption' color='text.secondary' noWrap>
            {pkg ? `pkg: ${pkg}` : ''}
            {pkg && pkgVer ? ' · ' : ''}
            {pkgVer ? `ver: ${pkgVer}` : ''}
          </Typography>
        ) : null}
      </Stack>
    )
  }, [getRowCategorisation])


  const renderMetadataTooltip = React.useCallback((row) => {
    const payload = {
      meta: row.meta,
      data: row.data,
      artefact: row.artefact,
    }

    return (
      <Box sx={{ maxWidth: 700 }}>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Artefact metadata
        </Typography>
        <Box
          component='pre'
          sx={{
            m: 0,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </Box>
      </Box>
    )
  }, [])

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Stack direction='row' alignItems='center' justifyContent='space-between'>
            <Typography variant='subtitle2'>Search</Typography>

            <Stack direction='row' spacing={1} alignItems='center'>
              <Tooltip title='Help'>
                <IconButton onClick={(e) => setHelpAnchor(e.currentTarget)}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {hasScope && (
            <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                size='small'
                color='primary'
                label={`Scope: ${activeScope}${scopeRecursive ? ' (recursive)' : ''}`}
                onDelete={() => {
                  setQuery((prev) => removeFieldTerm(prev, 'ocm'))
                  clearResults()
                }}
              />
            </Stack>
          )}

          <Accordion variant='contained' sx={{ mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant='body2'>Quick filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Scope (writes <b>ocm:</b> into the query)
                  </Typography>

                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }} alignItems='center'>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={hasScope && splitOcmValue(activeScope).name === component?.name}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const term = component?.version
                                ? `${component.name}:${component.version}`
                                : component?.name
                              setQuery((prev) => upsertFieldTerm(prev, 'ocm', term))
                            } else {
                              setQuery((prev) => removeFieldTerm(prev, 'ocm'))
                            }
                            clearResults()
                          }}
                          disabled={!component?.name}
                        />
                      }
                      label='Scope to current component'
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={hasScope && !splitOcmValue(activeScope).version}
                          onChange={(e) => {
                            if (!hasScope) return
                            const { name } = splitOcmValue(activeScope)
                            const next = e.target.checked
                              ? name // any version
                              : (component?.version ? `${name}:${component.version}` : name)
                            setQuery((prev) => upsertFieldTerm(prev, 'ocm', next))
                            clearResults()
                          }}
                          disabled={!hasScope || includeOcmValues.length !== 1}
                        />
                      }
                      label='Any version'
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={scopeRecursive}
                          onChange={(e) => { setScopeRecursive(e.target.checked); clearResults() }}
                          disabled={!hasScope || includeOcmValues.length !== 1 || !hasScopeVersion}
                        />
                      }
                      label='Include dependencies'
                    />
                    {hasScope && !hasScopeVersion && (
                      <Typography variant='caption' color='text.secondary'>
                        Include dependencies requires an OCM scope with explicit version.
                      </Typography>
                    )}
                  </Stack>

                  {includeOcmValues.length > 1 && (
                    <Alert severity='info' sx={{ mt: 1 }}>
                      Multiple <b>ocm:</b> terms detected; scope chip is disabled (ambiguous).
                    </Alert>
                  )}
                </Box>

                <Divider />
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Finding type
                  </Typography>

                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {findingTypeEntries.map(([key, val]) => {
                      const selected = selectedTypes === val
                      return (
                        <Chip
                          key={key}
                          size='small'
                          label={key}
                          onClick={() => setFindingType(val)}
                          clickable
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'contained'}
                        />
                      )
                    })}

                    <Tooltip title='Clear type'>
                      <IconButton
                        size='small'
                        onClick={clearFindingType}
                        disabled={!selectedTypes}
                      >
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Severity / categorisation (depends on selected finding type)
                  </Typography>

                  {!singleSelectedType ? (
                    hasMultipleSelectedTypes ? (
                      <Typography variant='body2' color='text.secondary'>
                        Severity filter is only available when exactly one finding type is selected.
                      </Typography>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        Select a finding type to see its categorisations.
                      </Typography>
                    )
                  ) : availableCategorisations.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      No categorisations available for this type.
                    </Typography>
                  ) : (
                    <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {availableCategorisations.map((c) => {
                        const id = categorisationId(c)
                        const label = categorisationLabel(c)
                        const token = quoteIfNeeded(id)
                        const selected = hasFieldValueTerm(query, categorisationField, token)
                        const severityColor = categorisationValueToColor(c.value)

                        return (
                          <Chip
                            key={id}
                            size='small'
                            label={label}
                            onClick={() => toggleCategorisation(id)}
                            clickable
                            color={selected ? 'primary' : severityColor}
                            variant={selected ? 'filled' : 'contained'}
                          />
                        )
                      })}

                      <Tooltip title='Clear severity'>
                        <IconButton
                          size='small'
                          onClick={clearCategorisations}
                          disabled={!availableCategorisations.length}
                        >
                          <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}

                  <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                    Writes terms like <b>{categorisationField}:LOW</b> into the query.
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Templates
                  </Typography>

                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Button size='small' variant='contained' onClick={insertCveTemplate}>
                      CVE template
                    </Button>
                    <Button size='small' variant='contained' onClick={insertPackageTemplate}>
                      Package template
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 1 }}>
            <Stack spacing={1}>
              <TextField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                minRows={3}
                multiline
                fullWidth
                placeholder={`type:finding/vulnerability ${categorisationField}:HIGH data.cve:CVE-2024-1234`}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) run({ resetPaging: true })
                }}
              />

              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                {lint.attributes.map((a) => (
                  <Chip key={a} label={a} size='small' />
                ))}
              </Stack>

              {!!lint.unknown?.length && (
                <Alert severity='warning'>Unknown fields: {lint.unknown.join(', ')}</Alert>
              )}

              <Typography variant='caption' color='text.secondary'>
                Tip: Use <b>*</b> wildcards (e.g. <b>data.package_name:*openssl*</b>). Exclude with <b>-</b> (e.g. <b>-type:finding/vulnerability</b>).
                Run: <b>Ctrl/Cmd + Enter</b>.
              </Typography>
            </Stack>
          </Box>

          <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 1 }}>
            <Button variant='contained' onClick={() => run({ resetPaging: true })} disabled={loading}>
              Run
            </Button>
            <Button variant='text' onClick={clearResults} disabled={loading}>
              Clear results
            </Button>
            <Button
              variant='contained'
              onClick={() => {
                if (cursorStack.length === 0) return
                const prev = cursorStack[cursorStack.length - 1] || null
                setCursorStack((s) => s.slice(0, -1))
                run({ cursor: prev })
              }}
              disabled={loading || cursorStack.length === 0}
            >
              Prev
            </Button>

            <Button
              variant='contained'
              onClick={() => {
                if (!nextCursor) return
                setCursorStack((s) => [...s, cursor])
                run({ cursor: nextCursor })
              }}
              disabled={loading || !nextCursor}
            >
              Next
            </Button>

            <Typography variant='body2' sx={{ ml: 1 }}>
              Page {page}
            </Typography>
            {loading && <Typography variant='body2'>Running…</Typography>}
            {error && (
              <Typography variant='body2' color='error'>
                {error}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant='subtitle2' gutterBottom>
          Results
        </Typography>

        {!rows ? (
          <Typography variant='body2' color='text.secondary'>
            No query executed yet.
          </Typography>
        ) : rows.length === 0 ? (
          <Typography variant='body2'>No matches.</Typography>
        ) : (
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell>Component Version</TableCell>
                <TableCell>Artefact</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Datasource</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((r, idx) => {
                const componentName = r.artefact?.component_name
                const componentVersion = r.artefact?.component_version ?? ''
                const artefactName = r.artefact?.artefact?.artefact_name
                const artefactVersion = r.artefact?.artefact?.artefact_version ?? ''
                const artefactType = r.artefact?.artefact?.artefact_type ?? ''
                const datasource = r.meta?.datasource ?? ''
                const cve = r.data?.cve ?? ''

                const rowType = r.meta?.type ?? ''
                const queryStr = artefactName + ':' + artefactVersion

                const key = r.id ?? r.data_key ?? `${artefactName}|${artefactVersion}|${cve}|${idx}`

                const bomTo =
                  componentName
                    ? `/component?${new URLSearchParams({
                      name: componentName,
                      tab: 'view',
                      query: queryStr,
                    }).toString()}`
                    : null

                return (
                  <TableRow key={key}>
                    <TableCell>{componentName || '—'}</TableCell>
                    <TableCell>{componentVersion || '—'}</TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        {bomTo ? (
                          <Link component={RouterLink} to={bomTo} underline='hover'>
                            {artefactName}
                          </Link>
                        ) : (
                          artefactName
                        )}

                        <Tooltip
                          arrow
                          placement='left-start'
                          title={renderMetadataTooltip(r)}
                          slotProps={{
                            tooltip: {
                              sx: {
                                maxWidth: 760,
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                              },
                            },
                          }}
                        >
                          <IconButton size='small'>
                            <InfoOutlinedIcon fontSize='inherit' />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>{artefactVersion}</TableCell>
                    <TableCell>{artefactType || rowType}</TableCell>
                    <TableCell>{renderDetails(r)}</TableCell>
                    <TableCell>{datasource}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <HelpPopover
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        examples={examples}
        onPickExample={(q) => {
          setQuery(q)
          setHelpAnchor(null)
          clearResults()
        }}
      />
    </Stack>
  )
}

MetadataBrowserTab.propTypes = {
  component: PropTypes.object.isRequired,
  prefill: PropTypes.string,
  findingCfgs: PropTypes.arrayOf(PropTypes.object),
}

export default MetadataBrowserTab
