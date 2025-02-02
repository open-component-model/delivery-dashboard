import React from 'react'

import {
  alpha,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  capitalize,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import IosShareIcon from '@mui/icons-material/IosShare'
import LaunchIcon from '@mui/icons-material/Launch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import SearchIcon from '@mui/icons-material/Search'
import SourceIcon from '@mui/icons-material/Source'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import MoreVertIcon from '@mui/icons-material/MoreVert'

import PropTypes from 'prop-types'
import SemVer from 'semver'

import { FeatureRegistrationContext, SearchParamContext } from '../App'
import { generateArtefactID } from '../ocm/util'
import { Responsibles } from '../responsibles'
import {
  componentPathQuery,
  enhanceComponentRefFromPath,
  normaliseExtraIdentity,
  normaliseObject,
  trimComponentName,
  trimLongString,
  updatePathFromComponentRef,
  appendPresentParams,
  artefactMetadatumSeverity,
  capitalise,
  ExtraIdentityHover,
  findSeverityCfgByName,
  matchObjectWithSearchQuery,
  shortenComponentName,
  downloadObject,
} from '../util'
import ExtraWideTooltip from '../util/extraWideTooltip'
import FeatureDependent from '../util/featureDependent'
import ComplianceToolPopover from '../util/complianceToolsPopover'
import { ARTEFACT_KIND, features, COMPLIANCE_TOOLS, REPORTING_MINIMUM_SEVERITY, SEVERITIES, DEPENDENT_COMPONENT, fetchBomPopulate } from '../consts'
import {
  useFetchComponentResponsibles,
  useFetchScanConfigurations,
  useFetchQueryMetadata,
  useFetchComplianceSummary,
  useFetchBom,
  useFetchSpecialComponentCurrentDependencies,
} from '../fetch'
import { registerCallbackHandler } from '../feature'
import CopyOnClickChip from '../util/copyOnClickChip'
import { useTheme } from '@emotion/react'
import { RescoringModal } from '../rescoring'
import { OcmNode } from '../ocm/iter'
import { artefactMetadataFilter } from '../ocm/util'
import { MetadataViewerPopover, artefactMetadataTypes, findTypedefByName, defaultTypedefForName, datasources } from '../ocm/model'
import { components, routes } from '../api'
import { SprintInfo } from '../util/sprint'
import ErrorBoundary from '../util/errorBoundary'
import { VersionOverview, evaluateVersionMatch } from '../util/versionOverview'
import TriggerComplianceToolButton from '../util/triggerComplianceToolButton'
import { parseRelaxedSemver } from '../os'

import DockerLogo from '../resources/docker-icon.svg'


const MetadataViewer = ({
  component,
  ocmRepo,
}) => {
  const [metadataViewerPopoverOpen, setMetadataViewerPopoverOpen] = React.useState(false)

  return <Box onClick={(e) => e.stopPropagation()}>
    <ListItemButton onClick={(e) => {
      e.stopPropagation()
      setMetadataViewerPopoverOpen(!metadataViewerPopoverOpen)
    }}>
      <SearchIcon/>
      <div style={{ padding: '0.3em' }}/>
      <ListItemText primary={'Metadata Information'}/>
    </ListItemButton>
    {
      metadataViewerPopoverOpen && <MetadataViewerPopover
        popoverProps={{
          componentName: component.name,
          componentVersion: component.version,
          ocmRepo: ocmRepo,
        }}
        handleClose={(e) => {
          e.stopPropagation()
          setMetadataViewerPopoverOpen(false)
        }}
      />
    }
  </Box>
}
MetadataViewer.displayName = 'MetadataViewer'
MetadataViewer.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}

const ComplianceTools = ({
  component,
}) => {
  const [complianceToolsPopoverOpen, setComplianceToolsPopoverOpen] = React.useState(false)

  return <Box onClick={(e) => e.stopPropagation()}>
    <ListItemButton onClick={(e) => {
      e.stopPropagation()
      setComplianceToolsPopoverOpen(!complianceToolsPopoverOpen)
    }}>
      <PublishedWithChangesIcon/>
      <div style={{ padding: '0.3em' }}/>
      <ListItemText primary={'Schedule Compliance Tool'}/>
    </ListItemButton>
    {
      complianceToolsPopoverOpen && <ComplianceToolPopover
        popoverProps={{component}}
        handleClose={(e) => {
          e.stopPropagation()
          setComplianceToolsPopoverOpen(false)
        }}
      />
    }
  </Box>
}
ComplianceTools.displayName = 'ComplianceTools'
ComplianceTools.propTypes = {
  component: PropTypes.object.isRequired,
}

const ComponentSettings = ({
  component,
  ocmRepo,
  iconProps,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()
  const [anchorElement, setAnchorElement] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DELIVERY_DB,
      callback: ({feature}) => setDeliveryDbFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const handleClick = (e) => {
    e.stopPropagation()
    setAnchorElement(e.currentTarget)
  }
  const handleClose = (e) => {
    e.stopPropagation()
    setAnchorElement(null)
  }

  return <>
    {
      (deliveryDbFeature?.isAvailable || serviceExtensionsFeature?.isAvailable) && <IconButton
        onClick={handleClick}
      >
        <MoreVertIcon {...iconProps}/>
      </IconButton>
    }
    <Popover
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(anchorElement)}
      anchorEl={anchorElement}
      onClose={handleClose}
    >
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          {
            // explicitly handle feature availability here and not using `FeatureDependent` component
            // because it does not work properly with popover anchors
            deliveryDbFeature?.isAvailable && <MetadataViewer component={component} ocmRepo={ocmRepo}/>
          }
          {
            serviceExtensionsFeature?.isAvailable && <ComplianceTools component={component}/>
          }
        </List>
      </Box>
    </Popover>
  </>
}
ComponentSettings.displayName = 'ComponentSettings'
ComponentSettings.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  iconProps: PropTypes.object,
}

