import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import SendIcon from '@mui/icons-material/Send'

import { useSnackbar } from 'notistack'
import { useTheme } from '@emotion/react'

import { artefactsQueryMetadata } from '../../api'
import { useFetchBom, useFetchScanConfigurations } from '../../api/useFetch'
import {
  artefactMetadataTypes,
  findTypedefByName,
  knownLabelNames,
  severityConfigs,
  SeverityIndicator,
} from '../../ocm/model'
import {
  artefactMetadatumSeverity,
  findSeverityCfgByName,
  matchObjectWithSearchQuery,
  mixupFindingsWithRescorings,
  NoMaxWidthTooltip,
  pluralise,
  trimLongString,
} from '../../util'
import CopyOnClickChip from '../util/CopyOnClickChip'
import { errorSnackbarProps, SEVERITIES, TOKEN_KEY } from '../../consts'
import { LoginPanel } from '../util/SettingsMenu'
import { OcmNode, OcmNodeDetails } from '../../ocm/iter'
import { BDBARescoringModal } from '../dependencies/BDBARescoring'
import { sanitiseArtefactExtraId } from '../../ocm/util'


const filterModes = {
  PERSONAL: 'personal',
  CUSTOM: 'custom',
}
Object.freeze(filterModes)


const filterForSeverity = ({
  severity,
  ocmNode,
  artefactMetadata,
}) => {
  const artefactMetadatum = findArtefactMetadatumForOcmNode(
    ocmNode,
    artefactMetadata,
  )

  const severityCfg = findSeverityCfgByName({name: severity})

  if (!artefactMetadatum) {
    const cfg = findSeverityCfgByName({name: SEVERITIES.UNKNOWN})
    return cfg.value >= severityCfg.value
  }

  const cfg = artefactMetadatumSeverity(artefactMetadatum)
  return cfg.value >= severityCfg.value
}


const SeverityFilter = ({
  setSeverityFilter,
  artefactMetadata,
  disabled,
}) => {
  const [severity, setSeverity] = React.useState(SEVERITIES.MEDIUM)

  React.useEffect(() => {
    if (!artefactMetadata) return // while loading
    setSeverityFilter(() => (ocmNode) => filterForSeverity({
      severity: severity,
      ocmNode: ocmNode,
      artefactMetadata: artefactMetadata,
    }))
  }, [setSeverityFilter, severity, artefactMetadata])

  return <FormControl variant='standard' fullWidth>
    <InputLabel>Minimum Severity</InputLabel>
    <Select
      value={artefactMetadata ? severity : 'loading'}
      label='Minimum Severity'
      onChange={(e) => setSeverity(e.target.value)}
      disabled={!artefactMetadata || disabled}
    >
      {
        artefactMetadata ? severityConfigs.filter(cfg => cfg.name !== SEVERITIES.UNKNOWN).map(severityCfg => {
          return <MenuItem
            key={severityCfg.name}
            value={severityCfg.name}
            color={severityCfg.color}
          >
            <Typography
              color={`${severityCfg.color}.main`}
              variant='body2'
            >
              {severityCfg.name}
            </Typography>
          </MenuItem>
        }) : <MenuItem
          value='loading'
        >
          <Skeleton/>
        </MenuItem>
      }
    </Select>
  </FormControl>
}
SeverityFilter.displayName = 'SeverityFilter'
SeverityFilter.propTypes = {
  setSeverityFilter: PropTypes.func.isRequired,
  artefactMetadata: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool.isRequired,
}


