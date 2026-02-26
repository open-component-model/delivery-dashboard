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
import SearchIcon from '@mui/icons-material/Search'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

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
function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

// escapes a string so it can be safely embedded into a RegExp pattern.
// example: escapeRegExp('a.b*') -> 'a\\.b\\*'
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// quotes a value if it contains whitespace or quotes, so it stays one DSL token.
// example: quoteIfNeeded('foo bar') -> '"foo bar"'
function quoteIfNeeded(v) {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/[\s"]/g.test(s)) return `"${s.replaceAll('"', '\\"')}"`
  return s
}

// removes all terms for a given field (both include and exclude), regardless of value.
// example: removeFieldTerm('type:a -type:b x:y', 'type') -> 'x:y'
function removeFieldTerm(q, field) {
  const re = new RegExp(`(^|\\s)-?${escapeRegExp(field)}:("[^"]*"|'[^']*'|[^\\s]+)`, 'g')
  return normalizeSpaces(String(q || '').replace(re, '$1'))
}

// upserts a field term: removes existing terms for that field, then appends the new one.
// example: upsertFieldTerm('type:a x:y', 'type', 'b') -> 'x:y type:b'
function upsertFieldTerm(q, field, value, { exclude = false } = {}) {
  const cleaned = removeFieldTerm(q, field)
  const term = `${exclude ? '-' : ''}${field}:${value}`
  return normalizeSpaces(cleaned ? `${cleaned} ${term}` : term)
}

// removes a specific field:value token (exact token match), optionally with '-' prefix.
// example: removeFieldValueTerm('sev:LOW sev:HIGH', 'sev', 'LOW') -> 'sev:HIGH'
function removeFieldValueTerm(q, field, valueToken) {
  const fv = `${escapeRegExp(field)}:${escapeRegExp(valueToken)}`
  const re = new RegExp(`(^|\\s)-?${fv}(?=\\s|$)`, 'g')
  return normalizeSpaces(String(q || '').replace(re, '$1'))
}

// checks whether the query contains a specific field:value token (include or exclude).
// example: hasFieldValueTerm('-sev:LOW x:y', 'sev', 'LOW') -> true
function hasFieldValueTerm(q, field, valueToken) {
  const fv = `${escapeRegExp(field)}:${escapeRegExp(valueToken)}`
  const re = new RegExp(`(^|\\s)-?${fv}(?=\\s|$)`)
  return re.test(String(q || ''))
}

// returns the last value used for a given field (if multiple terms exist).
// example: getSingleFieldValue('type:a type:b', 'type') -> 'b'
function getSingleFieldValue(q, field) {
  const re = new RegExp(`(^|\\s)${escapeRegExp(field)}:("[^"]*"|'[^']*'|[^\\s]+)`, 'g')
  const s = String(q || '')
  let m
  let last = null
  while ((m = re.exec(s))) last = m[2]
  return last
}

function ensureTerm(query, term) {
  const normalizedQuery = normalizeSpaces(query)
  if (!normalizedQuery) return term
  if (normalizedQuery.split(' ').includes(term)) return normalizedQuery
  return normalizeSpaces(`${normalizedQuery} ${term}`)
}

function buildScopeTerm(component) {
  if (!component?.name) return null
  return component.name
}

function catId(cat) {
  if (!cat) return ''
  if (typeof cat === 'string') return cat
  return cat.id
}

function catLabel(cat) {
  if (!cat) return ''
  if (typeof cat === 'string') return cat
  return cat.display_name
}

function HelpPopover({ anchorEl, onClose, examples = [], onPickExample }) {
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
          {`field:value
          -field:value

          Free text:
          kerberos   # searches in default fields (summary/cve/package/...)

          Combining terms:
          - different fields => AND (space-separated)
          - same field with multiple values => OR (comma-separated)

          Examples:
          type:finding/vulnerability data.cve:CVE-2024-1234
          type:finding/vulnerability,finding/osid
          ${categorisationField}:LOW ${categorisationField}:postpone
          data.package_name:*openssl*
          data.osid.PRETTY_NAME:*Alpine*
          -ocm:acme.org/my-comp:1.2.3`}
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

  const scopeTerm = React.useMemo(() => buildScopeTerm(component), [component])
  const [scopeEnabled, setScopeEnabled] = React.useState(Boolean(scopeTerm))

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

  const clearResults = () => {
    setRows(null)
    setError(null)
    setCursor(null)
    setNextCursor(null)
    setCursorStack([])
  }


  const applyScope = (baseCriteria) => {
    if (!scopeEnabled || !scopeTerm) return baseCriteria || []

    const keep = (baseCriteria || []).filter(
      (c) => !(c.type === 'ocm' && c.mode !== 'exclude')
    )

    return [...keep, { type: 'ocm', value: scopeTerm }]
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

      const finalCriteria = applyScope(out.criteria || [])

      const payload = {
        criteria: finalCriteria,
        limit: pageSize, // <= 50 default
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

  const selectedType = React.useMemo(() => getSingleFieldValue(query, 'type'), [query])

  const selectedFindingCfg = React.useMemo(() => {
    if (!selectedType) return undefined
    return findingCfgForType({ findingType: selectedType, findingCfgs })
  }, [selectedType, findingCfgs])

  const availableCategorisations = React.useMemo(() => {
    const cats = selectedFindingCfg?.categorisations
    return Array.isArray(cats) ? cats : []
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

  const toggleCategorisation = (catIdRaw) => {
    const token = quoteIfNeeded(catIdRaw)
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

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Stack direction='row' alignItems='center' justifyContent='space-between'>
            <Typography variant='subtitle2'>Search</Typography>

            <Stack direction='row' spacing={1} alignItems='center'>
              <FormControlLabel
                control={
                  <Switch
                    checked={scopeEnabled}
                    onChange={(e) => setScopeEnabled(e.target.checked)}
                    disabled={!scopeTerm}
                  />
                }
                label='Scope to current component'
              />

              <Tooltip title='Help'>
                <IconButton onClick={(e) => setHelpAnchor(e.currentTarget)}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {scopeEnabled && scopeTerm && (
            <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                size='small'
                color='primary'
                label={`Scope: ${scopeTerm}`}
                onDelete={() => setScopeEnabled(false)}
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
                    Finding type (single select)
                  </Typography>

                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {findingTypeEntries.map(([key, val]) => {
                      const selected = selectedType === val
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

                    <Chip
                      size='small'
                      variant='contained'
                      label='Clear type'
                      onClick={clearFindingType}
                      clickable
                    />
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Severity / categorisation (depends on selected finding type)
                  </Typography>

                  {!selectedType ? (
                    <Typography variant='body2' color='text.secondary'>
                      Select a finding type to see its categorisations.
                    </Typography>
                  ) : availableCategorisations.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      No categorisations available for this type.
                    </Typography>
                  ) : (
                    <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {availableCategorisations.map((c) => {
                        const id = catId(c)
                        const label = catLabel(c)
                        const token = quoteIfNeeded(id)
                        const selected = hasFieldValueTerm(query, categorisationField, token)
                        const sevColor = categorisationValueToColor(c.value)

                        return (
                          <Chip
                            key={id}
                            size='small'
                            label={label}
                            onClick={() => toggleCategorisation(id)}
                            clickable
                            color={selected ? 'primary' : sevColor}
                            variant={selected ? 'filled' : 'contained'}
                          />
                        )
                      })}

                      <Chip
                        size='small'
                        variant='contained'
                        label='Clear severity'
                        onClick={clearCategorisations}
                        clickable
                      />
                    </Stack>
                  )}

                  <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                    Writes terms like <b>{categorisationField}:LOW</b> into the query (uses categorisation <b>id</b>, not numeric value).
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
                <TableCell>Artefact</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>CVE</TableCell>
                <TableCell>Datasource</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((r, idx) => {
                const componentName = r.artefact?.component_name
                const artefactName = r.artefact?.artefact?.artefact_name
                const artefactVersion = r.artefact?.artefact?.artefact_version ?? ''
                const artefactType = r.artefact?.artefact?.artefact_type ?? ''
                const datasource = r.meta?.datasource ?? ''
                const cve = r.data?.cve ?? ''
                const reportUrl = r.data?.report_url

                const rowType = r.meta?.type ?? r.type ?? ''
                const categorisationId = r.data?.severity ?? ''
                const categorisation = getRowCategorisation(rowType, categorisationId)

                const catLabel = categorisation?.display_name ?? String(categorisationId || '')
                const catColor = categorisation
                  ? categorisationValueToColor(categorisation.value)
                  : 'default'
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
                    <TableCell>
                      {bomTo ? (
                        <Link component={RouterLink} to={bomTo} underline='hover'>
                          {artefactName}
                        </Link>
                      ) : (
                        artefactName
                      )}
                    </TableCell>
                    <TableCell>{artefactVersion}</TableCell>
                    <TableCell>{artefactType || rowType}</TableCell>
                    <TableCell>
                      {categorisationId ?
                        <Chip
                          size='small'
                          variant='outlined'
                          label={catLabel}
                          color={catColor}
                        /> : null}
                    </TableCell>
                    <TableCell>
                      {cve}
                      {reportUrl && (
                        <>
                          {' '}
                          ·{' '}
                          <a href={reportUrl} target='_blank' rel='noreferrer'>
                            report
                          </a>
                        </>
                      )}
                    </TableCell>
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
