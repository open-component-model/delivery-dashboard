import React from 'react'

import { useSnackbar } from 'notistack'
import {
  API_RESPONSES,
  components,
  deliverySprintInfosCurrent,
  specialComponentCurrentDependencies,
  artefactsQueryMetadata,
  serviceExtensions,
  dora,
  routes,
} from '../api'
import {
  errorSnackbarProps,
  features,
} from '../consts'
import { FeatureRegistrationContext } from '../App'

import { registerCallbackHandler } from '../feature'
import { normaliseObject } from '../util'
import { useConnected } from '../components/util/Connectivity'


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

  const isConnected = useConnected()

  // toggle state to refresh useFetch hook, callable is returned next to data and state
  const [refresh, setRefresh] = React.useState(true)
  const resetState = () => {
    setState({
      isLoading: true,
      error: null,
    })
  }
  React.useEffect(() => resetState(), [refresh])

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

      if (cacheKey !== null) {
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

      const fetchPromise = fetchParams === null ? fetchFunction() : fetchFunction(fetchParams)
      if (
        cacheKey !== null
        && cacheCondition === null // cannot evaluate cache condition if promise is not resolved
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

        if (cacheKey !== null) {
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

    return () => {
      resetState()
      isFetching.current = false
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
    () => setRefresh(prev => !prev),
  ]
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
}) => {
  const params = React.useMemo(() => ({
    componentName,
    componentVersion,
    ocmRepo,
    recursionDepth,
  }), [
    componentName,
    componentVersion,
    ocmRepo,
    recursionDepth,
  ])

  return _useFetch({
    fetchFunction: components.complianceSummary,
    fetchParams: params,
    errorMessage: 'Compliance Summary could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.components.complianceSummary(),
      fetchParams: normaliseObject(params),
    }),
  })
}

const useFetchSpecialComponentCurrentDependencies = ({componentName}) => {
  const params = React.useMemo(() => ({ componentName: componentName }), [componentName])

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
  versionFilter,
  raw,
}) => {
  const params = React.useMemo(() => ({
    componentName: componentName,
    version: componentVersion,
    ocmRepoUrl: ocmRepo,
    raw: raw,
    ...(versionFilter !== null && { versionFilter: versionFilter }), // keep cache key stable
  }), [
    componentName,
    componentVersion,
    ocmRepo,
    versionFilter,
    raw,
  ])

  return _useFetch({
    fetchFunction: components.ocmComponent,
    fetchParams: params,
    errorMessage: `Component "${componentName}" could not be fetched`,
    cacheKey: JSON.stringify({
      route: routes.ocm.component.base,
      fetchParams: normaliseObject(params),
    }),
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
    errorMessage: 'Unable to fetch artefact metadata',
    cacheKey: JSON.stringify({
      route: routes.artefacts.queryMetadata,
      fetchParams: normaliseObject(params),
    }),
  })
}


const useFetchServiceExtensions = () => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return serviceExtensionsFeature?.isAvailable
  }, [serviceExtensionsFeature])

  return _useFetch({
    fetchFunction: serviceExtensions.services,
    fetchCondition: fetchCondition,
    errorMessage: 'Service extensions could not be fetched',
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
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return serviceExtensionsFeature?.isAvailable
  }, [serviceExtensionsFeature])

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
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return serviceExtensionsFeature?.isAvailable
  }, [serviceExtensionsFeature])

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


const useFetchScanConfigurations = () => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return serviceExtensionsFeature?.isAvailable
  }, [serviceExtensionsFeature])

  return _useFetch({
    fetchFunction: serviceExtensions.scanConfigurations,
    fetchCondition: fetchCondition,
    errorMessage: 'Scan configurations could not be fetched',
    cacheKey: JSON.stringify({
      route: routes.serviceExtensions.scanConfigurations(),
    }),
  })
}


const useFetchBacklogItems = ({
  service,
  cfgName,
  skipCache = false,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [serviceExtensionsFeature, setServiceExtensionsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SERVICE_EXTENSIONS,
      callback: ({feature}) => setServiceExtensionsFeature(feature),
    })
  }, [featureRegistrationContext])

  const fetchCondition = React.useCallback(() => {
    return serviceExtensionsFeature?.isAvailable
  }, [serviceExtensionsFeature])

  const params = React.useMemo(() => ({
    service,
    cfgName,
  }), [
    service,
    cfgName,
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
  ocmRepo,
}) => {
  const params = React.useMemo(() => ({
    componentName,
    componentVersion,
    ocmRepo,
  }), [
    componentName,
    componentVersion,
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
  useFetchScanConfigurations,
  useFetchBacklogItems,
  useFetchDoraMetrics,
}
