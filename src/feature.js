import React from 'react'

import { features } from './api'
import { FeatureContext } from './App'
import { features as featureNames, featureStates, TOKEN_KEY } from './consts'


const featureCfgsFromEnv = () => {
  return [
    {
      // eslint-disable-next-line no-undef
      state: JSON.parse(process.env.REACT_APP_FEATURE_JOKES_API) ? featureStates.AVAILABLE : featureStates.UNAVAILABLE,
      name: featureNames.JOKES_API,
    },
    {
      // eslint-disable-next-line no-undef
      state: process.env.REACT_APP_DASHBOARD_CREATE_ISSUE_URL ? featureStates.AVAILABLE : featureStates.UNAVAILABLE,
      name: featureNames.DASHBOARD_CREATE_ISSUE_URL,
      // eslint-disable-next-line no-undef
      url: process.env.REACT_APP_DASHBOARD_CREATE_ISSUE_URL ? process.env.REACT_APP_DASHBOARD_CREATE_ISSUE_URL : null,
    },
  ]
}


/**
 * Fetches all (delivery-service and local cfg) features and invokes callbacks registered by others components.
 * Currently, the only trigger for callback invokes is the successful fetching of all features.
 *
 * This component is not meant to be re-used and should only exist one single time in app root.
 */
const FeatureProvider = () => {
  const [allFeatures, setAllFeatures] = React.useState()
  const [isFeaturesLoading, setIsFeaturesLoading] = React.useState()
  const featureContext = React.useContext(FeatureContext)
  const [token, setToken] = React.useState(JSON.parse(localStorage.getItem(TOKEN_KEY)))

  addEventListener('token', () => setToken(JSON.parse(localStorage.getItem(TOKEN_KEY))))

  React.useEffect(() => {
    const loadFeatures = async () => {
      setIsFeaturesLoading(true)
      const remoteFeatures = await features()
      const localFeatures = featureCfgsFromEnv()
      setAllFeatures([...remoteFeatures, ...localFeatures])
      setIsFeaturesLoading(false)
    }

    const triggerRerender = (feature) => {
      for (const onFeatureStateChangeCallback of featureContext[feature.name] || []) {
        onFeatureStateChangeCallback({'feature': {
          ...feature,
          isAvailable: feature.state === featureStates.AVAILABLE,
          triggerRerender: () => triggerRerender(feature)
        }})
      }
    }

    const callCallbacks = () => {
      for (const feature of allFeatures) {
        for (const onFeatureStateChangeCallback of featureContext[feature.name] || []) {
          onFeatureStateChangeCallback({'feature': {
            ...feature,
            isAvailable: feature.state === featureStates.AVAILABLE,
            triggerRerender: () => triggerRerender(feature)
          }})
        }
      }
    }

    if (isFeaturesLoading || !token)
      return

    if (allFeatures)
      callCallbacks()
    else
      loadFeatures()
  }, [featureContext, allFeatures, isFeaturesLoading, token])

  return null
}
FeatureProvider.displayName = 'FeatureProvider'


/**
 * registers callback for feature name and returns function to unregister said callback
 * useful to register on mount, and unregister on unmount
 */
const registerCallbackHandler = ({
  featureRegistrationContext,
  callback,
  featureName,
}) => {
  featureRegistrationContext({
    instruction: 'register',
    featureName: featureName,
    callback: callback
  })

  return () => {
    featureRegistrationContext({
      instruction: 'unregister',
      featureName: featureName,
      callback: callback
    })
  }
}


export {
  FeatureProvider,
  registerCallbackHandler,
}
