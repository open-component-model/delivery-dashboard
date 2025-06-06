import React from 'react'

import { useTheme } from '@mui/material/styles'
import { Box, capitalize, Tooltip, Typography, Collapse, Divider, Grid, Link, List, ListItemButton, ListItemText, Alert, CircularProgress, Accordion, AccordionDetails, AccordionSummary, Autocomplete, Checkbox, TextField } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'

import PropTypes from 'prop-types'
import { useNavigate } from 'react-router'

import { FeatureRegistrationContext, SearchParamContext } from '../App'
import {
  ARTEFACT_KIND,
  features,
  MONITORING_PATH,
  OCM_REPO_AUTO_OPTION,
  PATH_KEY,
  PATH_POS_KEY,
  SERVICES_PATH,
  tabConfig,
  VERSION_FILTER,
} from '../consts'
import { registerCallbackHandler } from '../feature'
import {
  addPresentKeyValuePairs,
  camelCaseToDisplayText,
  componentPathQuery,
  getMergedSpecialComponents,
  normaliseExtraIdentity,
  shortenComponentName,
  urlsFromRepoCtxFeature,
  useDebounce,
} from '../util'
import { useFetchServiceExtensions, useFetchComponentDescriptor, useFetchGreatestVersions } from '../fetch'
import NotFoundPage from '../notFound'
import { ComponentTabs } from './tabs'
import { PersistentDrawerLeft } from '../layout'
import { OcmNode } from '../ocm/iter'
import { RescoringModal } from '../rescoring'

import ODGLogo from '../resources/odg-logo.svg'
import SAPLogo from '../resources/sap-logo.svg'


const ComponentNavigationHeader = () => {
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <Grid item xs={12}>
        <Link href='#'>
          <img src={ODGLogo} alt='odg-logo'/>
        </Link>
      </Grid>
      <Grid item xs={12}>
        <Typography variant='h5' gutterBottom>
          {
            // eslint-disable-next-line no-undef
            document.title = process.env.REACT_APP_DASHBOARD_TITLE
          }
        </Typography>
      </Grid>
      <Typography
        variant='caption'
        marginRight='0.4em'
        display='flex'
        alignSelf='flex-end'
        color='grey'
        gutterBottom
      >
        Build:{' '}
        {
          // eslint-disable-next-line no-undef
          process.env.REACT_APP_BUILD_VERSION
        }
      </Typography>
    </div>
  </div>
}

const LogoCorner = () => {
  return <Box
    sx={{
      position: 'fixed',
      paddingLeft: '1rem',
      bottom: 0,
    }}
  >
    <img src={SAPLogo} alt='sap-logo'/>
  </Box>
}

export const ComponentNavigation = React.memo(({
  specialComponentId,
  browserLocalOnly,
}) => {
  return <>
    <ComponentNavigationHeader/>
    <Divider/>
    <div style={{ marginBottom: '3.5rem' }}>
      <LandscapeList specialComponentId={specialComponentId} browserLocalOnly={browserLocalOnly}/>
      <ServiceList/>
    </div>
    <LogoCorner/>
  </>
})
ComponentNavigation.displayName = 'componentNavigation'
ComponentNavigation.propTypes = {
  specialComponentId: PropTypes.string,
  browserLocalOnly: PropTypes.bool,
}

const LandscapeListEntry = ({
  typeName,
  components,
  view,
  selectedSpecialComponentId,
  selectedBrowserLocalOnly,
}) => {
  const [open, setOpen] = React.useState(true)

  const handleClick = () => {
    setOpen(!open)
  }

  return <div>
    <ListItemButton onClick={handleClick}>
      <ListItemText primary={capitalize(typeName)}/>
      {
        open ? <ExpandLess/> : <ExpandMore/>
      }
    </ListItemButton>
    <Collapse in={open} timeout='auto' unmountOnExit>
      <List disablePadding>
        {
          components.map(component => <ListItemButton
            key={JSON.stringify(component)}
            sx={{
              paddingLeft: 4,
            }}
            // use href rather than router to enable "open in new tab"
            href={`#${componentPathQuery({
              name: component.name,
              version: component.version,
              versionFilter: component.versionFilter,
              view: view,
              ocmRepo: component.ocmRepo,
              specialComponentId: component.id,
              specialComponentBrowserLocalOnly: component.browserLocalOnly,
            }
            )}`}
            selected={selectedSpecialComponentId === component.id && selectedBrowserLocalOnly === component.browserLocalOnly}
          >
            <ListItemText>
              {
                capitalize(component.displayName)
              }
            </ListItemText>
          </ListItemButton>)
        }
      </List>
    </Collapse>
  </div>
}
LandscapeListEntry.displayName = 'LandscapeListEntry'
LandscapeListEntry.propTypes = {
  typeName: PropTypes.string.isRequired,
  components: PropTypes.arrayOf(PropTypes.object).isRequired,
  view: PropTypes.string,
  selectedSpecialComponentId: PropTypes.string,
  selectedBrowserLocalOnly: PropTypes.bool,
}


