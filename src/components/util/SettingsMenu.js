import React from 'react'
import PropTypes from 'prop-types'

import { Logout, Login, Settings } from '@mui/icons-material'
import MenuBookIcon from '@mui/icons-material/MenuBook'

import {
  alpha,
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Skeleton,
  Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

import { useTheme } from '@emotion/react'
import { useSnackbar } from 'notistack'

import { features, TOKEN_KEY, errorSnackbarProps } from '../../consts.js'

import { auth } from '../../api.js'
import DarkModeSwitch from './DarkModeSwitch.js'
import FeatureDependent from './FeatureDependent.js'
import { FeatureRegistrationContext } from '../../App.js'
import { registerCallbackHandler } from '../../feature.js'


const SettingsMenu = () => {
  const theme = useTheme()
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

  const [dashboardCreateIssueUrlFeature, setDashboardCreateIssueUrlFeature] = React.useState()
  const [anchorElement, setAnchorElement] = React.useState(null)
  const [token, setToken] = React.useState(JSON.parse(localStorage.getItem(TOKEN_KEY)))

  addEventListener('localStorage', () => setToken(JSON.parse(localStorage.getItem(TOKEN_KEY))))

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DASHBOARD_CREATE_ISSUE_URL,
      callback: ({feature}) => setDashboardCreateIssueUrlFeature(feature),
    })
  }, [featureRegistrationContext])

  const open = Boolean(anchorElement)
  const id = open ? 'settings-popover' : undefined

  const handleClick = (event) => {
    setAnchorElement(event.currentTarget.parentNode)
  }

  const handleClose = () => {
    setAnchorElement(null)
  }

  return <>
    <> { /* wrapper required as stable popover anchor element */ }
      {
        token ? <IconButton onClick={handleClick}>
          <Settings sx={{color: 'white'}}/>
        </IconButton> : <Button
          onClick={handleClick}
          endIcon={<Login/>}
          sx={{
            paddingX: '1rem',
            paddingY: '0.2rem',
            color: 'white',
            bgcolor: 'secondary.main',
            '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.7) },
          }}
        >
          Login
        </Button>
      }
    </>
    <Popover
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={id}
      open={open}
      anchorEl={anchorElement}
      onClose={handleClose}
      sx={{ marginTop: '0.5rem' }}
    >
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <ListItem
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DarkModeSwitch />
          </ListItem>
          <LoginPanel token={token}/>
          <ListItemButton
            component='a'
            href='https://ocm.software'
            target='_blank'
            rel='noopener'
          >
            <MenuBookIcon/>
            <div style={{ padding: '0.3em' }} />
            <ListItemText primary='Open Component Model' />
          </ListItemButton>
          <FeatureDependent requiredFeatures={[features.DASHBOARD_CREATE_ISSUE_URL]}>
            <ListItemButton
              component='a'
              href={dashboardCreateIssueUrlFeature?.url}
              target='_blank'
              rel='noopener'
            >
              <AutoAwesomeIcon/>
              <div style={{ padding: '0.3em' }} />
              <ListItemText primary='Feature Request' />
            </ListItemButton>
          </FeatureDependent>
        </List>
      </Box>
    </Popover>
  </>
}


const LoginPanel = ({
  token,
}) => {
  const { enqueueSnackbar } = useSnackbar()

  const login = async (authConfig) => {
    const loc = document.location
    const currentUrl = new URL(
      `${loc.protocol}//${loc.host}${loc.pathname}${loc.search}`
    ) // XXX hack
    currentUrl.searchParams.set('client_id', authConfig.client_id)

    const githubAuthUrl = new URL(authConfig.oauth_url)
    githubAuthUrl.search = new URLSearchParams({
      client_id: authConfig.client_id,
      scope: authConfig.scope,
      redirect_uri: currentUrl.href,
    })

    // forward to github-oauth (user will come back soon enough)
    window.location.replace(githubAuthUrl.href)
  }

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY)
    dispatchEvent(new Event('localStorage'))
    try {
      await auth.logout()
    } catch (e) {
      enqueueSnackbar(
        'Logout failed',
        {
          ...errorSnackbarProps,
          details: e.toString(),
          onRetry: () => logout(),
        }
      )
    }
  }

  return <FeatureDependent requiredFeatures={[features.AUTHENTICATION]}>
    <LoginState
      token={token}
      login={login}
      logout={logout}
    />
  </FeatureDependent>
}
LoginPanel.displayName = 'LoginPanel'
LoginPanel.propTypes = {
  token: PropTypes.object,
}

const LoginState = ({
  token,
  login,
  logout,
}) => {
  const [authConfigs, setAuthConfigs] = React.useState()
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    const retrieveAuthCfgs = async () => {
      try {
        const authCfgs = await auth.authConfigs()
        setAuthConfigs(authCfgs)
      } catch (e) {
        enqueueSnackbar(
          'Unable to fetch auth configs',
          {
            ...errorSnackbarProps,
            details: e.toString(),
            onRetry: () => retrieveAuthCfgs(),
          }
        )
      }
    }
    retrieveAuthCfgs()
  }, [enqueueSnackbar])

  if (token) return <>
    <ListItem sx={{ display: 'flex', justifyContent: 'center' }}>
      <Tooltip title={`logged in as ${token.sub}`}>
        <Avatar/>
      </Tooltip>
    </ListItem>
    <ListItem disablePadding>
      <ListItemButton onClick={() => logout()}>
        <Logout color='error'/>
        <div style={{ padding: '0.3em' }}/>
        <ListItemText primary='Logout'/>
      </ListItemButton>
    </ListItem>
  </>

  if (authConfigs) return authConfigs.map((el) => <ListItem
    key={el.client_id}
    disablePadding
  >
    <ListItemButton onClick={() => login(el)}>
      <Login color='success'/>
      <div style={{ padding: '0.3em' }}/>
      <ListItemText primary={`Login ${el.name}`}/>
    </ListItemButton>
  </ListItem>)

  return <ListItem disablePadding>
    <ListItemButton>
      <Skeleton sx={{ width: '100%' }}/>
    </ListItemButton>
  </ListItem>
}
LoginState.displayName = 'LoginState'
LoginState.propTypes = {
  token: PropTypes.object,
  login: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
}


export { LoginPanel, SettingsMenu }
