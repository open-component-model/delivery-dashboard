import React from 'react'

import {
  Box,
  Link,
  Typography,
  Stack,
} from '@mui/material'

import PropTypes from 'prop-types'

import FeatureDependent from './featureDependent'
import { features } from '../consts'
import { FeatureRegistrationContext } from '../App'


const withFeatureContextHook = (Component) => {
  // useful to provide featureContext hook content to class component
  return function WrappedComponent(props) {
    const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
    return <Component {...props} featureRegistrationContext={featureRegistrationContext}/>
  }
}


class ErrorBoundary extends React.Component {
  // no hook equivalent for error boundary yet, see https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      featureRegistrationContext: this.props.featureRegistrationContext,
      dashboardCreateIssueUrlFeature: null,
      callback: ({feature}) => {this.setState({dashboardCreateIssueUrlFeature: feature})},
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error,
    }
  }

  // eslint-disable-next-line no-unused-vars
  componentDidCatch(error, errorInfo) {}

  componentDidMount() {
    this.state.featureRegistrationContext({
      instruction: 'register',
      featureName: features.DASHBOARD_CREATE_ISSUE_URL,
      callback: this.state.callback
    })
  }

  componentWillUnmount() {
    this.state.featureRegistrationContext({
      instruction: 'unregister',
      featureName: features.DASHBOARD_CREATE_ISSUE_URL,
      callback: this.state.callback
    })
  }

  render() {
    if (this.state.hasError) {
      return <Box
        display='flex'
        justifyContent='center'
      >
        <Stack direction='column'>
          <Typography
            display='flex'
            justifyContent='center'
            variant='h4'
          >
            {`Something went wrong ${String.fromCodePoint('0x1F625')}`} {/* "sad but relieved face" symbol */}
          </Typography>
          <FeatureDependent
            requiredFeatures={[features.DASHBOARD_CREATE_ISSUE_URL]}
          >
            <Typography
              justifyContent='center'
            >
              If this error persists, please consider {
                <Link
                  href={this.state.dashboardCreateIssueUrlFeature?.url}
                  // FeatureDependent callback might be invoked first, therefore check for feature presence
                  color='secondary'
                >
                  creating
                </Link>
              } a bug report {String.fromCodePoint('0x1F41B')} {/* "Bug" symbol */}
            </Typography>
          </FeatureDependent>
        </Stack>
      </Box>
    }
    return this.props.children
  }
}
ErrorBoundary.displayName = 'ErrorBoundary'
ErrorBoundary.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.object),
  ]),
  featureRegistrationContext: PropTypes.func.isRequired,
}

export default withFeatureContextHook(ErrorBoundary)
