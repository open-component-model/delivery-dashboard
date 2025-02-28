import React from 'react'

import {
  Box,
  CircularProgress,
  IconButton,
  tooltipClasses,
  Tooltip,
  Typography,
} from '@mui/material'

import PropTypes from 'prop-types'
import yaml from 'js-yaml'
import styled from '@emotion/styled'

import {
  COMPONENT_PATH,
  FEATURES_CFG_KEY,
  META_SPRINT_NAMES,
  OCM_REPO_AUTO_OPTION,
  PATH_KEY,
  healthStatuses,
  tabConfig,
} from './consts'
import { dataKey } from './ocm/model'
import { FINDING_TYPES } from './findings'


export const shortenComponentName = (fullName) => {
  return fullName.split('/').slice(-1)[0]
}

const githubRegex = new RegExp('github.*/.*/')

export const trimComponentName = (name) => {
  if (githubRegex.test(name)) {
    const nameSplit = name.split('/')

    if (nameSplit[2] && nameSplit[3]) {
      name = `${nameSplit[2]}-${nameSplit[3]}`
    } else {
      // second index equals repo name of github repo
      name = nameSplit[2]
    }
  }
  return name
}

export const addPresentKeyValuePairs = (obj, keyValuePairs) => {
  return {
    ...obj,
    // eslint-disable-next-line no-unused-vars
    ...Object.fromEntries(Object.entries(keyValuePairs).filter(([_, v]) => v != null)), // null == undefined, no additional check required
  }
}

export const componentPathQuery = ({
  name,
  version,
  versionFilter,
  view,
  ocmRepo,
  specialComponentId,
  specialComponentBrowserLocalOnly,
}) => {
  const searchParams = {
    name: name,
    version: version,
    view: view ? view : tabConfig.BOM.id,
  }
  const query = new URLSearchParams(addPresentKeyValuePairs(searchParams, {
    versionFilter: versionFilter,
    ocmRepo: ocmRepo,
    id: specialComponentId,
    browserLocalOnly: specialComponentBrowserLocalOnly,
  }))
  return `${COMPONENT_PATH}?${query.toString()}`
}

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}

export const trimLongString = (str, len = 17) => {
  if (str?.length > len) {
    return `${str.substring(0, len)}..`
  }
  return str
}


export const filterListForType = (list, type) => {
  if (!list) return null
  return list.find((e) => e.type === type)
}

export const toYamlString = (obj) => {
  return yaml.dump(obj).replace(/^\s+|\s+$/g,'')
}

