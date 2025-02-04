import React from 'react'

import { styled, useTheme } from '@mui/material/styles'
import { Box, CssBaseline, Drawer, Toolbar, Tooltip, Typography, Collapse, Divider, Grid, Link, List, ListItemButton, ListItemText, capitalize } from '@mui/material'
import MuiAppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'

import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'

import { fetchJoke } from './api'
import ServiceExtensionStatus from './util/serviceExtensionStatuses'
import { SettingsMenu } from './util/settingsMenu'
import { FeatureRegistrationContext, SearchParamContext } from './App'
import { features, MONITORING_PATH, SERVICES_PATH } from './consts'
import { registerCallbackHandler } from './feature'
import FeatureDependent from './util/featureDependent'
import { ConnectivityIndicator } from './util/connectivity'
import { camelCaseToDisplayText, componentPathQuery, getMergedSpecialComponents } from './util'
import { useFetchServiceExtensions } from './fetch'

import GardenerLogo from './resources/gardener-logo.svg'
import SAPLogo from './resources/sap-logo.svg'

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
            <FeatureDependent requiredFeatures={[features.CLUSTER_ACCESS]}>
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