const LandscapeList = ({
  specialComponentId,
  browserLocalOnly,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()

  const searchParamContext = React.useContext(SearchParamContext)

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  const getSpecialComponents = () => {
    return specialComponentsFeature?.isAvailable
      ? getMergedSpecialComponents(specialComponentsFeature)
      : []
  }

  const specialComponentTypes = [... new Set(getSpecialComponents().map((c) => c.type))]

  return <List component='nav'>
    {
      specialComponentTypes.map((type) => <LandscapeListEntry
        key={type}
        typeName={type}
        components={getSpecialComponents().filter((component) => component.type === type)}
        view={searchParamContext.get('view')}
        selectedSpecialComponentId={specialComponentId}
        selectedBrowserLocalOnly={browserLocalOnly}
      />)
    }
  </List>
}
LandscapeList.displayName = 'LandscapeList'
LandscapeList.propTypes = {
  specialComponentId: PropTypes.string,
  browserLocalOnly: PropTypes.bool,
}


const ServiceListEntry = ({
  service,
}) => {
  const query = new URLSearchParams({
    service: service,
  })
  return <ListItemButton
    // use href rather than router to enable "open in new tab"
    href={`#${MONITORING_PATH}?${query.toString()}`}
    sx={{
      paddingLeft: 4
    }}
  >
    <ListItemText>
      {
        camelCaseToDisplayText(service)
      }
    </ListItemText>
  </ListItemButton>
}
ServiceListEntry.displayName = 'ServiceListEntry'
ServiceListEntry.propTypes = {
  service: PropTypes.string.isRequired,
}


const ServiceList = () => {
  const [services, state] = useFetchServiceExtensions()
  const [open, setOpen] = React.useState(true)
  const navigate = useNavigate()

  const handleToggleClick = (event) => {
    event.stopPropagation()
    setOpen(!open)
  }

  const handleToggleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation()
      setOpen(!open)
    }
  }

  const handleNavigationClick = () => {
    navigate(SERVICES_PATH)
  }

  if (state.isLoading || state.error || !services) {
    return null
  }

  return <List component='nav'>
    <ListItemButton onClick={handleNavigationClick}>
      <ListItemText primary='Extensions'/>
      <div
        role='button'
        tabIndex={0}
        onClick={handleToggleClick}
        onKeyDown={handleToggleKeyDown}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {open ? <ExpandLess/> : <ExpandMore/>}
      </div>
    </ListItemButton>
    <Collapse in={open} timeout='auto' unmountOnExit>
      <List disablePadding>
        {
          services.map((service) => <ServiceListEntry key={service} service={service}/>)
        }
      </List>
    </Collapse>
  </List>
}
ServiceList.displayName = 'ServiceList'
ServiceList.propTypes = {}