export const camelCaseToDisplayText = (camelCase) => {
  const withSpaces = camelCase.replace(/([A-Z])/g, ' $1')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export const snakeToCamelCase = (snakeCase) => {
  return snakeCase.toLowerCase().replace(/([-_][a-z])/g, (group) => {
    return group.toUpperCase().replace('-', '').replace('_', '')
  })
}

export const capitalise = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export const pluralise = (word, count, verbSingular, verbPlural) => {
  if (count === 1) {
    if (verbSingular) return `${word} ${verbSingular}`
    return word
  }

  if (verbPlural) return `${word.replace(/y$/, 'ie')}${word.endsWith('s') ? '' : 's'} ${verbPlural}`
  return `${word.replace(/y$/, 'ie')}${word.endsWith('s') ? '' : 's'}`
}

export const orderRescoringsBySpecificity = (rescorings) => {
  return rescorings?.sort((a, b) => {
    // if one rescoring has global scope, use the other one
    if (a.artefact.component_name && !b.artefact.component_name) return -1
    if (b.artefact.component_name && !a.artefact.component_name) return 1

    // if one rescoring has component scope, use the other one
    if (a.artefact.artefact.artefact_name && !b.artefact.artefact.artefact_name) return -1
    if (b.artefact.artefact.artefact_name && !a.artefact.artefact.artefact_name) return 1

    // if one rescoring has artefact scope, use the other one
    if (a.artefact.artefact.artefact_version && !b.artefact.artefact.artefact_version) return -1
    if (b.artefact.artefact.artefact_version && !a.artefact.artefact.artefact_version) return 1

    // if both rescorings share the same scope, use the latest one
    return new Date(b.meta.creation_date) - new Date(a.meta.creation_date)
  })
}

export const mostSpecificRescoring = (rescorings) => {
  if (!rescorings?.length > 0) return null

  return orderRescoringsBySpecificity(rescorings)[0]
}


export const filterRescoringsForFinding = (finding, rescorings) => {
  return rescorings.filter((rescoring) => {
    if (rescoring.data.referenced_type !== finding.meta.type) return false
    if (rescoring.artefact.artefact_kind !== finding.artefact.artefact_kind) return false
    if (rescoring.artefact.artefact.artefact_type !== finding.artefact.artefact.artefact_type) return false
    if (
      rescoring.artefact.component_name
      && rescoring.artefact.component_name !== finding.artefact.component_name
    ) return false
    if (
      rescoring.artefact.component_version
      && finding.artefact.component_version
      && rescoring.artefact.component_version !== finding.artefact.component_version
    ) return false
    if (
      rescoring.artefact.artefact.artefact_name
      && rescoring.artefact.artefact.artefact_name !== finding.artefact.artefact.artefact_name
    ) return false
    if (
      rescoring.artefact.artefact.artefact_version
      && rescoring.artefact.artefact.artefact_version !== finding.artefact.artefact.artefact_version
    ) return false
    if (
      Object.keys(rescoring.artefact.artefact.artefact_extra_id).length > 0
      && normaliseExtraIdentity(rescoring.artefact.artefact.artefact_extra_id)
        !== normaliseExtraIdentity(finding.artefact.artefact.artefact_extra_id)
    ) return false
    if (
      finding.meta.type === FINDING_TYPES.VULNERABILITY
      && (
        rescoring.data.finding.cve !== finding.data.cve
        || rescoring.data.finding.package_name !== finding.data.package_name
      )
    ) return false
    if (
      finding.meta.type === FINDING_TYPES.LICENSE
      && (
        rescoring.data.finding.license.name !== finding.data.license.name
        || rescoring.data.finding.package_name !== finding.data.package_name
      )
    ) return false
    if (
      finding.meta.type === FINDING_TYPES.MALWARE
      && dataKey({type: FINDING_TYPES.MALWARE, data: rescoring.data})
        !== dataKey({type: FINDING_TYPES.MALWARE, data: finding.data})
    ) return false
    if (
      finding.meta.type === FINDING_TYPES.SAST
      && dataKey({type: FINDING_TYPES.SAST, data: rescoring.data.finding})
        !== dataKey({type: FINDING_TYPES.SAST, data: finding.data})
    ) return false
    if (
      finding.meta.type === FINDING_TYPES.CRYPTO
      && dataKey({type: FINDING_TYPES.CRYPTO, data: rescoring.data.finding})
        !== dataKey({type: FINDING_TYPES.CRYPTO, data: finding.data})
    ) return false

    return true
  })
}

export const mixupFindingsWithRescorings = (findings, rescorings) => {
  return findings.map((finding) => {
    return {
      ...finding,
      rescorings: filterRescoringsForFinding(finding, rescorings),
    }
  })
}


export const formatAndSortSprints = (sprints) => {
  return sprints.map((sprint) => {
    const commonSprintInfo = {
      name: sprint.name,
      count: sprint.count,
    }

    if (sprint.name === META_SPRINT_NAMES.RESOLVED) return {
      ...commonSprintInfo,
      displayName: sprint.name,
      tooltip: 'Finding is already assessed',
      color: 'success',
    }

    if (!sprint.name) return {
      ...commonSprintInfo,
      displayName: 'No date found',
      tooltip: 'No date found, please check the sprints configuration',
      color: 'warning',
    }

    if (sprint.name === META_SPRINT_NAMES.OVERDUE) return {
      ...commonSprintInfo,
      displayName: sprint.name,
      tooltip: sprint.name,
      color: 'blocker',
    }

    const now = new Date(new Date().setHours(0, 0, 0, 0))
    const endDate = new Date(sprint.end_date)
    const timeDeltaDays = Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const displayName = () => {
      if (timeDeltaDays === 0) return 'Today'
      if (timeDeltaDays <= 14) return `In ${timeDeltaDays} Days`

      return endDate.toLocaleDateString()
    }

    return {
      ...commonSprintInfo,
      displayName: displayName(),
      tooltip: `Sprint ${sprint.name}\nDue in ${timeDeltaDays} days on ${endDate.toLocaleDateString()}`,
      color: 'default',
      endDate: endDate,
    }
  }).sort((a, b) => {
    if (a.name === META_SPRINT_NAMES.OVERDUE) return -1
    if (b.name === META_SPRINT_NAMES.OVERDUE) return 1
    if (a.name === null) return -1
    if (b.name === null) return 1

    return a.endDate - b.endDate
  })
}


export const isFeatureState = (
  featureContext,
  featureName,
  state,
) => {
  return featureContext && featureContext.some(f =>
    f.state === state && f.name === featureName
  )
}


export const urlsFromRepoCtxFeature = (repoCtxFeature) => {
  if (!repoCtxFeature || !repoCtxFeature.isAvailable) {
    return []
  }

  return [OCM_REPO_AUTO_OPTION, ...repoCtxFeature.cfg.repoContexts.map(rc => rc.baseUrl)]
}


export const PopoverButton = ({
  popoverProps,
  Popover,
  iconProps,
  Icon,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [mountModal, setMountModal] = React.useState(false)

  const handleOpen = () => {
    setIsLoading(true)
    setMountModal(true)
  }

  const handleClose = () => {
    setMountModal(false)
    setIsLoading(false)
  }

  return <Box
    onClick={(e) => {
      /**
       * if events are not stopped from propagation,
       * the accordion in background of our popup/popover will be affected
       */
      e.stopPropagation()
    }}
  >
    <IconButton
      onClick={handleOpen}
      variant='outlined'
      size={'small'}
    >
      {
        isLoading ? <CircularProgress color='inherit' size={24} /> : <Icon {...iconProps} />
      }
    </IconButton>
    {
      mountModal && <Popover
        popoverProps={popoverProps}
        handleClose={handleClose}
      />
    }
  </Box>
}
PopoverButton.displayName = 'PopoverButton'
PopoverButton.propTypes = {
  popoverProps: PropTypes.object,
  Popover: PropTypes.func,
  iconProps: PropTypes.object,
  Icon: PropTypes.object,
}


export const ExtraIdentityHover = ({
  displayName,
  extraIdentity,
}) => {
  if (!extraIdentity || Object.keys(extraIdentity).length === 0) {
    return <Typography variant='inherit'>
      {displayName}
    </Typography>
  }

  return <Tooltip
    title={
      <Typography
        variant='inherit'
        sx={{
          whiteSpace: 'pre-wrap',
          maxWidth: 'none',
        }}
      >
        {
          JSON.stringify(extraIdentity, null, 2)
        }
      </Typography>
    }
    placement='top-start'
  >
    <Typography variant='inherit'>
      {`${displayName}*`}
    </Typography>
  </Tooltip>
}
ExtraIdentityHover.displayName = 'ExtraIdentityHover'
ExtraIdentityHover.propTypes = {
  displayName: PropTypes.string.isRequired,
  extraIdentity: PropTypes.object,
}


export const getMergedSpecialComponents = (specialComponentsFeature) => {
  const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ?? {}
  const userCfgSpecialComponents = featuresCfg.specialComponents ?? []
  const userCfgUserComponents = featuresCfg.userComponents ?? []

  const specialComponents = userCfgSpecialComponents.length > 0 ?
    specialComponentsFeature.specialComponents.map((comp) => {
      const userCfgSpecialComponent = userCfgSpecialComponents.find((c) => c.id.toString() === comp.id)
      return {
        ...comp,
        displayName: userCfgSpecialComponent?.displayName ?? comp.displayName,
        dependencies: userCfgSpecialComponent?.dependencies ?? comp.dependencies,
      }
    }) : specialComponentsFeature.specialComponents

  return specialComponents.concat(userCfgUserComponents.sort((a, b) => a.id - b.id).map((comp) => {
    return {
      ...comp,
      // be backwards compatible for now
      id: comp.id.toString(),
      browserLocalOnly: comp.browserLocalOnly ?? comp.isAddedByUser,
    }
  }))
}


/**
 * sort both keys and values alphabetically in a recursive manner
 */
export const normaliseObject = (obj) => {
  const sortedKeys = Object.keys(obj).sort()
  const sortedObj = {}

  for (const key of sortedKeys) {
    const value = obj[key]

    if (typeof value === 'object' && value !== null) {
      sortedObj[key] = normaliseObject(value)
      continue
    }

    sortedObj[key] = value
  }

  return sortedObj
}


export const NoMaxWidthTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none',
  },
})


