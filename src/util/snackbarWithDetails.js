import React from 'react'

import {
  Box,
  Button,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Typography,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import PropType from 'prop-types'
import { useTheme } from '@emotion/react'
import { SnackbarContent, useSnackbar } from 'notistack'


const SnackbarWithDetails = ({ id, message, details, onRetry, ref }) => {

  const { closeSnackbar } = useSnackbar()
  const [expanded, setExpanded] = React.useState(false)

  const theme = useTheme()

  return (
    <SnackbarContent ref={ref}>
      <Box
        sx={{
          bgcolor: theme.palette.lightRed.main,
          borderRadius: 1,
          boxShadow: 1,
          width: '60vw'
        }}>
        <Box
          sx={{
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            paddingLeft: '0.5em',
            paddingRight: '0.5em',
            paddingTop: '0.1em',
            paddingBottom: '0.1em'
          }}>
          {
            (details !== undefined) ? <IconButton onClick={() => setExpanded(!expanded)}>
              {
                expanded ? <ExpandLessIcon color='snackbarWhite'/> : <ExpandMoreIcon color='snackbarWhite'/>
              }
            </IconButton> : <IconButton disableRipple
              sx={{
                '&:hover': {
                  cursor: 'default',
                },
              }}
            >
              <ErrorIcon/>
            </IconButton>
          }
          <Grid
            container
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'row',
              flexGrow: 1,
              paddingLeft: '0.5em'
            }}>
            <Grid size={10}>
              <Typography variant='body2' color='white'>{message}</Typography>
            </Grid>
            <Grid
              size={2}
              sx={{
                display: 'flex',
                justifyContent: 'right'
              }}>
              {
                (onRetry !== undefined) && <Button
                  onClick={() => {
                    closeSnackbar(id)
                    onRetry()
                  }}
                  color='snackbarWhite'
                >
                  Retry
                </Button>
              }
              <div style={{ padding: '0.3em' }} />
              <Button
                onClick={() => closeSnackbar(id)}
                color='snackbarWhite'
              >
                Dismiss
              </Button>
            </Grid>
          </Grid>
        </Box>
        {
          (details !== undefined) && <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                justifyContent: 'center',
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
                paddingLeft: '0.5em',
                paddingRight: '0.5em',
                paddingTop: '0.1em',
                paddingBottom: '0.1em'
              }}>
              <Divider flexItem/>
              <div style={{ padding: '0.3em' }} />
              <Typography
                variant='body2'
                color='white'
                gutterBottom
              >
                {details}
              </Typography>
            </Box>
          </Collapse>
        }
      </Box>
    </SnackbarContent>
  )
}
SnackbarWithDetails.displayName = 'SnackbarWithDetails'
SnackbarWithDetails.propTypes = {
  id: PropType.number.isRequired,
  message: PropType.string.isRequired,
  details: PropType.string,
  onRetry: PropType.func,
  ref: PropType.object,
}

export default SnackbarWithDetails
