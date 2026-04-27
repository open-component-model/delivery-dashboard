import React from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
} from '@mui/material'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import { DownloadSbom } from './downloadButtons'
import { useFetchQueryMetadata, useFetchBom } from '../fetch'
import { artefactMetadataTypes } from '../ocm/model'
import { errorSnackbarProps, fetchBomPopulate, ARTEFACT_KIND } from '../consts'
import ScrollableList from './scrollableList'
import { serviceExtensions } from '../api'

const SBOM_GENERATOR_SERVICE = 'sbomGenerator'
const SBOM_GENERATOR_DATASOURCE = 'sbom-generator'
const POLL_INTERVAL_MS = 10000

const SUPPORTED_ACCESS_TYPES_BY_MODE = {
  syft: ['ociRegistry'],
  bdba: ['ociRegistry', 'localBlob/v1', 's3'],
}

const SUPPORTED_ARTEFACT_TYPES_BY_MODE = {
  syft: ['ociImage', 'directoryTree'],
  // bdba: no artefact type restriction
}

const isResourceSupported = (resource, generationMode) => {
  const accessType = resource?.access?.type
  const artefactType = resource?.type

  const supportedAccessTypes = SUPPORTED_ACCESS_TYPES_BY_MODE[generationMode]
  if (supportedAccessTypes && !supportedAccessTypes.includes(accessType))
    return false

  const supportedArtefactTypes =
    SUPPORTED_ARTEFACT_TYPES_BY_MODE[generationMode]
  if (
    supportedArtefactTypes &&
    artefactType &&
    !supportedArtefactTypes.includes(artefactType)
  )
    return false

  return true
}

