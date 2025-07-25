import React from 'react'

import { Logout, Settings, AcUnit } from '@mui/icons-material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import { features, PROFILE_KEY, TOKEN_KEY, errorSnackbarProps } from '../consts.js'
import { auth } from '../api.js'
import DarkModeSwitch from './darkModeSwitch.js'
import FeatureDependent from './featureDependent.js'
import { useFetchAuthUser } from '../fetch.js'
import ProfileSelector from './profileSelector.js'
import { ConfigContext, FeatureRegistrationContext } from '../App.js'
import { registerCallbackHandler } from '../feature.js'
import { isWinterComing } from '../util.js'


export const SettingsMenu = () => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const context = React.useContext(ConfigContext)

  const [profilesFeature, setProfilesFeature] = React.useState()
  const [dashboardCreateIssueUrlFeature, setDashboardCreateIssueUrlFeature] = React.useState()
  const [anchorElement, setAnchorElement] = React.useState(null)

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.PROFILES,
      callback: ({feature}) => setProfilesFeature(feature),
    })
  }, [featureRegistrationContext])

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
    <IconButton onClick={handleClick}>
      <Settings sx={{color: 'white'}}/>
    </IconButton>
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
          {
            isWinterComing() && <ListItem
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography>Winter is coming</Typography>
              <Switch
                checked={context.showSnowflakes}
                onChange={context.toggleSnowflakes}
                icon={<AcUnit
                  color='snowflakeIcon'
                />}
                checkedIcon={<AcUnit
                  color='snowflakeIcon'
                />}
              />
            </ListItem>
          }
          <ListItem
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DarkModeSwitch />
          </ListItem>
          <LoginPanel
            profiles={profilesFeature?.profiles.map((profile) => profile.name) ?? []}
          />
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
  profiles,
}) => {
  const [selectedProfile, setSelectedProfile] = React.useState(localStorage.getItem(PROFILE_KEY))
  const { enqueueSnackbar } = useSnackbar()
  const [user] = useFetchAuthUser()
  const username = user?.identifiers[0].identifier.username

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY)
    dispatchEvent(new Event('token'))
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

  React.useEffect(() => {
    if (!selectedProfile && profiles.length > 0) {
      setSelectedProfile(profiles[0])
    }
  }, [selectedProfile, profiles])

  return <FeatureDependent requiredFeatures={[features.AUTHENTICATION]}>
    <ListItem sx={{ display: 'flex', justifyContent: 'center' }}>
      {
        username ? <Tooltip title={`logged in as ${username}`}>
          <Avatar/>
        </Tooltip> : <Avatar/>
      }
    </ListItem>
    {
      profiles.length > 0 && <ListItem>
        <ProfileSelector
          selectedProfile={selectedProfile}
          setSelectedProfile={setSelectedProfile}
          profiles={profiles}
          props={{
            sx: {
              width: '100%',
            },
          }}
        />
      </ListItem>
    }
    <ListItem disablePadding>
      <ListItemButton onClick={() => logout()}>
        <Logout color='error'/>
        <div style={{ padding: '0.3em' }}/>
        <ListItemText primary='Logout'/>
      </ListItemButton>
    </ListItem>
  </FeatureDependent>
}
LoginPanel.displayName = 'LoginPanel'
LoginPanel.propTypes = {
  profiles: PropTypes.arrayOf(PropTypes.string).isRequired,
}
