import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import DeleteIcon from '@mui/icons-material/Delete'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon from '@mui/icons-material/Refresh'
import { alpha } from '@mui/material/styles'
import { DataGrid, gridClasses } from '@mui/x-data-grid'
import { useSnackbar } from 'notistack'

import {
  useFetchBacklogItems,
  useFetchContainerStatuses,
  useFetchLogCollections,
  useFetchScanConfigurations,
} from './../api/useFetch'
import CopyOnClickChip from './../components/util/CopyOnClickChip'
import PersistentDrawerLeft from './../components/layout/Drawer'
import { TabPanel } from './../components/Tabs'
import {
  COMPLIANCE_TOOLS,
  errorSnackbarProps,
  PRIORITIES,
  servicesTabConfig,
} from './../consts'
import {
  camelCaseToDisplayText,
  getAggregatedContainerStatus,
  logLevelToThemeColor,
  pluralise,
  trimLongString,
  useInterval,
} from './../util'
import { serviceExtensions } from './../api'
import { ServiceStatus } from './ServicesPage'
import { ConfigContext, SearchParamContext } from './../App'


export const MonitoringPage = () => {
  const searchParamContext = React.useContext(SearchParamContext)
  const service = searchParamContext.get('service')

  const [refreshStatuses, setRefreshStatuses] = React.useState({})
  const [statuses, statusesAreLoading] = useFetchContainerStatuses({
    service: service,
    refresh: refreshStatuses,
  })
  const aggregatedContainerStatus = getAggregatedContainerStatus({statuses, statusesAreLoading})

  const [logLevel, setLogLevel] = React.useState('INFO')
  const [refreshLogs, setRefreshLogs] = React.useState({})
  const [logCollections, logCollectionsIsLoading, logCollectionsIsError, setLogCollections] = useFetchLogCollections({
    service: service,
    logLevel: logLevel,
    refresh: refreshLogs,
  })
  const logCollectionsFetchDetails = {
    logCollections: logCollections,
    isLoading: logCollectionsIsLoading,
    isError: logCollectionsIsError,
  }

  const refresh = {
    statuses: () => setRefreshStatuses({}),
    logs: () => setRefreshLogs({}),
  }

  React.useEffect(() => {
    // required to show loading skeletion in case service or log level changes
    setLogCollections([])
  }, [service, logLevel, setLogCollections])

  return <PersistentDrawerLeft open>
    <Stack spacing={1}>
      <Typography variant='h4' style={{marginBottom: '2rem'}}>
        {`Monitoring - ${camelCaseToDisplayText(service)}`}
      </Typography>
      {
        Object.values(COMPLIANCE_TOOLS).includes(service) ? <ServiceTabs
          service={service}
          aggregatedContainerStatus={aggregatedContainerStatus}
          logCollectionsFetchDetails={logCollectionsFetchDetails}
          logLevelState={{logLevel, setLogLevel}}
          refresh={refresh}
        /> : <LogTab
          service={service}
          aggregatedContainerStatus={aggregatedContainerStatus}
          logCollectionsFetchDetails={logCollectionsFetchDetails}
          logLevelState={{logLevel, setLogLevel}}
          refresh={refresh}
        />
      }
    </Stack>
  </PersistentDrawerLeft>
}
MonitoringPage.displayName = 'MonitoringPage'
MonitoringPage.propTypes = {}


