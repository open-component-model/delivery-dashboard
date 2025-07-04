import PropTypes from 'prop-types'

import urljoin from 'url-join'
import { enqueueSnackbar } from 'notistack'

import {
  appendPresentParams,
  isTokenExpired,
} from './util'
import {
  ACCEPTED_JWT_VERSIONS,
  copyNotificationCfg,
  TOKEN_KEY,
} from './consts'


export const API_RESPONSES = {
  RETRY: 'retry',
}
Object.freeze(API_RESPONSES)

const API_PREFIX =
  window.REACT_APP_DELIVERY_SERVICE_API_URL
  // eslint-disable-next-line no-undef
  || process.env.REACT_APP_DELIVERY_SERVICE_API_URL

const api = (path) => {
  return urljoin(API_PREFIX, path)
}


const refreshToken = async () => {
  await navigator.locks.request('token-refresh-request', async () => {
    const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

    if (!token) {
      // this is the case if another request has also triggered a token refresh but the request token
      // has expired and thus the token was removed and the user was logged-out -> nothing to do here
      return
    }

    if (ACCEPTED_JWT_VERSIONS.includes(token.version) && !isTokenExpired(token)) {
      // this is the case if another request has also triggered a token refresh and the token has
      // already been updated -> nothing to do here
      return
    }

    const resp = await fetch(routes.auth.refresh(), {
      method: 'POST',
      credentials: 'include',
    })

    // if the token refresh fails with 401, it means the refresh token is not valid anymore and the
    // user has to re-authenticate
    if (resp.status === 401) {
      enqueueSnackbar('Session expired, please login again', copyNotificationCfg)
      localStorage.removeItem(TOKEN_KEY)
      dispatchEvent(new Event('token'))
      return
    }

    const session_jwt = await _toJson(resp)
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session_jwt))
  })
}


const withAuth = async (url, config) => {
  const cfg = {
    ...config,
    credentials: 'include',
  }
  const resp = await fetch(url, cfg)

  // if the user is logged in but the server responds 401, it means the credentials are not valid
  // anymore -> try to refresh
  if (resp.status === 401) {
    await refreshToken()
    return await fetch(url, cfg)
  }

  return resp
}


const raiseIfNotOk = async (resp) => {
  if (resp.ok) return resp

  const statusText = resp.statusText
  const statusBody = await resp.text()

  throw Error(`${statusText} - ${statusBody}`)
}


const _toJson = async (
  responsePromise,
  absentOk=false,
) => {
  const resp = await responsePromise

  if (resp.status === 404 && absentOk) return null
  if (resp.status === 401) return null // if a 401 is returned, login is re-opened anyways

  await raiseIfNotOk(resp)

  return await resp.json()
}


export const routes = {
  auth: {
    base: api('auth'),
    configs: () => `${routes.auth.base}/configs`,
    refresh: () => `${routes.auth.base}/refresh`,
    logout: () => `${routes.auth.base}/logout`,
    rbac: () => `${routes.auth.base}/rbac`,
    user: () => `${routes.auth.base}/user`,
  },
  features: api('features'),
  profiles: api('profiles'),
  artefacts: {
    queryMetadata: api('artefacts/metadata/query'),
  },
  os: {
    branches: (name) => api(`os/${name}/branches`),
  },
  ocm: {
    component: {
      base: api('ocm/component'),
      dependencies: () => `${routes.ocm.component.base}/dependencies`,
      versions: () => `${routes.ocm.component.base}/versions`,
      responsibles: () => `${routes.ocm.component.base}/responsibles`,
    },
    artefactsBlob: api('/ocm/artefacts/blob'),
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
    backlogItems: () => `${routes.serviceExtensions.base}/backlog-items`,
  },
  dora: {
    base: api('dora'),
    doraMetrics: () => `${routes.dora.base}/dora-metrics`,
  },
}

const features = async ({profile}) => {
  const url = new URL(routes.features)
  appendPresentParams(url, {profile})

  return (await _toJson(withAuth(url))).features
}

const profiles = async () => {
  const url = new URL(routes.profiles)

  return (await _toJson(await fetch(url))).profiles
}

const ocmComponent = async ({
  componentName,
  ocmRepoUrl,
  version,
  versionFilter,
  raw=false,
  absentOk=false,
}) => {
  const url = new URL(routes.ocm.component.base)
  appendPresentParams(url, {
    component_name: componentName,
    ocm_repo_url: ocmRepoUrl,
    version: version,
    version_filter: versionFilter,
    raw: raw,
  })

  return await _toJson(withAuth(url), absentOk)
}


const ocmComponentDependencies = async ({
  componentName,
  componentVersion,
  ocmRepoUrl,
  populate,
}) => {
  const url = new URL(routes.ocm.component.dependencies())
  appendPresentParams(url, {
    component_name: componentName,
    version: componentVersion,
    ocm_repo_url: ocmRepoUrl,
    populate: populate,
  })

  return await _toJson(withAuth(url))
}
ocmComponentDependencies.propTypes = {
  componentName: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  ocmRepoUrl: PropTypes.string,
  populate: PropTypes.string.isRequired,
}