export const ComponentPage = () => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [repoCtxFeature, setRepoCtxFeature] = React.useState()

  const searchParamContext = React.useContext(SearchParamContext)

  const componentName = searchParamContext.get('name')
  const version = searchParamContext.get('version')
  const versionFilter = searchParamContext.get('versionFilter')
  const view = searchParamContext.get('view')

  const ocmRepo = searchParamContext.get('ocmRepo')
  const specialComponentId = searchParamContext.get('id') ?? undefined
  const specialComponentBrowserLocalOnly = searchParamContext.get('browserLocalOnly') ? searchParamContext.get('browserLocalOnly') === 'true' : undefined

  const authError = searchParamContext.get('error')
  const authErrorDescription = searchParamContext.get('error_description')

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.REPO_CONTEXTS,
      callback: ({feature}) => setRepoCtxFeature(feature),
    })
  }, [featureRegistrationContext])

  // If the selected component is in the current path, adjust the path up to this component, otherwise reset
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const currentPathPos = path?.findIndex((pathElem) => pathElem.name === componentName && pathElem.version === version)
  if (currentPathPos >= 0) {
    localStorage.setItem(PATH_POS_KEY, currentPathPos)
  } else {
    localStorage.removeItem(PATH_KEY)
    localStorage.removeItem(PATH_POS_KEY)
  }

  if (!repoCtxFeature || !repoCtxFeature.isAvailable) {
    return <PersistentDrawerLeft
      open={true}
      specialComponentId={specialComponentId}
      browserLocalOnly={specialComponentBrowserLocalOnly}
    >
      <CircularProgress/>
    </PersistentDrawerLeft>
  }

  if (authError) {
    return (
      <PersistentDrawerLeft
        open={true}
        specialComponentId={specialComponentId}
        browserLocalOnly={specialComponentBrowserLocalOnly}
      >
        <Alert severity='error'>
          Error <b>{authError}</b>: {authErrorDescription}
        </Alert>
      </PersistentDrawerLeft>
    )
  }

  if (!componentName) {
    return <PersistentDrawerLeft
      open={true}
      specialComponentId={null}
      browserLocalOnly={null}
    >
      <Alert severity='info'>
        Please select a component on the left, or use the detailed component search.
      </Alert>
    </PersistentDrawerLeft>
  }

  if (!view || !version) {
    searchParamContext.update(
      {
        name: componentName,
        version: version || searchParamContext.getDefault('version'),
        view: view || searchParamContext.getDefault('view'),
      },
    )
  }

  const knownTabIds = Object.values(tabConfig).map(tab => tab.id)

  if (!knownTabIds.includes(view)) return <PersistentDrawerLeft
    open={true}
    specialComponentId={specialComponentId}
    browserLocalOnly={specialComponentBrowserLocalOnly}
  >
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Typography variant='h4'>
        {`'${view}'`} is not a valid view
      </Typography>
    </div>
  </PersistentDrawerLeft>

  const component = {
    name: componentName,
    displayName: shortenComponentName(componentName),
    version: version || searchParamContext.getDefault('version'),
  }
  return (
    <PersistentDrawerLeft
      open={true}
      specialComponentId={specialComponentId}
      browserLocalOnly={specialComponentBrowserLocalOnly}
    >
      <ComponentView
        componentMeta={addPresentKeyValuePairs(component, {
          versionFilter: versionFilter,
          id: specialComponentId,
          browserLocalOnly: specialComponentBrowserLocalOnly,
        })}
        ocmRepo={ocmRepo}
      />
    </PersistentDrawerLeft>
  )
}
ComponentPage.displayName = 'ComponentPage'
ComponentPage.propTypes = {
  defaultView: PropTypes.string,
  defaultVersion: PropTypes.string,
}


const ComponentDescriptorError = ({
  component,
  errorMsg,
}) => {
  return  <Box>
    <Alert severity='error'>
      Component descriptor <b>{component.name}:{component.version}</b> could not be fetched.
    </Alert>
    <NotFoundPage reason={errorMsg}/>
  </Box>
}
ComponentDescriptorError.displayName = 'ComponentDescriptorError'
ComponentDescriptorError.propTypes = {
  component: PropTypes.object.isRequired,
  errorMsg: PropTypes.string,
}


