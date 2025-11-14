import React from 'react'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import {
  API_RESPONSES,
  auth,
  components,
  deliverySprintInfosCurrent,
  specialComponentCurrentDependencies,
  artefactsQueryMetadata,
  serviceExtensions,
  dora,
  profiles,
  routes,
} from './api'
import {
  errorSnackbarProps,
  features,
} from './consts'
import { FeatureRegistrationContext } from './App'
import { registerCallbackHandler } from './feature'
import { normaliseObject } from './util'
import { useConnected } from './util/connectivity'


const cache = new Map()


/**
 * Custom hook to fetch data with retry logic and error handling.
 *
 * @param {Function} fetchFunction - function to fetch data, which should return a promise.
 * @param {Object} fetchParams - parameters to pass to the fetch function, provide `null` to not pass
 * parameters at all.
 * @param {Function} [fetchCondition=null] - optional callback which shortcuts fetching if it is falsy.
 * @param {string} [errorMessage='error'] - error message to display in the snackbar.
 * @param {Function} [retryCondition] - used to determine if a retry is needed based on theresult.
 * @param {number} [retryIntervalSeconds=10] - interval in seconds between retry attempts.
 * @param {boolean} [showSnackbar=true] - flag to show a snackbar on error.
 * @param {string} [cacheKey=null] - used to lookup and serve from cache, skip cache if `null`
 * @param {Function} [cacheCondition=null] - optional callback, takes resolved promise data as input
 * and must be truthy to write entry to cache (implication: prevents unresolved promise from being
 * cached)
 * @returns {[any, {isLoading: boolean, error: string|null}, callable]} - array containing the
 * fetched data, the state object, and a callback to re-fetch (data state is *not* re-initialised
 * allowing consumers to differeniate between inital fetch and re-fetch).
 */
const _useFetch = ({
  fetchFunction,
  fetchParams = null,
  fetchCondition = null,
  errorMessage = 'error',
  retryCondition,
  retryIntervalSeconds = 10,
  showSnackbar = true,
  cacheCondition = null,
  cacheKey = null,
}) => {
  const [data, setData] = React.useState()
  const [state, setState] = React.useState({
    isLoading: true,
    error: null,
  })
  const honourCacheKey = React.useRef(true)

  const isConnected = useConnected()

  // increment to refresh useFetch hook, callable is returned next to data and state
  const [refresh, setRefresh] = React.useState(0)

  React.useEffect(() => {
    if (refresh === 0) return // ignore first trigger
    honourCacheKey.current = false // shortcut cache if explicit refresh (=> refetch) is requested
    setState({
      isLoading: true,
      error: null,
    })
  }, [refresh])

  const retryIntervalRef = React.useRef()
  const isFetching = React.useRef(false)

  const { enqueueSnackbar } = useSnackbar()

  const clearIntervalFromRef = (ref) => {
    clearInterval(ref.current)
    ref.current = null
  }

  React.useEffect(() => {
    if (fetchCondition && !fetchCondition()) return

    const fetchData = async () => {
      // prevent multiple fetch attempts if component is re-rendered while fetching
      if (isFetching.current) return
      isFetching.current = true

      if (
        cacheKey !== null
        && honourCacheKey.current
      ) {
        const cachedResult = cache.get(cacheKey)
        if (cachedResult) {
          try {
            let result = cachedResult

            if (cachedResult instanceof Promise) {
              if (!isConnected) {
                isFetching.current = false
                return // assume promise can't be resolved without connection
              }
              result = await cachedResult
            }

            setData(result)
            setState({
              isLoading: false,
              error: null,
            })

            if (
              cacheCondition === null
              || (cacheCondition && cacheCondition(result))
            ) {
              cache.set(cacheKey, result)
            }

          } catch (error) {
            // delete erroneous elements from cache
            cache.delete(cacheKey)

            setState({
              isLoading: false,
              error: error.toString(),
            })
            showSnackbar && enqueueSnackbar(
              errorMessage,
              {
                ...errorSnackbarProps,
                details: error.toString(),
                onRetry: () => fetchData(),
              }
            )
          }
          isFetching.current = false
          return
        }
      }

      if (!isConnected) {
        isFetching.current = false
        return
      }

      const headers = {
        'Shortcut-Cache': Boolean(!honourCacheKey.current),
      }

      const fetchPromise = fetchParams === null ? fetchFunction({headers}) : fetchFunction({...fetchParams, ...{headers: headers}})
      if (
        cacheKey !== null
        && cacheCondition === null // cannot evaluate cache condition if promise is not resolved
        && honourCacheKey.current
      ) {
        cache.set(cacheKey, fetchPromise)
      }

      try {
        const result = await fetchPromise
        if (retryCondition && retryCondition(result)) {
          if (!retryIntervalRef.current) {
            retryIntervalRef.current = setInterval(() => fetchData(), retryIntervalSeconds * 1000)
          }
          return
        }

        setData(result)
        setState({
          isLoading: false,
          error: null,
        })

        if (
          cacheKey !== null
          && honourCacheKey.current
        ) {
          if (
            cacheCondition === null
            || (cacheCondition && cacheCondition(result))
          ) {
            cache.set(cacheKey, result)
          }
        }
        clearIntervalFromRef(retryIntervalRef)

      } catch (error) {
        setState({
          isLoading: false,
          error: error.toString(),
        })
        clearIntervalFromRef(retryIntervalRef)
        showSnackbar && enqueueSnackbar(
          errorMessage,
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchData(),
          }
        )

      } finally {
        isFetching.current = false

      }
    }

    fetchData()
    honourCacheKey.current = true

    return () => {
      setState({
        isLoading: true,
        error: null,
      })
      isFetching.current = false
      honourCacheKey.current = true
      clearIntervalFromRef(retryIntervalRef)
    }
  }, [
    retryIntervalRef.current,
    setData,
    setState,
    enqueueSnackbar,
    fetchCondition,
    fetchFunction,
    fetchParams,
    errorMessage,
    retryCondition,
    showSnackbar,
    retryIntervalSeconds,
    cacheKey,
    cacheCondition,
    refresh,
    isConnected,
  ])

  return [
    data,
    state,
    () => setRefresh(prev => prev + 1)
  ]
}


