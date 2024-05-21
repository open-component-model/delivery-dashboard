import React from 'react'
import PropTypes from 'prop-types'

import {
  alpha,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
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
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'
import SearchIcon from '@mui/icons-material/Search'
import { useSnackbar } from 'notistack'

import { FeatureRegistrationContext, SearchParamContext } from '../../App'
import { artefactsQueryMetadata } from './../../api'
import { generateArtefactID } from '../../cnudie'
import { ComponentChip } from './ComplianceChips'
import { Responsibles } from './Responsibles'
import {
  componentPathQuery,
  enhanceComponentRefFromPath,
  mixupFindingsWithRescorings,
  trimComponentName,
  trimLongString,
  updatePathFromComponentRef,
} from '../../util'
import ExtraWideTooltip from '../util/ExtraWideTooltip'
import FeatureDependent from '../util/FeatureDependent'
import ComplianceToolPopover from './../util/ComplianceToolsPopover'
import { errorSnackbarProps, features } from '../../consts'
import { artefactMetadataTypes, MetadataViewerPopover } from '../../ocm/model'
import { ComplianceCell, ArtefactCell, IconCell } from './ComplianceCells'
import {
  useFetchComponentResponsibles,
  useFetchScanConfigurations,
} from '../../api/useFetch'
import { registerCallbackHandler } from '../../feature'
import CopyOnClickChip from '../util/CopyOnClickChip'
import { useTheme } from '@emotion/react'


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

const Component = React.memo(
  ({
    component,
    isComponentLoading,
    isComponentError,
    complianceSummary,
    fetchComplianceSummary,
    isSummaryLoading,
    isSummaryError,
    ocmRepo,
    isParentComponent,
  }) => {
    const searchParamContext = React.useContext(SearchParamContext)
    const theme = useTheme()

    const name = trimComponentName(component.name)

    const [expanded, setExpanded] = React.useState(Boolean(isParentComponent && Boolean(searchParamContext.get('rootExpanded'))))

    let componentComplianceStatus
    if (isSummaryError) {
      componentComplianceStatus = <Chip label='FetchError' variant='outlined' color='warning'/>
    } else if (isSummaryLoading) {
      componentComplianceStatus = <Box
        display='flex'
        justifyContent='center'
      >
        <Skeleton sx={{width: '50%'}}/>
      </Box>
    } else {
      componentComplianceStatus = <ComponentChip componentSummary={complianceSummary}/>
    }

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
                {componentComplianceStatus}
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
            fetchComplianceSummary={fetchComplianceSummary}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  }
)
Component.displayName = 'Component'
Component.propTypes = {
  component: PropTypes.object.isRequired,
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  complianceSummary: PropTypes.object,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isSummaryLoading: PropTypes.bool,
  isSummaryError: PropTypes.bool,
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

const ComponentDetails = React.memo(
  ({
    component,
    isComponentLoading,
    isComponentError,
    ocmRepo,
    fetchComplianceSummary,
  }) => {
    const { enqueueSnackbar } = useSnackbar()

    const [scanConfigs, scanConfigsIsLoading, scanConfigsIsError] = useFetchScanConfigurations()
    const [responsibleData, isResponsibleDataLoading, isResponsibleDataError] = useFetchComponentResponsibles({
      componentName: component.name,
      componentVersion: component.version,
      ocmRepo: ocmRepo,
    })

    const [complianceData, setComplianceData] = React.useState()
    const [isComplianceDataLoading, setIsComplianceDataLoading] = React.useState(true)
    const [isComplianceDataError, setIsComplianceDataError] = React.useState(false)

    const fetchComplianceData = React.useCallback(async () => {
      try {
        const components = [{
          name: component.name,
          version: component.version,
        }]
        const types = Object.values(artefactMetadataTypes).filter((type) => type !== artefactMetadataTypes.RESCORINGS)
        const findings = await artefactsQueryMetadata({
          components,
          types,
        })
        const rescorings = await artefactsQueryMetadata({
          components: components,
          types: [artefactMetadataTypes.RESCORINGS],
          referenced_types: types,
        })

        setComplianceData(mixupFindingsWithRescorings(findings, rescorings))
        setIsComplianceDataLoading(false)
        setIsComplianceDataError(false)
      } catch (error) {
        setIsComplianceDataLoading(false)
        setIsComplianceDataError(true)

        enqueueSnackbar('Unable to fetch compliance data', {
          ...errorSnackbarProps,
          details: error.toString(),
          onRetry: () => fetchComplianceData(),
        })
      }
    }, [component, enqueueSnackbar])

    React.useEffect(() => {
      fetchComplianceData()
    }, [fetchComplianceData])

    if (isComponentError) {
      return <Alert severity='error'>Unable to fetch Component</Alert>
    }

    return <Stack spacing={8}>
      {
        isComponentLoading ? <CircularProgress color='inherit' size={20}/> : <Artefacts
          component={component}
          ocmRepo={ocmRepo}
          compliance={complianceData}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
          scanConfigs={scanConfigs}
          isLoading={scanConfigsIsLoading || isComplianceDataLoading}
          isError={scanConfigsIsError || isComplianceDataError}
        />
      }
      <ComponentReferencedBy component={component} ocmRepo={ocmRepo}/>
      {
        !isResponsibleDataError && <div>
          <ResponsiblesHeading
            responsibleData={responsibleData}
            isResponsibleDataLoading={isResponsibleDataLoading}
            isResponsibleDataError={isResponsibleDataError}
          />
          <Responsibles
            componentResponsibles={responsibleData}
            isResponsibleDataLoading={isResponsibleDataLoading}
          />
        </div>
      }
    </Stack>
  }
)
ComponentDetails.displayName = 'ComponentDetails'
ComponentDetails.propTypes = {
  component: PropTypes.object.isRequired,
  isComponentLoading: PropTypes.bool,
  isComponentError: PropTypes.bool,
  ocmRepo: PropTypes.string,
  fetchComplianceSummary: PropTypes.func.isRequired,
}

const Components = ({
  components,
  isComponentsLoading,
  isComponentsError,
  complianceSummary,
  fetchComplianceSummary,
  isSummaryLoading,
  isSummaryError,
  ocmRepo,
}) => {
  return <Box>
    {
      components.map((component, idx) => {
        const componentSummary = complianceSummary
          ? complianceSummary.find((componentSummary) => {
            if (componentSummary.componentId.name === component.name && componentSummary.componentId.version === component.version) return true
            return false
          })
          : {}

        return <Component
          component={component}
          isComponentLoading={isComponentsLoading}
          isComponentError={isComponentsError}
          key={idx}
          complianceSummary={componentSummary}
          fetchComplianceSummary={fetchComplianceSummary}
          isSummaryLoading={isSummaryLoading}
          isSummaryError={isSummaryError}
          ocmRepo={ocmRepo}
        />
      })
    }
  </Box>
}
Components.displayName = 'Components'
Components.propTypes = {
  components: PropTypes.arrayOf(PropTypes.object),
  isComponentsLoading: PropTypes.bool,
  isComponentsError: PropTypes.bool,
  complianceSummary: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceSummary: PropTypes.func.isRequired,
  isSummaryLoading: PropTypes.bool,
  isSummaryError: PropTypes.bool,
  ocmRepo: PropTypes.string,
}


const ArtefactDetails = ({
  component,
  artefacts,
  ocmRepo,
  title,
  compliance,
  fetchComplianceData,
  fetchComplianceSummary,
  scanConfigs,
  isLoading,
  isError,
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
                ocmRepo={ocmRepo}
                artefact={artefact}
                compliance={compliance}
                fetchComplianceData={fetchComplianceData}
                fetchComplianceSummary={fetchComplianceSummary}
                scanConfigs={scanConfigs}
                isLoading={isLoading}
                isError={isError}
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
  compliance: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
}


const Artefacts = ({
  component,
  ocmRepo,
  compliance,
  fetchComplianceData,
  fetchComplianceSummary,
  scanConfigs,
  isLoading,
  isError,
}) => {
  const resources = component.resources.sort((left, right) => {
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
      kind: 'resource',
    }
  })

  const sources = component.sources.sort((left, right) => {
    const ltype = left.type
    const rtype = right.type

    if (ltype === rtype) {
      return left.name.localeCompare(right.name)
    }
    return ltype.localeCompare(rtype)
  }).map((source) => {
    return {
      ...source,
      kind: 'source',
    }
  })

  return <Stack spacing={8}>
    <ArtefactDetails
      component={component}
      artefacts={resources}
      ocmRepo={ocmRepo}
      title={'Resources'}
      compliance={compliance}
      fetchComplianceData={fetchComplianceData}
      fetchComplianceSummary={fetchComplianceSummary}
      scanConfigs={scanConfigs}
      isLoading={isLoading}
      isError={isError}
    />
    <ArtefactDetails
      component={component}
      artefacts={sources}
      ocmRepo={ocmRepo}
      title={'Sources'}
      compliance={compliance}
      fetchComplianceData={fetchComplianceData}
      fetchComplianceSummary={fetchComplianceSummary}
      scanConfigs={scanConfigs}
      isLoading={isLoading}
      isError={isError}
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
  compliance: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
}


const ArtefactTableRow = ({
  component,
  artefact,
  ocmRepo,
  compliance,
  fetchComplianceData,
  fetchComplianceSummary,
  scanConfigs,
  isLoading,
  isError,
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
        compliance={compliance}
        fetchComplianceData={fetchComplianceData}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfigs={scanConfigs}
        isLoading={isLoading}
        isError={isError}
      />
    </FeatureDependent>
  </TableRow>
}
ArtefactTableRow.displayName = 'ArtefactTableRow'
ArtefactTableRow.propTypes = {
  component: PropTypes.object,
  artefact: PropTypes.object,
  ocmRepo: PropTypes.string,
  compliance: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
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


export { Component, Components }