const ComponentView = ({
  componentMeta,
  ocmRepo,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const searchParamContext = React.useContext(SearchParamContext)
  const [findingCfgsFeature, setFindingCfgsFeature] = React.useState()
  const [mountRescoring, setMountRescoring] = React.useState(Boolean(searchParamContext.get('rescoreArtefacts')))

  const [componentDescriptor, state] = useFetchComponentDescriptor({
    componentName: componentMeta.name,
    componentVersion: componentMeta.version,
    ocmRepo: ocmRepo,
    versionFilter: componentMeta.versionFilter,
  })

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.FINDING_CONFIGURATIONS,
      callback: ({feature}) => setFindingCfgsFeature(feature),
    })
  }, [featureRegistrationContext])

  const findingCfgs = findingCfgsFeature?.isAvailable ? findingCfgsFeature.finding_cfgs : []

  const artefactNodes = React.useMemo(() => {
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

    const component = componentDescriptor?.component

    const resourceNodes = component ? component.resources.filter((resource) => {
      return normalisedArtefactIds.includes(artefactId(resource, ARTEFACT_KIND.RESOURCE)) // resource selected via URL params
    }).map((resource) => new OcmNode([component], resource, ARTEFACT_KIND.RESOURCE)) : []

    const sourceNodes = component ? component.sources.filter((source) => {
      return normalisedArtefactIds.includes(artefactId(source, ARTEFACT_KIND.SOURCE)) // source selected via URL params
    }).map((source) => new OcmNode([component], source, ARTEFACT_KIND.SOURCE)) : []

    const runtimeNodes = artefactIds.filter((artefactId) => {
      return artefactId.split('|')[3] === ARTEFACT_KIND.RUNTIME
    }).map((artefactId) => {
      const idParts = artefactId.split('|')

      return new OcmNode([component ?? componentMeta], {
        name: idParts[0],
        version: idParts[1],
        type: idParts[2],
        extraIdentity: idParts.length > 4 ? idParts[4] : {},
      }, ARTEFACT_KIND.RUNTIME)
    })

    return resourceNodes.concat(sourceNodes).concat(runtimeNodes)
  }, [componentDescriptor])

  const handleRescoringClose = React.useCallback(() => {
    setMountRescoring(false)
    searchParamContext.delete('rescoreArtefacts')
    searchParamContext.delete('findingType')
  }, [setMountRescoring])

  return <Box>
    <NavigationHeader
      component={componentDescriptor ? componentDescriptor.component : componentMeta}
      isLoading={state.isLoading}
    />
    <div style={{ padding: '1em' }} />
    {
      (
        mountRescoring
        && artefactNodes.length > 0
        && findingCfgs.length > 0
      ) && <RescoringModal
        ocmNodes={artefactNodes}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        initialFindingType={searchParamContext.get('findingType')}
        findingCfgs={findingCfgs}
      />
    }
    {
      state.error ? <ComponentDescriptorError
        component={componentMeta}
        errorMsg={state.error}
      /> : <ComponentTabs
        componentDescriptor={componentDescriptor}
        isLoading={state.isLoading}
        ocmRepo={ocmRepo}
        versionFilter={componentMeta.versionFilter}
        specialComponentId={componentMeta.id}
        browserLocalOnly={componentMeta.browserLocalOnly}
      />
    }
  </Box>
}
ComponentView.displayName = 'ComponentView'
ComponentView.propTypes = {
  componentMeta: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


const ComponentOcmRepoSelector = ({
  ocmRepo,
  setOcmRepo,
  color,
  focused,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [repoCtxFeature, setRepoCtxFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.REPO_CONTEXTS,
      callback: ({feature}) => setRepoCtxFeature(feature),
    })
  }, [featureRegistrationContext])

  return <Autocomplete
    freeSolo
    value={ocmRepo}
    options={urlsFromRepoCtxFeature(repoCtxFeature)}
    fullWidth
    disableClearable
    onChange={(event, value) => setOcmRepo(value)}
    renderInput={(params) => {
      return (
        <TextField
          onChange={(event) => setOcmRepo(event.target.value)}
          variant='standard'
          {...params}
          label='OCM Repository'
          color={color}
          focused={focused}
          InputProps={{
            ...params.InputProps,
          }}
        />
      )
    }}
  />
}
ComponentOcmRepoSelector.displayName = 'ComponentOcmRepoSelector'
ComponentOcmRepoSelector.propTypes = {
  ocmRepo: PropTypes.string,
  setOcmRepo: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  focused: PropTypes.bool.isRequired,
}

