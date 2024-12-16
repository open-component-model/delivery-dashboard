import React from 'react'

import { Chip } from '@mui/material'

import PropType from 'prop-types'
import { useSnackbar } from 'notistack'

import { copyNotificationCfg } from '../consts'


/**
 * Chip to copy value to clipboard on click (+ display notification)
 *
 * - `value` is copied to clipboard
 * - `label` is displayed in Chip, defaults to `value`
 * - `message` is displayed in notification, defaults to `Version copied!`
 * - `chipProps` are passed to Chip component
 */
// eslint-disable-next-line no-unused-vars
const CopyOnClickChip = React.forwardRef((props, ref) => {
  const {value, message, label, chipProps} = props

  const { enqueueSnackbar } = useSnackbar()

  const handleCopy = ({ event, value }) => {
    navigator.clipboard.writeText(value)
    enqueueSnackbar(
      message ? message : 'Version copied!',
      { ...copyNotificationCfg }
    )
    event.stopPropagation()
  }

  return <Chip
    label={label ? label : value}
    { ...chipProps }
    onClick={(event) => {
      handleCopy({
        event: event,
        value: value,
      })
    }}
  />
})
CopyOnClickChip.displayName = 'CopyOnClickChip'
CopyOnClickChip.propTypes = {
  value: PropType.string.isRequired,
  label: PropType.string,
  message: PropType.string,
  chipProps: PropType.object,
}

export default CopyOnClickChip
