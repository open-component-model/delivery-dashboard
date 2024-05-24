import PropTypes from 'prop-types'

import urljoin from 'url-join'

import { addMetadata } from './complianceData'
import { appendPresentParams } from './util'


export const API_RESPONSES = {
  RETRY: 'retry',
}
Object.freeze(API_RESPONSES)


const apiCache = {}
const serveFromCache = (requestId) => {
  if (apiCache[requestId]) {
    return apiCache[requestId]
  }

  return null
}

const updateCache = (requestId, data) => {
  apiCache[requestId] = data
}


const API_PREFIX =
  // eslint-disable-next-line no-undef
  window.REACT_APP_DELIVERY_SERVICE_API_URL ||
  // eslint-disable-next-line no-undef
  process.env.REACT_APP_DELIVERY_SERVICE_API_URL

const api = (path) => {
  return urljoin(API_PREFIX, path)
}

const withAuth = async (url, config) => {
  const cfg = {
    ...config,
    credentials: 'include',
  }
  return fetch(url, cfg)
}

const _toJson = async (responsePromise) => {
  const resp = await responsePromise
  if (!resp.ok) throw Error(resp.statusText)
  return await resp.json()
}


export const routes = {
  auth: {
    base: api('auth'),
    configs: () => `${routes.auth.base}/configs`,
    logout: () => `${routes.auth.base}/logout`,
  },
  features: api('features'),
  artefacts: {
    queryMetadata: api('artefacts/query-metadata'),
  },
  os: {
    branches: (name) => api(`os/${name}/branches`),
  },
  cnudie: {
    component: {
      base: api('cnudie/component'),
      dependencies: () => `${routes.cnudie.component.base}/dependencies`,
      versions: () => `${routes.cnudie.component.base}/versions`,
      responsibles: () => `${routes.cnudie.component.base}/responsibles`,
    }
  },
  components: {
    base: api('components'),
    complianceSummary: () => `${routes.components.base}/compliance-summary`,
    diff: () => `${routes.components.base}/diff`,
  },
  component: (name) => `${routes.components.base}/${name}`,
  upgradePullRequests: () =>
    `${routes.components.base}/upgrade-prs`,
  downloadTestResults: () =>
    `${routes.components.base}/tests`,
  delivery: {
    sprintInfos: {
      current: api('delivery/sprint-infos/current')
    }
  },
  rescore: api('rescore'),
  specialComponent: {
    currentDependencies: api('/special-component/current-dependencies')
  },
  serviceExtensions: {
    base: api('service-extensions'),
    logCollections: () => `${routes.serviceExtensions.base}/log-collections`,
    containerStatuses: () => `${routes.serviceExtensions.base}/container-statuses`,
    scanConfigurations: () => `${routes.serviceExtensions.base}/scan-configurations`,
    backlogItems: () => `${routes.serviceExtensions.base}/backlog-items`,
  },
  ocm: {
    artefactsBlob: api('/ocm/artefacts/blob')
  },
  dora: {
    base: api('dora'),
    doraMetrics: () => `${routes.dora.base}/dora-metrics`,
  },
}

const features = async () => {
  const url = new URL(routes.features)

  return (await _toJson(fetch(url))).features
}

const cnudieComponent = async ({
  componentName,
  ocmRepoUrl,
  version,
  versionFilter,
}) => {
  const url = new URL(routes.cnudie.component.base)
  appendPresentParams(url, {
    component_name: componentName,
    ocm_repo_url: ocmRepoUrl,
    version: version,
    version_filter: versionFilter,
  })

  const resp = await fetch(url)

  if (!resp.ok) {
    const statusBody = await resp.json()
    throw Error(`${statusBody.description}`)
  }

  return await resp.json()
}

/**
 * Parameters:
 * - componentName : specify component:name
 * - version       : specify component:version
 * - ocmRepoUrl    : ocm repo context of component
 * - populate      : population strategy, one of (all, componentReferences)
 */
