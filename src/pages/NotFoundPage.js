import React from 'react'

import PropTypes from 'prop-types'

import { Alert, Grid } from '@mui/material'

import octo from '../res/notFoundOcto.png'
import robo from '../res/notFoundRobo.png'
import box from '../res/notFoundBox.png'

const NotFoundPage = ({ reason }) => {
  const images = [
    {
      style: { height: '100%' },
      src: octo,
      alt: 'sad octo',
      link: (
        <a href='https://www.freepik.com/vectors/background'>
          Background vector created by freepik - www.freepik.com
        </a>
      ),
    },
    {
      style: { height: '100%' },
      src: robo,
      alt: 'sad robo',
      link: (
        <a href='https://www.freepik.com/vectors/background'>
          Background vector created by freepik - www.freepik.com
        </a>
      ),
    },
    {
      style: { height: '95%' },
      src: box,
      alt: 'sad box',
      link: (
        <a href='https://www.freepik.com/vectors/business'>
          Business vector created by freepik - www.freepik.com
        </a>
      ),
    },
  ]

  const image = images[Math.floor(Math.random() * images.length)]

  return <Grid container>
    <Grid item xs={12}>
      <div
        style={{
          height: '65vh',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <img style={image.style} src={image.src} alt={image.alt} />
      </div>
    </Grid>
    <Grid item xs={12}>
      <div
        style={{
          display: 'flex',
          paddingTop: '4em',
          justifyContent: 'center',
        }}
      >
        <Alert severity='info'>{reason}</Alert>
      </div>
    </Grid>
    <Grid item xs={12}>
      <div style={{ bottom: '0', right: '0', position: 'fixed' }}>
        {image.link}
      </div>
    </Grid>
  </Grid>
}

NotFoundPage.propTypes = {
  reason: PropTypes.string,
}

export default NotFoundPage
