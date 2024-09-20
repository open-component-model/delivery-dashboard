import React from 'react'
import PropTypes from 'prop-types'

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
  Drawer,
  FormControl,
  Grid,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useSnackbar } from 'notistack'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SearchIcon from '@mui/icons-material/Search'

import { useTheme } from '@emotion/react'

import {
  useFetchBom,
  useFetchScanConfigurations,
  useFetchServiceExtensions,
} from './../../api/useFetch'
import {
  camelCaseToDisplayText,
  matchObjectWithSearchQuery,
  pluralise,
  toYamlString,
  trimLongString,
} from './../../util'
import {
  ARTEFACT_KIND,
  COMPLIANCE_TOOLS,
  PRIORITIES,
  TOKEN_KEY,
} from './../../consts'
import { triggerComplianceTool } from './TriggerComplianceToolButton'
import { OcmNode, OcmNodeDetails } from './../../ocm/iter'
import CopyOnClickChip from './CopyOnClickChip'
import MultilineTextViewer from './MultilineTextViewer'


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


const ScanConfiguration = ({
  scanConfigsAgg,
}) => {
  const {scanConfig, setScanConfig, scanConfigs} = scanConfigsAgg

  return <FormControl style={{width: '90%'}}>
    <InputLabel>{'Scan Configuration'}</InputLabel>
    <Select
      value={scanConfig.name}
      label={'Scan Configuration'}
      onChange={(e) => setScanConfig(scanConfigs.find((cfg) => cfg.name === e.target.value))}
    >
      {
        scanConfigs.map((cfg) => <MenuItem key={cfg.name} value={cfg.name}>{cfg.name}</MenuItem>)
      }
    </Select>
  </FormControl>
}
ScanConfiguration.displayName = 'ScanConfiguration'
ScanConfiguration.propTypes = {
  scanConfigsAgg: PropTypes.object.isRequired,
}


const Configuration = ({
  service,
  scanConfigsAgg,
}) => {
  const [filterScanConfig, setFilterScanConfig] = React.useState(true)
  const [scanConfig, setScanConfig] = React.useState(scanConfigsAgg.scanConfig)

  React.useEffect(() => {
    if (!filterScanConfig) {
      setScanConfig(scanConfigsAgg.scanConfig.config)
    } else if (service in scanConfigsAgg.scanConfig.config) {
      setScanConfig({
        ...scanConfigsAgg.scanConfig.config.defaults,
        ...scanConfigsAgg.scanConfig.config[service],
      })
    } else {
      setScanConfig({
        warning: `selected scan configuration does not contain a configuration for ${camelCaseToDisplayText(service).toLowerCase()}`,
      })
    }
  }, [filterScanConfig, scanConfigsAgg.scanConfig, service])

  return <Stack spacing={3}>
    <Typography>Please select the scan configuration of your choice.</Typography>
    <div style={{display: 'flex', justifyContent: 'space-between'}}>
      <ScanConfiguration scanConfigsAgg={scanConfigsAgg}/>
      <Tooltip title={`filter scan configuration based on extension ${camelCaseToDisplayText(service).toLowerCase()}`}>
        <Checkbox
          checked={filterScanConfig}
          onChange={() => setFilterScanConfig(!filterScanConfig)}
          sx={{width: '10%'}}
        />
      </Tooltip>
    </div>
    <Box border={1} borderColor={'primary.main'}>
      <MultilineTextViewer text={toYamlString(scanConfig)}/>
    </Box>
  </Stack>
}
Configuration.displayName = 'Configuration'
Configuration.propTypes = {
  service: PropTypes.string.isRequired,
  scanConfigsAgg: PropTypes.object.isRequired,
}


const ComplianceToolsPopoverDrawer = ({
  open,
  handleClose,
  service,
  scanConfigsAgg,
}) => {
  return <Drawer
    PaperProps={{
      style: {
        position: 'absolute',
        width: '100vh',
      }
    }}
    variant='persistent'
    anchor='left'
    open={open}
    onClick={(e) => e.stopPropagation()}
  >
    <Box
      borderLeft={1}
      borderLeftColor={'primary.main'}
      borderRight={1}
      borderRightColor={'primary.main'}
    >
      <Box
        position='sticky'
        top={0}
        left={0}
        width={'100%'}
        zIndex={999}
        paddingTop={3}
        paddingLeft={3}
        paddingRight={3}
        bgcolor={'background.paper'}
        borderTop={1}
        borderTopColor={'primary.main'}
      >
        <IconButton onClick={() => handleClose()}>
          <ChevronLeftIcon/>
        </IconButton>
        <div style={{ padding: '0.5em' }}/>
        <Divider/>
      </Box>
      <Box paddingLeft={3} paddingRight={3}>
        <div style={{ padding: '0.5em' }}/>
        <Configuration
          service={service}
          scanConfigsAgg={scanConfigsAgg}
        />
      </Box>
      <Box
        position='sticky'
        bottom={0}
        right={0}
        width={'100%'}
        zIndex={999}
        paddingBottom={3}
        paddingLeft={3}
        paddingRight={3}
        bgcolor={'background.paper'}
        borderBottom={1}
        borderBottomColor={'primary.main'}
      >
        <Divider/>
      </Box>
    </Box>
  </Drawer>
}
ComplianceToolsPopoverDrawer.displayName = 'ComplianceToolsPopoverDrawer'
ComplianceToolsPopoverDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  service: PropTypes.string.isRequired,
  scanConfigsAgg: PropTypes.object.isRequired,
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
  scanConfig,
  priority,
  selectedOcmNodes,
  setSelectedOcmNodes,
  configIsAvailable,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const { enqueueSnackbar } = useSnackbar()

  const filteredOcmNodes = selectedOcmNodes.filter((ocmNode) => {
    if (service === 'bdba' && ocmNode.artefactKind !== ARTEFACT_KIND.RESOURCE) return false
    return true
  })

  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))
  const ocmNodesLength = filteredOcmNodes.length

  const scheduleButtonText = `schedule ${ocmNodesLength} ${pluralise('artefact', ocmNodesLength)} for ${camelCaseToDisplayText(service)}`

  if (!configIsAvailable) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth
  >
    Please select a different scan configuration
  </Button>

  if (!token) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth
  >
    Log in to {scheduleButtonText}
  </Button>

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
        cfgName: scanConfig.name,
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
  scanConfig: PropTypes.object.isRequired,
  priority: PropTypes.string.isRequired,
  selectedOcmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedOcmNodes: PropTypes.func.isRequired,
  configIsAvailable: PropTypes.bool.isRequired,
}