const cnudieComponentDependencies = async (componentName, version, ocmRepoUrl, populate) => {
  const url = new URL(routes.cnudie.component.dependencies())
  appendPresentParams(url, {
    component_name: componentName,
    version: version,
    ocm_repo_url: ocmRepoUrl,
    populate: populate,
  })

  const requestId = `cnudieComponentDependencies:${componentName}:${version}:${ocmRepoUrl}:${populate}`
  if (serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const resp = await fetch(url)

  if (!resp.ok) {
    const status_text = resp.statusText
    const status_body = await resp.json()
    throw Error(`${status_text} - ${status_body.title}`)
  }

  const result = await resp.json()
  updateCache(requestId, result)
  return result
}
cnudieComponentDependencies.propTypes = {
  componentName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  ocmRepoUrl: PropTypes.string,
  populate: PropTypes.string.isRequired,
}

const cnudieComponentResponsibles = async (componentName, version, ocmRepoUrl) => {
  const url = new URL(routes.cnudie.component.responsibles())
  appendPresentParams(url, {
    component_name: componentName,
    version: version,
    ocm_repo_url: ocmRepoUrl,
  })

  const requestId = `cnudieComponentResponsibles:${componentName}:${version}:${ocmRepoUrl}`
  if (serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const result = await fetch(url)
  if (result.status === 202) return API_RESPONSES.RETRY // caller is supposed to retry

  const json = _toJson(result)
  updateCache(requestId, json)
  return json
}

const cnudieComponentVersions = async ({
  componentName,
  ocmRepoUrl,
  max = 5,
  version,
  versionFilter,
}) => {
  const url = new URL(routes.cnudie.component.versions())
  appendPresentParams(url, {
    component_name: componentName,
    ocm_repo_url: ocmRepoUrl,
    max: max,
    version: version,
    version_filter: versionFilter,
  })

  return await _toJson(fetch(url))
}


const componentUpgradePRs = async ({
  componentName,
  state,
}) => {
  const url = new URL(routes.upgradePullRequests())
  appendPresentParams(url, {
    componentName,
    state,
  })

  const requestId = `componentUpgradePRs:${url}`
  if (serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const resp = await fetch(url)
  if (!resp.ok) throw Error(resp.statusText)

  const result = await resp.json()
  updateCache(requestId, result)
  return result
}

const fetchJoke = async () => {
  const url = new URL(
    'https://sv443.net/jokeapi/v2/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist'
  )
  return await _toJson(fetch(url))
}

/**
 * @param leftComponent: {name: componentName, version: version}
 * @param rightComponent: {name: componentName, version: version}
 */
const componentsDiff = async (leftComponent, rightComponent) => {
  const route = routes.components.diff()
  if (!leftComponent) throw new Error('leftComponent must be passed')
  if (!rightComponent) throw new Error('rightComponent must be passed')

  return await _toJson(
    fetch(route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        left_component: leftComponent,
        right_component: rightComponent,
      }),
    })
  )
}

const componentsComplianceSummary = async ({
  componentName,
  componentVersion,
  ocmRepo,
  enableCache,
}) => {
  const url = new URL(routes.components.complianceSummary())
  appendPresentParams(url, {
    component_name: componentName,
    version: componentVersion,
    ocm_repo_url: ocmRepo,
  })

  const requestId = `componentsComplianceSummary:${componentName}:${componentVersion}:${ocmRepo}`
  if (enableCache && serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const resp = await fetch(url)

  if (!resp.ok) {
    const status_text = resp.statusText
    const status_body = await resp.json()
    throw Error(`${status_text} - ${status_body.title}`)
  }

  const result = await resp.json()
  updateCache(requestId, result)
  return result
}


const artefactsQueryMetadata = async ({
  components,
  types,
  referenced_types,
}) => {
  const url = new URL(routes.artefacts.queryMetadata)
  types?.map((type) => appendPresentParams(url, {type}))
  referenced_types?.map((referenced_type) => appendPresentParams(url, {referenced_type}))

  const _components = components.map((component) => {
    return {
      componentName: component.name,
      componentVersion: component.version,
    }
  })

  const artefactMetadata = await _toJson(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        components: _components,
      }),
    })
  )

  return await Promise.all(artefactMetadata.map(addMetadata))
}

