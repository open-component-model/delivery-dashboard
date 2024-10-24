import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionSummary,
  Alert,
  Box,
  Button,
  capitalize,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LaunchIcon from '@mui/icons-material/Launch'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { FeatureRegistrationContext, SearchParamContext } from '../../App'
import { Component, Components } from './Component'
import {
  DEPENDENT_COMPONENT,
  features,
  fetchBomPopulate,
} from '../../consts'
import {
  downloadObject,
  matchObjectWithSearchQuery,
  normaliseObject,
  shortenComponentName,
  trimComponentName,
} from '../../util'
import ExtraWideTooltip from '../util/ExtraWideTooltip'
import FeatureDependent from '../util/FeatureDependent'
import { components } from '../../api'
import {
  useFetchBom,
  useFetchSpecialComponentCurrentDependencies,
} from '../../api/useFetch'
import { SprintInfo } from '../util/Sprint'
import ErrorBoundary from '../util/ErrorBoundary'
import { VersionOverview, evaluateVersionMatch } from '../util/VersionOverview'
import { registerCallbackHandler } from '../../feature'


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


export const LoadingDependencies = () => {
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


export const FetchDependenciesTab = React.memo(({
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