const useFetchAuthRbac = () => {
  return _useFetch({
    fetchFunction: auth.rbac,
    cacheKey: JSON.stringify({
      route: routes.auth.rbac(),
    }),
  })
}


const useFetchAuthUser = () => {
  return _useFetch({
    fetchFunction: auth.user,
    cacheKey: JSON.stringify({
      route: routes.auth.user(),
    }),
  })
}


const useFetchProfiles = () => {
  return _useFetch({
    fetchFunction: profiles,
    errorMessage: 'Profiles could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.profiles,
    }),
  })
}


const useFetchUpgradePRs = ({
  componentName,
  state,
}) => {
  const params = React.useMemo(() => ({
    componentName,
    state,
  }), [
    componentName,
    state,
  ])

  return _useFetch({
    fetchFunction: components.upgradePullRequests,
    fetchParams: params,
    errorMessage: 'Pull Requests could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.upgradePullRequests(),
      fetchParams: normaliseObject(params),
    }),
  })
}

const useFetchCompDiff = ({
  leftName,
  leftVersion,
  rightName,
  rightVersion,
}) => {
  const params = React.useMemo(() => ({
    leftComponent: { name: leftName, version: leftVersion },
    rightComponent: { name: rightName, version: rightVersion },
  }), [
    leftName,
    leftVersion,
    rightName,
    rightVersion,
  ])

  return _useFetch({
    fetchFunction: components.diff,
    fetchParams: params,
    errorMessage: `Pull Request Diff from '${leftVersion}' to '${rightVersion}' for '${leftName}' could not be fetched`,
    cacheKey: JSON.stringify({
      route: routes.components.diff(),
      fetchParams: normaliseObject(params),
    }),
  })
}

const useFetchCurrentSprintInfos = () => {
  return _useFetch({
    fetchFunction: deliverySprintInfosCurrent,
    errorMessage: 'Current sprint infos could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.delivery.sprintInfos.current,
    }),
  })
}

