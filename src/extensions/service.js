import React from 'react'

import {
  Chip,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, gridClasses } from '@mui/x-data-grid'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import PropTypes from 'prop-types'
import { useNavigate } from 'react-router'

import {
  useFetchContainerStatuses,
  useFetchLogCollections,
  useFetchServiceExtensions,
} from '../fetch'
import {PersistentDrawerLeft} from '../layout'
import ExtraWideTooltip from '../util/extraWideTooltip'
import {
  healthStatuses,
  MONITORING_PATH,
} from '../consts'
import {
  camelCaseToDisplayText,
  getAggregatedContainerStatus,
  getAggregatedLoggingStatus,
  removeNullValues,
  snakeToCamelCase,
  toYamlString,
} from '../util'


export const ServicesPage = () => {
  return <PersistentDrawerLeft open={true}>
    <Stack direction='column' spacing={5}>
      <Typography variant='h4'>Extension Overview</Typography>
      <Services />
    </Stack>
  </PersistentDrawerLeft>
}


const Services = () => {
  const navigate = useNavigate()
  const [services, state] = useFetchServiceExtensions()
  const [statuses, statusesState] = useFetchContainerStatuses({})
  const [logCollections, logCollectionsState] = useFetchLogCollections({logLevel: 'ERROR'})

  if (!services || state.isLoading || state.error) {
    return null
  }

  const columns = [
    {
      field: 'service',
      headerName: 'Name',
      flex: 3,
      valueGetter: (value) => camelCaseToDisplayText(value),
    },
    {
      field: 'aggregatedContainerStatus',
      headerName: 'Container Status',
      flex: 5,
      sortable: false,
      renderCell: ({value}) =>  <ServiceStatus serviceStatus={value} />
    },
    {
      field: 'aggregatedLoggingStatus',
      headerName: 'Logging Status',
      flex: 5,
      sortable: false,
      renderCell: ({value}) =>  <ServiceStatus serviceStatus={value} />
    },
  ]

  const aggregatedServiceStatuses = services.map((service, idx) => {
    return {
      id: idx,
      service,
      aggregatedContainerStatus: getAggregatedContainerStatus({
        statuses: statuses?.filter((status) => snakeToCamelCase(status.name).startsWith(service)),
        statusesAreLoading: statusesState.isLoading,
      }),
      aggregatedLoggingStatus: getAggregatedLoggingStatus({
        logCollection: logCollections?.find((logCollection) => logCollection.spec.service === service),
        logCollectionIsLoading: logCollectionsState.isLoading,
      })
    }
  })

  return <DataGrid
    rows={aggregatedServiceStatuses}
    columns={columns}
    hideFooter={true}
    getRowHeight={() => 'auto'}
    autoHeight={true}
    disableColumnMenu={true}
    onRowClick={(params) => {
      const service = aggregatedServiceStatuses.find((row) => row.id === params.id)?.service
      const query = new URLSearchParams({
        service: service,
      })
      navigate(`${MONITORING_PATH}?${query.toString()}`)
    }}
    sx={{
      [`& .${gridClasses.cell}`]: {
        py: 1,
      },
      '& .MuiDataGrid-row:hover': {
        cursor: 'pointer',
      },
    }}
  />
}
Services.displayName = 'Services'


export const ServiceStatus = ({
  serviceStatus,
}) => {
  const chip = <Chip
    label={serviceStatus.description}
    color={serviceStatus.status.color}
    variant='outlined'
    size='small'
  />
  return <Stack direction='row' spacing={1}>
    <ServiceStatusIcon serviceStatus={serviceStatus} />
    {
      serviceStatus.values?.length > 0 ? <ExtraWideTooltip
        title={
          <Stack direction={'column'} spacing={1} onClick={(e) => e.stopPropagation()}>
            {
              serviceStatus.values.map((value, idx) => <React.Fragment key={idx}>
                {
                  idx > 0 && <Divider />
                }
                <Typography variant='inherit' sx={{whiteSpace: 'pre-wrap', maxWidth: 'none'}}>
                  {toYamlString(removeNullValues(value))}
                </Typography>
              </React.Fragment>)
            }
          </Stack>
        }
      >
        {
          chip
        }
      </ExtraWideTooltip> : chip
    }
  </Stack>
}
ServiceStatus.displayName = 'ServiceStatus'
ServiceStatus.propTypes = {
  serviceStatus: PropTypes.object,
}


const ServiceStatusIcon = ({
  serviceStatus,
}) => {
  const color = serviceStatus.status.color
  const withTooltip = (children) => <Tooltip title={serviceStatus.description}>
    { children }
  </Tooltip>

  if (serviceStatus.status === healthStatuses.UNHEALTHY)
    return withTooltip(<ReportProblemOutlinedIcon color={color} />)

  if (serviceStatus.status === healthStatuses.CHECKING)
    return withTooltip(<WarningAmberIcon color={color} />)

  if (serviceStatus.status === healthStatuses.HEALTHY)
    return withTooltip(<CheckCircleOutlineIcon color={color} />)

  return withTooltip(<HelpOutlineOutlinedIcon color={color} />)
}
ServiceStatusIcon.displayName = 'ServiceStatusIcon'
ServiceStatusIcon.propTypes = {
  serviceStatus: PropTypes.object,
}
