import React from 'react'

import { styled, useTheme } from '@mui/material/styles'
import { Box, capitalize, CssBaseline, Drawer, Toolbar, Tooltip, Typography, Collapse, Divider, Grid, Link, List, ListItemButton, ListItemText, Alert, CircularProgress, Accordion, AccordionDetails, AccordionSummary, Autocomplete, Checkbox, TextField } from '@mui/material'
import MuiAppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'

import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

import { fetchJoke } from '../api'
import ServiceExtensionStatus from '../util/serviceExtensionStatuses'
import { SettingsMenu } from '../util/settingsMenu'
import { FeatureRegistrationContext, SearchParamContext } from '../App'
import { features, MONITORING_PATH, SERVICES_PATH, OCM_REPO_AUTO_OPTION, VERSION_FILTER, tabConfig, PATH_KEY, PATH_POS_KEY } from '../consts'
import { registerCallbackHandler } from '../feature'
import FeatureDependent from '../util/featureDependent'
import { ConnectivityIndicator } from '../util/connectivity'
import { camelCaseToDisplayText, componentPathQuery, getMergedSpecialComponents, urlsFromRepoCtxFeature, useDebounce, addPresentKeyValuePairs, shortenComponentName } from '../util'
import { useFetchServiceExtensions, useFetchComponentDescriptor, useFetchGreatestVersions } from '../fetch'
import NotFoundPage from '../notFound'
import { ComponentTabs } from './tabs'

import GardenerLogo from '../resources/gardener-logo.svg'
import SAPLogo from '../resources/sap-logo.svg'

const Title = () => {
  const [joke, setJoke] = React.useState()
  const [fetchError, setFetchError] = React.useState()

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [jokesApiFeature, setJokesApiFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.JOKES_API,
      callback: ({feature}) => setJokesApiFeature(feature),
    })
  }, [featureRegistrationContext])

  const isAvailable = jokesApiFeature && jokesApiFeature.isAvailable

  React.useEffect(() => {
    let mounted = true
    setFetchError(false)

    const getSomeJoke = async () => {
      try {
        const temp = await fetchJoke()
        if (mounted) {
          setJoke(temp)
        }
      } catch {
        if (mounted) {
          setFetchError(true)
        }
      }
    }

    if (isAvailable) {
      getSomeJoke()
      return () => {
        mounted = false
      }
    }
  }, [isAvailable])

  if (!joke && !fetchError) {
    return (
      <Typography variant='h6' noWrap>
        {
          // eslint-disable-next-line no-undef
          document.title = process.env.REACT_APP_DASHBOARD_TITLE
        }
      </Typography>
    )
  }

  if ((!joke && fetchError) || (joke && joke.error)) {
    return (
      <Tooltip
        title={
          <React.Fragment>
            <Typography color='inherit'>
              {'I have no joke for you today :('}
            </Typography>
          </React.Fragment>
        }
      >
        <Typography variant='h6' noWrap>
          {
            // eslint-disable-next-line no-undef
            document.title = process.env.REACT_APP_DASHBOARD_TITLE
          }
        </Typography>
      </Tooltip>
    )
  }

  return (
    <Tooltip
      title={
        <>
          <Typography color='inherit'>{'Here is a joke for you :)'}</Typography>
          {joke.type === 'single' && (
            <Typography variant='caption' color='inherit'>
              {joke.joke}
            </Typography>
          )}
          {joke.type === 'twopart' && (
            <>
              <Typography variant='caption' color='inherit'>
                {joke.setup}
              </Typography>
              <br />
              <Typography variant='caption' color='inherit'>
                {joke.delivery}
              </Typography>
            </>
          )}
        </>
      }
      style={{ maxWidth: 500 }}
      arrow
    >
      <Typography variant='h6' noWrap>
        {
          // eslint-disable-next-line no-undef
          document.title = process.env.REACT_APP_DASHBOARD_TITLE
        }
      </Typography>
    </Tooltip>
  )
}

const drawerWidth = 240

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
)

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}))

