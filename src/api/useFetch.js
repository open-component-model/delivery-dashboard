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
} from '../api'
import {
  errorSnackbarProps,
  features,
} from '../consts'
import { FeatureRegistrationContext } from '../App'

import { registerCallbackHandler } from '../feature'


const useFetchUpgradePRs = ({
  componentName,
  state,
}) => {
  const [prs, setPRs] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState()

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    const fetchUpgradePrs = async (componentName, state) => {
      try {
        const prs = await components.upgradePullRequests({
          componentName,
          state,
        })
        if (mounted) {
          setPRs(prs)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Pull Requests could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchUpgradePrs(componentName, state),
          }
        )
      }
    }
    fetchUpgradePrs(componentName, state)
    return () => {
      mounted = false
    }
  }, [
    componentName,
    state,
    enqueueSnackbar,
  ])

  return [prs, isLoading, isError]
}

const useFetchCompDiff = ({
  leftName,
  leftVersion,
  rightName,
  rightVersion,
}) => {
  const [diff, setDiff] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState()

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    setIsLoading(true)
    const fetchComponentDiff = async () => {
      try {
        const localDiff = await components.diff(
          {name: leftName, version: leftVersion},
          {name: rightName, version: rightVersion},
        )
        setDiff(localDiff)
        setIsLoading(false)
        setIsError(false)

      } catch (error) {
        setIsLoading(false)
        setIsError(true)

        enqueueSnackbar(
          `Pull Request Diff from '${leftVersion}' to '${rightVersion}' for '${leftName}' could not b
          e fetched.`,
          {
            ...errorSnackbarProps,
            // TODO: add error details
            onRetry: () => fetchComponentDiff(),
          }
        )
      }
    }
    fetchComponentDiff()
  }, [leftName, leftVersion, rightName, rightVersion, enqueueSnackbar])

  return [diff, isLoading, isError]
}

const useFetchCurrentSprintInfos = () => {
  const [sprintInfos, setSprintInfos] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const {enqueueSnackbar} = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    const fetchCurrentSprintInfos = async () => {
      try {
        if (mounted) {
          setSprintInfos(await deliverySprintInfosCurrent())
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Current sprint infos could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchCurrentSprintInfos(),
          }
        )
      }
    }
    fetchCurrentSprintInfos()
    return () => {
      mounted = false
    }
  }, [enqueueSnackbar])

  return [sprintInfos, isLoading, isError]
}

const useFetchComplianceSummary = ({
  componentName,
  componentVersion,
  ocmRepo,
  enableCache,
}) => {
  const [complianceSummary, setComplianceSummary] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DELIVERY_DB,
      callback: ({feature}) => setDeliveryDbFeature(feature),
    })
  }, [featureRegistrationContext])

  const isAvailable = deliveryDbFeature && deliveryDbFeature.isAvailable

  React.useEffect(() => {
    let mounted = true

    const fetchComplianceSummary = async ({componentName, componentVersion, ocmRepo, enableCache}) => {
      try {
        const _complianceSummary = await components.complianceSummary({
          componentName,
          componentVersion,
          ocmRepo,
          enableCache,
        })

        if (mounted) {
          setComplianceSummary(_complianceSummary)
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Compliance Summary could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchComplianceSummary({componentName, componentVersion, ocmRepo, enableCache}),
          }
        )
      }
    }
    if (isAvailable)
      fetchComplianceSummary({componentName, componentVersion, ocmRepo, enableCache})
    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, componentName, componentVersion, ocmRepo, enableCache, isAvailable])

  return [complianceSummary, isLoading, isError]
}

const useFetchSpecialComponentCurrentDependencies = (component) => {
  const [dependencies, setDependencies] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)

  const [locked, setLocked] = React.useState(false)

  const {enqueueSnackbar} = useSnackbar()

  React.useEffect(() => {
    const fetchSpecialComponentDependencies = async (component) => {
      try {
        const fetchedDependencies = await specialComponentCurrentDependencies(component)
        setDependencies(fetchedDependencies)
        setIsLoading(false)
        setIsError(false)

      } catch (error) {
        setIsError(true)
        setIsLoading(false)

        enqueueSnackbar(
          'Special component dependencies could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchSpecialComponentDependencies(component),
          }
        )
      }
    }

    if (locked) return
    setLocked(true)
    fetchSpecialComponentDependencies(component)

  }, [locked, component, dependencies, enqueueSnackbar])

  return [dependencies, isLoading, isError]
}

