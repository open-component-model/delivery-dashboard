import React from 'react'

import { Button } from '@mui/material'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'

import PropTypes from 'prop-types'

import { useTheme } from '@emotion/react'

import { downloadObject } from '../util'
import { components } from '../api'

const bomCache = {}

export const DownloadBom = ({ component, ocmRepo, isLoading }) => {
  const theme = useTheme()

  const handleClick = async () => {
    const key = `${component.name}:${component.version}`
    if (!bomCache[key]) {
      bomCache[key] = await components.componentDependencies({
        componentName: component.name,
        componentVersion: component.version,
        ocmRepoUrl: ocmRepo,
        populate: 'all',
      })
    }

    const blob = new Blob([JSON.stringify(bomCache[key])], {
      type: 'application/json',
    })

    downloadObject({
      obj: blob,
      fname: `${component.name ? component.name : component.target}-bom.json`,
    })
  }

  return (
    <Button
      startIcon={<CloudDownloadIcon />}
      onClick={handleClick}
      variant='outlined'
      style={{
        color: isLoading ? 'grey' : theme.bomButton.color,
      }}
      disabled={isLoading}
    >
      download bom
    </Button>
  )
}

DownloadBom.displayName = 'DownloadBom'
DownloadBom.propTypes = {
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
}

const sbomCache = {}

export const DownloadSbom = ({ component, ocmRepo, isLoading }) => {
  const theme = useTheme()

  const handleClick = async () => {
    const key = `${component.name}:${component.version}`
    if (!sbomCache[key]) {
      sbomCache[key] = await components.componentSbom({
        componentName: component.name,
        componentVersion: component.version,
        ocmRepoUrl: ocmRepo,
      })
    }

    const fname = `${component.name ? component.name : component.target}_${component.version}.sbom.tar`

    downloadObject({
      obj: sbomCache[key],
      fname: fname,
    })
  }

  return (
    <Button
      startIcon={<CloudDownloadIcon />}
      onClick={handleClick}
      variant='outlined'
      style={{
        color: isLoading ? 'grey' : theme.bomButton.color,
      }}
      disabled={isLoading}
    >
      download sbom
    </Button>
  )
}
DownloadSbom.displayName = 'DownloadSbom'
DownloadSbom.propTypes = {
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
}