export const matchObjectWithSearchQuery = (obj, query) => {
  for (const [, v] of Object.entries(obj)) {
    if (v instanceof Object) {
      if (matchObjectWithSearchQuery(v, query)) {
        return true
      }
    } else if (v) {
      if (v.toString().toLowerCase().includes(query)) {
        return true
      }
    }
  }
  return false
}


export const isTokenExpired = (token) => {
  // compare milliseconds
  return Date.now() > token.exp * 1000
}


export const isWinterComing = () => {
  return new Date().getMonth() === 11 // is december
}


export const updatePathFromComponentRef = (componentRef) => {
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const commonPathElemIndex = path?.findIndex((pathElem) => pathElem.name === componentRef[0].name && pathElem.version === componentRef[0].version)
  if (commonPathElemIndex >= 0) {
    path.splice(commonPathElemIndex, Math.max(componentRef.length, path.length - commonPathElemIndex), ...componentRef)
    localStorage.setItem(PATH_KEY, JSON.stringify(path))
  } else {
    localStorage.setItem(PATH_KEY, JSON.stringify(componentRef))
  }
}


export const enhanceComponentRefFromPath = (componentRef) => {
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const commonPathElemIndex = path?.findIndex((pathElem) => pathElem.name === componentRef[0].name && pathElem.version === componentRef[0].version)
  if (commonPathElemIndex > 0) {
    return path.slice(0, commonPathElemIndex).concat(componentRef)
  }
  return componentRef
}


