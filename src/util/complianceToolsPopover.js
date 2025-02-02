import React from 'react'

import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'
import SearchIcon from '@mui/icons-material/Search'

import PropTypes from 'prop-types'
import { useTheme } from '@emotion/react'

import {
  useFetchBom,
  useFetchServiceExtensions,
} from '../fetch'
import {
  camelCaseToDisplayText,
  matchObjectWithSearchQuery,
  pluralise,
  trimLongString,
} from '../util'
import {
  ARTEFACT_KIND,
  COMPLIANCE_TOOLS,
  fetchBomPopulate,
  PRIORITIES,
} from '../consts'
import { triggerComplianceTool } from './triggerComplianceToolButton'
import { OcmNode, OcmNodeDetails } from '../ocm/iter'
import CopyOnClickChip from './copyOnClickChip'


const ServiceConfiguration = ({
  serviceConfigsAgg,
}) => {
  const {service, setService, services} = serviceConfigsAgg

  return <FormControl style={{width: '45%'}}>
    <InputLabel>Extension</InputLabel>
    <Select
      value={service}
      label='Extension'
      onChange={(e) => setService(e.target.value)}
    >
      {
        services.map((s) => <MenuItem key={s} value={s}>{camelCaseToDisplayText(s)}</MenuItem>)
      }
    </Select>
  </FormControl>
}
ServiceConfiguration.displayName = 'ServiceConfiguration'
ServiceConfiguration.propTypes = {
  serviceConfigsAgg: PropTypes.object.isRequired,
}


