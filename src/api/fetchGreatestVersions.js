import React from 'react'
import PropTypes from 'prop-types'

import { components } from './../api'

export const useFetchGreatestVersions = ({
  componentName,
  ocmRepoUrl,
  versionFilter,
}) => {
  const [versions, setVersions] = React.useState()
  const [isLoading, setIsLoading] = React.useState()
  const [isError, setIsError] = React.useState()

  React.useEffect(() => {
    if (!componentName) return
    let isMounted = true
    setIsLoading(true)
    setIsError()

    const fetchLastVersions = async (componentName, ocmRepoUrl, versionFilter) => {
      try {
        const lastVersions = await components.lastVersions({
          componentName,
          ocmRepoUrl,
          versionFilter,
        })
        if (isMounted) {
          setVersions(lastVersions)
          setIsLoading(false)
        }
      } catch (e) {
        setIsError(e.message)
      }
    }

    if (isMounted) {
      fetchLastVersions(componentName, ocmRepoUrl, versionFilter)
    }
    return () => {
      isMounted = false
    }
  }, [componentName, ocmRepoUrl, versionFilter])

  return [versions, isLoading, isError]
}
useFetchGreatestVersions.propTypes = {
  componentName: PropTypes.string.isRequired,
  ocmRepoUrl: PropTypes.string,
  versionFilter: PropTypes.string,
}