export const getAggregatedContainerStatus = ({
  statuses,
  statusesAreLoading,
}) => {
  const isContainerHealthy = (containerStatus) => {
    if (containerStatus.ready) return true
    if (containerStatus.state.terminated.exit_code === 0) return true
    if (containerStatus.state.waiting.reason === 'ContainerCreating') return true

    return false
  }

  const conditionContainerStatusHealthy = statuses?.length > 0 && statuses.reduce((healthy, curStatus) => healthy && isContainerHealthy(curStatus), true)
  const conditionContainerStatusChecking = !statuses && statusesAreLoading
  const conditionContainerStatusUnhealty = statuses && !statuses.reduce((healthy, curStatus) => healthy && isContainerHealthy(curStatus), true)

  if (conditionContainerStatusHealthy) return {
    status: healthStatuses.HEALTHY,
    description: `${statuses.length > 1 ? `${statuses.length} containers are` : 'Container is'} healthy`,
    values: statuses,
  }

  if (conditionContainerStatusChecking) return {
    status: healthStatuses.CHECKING,
    description: 'Checking...',
  }

  if (conditionContainerStatusUnhealty) return {
    status: healthStatuses.UNHEALTHY,
    description: `${statuses.length > 1 ? `${statuses.length} containers are` : 'Container is'} unhealthy`,
    values: statuses,
  }

  if (statuses?.length === 0) return {
    status: healthStatuses.NOT_FOUND,
    description: 'No container found',
    values: statuses,
  }

  return {
    status: healthStatuses.RETRIEVAL_ERROR,
    description: `Error occurred during retrieval of container status${statuses?.length > 0 ? 'es' : ''}`,
    values: statuses,
  }
}