const TypeFilter = ({
  type,
  setType,
}) => {
  const findingTypes = [
    artefactMetadataTypes.LICENSE,
    artefactMetadataTypes.VULNERABILITY,
  ]

  return <FormControl variant='standard' fullWidth>
    <InputLabel>Finding Type</InputLabel>
    <Select
      value={type ?? artefactMetadataTypes.VULNERABILITY}
      label='Finding Type'
      onChange={(e) => setType(e.target.value)}
    >
      {
        findingTypes.map((findingType) => <MenuItem
          key={findingType}
          value={findingType}
        >
          <Typography variant='body2'>
            {
              pluralise(findTypedefByName({name: findingType}).friendlyName)
            }
          </Typography>
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
TypeFilter.displayName = 'TypeFilter'
TypeFilter.propTypes = {
  type: PropTypes.string,
  setType: PropTypes.func,
}


const FreeTextFilter = ({
  setFreeTextFilter,
  disabled,
}) => {
  const [freeText, setFreeText] = React.useState()

  React.useEffect(() => {
    if (!freeText) {
      setFreeTextFilter(null)
      return
    }

    setFreeTextFilter(() => (ocmNode) => matchObjectWithSearchQuery(
      {
        artefact: ocmNode.artefact,
        component: {
          name: ocmNode.component.name
        },
      },
      freeText,
    ))
  }, [setFreeTextFilter, freeText])

  const [searchQueryTimer, setSearchQueryTimer] = React.useState(null)

  const delayFilterUpdate = (change) => {
    if (searchQueryTimer) {
      clearTimeout(searchQueryTimer)
      setSearchQueryTimer(null)
    }
    setSearchQueryTimer(
      setTimeout(() => {
        setFreeText(change)
      }, 300)
    )
  }

  return <TextField
    onChange={(e) => delayFilterUpdate(e.target.value)}
    // filtering is expensive for large component-descriptors
    // short delay so it still feels responsive
    label='Search Artefacts, Components, or Responsibles'
    defaultValue={freeText}
    variant='standard'
    InputProps={{
      endAdornment: (
        <InputAdornment position='start'>
          <SearchIcon/>
        </InputAdornment>
      ),
    }}
    fullWidth
    disabled={disabled}
  />
}
FreeTextFilter.displayName = 'FreeTextFilter'
FreeTextFilter.propTypes = {
  setFreeTextFilter: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
}


const Filters = ({
  addOrUpdateFilter,
  removeFilter,
  artefactMetadata,
  disabled,
  type,
  setType,
}) => {
  const [freeTextFilter, setFreeTextFilter] = React.useState()
  const FREE_TEXT_FILTER_ID = 'filter-freetext'

  const [severityFilter, setSeverityFilter] = React.useState()
  const SEVERITY_FILTER_ID = 'filter-severity'

  React.useEffect(() => {
    if (freeTextFilter) {
      addOrUpdateFilter({
        id: FREE_TEXT_FILTER_ID,
        filter: freeTextFilter,
      })
    } else {
      removeFilter(FREE_TEXT_FILTER_ID)
    }

    if (severityFilter) addOrUpdateFilter({
      id: SEVERITY_FILTER_ID,
      filter: severityFilter,
    })
  }, [addOrUpdateFilter, removeFilter, SEVERITY_FILTER_ID, severityFilter, FREE_TEXT_FILTER_ID, freeTextFilter])

  return <>
    <Grid item xs={4}>
      <FreeTextFilter
        setFreeTextFilter={setFreeTextFilter}
        disabled={disabled}
      />
    </Grid>
    <Grid item xs={1.5}>
      <TypeFilter
        type={type}
        setType={setType}
      />
    </Grid>
    <Grid item xs={1.5}>
      <SeverityFilter
        setSeverityFilter={setSeverityFilter}
        artefactMetadata={artefactMetadata}
        disabled={disabled}
      />
    </Grid>
  </>
}
Filters.displayName = 'Filters'
Filters.propTypes = {
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  artefactMetadata: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool.isRequired,
  type: PropTypes.string,
  setType: PropTypes.func,
}


const ocmNodeResponsibles = (ocmNode) => {
  const label = ocmNode.findLabel(knownLabelNames.responsible)

  return label?.value.reduce((usernames, responsible) => {
    if (responsible.type === 'emailAddress') return [
      ...usernames,
      responsible.email
    ]

    if (responsible.type === 'githubUser') return [
      ...usernames,
      responsible.username
    ]

    return usernames
  }, [])
}


const findArtefactMetadatumForOcmNode = (ocmNode, artefactMetadata) => {
  return artefactMetadata.filter(am => {
    const artefactMetadataOcmNode = new OcmNode(
      [
        {
          name: am.artefact.component_name,
          version: am.artefact.component_version,
        },
      ],
      {
        name: am.artefact.artefact.artefact_name,
        version: am.artefact.artefact.artefact_version,
        extraIdentity: sanitiseArtefactExtraId(am.artefact.artefact.artefact_extra_id),
      },
      am.artefact.artefact_kind,
    )

    return artefactMetadataOcmNode.identity() === ocmNode.identity()
  }).reduce((prevAm, curAm) => {
    if (!prevAm) return curAm
    const prevSeverity = artefactMetadatumSeverity(prevAm)
    const curSeverity = artefactMetadatumSeverity(curAm)

    return curSeverity.value > prevSeverity.value ? curAm : prevAm
  }, null)
}


const ArtefactRow = ({
  ocmNode,
  artefactMetadata,
  selectedOcmNodes,
  setSelectedOcmNodes,
  ocmRepo,
}) => {
  const theme = useTheme()

  const findSeverityName = (ocmNode, artefactMetadata) => {
    const artefactMetadatum = findArtefactMetadatumForOcmNode(
      ocmNode,
      artefactMetadata,
    )

    return artefactMetadatumSeverity(artefactMetadatum).name
  }

  return <TableRow
    onClick={() => {
      if (!ocmNode || !artefactMetadata) return // still loading

      if (selectedOcmNodes.find(selectedOcmNode => selectedOcmNode.identity() === ocmNode.identity())) {
        setSelectedOcmNodes(prev => prev.filter(selectedOcmNode => selectedOcmNode.identity() !== ocmNode.identity()))
      } else {
        setSelectedOcmNodes(prev => [
          ...prev,
          ocmNode,
        ])
      }
    }}
    sx={{
      '&:hover': {
        backgroundColor: alpha(theme.palette.common.black, 0.15),
        cursor: 'pointer',
      },
    }}
  >
    <TableCell>
      {
        ocmNode && artefactMetadata
          ? <Checkbox checked={Boolean(selectedOcmNodes.find(selectedOcmNode => selectedOcmNode.identity() === ocmNode.identity()))}/>
          : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        ocmNode
          ? <Stack
            direction='row' spacing={1}
          >
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
            >
              <Typography variant='inherit'>{ocmNode.artefact.name}</Typography>
            </Box>
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
            >
              <OcmNodeDetails
                ocmNode={ocmNode}
                ocmRepo={ocmRepo}
              />
            </Box>
          </Stack>
          : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        ocmNode
          ? <CopyOnClickChip
            value={ocmNode.artefact.version}
            label={trimLongString(ocmNode.artefact.version, 12)}
            chipProps={{
              variant: 'outlined',
            }}
          />
          : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        ocmNode && artefactMetadata
          ? <SeverityIndicator
            severity={findSeverityCfgByName({name: findSeverityName(ocmNode, artefactMetadata)})}
          />
          : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        ocmNode
          ? <Typography>{ocmNodeResponsibles(ocmNode)?.join(', ')}</Typography>
          : <Skeleton/>
      }
    </TableCell>
  </TableRow>
}
ArtefactRow.displayName = 'ArtefactRow'
ArtefactRow.propTypes = {
  ocmNode: PropTypes.object,
  artefactMetadata: PropTypes.arrayOf(PropTypes.object),
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
}


const ArtefactList = ({
  ocmNodes,
  artefactMetadata,
  selectedOcmNodes,
  setSelectedOcmNodes,
  ocmRepo,
  filterMode,
}) => {
  const [order, setOrder] = React.useState('asc')
  const [orderBy, setOrderBy] = React.useState('artefact')

  const orderAttributes = {
    ARTEFACT: 'artefact',
    SEVERITY: 'severity',
    RESPONSIBILITY: 'responsibility',
  }

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(5)

  const [allowEmptySelection, setAllowEmptySelection] = React.useState(false)

  const havePersonalFilters = React.useCallback(() => {
    return (
      filterMode === filterModes.PERSONAL
      && ocmNodes
      && artefactMetadata
      && ocmNodes.length !== selectedOcmNodes.length
      && selectedOcmNodes.length === 0
    )
  }, [artefactMetadata, ocmNodes, filterMode, selectedOcmNodes.length])

  React.useEffect(() => {
    if (!havePersonalFilters()) return
    if (allowEmptySelection) return

    setSelectedOcmNodes(ocmNodes)
    setAllowEmptySelection(true)
  }, [allowEmptySelection, ocmNodes, havePersonalFilters, setSelectedOcmNodes])

  const calculateMaxPage = () => {
    if (!ocmNodes) return 0

    return parseInt(ocmNodes.length / rowsPerPage)
  }

  const resetPagination = () => {
    setRowsPerPage(5)
    setPage(0)
  }

  if (page > calculateMaxPage()) resetPagination()

  const descendingComparator = (l, r) => {
    if (r < l) {
      return -1
    }
    if (r > l) {
      return 1
    }
    return 0
  }

  const getAccessMethod = (orderBy) => {
    if (orderBy === orderAttributes.ARTEFACT) {
      return (ocmNode) => `${ocmNode.artefact.name}:${ocmNode.artefact.version}`
    } else if (orderBy === orderAttributes.SEVERITY) {
      return (ocmNode) => {
        const artefactMetadatum = findArtefactMetadatumForOcmNode(
          ocmNode,
          artefactMetadata,
        )
        return artefactMetadatumSeverity(artefactMetadatum).value
      }
    } else if (orderBy === orderAttributes.RESPONSIBILITY) {
      return (ocmNode) => ocmNodeResponsibles(ocmNode)?.length || 0
    }
  }

  const getComparator = (order, orderBy) => {
    const accessOrderByProperty = getAccessMethod(orderBy)
    return order === 'desc'
      ? (l, r) => descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
      : (l, r) => -descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
  }

  const handleSort = (orderBy) => {
    setOrder(order === 'asc' ? 'desc' : 'asc')
    setOrderBy(orderBy)
  }

  const sortData = (data, comparator) => {
    return data.sort((l ,r) => {
      return comparator(l, r)
    })
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }


  const countEmptyRows = (ocmNodes) => {
    if (!ocmNodes) return 0
    return page > 0 ? Math.max(0, (1 + page) * rowsPerPage - ocmNodes.length) : 0
  }

  const allSelected = (ocmNodes, selectedOcmNodes) => {
    return ocmNodes.every(ocmNode => selectedOcmNodes.map(s => s.identity()).includes(ocmNode.identity()))
  }

  return <Paper>
    <TableContainer>
      <Table
        stickyHeader
        sx={{
          tableLayout: 'fixed'
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              width='70em'
              onClick={() => {
                if (!ocmNodes || !artefactMetadata) return // still loading

                if (allSelected(ocmNodes, selectedOcmNodes)) {
                  setSelectedOcmNodes(prev => prev.filter(ocmNode => !ocmNodes.map(s => s.identity()).includes(ocmNode.identity())))
                  return
                }
                setSelectedOcmNodes(prev => [
                  ...prev,
                  ...ocmNodes.filter(ocmNode => !selectedOcmNodes.map(s => s.identity()).includes(ocmNode.identity()))
                ])
              }}
              sx={{
                '&:hover': {
                  cursor: 'pointer',
                },
              }}
            >
              {
                ocmNodes && artefactMetadata
                  ? <Checkbox checked={ocmNodes && allSelected(ocmNodes, selectedOcmNodes)}/>
                  : <Skeleton/>
              }
            </TableCell>
            <TableCell>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.ARTEFACT)}
                active={orderBy === orderAttributes.ARTEFACT ? true : false}
                direction={order}
              >
                Artefact
              </TableSortLabel>
            </TableCell>
            <TableCell>Version</TableCell>
            <TableCell>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.SEVERITY)}
                active={orderBy === orderAttributes.SEVERITY ? true : false}
                direction={order}
              >
                Severity
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.RESPONSIBILITY)}
                active={orderBy === orderAttributes.RESPONSIBILITY ? true : false}
                direction={order}
              >
                Responsibility
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            ocmNodes ? sortData(
              [...ocmNodes], // do not sort in place so sort stays stable
              getComparator(order, orderBy),
            )
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((ocmNode, idx) => {
                return <ArtefactRow
                  key={`${ocmNode.identity()}${idx}`}
                  ocmNode={ocmNode}
                  artefactMetadata={artefactMetadata}
                  selectedOcmNodes={selectedOcmNodes}
                  setSelectedOcmNodes={setSelectedOcmNodes}
                  ocmRepo={ocmRepo}
                />
              }) : [...Array(10).keys()].map(e => {
              return <ArtefactRow
                key={e}
                selectedOcmNodes={selectedOcmNodes}
                setSelectedOcmNodes={setSelectedOcmNodes}
                ocmRepo={ocmRepo}
              />
            })
          }
          {
            // avoid a layout jump when reaching the last page with empty rows
            countEmptyRows(ocmNodes) > 0 && <TableRow
              sx={{
                height: 75 * countEmptyRows(ocmNodes),
              }}
            >
              <TableCell colSpan={5}/>
            </TableRow>
          }
        </TableBody>
      </Table>
    </TableContainer>
    {
      ocmNodes ? <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        count={ocmNodes.length}
        rowsPerPage={rowsPerPage}
        page={page > calculateMaxPage() ? 0 : page} // ensure page does not exceed limit
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> : <Skeleton/>
    }
  </Paper>
}
ArtefactList.displayName = 'ArtefactList'
ArtefactList.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object),
  artefactMetadata: PropTypes.arrayOf(PropTypes.object),
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
  filterMode: PropTypes.string.isRequired,
}


