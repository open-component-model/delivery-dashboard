import React from 'react'

import { styled, useTheme } from '@mui/material/styles'
import { Box, CssBaseline, Drawer, Toolbar, Tooltip, Typography } from '@mui/material'
import MuiAppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import PropTypes from 'prop-types'

import { fetchJoke } from './api'
import ServiceExtensionStatus from './util/serviceExtensionStatuses'
import { SettingsMenu } from './util/settingsMenu'
import { FeatureRegistrationContext } from './App'
import { features } from './consts'
import { registerCallbackHandler } from './feature'
import FeatureDependent from './util/featureDependent'
import { ConnectivityIndicator } from './util/connectivity'
import { ComponentNavigation } from './component/common'


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
