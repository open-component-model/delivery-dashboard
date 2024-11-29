import React from 'react'

import useMediaQuery from '@mui/material/useMediaQuery'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import {
  HashRouter,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { enqueueSnackbar, SnackbarProvider } from 'notistack'

import { ComponentPage } from './pages/ComponentPage'
import NotFoundPage from './pages/NotFoundPage'
import {
  COMPONENT_PATH,
  copyNotificationCfg,
  LOGIN_PATH,
  MONITORING_PATH,
  SERVICES_PATH,
  errorSnackbarProps,
  servicesTabConfig,
  tabConfig,
  TOKEN_KEY,
} from './consts'
import { LoginPage } from './pages/LoginPage'
import { LandingPage } from './pages/LandingPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { ServicesPage } from './pages/ServicesPage'
import { FeatureProvider } from './feature'
import { auth } from './api'
import { isTokenExpired } from './util'
import SnackbarWithDetails from './components/util/SnackbarWithDetails'
import Snowfall from 'react-snowfall'


export let originalGetContrastText

export const ConfigContext = React.createContext()
export const FeatureContext = React.createContext()
export const FeatureRegistrationContext = React.createContext()
export const SearchParamContext = React.createContext()


const App = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [themeMode, setThemeMode] = React.useState(prefersDarkMode)
  const [showSnowflakes, setShowSnowflakes] = React.useState(true)

  React.useEffect(() => {
    setThemeMode(prefersDarkMode)
    // eslint-disable-next-line no-undef
    document.title = process.env.REACT_APP_DASHBOARD_TITLE
  }, [prefersDarkMode])

  const switchThemeMode = () => {
    setThemeMode(!themeMode)
  }

  const { palette } = createTheme()
  const theme = createTheme({
    palette: {
      primary: {
        main: '#424242',
      },
      secondary: {
        main: '#0b8062',
      },
      background: {
        main: themeMode ? '#20000000' : '#ffffff',
        white: '#ffffff',
        lightgrey: '#424242',
        grey: '#2b2b2b',
        darkgrey: '#212121',
      },
      text: {
        main: themeMode ? '#ffffff' : '#000000',
        white: '#ffffff',
        grey: '#808080',
      },
      levelDebug: palette.augmentColor({
        color: {
          main: themeMode ? '#ffffff' : '#000000',
        }
      }),
      levelInfo: palette.augmentColor({
        color: {
          main: themeMode ? '#66bb6a' : '#44c643', // green
        }
      }),
      levelWarning: palette.augmentColor({
        color: {
          main: themeMode ? '#ffa726' : '#ff914b', // orange
        }
      }),
      levelError: palette.augmentColor({
        color: {
          main: '#f44336', // red
        }
      }),
      high: palette.augmentColor({
        color: {
          main: '#ff5722', // deepOrange[500]
        }
      }),
      critical: palette.augmentColor({
        color: {
          main: '#f44336', // red[500]
        }
      }),
      blocker: palette.augmentColor({
        color: {
          main: '#d50000', // red[A700]
        }
      }),
      snackbarWhite: {
        main: '#F2F3F4',
      },
      lightRed: {
        main: '#d32f2f',
      },
      snowflake: {
        main: themeMode ? '#ffffff' : '#6994b7',
      },
      snowflakeIcon: palette.augmentColor({
        color: {
          main: '#65adff',
        }
      }),
      mode: themeMode ? 'dark' : 'light',
    },
    bomButton: {
      color: themeMode ? 'white' : 'black'
    },
    dependentComponentOverview: {
      color: themeMode ? '#99ff9980' : '#99ff9980'
    },
  })

  const configValue = {
    prefersDarkMode: themeMode,
    switchThemeMode: switchThemeMode,
    getContrastText: theme.palette.getContrastText,
    toggleSnowflakes: () => setShowSnowflakes(prev => !prev),
    showSnowflakes: showSnowflakes,
  }

  const featureListenerRegistrationHandler = (state, action) => {
    const registerOnFeatureChangedListener = ({
      name,
      callback,
    }) => {
      return {
        ...state,
        [name]: [...(state[name] || []), callback],
      }
    }

    const unregisterOnFeatureChangedListener = ({
      name,
      callback,
    }) => {
      return {
        ...state,
        [name]: state[name].filter(c => c !== callback)
      }
    }

    const {instruction, featureName, callback} = action

    if (instruction == 'register') {
      return registerOnFeatureChangedListener({
        name: featureName,
        callback: callback,
      })
    } else if (instruction == 'unregister') {
      return unregisterOnFeatureChangedListener({
        name: featureName,
        callback: callback,
      })
    }
  }

  /**
   * `featureListenerRegistration` contains a list of callbacks for feature names, which will be invoked upon successful feature fetching.
   *
   * `dispatchFeatureListenerRegistration` accepts an (registration)instruction ([un]register), a feature name, and a callback.
   * Based on instruction, the callback for a feature name is either registered or unregistered.
   * Components should register on mount and unregister on unmount.
   *
   * Both are globally exposed via context:
   *   `FeatureContext` to access `featureListenerRegistration`
   *   `FeatureRegistrationContext` to access `dispatchFeatureListenerRegistration`
   *
   * The `FeatureContext` is not meant to be used by any other component than `FeatureProvider`, as this component fetches features and invokes registered callbacks.
   * Components should only handle their feature callback registration via `FeatureRegistrationContext`.
   * This process is only the way components should access feature data on their own, getting feature data passed down from parent is acceptable.
   *
   * Ultimately, components must consider three cases w.r.t. features:
   * - features not available (still fetching)
   * - feature not available (isAvailable === false, convenience attribute is added to feature and based on feature state)
   * - feature available
   *
   * Examples:
   * To register on mount and unregister on unmount the "useEffect" hook can be used with an empty dependencies array.
   * Therefore, the registration instruction is executed and unregistration instruction returned as function.
   * `registerCallbackHandler` deduplicates this for an easy re-use.

     const [feature, setFeature] = React.useState()
     const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

     React.useEffect(() => {
       return registerCallbackHandler({
         featureRegistrationContext: featureRegistrationContext,
         featureName: <my-feature>,
         callback: ({feature}) => setFeature(feature),
       })
     }, [])
   */
  const [featureListenerRegistration, dispatchFeatureListenerRegistration] = React.useReducer(featureListenerRegistrationHandler, {})

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider
        maxSnack={4}
        Components={{
          snackbarWithDetails: SnackbarWithDetails,
        }}
      >
        <ConfigContext.Provider value={configValue}>
          <FeatureContext.Provider value={featureListenerRegistration}>
            <FeatureRegistrationContext.Provider value={dispatchFeatureListenerRegistration}>
              <AuthProvider/>
              <FeatureProvider/>
              <CssBaseline/>
              <Router/>
              {showSnowflakes && <Snowfall
                color={theme.palette.snowflake.main}
                snowflakeCount={80}
                speed={[2.0, 4.0]}
                radius={[1.0, 4.0]}
              />}
            </FeatureRegistrationContext.Provider>
          </FeatureContext.Provider>
        </ConfigContext.Provider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}