const Header = ({
  addOrUpdateFilter,
  removeFilter,
  artefactMetadata,
  selectedOcmNodes,
  filterMode,
  toggleFilterMode,
  setMountRescoring,
  type,
  setType,
}) => {
  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

  return <Box>
    <Grid container spacing={2}>
      <Filters
        addOrUpdateFilter={addOrUpdateFilter}
        removeFilter={removeFilter}
        artefactMetadata={artefactMetadata}
        disabled={filterMode === filterModes.PERSONAL}
        type={type}
        setType={setType}
      />
      <Grid item xs={2}>
        <Box
          display='flex'
          justifyContent='center'
          padding={1}
        >
          <FormGroup>
            <Tooltip
              title={`Filter Artefacts for Component-Descriptor Responsibility-Label (${token?.sub}, ${token?.github_oAuth.email_address}) and Severity of MEDIUM or worse.`}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={filterMode === filterModes.PERSONAL}
                    onChange={() => toggleFilterMode()}
                  />
                }
                label='My Action Items'
              />
            </Tooltip>
          </FormGroup>
        </Box>
      </Grid>
      <Grid item xs={3} justifyContent='center' alignItems='center' display='flex'>
        <NoMaxWidthTooltip
          title={selectedOcmNodes.length === 0 ? 'Select at least one Artefact' : <Box
            maxHeight='50vh'
            overflow='auto'
          >
            <List>
              {
                selectedOcmNodes.sort((left, right) => left.name().localeCompare(right.name())).map((ocmNode, idx) => <ListItem
                  key={`${ocmNode.identity()}${idx}`}
                >
                  <Stack
                    direction='row'
                    spacing={1}
                  >
                    <Box
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                    >
                      <Typography variant='body2'>{ocmNode.artefact.name}</Typography>
                    </Box>
                    <Box
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                    >
                      <CopyOnClickChip
                        value={ocmNode.artefact.version}
                        label={trimLongString(ocmNode.artefact.version, 12)}
                        chipProps={{
                          variant: 'filled',
                          size: 'small',
                          sx: {
                            '& .MuiChip-label': {
                              color: 'white'
                            }
                          }
                        }}
                      />
                    </Box>
                  </Stack>
                </ListItem>)
              }
            </List>
          </Box>}
        >
          <span>
            <Button
              color='secondary'
              disabled={selectedOcmNodes.length === 0}
              fullWidth
              onClick={() => setMountRescoring(true)}
              endIcon={<SendIcon/>}
            >
              {
                `Rescore Selected Artefacts (${selectedOcmNodes.length})`
              }
            </Button>
          </span>
        </NoMaxWidthTooltip>
      </Grid>
    </Grid>
  </Box>
}
Header.displayName = 'Header'
Header.propTypes = {
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  artefactMetadata: PropTypes.arrayOf(PropTypes.object),
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  filterMode: PropTypes.string.isRequired,
  toggleFilterMode: PropTypes.func.isRequired,
  setMountRescoring: PropTypes.func.isRequired,
  type: PropTypes.string,
  setType: PropTypes.func,
}


