import React from 'react'

import CloudOffIcon from '@mui/icons-material/CloudOff'
import { Tooltip } from '@mui/material'

export const ConnectivityIndicator = () => {
  const isConnected = useConnected()

  if (isConnected) return <></>

  return <Tooltip
    title='No internet connection, some features will not be available'
  >
    <CloudOffIcon color='critical'/>
  </Tooltip>
}
ConnectivityIndicator.displayName = 'ConnectivityIndicator'


export const useConnected = () => {
  const [isConnected, setIsConnected] = React.useState(navigator.onLine)

  React.useEffect(() => {
    window.addEventListener('online', () => setIsConnected(true))
    window.addEventListener('offline', () => setIsConnected(false))

    return () => {
      window.removeEventListener('online', () => setIsConnected(true))
      window.removeEventListener('offline', () => setIsConnected(true))
    }
  })

  return isConnected
}
