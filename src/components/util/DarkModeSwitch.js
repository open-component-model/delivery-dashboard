import React from 'react'

import { ToggleButtonGroup, ToggleButton } from '@mui/material'
import { DarkModeOutlined, LightModeOutlined } from '@mui/icons-material'

import { ConfigContext } from '../../App'
import { useTheme } from '@emotion/react'

const DarkModeSwitch = () => {
  const context = React.useContext(ConfigContext)
  const theme = useTheme()

  return (
    <ToggleButtonGroup
      variant='outlined'
      aria-label='theme mode button group'
      color='secondary'
      value={theme.palette.mode}
    >
      <ToggleButton onClick={context.switchThemeMode} value='light'>
        <LightModeOutlined />
      </ToggleButton>
      <ToggleButton onClick={context.switchThemeMode} value='dark'>
        <DarkModeOutlined />
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export default DarkModeSwitch
