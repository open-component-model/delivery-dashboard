import React from 'react'

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
import RefreshIcon from '@mui/icons-material/Refresh'
import { alpha } from '@mui/material/styles'
import { DataGrid, gridClasses } from '@mui/x-data-grid'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import {
  useFetchBacklogItems,
  useFetchContainerStatuses,
  useFetchLogCollections,
} from '../fetch'
import CopyOnClickChip from '../util/copyOnClickChip'
import { PersistentDrawerLeft } from '../layout'
import { TabPanel } from '../component/tabs'
import {
  COMPLIANCE_TOOLS,
  errorSnackbarProps,
  PRIORITIES,
  servicesTabConfig,
} from '../consts'
import {
  camelCaseToDisplayText,
  getAggregatedContainerStatus,
  logLevelToThemeColor,
  pluralise,
  trimLongString,
  useInterval,
} from '../util'
import { serviceExtensions } from '../api'
import { ServiceStatus } from './service'
import { ConfigContext, SearchParamContext } from '../App'


export const MonitoringPage = () => {
  const searchParamContext = React.useContext(SearchParamContext)
  const service = searchParamContext.get('service')

  // use cache during initial load
  const skipCache = React.useRef(false)

  const [statuses, statusesState, refreshContainerStatus] = useFetchContainerStatuses({
    service: service,
    skipCache: skipCache.current,
  })
  const aggregatedContainerStatus = getAggregatedContainerStatus({statuses, statusesAreLoading: statusesState.isLoading})

  const [logLevel, setLogLevel] = React.useState('INFO')
  const [logCollections, logCollectionsState, refreshLogCollections] = useFetchLogCollections({
    service: service,
    logLevel: logLevel,
    skipCache: skipCache.current,
  })

  // refreshing should bypass cache
  const refreshWithoutCache = React.useCallback((callable) => {
    skipCache.current = true
    callable()
  }, [])

  const refresh = {
    statuses: () => refreshWithoutCache(refreshContainerStatus),
    logs: () => refreshWithoutCache(refreshLogCollections),
  }

  return <PersistentDrawerLeft open>
    <Stack spacing={1}>
      <Typography variant='h4' style={{marginBottom: '2rem'}}>
        {`Monitoring - ${camelCaseToDisplayText(service)}`}
      </Typography>
      {
        Object.values(COMPLIANCE_TOOLS).includes(service) ? <ServiceTabs
          service={service}
          aggregatedContainerStatus={aggregatedContainerStatus}
          showLoadingAnimation={logCollections === undefined && logCollectionsState.isLoading} // skip animation on re-fetch
          error={logCollectionsState.error}
          logCollections={logCollections}
          logLevelState={{logLevel, setLogLevel}}
          refresh={refresh}
        /> : <LogTab
          service={service}
          aggregatedContainerStatus={aggregatedContainerStatus}
          logLevelState={{logLevel, setLogLevel}}
          refresh={refresh}
          showLoadingAnimation={logCollections === undefined && logCollectionsState.isLoading} // skip animation on re-fetch
          error={logCollectionsState.error}
          logCollections={logCollections}
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
  showLoadingAnimation,
  error,
  logCollections,
  logLevelState,
  refresh,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const currentTab = searchParamContext.get('servicesTab') || servicesTabConfig.BACKLOG.id

  // priority is already initialised here to keep state between tab changes
  const [priority, setPriority] = React.useState(PRIORITIES.NONE)

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
        priorityState={{priority, setPriority}}
        refresh={refresh}
      />
    </TabPanel>
    <TabPanel value={currentTab} index={servicesTabConfig.LOGS.id}>
      <LogTab
        service={service}
        aggregatedContainerStatus={aggregatedContainerStatus}
        showLoadingAnimation={showLoadingAnimation}
        error={error}
        logCollections={logCollections}
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
  showLoadingAnimation: PropTypes.bool.isRequired,
  error: PropTypes.any,
  logCollections: PropTypes.array,
  logLevelState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogTab = ({
  service,
  aggregatedContainerStatus,
  priorityState,
  refresh,
}) => {
  const {priority} = priorityState

  // use cache during initial load
  const skipCache = React.useRef(false)

  const [backlogItems, backlogItemsState, refreshBacklogItems] = useFetchBacklogItems({
    service: service,
    skipCache: skipCache.current,
  })
  const backlogItemsFetchDetails = {
    backlogItems: backlogItems,
    isLoading: backlogItemsState.isLoading,
    isError: backlogItemsState.error,
  }
  const [selectedBacklogItems, setSelectedBacklogItems] = React.useState([])

  const filteredBacklogItems = React.useCallback(() => {
    if (backlogItems === undefined) return []
    return backlogItems.sort((a, b) => {
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
    })
  }, [priority, backlogItems, backlogItemsState.isLoading, backlogItemsState.error])

  const backlogItemClaimedAt = React.useCallback((backlogItem) => {
    const domain = 'delivery-gear.gardener.cloud'
    const annotationClaimedAt = `${domain}/claimed-at`
    const labelClaimed = `${domain}/claimed`

    const annotations = backlogItem.metadata.annotations
    const labels = backlogItem.metadata.labels
    if (labelClaimed in labels && labels[labelClaimed] === 'True') {
      return annotations[annotationClaimedAt]
    }
    return null
  }, [])

  React.useEffect(() => {
    // remove selection of backlog items which were processed in the meantime

    setSelectedBacklogItems((prev) => prev.filter((backlogItem) => {
      return backlogItems.map((bli) => bli.metadata.uid).includes(backlogItem.metadata.uid)
    }))
  }, [backlogItems])

  // periodically update backlog items
  useInterval(() => {
    refresh.statuses()
    skipCache.current = true
    refreshBacklogItems()
  }, !(backlogItemsState.isLoading || backlogItemsState.error) ? 5000 : null)

  return <>
    <BacklogHeader
      aggregatedContainerStatus={aggregatedContainerStatus}
      priorityState={priorityState}
      backlogItemsFetchDetails={backlogItemsFetchDetails}
      selectedBacklogItems={selectedBacklogItems}
      setSelectedBacklogItems={setSelectedBacklogItems}
      refreshBacklogItems={refreshBacklogItems}
      refresh={refresh}
    />
    <div style={{height: '2rem'}}/>
    <BacklogItems
      filteredBacklogItems={filteredBacklogItems()}
      error={backlogItemsState.error}
      selectedBacklogItems={selectedBacklogItems}
      setSelectedBacklogItems={setSelectedBacklogItems}
      refreshBacklogItems={refreshBacklogItems}
      showLoadingAnimation={backlogItems === undefined && backlogItemsState.isLoading} // skip animation on re-fetch
    />
  </>
}
BacklogTab.displayName = 'BacklogTab'
BacklogTab.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  priorityState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogHeader = ({
  aggregatedContainerStatus,
  priorityState,
  backlogItemsFetchDetails,
  selectedBacklogItems,
  setSelectedBacklogItems,
  refreshBacklogItems,
  refresh,
}) => {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()

  const [deletionIsLoading, setDeletionIsLoading] = React.useState(false)

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
    refreshBacklogItems()
  }

  return <Stack direction='row' spacing={3} display='flex' alignItems='center' justifyContent='space-between'>
    <Stack direction='row' spacing={3} display='flex' alignItems='center'>
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
          refreshBacklogItems()
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
  priorityState: PropTypes.object.isRequired,
  backlogItemsFetchDetails: PropTypes.object.isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  refreshBacklogItems: PropTypes.func.isRequired,
  refresh: PropTypes.object.isRequired,
}


const BacklogItems = ({
  filteredBacklogItems,
  selectedBacklogItems,
  setSelectedBacklogItems,
  refreshBacklogItems,
  showLoadingAnimation,
  error,
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

  React.useEffect(() => {
    const calculateMaxPage = () => {
      if (!filteredBacklogItems) return 0
      return parseInt((filteredBacklogItems.length - 1) / rowsPerPage)
    }
    if (page > calculateMaxPage()) setPage(calculateMaxPage())
  }, [filteredBacklogItems, page, rowsPerPage])

  if (error) return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
    Backlog items could not be fetched.
  </Alert>
  // show loading skeleton if service changes (no items available yet) or no items found and is loading again
  else if (showLoadingAnimation) return <Skeleton/>
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
                backlogItem={backlogItem}
                selectedBacklogItems={selectedBacklogItems}
                setSelectedBacklogItems={setSelectedBacklogItems}
                refreshBacklogItems={refreshBacklogItems}
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
  filteredBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  refreshBacklogItems: PropTypes.func.isRequired,
  showLoadingAnimation: PropTypes.bool.isRequired,
  error: PropTypes.any,
}


const BacklogItemRow = ({
  backlogItem,
  selectedBacklogItems,
  setSelectedBacklogItems,
  refreshBacklogItems,
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
      refreshBacklogItems()
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
  backlogItem: PropTypes.object.isRequired,
  selectedBacklogItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedBacklogItems: PropTypes.func.isRequired,
  refreshBacklogItems: PropTypes.func.isRequired,
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
  error,
  logLevelState,
  refresh,
  showLoadingAnimation,
  logCollections,
}) => {
  const theme = useTheme()

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
          disabled={showLoadingAnimation}
        >
          <RefreshIcon/>
        </IconButton>
        <ServiceStatus serviceStatus={aggregatedContainerStatus}/>
      </Stack>
      <DownloadLogs logs={logs} service={service} logLevel={logLevel} disabled={showLoadingAnimation || Boolean(error)}/>
    </Stack>
    <div style={{height: '2rem'}}/>
    <Logs logs={logs} isLoading={showLoadingAnimation} isError={Boolean(error)}/>
  </>
}
LogTab.displayName = 'LogTab'
LogTab.propTypes = {
  service: PropTypes.string.isRequired,
  aggregatedContainerStatus: PropTypes.object.isRequired,
  logCollections: PropTypes.array,
  logLevelState: PropTypes.object.isRequired,
  refresh: PropTypes.object.isRequired,
  showLoadingAnimation: PropTypes.bool.isRequired,
  error: PropTypes.any,
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
