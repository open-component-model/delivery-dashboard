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
import LaunchIcon from '@mui/icons-material/Launch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import SearchIcon from '@mui/icons-material/Search'
import SourceIcon from '@mui/icons-material/Source'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import MoreVertIcon from '@mui/icons-material/MoreVert'

import PropTypes from 'prop-types'

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
  capitalise,
  ExtraIdentityHover,
  matchObjectWithSearchQuery,
  shortenComponentName,
  downloadObject,
} from '../util'
import ExtraWideTooltip from '../util/extraWideTooltip'
import FeatureDependent from '../util/featureDependent'
import ComplianceToolPopover from '../util/complianceToolsPopover'
import {
  ARTEFACT_KIND,
  COMPLIANCE_TOOLS,
  features,
  fetchBomPopulate,
  PROFILE_KEY,
  SUMMARY_CATEGORISATIONS,
} from '../consts'
import {
  useFetchComponentResponsibles,
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
import { MetadataViewerPopover, artefactMetadataTypes, datasources } from '../ocm/model'
import { components, routes } from '../api'
import { SprintInfo } from '../util/sprint'
import ErrorBoundary from '../util/errorBoundary'
import { VersionOverview, evaluateVersionMatch } from '../util/versionOverview'
import TriggerComplianceToolButton from '../util/triggerComplianceToolButton'
import {
  categorisationValueToColor,
  categorisationValueToIndicator,
  findCategorisationById,
  FINDING_TYPES,
  findingCfgForType,
  findingTypeToDisplayName,
  rescorableFindingTypes,
  retrieveFindingsForType,
} from '../findings'

import DockerLogo from '../resources/docker-icon.svg'


const MetadataViewer = ({
  component,
  ocmRepo,
  findingCfgs,
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
          findingCfgs: findingCfgs,
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
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
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
  findingCfgs,
  iconProps,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()
  const [clusterAccessFeature, setClusterAccessFeature] = React.useState()
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
      featureName: features.CLUSTER_ACCESS,
      callback: ({feature}) => setClusterAccessFeature(feature),
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
      (deliveryDbFeature?.isAvailable || clusterAccessFeature?.isAvailable) && <IconButton
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
            deliveryDbFeature?.isAvailable && <MetadataViewer
              component={component}
              ocmRepo={ocmRepo}
              findingCfgs={findingCfgs}
            />
          }
          {
            clusterAccessFeature?.isAvailable && <ComplianceTools component={component}/>
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
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  iconProps: PropTypes.object,
}

const Component = React.memo(({
  component,
  referencingPaths,
  isComponentLoading,
  isComponentError,
  ocmRepo,
  isParentComponent,
  extensionsCfg,
  findingCfgs,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const theme = useTheme()
  const [profile, setProfile] = React.useState(localStorage.getItem(PROFILE_KEY))
  addEventListener('profile', () => setProfile(localStorage.getItem(PROFILE_KEY)))

  const name = trimComponentName(component.name)

  const [expanded, setExpanded] = React.useState(Boolean(isParentComponent && Boolean(searchParamContext.get('rootExpanded'))))

  const [complianceSummary, complianceSummaryState, refreshComplianceSummary] = useFetchComplianceSummary({
    componentName: component.name,
    componentVersion: component.version,
    recursionDepth: 0,
    ocmRepo: ocmRepo,
    profile: profile,
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

  return <Box
    sx={{
      paddingBottom: '0.3em',
      '&:hover': {
        backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'light' ? 0.15 : 1),
      },
    }}
  >
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
              <Tooltip
                title={component.name}
              >
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
                    if (referencingPaths.length === 0) return // root component has no paths
                    updatePathFromComponentRef(referencingPaths[0])
                  }}
                >
                  {name}
                </Link>
              </Tooltip>
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
              {
                findingCfgs.length > 0 && <ComponentChip
                  component={component}
                  complianceSummaryFetchDetails={complianceSummaryFetchDetails}
                  findingCfgs={findingCfgs}
                />
              }
            </Grid>
          </FeatureDependent>
          <Grid item xs={isParentComponent ? 0.5 : 1}>
            <ComponentSettings
              component={component}
              ocmRepo={ocmRepo}
              findingCfgs={findingCfgs}
              iconProps={isParentComponent ? {sx: {color: theme.bomButton}} : {}}
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails onClick={(event) => event.stopPropagation()}>
        <ComponentDetails
          component={component}
          referencingPaths={referencingPaths}
          isComponentLoading={isComponentLoading}
          isComponentError={isComponentError}
          ocmRepo={ocmRepo}
          complianceSummaryFetchDetails={complianceSummaryFetchDetails}
          fetchComplianceSummary={refreshComplianceSummary}
          extensionsCfg={extensionsCfg}
          findingCfgs={findingCfgs}
        />
      </AccordionDetails>
    </Accordion>
  </Box>
})
Component.displayName = 'Component'
Component.propTypes = {
  component: PropTypes.object.isRequired,
  referencingPaths: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)),
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  isParentComponent: PropTypes.bool,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
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
            {responsiblesSource.origin_type} from{' '}
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
  referencingPaths,
  isComponentLoading,
  isComponentError,
  ocmRepo,
  complianceSummaryFetchDetails,
  fetchComplianceSummary,
  extensionsCfg,
  findingCfgs,
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
          extensionsCfg={extensionsCfg}
          findingCfgs={findingCfgs}
        />
    }
    {
      referencingPaths.length > 0 && <ComponentReferencedBy
        component={component}
        referencingPaths={referencingPaths}
        ocmRepo={ocmRepo}
      />
    }
    <ResponsiblesWrapper
      component={component}
      ocmRepo={ocmRepo}
    />
  </Stack>
})
ComponentDetails.displayName = 'ComponentDetails'
ComponentDetails.propTypes = {
  component: PropTypes.object.isRequired,
  referencingPaths: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)),
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}

