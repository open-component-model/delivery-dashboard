import React from 'react'
import PropTypes from 'prop-types'

import { Box, Grid, Typography } from '@mui/material'

import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SyncAltIcon from '@mui/icons-material/SyncAlt'

import CopyOnClickChip from '../util/CopyOnClickChip'
import { generateArtefactID } from '../../cnudie'


const isTypeOci = (resource) => {
  if (resource.type === 'ociImage') {
    return true
  } else {
    return false
  }
}

const sortResources = (resources) => {
  resources.sort((a, b) => {
    if (isTypeOci(a) && isTypeOci(b)) {
      return a.access.imageReference.localeCompare(b.access.imageReference)
    } else if (isTypeOci(a) && !isTypeOci(b)) {
      return -1
    } else if (!isTypeOci(a) && isTypeOci(b)) {
      return 1
    } else if (!isTypeOci(a) && !isTypeOci(b)) {
      return a.name.localeCompare(b.name)
    } else {
      throw Error('Resource could not be sorted')
    }
  })

  return resources
}

export const ResourceVector = ({ rightComponent }) => {
  const resources = rightComponent.resources
  let addedResources = <Box fontStyle='italic'>no resources added</Box>
  if (resources.added.length) {
    const sortedResources = sortResources(resources.added)

    addedResources = sortedResources.map((resource) => {
      let name = ''
      if (isTypeOci(resource)) {
        name = resource.access.imageReference
      } else {
        name = `${resource.name}-${resource.version}`
      }
      return (
        <div
          style={{ display: 'flex' }}
          key={generateArtefactID(resource)}
        >
          <AddCircleOutlineOutlinedIcon />
          <Typography
            sx={{
              paddingLeft: '0.2em',
            }}
            variant='body2'
          >
            {name}
          </Typography>
        </div>
      )
    })
  }

  let removedResources = <Box fontStyle='italic'>no resources removed</Box>
  if (resources.removed.length) {
    const sortedResources = sortResources(resources.removed)

    removedResources = sortedResources.map((resource) => {
      let name = ''
      if (isTypeOci(resource)) {
        name = resource.access.imageReference
      } else {
        name = `${resource.name}-${resource.version}`
      }
      return (
        <div
          style={{ display: 'flex' }}
          key={generateArtefactID(resource)}
        >
          <RemoveCircleOutlineIcon />
          <Typography
            variant='body2'
            sx={{
              paddingLeft: '0.2em',
            }}
          >
            {name}
          </Typography>
        </div>
      )
    })
  }

  let changedResources = <Box fontStyle='italic'>no resources changed</Box>
  if (resources.changed.length > 0) {
    changedResources = resources.changed.map((resourcePair) => {
      let name = resourcePair.to.name
      if (isTypeOci(resourcePair.to)) {
        name = resourcePair.to.access.imageReference
      }

      return (
        <ChangedResource
          name={name}
          fromVersion={resourcePair.from.version}
          toVersion={resourcePair.to.version}
          key={`${generateArtefactID(resourcePair.from)}_${resourcePair.to.version}`}
        />
      )
    })
  }

  return (
    <>
      {addedResources}
      <br />
      {removedResources}
      <br />
      {changedResources}
    </>
  )
}
ResourceVector.displayName = 'ResourceVector'
ResourceVector.propTypes = {
  rightComponent: PropTypes.object.isRequired,
}

const ChangedResource = ({ name, fromVersion, toVersion }) => {
  return <Grid container justifyContent='center' alignItems='center' direction='row'>
    <Grid item xs={8} style={{ display: 'flex' }}>
      <SyncAltIcon />
      <Typography
        sx={{
          paddingLeft: '0.2em',
        }}
      >
        {name}
      </Typography>
    </Grid>
    <Grid item xs={4}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CopyOnClickChip
          value={fromVersion}
          chipProps={{
            variant: 'outlined',
            size: 'small',
          }}
        />
        <ArrowForwardIcon style={{ padding: ' 0 0.1em 0 0.1em' }} />
        <CopyOnClickChip
          value={toVersion}
          chipProps={{
            variant: 'outlined',
            size: 'small',
          }}
        />
      </div>
    </Grid>
  </Grid>
}
ChangedResource.displayName = 'ChangedResource'
ChangedResource.propTypes = {
  name: PropTypes.string.isRequired,
  fromVersion: PropTypes.string,
  toVersion: PropTypes.string,
}

export default { ResourceVector }