const Component = React.memo(({
  component,
  isComponentLoading,
  isComponentError,
  ocmRepo,
  isParentComponent,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const theme = useTheme()

  const name = trimComponentName(component.name)

  const [expanded, setExpanded] = React.useState(Boolean(isParentComponent && Boolean(searchParamContext.get('rootExpanded'))))

  const [complianceSummary, complianceSummaryState, refreshComplianceSummary] = useFetchComplianceSummary({
    componentName: component.name,
    componentVersion: component.version,
    recursionDepth: 0,
    ocmRepo: ocmRepo,
  })

  const complianceSummaryFetchDetails = React.useMemo(() => {
    return {
      complianceSummary,
      isSummaryLoading: complianceSummaryState.isLoading,
      isSummaryError: complianceSummaryState.error,
    }
  }, [
    complianceSummary,
    complianceSummaryState.isLoading,
    complianceSummaryState.error,
  ])

  const [mountRescoring, setMountRescoring] = React.useState(Boolean(searchParamContext.get('rescoreArtefacts')))

  const artefactNodes = React.useMemo(() => {
    if (!isParentComponent) return [] // only allow rescore linking for root component
    const artefactIds = searchParamContext.getAll('rescoreArtefacts')
    if (artefactIds.length === 0) return []

    const normalisedArtefactIds = artefactIds.map((artefactId) => {
      /*
        Artefacts specified via `rescoreArtefacts` URL parameter are expected to have the following
        form: `<artefact-name>|<artefact-version>|<artefact-type>|<artefact-kind>`
        Also, they may contain the optional suffix `|<artefact-extra-id>`
      */
      const idParts = artefactId.split('|')

      if (idParts.length === 4) return artefactId // no artefact extra id included -> id can be left unchanged

      const extraIdentity = idParts.pop()
      const normalisedExtraIdentity = normaliseExtraIdentity(JSON.parse(extraIdentity))

      return `${idParts.join('|')}|${normalisedExtraIdentity}`
    })

    const artefactId = (artefact, artefactKind) => {
      const baseId = `${artefact.name}|${artefact.version}|${artefact.type}|${artefactKind}`

      if (!artefact.extraIdentity || Object.keys(artefact.extraIdentity).length === 0) {
        return baseId
      }

      return `${baseId}|${normaliseExtraIdentity(artefact.extraIdentity)}`
    }

    const resourceNodes = component.resources.filter((resource) => {
      return normalisedArtefactIds.includes(artefactId(resource, ARTEFACT_KIND.RESOURCE)) // resource selected via URL params
    }).map((resource) => new OcmNode([component], resource, ARTEFACT_KIND.RESOURCE))

    const sourceNodes = component.sources.filter((source) => {
      return normalisedArtefactIds.includes(artefactId(source, ARTEFACT_KIND.SOURCE)) // source selected via URL params
    }).map((source) => new OcmNode([component], source, ARTEFACT_KIND.SOURCE))

    return resourceNodes.concat(sourceNodes)
  }, [
    component.resources,
    component.sources,
  ])

  const handleRescoringClose = React.useCallback(() => {
    setMountRescoring(false)
    searchParamContext.delete('rescoreArtefacts')
  }, [setMountRescoring])

  const scanConfigName = searchParamContext.get('scanConfigName')
  const [scanConfigs] = useFetchScanConfigurations()

  const scanConfig = scanConfigName
    ? scanConfigs?.find((scanConfig) => scanConfig.name === scanConfigName)
    : scanConfigs?.length === 1 ? scanConfigs[0] : null

  return <Box
    sx={{
      paddingBottom: '0.3em',
      '&:hover': {
        backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'light' ? 0.15 : 1),
      },
    }}
  >
    {
      (
        mountRescoring
        && (artefactNodes.length > 0)
      ) && <RescoringModal
        ocmNodes={artefactNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={refreshComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Accordion
      TransitionProps={{ unmountOnExit: true }}
      // manual expansion control required to prevent trigger on MetadataViewerPopover events
      expanded={expanded}
      onClick={() => setExpanded(!expanded)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon {...isParentComponent ? {sx: {color: theme.bomButton}} : {}}/>}>
        <Grid container alignItems='center'>
          <Grid item {...isParentComponent ? {sx: {flexGrow: '0.05'}} : {xs: 7}} >
            <Typography variant='body1' sx={{fontWeight: isParentComponent ? 'bold' : 1}}>
              <Link
                color={'inherit'}
                // use href rather than router to enable "open in new tab"
                href={`#${componentPathQuery({
                  name: component.name,
                  version: component.version,
                  view: 'bom',
                  ocmRepo: ocmRepo,
                })}`}
                // don't expand accordion
                onClick={(event) => {
                  event.stopPropagation()
                  if (component.comp_ref) {
                    updatePathFromComponentRef(component.comp_ref)
                  }
                }}
              >
                {name}
              </Link>
            </Typography>
          </Grid>
          <Grid item {...isParentComponent ? {sx: {flexGrow: '1'}} : {xs: 2}}>
            <Box display='flex' alignItems='left' justifyContent='left'>
              {
                component.version.length > 8 ? <Tooltip
                  title={JSON.stringify(component.version, null, 2)}
                >
                  <CopyOnClickChip
                    value={component.version}
                    label={trimLongString(component.version, 8)}
                    chipProps={{
                      variant: 'outlined'
                    }}
                  />
                </Tooltip> : <CopyOnClickChip
                  value={component.version}
                  label={trimLongString(component.version, 8)}
                  chipProps={{
                    variant: 'outlined',
                    sx: {fontWeight: isParentComponent ? 'bold' : 1},
                  }}
                />
              }
            </Box>
          </Grid>
          <FeatureDependent
            requiredFeatures={[features.DELIVERY_DB]}
            childrenIfFeatureUnavailable={<Grid item xs={isParentComponent ? 1 : 2}/>}
          >
            <Grid item xs={isParentComponent ? 1 : 2}>
              <ComponentChip
                component={component}
                complianceSummaryFetchDetails={complianceSummaryFetchDetails}
              />
            </Grid>
          </FeatureDependent>
          <Grid item xs={isParentComponent ? 0.5 : 1}>
            <ComponentSettings
              component={component}
              ocmRepo={ocmRepo}
              iconProps={isParentComponent ? {sx: {color: theme.bomButton}} : {}}
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails onClick={(event) => event.stopPropagation()}>
        <ComponentDetails
          component={component}
          isComponentLoading={isComponentLoading}
          isComponentError={isComponentError}
          ocmRepo={ocmRepo}
          complianceSummaryFetchDetails={complianceSummaryFetchDetails}
          fetchComplianceSummary={refreshComplianceSummary}
          scanConfig={scanConfig}
        />
      </AccordionDetails>
    </Accordion>
  </Box>
})
Component.displayName = 'Component'
Component.propTypes = {
  component: PropTypes.object.isRequired,
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  isParentComponent: PropTypes.bool,
}

const ResponsiblesHeading = ({
  responsibleData,
  isResponsibleDataLoading,
  isResponsibleDataError,
}) => {
  if (isResponsibleDataError || isResponsibleDataLoading)
    return <Typography variant='h6'>Responsibles</Typography>
  if (!responsibleData.responsibles.length)
    return <Typography variant='h6'>Responsibles</Typography>

  // all responsibles have same metaOrigin
  const responsiblesSource = responsibleData.responsibles[0].find((e) => {
    return e.type === 'metaOrigin'
  })

  // be paranoid
  if (!responsiblesSource)
    return <Typography variant='h6'>Responsibles</Typography>

  return <Stack spacing={1} direction='row'>
    <Typography variant='h6'>Responsibles</Typography>
    <Tooltip
      title={
        <Stack direction='column' spacing={1}>
          <Typography variant='inherit'>
            Responsibles have been determined via{' '}
            {responsiblesSource.originType} from{' '}
            <a
              href={responsiblesSource.source}
              rel='noreferrer'
              target='_blank'
            >
              {responsiblesSource.source}
            </a>
            .
          </Typography>
          <Divider/>
          <Typography variant='inherit'>
            You can re-assign responsibles permanently by adding a label to
            the corresponding resource entry in Component Descriptor,
            exemplarily done{' '}
            <a
              href='https://github.com/gardener/cc-utils/blob/master/.ci/pipeline_definitions#L24-L28'
              rel='noreferrer'
              target='_blank'
            >
              here
            </a>
            .
          </Typography>
        </Stack>
      }
    >
      <HelpOutlineIcon
        fontSize='small'
        sx={{
          position: 'relative',
          top: '4px',
          left: '-5px',
        }}
      />
    </Tooltip>
  </Stack>
}
ResponsiblesHeading.displayName = 'ResponsiblesHeading'
ResponsiblesHeading.propTypes = {
  responsibleData: PropTypes.object,
  isResponsibleDataLoading: PropTypes.bool,
  isResponsibleDataError: PropTypes.bool,
}


const ResponsiblesWrapper = ({
  component,
  ocmRepo,
}) => {
  const [responsibleData, state] = useFetchComponentResponsibles({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
  })

  if (state.error) return <Alert severity='error'>Unable to fetch Responsibles</Alert>

  return <>
    <ResponsiblesHeading
      responsibleData={responsibleData}
      isResponsibleDataLoading={state.isLoading}
      isResponsibleDataError={state.error}
    />
    <Responsibles
      componentResponsibles={responsibleData}
      isResponsibleDataLoading={state.isLoading}
    />
  </>
}
ResponsiblesWrapper.displayName = 'ResponsiblesWrapper'
ResponsiblesWrapper.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


const ComponentDetails = React.memo(({
  component,
  isComponentLoading,
  isComponentError,
  ocmRepo,
  complianceSummaryFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  if (isComponentError) return <Alert severity='error'>Unable to fetch Component</Alert>

  return <Stack spacing={8}>
    {
      isComponentLoading
        ? <CircularProgress color='inherit' size={20}/>
        : <Artefacts
          component={component}
          ocmRepo={ocmRepo}
          complianceSummaryFetchDetails={complianceSummaryFetchDetails}
          fetchComplianceSummary={fetchComplianceSummary}
          scanConfig={scanConfig}
        />
    }
    <ComponentReferencedBy
      component={component}
      ocmRepo={ocmRepo}
    />
    <ResponsiblesWrapper
      component={component}
      ocmRepo={ocmRepo}
    />
  </Stack>
})
ComponentDetails.displayName = 'ComponentDetails'
ComponentDetails.propTypes = {
  component: PropTypes.object.isRequired,
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}

const Components = ({
  components,
  isComponentsLoading,
  isComponentsError,
  ocmRepo,
}) => {
  return <Box>
    {
      components.map((component, idx) => <Component
        key={`${component.name}:${component.version}:${idx}`}
        component={component}
        isComponentLoading={isComponentsLoading}
        isComponentError={isComponentsError}
        ocmRepo={ocmRepo}
      />)
    }
  </Box>
}
Components.displayName = 'Components'
Components.propTypes = {
  components: PropTypes.arrayOf(PropTypes.object),
  isComponentsLoading: PropTypes.bool,
  isComponentsError: PropTypes.bool,
  ocmRepo: PropTypes.string,
}


const ArtefactDetails = ({
  component,
  artefacts,
  ocmRepo,
  title,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  if (artefacts.length === 0) return null

  return <Stack direction='column' spacing={4}>
    <Typography variant='h6'>{title}</Typography>
    <TableContainer>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          <TableRow>
            <TableCell align='left' padding='checkbox'>
              Type
            </TableCell>
            <TableCell>{title} ID</TableCell>
            <FeatureDependent requiredFeatures={[features.DELIVERY_DB]}>
              <TableCell align='right'>
                Compliance Information
              </TableCell>
            </FeatureDependent>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            artefacts.map((artefact) => {
              return <ArtefactTableRow
                key={generateArtefactID(artefact)}
                component={component}
                artefact={artefact}
                ocmRepo={ocmRepo}
                complianceSummaryFetchDetails={complianceSummaryFetchDetails}
                complianceDataFetchDetails={complianceDataFetchDetails}
                fetchComplianceSummary={fetchComplianceSummary}
                scanConfig={scanConfig}
              />
            })
          }
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
}
ArtefactDetails.displayName = 'ArtefactDetails'
ArtefactDetails.propTypes = {
  component: PropTypes.object.isRequired,
  artefacts: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
  title: PropTypes.string.isRequired,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}


const Artefacts = ({
  component,
  ocmRepo,
  complianceSummaryFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  const artefacts = React.useMemo(() => {
    return [{
      component_name: component.name,
      component_version: component.version,
    }]
  }, [
    component.name,
    component.version
  ])

  const types = React.useMemo(() => {
    return [
      artefactMetadataTypes.ARTEFACT_SCAN_INFO,
      artefactMetadataTypes.CODECHECKS_AGGREGATED,
      artefactMetadataTypes.OS_IDS,
    ]
  }, [
    artefactMetadataTypes.ARTEFACT_SCAN_INFO,
    artefactMetadataTypes.CODECHECKS_AGGREGATED,
    artefactMetadataTypes.OS_IDS,
  ])

  const params = React.useMemo(() => {
    return {artefacts, types}
  }, [artefacts, types])

  const [complianceData, state] = useFetchQueryMetadata(params)
  const complianceDataFetchDetails = {complianceData, state}

  const resources = React.useMemo(() => component.resources.sort((left, right) => {
    const ltype = left.type
    const rtype = right.type

    if (ltype === rtype) {
      return left.name.localeCompare(right.name)
    }
    if (ltype === 'ociImage') return -1 // hard code ociImages first
    if (rtype === 'ociImage') return 1 // hard code ociImages first
    return ltype.localeCompare(rtype)
  }).map((resource) => {
    return {
      ...resource,
      kind: ARTEFACT_KIND.RESOURCE,
    }
  }), [component])

  const sources = React.useMemo(() => component.sources.sort((left, right) => {
    const ltype = left.type
    const rtype = right.type

    if (ltype === rtype) {
      return left.name.localeCompare(right.name)
    }
    return ltype.localeCompare(rtype)
  }).map((source) => {
    return {
      ...source,
      kind: ARTEFACT_KIND.SOURCE,
    }
  }), [component])

  return <Stack spacing={8}>
    <ArtefactDetails
      component={component}
      artefacts={resources}
      ocmRepo={ocmRepo}
      title={'Resources'}
      complianceSummaryFetchDetails={complianceSummaryFetchDetails}
      complianceDataFetchDetails={complianceDataFetchDetails}
      fetchComplianceSummary={fetchComplianceSummary}
      scanConfig={scanConfig}
    />
    <ArtefactDetails
      component={component}
      artefacts={sources}
      ocmRepo={ocmRepo}
      title={'Sources'}
      complianceSummaryFetchDetails={complianceSummaryFetchDetails}
      complianceDataFetchDetails={complianceDataFetchDetails}
      fetchComplianceSummary={fetchComplianceSummary}
      scanConfig={scanConfig}
    />
    <ComponentReferences
      component={component}
      ocmRepo={ocmRepo}
    />
  </Stack>
}
Artefacts.displayName = 'Artefacts'
Artefacts.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}


const ArtefactTableRow = ({
  component,
  artefact,
  ocmRepo,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  return <TableRow
    key={generateArtefactID(artefact)}
    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
  >
    <IconCell artefact={artefact}/>
    <ArtefactCell artefact={artefact} component={component}/>
    <FeatureDependent requiredFeatures={[features.DELIVERY_DB]}>
      <ComplianceCell
        component={component}
        artefact={artefact}
        ocmRepo={ocmRepo}
        complianceSummaryFetchDetails={complianceSummaryFetchDetails}
        complianceDataFetchDetails={complianceDataFetchDetails}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    </FeatureDependent>
  </TableRow>
}
ArtefactTableRow.displayName = 'ArtefactTableRow'
ArtefactTableRow.propTypes = {
  component: PropTypes.object,
  artefact: PropTypes.object,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}


const ComponentReferences = ({
  component,
  ocmRepo,
}) => {
  if (component.componentReferences.length === 0) return null

  return <Stack direction='column' spacing={4}>
    <Typography variant='h6'>Component References</Typography>
    <TableContainer>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          <TableRow>
            <TableCell align='left' padding='checkbox'>
              Type
            </TableCell>
            <TableCell>Reference ID</TableCell>
            <TableCell align='right'>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            component.componentReferences.map((componentRef) => <ReferenceTableRow
              key={`${componentRef.version}_${
                componentRef.name
              }_${JSON.stringify(componentRef.extraIdentity)}`}
              reference={componentRef}
              component={component}
              ocmRepo={ocmRepo}
            />)
          }
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
}
ComponentReferences.displayName = 'ComponentReferences'
ComponentReferences.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}

const ReferenceTableRow = ({
  reference,
  component,
  ocmRepo,
}) => {
  const icon = <GitHubIcon/>
  const name = reference.name
  const referencePath = [
    ...(component.comp_ref
      ? component.comp_ref
      : [{ name: component.name, version: component.version }]
    ), 
    { name: reference.componentName, version: reference.version }
  ]

  return <TableRow
    key={name}
    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
  >
    <TableCell component='th' scope='row' align='left' padding='checkbox'>
      {icon}
    </TableCell>
    <TableCell>
      {
        Object.values(reference.extraIdentity).length > 0 ? <Tooltip
          title={
            <Typography
              variant='inherit'
              sx={{
                whiteSpace: 'pre-wrap',
                maxWidth: 'none',
              }}
            >
              {JSON.stringify(reference.extraIdentity, null, 2)}
            </Typography>
          }
          placement='top-start'
          describeChild
        >
          <Link
            color='inherit'
            // use href rather than router to enable "open in new tab"
            href={`#${componentPathQuery({
              name: reference.componentName,
              version: reference.version,
              view: 'bom',
              ocmRepo: ocmRepo,
            })}`}
            onClick={() => {
              updatePathFromComponentRef(referencePath)
            }}
          >
            {`${reference.componentName}:${reference.version}`}
          </Link>
        </Tooltip> : <Link
          color='inherit'
          // use href rather than router to enable "open in new tab"
          href={`#${componentPathQuery({
            name: reference.componentName,
            version: reference.version,
            view: 'bom',
            ocmRepo: ocmRepo,
          })}`}
          onClick={() => {
            updatePathFromComponentRef(referencePath)
          }}
        >
          {`${reference.componentName}:${reference.version}`}
        </Link>
      }
    </TableCell>
    <TableCell align='right'>{name}</TableCell>
  </TableRow>
}
ReferenceTableRow.displayName = 'ReferenceTableRow'
ReferenceTableRow.propTypes = {
  reference: PropTypes.object,
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
}

const ComponentReferencedBy = ({
  component,
  ocmRepo,
}) => {
  const referenced_by_path = enhanceComponentRefFromPath(
    component.comp_ref?.length > 0
      ? component.comp_ref
      : [{name: component.name, version: component.version}]
  )
  
  if (referenced_by_path.length == 1) return null

  return <Stack direction='column' spacing={4}>
    <Typography variant='h6'>Referenced By</Typography>
    <TableContainer>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          <TableRow>
            <TableCell align='left' padding='checkbox'>Type</TableCell>
            <TableCell>Component</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <ReferencedByTableRow ocmRepo={ocmRepo} referenced_by_path={referenced_by_path}/>
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
}
ComponentReferencedBy.displayName = 'ComponentReferencedBy'
ComponentReferencedBy.propTypes = {
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
}

const ReferencedByTableRow = ({
  ocmRepo,
  referenced_by_path,
}) => {
  const icon = <GitHubIcon/>

  return <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
    <TableCell component='th' scope='row' align='left' padding='checkbox'>
      {icon}
    </TableCell>
    <TableCell>
      <ExtraWideTooltip
        title={
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell align='left' padding='checkbox' sx={{ color: 'white' }}>Type</TableCell>
                  <TableCell sx={{ color: 'white' }}>Level</TableCell>
                  <TableCell sx={{ color: 'white' }}>Component</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  referenced_by_path.map((ref, idx) => <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component='th' scope='row' align='left' padding='checkbox'>
                      {icon}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: 'white' }}>{idx}</TableCell>
                    <TableCell>
                      <Link
                        sx={{ color: 'white' }}
                        // use href rather than router to enable "open in new tab"
                        href={`#${componentPathQuery({
                          name: ref.name,
                          version: ref.version,
                          view: 'bom',
                          ocmRepo: ocmRepo,
                        })}`}
                        onClick={() => {
                          updatePathFromComponentRef(referenced_by_path)
                        }}
                      >
                        {`${ref.name}:${ref.version}`}
                      </Link>
                    </TableCell>
                  </TableRow>)
                }
              </TableBody>
            </Table>
          </TableContainer>
        }
        placement='top-start'
      >
        <Typography variant='inherit'>
          {`${referenced_by_path[referenced_by_path.length - 2].name}:${referenced_by_path[referenced_by_path.length - 2].version}`}
        </Typography>
      </ExtraWideTooltip>
    </TableCell>
  </TableRow>
}
ReferencedByTableRow.displayName = 'ReferencedByTableRow'
ReferencedByTableRow.propTypes = {
  ocmRepo: PropTypes.string,
  referenced_by_path: PropTypes.arrayOf(PropTypes.object),
}