const Artefacts = ({
  components,
  ocmNodes,
  addOrUpdateFilter,
  selectedOcmNodes,
  setSelectedOcmNodes,
  ocmRepo,
  filterMode,
  toggleFilterMode,
  personalFilters,
  setPersonalFilters,
  mountRescoring,
  setMountRescoring,
  removeFilter,
  type,
  setType,
}) => {
  const { enqueueSnackbar } = useSnackbar()

  const [artefactMetadata, setArtefactMetadata] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)
  const [scanConfigs] = useFetchScanConfigurations()

  const fetchQueryMetadata = React.useCallback(async () => {
    try {
      const findings = await artefactsQueryMetadata({
        components: components,
        types: [type],
      })
      const rescorings = await artefactsQueryMetadata({
        components: components,
        types: [artefactMetadataTypes.RESCORINGS],
        referenced_types: [type],
      })

      setArtefactMetadata(mixupFindingsWithRescorings(findings, rescorings))
      setIsLoading(false)
      setIsError(false)
    } catch (error) {
      setIsLoading(false)
      setIsError(true)

      enqueueSnackbar('Unable to fetch artefact metadata', {
        ...errorSnackbarProps,
        details: error.toString(),
        onRetry: () => fetchQueryMetadata(),
      })
    }
  }, [components, type, enqueueSnackbar])

  React.useEffect(() => {
    fetchQueryMetadata()
  }, [fetchQueryMetadata])

  React.useEffect(() => {
    if (!artefactMetadata) return

    const token = JSON.parse(localStorage.getItem(TOKEN_KEY))
    setPersonalFilters([
      {
        id: 'filter-responsibility',
        filter: (ocmNode) => {
          const label = ocmNode.findLabel(knownLabelNames.responsible)
          if (!label) return false

          return label.value.some(v => (
            v.username === token.sub
            || v.email === token.github_oAuth.email_address
          ))
        }
      },
      {
        id: 'filter-severity',
        filter: (an) => filterForSeverity({
          severity: SEVERITIES.MEDIUM,
          ocmNode: an,
          artefactMetadata: artefactMetadata,
        }),
      },
    ])
  }, [artefactMetadata, setPersonalFilters])

  if (isError) return <Alert severity='error'>Unable to load Artefact Metadata</Alert>

  if (isLoading || personalFilters.length === 0) return <Box>
    <Header
      addOrUpdateFilter={addOrUpdateFilter}
      removeFilter={removeFilter}
      selectedOcmNodes={selectedOcmNodes}
      filterMode={filterMode}
      toggleFilterMode={toggleFilterMode}
      setMountRescoring={setMountRescoring}
    />
    <div style={{ padding: '1em' }} />
    <ArtefactList
      ocmNodes={ocmNodes}
      selectedOcmNodes={selectedOcmNodes}
      setSelectedOcmNodes={setSelectedOcmNodes}
      ocmRepo={ocmRepo}
      toggleFilterMode={toggleFilterMode}
      filterMode={filterMode}
    />
  </Box>

  return <Box>
    {
      mountRescoring && <BDBARescoringModal
        ocmNodes={selectedOcmNodes}
        ocmRepo={ocmRepo}
        type={type}
        handleClose={() => setMountRescoring(false)}
        fetchComplianceData={fetchQueryMetadata}
        scanConfig={scanConfigs?.length === 1 ? scanConfigs[0] : null}
      />
    }
    <Header
      addOrUpdateFilter={addOrUpdateFilter}
      removeFilter={removeFilter}
      artefactMetadata={artefactMetadata}
      selectedOcmNodes={selectedOcmNodes}
      filterMode={filterMode}
      toggleFilterMode={toggleFilterMode}
      setMountRescoring={setMountRescoring}
      type={type}
      setType={setType}
    />
    <div style={{ padding: '1em' }} />
    {
      ocmNodes.length > 0 ? <ArtefactList
        ocmNodes={ocmNodes}
        artefactMetadata={artefactMetadata}
        selectedOcmNodes={selectedOcmNodes}
        setSelectedOcmNodes={setSelectedOcmNodes}
        ocmRepo={ocmRepo}
        filterMode={filterMode}
      /> : <Box
        display='flex'
        justifyContent='center'
      >
        {
          filterMode === filterModes.PERSONAL
            ? <Typography>No open findings, good job! {String.fromCodePoint('0x1F973')} {/* "Party-Face" symbol */}</Typography>
            : <Typography>No Artefacts matching Filters</Typography>
        }
      </Box>
    }
  </Box>
}
Artefacts.displayName = 'Artefacts'
Artefacts.propTypes = {
  components: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
  filterMode: PropTypes.string.isRequired,
  toggleFilterMode: PropTypes.func.isRequired,
  setPersonalFilters: PropTypes.func.isRequired,
  setMountRescoring: PropTypes.func.isRequired,
  mountRescoring: PropTypes.bool.isRequired,
  personalFilters: PropTypes.arrayOf(PropTypes.object).isRequired,
  type: PropTypes.string,
  setType: PropTypes.func,
}


