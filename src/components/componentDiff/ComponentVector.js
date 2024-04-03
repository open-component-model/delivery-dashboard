import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Divider,
  Grid,
  Typography,
} from '@mui/material'

import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { ComponentVectorTab } from './ComponentDiffTab'
import { trimComponentName } from '../../util'
import CopyOnClickChip from '../util/CopyOnClickChip'

export const ComponentVector = ({ diff }) => {
  const [expanded, setExpanded] = React.useState(
    diff.components_changed.map(() => false)
  )

  const [allExpanded, setAllExpanded] = React.useState(false)

  const handleExpandAll = () => {
    setExpanded(diff.components_changed.map(() => !allExpanded))
    setAllExpanded(!allExpanded)
  }

  let addedComponents = (
    <Typography variant='body1'>no components added</Typography>
  )
  let removedComponents = (
    <Typography variant='body1'>no components removed</Typography>
  )
  let changedComponents = (
    <Typography variant='body1'>no components changed</Typography>
  )
  if (!diff) {
    return null
  }
  if (diff.components_added.length > 0) {
    addedComponents = diff.components_added.map((component) => {
      return (
        <ComponentEntry
          icon={<AddCircleOutlineOutlinedIcon />}
          name={component.name}
          version={component.version}
          key={`${component.name}-${component.version}`}
        />
      )
    })
  }
  if (diff && diff.components_removed.length > 0) {
    removedComponents = diff.components_removed.map((component) => {
      return (
        <ComponentEntry
          icon={<RemoveCircleOutlineIcon />}
          name={component.name}
          version={component.version}
          key={`${component.name}-${component.version}`}
        />
      )
    })
  }

  if (diff.components_changed.length > 0) {
    changedComponents = diff.components_changed.map((cpair, idx) => {
      const name = trimComponentName(cpair.left.name) // name is always identical (left/right)
      return (
        <Accordion
          expanded={expanded[idx]}
          key={`${cpair.left.name}-${cpair.left.version}`}
          onChange={(event, isExpanded) => {
            const newExpanded = expanded.map((element, index) => {
              if (index === idx) {
                return isExpanded
              } else {
                return element
              }
            })
            setExpanded(newExpanded)
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Grid container alignItems='center'>
              <Grid item xs={5}>
                <Typography
                  sx={{
                    fontSize: 18,
                    flexBasis: '33.33%',
                    flexShrink: 0,
                  }}
                >
                  {name}
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography
                  component={'span'}
                  sx={{
                    fontSize: 15,
                    color: 'secondary',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <CopyOnClickChip
                      value={cpair.left.version}
                      chipProps={{
                        variant: 'outlined'
                      }}
                    />
                    <ArrowForwardIcon style={{ margin: '0.3em' }} />
                    <CopyOnClickChip
                      value={cpair.right.version}
                      chipProps={{
                        variant: 'outlined'
                      }}
                    />
                  </div>
                </Typography>
              </Grid>
            </Grid>
          </AccordionSummary>
          <AccordionDetails key={cpair.left.name} style={{ padding: '0em' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Divider variant='middle' />
              </Grid>
              <Grid item xs={12}>
                <ComponentVectorTab rightComponent={cpair.right} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )
    })
  }
  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          {addedComponents}
        </Grid>
        <Grid item xs={12}>
          {removedComponents}
        </Grid>
        <Grid item xs={10}>
          <Typography variant='h6' display='block'>
            Changed components:
          </Typography>
        </Grid>
        <Grid item xs={2}>
          <Button
            variant='contained'
            size='small'
            color='primary'
            onClick={handleExpandAll}
          >
            {!allExpanded && (
              <>
                Expand All <ArrowDownwardIcon fontSize='small' />
              </>
            )}
            {allExpanded && (
              <>
                Collapse All <ArrowUpwardIcon fontSize='small' />
              </>
            )}
          </Button>
        </Grid>
        <Grid item xs={12}>
          {changedComponents}
        </Grid>
      </Grid>
    </>
  )
}
ComponentVector.displayName = 'ComponentVector'
ComponentVector.propTypes = {
  diff: PropTypes.object.isRequired,
}

const ComponentEntry = ({ icon, name, version }) => {
  return <Grid container direction='row'>
    <Grid item xs={9}>
      <div style={{ display: 'flex' }}>
        {icon}
        <Typography
          sx={{
            paddingLeft: '0.2em'
          }}
        >
          {name}
        </Typography>
      </div>
    </Grid>
    <Grid item xs={3}>
      <CopyOnClickChip
        value={version}
        chipProps={{
          variant: 'outlined'
        }}
      />
    </Grid>
  </Grid>
}
ComponentEntry.displayName = 'ComponentEntry'
ComponentEntry.propTypes = {
  icon: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
}