const ServiceTabs = ({
  service,
  aggregatedContainerStatus,
  logCollectionsFetchDetails,
  logLevelState,
  refresh,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const currentTab = searchParamContext.get('servicesTab') || servicesTabConfig.BACKLOG.id

  const [scanConfigs, scanConfigsIsLoading, scanConfigsIsError] = useFetchScanConfigurations()
  const scanConfigsFetchDetails = {
    scanConfigs: scanConfigs,
    isLoading: scanConfigsIsLoading,
    isError: scanConfigsIsError,
  }

  // cfgName and priority are already initialised here to keep state between tab changes
  const [cfgName, setCfgName] = React.useState()
  const [priority, setPriority] = React.useState(PRIORITIES.NONE)

  React.useEffect(() => {
    if (scanConfigsIsLoading || scanConfigsIsError) return

    if (scanConfigs?.length > 0) setCfgName(scanConfigs[0].name)
  }, [scanConfigs, scanConfigsIsLoading, scanConfigsIsError])

  const handleChange = (_, newTab) => {
    searchParamContext.update({'servicesTab': newTab})
  }

  return <>
    <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant='scrollable'
        scrollButtons='auto'
        textColor='secondary'
      >
        {
          Object.values(servicesTabConfig).map((tab) => <Tab
            label={tab.caption}
            key={tab.id}
            value={tab.id}
          />)
        }
      </Tabs>
    </Box>
    <TabPanel value={currentTab} index={servicesTabConfig.BACKLOG.id}>
      <BacklogTab
        service={service}
        aggregatedContainerStatus={aggregatedContainerStatus}
        scanConfigsFetchDetails={scanConfigsFetchDetails}
        cfgNameState={{cfgName, setCfgName}}
        priorityState={{priority, setPriority}}
        refresh={refresh}
      />
    </TabPanel>
    <TabPanel value={currentTab} index={servicesTabConfig.LOGS.id}>
      <LogTab
        service={service}
        aggregatedContainerStatus={aggregatedContainerStatus}
        logCollectionsFetchDetails={logCollectionsFetchDetails}
        logLevelState={logLevelState}
        refresh={refresh}
      />
    </TabPanel>
  </>
}
ServiceTabs.displayName = 'ServiceTabs'
ServiceTabs.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  logCollectionsFetchDetails: PropTypes.object.isRequired,
  logLevelState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogTab = ({
  service,
  aggregatedContainerStatus,
  scanConfigsFetchDetails,
  cfgNameState,
  priorityState,
  refresh,
}) => {
  const context = React.useContext(ConfigContext)

  const {scanConfigs, isLoading, isError} = scanConfigsFetchDetails

  if (isError) return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
    Scan configurations could not be fetched.
  </Alert>
  else if (isLoading || !scanConfigs) return <Skeleton/>

  return <Backlog
    service={service}
    aggregatedContainerStatus={aggregatedContainerStatus}
    scanConfigs={scanConfigs}
    cfgNameState={cfgNameState}
    priorityState={priorityState}
    refresh={refresh}
  />
}
BacklogTab.displayName = 'BacklogTab'
BacklogTab.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  scanConfigsFetchDetails: PropTypes.object.isRequired,
  cfgNameState: PropTypes.object.isRequired,
  priorityState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


const Backlog = ({
  service,
  aggregatedContainerStatus,
  scanConfigs,
  cfgNameState,
  priorityState,
  refresh,
}) => {
  const {cfgName} = cfgNameState
  const {priority} = priorityState

  const [refreshBacklogItems, setRefreshBacklogItems] = React.useState({})
  const [backlogItems, backlogItemsIsLoading, backlogItemsIsError, setBacklogItems] = useFetchBacklogItems({
    service: service,
    cfgName: cfgName,
    refresh: refreshBacklogItems,
  })
  const backlogItemsFetchDetails = {
    backlogItems: backlogItems,
    isLoading: backlogItemsIsLoading,
    isError: backlogItemsIsError,
  }
  const [filteredBacklogItems, setFilteredBacklogItems] = React.useState([])
  const [selectedBacklogItems, setSelectedBacklogItems] = React.useState([])

  React.useEffect(() => {
    // required to show loading skeletion in case service changes
    setBacklogItems()
    setFilteredBacklogItems([])
    setSelectedBacklogItems([])
  }, [service, setBacklogItems])

  const backlogItemClaimedAt = (backlogItem) => {
    const domain = 'delivery-gear.gardener.cloud'
    const annotationClaimedAt = `${domain}/claimed-at`
    const labelClaimed = `${domain}/claimed`

    const annotations = backlogItem.metadata.annotations
    const labels = backlogItem.metadata.labels
    if (labelClaimed in labels && labels[labelClaimed] === 'True') {
      return annotations[annotationClaimedAt]
    }
    return null
  }

  React.useEffect(() => {
    if (backlogItemsIsLoading || backlogItemsIsError) return

    setFilteredBacklogItems(backlogItems.sort((a, b) => {
      // claimed items first
      if (Boolean(backlogItemClaimedAt(a)) && !backlogItemClaimedAt(b)) return -1
      if (Boolean(backlogItemClaimedAt(b)) && !backlogItemClaimedAt(a)) return 1

      // highest priority first
      if (a.spec.priority > b.spec.priority) return -1
      if (b.spec.priority > a.spec.priority) return 1

      // alphabetically
      return a.metadata.name.localeCompare(b.metadata.name)
    }).map((backlogItem, idx) => {
      // indicating backlog position even if some backlog items are filtered out
      return {
        ...backlogItem,
        position: idx + 1,
        claimed: Boolean(backlogItemClaimedAt(backlogItem)),
        claimedAt: backlogItemClaimedAt(backlogItem),
      }
    }).filter((backlogItem) => {
      return backlogItem.spec.priority >= priority.value
    }))
  }, [priority, backlogItems, backlogItemsIsLoading, backlogItemsIsError])

  React.useEffect(() => {
    // remove selection of backlog items which were processed in the meantime
    setSelectedBacklogItems((prev) => prev.filter((backlogItem) => {
      return filteredBacklogItems.map((bli) => bli.metadata.uid).includes(backlogItem.metadata.uid)
    }))
  }, [filteredBacklogItems])

  // periodically update backlog items
  useInterval(() => {
    refresh.statuses()
    setRefreshBacklogItems({})
  }, !(backlogItemsIsLoading || backlogItemsIsError) ? 5000 : null)

  return <>
    <BacklogHeader
      aggregatedContainerStatus={aggregatedContainerStatus}
      scanConfigs={scanConfigs}
      cfgNameState={cfgNameState}
      priorityState={priorityState}
      backlogItemsFetchDetails={backlogItemsFetchDetails}
      selectedBacklogItems={selectedBacklogItems}
      setSelectedBacklogItems={setSelectedBacklogItems}
      setRefreshBacklogItems={setRefreshBacklogItems}
      refresh={refresh}
    />
    <div style={{height: '2rem'}}/>
    <BacklogItems
      service={service}
      scanConfig={scanConfigs.find((scanConfig) => scanConfig.name === cfgName)}
      filteredBacklogItems={filteredBacklogItems}
      backlogItemsFetchDetails={backlogItemsFetchDetails}
      selectedBacklogItems={selectedBacklogItems}
      setSelectedBacklogItems={setSelectedBacklogItems}
      setRefreshBacklogItems={setRefreshBacklogItems}
    />
  </>
}
Backlog.displayName = 'Backlog'
Backlog.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object).isRequired,
  cfgNameState: PropTypes.object.isRequired,
  priorityState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogHeader = ({
  aggregatedContainerStatus,
  scanConfigs,
  cfgNameState,
  priorityState,
  backlogItemsFetchDetails,
  selectedBacklogItems,
  setSelectedBacklogItems,
  setRefreshBacklogItems,
  refresh,
}) => {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()

  const [deletionIsLoading, setDeletionIsLoading] = React.useState(false)

  const {cfgName, setCfgName} = cfgNameState
  const {priority, setPriority} = priorityState

  const fetchDeleteBacklogItem = async () => {
    setDeletionIsLoading(true)

    try {
      await serviceExtensions.backlogItems.delete({
        names: selectedBacklogItems.map((backlogItem) => backlogItem.metadata.name)
      })
    } catch(error) {
      enqueueSnackbar(
        `Could not delete ${selectedBacklogItems.length} backlog ${pluralise('item', selectedBacklogItems.length)}`,
        {
          ...errorSnackbarProps,
          details: error.toString(),
          onRetry: () => fetchDeleteBacklogItem(),
        },
      )
      setDeletionIsLoading(false)
      return
    }

    enqueueSnackbar(
      `Successfully deleted ${selectedBacklogItems.length} backlog ${pluralise('item', selectedBacklogItems.length)}`,
      {
        variant: 'success',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
        autoHideDuration: 6000,
      },
    )
    setSelectedBacklogItems([])
    setDeletionIsLoading(false)
    setRefreshBacklogItems({})
  }

  return <Stack direction='row' spacing={3} display='flex' alignItems='center' justifyContent='space-between'>
    <Stack direction='row' spacing={3} display='flex' alignItems='center'>
      <CfgNameFilter
        cfgName={cfgName}
        setCfgName={setCfgName}
        scanConfigs={scanConfigs}
      />
      <PriorityFilter
        priority={priority}
        setPriority={setPriority}
      />
      <IconButton
        title='Refresh'
        sx={{
          backgroundColor: theme.palette.grey,
          border: `1px solid ${theme.palette.text.primary}`,
          color: theme.palette.text.primary,
        }}
        onClick={() => {
          refresh.statuses()
          setRefreshBacklogItems({})
        }}
        disabled={backlogItemsFetchDetails.isLoading}
      >
        <RefreshIcon/>
      </IconButton>
      <ServiceStatus serviceStatus={aggregatedContainerStatus}/>
    </Stack>
    <span>
      <Button
        color='secondary'
        endIcon={<DeleteIcon/>}
        onClick={fetchDeleteBacklogItem}
        startIcon={deletionIsLoading && <CircularProgress size='1em'/>}
        disabled={deletionIsLoading || backlogItemsFetchDetails.isLoading || selectedBacklogItems.length === 0}
        fullWidth
      >
        {`Delete Selected Backlog Items (${selectedBacklogItems.length})`}
      </Button>
    </span>
  </Stack>
}
BacklogHeader.displayName = 'BacklogHeader'
BacklogHeader.propTypes = {
  aggregatedContainerStatus: PropTypes.object.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object).isRequired,
  cfgNameState: PropTypes.object.isRequired,
  priorityState: PropTypes.object.isRequired,
  backlogItemsFetchDetails: PropTypes.object.isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  setRefreshBacklogItems: PropTypes.func.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogItems = ({
  service,
  scanConfig,
  filteredBacklogItems,
  backlogItemsFetchDetails,
  selectedBacklogItems,
  setSelectedBacklogItems,
  setRefreshBacklogItems,
}) => {
  const context = React.useContext(ConfigContext)

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(25)

  const orderDirections = {
    ASCENDING: 'asc',
    DESCENDING: 'desc',
  }
  const orderAttributes = {
    POSITION: 'position',
    COMPONENT: 'component',
    ARTEFACT: 'artefact',
    PRIORITY: 'priority',
    CLAIMED: 'claimed',
  }

  const [order, setOrder] = React.useState(orderDirections.ASCENDING)
  const [orderBy, setOrderBy] = React.useState(orderAttributes.POSITION)

  const {backlogItems, isLoading, isError} = backlogItemsFetchDetails

  React.useEffect(() => {
    const calculateMaxPage = () => {
      if (!filteredBacklogItems) return 0
      return parseInt((filteredBacklogItems.length - 1) / rowsPerPage)
    }
    if (page > calculateMaxPage()) setPage(calculateMaxPage())
  }, [filteredBacklogItems, page, rowsPerPage])

  if (isError) return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
    Backlog items could not be fetched.
  </Alert>
  // show loading skeleton if service changes (no items available yet) or no items found and is loading again
  else if (isLoading && !backlogItems) return <Skeleton/>
  else if (filteredBacklogItems.length === 0) return <Alert severity='success' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
    No open backlog items {String.fromCodePoint('0x1F973')} {/* "Party-Face" symbol */}
  </Alert>

  const allSelected = () => {
    return filteredBacklogItems.every((backlogItem) => {
      return selectedBacklogItems.map((bli) => bli.metadata.uid).includes(backlogItem.metadata.uid)
    })
  }

  const handleSort = (orderBy) => {
    setOrder(order === orderDirections.ASCENDING ? orderDirections.DESCENDING : orderDirections.ASCENDING)
    setOrderBy(orderBy)
  }

  const sortData = (data, comparator) => {
    return data.sort(comparator)
  }

  const getAccessMethod = () => {
    if (orderBy === orderAttributes.POSITION)
      return (bli) => bli.position
    if (orderBy === orderAttributes.COMPONENT)
      return (bli) => bli.spec.artefact.component_name
    if (orderBy === orderAttributes.ARTEFACT)
      return (bli) => bli.spec.artefact.artefact.artefact_name
    if (orderBy === orderAttributes.PRIORITY)
      return (bli) => bli.spec.priority
    if (orderBy === orderAttributes.CLAIMED)
      return (bli) => bli.claimed
  }

  const descendingComparator = (l, r) => {
    if (r < l) return -1
    if (r > l) return 1
    return 0
  }

  const getComparator = () => {
    const accessOrderByProperty = getAccessMethod()
    return order === orderDirections.DESCENDING
      ? (l, r) => descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
      : (l, r) => -descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
  }

  const handleChangePage = (e, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  return <Paper>
    <TableContainer>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              width='70em'
              onClick={() => {
                if (allSelected()) {
                  setSelectedBacklogItems([])
                  return
                }
                setSelectedBacklogItems((prev) => [
                  ...prev,
                  ...filteredBacklogItems.filter((backlogItem) => !selectedBacklogItems.map((bli) => bli.metadata.uid).includes(backlogItem.metadata.uid))
                ])
              }}
              sx={{
                '&:hover': {
                  cursor: 'pointer',
                },
              }}
            >
              <Checkbox checked={allSelected()}/>
            </TableCell>
            <TableCell sx={{textAlign: 'center'}}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.POSITION)}
                active={orderBy === orderAttributes.POSITION}
                direction={order}
              >
                Pos
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.COMPONENT)}
                active={orderBy === orderAttributes.COMPONENT}
                direction={order}
              >
                Component
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{textAlign: 'center'}}>Version</TableCell>
            <TableCell>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.ARTEFACT)}
                active={orderBy === orderAttributes.ARTEFACT}
                direction={order}
              >
                Artefact
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{textAlign: 'center'}}>Version</TableCell>
            <TableCell sx={{textAlign: 'center'}}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.PRIORITY)}
                active={orderBy === orderAttributes.PRIORITY}
                direction={order}
              >
                Priority
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{textAlign: 'center'}}>
              Ref
            </TableCell>
            <TableCell sx={{textAlign: 'center'}}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.CLAIMED)}
                active={orderBy === orderAttributes.CLAIMED}
                direction={order}
              >
                In Process
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            sortData([...filteredBacklogItems], getComparator())
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((backlogItem) => <BacklogItemRow
                key={backlogItem.metadata.uid}
                service={service}
                scanConfig={scanConfig}
                backlogItem={backlogItem}
                selectedBacklogItems={selectedBacklogItems}
                setSelectedBacklogItems={setSelectedBacklogItems}
                setRefreshBacklogItems={setRefreshBacklogItems}
              />)
          }
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={[25, 50, 100]}
      component='div'
      count={filteredBacklogItems.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
    />
  </Paper>
}
BacklogItems.displayName = 'BacklogItems'
BacklogItems.propTypes = {
  service: PropTypes.string.isRequired,
  scanConfig: PropTypes.object,
  filteredBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  backlogItemsFetchDetails: PropTypes.object.isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  setRefreshBacklogItems: PropTypes.func.isRequired,
}