const InnerRouter = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [token, setToken] = React.useState(JSON.parse(localStorage.getItem(TOKEN_KEY)))

  addEventListener('token', () => setToken(JSON.parse(localStorage.getItem(TOKEN_KEY))))

  React.useEffect(() => {
    const url = new URL(document.location)
    if (!token) {
      navigate(LOGIN_PATH)
    } else if (url.hash.startsWith(`#${LOGIN_PATH}`)) {
      // navigate to landing page if login page is open but user is logged in
      navigate('/')
    }
  }, [token, navigate])

  const searchParamConfig = {
    update: (obj) => {
      setSearchParams(prev => {
        return {
          ...Object.fromEntries(prev.entries()),
          ...obj,
        }
      })
    },
    get: (param) => {
      return searchParams.get(param)
    },
    getAll: (param) => {
      return searchParams.getAll(param)
    },
    getDefault: (param) => {
      const defaultValues = {
        'view': tabConfig.BOM.id,
        'version': 'greatest',
        'servicesTab': servicesTabConfig.BACKLOG.id,
      }
      return defaultValues[param]
    },
    set: (params) => {
      setSearchParams(params)
    },
    delete: (key) => {
      setSearchParams(prev => {
        prev.delete(key)
        return prev
      })
    }
  }

  return <SearchParamContext.Provider value={searchParamConfig}>
    <Routes>
      <Route
        path={`${LOGIN_PATH}/*`}
        element={<LoginPage/>}
      />
      <Route
        path={`${COMPONENT_PATH}/*`}
        element={<ComponentPage/>}
      />
      <Route
        path={`${SERVICES_PATH}/*`}
        element={<ServicesPage/>}
      />
      <Route
        path={`${MONITORING_PATH}/*`}
        element={<MonitoringPage/>}
      />
      <Route
        path='/'
        element={<LandingPage/>}
      />
      <Route
        path='*'
        element={<NotFoundPage/>}
      />
    </Routes>
  </SearchParamContext.Provider>
}


const Router = () => {
  return <HashRouter>
    <InnerRouter/>
  </HashRouter>
}

const AuthProvider = () => {
  const searchParams = new URLSearchParams(window.location.search)
  const code = searchParams.get('code')
  const clientId = searchParams.get('client_id')

  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

  React.useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        enqueueSnackbar('Session expired, please login again', {
          ...copyNotificationCfg,
        })
        localStorage.removeItem(TOKEN_KEY)
      }
    }
  }, [token])

  React.useEffect(() => {
    let mounted = true
    if (!code || !clientId) return

    const oAuthLogin = async () => {
      const url = new URL(document.location)
      // clear code from URL
      url.searchParams.delete('code')
      url.searchParams.delete('client_id')

      window.history.pushState('', '', url)
      try {
        if (mounted) {
          const dashboard_jwt = await auth.auth({code, clientId})
          localStorage.setItem(TOKEN_KEY, JSON.stringify(dashboard_jwt))
          dispatchEvent(new Event('token'))
        }
      } catch (e) {
        if (mounted) {
          enqueueSnackbar(
            'oAuth login failed',
            {
              ...errorSnackbarProps,
              details: e.toString(),
              onRetry: () => oAuthLogin(),
            }
          )
        }
      }
    }
    oAuthLogin()

    return () => {
      mounted = false
    }
  }, [code, clientId])
}

export default App