const useFetchComplianceSummary = ({
  componentName,
  componentVersion,
  ocmRepo,
  recursionDepth,
  profile,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DELIVERY_DB,
      callback: ({feature}) => setDeliveryDbFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return deliveryDbFeature?.isAvailable
  }, [deliveryDbFeature])

  const params = React.useMemo(() => ({
    componentName,
    componentVersion,
    ocmRepo,
    recursionDepth,
    profile,
  }), [
    componentName,
    componentVersion,
    ocmRepo,
    recursionDepth,
    profile,
  ])

  return _useFetch({
    fetchFunction: components.complianceSummary,
    fetchParams: params,
    fetchCondition: fetchCondition,
    errorMessage: 'Compliance Summary could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.components.complianceSummary(),
      fetchParams: normaliseObject(params),
    }),
  })
}

const useFetchSpecialComponentCurrentDependencies = ({id}) => {
  const params = React.useMemo(() => ({ id }), [id])

  return _useFetch({
    fetchFunction: specialComponentCurrentDependencies,
    fetchParams: params,
    errorMessage: 'Special component dependencies could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.specialComponent.currentDependencies,
      fetchParams: normaliseObject(params),
    }),
  })
}

const useFetchComponentDescriptor = ({
  componentName,
  componentVersion,
  ocmRepo,
  raw,
  absentOk = false,
}) => {
  const params = React.useMemo(() => ({
    componentName: componentName,
    version: componentVersion,
    ocmRepoUrl: ocmRepo,
    raw: raw,
    absentOk: absentOk,
  }), [
    componentName,
    componentVersion,
    ocmRepo,
    raw,
    absentOk,
  ])

  return _useFetch({
    fetchFunction: components.ocmComponent,
    fetchParams: params,
    errorMessage: `Component "${componentName}" could not be fetched`,
  })
}

const useFetchBom = ({
  componentName,
  componentVersion,
  ocmRepo,
  populate,
}) => {
  const params = React.useMemo(() => ({
    componentName: componentName,
    componentVersion: componentVersion,
    ocmRepoUrl: ocmRepo,
    populate: populate,
  }), [
    componentName,
    componentVersion,
    ocmRepo,
    populate,
  ])

  return _useFetch({
    fetchFunction: components.componentDependencies,
    fetchParams: params,
    errorMessage: `Transitive closure of component "${componentName}:${componentVersion}" could not be fetched`,
    cacheKey: JSON.stringify({
      route: routes.ocm.component.dependencies(),
      fetchParams: normaliseObject(params),
    }),
  })
}


const useFetchQueryMetadata = ({
  artefacts,
  types,
  referenced_types = React.useMemo(() => {[]}, []),
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DELIVERY_DB,
      callback: ({feature}) => setDeliveryDbFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return deliveryDbFeature?.isAvailable
  }, [deliveryDbFeature])

  const params = React.useMemo(() => ({
    artefacts,
    types,
    referenced_types,
  }), [
    artefacts,
    types,
    referenced_types,
  ])

  return _useFetch({
    fetchFunction: artefactsQueryMetadata,
    fetchParams: params,
    fetchCondition: fetchCondition,
    errorMessage: 'Unable to fetch artefact metadata',
    cacheKey: JSON.stringify({
      route: routes.artefacts.queryMetadata,
      fetchParams: normaliseObject(params),
    }),
  })
}


const useFetchServiceExtensions = () => {
  return _useFetch({
    fetchFunction: serviceExtensions.services,
    showSnackbar: false,
    cacheKey: JSON.stringify({
      route: routes.serviceExtensions.base,
    }),
  })
}


const useFetchLogCollections = ({
  service,
  logLevel,
  skipCache = false,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [clusterAccessFeature, setClusterAccessFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.CLUSTER_ACCESS,
      callback: ({feature}) => setClusterAccessFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return clusterAccessFeature?.isAvailable
  }, [clusterAccessFeature])

  const params = React.useMemo(() => ({
    service,
    logLevel,
  }), [
    service,
    logLevel,
  ])

  const cacheKey = JSON.stringify({
    route: routes.serviceExtensions.logCollections(),
    fetchParams: normaliseObject(params),
  })

  return _useFetch({
    fetchFunction: serviceExtensions.logCollections,
    fetchParams: params,
    fetchCondition: fetchCondition,
    errorMessage: `Log collection for service ${service} and log level ${logLevel} could not be fetched`,
    cacheKey: skipCache ? null : cacheKey,
  })
}


