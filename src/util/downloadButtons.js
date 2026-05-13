import React from 'react'

import { Box, Button, Link } from '@mui/material'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'

import PropTypes from 'prop-types'

import { useTheme } from '@emotion/react'

import { appendPresentParams, downloadObject } from '../util'
import { components, routes } from '../api'

export const DownloadButton = ({ onClick, isLoading, children }) => {
  const theme = useTheme()

  return (
    <Button
      startIcon={<CloudDownloadIcon />}
      onClick={onClick}
      variant='outlined'
      style={{
        color: isLoading ? 'grey' : theme.bomButton.color,
      }}
      disabled={isLoading}
    >
      {children}
    </Button>
  )
}
DownloadButton.displayName = 'DownloadButton'
DownloadButton.propTypes = {
  onClick: PropTypes.func,
  isLoading: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
}

const bomCache = {}

export const DownloadBom = ({ component, ocmRepo, isLoading }) => {
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
    <DownloadButton onClick={handleClick} isLoading={isLoading}>
      download bom
    </DownloadButton>
  )
}
DownloadBom.displayName = 'DownloadBom'
DownloadBom.propTypes = {
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
}

export const OpenSbomPopoverButton = ({ onClick, isLoading }) => {
  return (
    <DownloadButton onClick={onClick} isLoading={isLoading}>
      download sbom
    </DownloadButton>
  )
}
OpenSbomPopoverButton.displayName = 'OpenSbomPopoverButton'
OpenSbomPopoverButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}

export const DownloadSbom = ({ componentName, componentVersion, ocmRepo, isLoading, buttonText }) => {
  const downloadUrl = new URL(routes.components.sbom())
  appendPresentParams(downloadUrl, {
    component_name: componentName,
    version: componentVersion,
    ocm_repo_url: ocmRepo,
  })

  return (
    <Box>
      <Link href={downloadUrl} target='_blank' rel='noreferrer'>
        <DownloadButton isLoading={isLoading}>
          {buttonText ?? 'download sbom'}
        </DownloadButton>
      </Link>
    </Box>
  )
}
DownloadSbom.displayName = 'DownloadSbom'
DownloadSbom.propTypes = {
  componentName: PropTypes.string,
  componentVersion: PropTypes.string,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  buttonText: PropTypes.string,
}