const SbomDownloadPopover = ({
  component,
  ocmRepo,
  isComponentLoading,
  onClose,
  extensionsCfg,
}) => {
  const { enqueueSnackbar } = useSnackbar()
  const [isTriggering, setIsTriggering] = React.useState(false)
  const [isPolling, setIsPolling] = React.useState(false)
  const pollIntervalRef = React.useRef(null)

  const [bom, bomState] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
    populate: fetchBomPopulate.ALL,
  })

  const artefacts = React.useMemo(() => {
    if (!bom?.componentDependencies) return null
    return bom.componentDependencies.flatMap((c) =>
      c.resources.map((resource) => ({
        component_name: c.name,
        component_version: c.version,
        artefact_kind: ARTEFACT_KIND.RESOURCE,
        artefact: {
          artefact_name: resource.name,
          artefact_version: resource.version,
          artefact_type: resource.type,
          artefact_extra_id: resource.extraIdentity,
        },
      })),
    )
  }, [bom])

  const types = React.useMemo(() => {
    return [artefactMetadataTypes.ARTEFACT_SCAN_INFO]
  }, [])

  const [scanInfos, scanInfosState, refreshScanInfos] = useFetchQueryMetadata({
    artefacts: artefacts ?? [],
    types: types,
  })

  const generationMode =
    extensionsCfg?.sbom_generator?.generation_mode ?? 'syft'

  const sbomReadiness = React.useMemo(() => {
    if (!bom?.componentDependencies || !scanInfos) return null

    const componentReadiness = bom.componentDependencies.flatMap((c) =>
      c.resources.map((resource) => {
        const isSupported = isResourceSupported(resource, generationMode)

        const hasScan =
          isSupported &&
          scanInfos.some(
            (entry) =>
              entry.meta.type === artefactMetadataTypes.ARTEFACT_SCAN_INFO &&
              entry.meta.datasource === SBOM_GENERATOR_DATASOURCE &&
              entry.artefact?.component_name === c.name &&
              entry.artefact?.component_version === c.version &&
              entry.artefact?.artefact?.artefact_name === resource.name,
          )

        return {
          name: resource.name,
          version: resource.version,
          accessType: resource?.access?.type,
          artefactType: resource?.type,
          component: `${c.name}:${c.version}`,
          ready: hasScan,
          supported: isSupported,
        }
      }),
    )

    return componentReadiness
  }, [bom, scanInfos, generationMode])

  const readyComponents = sbomReadiness?.filter((c) => c.ready) ?? []
  const notReadyComponents =
    sbomReadiness?.filter((c) => !c.ready && c.supported) ?? []
  const unsupportedComponents =
    sbomReadiness?.filter((c) => !c.supported) ?? []

  React.useEffect(() => {
    if (
      isPolling &&
      notReadyComponents.length === 0 &&
      sbomReadiness !== null
    ) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      setIsPolling(false)
    }
  }, [isPolling, notReadyComponents.length, sbomReadiness])

  React.useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const isLoading =
    isComponentLoading ||
    bomState.isLoading ||
    (!isPolling && scanInfosState.isLoading)
  const isError = bomState.error || scanInfosState.error
  const isDisabled = isLoading || isTriggering || isPolling
  const isClosable = !isLoading && !isTriggering

  const toListItem = (r) => ({
    primary: `${r.name}${r.version ? `:${r.version}` : ''}`,
    secondary: `${r.accessType ? `${r.accessType}` : ''}${r.artefactType ? ` · ${r.artefactType}` : ''}`,
    component: r.component,
  })

  const triggerSbomGeneration = async () => {
    if (!artefacts || notReadyComponents.length === 0) return

    const notReadyKeys = new Set(
      notReadyComponents.map((r) => `${r.component}:${r.name}`),
    )
    const backlogArtefacts = artefacts.filter((a) =>
      notReadyKeys.has(
        `${a.component_name}:${a.component_version}:${a.artefact.artefact_name}`,
      ),
    )

    setIsTriggering(true)
    try {
      await serviceExtensions.backlogItems.create({
        service: SBOM_GENERATOR_SERVICE,
        priority: 'Critical',
        artefacts: backlogArtefacts,
      })
      enqueueSnackbar(
        `Successfully scheduled SBOM generation for ${backlogArtefacts.length} component(s)`,
        {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
          autoHideDuration: 6000,
        },
      )

      setIsPolling(true)
      pollIntervalRef.current = setInterval(() => {
        refreshScanInfos()
      }, POLL_INTERVAL_MS)
    } catch (error) {
      enqueueSnackbar('Could not schedule SBOM generation', {
        ...errorSnackbarProps,
        details: error.toString(),
        onRetry: triggerSbomGeneration,
      })
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <Dialog
      open={true}
      onClose={isClosable ? onClose : undefined}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        Download SBOM
        <Box display="flex" gap={1}>
          {generationMode && (
            <Tooltip title="Generation mode">
              <Chip label={generationMode} size="small" variant="outlined" />
            </Tooltip>
          )}
          {extensionsCfg?.sbom_generator?.output_format && (
            <Tooltip title="Output format">
              <Chip
                label={extensionsCfg.sbom_generator.output_format}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : isError ? (
          <Alert severity="error">Failed to check SBOM readiness.</Alert>
        ) : (
          <Stack spacing={2} mt={0.5}>
            {isPolling && (
              <Alert severity="info" icon={<CircularProgress size={16} />}>
                Waiting for SBOM generation to complete...
              </Alert>
            )}
            {generationMode && unsupportedComponents.length > 0 && (
              <Alert severity="warning">
                {`Generation mode "${generationMode}" does not support all artefact access types. Unsupported components are listed below and will be skipped.`}
              </Alert>
            )}
            <ScrollableList
              title={`Ready (${readyComponents.length})`}
              titleIcon={
                <CheckCircleOutlineIcon color="success" fontSize="small" />
              }
              titleColor="success.main"
              items={readyComponents.map(toListItem)}
              emptyText="No SBOMs are ready yet."
              maxHeight="220px"
              groupBy="component"
            />
            <ScrollableList
              title={`Not ready (${notReadyComponents.length})`}
              titleIcon={<WarningAmberIcon color="warning" fontSize="small" />}
              titleColor="warning.main"
              items={notReadyComponents.map(toListItem)}
              emptyText="All SBOMs are ready."
              maxHeight="220px"
              groupBy="component"
            />
            {unsupportedComponents.length > 0 && (
              <ScrollableList
                title={`Unsupported (${unsupportedComponents.length})`}
                titleIcon={<BlockIcon color="error" fontSize="small" />}
                titleColor="error.main"
                items={unsupportedComponents.map(toListItem)}
                emptyText=""
                maxHeight="220px"
                groupBy="component"
              />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" disabled={!isClosable}>
          Abort
        </Button>
        {notReadyComponents && notReadyComponents.length > 0 && (
          <Button
            color="secondary"
            onClick={triggerSbomGeneration}
            disabled={isDisabled}
            startIcon={
              isTriggering ? <CircularProgress size={16} /> : undefined
            }
          >
            Trigger SBOM generation
          </Button>
        )}
        <DownloadSbom
          component={component}
          ocmRepo={ocmRepo}
          isLoading={isLoading || isDisabled || readyComponents.length === 0}
          buttonText={
            isLoading
              ? 'loading...'
              : notReadyComponents.length > 0 ||
                  unsupportedComponents.length > 0
                ? 'download anyway'
                : 'download sbom'
          }
        />
      </DialogActions>
    </Dialog>
  )
}
SbomDownloadPopover.displayName = 'SbomDownloadPopover'
SbomDownloadPopover.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  isComponentLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  extensionsCfg: PropTypes.object,
}

export default SbomDownloadPopover