/**
 * Retrieves Promise from fetching os branch information.
 * null if no information is available.
 *
 * @param {String} name
 * @returns {(Promise|null)}
 */
const osBranches = async (name) => {
  const route = routes.os.branches(name)

  const resp = await fetch(route, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 404 is a valid case, as there could be no branch os information.
  // Temporarily, 400 instead of 404 is returned.
  // TODO: 400 should raise an expception (once adjusted in service)
  if ([400, 404].includes(resp.status)) return null
  if (!resp.ok) throw Error(resp.statusText)
  return await resp.json()
}

const specialComponentCurrentDependencies = async (component) => {
  const url = new URL(routes.specialComponent.currentDependencies)
  appendPresentParams(url, {component_name: component.name})

  const requestId = `specialComponentCurrentDependencies:${component.name}`
  if (serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const resp = await fetch(url)

  if (!resp.ok) throw Error(resp.statusText)

  const result = await resp.json()
  updateCache(requestId, result)
  return result
}

const deliverySprintInfosCurrent = async () => {
  const url = new URL(routes.delivery.sprintInfos.current)

  const requestId = `deliverySprintInfosCurrent:${url}`
  if (serveFromCache(requestId)) {
    return serveFromCache(requestId)
  }

  const resp = await fetch(url)
  if (!resp.ok) throw Error(resp.statusText)

  const result = await resp.json()
  updateCache(requestId, result)
  return result
}


const rescore = {
  get: async ({
    componentName,
    componentVersion,
    artefactKind,
    artefactName,
    artefactVersion,
    artefactType,
    artefactExtraId,
    cveRescoringRuleSetName,
    types,
  }) => {
    const url = new URL(routes.rescore)
    appendPresentParams(url, {
      componentName,
      componentVersion,
      artefactKind,
      artefactName,
      artefactVersion,
      artefactType,
      artefactExtraId: JSON.stringify(artefactExtraId),
      cveRescoringRuleSetName,
    })
    types?.map((type) => appendPresentParams(url, {type}))

    return await _toJson(fetch(url))
  },
  create: async ({rescorings}) => {
    const url = new URL(routes.rescore)

    const resp = await withAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rescorings),
    })

    if (!resp.ok) {
      const content = await resp.json()

      if (content.title)
        throw Error(content.title)

      throw Error(resp.statusText)
    }

    return true
  },
  delete: async ({id}) => {
    const url = new URL(routes.rescore)
    appendPresentParams(url, {id})

    const resp = await withAuth(url, {
      method: 'DELETE',
    })

    if (!resp.ok) throw Error(resp.statusText)

    return true
  },
}


const components = {
  diff: componentsDiff,
  complianceSummary: componentsComplianceSummary,
  upgradePullRequests: componentUpgradePRs,
  cnudieComponent: cnudieComponent,
  componentDependencies: cnudieComponentDependencies,
  componentResponsibles: cnudieComponentResponsibles,
  lastVersions: cnudieComponentVersions,
}

const auth = {
  authConfigs: async () => {
    const resp = await fetch(routes.auth.configs())
    const body = await resp.json()

    if (!resp.ok) {
      const statusText = resp.statusText
      throw Error(`${statusText} - ${JSON.stringify(body)}`)
    }

    return body
  },
  auth: async ({code, clientId, accessToken, apiUrl}) => {
    const authUrl = new URL(routes.auth.base)
    appendPresentParams(authUrl, {
      code: code,
      client_id: clientId,
      access_token: accessToken,
      api_url: apiUrl,
    })

    return await _toJson(withAuth(authUrl))
  },
  logout: async () => {
    const resp = await withAuth(routes.auth.logout())
    if (!resp.ok) {
      throw Error(resp.statusText)
    }
  },
}

