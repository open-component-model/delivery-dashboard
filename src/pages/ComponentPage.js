import React from 'react'
import PropTypes from 'prop-types'

import { Alert, CircularProgress, Typography } from '@mui/material'

import PersistentDrawerLeft from '../components/layout/Drawer'
import { ComponentView } from '../components/ComponentView'
import { FeatureRegistrationContext, SearchParamContext } from '../App'
import { tabConfig, features, PATH_KEY, PATH_POS_KEY } from '../consts'
import {
  addPresentKeyValuePairs,
  shortenComponentName,
} from '../util'
import { registerCallbackHandler } from '../feature'


export const ComponentPage = () => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [repoCtxFeature, setRepoCtxFeature] = React.useState()

  const searchParamContext = React.useContext(SearchParamContext)

  const componentName = searchParamContext.get('name')
  const version = searchParamContext.get('version')
  const versionFilter = searchParamContext.get('versionFilter')
  const view = searchParamContext.get('view')

  const ocmRepo = searchParamContext.get('ocmRepo')
  const specialComponentId = searchParamContext.get('id') ? parseInt(searchParamContext.get('id')) : undefined
  const specialComponentIsAddedByUser = searchParamContext.get('isAddedByUser') ? searchParamContext.get('isAddedByUser') === 'true' : undefined

  const authError = searchParamContext.get('error')
  const authErrorDescription = searchParamContext.get('error_description')

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.REPO_CONTEXTS,
      callback: ({feature}) => setRepoCtxFeature(feature),
    })
  }, [featureRegistrationContext])

  // If the selected component is in the current path, adjust the path up to this component, otherwise reset
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const currentPathPos = path?.findIndex((pathElem) => pathElem.name === componentName && pathElem.version === version)
  if (currentPathPos >= 0) {
    localStorage.setItem(PATH_POS_KEY, currentPathPos)
  } else {
    localStorage.removeItem(PATH_KEY)
    localStorage.removeItem(PATH_POS_KEY)
  }

  if (!repoCtxFeature || !repoCtxFeature.isAvailable) {
    return <PersistentDrawerLeft
      open={true}
      componentId={specialComponentId}
      componentIsAddedByUser={specialComponentIsAddedByUser}
    >
      <CircularProgress/>
    </PersistentDrawerLeft>
  }

  if (authError) {
    return (
      <PersistentDrawerLeft
        open={true}
        componentId={specialComponentId}
        componentIsAddedByUser={specialComponentIsAddedByUser}
      >
        <Alert severity='error'>
          Error <b>{authError}</b>: {authErrorDescription}
        </Alert>
      </PersistentDrawerLeft>
    )
  }

  if (!componentName) {
    return <PersistentDrawerLeft
      open={true}
      componentId={null}
      componentIsAddedByUser={null}
    >
      <Alert severity='info'>
        Please select a component on the left, or use the detailed component search.
      </Alert>
    </PersistentDrawerLeft>
  }

  if (!view || !version) {
    searchParamContext.set(
      {
        name: componentName,
        version: version || searchParamContext.getDefault('version'),
        view: view || searchParamContext.getDefault('view'),
      },
    )
  }

  const knownTabIds = Object.values(tabConfig).map(tab => tab.id)

  if (!knownTabIds.includes(view)) return <PersistentDrawerLeft
    open={true}
    componentId={specialComponentId}
    componentIsAddedByUser={specialComponentIsAddedByUser}
  >
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Typography variant='h4'>
        {`'${view}'`} is not a valid view
      </Typography>
    </div>
  </PersistentDrawerLeft>

  const component = {
    name: componentName,
    displayName: shortenComponentName(componentName),
    version: version || searchParamContext.getDefault('version'),
  }
  return (
    <PersistentDrawerLeft
      open={true}
      componentId={specialComponentId}
      componentIsAddedByUser={specialComponentIsAddedByUser}
    >
      <ComponentView
        componentMeta={addPresentKeyValuePairs(component, {
          versionFilter: versionFilter,
          id: specialComponentId,
          isAddedByUser: specialComponentIsAddedByUser,
        })}
        ocmRepo={ocmRepo}
      />
    </PersistentDrawerLeft>
  )
}
ComponentPage.displayName = 'ComponentPage'
ComponentPage.propTypes = {
  defaultView: PropTypes.string,
  defaultVersion: PropTypes.string,
}
