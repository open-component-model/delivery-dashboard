import React from 'react'

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

import PropTypes from 'prop-types'
import { useTheme } from '@emotion/react'

import { SearchParamContext } from '../App'
import {
  useFetchComplianceSummary,
  useFetchComponentResponsibles,
  useFetchScanConfigurations,
} from '../fetch'
import {
  artefactMetadataTypes,
  findTypedefByName,
  severityConfigs,
  SeverityIndicator,
} from '../ocm/model'
import {
  findSeverityCfgByName,
  matchObjectWithSearchQuery,
  NoMaxWidthTooltip,
  pluralise,
  trimLongString,
} from '../util'
import CopyOnClickChip from '../util/copyOnClickChip'
import {
  SEVERITIES,
  TOKEN_KEY,
  USER_IDENTITIES,
} from '../consts'
import { OcmNode, OcmNodeDetails } from '../ocm/iter'
import { RescoringModal } from '../rescoring'


const filterModes = {
  PERSONAL: 'personal',
  CUSTOM: 'custom',
}
Object.freeze(filterModes)


const filterForSeverity = ({
  severity,
  aggregatedOcmNode,
}) => {
  const severityCfg = findSeverityCfgByName({name: severity})
  const ocmNodeSeverityCfg = findSeverityCfgByName({name: aggregatedOcmNode.severity})

  return ocmNodeSeverityCfg.value >= severityCfg.value
}


const SeverityFilter = ({
  setSeverityFilter,
  disabled,
}) => {
  const [severity, setSeverity] = React.useState(SEVERITIES.MEDIUM)

  React.useEffect(() => {
    setSeverityFilter(() => (aggregatedOcmNode) => filterForSeverity({
      severity: severity,
      aggregatedOcmNode: aggregatedOcmNode,
    }))
  }, [setSeverityFilter, severity])

  return <FormControl variant='standard' fullWidth>
    <InputLabel>Minimum Severity</InputLabel>
    <Select
      value={severity}
      label='Minimum Severity'
      onChange={(e) => setSeverity(e.target.value)}
      disabled={disabled}
    >
      {
        severityConfigs.filter(cfg => cfg.name !== SEVERITIES.UNKNOWN).map(severityCfg => {
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
        })
      }
    </Select>
  </FormControl>
}
SeverityFilter.displayName = 'SeverityFilter'
SeverityFilter.propTypes = {
  setSeverityFilter: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
}