const LoadingComponents = ({loadingComponentsCount}) => {
  return <Box
    width='50%'
  >
    {
      [...Array(loadingComponentsCount).keys()].map(e => <Box key={e}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Grid container alignItems='center' padding={1}>
              <Grid item xs={6}>
                <Typography variant='body1'>
                  <Skeleton />
                </Typography>
              </Grid>
              <Grid item xs={1} />
              <Grid item xs={1}>
                <Typography variant='body1'>
                  <Skeleton />
                </Typography>
              </Grid>
              <Grid item xs={1} />
              <Grid item xs={1}>
                <Typography variant='body1'>
                  <Skeleton />
                </Typography>
              </Grid>
              <Grid item xs={1} />
              <Grid item xs={1}>
                <Typography variant='body1'>
                  <Skeleton />
                </Typography>
              </Grid>
            </Grid>
          </AccordionSummary>
        </Accordion>
        <div style={{ padding: '0.15em' }} />
      </Box>
      )
    }
  </Box>
}
LoadingComponents.displayName = 'LoadingComponents'
LoadingComponents.propTypes = {
  loadingComponentsCount: PropTypes.number.isRequired,
}


const LoadingDependencies = () => {
  const loadingComponentsCount = 40

  return <Box>
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Grid container alignItems='center' padding={1}>
          <Grid item xs={4}>
            <Typography variant='body1'>
              <Skeleton />
            </Typography>
          </Grid>
          <Grid item xs={1} />
          <Grid item xs={1}>
            <Typography variant='body1'>
              <Skeleton />
            </Typography>
          </Grid>
          <Grid item sx={{flexGrow: '1'}} />
          <Grid item xs={1}>
            <Typography variant='body1'>
              <Skeleton />
            </Typography>
          </Grid>
          <Grid item xs={0.5} />
          <Grid item xs={0.5}>
            <Typography variant='body1'>
              <Skeleton />
            </Typography>
          </Grid>
        </Grid>
      </AccordionSummary>
    </Accordion>
    <div style={{ padding: '0.5em' }} />
    <Stack
      spacing={3}
      direction='row'
    >
      <LoadingComponents loadingComponentsCount={loadingComponentsCount}/>
      <LoadingComponents loadingComponentsCount={loadingComponentsCount}/>
    </Stack>
  </Box>
}

