import React from 'react'

import { CircularProgress, Grid } from '@mui/material'

import PropType from 'prop-types'

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