const BacklogItemRow = ({
  service,
  scanConfig,
  backlogItem,
  selectedBacklogItems,
  setSelectedBacklogItems,
  setRefreshBacklogItems,
}) => {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()

  const updateBacklogItemPriority = async (backlogItem, priority) => {
    try {
      await serviceExtensions.backlogItems.update({
        name: backlogItem.metadata.name,
        spec: {
          ...backlogItem.spec,
          priority: priority.value,
        },
      })
      setRefreshBacklogItems({})
    } catch(error) {
      enqueueSnackbar(
        `Could not update priority of backlog item to ${priority.name}`,
        {
          ...errorSnackbarProps,
          details: error.toString(),
          onRetry: () => updateBacklogItemPriority(backlogItem, priority),
        },
      )
    }
  }

  return <TableRow
    onClick={() => {
      if (selectedBacklogItems.find((selectedBacklogItem) => selectedBacklogItem.metadata.uid === backlogItem.metadata.uid)) {
        setSelectedBacklogItems((prev) => prev.filter((selectedBacklogItem) => selectedBacklogItem.metadata.uid !== backlogItem.metadata.uid))
        return
      }
      setSelectedBacklogItems((prev) => [
        ...prev,
        backlogItem,
      ])
    }}
    sx={{
      '&:hover': {
        backgroundColor: alpha(theme.palette.common.black, 0.15),
        cursor: 'pointer',
      },
    }}
  >
    <TableCell sx={{width: '5vw'}}>
      <Checkbox checked={Boolean(selectedBacklogItems.find((selectedBacklogItem) => selectedBacklogItem.metadata.uid === backlogItem.metadata.uid))}/>
    </TableCell>
    <TableCell sx={{width: '5vw', textAlign: 'center'}}>
      <Typography variant='inherit'>{backlogItem.position}</Typography>
    </TableCell>
    <TableCell sx={{width: '20vw'}}>
      <Typography variant='inherit'>{backlogItem.spec.artefact.component_name}</Typography>
    </TableCell>
    <TableCell sx={{width: '15vw', textAlign: 'center'}}>
      {backlogItem.spec.artefact.component_version && <CopyOnClickChip
        value={backlogItem.spec.artefact.component_version}
        label={trimLongString(backlogItem.spec.artefact.component_version, 12)}
        chipProps={{
          variant: 'outlined',
          title: backlogItem.spec.artefact.component_version,
        }}
      />
      }
    </TableCell>
    <TableCell sx={{width: '20vw'}}>
      <Typography variant='inherit'>{backlogItem.spec.artefact.artefact.artefact_name}</Typography>
    </TableCell>
    <TableCell sx={{width: '15vw', textAlign: 'center'}}>
      {backlogItem.spec.artefact.artefact.artefact_version && <CopyOnClickChip
        value={backlogItem.spec.artefact.artefact.artefact_version}
        label={trimLongString(backlogItem.spec.artefact.artefact.artefact_version, 12)}
        chipProps={{
          variant: 'outlined',
          title: backlogItem.spec.artefact.artefact.artefact_version,
        }}
      />
      }
    </TableCell>
    <TableCell sx={{width: '10vw', textAlign: 'center'}}>
      <FormControl variant='standard'>
        <Select
          value={Object.values(PRIORITIES).find((p) => backlogItem.spec.priority === p.value)}
          onChange={(e) => updateBacklogItemPriority(backlogItem, e.target.value)}
          onClick={(e) => e.stopPropagation()}
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
    </TableCell>
    <TableCell sx={{width: '10vw', textAlign: 'center'}}>
      <BacklogItemReference
        service={service}
        scanConfig={scanConfig}
        backlogItem={backlogItem}
      />
    </TableCell>
    <TableCell sx={{width: '10vw', textAlign: 'center'}}>
      {
        backlogItem.claimed && <Tooltip title={`Started at: ${new Date(backlogItem.claimedAt).toLocaleString()}`}>
          <HourglassBottomIcon fontSize='small'/>
        </Tooltip>
      }
    </TableCell>
  </TableRow>
}
BacklogItemRow.displayName = 'BacklogItemRow'
BacklogItemRow.propTypes = {
  service: PropTypes.string.isRequired,
  scanConfig: PropTypes.object,
  backlogItem: PropTypes.object.isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  setRefreshBacklogItems: PropTypes.func.isRequired,
}