const useFetchComponentDescriptor = ({
  componentName,
  ocmRepoUrl,
  version,
  versionFilter,
}) => {
  const [componentDescriptor, setComponentDescriptor] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState()

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    setIsError(false)
    setIsLoading(true)

    const fetchComponentDescriptor = async (
      componentName,
      ocmRepoUrl,
      version,
      versionFilter,
    ) => {
      try {
        const _componentDescriptor = await components.cnudieComponent({
          componentName,
          ocmRepoUrl,
          version,
          versionFilter,
        })

        if (mounted) {
          setComponentDescriptor(_componentDescriptor)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setError(error.toString())
          setIsLoading(false)

          enqueueSnackbar(
            `Component "${componentName}" could not be fetched`,
            {
              ...errorSnackbarProps,
              details: error.toString(),
              onRetry: () => fetchComponentDescriptor(
                componentName,
                ocmRepoUrl,
                version,
                versionFilter,
              ),
            }
          )
        }
      }
    }
    fetchComponentDescriptor(componentName, ocmRepoUrl, version, versionFilter)

    return () => {
      mounted = false
    }
  }, [componentName, ocmRepoUrl, version, versionFilter, enqueueSnackbar])
  return [componentDescriptor, isLoading, isError, error]
}

const useFetchBom = (component, ocmRepo, populate) => {
  const [componentBom, setComponentBom] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState()
  const [error, setError] = React.useState()

  const [locked, setLocked] = React.useState(false)

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    const fetchComponents = async () => {
      try {
        const localComponentBom = await components.componentDependencies(
          component.name,
          component.version,
          ocmRepo,
          populate,
        )
        setComponentBom(localComponentBom)
        setIsLoading(false)
        setIsError(false)

      } catch (error) {
        setError(error)
        setIsError(true)
        setIsLoading(false)

        enqueueSnackbar(
          `Component "${component.name}" could not be fetched`,
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchComponents(),
          }
        )
      }
    }

    if (locked) return
    setLocked(true)
    fetchComponents()

  }, [componentBom, locked, component, ocmRepo, populate, enqueueSnackbar])

  return [componentBom, isLoading, isError, error]
}


const useFetchQueryMetadata = ({
  components,
  types,
  referenced_types,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

  const [artefactMetadata, setArtefactMetadata] = React.useState()
  const [isError, setIsError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState()

  const [isFetching, setIsFetching] = React.useState(false)

  const [deliveryDbFeature, setDeliveryDbFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.DELIVERY_DB,
      callback: ({feature}) => setDeliveryDbFeature(feature),
    })
  }, [featureRegistrationContext])

  const isAvailable = deliveryDbFeature && deliveryDbFeature.isAvailable

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    const fetchQueryMetadata = async ({components, types, referenced_types}) => {
      try {
        const _artefactMetadata = await artefactsQueryMetadata({
          components,
          types,
          referenced_types,
        })

        setArtefactMetadata(_artefactMetadata)
        setIsError(false)
        setIsLoading(false)
      } catch (error) {
        setIsError(true)
        setError(error.toString())

        setIsLoading(false)

        enqueueSnackbar(
          'Unable to fetch artefact metadata',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchQueryMetadata({components, types, referenced_types}),
          }
        )
      }
    }

    if (isAvailable && !isFetching) {
      setIsFetching(true)
      fetchQueryMetadata({components, types, referenced_types})
    }
  }, [components, types, referenced_types, enqueueSnackbar, isAvailable, isFetching])

  return [artefactMetadata, isLoading, isError, error]
}


const clearIntervalFromRef = (ref) => {
  clearInterval(ref.current)
  ref.current = null
}


const useFetchComponentResponsibles = ({
  componentName,
  componentVersion,
  ocmRepo,
}) => {
  const [responsibleData, setResponsibleData] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const retryInterval = React.useRef()

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true

    clearIntervalFromRef(retryInterval)

    const fetchResponsibleData = async (componentName, componentVersion, ocmRepo) => {
      try {
        const _responsibleData = await components.componentResponsibles(
          componentName,
          componentVersion,
          ocmRepo,
        )

        if (mounted && _responsibleData === API_RESPONSES.RETRY && !retryInterval.current) {
          retryInterval.current = setInterval(
            () => fetchResponsibleData(componentName, componentVersion, ocmRepo),
            5000,
          )
          return
        }

        if (mounted && _responsibleData !== API_RESPONSES.RETRY) {
          setResponsibleData(_responsibleData)
          setIsError(false)
          setIsLoading(false)
          clearIntervalFromRef(retryInterval)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Responsible Data could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchResponsibleData(componentName, componentVersion, ocmRepo),
          }
        )
      }
    }

    fetchResponsibleData(componentName, componentVersion, ocmRepo)

    return () => {
      mounted = false
      clearIntervalFromRef(retryInterval)
    }
  }, [enqueueSnackbar, componentName, componentVersion, ocmRepo])

  return [responsibleData, isLoading, isError]
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

  const isAvailable = serviceExtensionsFeature?.isAvailable

  const [services, setServices] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true

    const fetchServiceExtensions = async () => {
      try {
        const _services = await serviceExtensions.services()

        if (mounted) {
          setServices(_services)
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Service extensions could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchServiceExtensions(),
          }
        )
      }
    }

    if (isAvailable) {
      fetchServiceExtensions()
    }

    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, isAvailable])

  return [services, isLoading, isError, setServices]
}


