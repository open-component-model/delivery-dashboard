import React from 'react'

import { Box, Button, LinearProgress } from '@mui/material'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'

import PropTypes from 'prop-types'

import { useTheme } from '@emotion/react'

import { downloadObject, downloadStream } from '../util'
import { components } from '../api'

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
  onClick: PropTypes.func.isRequired,
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

export const DownloadSbom = ({ component, ocmRepo, isLoading, buttonText, onError, cancelRef }) => {
  const [isDownloading, setIsDownloading] = React.useState(false)
  const abortControllerRef = React.useRef(null)

  React.useEffect(() => {
    if (cancelRef) cancelRef.current = () => abortControllerRef.current?.abort()
  }, [cancelRef])

  const handleClick = async () => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsDownloading(true)
    try {
      const stream = await components.componentSbom({
        componentName: component.name,
        componentVersion: component.version,
        ocmRepoUrl: ocmRepo,
        signal: controller.signal,
      })

      const fname = `${component.name ? component.name : component.target}_${component.version}.sbom.tar`

      await downloadStream({
        stream,
        fname,
        signal: controller.signal,
      })
    } catch (error) {
      if (error?.name !== 'AbortError' && onError) onError(error)
    } finally {
      abortControllerRef.current = null
      setIsDownloading(false)
    }
  }

  return (
    <Box>
      <DownloadButton onClick={handleClick} isLoading={isLoading || isDownloading}>
        {buttonText ?? 'download sbom'}
      </DownloadButton>
      {isDownloading && <LinearProgress sx={{ mt: 0.5 }} />}
    </Box>
  )
}
DownloadSbom.displayName = 'DownloadSbom'
DownloadSbom.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  buttonText: PropTypes.string,
  onError: PropTypes.func,
  cancelRef: PropTypes.object,
}
