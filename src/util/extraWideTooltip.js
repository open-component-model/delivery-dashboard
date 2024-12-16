import React from 'react'

import {
  Tooltip,
} from '@mui/material'
import { tooltipClasses  } from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'


const ExtraWideTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    minWidth: 500,
    maxWidth: 'none',
  },
})

export default ExtraWideTooltip
