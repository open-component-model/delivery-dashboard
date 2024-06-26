import React from 'react'
import PropTypes from 'prop-types'

import Grid from '@mui/material/Grid'
import { Skeleton } from '@mui/material'

import ObjectTextViewer from './util/ObjectTextViewer'


export const CdTab = ({
  componentDescriptor,
  isLoading,
}) => {
  if (!isLoading) return <ObjectTextViewer obj={componentDescriptor}/>

  return <Grid container>
    {
      Array.from(Array(30).keys()).map(e => {
        return <Grid
          item
          xs={6}
          key={e}
        >
          <Skeleton/>
        </Grid>
      })
    }
  </Grid>
}
CdTab.displayName = 'CdTab'
CdTab.propTypes = {
  componentDescriptor: PropTypes.object,
  isLoading: PropTypes.bool,
}