const ComponentVersionSelector = ({
  name,
  ocmRepo,
  componentVersion,
  setComponentVersion,
  versionFilter,
  color,
  focused,
}) => {
  // a mechanism is required to prevent greatest version fetching
  // as it already protects itself against null values for name or repo ctx, we initially
  // fetch version suggestions with null (thus prevent actual call) and set name onClick
  const [nameOrNull, setNameOrNull] = React.useState(null)

  const [
    versions,
    isLoading,
    // eslint-disable-next-line no-unused-vars
    isError,
  ] = useFetchGreatestVersions({
    componentName: nameOrNull,
    ocmRepoUrl: ocmRepo,
    versionFilter: versionFilter,
  })

  return <Autocomplete
    freeSolo
    options={
      isLoading || !versions
        ? []
        : versions.sort().reverse()
    }
    disableClearable
    onChange={(event, value) => setComponentVersion(value)}
    loading={isLoading}
    style={{flex: 1}}
    value={componentVersion}
    renderInput={(params) => <TextField
      onChange={(event) => setComponentVersion(event.target.value)}
      variant='standard'
      {...params}
      label='Component Version'
      focused={focused}
      color={color}
      InputProps={{
        ...params.InputProps,
        onClick: () => setNameOrNull(name),
        endAdornment: <>
          {isLoading && <CircularProgress color='inherit' size={20}/>}
          {params.InputProps.endAdornment}
        </>,
      }}
    />
    }
  />
}
ComponentVersionSelector.displayName = 'ComponentVersionSelector'
ComponentVersionSelector.propTypes = {
  name: PropTypes.string,
  ocmRepo: PropTypes.string,
  componentVersion: PropTypes.string,
  setComponentVersion: PropTypes.func.isRequired,
  versionFilter: PropTypes.string,
  color: PropTypes.string.isRequired,
  focused: PropTypes.bool.isRequired,
}