const Components = ({
  componentReferenceGroups,
  isComponentsLoading,
  isComponentsError,
  ocmRepo,
  extensionsCfg,
  findingCfgs,
}) => {
  return <Box>
    {
      componentReferenceGroups.map(compRefGroup => <Component
        key={`${compRefGroup.component.name}:${compRefGroup.component.version}`}
        component={compRefGroup.component}
        referencingPaths={compRefGroup.referencingPaths}
        isComponentLoading={isComponentsLoading}
        isComponentError={isComponentsError}
        ocmRepo={ocmRepo}
        extensionsCfg={extensionsCfg}
        findingCfgs={findingCfgs}
      />)
    }
  </Box>
}
Components.displayName = 'Components'
Components.propTypes = {
  componentReferenceGroups: PropTypes.arrayOf(PropTypes.object),
  isComponentsLoading: PropTypes.bool,
  isComponentsError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const ArtefactDetails = ({
  component,
  artefacts,
  ocmRepo,
  title,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  extensionsCfg,
  findingCfgs,
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
                ocmNode={new OcmNode([component], artefact, artefact.kind)}
                ocmRepo={ocmRepo}
                complianceSummaryFetchDetails={complianceSummaryFetchDetails}
                complianceDataFetchDetails={complianceDataFetchDetails}
                fetchComplianceSummary={fetchComplianceSummary}
                extensionsCfg={extensionsCfg}
                findingCfgs={findingCfgs}
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
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const Artefacts = ({
  component,
  ocmRepo,
  complianceSummaryFetchDetails,
  fetchComplianceSummary,
  extensionsCfg,
  findingCfgs,
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
      artefactMetadataTypes.OSID,
    ]
  }, [
    findingCfgs,
    artefactMetadataTypes.ARTEFACT_SCAN_INFO,
    artefactMetadataTypes.OSID,
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
      extensionsCfg={extensionsCfg}
      findingCfgs={findingCfgs}
    />
    <ArtefactDetails
      component={component}
      artefacts={sources}
      ocmRepo={ocmRepo}
      title={'Sources'}
      complianceSummaryFetchDetails={complianceSummaryFetchDetails}
      complianceDataFetchDetails={complianceDataFetchDetails}
      fetchComplianceSummary={fetchComplianceSummary}
      extensionsCfg={extensionsCfg}
      findingCfgs={findingCfgs}
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
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const ArtefactTableRow = ({
  ocmNode,
  ocmRepo,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  extensionsCfg,
  findingCfgs,
}) => {
  return <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
    <IconCell artefact={ocmNode.artefact}/>
    <ArtefactCell ocmNode={ocmNode}/>
    <FeatureDependent requiredFeatures={[features.DELIVERY_DB]}>
      {
        findingCfgs.length > 0 && <ComplianceCell
          ocmNode={ocmNode}
          ocmRepo={ocmRepo}
          complianceSummaryFetchDetails={complianceSummaryFetchDetails}
          complianceDataFetchDetails={complianceDataFetchDetails}
          fetchComplianceSummary={fetchComplianceSummary}
          extensionsCfg={extensionsCfg}
          findingCfgs={findingCfgs}
        />
      }
    </FeatureDependent>
  </TableRow>
}
ArtefactTableRow.displayName = 'ArtefactTableRow'
ArtefactTableRow.propTypes = {
  ocmNode: PropTypes.instanceOf(OcmNode).isRequired,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
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
  referencingPaths,
  ocmRepo,
}) => {
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
          {
            referencingPaths.map((referencingPath, idx) => <ReferencedByTableRow
              key={idx}
              ocmRepo={ocmRepo}
              referencingPath={referencingPath}
              component={component}
            />)
          }
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
}
ComponentReferencedBy.displayName = 'ComponentReferencedBy'
ComponentReferencedBy.propTypes = {
  component: PropTypes.object,
  referencingPaths: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)),
  ocmRepo: PropTypes.string,
}

const ReferencedByTableRow = ({
  ocmRepo,
  component,
  referencingPath,
}) => {
  const icon = <GitHubIcon/>

  const path = enhanceComponentRefFromPath(
    referencingPath.length > 0
      ? referencingPath
      : [{name: component.name, version: component.version}]
  )

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
                  path.map((ref, idx) => <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                          updatePathFromComponentRef(path)
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
          {`${path[path.length - 2].name}:${path[path.length - 2].version}`}
        </Typography>
      </ExtraWideTooltip>
    </TableCell>
  </TableRow>
}
ReferencedByTableRow.displayName = 'ReferencedByTableRow'
ReferencedByTableRow.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  referencingPath: PropTypes.arrayOf(PropTypes.object),
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
  specialComponentId,
  browserLocalOnly,
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
      <FeatureDependent
        requiredFeatures={[features.SPECIAL_COMPONENTS]}
        childrenIfFeatureLoading={<Skeleton width='100%'/>} // explicitly set width as parent container is a flexbox
      >
        {
          !browserLocalOnly && specialComponentId !== undefined && (isComponentLoading
            ? <Skeleton width='100%'/>
            : <SpecialComponentStatus
              component={component}
              componentRefs={componentRefs}
              specialComponentFeature={getSpecialComponentFeature()}
              specialComponentId={specialComponentId}
            />
          )
        }
      </FeatureDependent>
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
  specialComponentId: PropTypes.string,
  browserLocalOnly: PropTypes.bool,
  defaultSearchValue: PropTypes.string,
}


const FetchComponentRefsTab = React.memo(({
  component,
  ocmRepo,
  searchQuery,
  setComponentRefs,
  extensionsCfg,
  findingCfgs,
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
    extensionsCfg={extensionsCfg}
    findingCfgs={findingCfgs}
  />
})
FetchComponentRefsTab.displayName = 'FetchComponentRefsTab'
FetchComponentRefsTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  searchQuery: PropTypes.string,
  setComponentRefs: PropTypes.func.isRequired,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


export const BomTab = React.memo(({
  component,
  isLoading,
  ocmRepo,
  specialComponentId,
  browserLocalOnly,
  searchQuery,
  updateSearchQuery,
}) => {
  const [componentRefs, setComponentRefs] = React.useState(null)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()
  const [extensionsCfgFeature, setExtensionsCfgFeature] = React.useState()
  const [findingCfgsFeature, setFindingCfgsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.EXTENSIONS_CONFIGURATION,
      callback: ({feature}) => setExtensionsCfgFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.FINDING_CONFIGURATIONS,
      callback: ({feature}) => setFindingCfgsFeature(feature),
    })
  }, [featureRegistrationContext])

  const getSpecialComponentFeature = () => {
    if (isLoading || browserLocalOnly) return null

    if (!specialComponentsFeature?.isAvailable) return null

    return specialComponentsFeature.specialComponents.find(c => c.id === specialComponentId)
  }

  const extensionsCfg = extensionsCfgFeature?.isAvailable ? extensionsCfgFeature.extensions_cfg : null
  const findingCfgs = findingCfgsFeature?.isAvailable ? findingCfgsFeature.finding_cfgs : []

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
      specialComponentId={specialComponentId}
      browserLocalOnly={browserLocalOnly}
      defaultSearchValue={searchQuery}
    />
    <div style={{ padding: '0.5em' }} />
    {
      isLoading ? <LoadingDependencies/> : <FetchComponentRefsTab
        component={component}
        ocmRepo={ocmRepo}
        searchQuery={searchQuery}
        setComponentRefs={setComponentRefs}
        extensionsCfg={extensionsCfg}
        findingCfgs={findingCfgs}
      />
    }
  </Box>
})
BomTab.displayName = 'BomTab'
BomTab.propTypes = {
  component: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
  ocmRepo: PropTypes.string,
  specialComponentId: PropTypes.string,
  browserLocalOnly: PropTypes.bool,
  searchQuery: PropTypes.string,
  updateSearchQuery: PropTypes.func.isRequired,
}


