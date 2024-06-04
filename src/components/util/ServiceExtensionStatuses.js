import React from 'react'
import PropTypes from 'prop-types'

import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import {
  useFetchContainerStatuses,
  useFetchLogCollections,
  useFetchServiceExtensions,
} from './../../api/useFetch.js'
import {
  camelCaseToDisplayText,
  getAggregatedContainerStatus,
  getAggregatedLoggingStatus,
  snakeToCamelCase,
} from './../../util.js'
import {
  MONITORING_PATH,
  SERVICES_PATH,
  healthStatuses,
} from './../../consts.js'
import ExtraWideTooltip from './ExtraWideTooltip.js'
import { ServiceStatus } from './../../pages/ServicesPage.js'


const ServiceExtensionStatus = () => {
  const [services, servicesAreLoading, servicesHaveError] = useFetchServiceExtensions()
  const [statuses, statusesAreLoading] = useFetchContainerStatuses({useCache: true})
  const [logCollections, logCollectionsAreLoading] = useFetchLogCollections({logLevel: 'ERROR', useCache: true})

  if (!services || servicesAreLoading || servicesHaveError) {
    return <a href={`#${SERVICES_PATH}`}>
      <Skeleton sx={{
        width: '1rem',
      }}/>
    </a>
  }

  const aggregatedServiceStatuses = services.map((service) => {
    const aggregatedContainerStatus = getAggregatedContainerStatus({
      statuses: statuses?.filter((status) => snakeToCamelCase(status.name).startsWith(service)),
      statusesAreLoading,
    })
    const aggregatedLoggingStatus = getAggregatedLoggingStatus({
      logCollection: logCollections?.find((logCollection) => logCollection.spec.service === service),
      logCollectionIsLoading: logCollectionsAreLoading,
    })
    const worstStatus = aggregatedContainerStatus.status.severity > aggregatedLoggingStatus.status.severity ?
      aggregatedContainerStatus.status :
      aggregatedLoggingStatus.status
    return {
      service,
      aggregatedContainerStatus,
      aggregatedLoggingStatus,
      worstStatus,
    }
  })

  return <ServiceExtensionStatusChip serviceStatuses={aggregatedServiceStatuses}/>
}


const ServiceExtensionStatusChip = ({
  serviceStatuses,
}) => {
  const navigate = useNavigate()

  const worstHealthStatus = serviceStatuses.reduce((worstStatus, cur) => {
    return cur.worstStatus.severity > worstStatus.severity ? cur.worstStatus : worstStatus
  }, healthStatuses.HEALTHY)

  const worstServices = serviceStatuses.filter((serviceStatus) => {
    if (worstHealthStatus === healthStatuses.NOT_FOUND) {
      // Handle both `NOT_FOUND` and `HEALTHY` the same in the general status chip,
      // but differently in the detailed status overview table
      return serviceStatus.worstStatus.severity <= worstHealthStatus.severity
    } else {
      return serviceStatus.worstStatus === worstHealthStatus
    }
  })

  const tooltipContent = <Table
    padding='checkbox'
    sx={{
      [`& .${tableCellClasses.root}`]: {borderBottom: 'none'},
      borderCollapse: 'separate',
      borderSpacing: '0 0.5rem',
    }}
  >
    <TableHead>
      <TableRow>
        <TableCell sx={{width: '34%'}}>
          <Typography variant='inherit' color='white' sx={{marginRight: '8rem'}}>Name</Typography>
        </TableCell>
        <TableCell sx={{width: '33%'}}>
          <Typography variant='inherit' color='white' sx={{marginRight: '8rem'}}>Container Status</Typography>
        </TableCell>
        <TableCell sx={{width: '33%'}}>
          <Typography variant='inherit' color='white'>Logging Status</Typography>
        </TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {
        serviceStatuses.map((serviceStatus) => <TableRow
          key={serviceStatus.service}
          onClick={() => {
            const query = new URLSearchParams({
              service: serviceStatus.service,
            })
            navigate(`${MONITORING_PATH}?${query.toString()}`)
          }}
          sx={{':hover': {
            cursor: 'pointer',
            backgroundColor: 'grey',
          }}}
        >
          <TableCell sx={{width: '34%'}}>
            <Typography variant='inherit' color='white'>
              {camelCaseToDisplayText(serviceStatus.service)}
            </Typography>
          </TableCell>
          <TableCell sx={{width: '33%'}}>
            <ServiceStatus serviceStatus={serviceStatus.aggregatedContainerStatus} />
          </TableCell>
          <TableCell sx={{width: '33%'}}>
            <ServiceStatus serviceStatus={serviceStatus.aggregatedLoggingStatus} />
          </TableCell>
        </TableRow>)
      }
    </TableBody>
  </Table>

  return <a href={`#${SERVICES_PATH}`}>
    <ExtraWideTooltip title={tooltipContent}>
      <Badge
        badgeContent={worstServices.length}
        invisible={worstServices.length <= 1}
        color='primary'
      >
        <ServiceStatusIndicator serviceStatus={worstHealthStatus}/>
      </Badge>
    </ExtraWideTooltip>
  </a>
}
ServiceExtensionStatusChip.displayName = 'ServiceExtensionStatusChip'
ServiceExtensionStatusChip.propTypes = {
  serviceStatuses: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const ServiceStatusIndicator = ({
  serviceStatus,
}) => {
  if (serviceStatus === healthStatuses.UNHEALTHY)
    return <ReportProblemOutlinedIcon color={serviceStatus.color}/>

  if (serviceStatus === healthStatuses.CHECKING)
    return <WarningAmberIcon color={serviceStatus.color}/>

  if (serviceStatus === healthStatuses.HEALTHY || serviceStatus === healthStatuses.NOT_FOUND)
    return <CheckCircleOutlineIcon color={serviceStatus.color}/>

  return <HelpOutlineOutlinedIcon color={serviceStatus.color}/>
}
ServiceStatusIndicator.displayName = 'ServiceStatusIndicator'
ServiceStatusIndicator.propTypes = {
  serviceStatus: PropTypes.object.isRequired,
}


export default ServiceExtensionStatus