const bomCache = {}

const DownloadBom = ({
  component,
  ocmRepo,
  isLoading,
}) => {
  const theme = useTheme()

  const handleClick = async () => {
    const key = `${component.name}:${component.version}`
    let dependencies = null
    if (!bomCache[key]) {
      bomCache[key] = await components.componentDependencies({
        componentName: component.name,
        componentVersion: component.version,
        ocmRepoUrl: ocmRepo,
        populate: 'all',
      })
    }
    dependencies = bomCache[key]

    const blob = new Blob([JSON.stringify(dependencies)], {
      type: 'application/json',
    })

    const fname = `${component.name ? component.name : component.target}-bom.json`

    downloadObject({
      obj: blob,
      fname: fname,
    })
  }

  return <Button
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
}
DownloadBom.displayName = 'DownloadBom'
DownloadBom.propTypes = {
  component: PropTypes.object,
  ocmRepo: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
}

const ComponentSearch = ({
  isComponentsError,
  isComponentsLoading,
  updateSearchQuery,
  defaultValue,
}) => {
  return <TextField
    variant='standard'
    fullWidth
    defaultValue={defaultValue}
    disabled={isComponentsLoading || isComponentsError}
    label={
      isComponentsError ? 'Search disabled, error fetching Component' :
        'Search for Components or Artifacts'
    }
    onChange={(event) => {
      updateSearchQuery(event.target.value)
    }}
    InputProps={{
      endAdornment: (
        <InputAdornment position='start'>
          {
            isComponentsLoading ? <CircularProgress color='inherit' size='1.5em'/> : <SearchIcon />
          }
        </InputAdornment>
      ),
    }}
  />
}
ComponentSearch.displayName = 'ComponentSearch'
ComponentSearch.propTypes = {
  isComponentsError: PropTypes.bool,
  isComponentsLoading: PropTypes.bool,
  updateSearchQuery: PropTypes.func,
  defaultValue: PropTypes.string,
}


const DependenciesTabHeader = React.memo(({
  updateSearchQuery,
  sprintRules,
  component,
  isComponentLoading,
  componentRefs,
  getSpecialComponentFeature,
  componentType,
  defaultSearchValue,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const now = new Date()

  return <Grid
    container
    spacing={3}
    alignItems='center'
  >
    <Grid item width='50%'>
      <ComponentSearch
        updateSearchQuery={updateSearchQuery}
        defaultValue={defaultSearchValue}
      />
    </Grid>
    <Grid item width='15%'>
      <FeatureDependent
        requiredFeatures={[features.SPRINTS]}
        childrenIfFeatureLoading={<Skeleton/>}
      >
        <ErrorBoundary>
          <SprintInfo
            sprintRules={sprintRules}
            date={now}
          />
        </ErrorBoundary>
      </FeatureDependent>
    </Grid>
    <Grid item width='18%' alignItems='center' display='flex' flexDirection='column'>
      {
        (componentType !== DEPENDENT_COMPONENT) & !isComponentLoading
          ? <SpecialComponentStatus
            component={component}
            componentRefs={componentRefs}
            specialComponentFeature={getSpecialComponentFeature()}
          />
          : <Skeleton width='100%'/> /* explicitly set width as parent container is a flexbox */
      }
    </Grid>
    <Grid item width='17%' display='flex' justifyContent='right' flexDirection='column'>
      <DownloadBom
        component={component}
        ocmRepo={searchParamContext.get('ocmRepo')}
        isLoading={isComponentLoading}
      />
    </Grid>
  </Grid>
})
DependenciesTabHeader.displayName = 'DependenciesTabHeader'
DependenciesTabHeader.propTypes = {
  updateSearchQuery: PropTypes.func.isRequired,
  sprintRules: PropTypes.object,
  component: PropTypes.object,
  isComponentLoading: PropTypes.bool.isRequired,
  componentRefs: PropTypes.arrayOf(PropTypes.object),
  getSpecialComponentFeature: PropTypes.func.isRequired,
  componentType: PropTypes.string,
  defaultSearchValue: PropTypes.string,
}


const FetchComponentRefsTab = React.memo(({
  component,
  ocmRepo,
  searchQuery,
  setComponentRefs,
}) => {
  const [componentRefs, state] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
    populate: fetchBomPopulate.COMPONENT_REFS,
  })

  React.useEffect(() => {
    if (!componentRefs) return
    setComponentRefs(componentRefs.componentDependencies)
  }, [componentRefs, setComponentRefs])

  if (state.error) return <Alert severity='error'>
    Component Dependencies could not be resolved.
    <br></br>
    <br></br>
    {state.error?.toString()}
  </Alert>

  if (state.isLoading || !componentRefs) return <LoadingDependencies/>

  return <FetchDependenciesTab
    component={component}
    ocmRepo={ocmRepo}
    componentRefs={componentRefs.componentDependencies}
    searchQuery={searchQuery}
  />
})
FetchComponentRefsTab.displayName = 'FetchComponentRefsTab'
FetchComponentRefsTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  searchQuery: PropTypes.string,
  setComponentRefs: PropTypes.func.isRequired,
}