const useFetchLogCollections = ({
  service,
  logLevel,
  useCache,
  refresh,
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

  const isAvailable = serviceExtensionsFeature?.isAvailable

  const [logCollections, setLogCollections] = React.useState()
  const [isError, setIsError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)

    const fetchLogCollections = async ({service, logLevel, useCache}) => {
      try {
        const _logCollections = await serviceExtensions.logCollections({service, logLevel, useCache})

        if (mounted) {
          setLogCollections(_logCollections)
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          `Log collection for service ${service} and log level ${logLevel} could not be fetched`,
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchLogCollections({service, logLevel, useCache}),
          }
        )
      }
    }

    if (isAvailable) {
      fetchLogCollections({service, logLevel, useCache})
    }

    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, isAvailable, service, logLevel, useCache, refresh])

  return [logCollections, isLoading, isError, setLogCollections]
}


const useFetchContainerStatuses = ({
  service,
  useCache,
  refresh,
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

  const isAvailable = serviceExtensionsFeature?.isAvailable

  const [containerStatuses, setContainerStatuses] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)

    const fetchContainerStatuses = async ({service, useCache}) => {
      try {
        const _containerStatus = await serviceExtensions.containerStatuses({service, useCache})

        if (mounted) {
          setContainerStatuses(_containerStatus)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false)
        }
        enqueueSnackbar(
          `Container statuses for service ${service} could not be fetched`,
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchContainerStatuses({service, useCache}),
          }
        )
      }
    }

    if (isAvailable) {
      fetchContainerStatuses({service, useCache})
    }

    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, isAvailable, service, useCache, refresh])

  return [containerStatuses, isLoading]
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

  const isAvailable = serviceExtensionsFeature?.isAvailable

  const [scanConfigurations, setScanConfigurations] = React.useState()
  const [isError, setIsError] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true

    const fetchScanConfigurations = async () => {
      try {
        const _scanConfigurations = await serviceExtensions.scanConfigurations()

        if (mounted) {
          setScanConfigurations(_scanConfigurations)
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Scan configurations could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchScanConfigurations(),
          }
        )
      }
    }

    if (isAvailable) {
      fetchScanConfigurations()
    }

    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, isAvailable])

  // in case service extensions feature is not available, disable loading indicator
  return [scanConfigurations, isAvailable ? isLoading : false, isError]
}


const useFetchBacklogItems = ({
  service,
  cfgName,
  refresh,
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

  const isAvailable = serviceExtensionsFeature?.isAvailable

  const [backlogItems, setBacklogItems] = React.useState()
  const [isError, setIsError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)

    const fetchBacklogItems = async ({service, cfgName}) => {
      try {
        const _backlogItems = await serviceExtensions.backlogItems.get({
          service,
          cfgName,
        })

        if (mounted) {
          setBacklogItems(_backlogItems)
          setIsError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setIsError(true)
          setIsLoading(false)
        }
        enqueueSnackbar(
          'Backlog items could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchBacklogItems({service, cfgName}),
          }
        )
      }
    }

    if (isAvailable) {
      fetchBacklogItems({service, cfgName})
    }

    return () => {
      mounted = false
    }
  }, [enqueueSnackbar, isAvailable, service, cfgName, refresh])

  return [backlogItems, isLoading, isError, setBacklogItems]
}


const useFetchDoraMetrics = ({
  targetComponentName,
  filterComponentNames,
  timeSpanDays,
}) => {
  const [doraMetrics, setDoraMetrics] = React.useState()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)
  const retryInterval = React.useRef()

  const { enqueueSnackbar } = useSnackbar()

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setIsError(false)

    clearIntervalFromRef(retryInterval)

    const fetchDoraMetrics = async ({targetComponentName, filterComponentNames, timeSpanDays}) => {
      try {
        const _doraMetrics = await dora.doraMetrics({
          targetComponentName,
          filterComponentNames,
          timeSpanDays,
        })

        if (mounted && _doraMetrics === API_RESPONSES.RETRY && !retryInterval.current) {
          setDoraMetrics()
          retryInterval.current = setInterval(
            () => fetchDoraMetrics({targetComponentName, filterComponentNames, timeSpanDays}),
            5000,
          )
          return
        }

        if (mounted && _doraMetrics !== API_RESPONSES.RETRY) {
          setDoraMetrics(_doraMetrics)
          setIsLoading(false)
          setIsError(false)
          clearIntervalFromRef(retryInterval)
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false)
          setIsError(true)
        }
        enqueueSnackbar(
          `Dora metrics for component ${targetComponentName} could not be fetched`,
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchDoraMetrics({targetComponentName, filterComponentNames, timeSpanDays}),
          }
        )
      }
      setIsLoading(false)
    }

    fetchDoraMetrics({targetComponentName, filterComponentNames, timeSpanDays})

    return () => {
      mounted = false
      clearIntervalFromRef(retryInterval)
    }
  }, [enqueueSnackbar, targetComponentName, filterComponentNames, timeSpanDays])

  return [doraMetrics, isLoading, isError]
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