export const getAggregatedLoggingStatus = ({
  logCollection,
  logCollectionIsLoading,
}) => {
  const includedHours = 12
  const recentErrors = logCollection?.spec.logs.filter((log) => new Date() - new Date(log.timestamp) < 3600000 * includedHours)

  const conditionLoggingStatusHealthy = recentErrors?.length === 0
  const conditionLoggingStatusChecking = logCollectionIsLoading
  const conditionLoggingStatusUnhealthy = recentErrors?.length > 0

  if (conditionLoggingStatusHealthy) return {
    status: healthStatuses.HEALTHY,
    description: 'No recent errors',
  }

  if (conditionLoggingStatusChecking) return {
    status: healthStatuses.CHECKING,
    description: 'Checking...',
  }

  if (conditionLoggingStatusUnhealthy) return {
    status: healthStatuses.UNHEALTHY,
    description: `${recentErrors.length} error${recentErrors.length > 1 ? 's' : ''} occurred during the last ${includedHours} hours`,
  }

  return {
    status: healthStatuses.RETRIEVAL_ERROR,
    description: 'Error occurred during retrieval of recent logs',
  }
}


export const logLevelToThemeColor = (logLevel) => {
  return `level${logLevel.charAt(0).toUpperCase() + logLevel.slice(1).toLowerCase()}`
}


export const removeNullValues = (obj) => {
  return Object.fromEntries(Object.entries(obj).map((entry) => {
    const value = entry[1]
    if (typeof value === 'object' && value !== null) {
      return [entry[0], removeNullValues(value)]
    }
    return entry
  }).filter((entry) => {
    const value = entry[1]
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0
    }
    return value !== null
  }))
}


export const useInterval = (callback, delay) => {
  const savedCallback = React.useRef()

  React.useEffect(() => {
    savedCallback.current = callback
  })

  React.useEffect(() => {
    const currentCallback = () => savedCallback.current()

    if (delay) {
      const interval = setInterval(currentCallback, delay)
      return () => clearInterval(interval)
    }
  }, [delay])
}


export const downloadObject = async ({
  obj,
  fname,
}) => {
  const href = await URL.createObjectURL(obj)
  const link = document.createElement('a')
  link.href = href
  link.download = fname
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


export const appendPresentParams = (url, keyValuePairs) => {
  Object.entries(keyValuePairs).map(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value)
    }
  })
  return url
}


export const median = (arr) => {
  const mid = Math.floor(arr.length / 2)
  const arrSorted = [...arr].sort((a, b) => a - b)

  return arr.length % 2 === 0
    ? (arrSorted[mid - 1] + arrSorted[mid]) / 2
    : arrSorted[mid]
}


/**
 * Generates a list of date objects representing the first day of
 * each month within a specified timespan.
 */
export const getMonthlyDates = (timeSpanDays) => {
  const dayInMillis = 1000 * 60 * 60 * 24
  const today = new Date()
  const startDate = new Date(today - timeSpanDays * dayInMillis)
  const current = new Date(startDate.getFullYear(), startDate.getMonth())

  const dates = []

  while (current <= today) {
    dates.push(new Date(current.getFullYear(), current.getMonth()))
    current.setMonth(current.getMonth() + 1)
  }

  return dates
}


/**
 * This is an equivalent normalisation function to the one used in the delivery-service to normalise
 * extra-identities. Using the same algorithm for normalisation allows comparison of
 * extra-identities which were normalised in the delivery-service vs. those which were normalised in
 * the delivery-dashboard.
 */
export const normaliseExtraIdentity = (extraIdentity) => {
  const sortedKeys = Object.keys(extraIdentity).sort()

  return sortedKeys.reduce((normalised, key) => {
    return [
      ...normalised,
      `${key}:${extraIdentity[key]}`,
    ]
  }, []).join('_')
}
