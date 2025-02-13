import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  capitalize,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
} from '@mui/material'

import { PROFILE_KEY } from '../consts'


const ProfileSelector = ({
  selectedProfile,
  setSelectedProfile,
  profiles,
  profilesState,
  props,
}) => {
  if (profilesState?.error) return <Alert severity='error' {...props}>
    {
      `Profiles could not be fetched: ${profilesState.error}`
    }
  </Alert>

  if (profilesState?.isLoading || !selectedProfile) return <Skeleton style={{
    width: '80%',
    marginTop: '1rem',
  }}/>

  return <FormControl size='small' {...props}>
    <InputLabel>Profile</InputLabel>
    <Select
      label='Profile'
      value={selectedProfile}
      onChange={(e) => {
        localStorage.setItem(PROFILE_KEY, e.target.value)
        setSelectedProfile(e.target.value)
        dispatchEvent(new Event('profile'))
      }}
    >
      {
        profiles.map((profile) => <MenuItem key={profile} value={profile}>
          {
            capitalize(profile)
          }
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
ProfileSelector.displayName = 'ProfileSelector'
ProfileSelector.propTypes = {
  selectedProfile: PropTypes.string,
  setSelectedProfile: PropTypes.func.isRequired,
  profiles: PropTypes.arrayOf(PropTypes.string),
  profilesState: PropTypes.object,
  props: PropTypes.object,
}


export default ProfileSelector
