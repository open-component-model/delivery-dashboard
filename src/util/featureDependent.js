import React from 'react'

import PropTypes from 'prop-types'

import { FeatureRegistrationContext } from '../App'

/**
 * Wrapping component to show/hide children based on the available features.
 * @param {node} children Children to be display if `requiredFeatures` are available
 * @param {array} requiredFeatures Features which determine the to be displayed children
 * @param {node} childrenIfFeatureUnavailable Children to be display if `requiredFeatures` are unavailable
 */
const FeatureDependent = ({
  children,
  requiredFeatures,
  childrenIfFeatureUnavailable,
  childrenIfFeatureLoading,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [features, setFeatures] = React.useState({})

  React.useEffect(() => {
    const callbackForFeatureName = Object.fromEntries(requiredFeatures.map(featureName => {
      return [
        featureName,
        ({feature}) => setFeatures(prev => {
          return {
            ...prev,
            [featureName]: feature,
          }
        })
      ]
    }))

    requiredFeatures.map(featureName => {
      featureRegistrationContext({
        instruction: 'register',
        featureName: featureName,
        callback: callbackForFeatureName[featureName]
      })
    })

    return () => {
      requiredFeatures.map(featureName => {
        featureRegistrationContext({
          instruction: 'unregister',
          featureName: featureName,
          callback: callbackForFeatureName[featureName]
        })
      })
    }
  }, [featureRegistrationContext])

  if (Object.keys(features).length !== requiredFeatures.length) {
    return childrenIfFeatureLoading ? childrenIfFeatureLoading : null
  }

  if (requiredFeatures.every(required => {
    return Object.keys(features).includes(required) && features[required].isAvailable
  })) {
    return children
  }

  return childrenIfFeatureUnavailable ? childrenIfFeatureUnavailable : null
}
FeatureDependent.displayName = 'FeatureDependent'
FeatureDependent.propTypes = {
  children: PropTypes.node,
  requiredFeatures: PropTypes.array,
  childrenIfFeatureUnavailable: PropTypes.node,
  childrenIfFeatureLoading: PropTypes.node,
}

export default FeatureDependent