const ComplianceTab = ({
  component,
  ocmRepo,
}) => {
  // eslint-disable-next-line no-unused-vars
  const [dependencies, isLoading, isError, error] = useFetchBom(
    component,
    ocmRepo,
    'all',
  )

  const [type, setType] = React.useState(artefactMetadataTypes.VULNERABILITY)
  const [filterMode, setFilterMode] = React.useState(filterModes.CUSTOM)

  const [personalFilters, setPersonalFilters] = React.useState([]) // init "lazy" as artefact-metadata must be present
  const [customFilters, setCustomFilters] = React.useState([])

  const [selectedOcmNodes, setSelectedOcmNodes] = React.useState([])
  const [customSelectedOcmNodes, setCustomSelectedOcmNodes] = React.useState([])

  const selected = filterMode === filterModes.CUSTOM ? customSelectedOcmNodes : selectedOcmNodes
  const setSelected = filterMode === filterModes.CUSTOM ? setCustomSelectedOcmNodes : setSelectedOcmNodes

  const [mountRescoring, setMountRescoring] = React.useState(false)

  const addOrUpdateFilter = React.useCallback((filter) => {
    setCustomFilters(prev => {
      return [
        ...prev.filter(f => f.id !== filter.id),
        filter,
      ]
    })
  }, [])

  const removeFilter = React.useCallback((filterID) => {
    setCustomFilters(prev => prev.filter(f => f.id !== filterID))
  }, [])

  const filterOcmNodes = React.useCallback((ocmNodes) => {
    const getFilters = () => {
      if (filterMode === filterModes.PERSONAL && personalFilters.length > 0) return personalFilters
      return customFilters
    }

    if (getFilters().length === 0) return ocmNodes

    return getFilters().reduce((ocmNodes, filter) => {
      return ocmNodes.filter(ocmNode => filter.filter(ocmNode))
    }, ocmNodes)
  }, [personalFilters, customFilters, filterMode])

  React.useEffect(() => {
    setSelectedOcmNodes([])
    setCustomSelectedOcmNodes([])
  }, [type])

  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

  if (!token) return <Box
    display='flex'
    justifyContent='center'
    alignItems='center'
  >
    <List>
      <Typography>
        Log in to apply rescorings
      </Typography>
      <LoginPanel token={token}/>
    </List>
  </Box>

  if (isError) return <Alert severity='error'>
    Unable to load Components
  </Alert>

  if (isLoading) return <Box>
    <Header
      addOrUpdateFilter={addOrUpdateFilter}
      removeFilter={removeFilter}
      selectedOcmNodes={selected}
      filterMode={filterMode}
      toggleFilterMode={() => setFilterMode(prev => {
        if (prev === filterModes.CUSTOM) return filterModes.PERSONAL
        return filterModes.CUSTOM
      })}
      setMountRescoring={setMountRescoring}
      type={type}
      setType={setType}
    />
    <div style={{ padding: '1em' }} />
    <ArtefactList
      selectedOcmNodes={selected}
      setSelectedOcmNodes={setSelected}
      ocmRepo={ocmRepo}
      filterMode={filterMode}
    />
  </Box>

  const components = dependencies.componentDependencies
  const ocmNodes = components.reduce((nodes, component) => {
    return [
      ...nodes,
      ...component.resources.map(resource => new OcmNode(
        [component],
        resource,
        'resource'
      )),
      ...component.sources.map(source => new OcmNode(
        [component],
        source,
        'source'
      )),
    ]
  }, [])

  return <Artefacts
    components={components}
    ocmNodes={filterOcmNodes(ocmNodes)}
    addOrUpdateFilter={addOrUpdateFilter}
    removeFilter={removeFilter}
    selectedOcmNodes={selected}
    setSelectedOcmNodes={setSelected}
    ocmRepo={ocmRepo}
    filterMode={filterMode}
    toggleFilterMode={() => setFilterMode(prev => {
      if (prev === filterModes.CUSTOM) return filterModes.PERSONAL
      return filterModes.CUSTOM
    })}
    setPersonalFilters={setPersonalFilters}
    personalFilters={personalFilters}
    mountRescoring={mountRescoring}
    setMountRescoring={setMountRescoring}
    type={type}
    setType={setType}
  />
}
ComplianceTab.displayName = 'ComplianceTab'
ComplianceTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}

export default ComplianceTab