export const BomTab = React.memo(({
  component,
  isLoading,
  ocmRepo,
  searchQuery,
  updateSearchQuery,
}) => {
  const [componentRefs, setComponentRefs] = React.useState(null)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  const getSpecialComponentFeature = () => {
    if (isLoading) return null

    if (!specialComponentsFeature || !specialComponentsFeature.isAvailable)
      return null

    return specialComponentsFeature.cfg.specialComponents.find(c => c.name === component.name)
  }

  return <Box
    display='flex'
    flexDirection='column'
  >
    <DependenciesTabHeader
      updateSearchQuery={updateSearchQuery}
      sprintRules={getSpecialComponentFeature()?.sprintRules}
      component={component}
      isComponentLoading={isLoading}
      componentRefs={componentRefs}
      getSpecialComponentFeature={getSpecialComponentFeature}
      defaultSearchValue={searchQuery}
    />
    <div style={{ padding: '0.5em' }} />
    {
      isLoading ? <LoadingDependencies/> : <FetchComponentRefsTab
        component={component}
        ocmRepo={ocmRepo}
        searchQuery={searchQuery}
        setComponentRefs={setComponentRefs}
      />
    }
  </Box>
})
BomTab.displayName = 'BomTab'
BomTab.propTypes = {
  component: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
  ocmRepo: PropTypes.string,
  searchQuery: PropTypes.string,
  updateSearchQuery: PropTypes.func.isRequired,
}


const FetchDependenciesTab = React.memo(({
  component,
  ocmRepo,
  componentRefs,
  searchQuery,
}) => {
  const compareComponentsByName = (a, b) => {
    return trimComponentName(a.name).localeCompare(trimComponentName(b.name))
  }

  const isParentComponent = (c) => {
    return c.name === component.name && c.version === component.version
      && JSON.stringify(normaliseObject(c.repositoryContexts)) === JSON.stringify(normaliseObject(component.repositoryContexts))
  }

  const [components, state] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
    populate: fetchBomPopulate.ALL,
  })

  const filteredBom = () => {
    const bom = () => {
      if (
        component
        && !state.isLoading
        && !state.error
      ) return components.componentDependencies.sort((a, b) => compareComponentsByName(a, b))

      // to display flat component structure already
      return componentRefs.sort((a, b) => compareComponentsByName(a, b))
    }

    return bom().filter((component) => {
      if (isParentComponent(component)) return false
      if (!searchQuery) return true

      if (component.sources) {
        for (const source of component.sources) {
          if (matchObjectWithSearchQuery(source, searchQuery)) return true
        }
      }
      if (component.resources) {
        for (const resource of component.resources) {
          if (matchObjectWithSearchQuery(resource, searchQuery)) return true
        }
      }

      return component.name.toLowerCase().includes(searchQuery)
    })
  }

  const len = filteredBom().length
  const half = Math.ceil(len / 2)
  const left = filteredBom().slice(0, half)
  const right = filteredBom().slice(half, len)

  return <Box>
    <Component
      component={component}
      ocmRepo={ocmRepo}
      isParentComponent={true}
    />
    <div style={{ padding: '0.5em' }} />
    <Stack
      spacing={3}
      direction='row'
    >
      <Box
        width='50%'
      >
        <Components
          components={left}
          isComponentsLoading={state.isLoading}
          isComponentsError={state.error}
          ocmRepo={ocmRepo}
        />
      </Box>
      <Box
        width='50%'
      >
        <Components
          components={right}
          isComponentsLoading={state.isLoading}
          isComponentsError={state.error}
          ocmRepo={ocmRepo}
        />
      </Box>
    </Stack>
  </Box>
})
FetchDependenciesTab.displayName = 'FetchDependenciesTab'
FetchDependenciesTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  componentRefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  searchQuery: PropTypes.string,
}


const SpecialComponentStatus = ({
  component,
  componentRefs,
  specialComponentFeature,
}) => {
  const [specialComponentStatus, state] = useFetchSpecialComponentCurrentDependencies({componentName: component.name})

  if (!componentRefs) return <Skeleton width='100%'/>

  if (state.error) {
    return <Typography variant='caption'>Error fetching special component status</Typography>
  }
  if (!specialComponentStatus) {
    return <Skeleton width='100%'/>
  }

  if (!specialComponentStatus.component_dependencies) {
    // Because no remote versions are specified, the status of a release cannot be calculated
    return null
  }

  const deps = [...new Set(componentRefs.map((dep) => dep.name))].map((depName, idx) => {
    const userCfgDep = component.dependencies?.find((d) => d.name === depName)
    const remoteDep = specialComponentStatus.component_dependencies.find((d) => d.name === depName)

    const localVersions = componentRefs.filter((d) => d.name === depName).map((d) => d.version)
    if (component.name === depName) {
      return {
        name: component.name,
        displayName: component.displayName,
        localVersions: localVersions,
        remoteVersion: specialComponentStatus.version,
        disabled: userCfgDep ? userCfgDep.disabled : false,
        position: userCfgDep ? userCfgDep.position : idx,
      }
    }
    return {
      name: depName,
      displayName: remoteDep?.displayName ? remoteDep.displayName : capitalize(shortenComponentName(depName)),
      localVersions: localVersions,
      remoteVersion: remoteDep?.version,
      disabled: userCfgDep ? userCfgDep.disabled : !remoteDep, // if it is a remote dep defaults to enabled, otherwise disabled
      position: userCfgDep ? userCfgDep.position : idx,
    }
  })

  const versionsMatch = evaluateVersionMatch(deps.filter((dep) => dep.name !== component.name))

  return <Stack
    spacing={1}
    direction='row'
  >
    <ExtraWideTooltip
      title={<VersionOverview
        component={component}
        dependencies={deps.filter((dep) => !dep.disabled)}
        colorOverride={'white'}
      />}
      arrow
    >
      <Box display='flex' alignItems='center' justifyContent='center'>
        {versionsMatch ? (
          <>
            <Typography variant='body1'>Release Succeeded</Typography>
            <div style={{ padding: '0.3em' }} />
            <CheckCircleOutlineIcon color='success' fontSize='large' />
          </>
        ) : (
          <>
            <Typography variant='body1'>Release Pending</Typography>
            <div style={{ padding: '0.3em' }} />
            <WarningAmberIcon color='warning' fontSize='large' />
          </>
        )}
      </Box>
    </ExtraWideTooltip>
    {
      specialComponentFeature?.releasePipelineUrl && <Tooltip
        title={'Jump to Release Pipeline'}
      >
        <IconButton
          component='a'
          href={specialComponentFeature?.releasePipelineUrl}
          target='_blank'
        >
          <LaunchIcon/>
        </IconButton>
      </Tooltip>
    }
  </Stack>
}
SpecialComponentStatus.displayName = 'SpecialComponentStatus'
SpecialComponentStatus.propTypes = {
  component: PropTypes.object,
  componentRefs: PropTypes.array,
  specialComponentFeature: PropTypes.object,
}


