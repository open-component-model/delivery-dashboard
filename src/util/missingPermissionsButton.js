import React from 'react'
import PropTypes from 'prop-types'

import {
  Button,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import { useFetchAuthRbac } from '../fetch'
import { privilegedRoles } from '../util'


const MissingPermissionsButton = ({
  route,
  method,
  buttonText,
  variant,
  fullWidth = true,
}) => {
  const [rbac, rbacState] = useFetchAuthRbac()

  if (rbacState.isLoading || rbacState.error) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth={fullWidth}
  >
    {
      buttonText
    }
  </Button>

  const requiredRoles = privilegedRoles({
    roles: rbac.roles,
    permissions: rbac.permissions,
    route: route,
    method: method,
  })

  return <Tooltip
    title={
      <>
        <Typography variant='body2'>You do not have the required permissions to perform this action. Role(s) granting necessary permissions:</Typography>
        <div style={{ padding: '0.3em' }}/>
        <Stack>
          {
            requiredRoles?.map((role, idx) => <Typography key={idx} variant='body2'>
              {
                role.name
              }
            </Typography>)
          }
        </Stack>
      </>
    }
  >
    <div style={fullWidth ? { width: '100%' } : undefined}> {/* disabled button requires span to be "interactive" */}
      <Button
        variant={variant ?? 'contained'}
        color='secondary'
        disabled
        fullWidth={fullWidth}
      >
        {
          buttonText
        }
      </Button>
    </div>
  </Tooltip>
}
MissingPermissionsButton.displayName = 'MissingPermissionsButton'
MissingPermissionsButton.propTypes = {
  route: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  buttonText: PropTypes.string.isRequired,
  variant: PropTypes.string,
  fullWidth: PropTypes.bool,
}


export default MissingPermissionsButton