const BacklogItemReference = ({
  service,
  scanConfig,
  backlogItem,
}) => {
  const theme = useTheme()

  if (!scanConfig) return <Skeleton/>

  const component = {
    name: backlogItem.spec.artefact.component_name,
    version: backlogItem.spec.artefact.artefact.component_version,
  }
  const artefact = {
    name: backlogItem.spec.artefact.artefact.artefact_name,
    version: backlogItem.spec.artefact.artefact.artefact_version,
  }

  if (service === COMPLIANCE_TOOLS.BDBA) {
    const bdbaUrl = scanConfig.config.bdba.base_url
    const group = scanConfig.config.bdba.group_id
    const search = `${artefact.name}_${artefact.version}_${component.name.replaceAll('/', '_')}`
    const bdbaUrlForArtefact = `${bdbaUrl}/#/groups/${group}/applications?search=${search}`

    return <IconButton
      title='View in BDBA'
      sx={{
        backgroundColor: theme.palette.grey,
        color: theme.palette.text.primary,
      }}
      onClick={(e) => {
        e.stopPropagation()
        window.open(bdbaUrlForArtefact, '_blank')
      }}
    >
      <OpenInNewIcon fontSize='small'/>
    </IconButton>
  } else if (service === COMPLIANCE_TOOLS.ISSUE_REPLICATOR) {
    const repoUrl = scanConfig.config.issueReplicator.github_issues_target_repository_url
    const issueState = encodeURIComponent('is:open')
    const name = encodeURIComponent(`${component.name}:${artefact.name}`)
    const repoUrlForArtefact = `https://${repoUrl}/issues?q=${issueState}+${name}`

    return <IconButton
      title='View on GitHub'
      sx={{
        backgroundColor: theme.palette.grey,
        color: theme.palette.text.primary,
      }}
      onClick={(e) => {
        e.stopPropagation()
        window.open(repoUrlForArtefact, '_blank')
      }}
    >
      <OpenInNewIcon fontSize='small'/>
    </IconButton>
  }
}
BacklogItemReference.displayName = 'BacklogItemReference'
BacklogItemReference.propTypes = {
  service: PropTypes.string.isRequired,
  scanConfig: PropTypes.object,
  backlogItem: PropTypes.object.isRequired,
}