export const ComponentChip = ({
  component,
  complianceSummaryFetchDetails,
}) => {
  const {complianceSummary, isSummaryLoading, isSummaryError} = complianceSummaryFetchDetails
  const ErrorChip = () => <Chip
    label='FetchError'
    variant='outlined'
    color='warning'
  />
  ErrorChip.displayName = 'ErrorChip'

  if (isSummaryError) return <ErrorChip/>

  if (isSummaryLoading) return <Skeleton/>

  const componentSummary = complianceSummary.complianceSummary.find((componentSummary) => {
    return (
      componentSummary.componentId.name === component.name
      && componentSummary.componentId.version === component.version
    )
  })

  /**
   * do not break upon delivery-service error
   * should return component-summary even for unknown components
   */
  if (!componentSummary) return <ErrorChip/>

  const mostCriticalSeverity = componentSummary.entries.reduce((max, element) => {
    if (findSeverityCfgByName({name: element.severity}).value > findSeverityCfgByName({name: max.severity}).value) {
      return element
    } else {
      return max
    }
  })

  const mostCriticalSeverityValues = componentSummary.entries.filter((element) => {
    return findSeverityCfgByName({name: element.severity}).value === findSeverityCfgByName({name: mostCriticalSeverity.severity}).value
  })

  const IndicatorTooltipTitle = ({ summaries }) => {
    return <Stack direction='column' spacing={1}>
      {
        summaries.map((summary) => {
          let typedef = findTypedefByName({name: summary.type})
          if (!typedef) typedef = defaultTypedefForName({name: summary.type})
          const severityCfg = findSeverityCfgByName({name: summary.severity})
          const Indicator = severityCfg.Indicator

          return <Stack
            key={JSON.stringify(summary)}
            direction='column'
            spacing={1}
          >
            <Stack direction='row' spacing={1} key={JSON.stringify(summary)+'_title'}>
              <Indicator color={severityCfg.color} size='small'/>
              <Box display='flex' alignItems='center' justifyContent='center'>
                <Typography>{typedef.friendlyName}</Typography>
              </Box>
            </Stack>
            <Stack direction='column' spacing={0} key={JSON.stringify(summary)+'_body'}>
              <Typography variant='caption'>Severity: {summary.severity}</Typography>
              <Typography variant='caption'>Source: {summary.source}</Typography>
              <Typography variant='caption'>ScanStatus: {summary.scanStatus}</Typography>
            </Stack>
            <Divider/>
          </Stack>
        })
      }
    </Stack>
  }
  IndicatorTooltipTitle.displayName = 'IndicatorTooltipTitle'
  IndicatorTooltipTitle.propTypes = {
    summaries: PropTypes.array.isRequired,
  }

  // only medium and more severe
  if (!(findSeverityCfgByName({name : mostCriticalSeverity.severity}).value >= findSeverityCfgByName({name: REPORTING_MINIMUM_SEVERITY}).value)) return null

  componentSummary.entries.sort((left, right) => {
    const leftCfg = findSeverityCfgByName({name: left.severity})
    const rightCfg = findSeverityCfgByName({name: right.severity})
    if (leftCfg.value > rightCfg.value) return -1
    if (leftCfg.value < rightCfg.value) return 1
    return 0
  })

  const severityCfg = findSeverityCfgByName({name: mostCriticalSeverity.severity})
  const Indicator = severityCfg.Indicator

  return <Box display='flex' alignItems='center' justifyContent='center'>
    <Tooltip
      title={<IndicatorTooltipTitle summaries={componentSummary.entries}/>}
    >
      <Badge
        badgeContent={mostCriticalSeverityValues.length}
        color='primary'
        invisible={mostCriticalSeverityValues.length > 1 ? false : true}
      >
        <Indicator color={severityCfg.color}/>
      </Badge>
    </Tooltip>
  </Box>
}
ComponentChip.displayName = 'ComponentChip'
ComponentChip.propTypes = {
  component: PropTypes.object.isRequired,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
}

/**
 * reasoned color string for given resource os information
 */
const evaluateResourceBranch = (resource) => {
  const eolString = (eolInfo) => {
    if (typeof eolInfo == 'string') return `EOL reached on ${new Date(eolInfo).toLocaleDateString()}`

    return 'EOL reached'
  }

  const newerVersionAvailableString = (version) => {
    return `Newer Patch Version is available, ${version}`
  }

  if (!resource)
    return {
      reason: 'no resource os information found',
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }

  if (!resource.branchInfo)
    return {
      reason: 'no os branch information found',
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }

  const now = new Date()
  const branchEol = new Date(resource.branchInfo.eol_date)
  const resourceSemVer = parseRelaxedSemver(resource.data.os_info.VERSION_ID)
  let branchSemVer = null
  if (resource.branchInfo.greatest_version) {
    branchSemVer = parseRelaxedSemver(resource.branchInfo.greatest_version)
  }
  if (!resourceSemVer && !branchSemVer) {
    return {
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }
  }

  if (!branchSemVer) {
    if (now > branchEol) {
      // eol reached
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: 'Greatest Version',
      severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
    }
  }

  if (SemVer.eq(branchSemVer, resourceSemVer)) {
    // is greatest version
    if (now > branchEol) {
      // eol reached
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: 'Greatest Version',
      severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
    }
  } else if (SemVer.lt(resourceSemVer, branchSemVer)) {
    if (now > branchEol) {
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: newerVersionAvailableString(branchSemVer),
      severity: findSeverityCfgByName({name: SEVERITIES.MEDIUM}),
    }
  }

  /**
   * image has newer os version than we know
   * occurred when EOL API removed debian latest release minor
   * see: https://github.com/endoflife-date/endoflife.date/issues/1396
   */
  return {
    reason: 'Greatest Version',
    severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
  }
}


const IssueChip = ({
  ocmNodes,
  component,
  artefact,
  scanConfig,
}) => {
  if (!scanConfig) return

  // if artefact type filter is set, don't show license chip for types that are filtered out
  const artefactTypes = scanConfig.config.issueReplicator.artefact_types
    ? scanConfig.config.issueReplicator.artefact_types
    : scanConfig.config.defaults.artefact_types

  if (
    artefactTypes
    && !artefactTypes.some((type) => ocmNodes.map((ocmNode) => ocmNode.artefact.type).includes(type))
  ) {
    return
  }

  const repoUrl = scanConfig.config.issueReplicator.github_issues_target_repository_url
  const issueState = encodeURIComponent('is:open')
  const name = encodeURIComponent(`${component.name}:${artefact.name}`)
  const repoUrlForArtefact = `https://${repoUrl}/issues?q=${issueState}+${name}`

  return <Tooltip
    title={
      <List>
        <TriggerComplianceToolButton
          ocmNodes={ocmNodes}
          cfgName={scanConfig.name}
          service={COMPLIANCE_TOOLS.ISSUE_REPLICATOR}
        />
        <ListItemButton
          onClick={(e) => e.stopPropagation()}
          component='a'
          href={repoUrlForArtefact}
          target='_blank'
        >
          <ListItemAvatar>
            <Avatar>
              <OpenInNewIcon/>
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={'View on GitHub'}
            secondary={repoUrl}
            secondaryTypographyProps={{color: 'lightgrey'}}
          />
        </ListItemButton>
      </List>
    }
  >
    <Grid item>
      <Chip
        color='default'
        label='Issues'
        variant='outlined'
        size='small'
        icon={<UnfoldMoreIcon/>}
        clickable={false}
      />
    </Grid>
  </Tooltip>
}
IssueChip.displayName = 'IssueChip'
IssueChip.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  component: PropTypes.object.isRequired,
  artefact: PropTypes.object.isRequired,
  scanConfig: PropTypes.object,
}


const OsCell = ({
  osData,
  severity,
  isLoading,
}) => {
  const osInfo = osData?.data.os_info
  const emptyOsId = Object.values(osInfo ?? {}).every(e => e === null)
  const msg = evaluateResourceBranch(osData).reason

  return <Tooltip
    title={
      <Stack>
        {
          osInfo && <>
            <List>
              {
                emptyOsId ? <Typography
                  variant='inherit'
                  sx={{
                    whiteSpace: 'pre-wrap',
                    maxWidth: 'none',
                  }}
                >
                  Unable to determine an OS, thus probably a scratch image.
                </Typography> : <>
                  <Typography variant='inherit'>
                    {msg}
                  </Typography>
                  <Divider/>
                  <Typography
                    variant='inherit'
                    sx={{
                      whiteSpace: 'pre-wrap',
                      maxWidth: 'none',
                    }}
                  >
                    {JSON.stringify(osInfo, null, 2)}
                  </Typography>
                </>
              }
            </List>
            <Divider/>
          </>
        }
        {
          isLoading ? <Skeleton sx={{ width: '10rem' }}/> : <Typography variant='inherit'>
            {
              lastScanTimestampStr(osData)
            }
          </Typography>
        }
      </Stack>
    }
  >
    <Grid item>
      {
        osInfo ? (
          emptyOsId ? <Chip
            label='Scratch Image'
            color='default'
            variant='outlined'
            size='small'
          /> : <Chip
            label={`${osInfo.ID} ${osInfo.VERSION_ID ?? ''}`}
            color={severity.color}
            variant='outlined'
            size='small'
          />
        ) : (
          isLoading ? <Chip
            label={`OS Info ${capitalise(severity.name)}`}
            color={severity.color}
            variant='outlined'
            size='small'
          /> : <Chip
            color='default'
            label='No OS Info'
            variant='outlined'
            size='small'
            clickable={false}
          />
        )
      }
    </Grid>
  </Tooltip>
}
OsCell.displayName = 'OsCell'
OsCell.propTypes = {
  osData: PropTypes.object,
  severity: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
}


