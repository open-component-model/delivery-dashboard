import React from 'react'
import PropTypes from 'prop-types'

import { Box, Grid, Divider, Typography } from '@mui/material'

import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'

import yaml from 'js-yaml'

import CopyOnClickChip from '../util/CopyOnClickChip'


const ChangedLabelCard = ({ label }) => {
  let value = label.value

  if (typeof value == 'object') {
    value = yaml.dump(value)
  }
  return (
    <>
      <Typography variant='body2'>{label.name}</Typography>
      <Divider />
      <Typography variant='body2'>{value}</Typography>
    </>
  )
}
ChangedLabelCard.propTypes = {
  label: PropTypes.shape({
    value: PropTypes.any.isRequired,
    name: PropTypes.string.isRequired,
  }),
}

const LabelDiff = ({ left, right }) => {
  return (
    <>
      <Grid item xs={5}>
        <ChangedLabelCard label={left} />
      </Grid>
      <Grid
        item
        xs={2}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ForwardOutlinedIcon />
      </Grid>
      <Grid item xs={5}>
        <ChangedLabelCard label={right} />
      </Grid>
    </>
  )
}

LabelDiff.propTypes = {
  left: PropTypes.object.isRequired,
  right: PropTypes.object.isRequired,
}

const LabelResource = ({ icon, resource }) => {
  const labelItems = resource.labels.map((label) => {
    return (
      <LabelItem
        icon={icon}
        name={label.name}
        value={label.value}
        key={`${resource.name}-${resource.version}-${label.name}`}
      />
    )
  })

  return (
    <Grid container spacing={1}>
      <Grid item xs={12} style={{ display: 'flex' }}>
        <Typography variant='body1'>{resource.name}</Typography>
        <div
          style={{
            paddingLeft: '0.3em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CopyOnClickChip
            value={resource.version}
            chipProps={{
              version: 'outlined',
              size: 'small',
            }}
          />
        </div>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      {labelItems}
    </Grid>
  )
}
LabelResource.displayName = 'LabelResource'
LabelResource.propTypes = {
  icon: PropTypes.object.isRequired,
  resource: PropTypes.object.isRequired,
}

const LabelItem = ({ icon, name, value }) => {
  if (typeof value == 'object') {
    value = yaml.dump(value)
  }

  return (
    <>
      <Grid
        item
        xs={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon}
        <Typography variant='body2' style={{ paddingLeft: '0.2em' }}>
          {name}
        </Typography>
      </Grid>
      <Grid
        item
        xs={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
          {value}
        </Typography>
      </Grid>
    </>
  )
}
LabelItem.displayName = 'LabelItem'
LabelItem.propTypes = {
  icon: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
}

export const LabelVector = ({ resources }) => {
  const labelTableHeader = (
    <>
      <Grid item xs={4}>
        <Typography
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
          variant='body1'
        >
          Name
        </Typography>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={7}>
        <Typography
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
          variant='body1'
        >
          Value
        </Typography>
      </Grid>
    </>
  )

  let addedLabels = getLabelsFromResources(resources.added)
  if (addedLabels.length === 0) {
    addedLabels = <Box fontStyle='italic'>no labels added</Box>
  }

  let removedLabels = getLabelsFromResources(resources.removed)
  if (removedLabels.length === 0) {
    removedLabels = <Box fontStyle='italic'>no labels removed</Box>
  }

  let changedLabels = (
    <Grid item xs={12}>
      <Box fontStyle='italic'>no labels changed</Box>
    </Grid>
  )
  if (resources.changed.length > 0) {
    changedLabels = resources.changed.map((resourcePair) => {
      return (
        <Grid
          item
          xs={12}
          key={`${resourcePair.to.name}-${resourcePair.from.version}-${resourcePair.to.version}`}
        >
          <ChangedLabels resourcePair={resourcePair} />
        </Grid>
      )
    })
  }
  return (
    <>
      <Grid container spacing={4}>
        {labelTableHeader}
        <Grid item xs={12}>
          {addedLabels}
          <br />
          {removedLabels}
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>
        {changedLabels}
      </Grid>
    </>
  )
}
LabelVector.displayName = 'LabelVector'
LabelVector.propTypes = {
  resources: PropTypes.object.isRequired,
}

const ChangedLabels = ({ resourcePair }) => {
  const labelDiff = resourcePair.to.label_diff

  // Check for label diff and print out resource name and versions
  if (!labelDiff) {
    return <></>
  }
  let addedLabels = ''
  let removedLabels = ''
  let changedLabels = ''

  if (labelDiff.added.length > 0) {
    addedLabels = labelDiff.added.map((element) => {
      return (
        <LabelItem
          icon={<AddCircleOutlineOutlinedIcon />}
          name={element.name}
          value={element.value}
          key={element.name}
        />
      )
    })
  }

  if (labelDiff.removed.length > 0) {
    removedLabels = labelDiff.removed.map((element) => {
      return (
        <LabelItem
          icon={<RemoveCircleOutlineIcon />}
          name={element.name}
          value={element.value}
          key={element.name}
        />
      )
    })
  }

  if (labelDiff.changed.length > 0) {
    changedLabels = labelDiff.changed.map((element) => {
      return (
        <LabelDiff
          key={element.to.name}
          left={element.from}
          right={element.to}
        />
      )
    })
  }
  if (!changedLabels && !addedLabels && !removedLabels) {
    return ''
  }

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12} style={{ display: 'flex' }}>
          <Typography variant='body1'>{resourcePair.to.name}</Typography>
          <div
            style={{
              paddingLeft: '0.2em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CopyOnClickChip
              value={resourcePair.from.version}
              chipProps={{
                variant: 'outlined',
                size: 'small',
              }}
            />
            <ArrowForwardIcon style={{ padding: ' 0 0.1em 0 0.1em' }} />
            <CopyOnClickChip
              value={resourcePair.to.version}
              chipProps={{
                variant: 'outlined',
                size: 'small',
              }}
            />
          </div>
        </Grid>
        {addedLabels}
        {removedLabels}
        <Grid item xs={12}>
          <Divider />
        </Grid>
        {changedLabels}
      </Grid>
    </>
  )
}
ChangedLabels.displayName = 'ChangedLabels'
ChangedLabels.propTypes = {
  resourcePair: PropTypes.object.isRequired,
}
export default { LabelVector }

const getLabelsFromResources = (resources) => {
  let labels = []
  if (resources.length > 0) {
    labels = resources
      .filter((resource) => {
        if (resource.labels.length === 0) {
          return false
        } else {
          return true
        }
      })
      .map((resource) => {
        return (
          <Grid item xs={12} key={`${resource.name}-${resource.version}`}>
            <LabelResource
              icon={<AddCircleOutlineOutlinedIcon />}
              resource={resource}
            />
          </Grid>
        )
      })
  }
  return labels
}