const ComplianceToolPopover = ({
  popoverProps,
  handleClose,
}) => {
  const { component } = popoverProps

  const [openInput, setOpenInput] = React.useState(false)
  const [filters, setFilters] = React.useState([])

  // eslint-disable-next-line no-unused-vars
  const [dependencies, isLoading, isError, error] = useFetchBom(component, null, 'all')
  const [ocmNodes, setOcmNodes] = React.useState([])
  const [selectedOcmNodes, setSelectedOcmNodes] = React.useState([])

  const [services, servicesIsLoading, servicesIsError, setServices] = useFetchServiceExtensions()
  const [service, setService] = React.useState()

  const [scanConfigs, scanConfigsIsLoading, scanConfigsIsError] = useFetchScanConfigurations()
  const [scanConfig, setScanConfig] = React.useState()

  const [priority, setPriority] = React.useState(PRIORITIES.CRITICAL)

  React.useEffect(() => {
    if (servicesIsLoading || servicesIsError) return

    const complianceTools = Object.values(COMPLIANCE_TOOLS)

    if (services.some((s) => !complianceTools.includes(s))) {
      setServices(services.filter((s) => complianceTools.includes(s)))
    } else if (!service && services.length > 0) {
      setService(services[0])
    }
  }, [services, servicesIsLoading, servicesIsError, setServices, service])

  React.useEffect(() => {
    if (scanConfigsIsLoading || scanConfigsIsError) return
    if (!scanConfig && scanConfigs?.length > 0) setScanConfig(scanConfigs[0])
  }, [scanConfigs, scanConfigsIsLoading, scanConfigsIsError, scanConfig])

  React.useEffect(() => {
    if (isLoading || isError || servicesIsLoading || servicesIsError) return

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
      ].filter((node) => {
        if (!scanConfig) return true

        // if artefact type filter is set, don't show nodes that are filtered out
        const artefactTypes = scanConfig.config[service].artefact_types || scanConfig.config.defaults.artefact_types
        return !artefactTypes || artefactTypes.some((type) => type === node.artefact.type)
      })
    }, []))
  }, [dependencies, scanConfig, isLoading, isError, service, servicesIsLoading, servicesIsError])

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

  if (isError || servicesIsError || scanConfigsIsError) {
    return
  } else if (isLoading || servicesIsLoading || scanConfigsIsLoading || !service || !scanConfig) {
    return
  }

  const closeInput = (event) => {
    if (openInput) setOpenInput(false)
    event.stopPropagation() // stop interaction with background
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
      onClick={(e) => closeInput(e)}
    >
      <Grid container>
        <Grid item xs={1}>
          {
            openInput ? <ComplianceToolsPopoverDrawer
              open={openInput}
              handleClose={() => setOpenInput(false)}
              service={service}
              scanConfigsAgg={{
                scanConfig,
                setScanConfig,
                scanConfigs,
              }}
            /> : <Box
              paddingTop={1} // sync position with close button inside drawer
            >
              <IconButton
                onClick={() => setOpenInput(true)}
              >
                <ChevronRightIcon/>
              </IconButton>
            </Box>
          }
        </Grid>
        <Grid item xs={10}>
          <Stack
            direction='column'
            display='flex'
            justifyContent='center'
            alignItems='center'
          >
            <Typography variant='h6'>Compliance Tool Instrumentation</Typography>
            <Typography variant='h6' color='secondary'>{`${component.name}:${component.version}`}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={1}/>
      </Grid>
    </DialogTitle>
    <DialogContent
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
      }}
      onClick={(e) => closeInput(e)}
    >
      <Stack sx={{marginTop: '2rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <ServiceConfiguration
            serviceConfigsAgg={{
              service,
              setService,
              services,
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
      onClick={(e) => closeInput(e)}
    >
      <Grid container alignItems='center' spacing={2}>
        <Grid item xs={3.5}/>
        <Grid item xs={5}>
          <Box display='flex' justifyContent='center'>
            <TriggerComplianceTool
              service={service}
              scanConfig={scanConfig}
              priority={priority.name}
              selectedOcmNodes={selectedOcmNodes}
              setSelectedOcmNodes={setSelectedOcmNodes}
              configIsAvailable={service in scanConfig.config}
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