const artefactTypeFriendlyNames = {
  'ociImage': 'OCI Image',
  'generic': 'Generic',
  'git': 'Git',
}
Object.freeze(artefactTypeFriendlyNames)


const artefactTypeFriendlyName = ({ artefactType }) => {
  const name = artefactTypeFriendlyNames[artefactType]
  if (!name) return artefactType
  return name
}


const IconCell = ({
  artefact,
  defaultIcon = <AutoAwesomeMosaicIcon/>,
}) => {
  const ArtefactTypeIcons = {
    'ociImage': <img src={DockerLogo} alt='docker-logo'/>,
    'generic': <SourceIcon/>,
  }

  const Icon = ArtefactTypeIcons[artefact.type] ?
    ArtefactTypeIcons[artefact.type] : defaultIcon

  return <TableCell component='th' scope='row'>
    <Tooltip
      title={
        <Typography
          variant='inherit'
          sx={{
            whiteSpace: 'pre-wrap',
            maxWidth: 'none',
          }}
        >
          {artefactTypeFriendlyName({artefactType: artefact.type})}
        </Typography>
      }
      placement='top-start'
      describeChild
    >
      <Box display='flex' alignItems='center' justifyContent='center'>
        {Icon}
      </Box>
    </Tooltip>
  </TableCell>
}
IconCell.displayName = 'IconCell'
IconCell.propTypes = {
  artefact: PropTypes.object.isRequired,
  defaultIcon: PropTypes.element,
}


const findLastScan = (complianceData, datasource) => {
  return complianceData?.find((d) => {
    return (
      d.meta.type === artefactMetadataTypes.ARTEFACT_SCAN_INFO
      && d.meta.datasource === datasource
    )
  })
}


const lastScanTimestampStr = (lastScan) => {
  if (!lastScan) return 'No last scan'
  return `Last scan: ${new Date(lastScan.meta.last_update ?? lastScan.meta.creation_date).toLocaleString()}`
}


const ComplianceCell = ({
  component,
  artefact,
  ocmRepo,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  const {complianceSummary, isSummaryLoading, isSummaryError} = complianceSummaryFetchDetails
  const {complianceData, state} = complianceDataFetchDetails

  const [mountRescoring, setMountRescoring] = React.useState(false)
  const [mountComplianceTool, setMountComplianceTool] = React.useState(false)

  const componentSummary = complianceSummary?.complianceSummary.find((componentSummary) => {
    return (
      componentSummary.componentId.name === component.name
      && componentSummary.componentId.version === component.version
    )
  })

  const artefactSummary = componentSummary?.artefacts.find((artefactSummary) => {
    return (
      artefactSummary.artefact.artefact_kind === artefact.kind
      && artefactSummary.artefact.artefact.artefact_name === artefact.name
      && artefactSummary.artefact.artefact.artefact_version === artefact.version
      && artefactSummary.artefact.artefact.artefact_type === artefact.type
      && normaliseExtraIdentity(artefactSummary.artefact.artefact.artefact_extra_id)
        === normaliseExtraIdentity(artefact.extraIdentity)
    )
  })

  const handleRescoringClose = React.useCallback(() => setMountRescoring(false), [setMountRescoring])
  const ocmNodes = React.useMemo(() => [
    new OcmNode([component], artefact, ARTEFACT_KIND.RESOURCE),
  ], [component, artefact])

  if (isSummaryError || state.error || (!isSummaryLoading && !artefactSummary)) return <TableCell>
    {
      mountRescoring && <RescoringModal
        ocmNodes={ocmNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    {
      mountComplianceTool && <ComplianceToolPopover
        popoverProps={{component}}
        handleClose={(e) => {
          e.stopPropagation()
          setMountComplianceTool(false)
        }}
      />
    }
    <Grid
      container
      direction='row-reverse'
      spacing={1}
    >
      <Tooltip
        title={
          <List>
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
            <ListItemButton onClick={(e) => {
              e.stopPropagation()
              setMountComplianceTool(prev => !prev)
            }}>
              <ListItemAvatar>
                <Avatar>
                  <PublishedWithChangesIcon/>
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={'Schedule Compliance Tool'}/>
            </ListItemButton>
          </List>
        }
      >
        <Grid item>
          <Chip
            color='critical'
            label='Fetch Error'
            variant='outlined'
            size='small'
            icon={<UnfoldMoreIcon/>}
            clickable={false}
          />
        </Grid>
      </Tooltip>
    </Grid>
  </TableCell>

  const getMaxSeverity = (type) => {
    if (!artefactSummary) return findSeverityCfgByName({name: SEVERITIES.UNKNOWN})
    const entry = artefactSummary.entries.find((summary) => summary.type === type)
    return findSeverityCfgByName({name: entry.severity})
  }

  const complianceFiltered = complianceData?.filter(artefactMetadataFilter({
    artefactKind: artefact.kind,
    artefactName: artefact.name,
    artefactVersion: artefact.version,
    artefactType: artefact.type,
    artefactExtraId: artefact.extraIdentity,
  }))

  const osData = complianceFiltered?.find((d) => d.meta.type === artefactMetadataTypes.OS_IDS)
  const codecheckData = complianceFiltered?.find((d) => d.meta.type === artefactMetadataTypes.CODECHECKS_AGGREGATED)

  const lastBdbaScan = findLastScan(complianceFiltered, datasources.BDBA)
  const lastMalwareScan = findLastScan(complianceFiltered, datasources.CLAMAV)

  return <TableCell>
    <Grid container direction='row-reverse' spacing={1}>
      <IssueChip
        ocmNodes={ocmNodes}
        component={component}
        artefact={artefact}
        scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.ISSUE_REPLICATOR in scanConfig.config ? scanConfig : null}
      />
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <BDBACell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.LICENSE}
          severity={getMaxSeverity(artefactMetadataTypes.LICENSE)}
          lastScan={lastBdbaScan}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.BDBA in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <MalwareFindingCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          metadataTypedef={findTypedefByName({name: artefactMetadataTypes.FINDING_MALWARE})}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.CLAMAV in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          lastScan={lastMalwareScan}
          severity={getMaxSeverity(artefactMetadataTypes.FINDING_MALWARE)}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <OsCell
          osData={osData}
          severity={getMaxSeverity(artefactMetadataTypes.OS_IDS)}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.SOURCE && <CodecheckCell
          data={codecheckData?.data}
          severity={artefactMetadatumSeverity(codecheckData)}
          timestamp={codecheckData?.meta.creation_date}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <BDBACell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.VULNERABILITY}
          severity={getMaxSeverity(artefactMetadataTypes.VULNERABILITY)}
          lastScan={lastBdbaScan}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.BDBA in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
    </Grid>
  </TableCell>
}
ComplianceCell.displayName = 'ComplianceCell'
ComplianceCell.propTypes = {
  component: PropTypes.object.isRequired,
  artefact: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}


