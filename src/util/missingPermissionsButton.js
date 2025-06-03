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
}) => {
  const [rbac] = useFetchAuthRbac()
  const requiredRoles = privilegedRoles({
    roles: rbac?.roles,
    permissions: rbac?.permissions,
    route: route,
    method: method,
  })

  return <Tooltip
    title={
      <>
        <Typography variant='body2'>You need permissions for this action. Privileged Role(s):</Typography>
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
    <div style={{ width: '100%' }}> {/* disabled button requires span to be "interactive" */}
      <Button
        variant='contained'
        color='secondary'
        disabled
        fullWidth
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
}


export default MissingPermissionsButton