export const PersistentDrawerLeft = ({
  children,
  componentId,
  componentIsAddedByUser,
}) => {
  const theme = useTheme()
  const [open, setOpen] = React.useState(true)

  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position='fixed' open={open}>
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            onClick={handleDrawerOpen}
            edge='start'
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Title />
          <div
            style={{
              paddingRight: '1.5em',
              marginLeft: 'auto',
              justifyContent: 'right',
              display: 'flex',
              alignItems: 'center',
              columnGap: '2em',
            }}
          >
            <ConnectivityIndicator/>
            <FeatureDependent requiredFeatures={[features.SERVICE_EXTENSIONS]}>
              <ServiceExtensionStatus />
            </FeatureDependent>
            <SettingsMenu />
          </div>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant='persistent'
        anchor='left'
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? (
              <ChevronLeftIcon />
            ) : (
              <ChevronRightIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <ComponentNavigation componentId={componentId} componentIsAddedByUser={componentIsAddedByUser}/>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  )
}
PersistentDrawerLeft.displayName = 'PersistentDrawerLeft'
PersistentDrawerLeft.propTypes = {
  children: PropTypes.object.isRequired,
  componentId: PropTypes.any,
  componentIsAddedByUser: PropTypes.any,
}


const ComponentNavigationHeader = () => {
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <Grid item xs={12}>
        <Link href='#'>
          <img src={GardenerLogo} alt='gardener-logo'/>
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

export const ComponentNavigation = React.memo(({ componentId, componentIsAddedByUser }) => {
  return <>
    <ComponentNavigationHeader/>
    <Divider/>
    <div style={{ marginBottom: '3.5rem' }}>
      <LandscapeList componentId={componentId} componentIsAddedByUser={componentIsAddedByUser}/>
      <ServiceList/>
    </div>
    <LogoCorner/>
  </>
})
ComponentNavigation.displayName = 'componentNavigation'
ComponentNavigation.propTypes = {
  componentId: PropTypes.any,
  componentIsAddedByUser: PropTypes.any,
}

const LandscapeListEntry = ({
  typeName,
  components,
  view,
  selectedComponentId,
  selectedComponentIsAddedByUser,
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
              ocmRepo: component.repoContextUrl,
              specialComponentId: component.id,
              specialComponentIsAddedByUser: component.isAddedByUser,
            }
            )}`}
            selected={selectedComponentId === component.id && selectedComponentIsAddedByUser === component.isAddedByUser}
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
  selectedComponentId: PropTypes.any,
  selectedComponentIsAddedByUser: PropTypes.any,
}


const LandscapeList = ({ componentId, componentIsAddedByUser }) => {
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
        selectedComponentId={componentId}
        selectedComponentIsAddedByUser={componentIsAddedByUser}
      />)
    }
  </List>
}
LandscapeList.displayName = 'LandscapeList'
LandscapeList.propTypes = {
  componentId: PropTypes.any,
  componentIsAddedByUser: PropTypes.any,
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
  const specialComponentId = searchParamContext.get('id') ? parseInt(searchParamContext.get('id')) : undefined
  const specialComponentIsAddedByUser = searchParamContext.get('isAddedByUser') ? searchParamContext.get('isAddedByUser') === 'true' : undefined

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
      componentId={specialComponentId}
      componentIsAddedByUser={specialComponentIsAddedByUser}
    >
      <CircularProgress/>
    </PersistentDrawerLeft>
  }

  if (authError) {
    return (
      <PersistentDrawerLeft
        open={true}
        componentId={specialComponentId}
        componentIsAddedByUser={specialComponentIsAddedByUser}
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
      componentId={null}
      componentIsAddedByUser={null}
    >
      <Alert severity='info'>
        Please select a component on the left, or use the detailed component search.
      </Alert>
    </PersistentDrawerLeft>
  }

  if (!view || !version) {
    searchParamContext.set(
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
    componentId={specialComponentId}
    componentIsAddedByUser={specialComponentIsAddedByUser}
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
      componentId={specialComponentId}
      componentIsAddedByUser={specialComponentIsAddedByUser}
    >
      <ComponentView
        componentMeta={addPresentKeyValuePairs(component, {
          versionFilter: versionFilter,
          id: specialComponentId,
          isAddedByUser: specialComponentIsAddedByUser,
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


export const ComponentView = ({
  componentMeta,
  ocmRepo,
}) => {
  const [componentDescriptor, state] = useFetchComponentDescriptor({
    componentName: componentMeta.name,
    componentVersion: componentMeta.version,
    ocmRepo: ocmRepo,
    versionFilter: componentMeta.versionFilter,
  })

  return <Box>
    <NavigationHeader
      component={componentDescriptor ? componentDescriptor.component : componentMeta}
      isLoading={state.isLoading}
    />
    <div style={{ padding: '1em' }} />
    {
      state.error ? <ComponentDescriptorError
        component={componentMeta}
        errorMsg={state.error}
      /> : <ComponentTabs
        componentDescriptor={componentDescriptor}
        isLoading={state.isLoading}
        ocmRepo={ocmRepo}
        versionFilter={componentMeta.versionFilter}
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

export default ComponentView