const ArtefactCell = ({
  artefact,
  component,
}) => {
  const artefactDisplayName = `${artefact.name}:${artefact.version}`
  const downloadUrl = new URL(routes.ocm.artefactsBlob)
  appendPresentParams(downloadUrl, {
    component: `${component.name}:${component.version}`,
    artefact: JSON.stringify({
      name: artefact.name,
      version: artefact.version,
      ...artefact.extraIdentity
    }),
    unzip: 'true',
  })

  if (artefact.type === 'ociImage')
    return <TableCell>
      <Link
        href={
          artefact.access.imageReference
            ? `https://${artefact.access.imageReference}`
            : 'https://gardener.github.io/component-spec/component-descriptor-v2.html#component_resources_items_anyOf_i1_access'
        }
        target='_blank'
        rel='noreferrer'
        color='inherit'
      >
        <ExtraIdentityHover
          displayName={artefactDisplayName}
          extraIdentity={artefact.extraIdentity}
        />
      </Link>
    </TableCell>
  if (artefact.access.type.toLowerCase() === 'github') {
    return <TableCell>
      <Link
        href={
          artefact.access.repoUrl.startsWith('https://')
            ? `${artefact.access.repoUrl}/tree/${artefact.access.commit}`
            : `https://${artefact.access.repoUrl}/tree/${artefact.access.commit}`
        }
        target='_blank'
        rel='noreferrer'
        color='inherit'
      >
        <ExtraIdentityHover
          displayName={artefactDisplayName}
          extraIdentity={artefact.extraIdentity}
        />
      </Link>
    </TableCell>
  }

  if (artefact.access.type === 'localBlob/v1') {
    return <TableCell>
      <Box
        display='flex'
        flexDirection='row'
        alignItems='center'
      >
        <ExtraIdentityHover
          displayName={artefactDisplayName}
          extraIdentity={artefact.extraIdentity}
        />
        <div style={{ padding: '0.3em' }} />
        <Tooltip title='Download'>
          <span>
            <a
              href={downloadUrl}
              target='_blank'
              rel='noreferrer'
            >
              <IconButton size='small'>
                <CloudDownloadIcon/>
              </IconButton>
            </a>
          </span>
        </Tooltip>
      </Box>
    </TableCell>
  }

  return <TableCell>
    <ExtraIdentityHover
      displayName={artefactDisplayName}
      extraIdentity={artefact.extraIdentity}
    />
  </TableCell>
}
ArtefactCell.displayName = 'ArtefactCell'
ArtefactCell.propTypes = {
  artefact: PropTypes.object.isRequired,
  component: PropTypes.object.isRequired,
}


const CodecheckCell = ({
  data,
  severity,
  timestamp,
}) => {
  if (severity.name === findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).name) return <Tooltip
    title={<Typography variant='inherit'>No last scan</Typography>}
  >
    <Grid item>
      <Chip
        color='default'
        label='No Codecheck'
        variant='outlined'
        size='small'
        clickable={false}
      />
    </Grid>
  </Tooltip>

  const localeDateTime = new Date(timestamp).toLocaleString()
  const findings = data.findings

  return <Tooltip
    title={
      <Stack direction='column' spacing={1}>
        <Stack direction='column' spacing={0} key={JSON.stringify(data)+'_body'}>
          <Typography variant='caption'>High: {findings.high}</Typography>
          <Typography variant='caption'>Medium: {findings.medium}</Typography>
          <Typography variant='caption'>Low: {findings.low}</Typography>
          <Typography variant='caption'>Info: {findings.info}</Typography>
          <Typography variant='caption'>Risk Rating: {data.risk_rating}</Typography>
          <Typography variant='caption'>Risk Severity: {data.risk_severity}</Typography>
        </Stack>
        <Divider/>
        <Typography variant='inherit'>
          {`Last scan: ${localeDateTime}`}
        </Typography>
      </Stack>
    }
  >
    <Grid item>
      <Chip
        color={severity.color}
        label={<Link color={'inherit'}>Codechecks</Link>}
        variant='outlined'
        size='small'
        icon={<IosShareIcon/>}
        clickable={true}
        onClick={() => {
          data
            ? window.open(data.overview_url, '_blank')
            : null
        }}
      />
    </Grid>
  </Tooltip>
}
CodecheckCell.displayName = 'CodecheckCell'
CodecheckCell.propTypes = {
  data: PropTypes.object,
  severity: PropTypes.object.isRequired,
  timestamp: PropTypes.string,
}


const RescoringButton = ({
  setMountRescoring,
  title,
}) => {
  return <ListItemButton
    onClick={(e) => {
      setMountRescoring(true)
      e.stopPropagation()
    }}
    divider
  >
    <ListItemAvatar>
      <Avatar>
        <AutorenewIcon/>
      </Avatar>
    </ListItemAvatar>
    <ListItemText primary={title}/>
  </ListItemButton>
}
RescoringButton.displayName = 'RescoringButton'
RescoringButton.propTypes = {
  setMountRescoring: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
}


const BDBAButton = ({
  reportUrl,
}) => {
  return <ListItemButton
    onClick={(e) => e.stopPropagation()}
    component='a'
    href={reportUrl}
    target='_blank'
    divider
  >
    <ListItemAvatar>
      <Avatar>
        <OpenInNewIcon/>
      </Avatar>
    </ListItemAvatar>
    <ListItemText
      primary='View in BDBA'
      secondary={new URL(reportUrl).host}
      secondaryTypographyProps={{ color: 'lightgrey' }}
    />
  </ListItemButton>
}
BDBAButton.displayName = 'BDBAButton'
BDBAButton.propTypes = {
  reportUrl: PropTypes.string.isRequired,
}


const MalwareFindingCell = ({
  ocmNodes,
  ocmRepo,
  metadataTypedef,
  scanConfig,
  fetchComplianceSummary,
  lastScan,
  severity,
  isLoading,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  if (scanConfig) {
    // if artefact type filter is set, don't show bdba cell for types that are filtered out
    const artefactTypes = scanConfig.config.clamav.artefact_types
      ? scanConfig.config.clamav.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (
      artefactTypes
      && !artefactTypes.some((type) => ocmNodes.map((ocmNode) => ocmNode.artefact.type).includes(type))
    ) {
      return null
    }
  }

  const title = metadataTypedef.friendlyName

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={ocmNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Tooltip
      title={
        <Stack>
          <List>
            {
              scanConfig && <TriggerComplianceToolButton
                ocmNodes={ocmNodes}
                cfgName={scanConfig.name}
                service={COMPLIANCE_TOOLS.CLAMAV}
              />
            }
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
          </List>
          {
            isLoading ? <Skeleton/> : <Typography variant='inherit'>
              {
                lastScanTimestampStr(lastScan)
              }
            </Typography>
          }
        </Stack>
      }
    >
      {
        lastScan || isLoading ? <Chip
          color={severity.color}
          label={severity.name === SEVERITIES.CLEAN
            ? `No ${title} Findings`
            : `${title} ${capitalise(severity.name)}`
          }
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        /> : <Chip
          color='default'
          label={`No ${title} Scan`}
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        />
      }
    </Tooltip>
  </Grid>
}
MalwareFindingCell.displayName = 'MalwareFindingCell'
MalwareFindingCell.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
  metadataTypedef: PropTypes.object.isRequired,
  severity: PropTypes.object.isRequired,
  lastScan: PropTypes.object,
  scanConfig: PropTypes.object,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}


const BDBACell = ({
  ocmNodes,
  ocmRepo,
  type,
  severity,
  lastScan,
  scanConfig,
  fetchComplianceSummary,
  isLoading,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  if (scanConfig) {
    // if artefact type filter is set, don't show bdba cell for types that are filtered out
    const artefactTypes = scanConfig.config.bdba.artefact_types
      ? scanConfig.config.bdba.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (
      artefactTypes
      && !artefactTypes.some((type) => ocmNodes.map((ocmNode) => ocmNode.artefact.type).includes(type))
    ) {
      return null
    }
  }

  const title = findTypedefByName({name: type}).friendlyName
  const reportUrl = lastScan?.data.report_url

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={ocmNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Tooltip
      title={
        <Stack>
          <List>
            {
              scanConfig && <TriggerComplianceToolButton
                ocmNodes={ocmNodes}
                cfgName={scanConfig.name}
                service={COMPLIANCE_TOOLS.BDBA}
              />
            }
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
            {
              reportUrl && <BDBAButton reportUrl={reportUrl}/>
            }
          </List>
          {
            isLoading ? <Skeleton/> : <Typography variant='inherit'>
              {
                lastScanTimestampStr(lastScan)
              }
            </Typography>
          }
        </Stack>
      }
    >
      {
        lastScan || isLoading ? <Chip
          color={severity.color}
          label={severity.name === SEVERITIES.CLEAN
            ? `No ${title} Findings`
            : `${title} ${capitalise(severity.name)}`
          }
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        /> : <Chip
          color='default'
          label={`No ${title} Scan`}
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        />
      }
    </Tooltip>
  </Grid>
}
BDBACell.displayName = 'BDBACell'
BDBACell.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
  type: PropTypes.string.isRequired,
  severity: PropTypes.object.isRequired,
  lastScan: PropTypes.object,
  scanConfig: PropTypes.object,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}