const FetchDependenciesTab = React.memo(({
  component,
  ocmRepo,
  componentRefs,
  searchQuery,
  extensionsCfg,
  findingCfgs,
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

  const mostSpecificComponents = () => {
    if (
      component
      && !state.isLoading
      && !state.error
    ) return components.componentDependencies

    return componentRefs
  }

  const referencesForComponent = () => {
    const components = mostSpecificComponents().sort((a, b) => compareComponentsByName(a, b))

    return components.reduce(
      (acc, current) => {
        const id = `${current.name}:${current.version}`
        if (acc[id]) {
          acc[id].referencingPaths.push(current.comp_ref)
        } else {
          acc[id] = {
            component: { ...current }, // we will modify this, use copy to avoid side effects
            referencingPaths: [current.comp_ref],
          }
        }
        delete acc[id].component.comp_ref // sanitise, so there is only the OCM component
        return acc
      }, {}
    )
  }

  const filteredBom = () => {
    return Object.values(referencesForComponent()).filter(obj => {
      const component = obj.component
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
      referencingPaths={[]} // there are no paths to root component
      ocmRepo={ocmRepo}
      isParentComponent={true}
      extensionsCfg={extensionsCfg}
      findingCfgs={findingCfgs}
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
          componentReferenceGroups={left}
          isComponentsLoading={state.isLoading}
          isComponentsError={state.error}
          ocmRepo={ocmRepo}
          extensionsCfg={extensionsCfg}
          findingCfgs={findingCfgs}
        />
      </Box>
      <Box
        width='50%'
      >
        <Components
          componentReferenceGroups={right}
          isComponentsLoading={state.isLoading}
          isComponentsError={state.error}
          ocmRepo={ocmRepo}
          extensionsCfg={extensionsCfg}
          findingCfgs={findingCfgs}
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
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const SpecialComponentStatus = ({
  component,
  componentRefs,
  specialComponentFeature,
  specialComponentId,
}) => {
  const [specialComponentStatus, state] = useFetchSpecialComponentCurrentDependencies({id: specialComponentId})

  if (!componentRefs) return <Skeleton width='100%'/>

  if (state.error) {
    return <Typography variant='caption'>Error fetching special component status</Typography>
  }
  if (!specialComponentStatus) {
    return <Skeleton width='100%'/>
  }

  if (!specialComponentStatus.componentDependencies) {
    // Because no remote versions are specified, the status of a release cannot be calculated
    return null
  }

  const deps = [...new Set(componentRefs.map((dep) => dep.name))].map((depName, idx) => {
    const userCfgDep = component.dependencies?.find((d) => d.name === depName)
    const remoteDep = specialComponentStatus.componentDependencies.find((d) => d.name === depName)

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
  specialComponentId: PropTypes.string.isRequired,
}


export const ComponentChip = ({
  component,
  complianceSummaryFetchDetails,
  findingCfgs,
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

  const worstEntry = componentSummary.entries.reduce((worstEntry, entry) => {
    if (entry.value <= 0) return worstEntry

    return !worstEntry || entry.value > worstEntry.value ? entry : worstEntry
  }, null)

  if (!worstEntry) return null

  const worstEntriesCount = componentSummary.entries.filter((entry) => entry.value === worstEntry.value).length

  const IndicatorTooltipTitle = ({ summaries }) => {
    return <Stack direction='column' spacing={1}>
      {
        summaries.map((summary) => {
          const Indicator = categorisationValueToIndicator(summary.value)

          const findingCfg = findingCfgForType({
            findingType: summary.type,
            findingCfgs: findingCfgs,
          })
          const categorisation = findCategorisationById({
            id: summary.categorisation,
            findingCfg: findingCfg,
          })
          const displayName = categorisation
            ? categorisation.display_name
            : summary.categorisation

          return <Stack
            key={summary.type}
            direction='column'
            spacing={1}
          >
            <Stack direction='row' spacing={1} key={summary.type + '_title'}>
              <Indicator color={categorisationValueToColor(summary.value)} size='small'/>
              <Box display='flex' alignItems='center' justifyContent='center'>
                <Typography>{findingTypeToDisplayName(summary.type)}</Typography>
              </Box>
            </Stack>
            <Stack direction='column' spacing={0} key={summary.type + '_body'}>
              <Typography variant='caption'>Severity: {displayName}</Typography>
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

  const Indicator = categorisationValueToIndicator(worstEntry.value)

  return <Box display='flex' alignItems='center' justifyContent='center'>
    <Tooltip
      title={<IndicatorTooltipTitle summaries={componentSummary.entries.sort((left, right) => right.value - left.value)}/>}
    >
      <Badge
        badgeContent={worstEntriesCount}
        color='primary'
        invisible={worstEntriesCount <= 1}
      >
        <Indicator color={categorisationValueToColor(worstEntry.value)}/>
      </Badge>
    </Tooltip>
  </Box>
}
ComponentChip.displayName = 'ComponentChip'
ComponentChip.propTypes = {
  component: PropTypes.object.isRequired,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const IssueChip = ({
  ocmNode,
  issueReplicatorCfg,
}) => {
  const ocmNodes = React.useMemo(() => [ocmNode], [ocmNode])
  const mapping = issueReplicatorCfg.mappings.find((mapping) => ocmNode.component.name.startsWith(mapping.prefix))

  if (!mapping) return

  const repoUrl = mapping.github_repository
  const issueState = encodeURIComponent('is:open')
  const name = encodeURIComponent(`${ocmNode.component.name}:${ocmNode.artefact.name}`)
  const repoUrlForArtefact = `https://${repoUrl}/issues?q=${issueState}+${name}`

  return <Tooltip
    title={
      <List>
        <TriggerComplianceToolButton
          ocmNodes={ocmNodes}
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
  ocmNode: PropTypes.instanceOf(OcmNode).isRequired,
  issueReplicatorCfg: PropTypes.object.isRequired,
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
  ocmNode,
  ocmRepo,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  extensionsCfg,
  findingCfgs,
}) => {
  const {complianceSummary, isSummaryError} = complianceSummaryFetchDetails
  const {complianceData, state} = complianceDataFetchDetails

  const [mountRescoring, setMountRescoring] = React.useState(false)
  const [mountComplianceTool, setMountComplianceTool] = React.useState(false)

  const componentSummary = complianceSummary?.complianceSummary.find((componentSummary) => {
    return (
      componentSummary.componentId.name === ocmNode.component.name
      && componentSummary.componentId.version === ocmNode.component.version
    )
  })

  const artefactSummary = componentSummary?.artefacts.find((artefactSummary) => {
    return (
      artefactSummary.artefact.artefact_kind === ocmNode.artefactKind
      && artefactSummary.artefact.artefact.artefact_name === ocmNode.artefact.name
      && artefactSummary.artefact.artefact.artefact_version === ocmNode.artefact.version
      && artefactSummary.artefact.artefact.artefact_type === ocmNode.artefact.type
      && normaliseExtraIdentity(artefactSummary.artefact.artefact.artefact_extra_id)
        === ocmNode.normalisedExtraIdentity()
    )
  })

  const handleRescoringClose = React.useCallback(() => setMountRescoring(false), [setMountRescoring])
  const ocmNodes = React.useMemo(() => [ocmNode], [ocmNode])

  const manuallyRescorableFindingTypes = rescorableFindingTypes({findingCfgs})

  if (isSummaryError || state.error) return <TableCell>
    {
      mountRescoring && <RescoringModal
        ocmNodes={ocmNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        initialFindingType={manuallyRescorableFindingTypes[0]} // we checked there is at least one finding type
        findingCfgs={findingCfgs}
      />
    }
    {
      mountComplianceTool && <ComplianceToolPopover
        popoverProps={{component: ocmNode.component}}
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
            {
              manuallyRescorableFindingTypes.length > 0 && <RescoringButton
                setMountRescoring={setMountRescoring}
                title={'Rescoring'}
              />
            }
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

  const getCategorisation = (findingType) => {
    const findingCfg = findingCfgForType({findingType, findingCfgs})
    const entry = artefactSummary?.entries.find((summary) => summary.type === findingType)
    return findCategorisationById({
      id: entry?.categorisation ?? SUMMARY_CATEGORISATIONS.UNKNOWN,
      findingCfg: findingCfg,
    })
  }

  const complianceFiltered = complianceData?.filter(artefactMetadataFilter({
    artefactKind: ocmNode.artefact.kind,
    artefactName: ocmNode.artefact.name,
    artefactVersion: ocmNode.artefact.version,
    artefactType: ocmNode.artefact.type,
    artefactExtraId: ocmNode.artefact.extraIdentity,
  }))

  const osData = complianceFiltered?.find((d) => d.meta.type === artefactMetadataTypes.OSID)

  const lastBdbaScan = findLastScan(complianceFiltered, datasources.BDBA)
  const lastCryptoScan = findLastScan(complianceFiltered, datasources.CRYPTO)
  const lastMalwareScan = findLastScan(complianceFiltered, datasources.CLAMAV)
  const lastOsIdScan = findLastScan(complianceFiltered, datasources.OSID)
  const lastSastScan = findLastScan(complianceFiltered, datasources.SAST)

  const retrieveCryptoFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.CRYPTO,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })
  const retrieveLicenseFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.LICENSE,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })
  const retrieveMalwareFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.MALWARE,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })
  const retrieveOsIdFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.OSID,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })
  const retrieveVulnerabilityFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.VULNERABILITY,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })
  const retrieveSastFindings = retrieveFindingsForType({
    findingType: FINDING_TYPES.SAST,
    findingCfgs: findingCfgs,
    ocmNode: ocmNode,
  })

  return <TableCell>
    <Grid container direction='row-reverse' spacing={1}>
      {
        extensionsCfg?.issue_replicator?.enabled && <IssueChip
          ocmNode={ocmNode}
          issueReplicatorCfg={extensionsCfg.issue_replicator}
        />
      }
      {
        extensionsCfg?.bdba?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.RESOURCE && retrieveLicenseFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.BDBA}
          type={FINDING_TYPES.LICENSE}
          categorisation={getCategorisation(FINDING_TYPES.LICENSE)}
          lastScan={lastBdbaScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        extensionsCfg?.clamav?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.RESOURCE && retrieveMalwareFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.CLAMAV}
          type={FINDING_TYPES.MALWARE}
          categorisation={getCategorisation(FINDING_TYPES.MALWARE)}
          lastScan={lastMalwareScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        extensionsCfg?.crypto?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.RESOURCE && retrieveCryptoFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.CRYPTO}
          type={FINDING_TYPES.CRYPTO}
          categorisation={getCategorisation(FINDING_TYPES.CRYPTO)}
          lastScan={lastCryptoScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        extensionsCfg?.osid?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.RESOURCE && retrieveOsIdFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.OSID}
          type={FINDING_TYPES.OSID}
          categorisation={getCategorisation(FINDING_TYPES.OSID)}
          lastScan={lastOsIdScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
          osData={osData}
        />
      }
      {
        extensionsCfg?.bdba?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.RESOURCE && retrieveVulnerabilityFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.BDBA}
          type={FINDING_TYPES.VULNERABILITY}
          categorisation={getCategorisation(FINDING_TYPES.VULNERABILITY)}
          lastScan={lastBdbaScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        extensionsCfg?.sast?.enabled && ocmNode.artefactKind === ARTEFACT_KIND.SOURCE && retrieveSastFindings && <RescoringCell
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          datasource={datasources.SAST}
          type={FINDING_TYPES.SAST}
          categorisation={getCategorisation(FINDING_TYPES.SAST)}
          lastScan={lastSastScan}
          findingCfgs={findingCfgs}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
    </Grid>
  </TableCell>
}
ComplianceCell.displayName = 'ComplianceCell'
ComplianceCell.propTypes = {
  ocmNode: PropTypes.instanceOf(OcmNode).isRequired,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  extensionsCfg: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const ArtefactCell = ({
  ocmNode,
}) => {
  const component = ocmNode.component
  const artefact = ocmNode.artefact
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
  ocmNode: PropTypes.instanceOf(OcmNode).isRequired,
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


const RescoringCell = ({
  ocmNodes,
  ocmRepo,
  datasource,
  type,
  categorisation,
  lastScan,
  findingCfgs,
  fetchComplianceSummary,
  isLoading,
  osData,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  const title = findingTypeToDisplayName(type)

  const chipLabel = () => {
    if (
      datasource === datasources.OSID
      && osData?.data
    ) {
      return `${osData.data.NAME || 'Unknown'} ${osData.data.VERSION_ID || ''}`
    }

    if (categorisation.value === 0) {
      return `No ${title} Findings`
    }

    return `${title} ${capitalise(categorisation.display_name)}`
  }


  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={ocmNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        initialFindingType={type}
        findingCfgs={findingCfgs}
      />
    }
    <Tooltip
      title={
        <Stack>
          <List>
            <TriggerComplianceToolButton
              ocmNodes={ocmNodes}
              service={datasource}
            />
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
            {
              datasource === datasources.BDBA && lastScan?.data.report_url && <BDBAButton
                reportUrl={lastScan?.data.report_url}
              />
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
          color={categorisationValueToColor(categorisation.value)}
          label={chipLabel()}
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
RescoringCell.displayName = 'RescoringCell'
RescoringCell.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  ocmRepo: PropTypes.string,
  datasource: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  categorisation: PropTypes.object.isRequired,
  lastScan: PropTypes.object,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  osData: PropTypes.object, // only needed for os id
}