const NavigationHeader = ({
  component,
  isLoading,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const theme = useTheme()

  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : [{name: component.name, version: component.version}]
  const pathPosItem = localStorage.getItem(PATH_POS_KEY)
  const pathPos = pathPosItem ? parseInt(pathPosItem) : 0

  return <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <IconButton
        title='Drill up'
        sx={{
          color: theme.palette.text.primary,
        }}
        onClick={(event) => {
          event.stopPropagation()
          const targetComponent = path[pathPos - 1]

          localStorage.setItem(PATH_POS_KEY, pathPos - 1)
          searchParamContext.update({
            'name': targetComponent.name,
            'version': targetComponent.version,
          })
        }}
        disabled={pathPos === 0}
      >
        <ArrowBackIosNewIcon sx={{fontSize: '0.75em'}} />
      </IconButton>
      <IconButton
        title='Drill down'
        sx={{
          color: theme.palette.text.primary,
        }}
        onClick={(event) => {
          event.stopPropagation()
          const targetComponent = path[pathPos + 1]

          localStorage.setItem(PATH_POS_KEY, pathPos + 1)
          searchParamContext.update({
            'name': targetComponent.name,
            'version': targetComponent.version,
          })
        }}
        disabled={pathPos === path.length - 1}
      >
        <ArrowForwardIosIcon sx={{fontSize: '0.75em'}} />
      </IconButton>
      {
        path.map((pathElem, idx) => <div key={idx} style={{display: 'flex', alignItems: 'center'}}>
          <Link
            key={idx}
            sx={{
              color: parseInt(pathPos) === idx ? theme.palette.secondary.main : 'grey',
              textAlign: 'center',
            }}
            // use href rather than router to enable "open in new tab"
            href={`#${componentPathQuery({
              name: pathElem.name,
              version: pathElem.version,
              ocmRepo: searchParamContext.get('ocmRepo'),
            })}`}
            // don't expand accordion
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {`${shortenComponentName(pathElem.name)}:${pathElem.version}`}
          </Link>
          {
            idx < path?.length - 1 && <ArrowForwardIosIcon fontSize={'0.5em'} sx={{color: 'grey', marginX: '0.25em'}} />
          }
        </div>)
      }
    </AccordionSummary>
    <AccordionDetails>
      <ComponentHeader
        name={component.name}
        version={component.version}
        ocmRepository={searchParamContext.get('ocmRepo') ? searchParamContext.get('ocmRepo') : OCM_REPO_AUTO_OPTION}
        isLoading={isLoading}
      />
    </AccordionDetails>
  </Accordion>
}
NavigationHeader.displayName = 'NavigationHeader'
NavigationHeader.propTypes = {
  component: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
}

const ComponentHeader = ({
  name,
  version,
  ocmRepository,
  isLoading,
}) => {
  const navigate = useNavigate()

  const searchParamContext = React.useContext(SearchParamContext)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

  const [componentName, setComponentName] = React.useState(name)
  const [componentVersion, setComponentVersion] = React.useState(version)
  const [versionFilter, setVersionFilter] = React.useState(VERSION_FILTER.RELEASES_ONLY)
  const [ocmRepo, setOcmRepo] = React.useState(ocmRepository)
  const [searchError, setSearchError] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.VERSION_FILTER,
      callback: ({feature}) => {
        if (feature?.isAvailable) setVersionFilter(feature.version_filter)
      },
    })
  }, [featureRegistrationContext])

  const selectionElementNames = {
    VERSION: 'version',
    NAME: 'name',
    OCM_REPO: 'ocmRepo',
  }
  Object.freeze(selectionElementNames)

  const [erroneousElementName, setErroneousElementName] = React.useState(null)

  const debouncedCName = useDebounce(componentName, 500)
  const debouncedOcmRepo = useDebounce(ocmRepo, 500)

  const theme = useTheme()

  const colorForElementName = ({ name }) => {
    if (name === erroneousElementName) return 'error'
    return 'primary'
  }

  const focusForElementName = ({ name }) => {
    if (name === erroneousElementName) return true
    return false
  }

  React.useEffect(() => {
    setComponentName(name)
  }, [name])
  React.useEffect(() => {
    setComponentVersion(version)
  }, [version])
  React.useEffect(() => {
    setOcmRepo(ocmRepository)
  }, [ocmRepository])

  return <Grid container display='flex' alignItems='center' spacing={2}>
    {searchError && (
      <Grid item xs={12}>
        <Alert severity='error'>{searchError}</Alert>
      </Grid>
    )}
    <Grid item xs={9} md={12} lg={8} xl={4}>
      <TextField
        value={componentName}
        onChange={(event) => {
          setComponentName(event.target.value)
        }}
        label='Component Name'
        variant='standard'
        fullWidth
        color={colorForElementName({name: selectionElementNames.NAME})}
        focused={focusForElementName({name: selectionElementNames.NAME})}
        disabled={isLoading}
      />
    </Grid>
    <Grid item xs={9} md={12} lg={8} xl={2}>
      <div style={{display: 'flex', alignItems: 'end'}}>
        {
          isLoading ? <TextField
            value={componentVersion}
            label='Component Version'
            variant='standard'
            fullWidth
            disabled
          /> : <ComponentVersionSelector
            name={debouncedCName}
            ocmRepo={debouncedOcmRepo === OCM_REPO_AUTO_OPTION ? null : debouncedOcmRepo}
            componentVersion={componentVersion}
            setComponentVersion={setComponentVersion}
            versionFilter={versionFilter}
            color={colorForElementName({name: selectionElementNames.VERSION})}
            focused={focusForElementName({name: selectionElementNames.VERSION})}
          />
        }
        <Tooltip title='Show Prerelease Versions'>
          <Checkbox
            size='small'
            color='default'
            disabled={isLoading}
            checked={versionFilter === VERSION_FILTER.ALL}
            onChange={(e) => setVersionFilter(e.target.checked ? VERSION_FILTER.ALL : VERSION_FILTER.RELEASES_ONLY)}
          />
        </Tooltip>
      </div>
    </Grid>
    <Grid item xs={8} md={8} lg={10} xl={5}>
      {
        isLoading ? <TextField
          value={ocmRepo}
          label='OCM Repository'
          variant='standard'
          fullWidth
          disabled
        /> : <ComponentOcmRepoSelector
          ocmRepo={ocmRepo}
          setOcmRepo={setOcmRepo}
          color={colorForElementName({name: selectionElementNames.OCM_REPO})}
          focused={focusForElementName({name: selectionElementNames.OCM_REPO})}
        />
      }
    </Grid>
    <Grid item xs={1} md={1} lg={1} xl={1} display='flex' justifyContent='center'>
      <IconButton
        title='Search component'
        sx={{
          backgroundColor: theme.palette.grey,
          border: `1px solid ${theme.palette.text.primary}`,
          color: theme.palette.text.primary,
        }}
        onClick={() => {
          setErroneousElementName(null)
          if (!componentVersion || !componentName) {
            if (!componentVersion) setErroneousElementName(selectionElementNames.VERSION)
            if (!componentName) setErroneousElementName(selectionElementNames.NAME)
          } else {
            setSearchError('')
            navigate(componentPathQuery({
              name: componentName,
              version: componentVersion,
              view: searchParamContext.get('view'),
              ocmRepo: ocmRepo === OCM_REPO_AUTO_OPTION ? null : ocmRepo,
            }))
          }
        }}
        disabled={isLoading}
      >
        <RefreshIcon />
      </IconButton>
    </Grid>
  </Grid>
}
ComponentHeader.displayName = 'ComponentHeader'
ComponentHeader.propTypes = {
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  ocmRepository: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
}
