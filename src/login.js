import React from 'react'

import {
  Alert,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import { auth } from './api'
import { useFetchProfiles } from './fetch'
import { DASHBOARD_TITLE, errorSnackbarProps, PROFILE_KEY, TOKEN_KEY } from './consts'
import { ConfigContext } from './App'
import ProfileSelector from './util/profileSelector'

import GardenerLogo from './resources/gardener-logo.svg'


const loginTabs = {
  OAUTH: 'oauth',
  TOKEN: 'token'
}
Object.freeze(loginTabs)


export const LoginPage = () => {
  const theme = useTheme()

  document.title = `Login | ${DASHBOARD_TITLE}`

  return <div style={{
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  }}>
    <LoginPanel/>
    <div style={{
      width: '100vw',
      height: '50vh',
      background: theme.palette.background.lightgrey,
    }}/>
    <div style={{
      width: '100vw',
      height: '50vh',
      background: theme.palette.background.main,
    }}/>
  </div>
}
LoginPage.displayName = 'LoginPage'


const LoginPanel = () => {
  const theme = useTheme()
  const context = React.useContext(ConfigContext)

  return <div style={{
    width: '100vw',
    height: '100vh',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <div style={{
      width: '29rem',
      height: '48rem',
    }}>
      <div style={{
        width: '100%',
        height: '51%',
        borderTopLeftRadius: '0.5rem',
        borderTopRightRadius: '0.5rem',
        background: theme.palette.background.grey,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <LoginPanelTop/>
      </div>
      <Paper elevation={3} sx={{
        width: '100%',
        height: '49%',
        borderTopLeftRadius: '0',
        borderTopRightRadius: '0',
        borderBottomLeftRadius: '0.5rem',
        borderBottomRightRadius: '0.5rem',
        background: context.prefersDarkMode ? theme.palette.background.darkgrey : theme.palette.background.white,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
      }}>
        <LoginPanelBottom/>
      </Paper>
    </div>
  </div>
}
LoginPanel.displayName = 'LoginPanel'


const LoginPanelTop = () => {
  const theme = useTheme()

  return <div style={{
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <img
      height='62%'
      src={GardenerLogo}
      alt='gardener-logo'
    />
    <Typography marginTop='1rem' variant='h5' color={theme.palette.secondary.main}>
      {
        DASHBOARD_TITLE
      }
    </Typography>
  </div>
}
LoginPanelTop.displayName = 'LoginPanelTop'


const LoginPanelBottom = () => {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()

  const [tab, setTab] = React.useState(loginTabs.OAUTH)
  const [selectedAuthConfig, setSelectedAuthConfig] = React.useState()
  const [authConfigs, setAuthConfigs] = React.useState()

  const [token, setToken] = React.useState('')
  const [showToken, setShowToken] = React.useState(false)

  const [selectedProfile, setSelectedProfile] = React.useState(localStorage.getItem(PROFILE_KEY))
  const [profiles, profilesState] = useFetchProfiles()

  React.useEffect(() => {
    const retrieveAuthCfgs = async () => {
      try {
        const _authConfigs = await auth.authConfigs()
        setAuthConfigs(_authConfigs)
      } catch (e) {
        enqueueSnackbar(
          'Unable to fetch auth configs',
          {
            ...errorSnackbarProps,
            details: e.toString(),
            onRetry: () => retrieveAuthCfgs(),
          },
        )
      }
    }
    retrieveAuthCfgs()
  }, [enqueueSnackbar])

  React.useEffect(() => {
    if (!selectedAuthConfig && authConfigs?.length > 0) {
      setSelectedAuthConfig(authConfigs[0])
    }
  }, [selectedAuthConfig, authConfigs])

  React.useEffect(() => {
    if (!selectedProfile && profiles?.length > 0) {
      setSelectedProfile(profiles[0])
    }
  }, [selectedProfile, profiles])

  return <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }}>
    <Tabs
      value={tab}
      onChange={(e, newTab) => setTab(newTab)}
      textColor='secondary'
      indicatorColor='secondary'
      sx={{
        marginBottom: '1rem',
      }}
    >
      {
        Object.values(loginTabs).map((tab) => <Tab
          key={tab}
          value={tab}
          label={tab}
          sx={{
            color: theme.palette.text.main,
          }}
        />)
      }
    </Tabs>
    {
      tab === loginTabs.OAUTH ? <OAuthTab
        selectedAuthConfig={selectedAuthConfig}
        setSelectedAuthConfig={setSelectedAuthConfig}
        authConfigs={authConfigs}
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        profiles={profiles}
        profilesState={profilesState}
      /> : <TokenTab
        selectedAuthConfig={selectedAuthConfig}
        setSelectedAuthConfig={setSelectedAuthConfig}
        authConfigs={authConfigs}
        token={token}
        setToken={setToken}
        showToken={showToken}
        setShowToken={setShowToken}
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        profiles={profiles}
        profilesState={profilesState}
      />
    }
  </div>
}
LoginPanelBottom.displayName = 'LoginPanelBottom'


const OAuthTab = ({
  selectedAuthConfig,
  setSelectedAuthConfig,
  authConfigs,
  selectedProfile,
  setSelectedProfile,
  profiles,
  profilesState,
}) => {
  const theme = useTheme()

  const login = async (authConfig) => {
    const loc = document.location
    const redirectUri = new URL(loc.origin) // redirect to landing page
    redirectUri.searchParams.set('client_id', authConfig.client_id)

    const githubAuthUrl = new URL(authConfig.oauth_url)
    githubAuthUrl.search = new URLSearchParams({
      client_id: authConfig.client_id,
      scope: authConfig.scope,
      redirect_uri: redirectUri.href,
    })

    // forward to github-oauth (user will come back soon enough)
    window.location.replace(githubAuthUrl.href)
  }

  return <>
    <Typography
      width='80%'
      whiteSpace='wrap'
      color={theme.palette.text.grey}
      textAlign='center'
    >
      Press Login to be redirected to the selected OAuth Connect Provider.
    </Typography>
    <AuthConfigSelector
      selectedAuthConfig={selectedAuthConfig}
      setSelectedAuthConfig={setSelectedAuthConfig}
      authConfigs={authConfigs}
      label='OAuth Provider Configuration'
      authConfigKey='name'
    />
    {
      (profilesState.isLoading || profiles.length > 0) && <ProfileSelector
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        profiles={profiles}
        profilesState={profilesState}
        props={{
          sx: {
            width: '80%',
            marginTop: '1rem',
          },
        }}
      />
    }
    <LoginButton login={() => login(selectedAuthConfig)}/>
  </>
}
OAuthTab.displayName = 'OAuthTab'
OAuthTab.propTypes = {
  selectedAuthConfig: PropTypes.object,
  setSelectedAuthConfig: PropTypes.func.isRequired,
  authConfigs: PropTypes.arrayOf(PropTypes.object),
  selectedProfile: PropTypes.string,
  setSelectedProfile: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.string),
  profilesState: PropTypes.object.isRequired,
}


const TokenTab = ({
  selectedAuthConfig,
  setSelectedAuthConfig,
  authConfigs,
  token,
  setToken,
  showToken,
  setShowToken,
  selectedProfile,
  setSelectedProfile,
  profiles,
  profilesState,
}) => {
  const theme = useTheme()

  const [error, setError] = React.useState()

  const login = async (authConfig) => {
    try {
      const dashboard_jwt = await auth.auth({
        accessToken: token,
        apiUrl: authConfig.api_url,
      })
      localStorage.setItem(TOKEN_KEY, JSON.stringify(dashboard_jwt))
      dispatchEvent(new Event('token'))
    } catch {
      setError(true)
    }
  }

  return <>
    <Typography
      width='80%'
      whiteSpace='pre-wrap'
      color={theme.palette.text.grey}
      textAlign='center'
    >
      Enter a valid bearer token for the selected system and press Login.
    </Typography>
    <AuthConfigSelector
      selectedAuthConfig={selectedAuthConfig}
      setSelectedAuthConfig={setSelectedAuthConfig}
      authConfigs={authConfigs}
      label='System Configuration'
      authConfigKey='github_host'
    />
    <TextField
      onChange={(e) => setToken(e.target.value)}
      value={token}
      size='small'
      sx={{
        margin: '1rem 2rem 0 2rem',
        width: '80%',
      }}
      label='Token'
      type={showToken ? 'text' : 'password'}
      InputProps={{
        endAdornment: <InputAdornment position='end'>
          <IconButton
            onClick={() => setShowToken(!showToken)}
            edge='end'
            sx={{
              color: theme.palette.text.grey,
            }}
            disableRipple
          >
            {
              showToken ? <VisibilityOff/> : <Visibility/>
            }
          </IconButton>
        </InputAdornment>
      }}
      helperText={error && 'Wrong credentials'}
      error={error}
    />
    {
      (profilesState.isLoading || profiles.length > 0) && <ProfileSelector
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        profiles={profiles}
        profilesState={profilesState}
        props={{
          sx: {
            width: '80%',
            marginTop: '1rem',
          },
        }}
      />
    }
    <LoginButton login={() => login(selectedAuthConfig)}/>
  </>
}
TokenTab.displayName = 'TokenTab'
TokenTab.propTypes = {
  selectedAuthConfig: PropTypes.object,
  setSelectedAuthConfig: PropTypes.func.isRequired,
  authConfigs: PropTypes.arrayOf(PropTypes.object),
  token: PropTypes.string.isRequired,
  setToken: PropTypes.func.isRequired,
  showToken: PropTypes.bool.isRequired,
  setShowToken: PropTypes.func.isRequired,
  selectedProfile: PropTypes.string,
  setSelectedProfile: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.string),
  profilesState: PropTypes.object.isRequired,
}


const AuthConfigSelector = ({
  selectedAuthConfig,
  setSelectedAuthConfig,
  authConfigs,
  label,
  authConfigKey,
}) => {
  if (authConfigs?.length === 0) {
    return <Alert severity='warning' sx={{
      width: '80%',
      marginTop: '1rem',
    }}>
      {
        `No ${label.toLowerCase()} found.`
      }
    </Alert>
  }

  if (!authConfigs || !selectedAuthConfig) {
    return <Skeleton style={{
      width: '80%',
      marginTop: '1rem',
    }}/>
  }

  return <FormControl size='small' sx={{
    width: '80%',
    marginTop: '1rem',
  }}>
    <InputLabel>
      {
        label
      }
    </InputLabel>
    <Select
      label={label}
      value={selectedAuthConfig[authConfigKey]}
      onChange={(e) => {
        setSelectedAuthConfig(authConfigs.find((authConfig) => authConfig[authConfigKey] === e.target.value))
      }}
    >
      {
        [...new Set(authConfigs.map((authConfig) => authConfig[authConfigKey]))].map((authConfig) => <MenuItem
          key={authConfig}
          value={authConfig}
        >
          {
            authConfig
          }
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
AuthConfigSelector.displayName = 'AuthConfigSelector'
AuthConfigSelector.propTypes = {
  selectedAuthConfig: PropTypes.object,
  setSelectedAuthConfig: PropTypes.func.isRequired,
  authConfigs: PropTypes.arrayOf(PropTypes.object),
  label: PropTypes.string.isRequired,
  authConfigKey: PropTypes.string.isRequired,
}


const LoginButton = ({login}) => {
  const theme = useTheme()

  return <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'center',
  }}>
    <Button
      onClick={login}
      sx={{
        marginBottom: '1rem',
        paddingX: '1rem',
        paddingY: '0.4rem',
        color: theme.palette.text.white,
        background: theme.palette.secondary.main,
        '&:hover': {
          background: theme.palette.secondary.main,
        },
      }}
    >
      Login
    </Button>
  </div>
}
LoginButton.displayName = 'LoginButton'
LoginButton.propTypes = {
  login: PropTypes.func.isRequired,
}