const PriorityConfiguration = ({
  priority,
  setPriority,
}) => {
  return <FormControl style={{width: '45%'}}>
    <InputLabel>Priority</InputLabel>
    <Select
      value={priority}
      label={'Priority'}
      onChange={(e) => setPriority(e.target.value)}
    >
      {
        Object.values(PRIORITIES).map((p) => <MenuItem key={p.name} value={p}>
          <Typography color={`${p.color}.main`} variant='body2'>
            {p.name}
          </Typography>
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
PriorityConfiguration.displayName = 'PriorityConfiguration'
PriorityConfiguration.propTypes = {
  priority: PropTypes.object.isRequired,
  setPriority: PropTypes.func.isRequired,
}


const FreeTextFilter = ({
  setFreeTextFilter,
}) => {
  const [freeText, setFreeText] = React.useState()
  const [searchQueryTimer, setSearchQueryTimer] = React.useState()

  React.useEffect(() => {
    if (!freeText) {
      setFreeTextFilter(null)
      return
    }

    setFreeTextFilter(() => (ocmNode) => matchObjectWithSearchQuery(
      {
        artefact: ocmNode.artefact,
        component: {
          name: ocmNode.component.name,
          version: ocmNode.component.version,
        },
      },
      freeText,
    ))
  }, [setFreeTextFilter, freeText])


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
    label='Search Artefacts or Components'
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
  />
}
FreeTextFilter.displayName = 'FreeTextFilter'
FreeTextFilter.propTypes = {
  setFreeTextFilter: PropTypes.func.isRequired,
}


const ArtefactRow = ({
  ocmNode,
  selectedOcmNodes,
  setSelectedOcmNodes,
}) => {
  const theme = useTheme()

  return <TableRow
    onClick={() => {
      if (selectedOcmNodes.find((selectedOcmNode) => selectedOcmNode.identity() === ocmNode.identity())) {
        setSelectedOcmNodes((prev) => {
          return prev.filter((selectedOcmNode) => selectedOcmNode.identity() !== ocmNode.identity())
        })
      } else {
        setSelectedOcmNodes((prev) => {
          return [...prev, ocmNode]
        })
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
      <Checkbox checked={Boolean(selectedOcmNodes.find((selectedOcmNode) => selectedOcmNode.identity() === ocmNode.identity()))}/>
    </TableCell>
    <TableCell>
      <Stack direction='row' spacing={1}>
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
          <OcmNodeDetails ocmNode={ocmNode}/>
        </Box>
      </Stack>
    </TableCell>
    <TableCell>
      <CopyOnClickChip
        value={ocmNode.artefact.version}
        label={trimLongString(ocmNode.artefact.version, 12)}
        chipProps={{
          variant: 'outlined',
        }}
      />
    </TableCell>
  </TableRow>
}
ArtefactRow.displayName = 'ArtefactRow'
ArtefactRow.propTypes = {
  ocmNode: PropTypes.object.isRequired,
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
}


const ArtefactList = ({
  service,
  addOrUpdateFilter,
  removeFilter,
  ocmNodes,
  selectedOcmNodes,
  setSelectedOcmNodes,
}) => {
  const [order, setOrder] = React.useState('asc')
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(25)
  
  const [freeTextFilter, setFreeTextFilter] = React.useState()
  const FREE_TEXT_FILTER_ID = 'filter-freetext'

  React.useEffect(() => {
    if (freeTextFilter) {
      addOrUpdateFilter({
        id: FREE_TEXT_FILTER_ID,
        filter: freeTextFilter,
      })
    } else {
      removeFilter(FREE_TEXT_FILTER_ID)
    }
  }, [addOrUpdateFilter, removeFilter, freeTextFilter, FREE_TEXT_FILTER_ID])

  const calculateMaxPage = () => {
    return parseInt(ocmNodes.length / rowsPerPage)
  }

  const resetPagination = () => {
    setRowsPerPage(5)
    setPage(0)
  }

  if (page > calculateMaxPage()) {
    resetPagination()
  }

  const allSelected = () => {
    return ocmNodes.every((ocmNode) => {
      return selectedOcmNodes.map((s) => s.identity()).includes(ocmNode.identity())
    })
  }

  const descendingComparator = (l, r) => {
    if (r < l) return -1
    if (r > l) return 1
    return 0
  }

  const getComparator = (order) => {
    const accessOrderByProperty = (ocmNode) => `${ocmNode.artefact.name}:${ocmNode.artefact.version}`
    return order === 'desc'
      ? (l, r) => descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
      : (l, r) => -descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
  }

  const sortData = (data, comparator) => {
    return data.sort((l, r) => comparator(l, r))
  }

  const handleChangePage = (e, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  return <Stack spacing={3}>
    <Typography>{`Please select artefacts to add them to the ${camelCaseToDisplayText(service).toLowerCase()} queue.`}</Typography>
    <FreeTextFilter setFreeTextFilter={setFreeTextFilter}/>
    <Paper>
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
                  if (allSelected()) {
                    setSelectedOcmNodes([])
                    return
                  }
                  setSelectedOcmNodes((prev) => {
                    return [
                      ...prev,
                      ...ocmNodes.filter((ocmNode) => !selectedOcmNodes.map(s => s.identity()).includes(ocmNode.identity()))
                    ]
                  })
                }}
                sx={{
                  '&:hover': {
                    cursor: 'pointer',
                  },
                }}
              >
                <Checkbox checked={allSelected()}/>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                  direction={order}
                  active
                >
                  Artefact
                </TableSortLabel>
              </TableCell>
              <TableCell>Version</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              sortData(
                [...ocmNodes], // do not sort in place so sort stays stable
                getComparator(order),
              )
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((ocmNode, idx) => {
                  return <ArtefactRow
                    key={`${ocmNode.identity()}${idx}`}
                    ocmNode={ocmNode}
                    selectedOcmNodes={selectedOcmNodes}
                    setSelectedOcmNodes={setSelectedOcmNodes}
                  />
                })
            }
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component='div'
        count={ocmNodes.length}
        rowsPerPage={rowsPerPage}
        page={page > calculateMaxPage() ? 0 : page} // ensure page does not exceed limit
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  </Stack>
}
ArtefactList.displayName = 'ArtefactList'
ArtefactList.propTypes = {
  service: PropTypes.string.isRequired,
  addOrUpdateFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
}


const TriggerComplianceTool = ({
  service,
  priority,
  selectedOcmNodes,
  setSelectedOcmNodes,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const { enqueueSnackbar } = useSnackbar()

  const filteredOcmNodes = selectedOcmNodes.filter((ocmNode) => {
    if (service === 'bdba' && ocmNode.artefactKind !== ARTEFACT_KIND.RESOURCE) return false
    return true
  })

  const ocmNodesLength = filteredOcmNodes.length

  const scheduleButtonText = `schedule ${ocmNodesLength} ${pluralise('artefact', ocmNodesLength)} for ${camelCaseToDisplayText(service)}`

  if (ocmNodesLength === 0) return <Button
    variant='contained'
    color='secondary'
    startIcon={isLoading && <CircularProgress size='1em'/>}
    disabled
    fullWidth
  >
    {scheduleButtonText}
  </Button>

  return <Button
    variant='contained'
    color='secondary'
    fullWidth
    onClick={() => {
      const triggeredSuccessfully = triggerComplianceTool({
        service: service,
        ocmNodes: filteredOcmNodes,
        enqueueSnackbar: enqueueSnackbar,
        priority: priority,
        setIsLoading: setIsLoading,
      })
      if (triggeredSuccessfully) {
        setSelectedOcmNodes([])
      }
    }}
    disabled={isLoading}
    startIcon={isLoading && <CircularProgress size='1em'/>}
  >
    {scheduleButtonText}
  </Button>
}
TriggerComplianceTool.displayName = 'TriggerComplianceTool'
TriggerComplianceTool.propTypes = {
  service: PropTypes.string.isRequired,
  priority: PropTypes.string.isRequired,
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
}


const ComplianceToolPopover = ({
  popoverProps,
  handleClose,
}) => {
  const { component } = popoverProps

  const [filters, setFilters] = React.useState([])

  const [dependencies, state] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: null,
    populate: fetchBomPopulate.ALL,
  })
  const [ocmNodes, setOcmNodes] = React.useState([])
  const [selectedOcmNodes, setSelectedOcmNodes] = React.useState([])

  const [services, servicesState] = useFetchServiceExtensions()
  const [service, setService] = React.useState()

  const [priority, setPriority] = React.useState(PRIORITIES.CRITICAL)

  React.useEffect(() => {
    if (servicesState.isLoading || servicesState.error) return

    if (!service && services.length > 0) {
      setService(services[0])
    }
  }, [services, servicesState, service])

  React.useEffect(() => {
    if (state.isLoading || state.error || servicesState.isLoading || servicesState.state) return

    const components = dependencies.componentDependencies
    if (!(components.length > 0 && service)) return

    setOcmNodes(components.reduce((nodes, component) => {
      return [
        ...nodes,
        ...([COMPLIANCE_TOOLS.BDBA, COMPLIANCE_TOOLS.ISSUE_REPLICATOR, COMPLIANCE_TOOLS.CLAMAV].includes(service) ? component.resources.map((resource) => {
          return new OcmNode(
            [component],
            resource,
            ARTEFACT_KIND.RESOURCE,
          )
        }) : []),
        ...([COMPLIANCE_TOOLS.ISSUE_REPLICATOR].includes(service) ? component.sources.map((source) => {
          return new OcmNode(
            [component],
            source,
            ARTEFACT_KIND.SOURCE,
          )
        }): []),
      ]
    }, []))
  }, [dependencies, state.isLoading, state.error, service, servicesState.isLoading, servicesState.error])

  const addOrUpdateFilter = React.useCallback((newFilter) => {
    setFilters((prevFilters) => {
      return [
        ...prevFilters.filter((filter) => filter.id !== newFilter.id),
        newFilter,
      ]
    })
  }, [])

  const removeFilter = React.useCallback((filterID) => {
    setFilters((prevFilters) => prevFilters.filter((filter) => filter.id !== filterID))
  }, [])

  const filterOcmNodes = React.useCallback((ocmNodes) => {
    if (filters.length === 0) return ocmNodes

    return filters.reduce((ocmNodes, filter) => {
      return ocmNodes.filter((ocmNode) => filter.filter(ocmNode))
    }, ocmNodes)
  }, [filters])

  if (state.error || servicesState.error) {
    return
  } else if (state.isLoading || servicesState.isLoading || !service) {
    return
  }

  return <Dialog
    onClose={handleClose}
    maxWidth={false}
    PaperProps={{
      sx: {
        width: '75%',
        height: '95%'
      }
    }}
    fullWidth
    open
  >
    <DialogTitle
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'primary.main',
      }}
    >
      <Stack
        direction='column'
        display='flex'
        justifyContent='center'
        alignItems='center'
      >
        <Typography variant='h6'>Compliance Tool Instrumentation</Typography>
        <Typography variant='h6' color='secondary'>{`${component.name}:${component.version}`}</Typography>
      </Stack>
    </DialogTitle>
    <DialogContent
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
      }}
    >
      <Stack sx={{marginTop: '2rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <ServiceConfiguration
            serviceConfigsAgg={{
              service,
              setService,
              services: services.filter((s) => Object.values(COMPLIANCE_TOOLS).includes(s)),
            }}
          />
          <PriorityConfiguration
            priority={priority}
            setPriority={setPriority}
          />
        </div>
        <Divider sx={{marginY: '1rem'}}/>
        <ArtefactList
          service={service}
          addOrUpdateFilter={addOrUpdateFilter}
          removeFilter={removeFilter}
          ocmNodes={filterOcmNodes(ocmNodes)}
          selectedOcmNodes={selectedOcmNodes}
          setSelectedOcmNodes={setSelectedOcmNodes}
        />
      </Stack>
    </DialogContent>
    <DialogActions
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'primary.main',
        padding: 2,
      }}
    >
      <Grid container alignItems='center' spacing={2}>
        <Grid item xs={3.5}/>
        <Grid item xs={5}>
          <Box display='flex' justifyContent='center'>
            <TriggerComplianceTool
              service={service}
              priority={priority.name}
              selectedOcmNodes={selectedOcmNodes}
              setSelectedOcmNodes={setSelectedOcmNodes}
            />
          </Box>
        </Grid>
        <Grid item xs={2.5}/>
        <Grid item xs={1}>
          <Box display='flex' justifyContent='right'>
            <Button sx={{height: '100%', width: '100%'}} onClick={handleClose} color='secondary'>
                Close
            </Button>
          </Box>
        </Grid>
      </Grid>
    </DialogActions>
  </Dialog>
}
ComplianceToolPopover.displayName = 'ScanPopover'
ComplianceToolPopover.propTypes = {
  popoverProps: PropTypes.object.isRequired,
  handleClose: PropTypes.func.isRequired,
}


export default ComplianceToolPopover