const CfgNameFilter = ({
  cfgName,
  setCfgName,
  scanConfigs,
}) => {
  if (!cfgName) return <Skeleton/>

  return <FormControl variant='standard'>
    <InputLabel>Configuration</InputLabel>
    <Select
      value={cfgName}
      onChange={(e) => setCfgName(e.target.value)}
      sx={{ minWidth: '150px' }}
    >
      {
        scanConfigs.map((scanConfig) => <MenuItem key={scanConfig.name} value={scanConfig.name}>
          <Typography variant='body2'>
            {scanConfig.name}
          </Typography>
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
CfgNameFilter.displayName = 'CfgNameFilter'
CfgNameFilter.propTypes = {
  cfgName: PropTypes.string,
  setCfgName: PropTypes.func.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const PriorityFilter = ({
  priority,
  setPriority,
}) => {
  return <FormControl variant='standard'>
    <InputLabel>Minimum Priority</InputLabel>
    <Select
      value={priority}
      onChange={(e) => setPriority(e.target.value)}
      sx={{ minWidth: '150px' }}
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
PriorityFilter.displayName = 'PriorityFilter'
PriorityFilter.propTypes = {
  priority: PropTypes.object.isRequired,
  setPriority: PropTypes.func.isRequired,
}


const LogTab = ({
  service,
  aggregatedContainerStatus,
  logCollectionsFetchDetails,
  logLevelState,
  refresh,
}) => {
  const theme = useTheme()

  const {logCollections, isLoading, isError} = logCollectionsFetchDetails
  const {logLevel, setLogLevel} = logLevelState

  const logs = logCollections?.length === 1 ? [...logCollections[0].spec.logs].reverse().map(
    (log, idx) => {
      return {
        ...log,
        id: idx,
      }
    }
  ) : []

  return <>
    <Stack direction='row' spacing={3} display='flex' alignItems='center' justifyContent='space-between'>
      <Stack direction='row' spacing={3} display='flex' alignItems='center'>
        <LogLevelFilter
          logLevel={logLevel}
          setLogLevel={setLogLevel}
        />
        <IconButton
          title='Refresh'
          sx={{
            backgroundColor: theme.palette.grey,
            border: `1px solid ${theme.palette.text.primary}`,
            color: theme.palette.text.primary,
          }}
          onClick={() => {
            refresh.statuses()
            refresh.logs()
          }}
          disabled={isLoading}
        >
          <RefreshIcon/>
        </IconButton>
        <ServiceStatus serviceStatus={aggregatedContainerStatus}/>
      </Stack>
      <DownloadLogs logs={logs} service={service} logLevel={logLevel} disabled={isLoading || isError}/>
    </Stack>
    <div style={{height: '2rem'}}/>
    <Logs logs={logs} isLoading={isLoading} isError={isError}/>
  </>
}
LogTab.displayName = 'LogTab'
LogTab.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  logCollectionsFetchDetails: PropTypes.object.isRequired,
  logLevelState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


export const Logs = ({
  logs,
  isLoading,
  isError,
}) => {
  const theme = useTheme()
  const context = React.useContext(ConfigContext)

  if (isError) return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
    Logs could not be fetched.
  </Alert>
  // show loading skeleton if service/log level changes (no logs available yet) or no logs found and is loading again
  else if (isLoading && logs.length === 0) return <Skeleton/>

  const columns = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      type: 'dateTime',
      flex: 10,
      valueGetter: (value) => new Date(value),
    },
    {
      field: 'logLevel',
      headerName: 'Level',
      flex: 5,
      renderCell: ({value}) => {
        return <div style={{color: theme.palette[logLevelToThemeColor(value)].main}}>
          {value}
        </div>
      },
    },
    {
      field: 'thread',
      headerName: 'Thread',
      description: 'The name of the thread the log was written in',
      flex: 7,
    },
    {
      field: 'name',
      headerName: 'Name',
      description: 'The name of the module the log was written in',
      flex: 7,
    },
    {
      field: 'message',
      headerName: 'Message',
      flex: 40,
      renderCell: ({value}) => {
        if (value.replace(/\n$/).includes('\n'))
          // if value contains linebreaks (except in last line), honour these and also use
          // monospace font to ensure lines are correctly aligned -> e.g. relevant for stacktraces
          return <div style={{whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12}}>{value}</div>
        return value
      },
    },
  ]

  return <DataGrid
    rows={logs}
    columns={columns}
    initialState={{
      pagination: {
        paginationModel: { page: 0, pageSize: 100 },
      },
    }}
    pageSizeOptions={[50, 100]}
    getRowHeight={() => 'auto'}
    autoHeight={true}
    disableRowSelectionOnClick={true}
    sx={{
      [`& .${gridClasses.cell}`]: {
        py: 1,
      },
    }}
  />
}
Logs.displayName = 'Logs'
Logs.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.object).isRequired,
  isLoading: PropTypes.bool.isRequired,
  isError: PropTypes.bool.isRequired,
}


const LogLevelFilter = ({
  logLevel,
  setLogLevel,
}) => {
  const logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR']

  return <FormControl variant='standard'>
    <InputLabel>Minimum Log Level</InputLabel>
    <Select
      value={logLevel}
      onChange={(e) => setLogLevel(e.target.value)}
      sx={{ minWidth: '150px' }}
    >
      {
        logLevels.map((level) => <MenuItem key={level} value={level}>
          <Typography color={`${logLevelToThemeColor(level)}.main`} variant='body2'>
            {level}
          </Typography>
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
LogLevelFilter.displayName = 'LogLevelFilter'
LogLevelFilter.propTypes = {
  logLevel: PropTypes.string.isRequired,
  setLogLevel: PropTypes.func.isRequired,
}


const DownloadLogs = ({
  logs,
  service,
  logLevel,
  disabled,
}) => {
  const theme = useTheme()
  const plaintextLogs = logs.map((log) => {
    return `${log.timestamp} [${log.logLevel}] [${log.thread}] ${log.name}: ${log.message}\n`
  }).join('')

  const handleClick = async () => {
    const blob = new Blob([plaintextLogs], {
      type: 'text/plain',
    })
    const filename = `logs-${service}-${logLevel}.txt`

    const href = await URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return <Button
    startIcon={<CloudDownloadIcon />}
    onClick={handleClick}
    variant='outlined'
    style={theme.bomButton}
    disabled={disabled}
  >
    Download Logs
  </Button>
}
DownloadLogs.displayName = 'DownloadLogs'
DownloadLogs.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.object).isRequired,
  service: PropTypes.string.isRequired,
  logLevel: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
}