const useFetchContainerStatuses = ({
  service,
  skipCache = false,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [clusterAccessFeature, setClusterAccessFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.CLUSTER_ACCESS,
      callback: ({feature}) => setClusterAccessFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return clusterAccessFeature?.isAvailable
  }, [clusterAccessFeature])

  const params = React.useMemo(() => ({
    service,
  }), [
    service,
  ])

  const cacheKey = JSON.stringify({
    route: routes.serviceExtensions.containerStatuses(),
    fetchParams: normaliseObject(params),
  })

  return _useFetch({
    fetchFunction: serviceExtensions.containerStatuses,
    fetchParams: params,
    fetchCondition: fetchCondition,
    errorMessage: `Container statuses for service ${service} could not be fetched`,
    cacheKey: skipCache ? null : cacheKey,
  })
}


const useFetchBacklogItems = ({
  service,
  skipCache = false,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [clusterAccessFeature, setClusterAccessFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.CLUSTER_ACCESS,
      callback: ({feature}) => setClusterAccessFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return clusterAccessFeature?.isAvailable
  }, [clusterAccessFeature])

  const params = React.useMemo(() => ({
    service,
  }), [
    service,
  ])

  const cacheKey = JSON.stringify({
    route: routes.serviceExtensions.backlogItems(),
    fetchParams: normaliseObject(params),
  })

  return _useFetch({
    fetchFunction: serviceExtensions.backlogItems.get,
    fetchParams: params,
    fetchCondition: fetchCondition,
    errorMessage: 'Backlog items could not be fetched',
    cacheKey: skipCache ? null : cacheKey,
  })
}


const useFetchComponentResponsibles = ({
  componentName,
  componentVersion,
  artefactName,
  ocmRepo,
}) => {
  const params = React.useMemo(() => ({
    componentName,
    componentVersion,
    artefactName,
    ocmRepo,
  }), [
    componentName,
    componentVersion,
    artefactName,
    ocmRepo,
  ])

  const retryCondition = React.useCallback((res) => {
    return res === API_RESPONSES.RETRY
  }, [
    API_RESPONSES.RETRY,
  ])

  const cacheCondition = React.useCallback((res) => {
    // only cache if the response is not a retry
    return res !== API_RESPONSES.RETRY
  }, [
    API_RESPONSES.RETRY,
  ])

  return _useFetch({
    fetchFunction: components.componentResponsibles,
    fetchParams: params,
    errorMessage: 'Responsible Data could not be fetched',
    retryCondition: retryCondition,
    cacheCondition: cacheCondition,
    cacheKey: JSON.stringify({
      route: routes.ocm.component.responsibles(),
      fetchParams: normaliseObject(params),
    }),
  })
}


const useFetchDoraMetrics = ({
  targetComponentName,
  timeSpanDays,
}) => {
  const params = React.useMemo(() => ({
    targetComponentName,
    timeSpanDays,
  }), [
    targetComponentName,
    timeSpanDays,
  ])

  const retryCondition = React.useCallback((res) => {
    return res === API_RESPONSES.RETRY
  }, [
    API_RESPONSES.RETRY,
  ])

  const cacheCondition = React.useCallback((res) => {
    // only cache if the response is not a retry
    return res !== API_RESPONSES.RETRY
  }, [
    API_RESPONSES.RETRY,
  ])

  return _useFetch({
    fetchFunction: dora.doraMetrics,
    fetchParams: params,
    errorMessage: `Dora metrics for component ${targetComponentName} could not be fetched`,
    retryCondition: retryCondition,
    cacheCondition: cacheCondition,
    cacheKey: JSON.stringify({
      route: routes.dora.doraMetrics(),
      fetchParams: normaliseObject(params),
    }),
  })
}


export {
  useFetchAuthRbac,
  useFetchAuthUser,
  useFetchUpgradePRs,
  useFetchCompDiff,
  useFetchCurrentSprintInfos,
  useFetchComplianceSummary,
  useFetchSpecialComponentCurrentDependencies,
  useFetchComponentDescriptor,
  useFetchBom,
  useFetchQueryMetadata,
  useFetchComponentResponsibles,
  useFetchServiceExtensions,
  useFetchLogCollections,
  useFetchContainerStatuses,
  useFetchBacklogItems,
  useFetchDoraMetrics,
  useFetchProfiles,
}



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
