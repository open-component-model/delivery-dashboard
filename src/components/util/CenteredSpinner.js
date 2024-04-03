import React from 'react'
import PropType from 'prop-types'

import { CircularProgress, Grid } from '@mui/material'

const CenteredSpinner = (params) => {
  return (
    <Grid
      container
      justifyContent='center'
      alignItems='center'
      direction='column'
      {...params}
    >
      <CircularProgress color='inherit' disableShrink size='3.5em' />
    </Grid>
  )
}

CenteredSpinner.propType = {
  style: PropType.object,
}

export default CenteredSpinner
