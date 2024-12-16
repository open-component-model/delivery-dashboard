import React from 'react'

import {
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import RemoveIcon from '@mui/icons-material/Remove'
import { useTheme } from '@mui/material/styles'

import PropTypes from 'prop-types'
import { Draggable } from 'react-beautiful-dnd'


const VersionTableRow = ({
  info,
  isEditMode,
  removeDep,
  provided,
}) => {
  const theme = useTheme()

  return <TableRow ref={provided?.innerRef} {...provided?.draggableProps} {...provided?.dragHandleProps}>
    <TableCell sx={{width: '50%'}}>
      <Typography variant='caption'>{info.displayName}</Typography>
    </TableCell>
    {
      info.remoteVersion ? <>
        <TableCell sx={{width: '20%'}}>
          <Stack direction='column'>
            {
              info.localVersions.map((version, idx) => {
                return <Typography key={`${info.name}-${version}-${idx}`} variant='caption'>{version}</Typography>
              })
            }
          </Stack>
        </TableCell>
        <TableCell sx={{width: '5%'}}>
          {
            info.localVersions.some((version) => version !== info.remoteVersion) ?
              <TrendingFlatIcon sx={{float: 'center', verticalAlign: 'middle'}}/> :
              <TrendingFlatIcon sx={{float: 'center', verticalAlign: 'middle', opacity: '0.4'}}/>
          }
        </TableCell>
        <TableCell sx={{width: '20%'}}>
          {
            info.localVersions.some((version) => version !== info.remoteVersion) ?
              <Typography variant='caption'>{info.remoteVersion}</Typography> :
              <Typography variant='caption' sx={{opacity: '0.4'}}>{info.remoteVersion}</Typography>
          }
        </TableCell>
      </> : <TableCell colSpan={3} sx={{width: '45%'}}>
        <Stack direction='column'>
          {
            info.localVersions.map((version, idx) => {
              return <Typography key={`${info.name}-${version}-${idx}`} variant='caption'>{version}</Typography>
            })
          }
        </Stack>
      </TableCell>
    }
    {
      isEditMode && <TableCell sx={{width: '5%'}}>
        <IconButton size={'small'} onClick={(e) => removeDep(e, info.name)}>
          <RemoveIcon sx={{fontSize: '70%', color: theme.bomButton.color}}/>
        </IconButton>
      </TableCell>
    }
  </TableRow>
}
VersionTableRow.displayName = 'VersionTableRow'
VersionTableRow.propTypes = {
  info: PropTypes.object,
  isEditMode: PropTypes.bool,
  removeDep: PropTypes.func,
  provided: PropTypes.object,
}


export const VersionOverview = ({
  component,
  dependencies,
  removeDepFromComp,
  specialComponentsFeature,
  colorOverride,
  isEditMode,
  provided,
  isLoading,
}) => {
  const versionInfos = dependencies ? [...dependencies.sort((a, b) => a.position - b.position)] : []
  const loadingRowsCount = 4

  if (isLoading) return <Stack
    spacing={0}
    direction='column'
  >
    {
      [...Array(loadingRowsCount).keys()].map(e => <Skeleton key={e}/>)
    }
  </Stack>

  const removeDep = (e, depName) => {
    e.preventDefault()
    removeDepFromComp(depName, component)
    specialComponentsFeature.triggerRerender()
  }

  return <Table
    padding='checkbox'
    sx={{
      [`& .${tableCellClasses.root}`]: {borderBottom: 'none', color: colorOverride},
      borderCollapse: 'separate',
      borderSpacing: '0 0.2rem',
    }}
  >
    {
      versionInfos.length > 0 && <TableHead>
        <TableRow>
          <TableCell sx={{width: '50%'}} visibility='hidden'/>
          <TableCell sx={{width: '20%'}}>
            <Typography>{'Component'}</Typography>
          </TableCell>
          <TableCell sx={{width: '5%'}} visibility='hidden'/>
          {
            versionInfos.find((info) => info.remoteVersion) && <TableCell sx={{width: '20%'}}>
              <Typography>{'Repository'}</Typography>
            </TableCell>
          }
          <TableCell sx={{width: '5%'}} visibility='hidden'/>
        </TableRow>
      </TableHead>
    }
    <TableBody>
      {versionInfos.map((info, idx) => {
        return (
          provided ? <Draggable
            key={info.name}
            draggableId={`${info.name}|${component.id}|${component.isAddedByUser}`}
            index={idx}
            isDragDisabled={!isEditMode}
          >
            {(provided) => (<>
              {provided.placeholder}
              <VersionTableRow
                key={`version-info-${info.name}-${info.localVersion}`}
                info={info}
                isEditMode={isEditMode}
                removeDep={removeDep}
                provided={provided}
              />
            </>)}
          </Draggable> : <VersionTableRow key={`version-info-${info.name}-${info.localVersion}`} info={info}/>
        )
      })}
      {provided?.placeholder}
    </TableBody>
  </Table>
}
VersionOverview.displayName = 'VersionOverview'
VersionOverview.propTypes = {
  component: PropTypes.object,
  dependencies: PropTypes.array,
  removeDepFromComp: PropTypes.func,
  specialComponentsFeature: PropTypes.object,
  colorOverride: PropTypes.string,
  isEditMode: PropTypes.bool,
  provided: PropTypes.object,
  isLoading: PropTypes.bool,
}

export const evaluateVersionMatch = (
  dependencies,
) => {
  return !dependencies.some((dep) => {
    return dep.remoteVersion && dep.localVersions.some((version) => version !== dep.remoteVersion)
  })
}