const serviceExtensions = {
  services: async () => {
    const url = new URL(routes.serviceExtensions.base)

    const requestId = 'serviceExtensionsServices'
    if (serveFromCache(requestId)) {
      return serveFromCache(requestId)
    }

    const resp = await fetch(url)

    if (!resp.ok) throw Error(resp.statusText)

    const result = await resp.json()
    updateCache(requestId, result)

    return result?.sort()
  },
  logCollections: async ({service, logLevel, useCache}) => {
    const url = new URL(routes.serviceExtensions.logCollections())
    appendPresentParams(url, {
      service: service,
      log_level: logLevel,
    })

    const requestId = 'serviceExtensionsLogCollection'
    // only store in cache for unspecified service to enable manual
    // refresh on service monitoring page
    if (useCache && serveFromCache(requestId)) {
      return serveFromCache(requestId)
    }

    const resp = await fetch(url)

    if (!resp.ok) throw Error(resp.statusText)

    const result = await resp.json()
    if (useCache) {
      updateCache(requestId, result)
    }

    return result
  },
  containerStatuses: async ({service, useCache}) => {
    const url = new URL(routes.serviceExtensions.containerStatuses())
    appendPresentParams(url, {service})

    const requestId = 'serviceExtensionsContainerStatuses'
    // only store in cache for unspecified service to enable manual
    // refresh on service monitoring page
    if (useCache && serveFromCache(requestId)) {
      return serveFromCache(requestId)
    }

    const resp = await fetch(url)

    if (!resp.ok) throw Error(resp.statusText)

    const result = await resp.json()
    if (useCache) {
      updateCache(requestId, result)
    }

    return result
  },
  scanConfigurations: async () => {
    const url = new URL(routes.serviceExtensions.scanConfigurations())

    const requestId = 'serviceExtensionsScanConfigurations'
    if (serveFromCache(requestId)) {
      return serveFromCache(requestId)
    }

    const resp = await fetch(url)

    if (!resp.ok) throw Error(resp.statusText)

    const result = await resp.json()
    updateCache(requestId, result)

    return result
  },
  backlogItems: {
    get: async ({service, cfgName}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      appendPresentParams(url, {
        service: service,
        cfg_name: cfgName,
      })

      const resp = await withAuth(url)

      if (!resp.ok) throw Error(resp.statusText)

      return await resp.json()
    },
    create: async ({service, cfgName, priority, artefacts}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      appendPresentParams(url, {
        service: service,
        cfg_name: cfgName,
        priority: priority,
      })

      const resp = await withAuth(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({artefacts}),
      })
  
      if (!resp.ok) throw Error(resp.statusText)
  
      return true
    },
    update: async ({name, spec}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      appendPresentParams(url, {name})

      const resp = await withAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({spec}),
      })

      if (!resp.ok) throw Error(resp.statusText)

      return true
    },
    delete: async ({names}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      names.map((name) => appendPresentParams(url, {name}))

      const resp = await withAuth(url, {
        method: 'DELETE',
      })

      if (!resp.ok) throw Error(resp.statusText)

      return true
    },
  },
}


const dora = {
  doraMetrics: async ({
    targetComponentName,
    filterComponentNames,
    timeSpanDays,
  }) => {
    const url = new URL(routes.dora.doraMetrics())
    appendPresentParams(url, {
      target_component_name: targetComponentName,
      time_span_days: timeSpanDays,
    })
    filterComponentNames?.map((name) => appendPresentParams(url, {
      filter_component_names: name,
    }))

    const requestId = `doraMetrics:${url}`
    if (serveFromCache(requestId)) {
      return serveFromCache(requestId)
    }

    const resp = await fetch(url)
    if (resp.status === 202) return API_RESPONSES.RETRY // caller is supposed to retry

    if (!resp.ok) throw Error(resp.statusText)

    const result = await resp.json()
    updateCache(requestId, result)

    return result
  },
}

export {
  auth,
  features,
  components,
  specialComponentCurrentDependencies,
  fetchJoke,
  artefactsQueryMetadata,
  osBranches,
  deliverySprintInfosCurrent,
  rescore,
  serviceExtensions,
  dora,
}