const TypeFilter = ({
  type,
  setType,
}) => {
  const findingTypes = [
    artefactMetadataTypes.LICENSE,
    artefactMetadataTypes.VULNERABILITY,
    artefactMetadataTypes.FINDING_MALWARE,
    artefactMetadataTypes.FINDING_FIPS,
  ]

  return <FormControl variant='standard' fullWidth>
    <InputLabel>Finding Type</InputLabel>
    <Select
      value={type}
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
  type: PropTypes.string.isRequired,
  setType: PropTypes.func.isRequired,
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

    setFreeTextFilter(() => (aggregatedOcmNode) => matchObjectWithSearchQuery(
      {
        artefact: aggregatedOcmNode.ocmNode.artefact,
        component: {
          name: aggregatedOcmNode.ocmNode.component.name
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
        disabled={disabled}
      />
    </Grid>
  </>
}
Filters.displayName = 'Filters'
Filters.propTypes = {
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  type: PropTypes.string.isRequired,
  setType: PropTypes.func.isRequired,
}


const ArtefactRow = ({
  aggregatedOcmNode,
  selectedAggregatedOcmNodes,
  setSelectedAggregatedOcmNodes,
  ocmRepo,
}) => {
  const theme = useTheme()

  return <TableRow
    onClick={() => {
      if (!aggregatedOcmNode) return // still loading

      if (selectedAggregatedOcmNodes.some((selectedAggregatedOcmNode) => {
        return selectedAggregatedOcmNode.ocmNode.identity() === aggregatedOcmNode.ocmNode.identity()
      })) {
        // node has already been selected, thus remove selection
        setSelectedAggregatedOcmNodes((prev) => prev.filter((selectedAggregatedOcmNode) => {
          return selectedAggregatedOcmNode.ocmNode.identity() !== aggregatedOcmNode.ocmNode.identity()
        }))
      } else {
        // node has not been selected yet, thus add selection
        setSelectedAggregatedOcmNodes((prev) => [
          ...prev,
          aggregatedOcmNode,
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
      <Checkbox
        checked={aggregatedOcmNode && selectedAggregatedOcmNodes.some((selectedAggregatedOcmNode) => {
          return selectedAggregatedOcmNode.ocmNode.identity() === aggregatedOcmNode.ocmNode.identity()
        })}
      />
    </TableCell>
    <TableCell>
      {
        aggregatedOcmNode ? <Stack direction='row' spacing={1}>
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
          >
            <Typography variant='inherit'>{aggregatedOcmNode.ocmNode.artefact.name}</Typography>
          </Box>
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
          >
            <OcmNodeDetails
              ocmNode={aggregatedOcmNode.ocmNode}
              ocmRepo={ocmRepo}
            />
          </Box>
        </Stack> : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        aggregatedOcmNode ? <CopyOnClickChip
          value={aggregatedOcmNode.ocmNode.artefact.version}
          label={trimLongString(aggregatedOcmNode.ocmNode.artefact.version, 12)}
          chipProps={{
            variant: 'outlined',
          }}
        /> : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        aggregatedOcmNode ? <SeverityIndicator
          severity={findSeverityCfgByName({name: aggregatedOcmNode.severity})}
        /> : <Skeleton/>
      }
    </TableCell>
    <TableCell>
      {
        aggregatedOcmNode?.responsibles ? <Typography>
          {
            aggregatedOcmNode.responsibles.filter((responsible) => {
              return responsible.personalName
            }).map((responsible) => {
              return responsible.personalName
            }).join(', ')
          }
        </Typography> : <Skeleton/>
      }
    </TableCell>
  </TableRow>
}
ArtefactRow.displayName = 'ArtefactRow'
ArtefactRow.propTypes = {
  aggregatedOcmNode: PropTypes.object,
  selectedAggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedAggregatedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
}


const ArtefactList = ({
  aggregatedOcmNodes,
  selectedAggregatedOcmNodes,
  setSelectedAggregatedOcmNodes,
  ocmRepo,
}) => {
  const [order, setOrder] = React.useState('asc')
  const [orderBy, setOrderBy] = React.useState('artefact')

  const orderAttributes = {
    ARTEFACT: 'artefact',
    SEVERITY: 'severity',
  }

  const initialRowsPerPage = 10
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(initialRowsPerPage)
  const maxPage = aggregatedOcmNodes ? parseInt(aggregatedOcmNodes.length / rowsPerPage) : 0

  const resetPagination = () => {
    setRowsPerPage(initialRowsPerPage)
    setPage(0)
  }

  if (page > maxPage) resetPagination()

  const descendingComparator = (l, r) => {
    if (r < l) return -1
    if (r > l) return 1
    return 0
  }

  const getAccessMethod = (orderBy) => {
    if (orderBy === orderAttributes.ARTEFACT) {
      return (aggregatedOcmNode) => `${aggregatedOcmNode.ocmNode.artefact.name}:${aggregatedOcmNode.ocmNode.artefact.version}`
    } else if (orderBy === orderAttributes.SEVERITY) {
      return (aggregatedOcmNode) => findSeverityCfgByName({name: aggregatedOcmNode.severity}).value
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

  const countEmptyRows = (aggregatedOcmNodes) => {
    return page > 0 ? Math.max(0, (1 + page) * rowsPerPage - aggregatedOcmNodes.length) : 0
  }

  const allSelected = (aggregatedOcmNodes, selectedAggregatedOcmNodes) => {
    return aggregatedOcmNodes.every((aggregatedOcmNode) => {
      return selectedAggregatedOcmNodes.map((s) => s.ocmNode.identity()).includes(aggregatedOcmNode.ocmNode.identity())
    })
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
                if (!aggregatedOcmNodes) return // still loading

                if (allSelected(aggregatedOcmNodes, selectedAggregatedOcmNodes)) {
                  setSelectedAggregatedOcmNodes([])
                } else {
                  setSelectedAggregatedOcmNodes([...aggregatedOcmNodes])
                }
              }}
              sx={{
                '&:hover': {
                  cursor: 'pointer',
                },
              }}
            >
              <Checkbox checked={aggregatedOcmNodes && allSelected(aggregatedOcmNodes, selectedAggregatedOcmNodes)}/>
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
              Responsibility
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            aggregatedOcmNodes ? sortData(
              [...aggregatedOcmNodes], // do not sort in place so sort stays stable
              getComparator(order, orderBy),
            ).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((aggregatedOcmNode) => <ArtefactRow
              key={aggregatedOcmNode.ocmNode.identity()}
              aggregatedOcmNode={aggregatedOcmNode}
              selectedAggregatedOcmNodes={selectedAggregatedOcmNodes}
              setSelectedAggregatedOcmNodes={setSelectedAggregatedOcmNodes}
              ocmRepo={ocmRepo}
            />) : Array.from(Array(initialRowsPerPage).keys()).map((key) => <ArtefactRow
              key={key}
              selectedAggregatedOcmNodes={selectedAggregatedOcmNodes}
              setSelectedAggregatedOcmNodes={setSelectedAggregatedOcmNodes}
              ocmRepo={ocmRepo}
            />)
          }
          {
            // avoid a layout jump when reaching the last page with empty rows
            countEmptyRows(aggregatedOcmNodes) > 0 && <TableRow
              sx={{
                height: 75 * countEmptyRows(aggregatedOcmNodes),
              }}
            >
              <TableCell colSpan={5}/>
            </TableRow>
          }
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={[10, 25, 50]}
      component='div'
      count={aggregatedOcmNodes ? aggregatedOcmNodes.length : initialRowsPerPage}
      rowsPerPage={rowsPerPage}
      page={page > maxPage ? 0 : page} // ensure page does not exceed limit
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
    />
  </Paper>
}
ArtefactList.displayName = 'ArtefactList'
ArtefactList.propTypes = {
  aggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object),
  selectedAggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedAggregatedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
}


const Header = ({
  addOrUpdateFilter,
  removeFilter,
  selectedAggregatedOcmNodes,
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
              title={`Filter artefacts for your responsibility (${token?.sub}, ${token?.github_oAuth.email_address}) and severity of MEDIUM or worse.`}
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
          title={selectedAggregatedOcmNodes.length === 0 ? 'Select at least one artefact' : <Box
            maxHeight='50vh'
            overflow='auto'
          >
            <List>
              {
                selectedAggregatedOcmNodes.sort((left, right) => {
                  return left.ocmNode.name().localeCompare(right.ocmNode.name())
                }).map((aggregatedOcmNode) => <ListItem
                  key={aggregatedOcmNode.ocmNode.identity()}
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
                      <Typography variant='body2'>{aggregatedOcmNode.ocmNode.artefact.name}</Typography>
                    </Box>
                    <Box
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                    >
                      <CopyOnClickChip
                        value={aggregatedOcmNode.ocmNode.artefact.version}
                        label={trimLongString(aggregatedOcmNode.ocmNode.artefact.version, 12)}
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
              disabled={selectedAggregatedOcmNodes.length === 0}
              fullWidth
              onClick={() => setMountRescoring(true)}
              endIcon={<SendIcon/>}
            >
              {
                `Rescore Selected Artefacts (${selectedAggregatedOcmNodes.length})`
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
  selectedAggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  filterMode: PropTypes.string.isRequired,
  toggleFilterMode: PropTypes.func.isRequired,
  setMountRescoring: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  setType: PropTypes.func.isRequired,
}


const FetchResponsibles = ({
  aggregatedOcmNode,
  setAggregatedOcmNodes,
  ocmRepo,
}) => {
  const [responsibles] = useFetchComponentResponsibles({
    componentName: aggregatedOcmNode.ocmNode.component.name,
    componentVersion: aggregatedOcmNode.ocmNode.component.version,
    artefactName: aggregatedOcmNode.ocmNode.artefact.name,
    ocmRepo: ocmRepo,
  })

  React.useEffect(() => {
    if (!responsibles) return

    aggregatedOcmNode['responsibles'] = responsibles.responsibles.map((responsible) => {
      return responsible.reduce((identity, identifier) => {
        if (identifier.type === USER_IDENTITIES.GITHUB_USER && identifier.username) return {
          ...identity,
          githubUsers: [
            ...identity.githubUsers,
            {
              username: identifier.username,
              host: identifier.github_hostname,
            },
          ],
        }

        if (identifier.type === USER_IDENTITIES.EMAIL_ADDRESS && identifier.email) return {
          ...identity,
          emails: [
            ...identity.emails,
            identifier.email,
          ],
        }

        if (identifier.type === USER_IDENTITIES.PERSONAL_NAME) return {
          ...identity,
          personalName: `${identifier.firstName} ${identifier.lastName}`,
        }

        return identity
      }, {
        githubUsers: [],
        emails: []
      })
    }).filter((responsible) => Boolean(responsible))

    setAggregatedOcmNodes((prev) => [
      ...prev.filter((aom) => aom.ocmNode.identity() !== aggregatedOcmNode.ocmNode.identity()),
      aggregatedOcmNode,
    ])
  }, [responsibles])
}
FetchResponsibles.displayName = 'FetchResponsibles'
FetchResponsibles.propTypes = {
  aggregatedOcmNode: PropTypes.object.isRequired,
  setAggregatedOcmNodes: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
}


const Artefacts = ({
  aggregatedOcmNodes,
  setAggregatedOcmNodes,
  selectedAggregatedOcmNodes,
  setSelectedAggregatedOcmNodes,
  type,
  setType,
  ocmRepo,
  addOrUpdateFilter,
  removeFilter,
  filterMode,
  toggleFilterMode,
  mountRescoring,
  setMountRescoring,
  refreshComplianceSummary,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const scanConfigName = searchParamContext.get('scanConfigName')
  const [scanConfigs] = useFetchScanConfigurations()

  const scanConfig = scanConfigName
    ? scanConfigs?.find((scanConfig) => scanConfig.name === scanConfigName)
    : scanConfigs?.length === 1 ? scanConfigs[0] : null

  return <Box>
    {
      mountRescoring && <RescoringModal
        ocmNodes={selectedAggregatedOcmNodes.map((aggregatedOcmNode) => aggregatedOcmNode.ocmNode)}
        ocmRepo={ocmRepo}
        handleClose={() => setMountRescoring(false)}
        fetchComplianceSummary={refreshComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Header
      addOrUpdateFilter={addOrUpdateFilter}
      removeFilter={removeFilter}
      selectedAggregatedOcmNodes={selectedAggregatedOcmNodes}
      filterMode={filterMode}
      toggleFilterMode={toggleFilterMode}
      setMountRescoring={setMountRescoring}
      type={type}
      setType={setType}
    />
    <div style={{ padding: '1em' }} />
    {
      aggregatedOcmNodes.length > 0 ? <ArtefactList
        aggregatedOcmNodes={aggregatedOcmNodes}
        selectedAggregatedOcmNodes={selectedAggregatedOcmNodes}
        setSelectedAggregatedOcmNodes={setSelectedAggregatedOcmNodes}
        ocmRepo={ocmRepo}
      /> : <Box
        display='flex'
        justifyContent='center'
      >
        {
          filterMode === filterModes.PERSONAL
            ? <Typography>No open findings, good job! {String.fromCodePoint('0x1F973')} {/* "Party-Face" symbol */}</Typography>
            : <Typography>No artefacts matching filters</Typography>
        }
      </Box>
    }
    {
      aggregatedOcmNodes.map((aggregatedOcmNode) => <FetchResponsibles
        key={`${aggregatedOcmNode.ocmNode.identity()}${type}`}
        aggregatedOcmNode={aggregatedOcmNode}
        setAggregatedOcmNodes={setAggregatedOcmNodes}
        ocmRepo={ocmRepo}
      />)
    }
  </Box>
}
Artefacts.displayName = 'Artefacts'
Artefacts.propTypes = {
  aggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setAggregatedOcmNodes: PropTypes.func.isRequired,
  selectedAggregatedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedAggregatedOcmNodes: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  setType: PropTypes.func.isRequired,
  ocmRepo: PropTypes.string,
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  filterMode: PropTypes.string.isRequired,
  toggleFilterMode: PropTypes.func.isRequired,
  mountRescoring: PropTypes.bool.isRequired,
  setMountRescoring: PropTypes.func.isRequired,
  refreshComplianceSummary: PropTypes.func.isRequired,
}


const ComplianceTab = ({
  component,
  ocmRepo,
}) => {
  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

  const [complianceSummary, complianceSummaryState, refreshComplianceSummary] = useFetchComplianceSummary({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
  })

  const [type, setType] = React.useState(artefactMetadataTypes.VULNERABILITY)
  const [filterMode, setFilterMode] = React.useState(filterModes.CUSTOM)

  const personalFilters = [
    {
      id: 'filter-responsibility',
      filter: (aggregatedOcmNode) => {
        // If responsibles are still loading (i.e. undefined), evaluate to true to pessimistically
        // determine responsibility. If responsibles have been loaded, those falsy declared artefacts
        // will be filtered out.
        if (aggregatedOcmNode.responsibles === undefined) return true

        return aggregatedOcmNode.responsibles.some((responsible) => {
          return responsible.githubUsers.some((githubUser) => (
            githubUser.username.toLowerCase() === token.sub.toLowerCase()
            && githubUser.host === token.github_oAuth.host
          )) || responsible.emails.some((email) => (
            email.toLowerCase() == token.github_oAuth.email_address.toLowerCase()
          ))
        })
      }
    },
    {
      id: 'filter-severity',
      filter: (aggregatedOcmNode) => filterForSeverity({
        severity: SEVERITIES.MEDIUM, // TODO allow configuration of desired minimum severity
        aggregatedOcmNode: aggregatedOcmNode,
      }),
    },
  ]
  const [customFilters, setCustomFilters] = React.useState([])

  const [aggregatedOcmNodes, setAggregatedOcmNodes] = React.useState([])
  const [selectedAggregatedOcmNodes, setSelectedAggregatedOcmNodes] = React.useState([])
  const [customSelectedAggregatedOcmNodes, setCustomSelectedAggregatedOcmNodes] = React.useState([])

  const selected = filterMode === filterModes.CUSTOM ? customSelectedAggregatedOcmNodes : selectedAggregatedOcmNodes
  const setSelected = filterMode === filterModes.CUSTOM ? setCustomSelectedAggregatedOcmNodes : setSelectedAggregatedOcmNodes

  const [mountRescoring, setMountRescoring] = React.useState(false)

  const addOrUpdateFilter = React.useCallback((filter) => {
    setCustomFilters((prev) => {
      return [
        ...prev.filter((f) => f.id !== filter.id),
        filter,
      ]
    })
  }, [])

  const removeFilter = React.useCallback((filterID) => {
    setCustomFilters((prev) => prev.filter((f) => f.id !== filterID))
  }, [])

  const filterAggregatedOcmNodes = React.useCallback((aggregatedOcmNodes) => {
    const getFilters = () => {
      if (filterMode === filterModes.PERSONAL && personalFilters.length > 0) return personalFilters
      return customFilters
    }

    if (getFilters().length === 0) return aggregatedOcmNodes

    return getFilters().reduce((aggregatedOcmNodes, filter) => {
      return aggregatedOcmNodes.filter((aggregatedOcmNode) => filter.filter(aggregatedOcmNode))
    }, aggregatedOcmNodes)
  }, [customFilters, filterMode])

  React.useEffect(() => {
    setSelectedAggregatedOcmNodes([])
    setCustomSelectedAggregatedOcmNodes([])
  }, [type])

  React.useEffect(() => {
    if (!complianceSummary) return

    setAggregatedOcmNodes(complianceSummary.complianceSummary.reduce((aggregatedNodes, componentSummary) => {
      return componentSummary.artefacts.reduce((nodes, artefactSummary) => {
        const aggregatedOcmNode = {
          ocmNode: new OcmNode(
            [{
              name: artefactSummary.artefact.component_name,
              version: artefactSummary.artefact.component_version,
            }],
            {
              name: artefactSummary.artefact.artefact.artefact_name,
              version: artefactSummary.artefact.artefact.artefact_version,
              type: artefactSummary.artefact.artefact.artefact_type,
              extraIdentity: artefactSummary.artefact.artefact.artefact_extra_id,
            },
            artefactSummary.artefact.artefact_kind,
          ),
          severity: artefactSummary.entries.find((entry) => entry.type === type).severity,
        }

        return [
          ...nodes.filter((node) => node.ocmNode.identity() !== aggregatedOcmNode.ocmNode.identity()),
          aggregatedOcmNode,
        ]
      }, aggregatedNodes)
    }, []))
  }, [complianceSummary, type])

  if (complianceSummaryState.error) return <Alert severity='error'>
    Unable to load components
  </Alert>

  if (complianceSummaryState.isLoading) return <Box>
    <Header
      addOrUpdateFilter={addOrUpdateFilter}
      removeFilter={removeFilter}
      selectedAggregatedOcmNodes={selected}
      filterMode={filterMode}
      toggleFilterMode={() => setFilterMode((prev) => prev === filterModes.CUSTOM ? filterModes.PERSONAL : filterModes.CUSTOM)}
      setMountRescoring={setMountRescoring}
      type={type}
      setType={setType}
    />
    <div style={{ padding: '1em' }} />
    <ArtefactList
      selectedAggregatedOcmNodes={selected}
      setSelectedAggregatedOcmNodes={setSelected}
      ocmRepo={ocmRepo}
    />
  </Box>

  return <Artefacts
    aggregatedOcmNodes={filterAggregatedOcmNodes(aggregatedOcmNodes)}
    setAggregatedOcmNodes={setAggregatedOcmNodes}
    selectedAggregatedOcmNodes={selected}
    setSelectedAggregatedOcmNodes={setSelected}
    type={type}
    setType={setType}
    ocmRepo={ocmRepo}
    addOrUpdateFilter={addOrUpdateFilter}
    removeFilter={removeFilter}
    filterMode={filterMode}
    toggleFilterMode={() => setFilterMode((prev) => prev === filterModes.CUSTOM ? filterModes.PERSONAL : filterModes.CUSTOM)}
    mountRescoring={mountRescoring}
    setMountRescoring={setMountRescoring}
    refreshComplianceSummary={refreshComplianceSummary}
  />
}
ComplianceTab.displayName = 'ComplianceTab'
ComplianceTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}

export default ComplianceTab
