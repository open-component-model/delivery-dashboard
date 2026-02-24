import React from 'react'
import {
  Box,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm'

import PropTypes from 'prop-types'

import { useFetchCurrentSprintInfos } from '../fetch'


const dateStrFilter = () => {
  return (date) => {
    const candidateDate = new Date(date.value)
    if (isNaN(candidateDate)) return false
    return true
  }
}

const futureDateFilter = ({date}) => {
  return (futureDate) => {
    const candidateDate = new Date(futureDate.value)
    if (candidateDate.getTime() > date.getTime()) return true
    return false
  }
}


const NextEvent = ({
  sprintInfos,
  date,
}) => {
  const futureEvents = sprintInfos.dates.filter(
    dateStrFilter()
  ).filter(
    futureDateFilter({date: date})
  )

  if (futureEvents.length === 0) {
    return <Typography variant='body2'>
      Sprint ends today.
    </Typography>
  }

  const nextEvent = futureEvents.reduce((min, current) => {
    // get earliest date
    if (!min) return current

    if (new Date(min.value).getTime() < new Date(current.value).getTime()) return min
    return current
  })

  const diffDays = Math.ceil(Math.abs((date.getTime() - new Date(nextEvent.value).getTime()) / (24 * 60 * 60 * 1000))) // ms to days
  return <Typography variant='body2'>
    {`Next: ${nextEvent.display_name || nextEvent.name} is in ${diffDays} day(s).`}
  </Typography>
}
NextEvent.displayName = 'NextEvent'
NextEvent.propTypes = {
  sprintInfos: PropTypes.object.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
}


const SprintInfo = ({
  sprintRules,
  date,
}) => {
  const [currentSprint, state] = useFetchCurrentSprintInfos()

  if (state.isLoading) {
    return <Skeleton/>
  }

  if (state.error) {
    return <Typography variant='caption'>Error fetching sprint infos</Typography>
  }

  const EventRow = ({
    eventName,
    eventDate,
  }) => {
    return <TableRow
      sx={{
        '&:last-child td, &:last-child th': { border: 0 },
      }}
    >
      <TableCell>
        <Typography
          variant='body2'
          sx={{
            color: 'white'
            // overwrite table theme
          }}
        >
          {`${eventName}:`}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant='body2'
          sx={{
            color: 'white'
            // overwrite table theme
          }}
        >
          {eventDate.toLocaleDateString()}
        </Typography>
      </TableCell>
    </TableRow>
  }
  EventRow.displayName = 'EventRow'
  EventRow.propTypes = {
    eventName: PropTypes.string.isRequired,
    eventDate: PropTypes.instanceOf(Date).isRequired,
  }

  return <Tooltip
    title={
      <Stack
        direction='column'
        spacing={1}
      >
        <Table
          size='small'
          sx={{
            [`& .${tableCellClasses.root}`]: {
              borderBottom: 'none'
            }
          }}
          // rm divider between table rows
        >
          <TableBody>
            <EventRow
              key={'current_date'}
              eventName={'Current Date'}
              eventDate={date}
            />
            {
              currentSprint.dates.sort((left, right) => {
                return new Date(left.value) - new Date(right.value)
              }).map(sprintDate => {
                return <EventRow
                  key={sprintDate.name}
                  eventName={sprintDate.display_name || sprintDate.name}
                  eventDate={new Date(sprintDate.value)}
                />
              })
            }
          </TableBody>
        </Table>
        <Divider/>
        <Box
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <NextEvent
            sprintInfos={currentSprint}
            date={date}
          />
        </Box>
      </Stack>
    }
    arrow
  >
    <Box display='flex' alignItems='center' justifyContent='center'>
      <Typography variant='body1'>{`Sprint: ${currentSprint.name}`}</Typography>
      <div style={{ padding: '0.3em' }} />
      <FrozenStateIndicator
        sprint={currentSprint}
        sprintRules={sprintRules}
        date={date}
      />
    </Box>
  </Tooltip>
}
SprintInfo.displayName = 'SprintInfo'
SprintInfo.propTypes = {
  sprintRules: PropTypes.object,
  date: PropTypes.instanceOf(Date),
}

const FrozenStateIndicator = ({
  sprint,
  sprintRules,
  date,
}) => {
  const sprintFreezeInfos = ({
    sprint,
    sprintRules,
    date,
  }) => {
    if (!sprintRules) return [false, false]

    const frozenFromDate = new Date(sprint.dates.find((d) => d.name === sprintRules.frozenFrom)?.value)
    const frozenUntilDate = new Date(sprint.dates.find((d) => d.name === sprintRules.frozenUntil)?.value)
    const isFrozen = date.getTime() >= frozenFromDate.getTime()
      && date.getTime() <= frozenUntilDate.getTime()

    if (isFrozen) return [isFrozen, false]

    const frozenWarningOffsetDaysMillis = sprintRules.frozenWarningOffsetDays * 24 * 60 * 60 * 1000
    const frozenWarningDate = new Date(frozenFromDate.getTime() - frozenWarningOffsetDaysMillis)
    const winterIsComing = date.getTime() >= frozenWarningDate.getTime()
      && date.getTime() < frozenFromDate.getTime()

    return [isFrozen, winterIsComing]
  }

  const [isFrozen, winterIsComing] = sprintFreezeInfos({
    sprint: sprint,
    sprintRules: sprintRules,
    date: date,
  })

  if (isFrozen) return <AcUnitIcon style={{ color: 'LightSkyBlue' }} fontSize='large' />
  if (winterIsComing) return <AccessAlarmIcon style={{ color: 'LightSkyBlue' }} fontSize='large' />
  return <CalendarMonthIcon color='secondary' fontSize='large' />
}
FrozenStateIndicator.displayName = 'FrozenStateIndicator'
FrozenStateIndicator.propTypes = {
  sprint: PropTypes.object,
  sprintRules: PropTypes.object,
  date: PropTypes.instanceOf(Date).isRequired,
}


export {
  SprintInfo,
}