const ocmComponentResponsibles = async ({
  componentName,
  componentVersion,
  artefactName,
  ocmRepo,
}) => {
  const url = new URL(routes.ocm.component.responsibles())
  appendPresentParams(url, {
    component_name: componentName,
    version: componentVersion,
    artifact_name: artefactName,
    ocm_repo_url: ocmRepo,
  })

  const result = await withAuth(url)
  if (result.status === 202) return API_RESPONSES.RETRY // caller is supposed to retry
  if (result.status === 404) return {responsibles: []}

  return _toJson(result)
}

const ocmComponentVersions = async ({
  componentName,
  ocmRepoUrl,
  max = 5,
  version,
  versionFilter,
}) => {
  const url = new URL(routes.ocm.component.versions())
  appendPresentParams(url, {
    component_name: componentName,
    ocm_repo_url: ocmRepoUrl,
    max: max,
    version: version,
    version_filter: versionFilter,
  })

  return await _toJson(withAuth(url))
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

  return await _toJson(withAuth(url))
}

const fetchJoke = async () => {
  const url = new URL(
    'https://sv443.net/jokeapi/v2/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist'
  )
  return await _toJson(withAuth(url))
}

/**
 * @param leftComponent: {name: componentName, version: version}
 * @param rightComponent: {name: componentName, version: version}
 */
const componentsDiff = async ({
  leftComponent,
  rightComponent,
}) => {
  const route = routes.components.diff()
  if (!leftComponent) throw new Error('leftComponent must be passed')
  if (!rightComponent) throw new Error('rightComponent must be passed')

  return await _toJson(
    withAuth(route, {
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
  recursionDepth,
  profile,
  headers,
}) => {
  const url = new URL(routes.components.complianceSummary())
  appendPresentParams(url, {
    component_name: componentName,
    version: componentVersion,
    ocm_repo_url: ocmRepo,
    recursion_depth: recursionDepth,
    profile: profile,
  })

  return await _toJson(withAuth(url, {
    headers,
  }))
}


const artefactsQueryMetadata = async ({
  artefacts,
  types,
  referenced_types,
}) => {
  const url = new URL(routes.artefacts.queryMetadata)
  types?.map((type) => appendPresentParams(url, {type}))
  referenced_types?.map((referenced_type) => appendPresentParams(url, {referenced_type}))

  const entries = {
    entries: artefacts,
  }

  const artefactMetadata = await _toJson(
    withAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entries),
    })
  )

  return artefactMetadata
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

  const resp = await withAuth(route, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 404 is a valid case, as there could be no branch os information.
  // Temporarily, 400 instead of 404 is returned.
  // TODO: 400 should raise an expception (once adjusted in service)
  if ([400, 404].includes(resp.status)) return null

  return _toJson(resp)
}

const specialComponentCurrentDependencies = async ({id}) => {
  const url = new URL(routes.specialComponent.currentDependencies)
  appendPresentParams(url, {id})

  return await _toJson(await withAuth(url))
}

const deliverySprintInfosCurrent = async () => {
  const url = new URL(routes.delivery.sprintInfos.current)

  return await _toJson(withAuth(url))
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

    return await _toJson(withAuth(url))
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

    await raiseIfNotOk(resp)

    return true
  },
}


const components = {
  diff: componentsDiff,
  complianceSummary: componentsComplianceSummary,
  upgradePullRequests: componentUpgradePRs,
  ocmComponent: ocmComponent,
  componentDependencies: ocmComponentDependencies,
  componentResponsibles: ocmComponentResponsibles,
  lastVersions: ocmComponentVersions,
}

const auth = {
  authConfigs: async () => {
    return await _toJson(fetch(routes.auth.configs()))
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

    await raiseIfNotOk(resp)
  },
  rbac: async () => await _toJson(withAuth(routes.auth.rbac())),
  user: async () => await _toJson(withAuth(routes.auth.user())),
}

const serviceExtensions = {
  services: async () => {
    const url = new URL(routes.serviceExtensions.base)

    return (await _toJson(withAuth(url))).sort()
  },
  logCollections: async ({
    service,
    logLevel,
  }) => {
    const url = new URL(routes.serviceExtensions.logCollections())
    appendPresentParams(url, {
      service: service,
      log_level: logLevel,
    })

    return await _toJson(withAuth(url))
  },
  containerStatuses: async ({service}) => {
    const url = new URL(routes.serviceExtensions.containerStatuses())
    appendPresentParams(url, {service})

    return await _toJson(withAuth(url))
  },
  backlogItems: {
    get: async ({service}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      appendPresentParams(url, {
        service: service,
      })

      return await _toJson(withAuth(url))
    },
    create: async ({service, priority, artefacts}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      appendPresentParams(url, {
        service: service,
        priority: priority,
      })

      const resp = await withAuth(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({artefacts}),
      })

      await raiseIfNotOk(resp)

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

      await raiseIfNotOk(resp)

      return true
    },
    delete: async ({names}) => {
      const url = new URL(routes.serviceExtensions.backlogItems())
      names.map((name) => appendPresentParams(url, {name}))

      const resp = await withAuth(url, {
        method: 'DELETE',
      })

      await raiseIfNotOk(resp)

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

    const resp = await withAuth(url)
    if (resp.status === 202) return API_RESPONSES.RETRY // caller is supposed to retry

    return await _toJson(resp)
  },
}

export {
  auth,
  features,
  profiles,
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
