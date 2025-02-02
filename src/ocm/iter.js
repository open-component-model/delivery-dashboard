import React from 'react'

import { Box, Divider, Link, Stack, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

import PropTypes from 'prop-types'

import { NoMaxWidthTooltip, componentPathQuery, normaliseExtraIdentity, toYamlString, trimLongString } from '../util'
import CopyOnClickChip from '../util/copyOnClickChip'
import MultilineTextViewer from '../util/multilineTextViewer'
import { sanitiseArtefactExtraId } from './util'


/**
 * represents either componentNode or artefactNode
 * artefact and artefactKind must only be set for artefactNode
 * holds full component path to ocm-node
 * 
 * path: array of components
 * artefact: optional
 * artefactKind: optional
 */
class OcmNode {

  constructor(
    path,
    artefact,
    artefactKind,
  ) {
    if (
      artefact && !artefactKind
      || (!artefact && artefactKind)
    ) throw Error('either pass artefact and artefactKind for artefactNode, or none for componentNode')

    this.path = path
    this.artefact = artefact
    this.artefactKind = artefactKind
  }

  get component() {
    return this.path.at(-1)
  }

  isComponentNode() {
    return Boolean(!this.artefact)
  }

  identity() {
    const componentIdentity = `${this.component.name}:${this.component.version}`

    if (this.isComponentNode()) return componentIdentity

    const artefactIdentity = `${this.artefact.name}:${this.artefact.version}:${this.normalisedExtraIdentity()}`
    return `${componentIdentity}_${artefactIdentity}_${this.artefactKind}`
  }

  name() {
    if (this.isComponentNode()) return `${this.component.name}:${this.component.version}`
    return `${this.artefact.name}:${this.artefact.version}`
  }

  findLabel(labelName) {
    return [
      ...(this.isComponentNode() ? [] : this.artefact.labels), // most specific first
      ...this.component.labels,
    ].find(l => l.name === labelName)
  }

  normalisedExtraIdentity() {
    return normaliseExtraIdentity(this.artefact.extraIdentity)
  }
}


const OcmNodeDetails = ({
  ocmNode,
  ocmRepo,
  iconProps,
}) => {
  return <NoMaxWidthTooltip
    title={<Stack direction='column' spacing={1} onBlur={(e) => e.stopPropagation()}>
      <Box>
        <Typography>Component</Typography>
        <Stack spacing={2} direction='row' padding={2}>
          <Box
            display='flex'
            alignItems='center'
          >
            <Link
              color='inherit'
              href={`#${componentPathQuery({
                name: ocmNode.component.name,
                version: ocmNode.component.version,
                view: 'bom',
                ocmRepo: ocmRepo,
              })}`}
              variant='body2'
              target='_blank'
            >
              {ocmNode.component.name}
            </Link>
          </Box>
          <CopyOnClickChip
            value={ocmNode.component.version}
            label={trimLongString(ocmNode.component.version, 12)}
            chipProps={{
              variant: 'filled',
              sx: {
                '& .MuiChip-label': {
                  color: 'white'
                }
              }
            }}
          />
        </Stack>
      </Box>
      <Divider/>
      <Box>
        <Typography>Artefact</Typography>
        <Stack spacing={2} direction='row' padding={2}>
          <Box
            display='flex'
            alignItems='center'
          >
            <Typography variant='body2'>{ocmNode.artefact.name}</Typography>
          </Box>
          <CopyOnClickChip
            value={ocmNode.artefact.version}
            chipProps={{
              variant: 'filled',
              sx: {
                '& .MuiChip-label': {
                  color: 'white'
                }
              }
            }}
          />
        </Stack>
        <Stack spacing={2} direction='row' padding={2}>
          <Box
            display='flex'
            alignItems='center'
          >
            <Typography variant='body2'>Kind</Typography>
          </Box>
          <CopyOnClickChip
            value={ocmNode.artefactKind}
            chipProps={{
              variant: 'filled',
              sx: {
                '& .MuiChip-label': {
                  color: 'white'
                }
              }
            }}
            message='Artefact Kind copied!'
          />
        </Stack>
      </Box>
      {
        Object.keys(ocmNode.artefact.extraIdentity).length > 0 && <Divider/>
      }
      {
        Object.keys(ocmNode.artefact.extraIdentity).length > 0 && <Stack
          direction='column'
          spacing={1}
        >
          <Typography>Artefact Extra Identity</Typography>
          <MultilineTextViewer
            text={toYamlString(ocmNode.artefact.extraIdentity)}
          />
        </Stack>
      }
    </Stack>}
  >
    <div style={{ display: 'flex', margin: '0.4rem' }}>
      <InfoOutlinedIcon fontSize='small' {...iconProps}/>
    </div>
  </NoMaxWidthTooltip>
}
OcmNodeDetails.displayName = 'OcmNodeDetails'
OcmNodeDetails.propTypes = {
  ocmNode: PropTypes.instanceOf(OcmNode).isRequired,
  ocmRepo: PropTypes.string,
  iconProps: PropTypes.object,
}


export {
  OcmNode,
  OcmNodeDetails,
}
