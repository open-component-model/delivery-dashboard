export const DASHBOARD_TITLE = 'Delivery Dashboard'

export const tabConfig = {
  BOM: {
    id: 'bom',
    caption: 'Dependencies (BOM)',
  },
  COMPONENT_DESCRIPTOR: {
    id: 'cd',
    caption: 'Component Descriptor',
  },
  COMPONENT_DIFF: {
    id: 'diff',
    caption: 'Component Diff',
  },
  TESTS: {
    id: 'tests',
    caption: 'Tests',
  },
  COMPLIANCE: {
    id: 'compliance',
    caption: 'Compliance',
  },
  DORA: {
    id: 'dora',
    caption: 'Dora',
  },
}
Object.freeze(tabConfig)

export const servicesTabConfig = {
  BACKLOG: {
    id: 'backlog',
    caption: 'Backlog',
  },
  LOGS: {
    id: 'logs',
    caption: 'Logs',
  },
}
Object.freeze(servicesTabConfig)

export const fetchBomPopulate = {
  ALL: 'all',
  COMPONENT_REFS: 'componentReferences',
}
Object.freeze(fetchBomPopulate)

export const LOGIN_PATH = '/login'
export const COMPONENT_PATH = '/component'
export const SERVICES_PATH = '/services'
export const MONITORING_PATH = '/monitoring'

export const snackBarConfig = {
  variant: 'error',
  anchorOrigin: {
    vertical: 'top',
    horizontal: 'center',
  },
  autoHideDuration: null,
}

export const copyNotificationCfg = {
  variant: 'info',
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'right',
  },
  autoHideDuration: 3000,
}

export const errorSnackbarProps =   {
  variant: 'snackbarWithDetails',
  persist: true,
  anchorOrigin: {
    vertical: 'top',
    horizontal: 'center',
  }
}

export const labelMissingCfg = {
  variant: 'warning',
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'right',
  },
  autoHideDuration: 3000,
}

export const features = {
  AUTHENTICATION: 'authentication',
  DELIVERY_DB: 'delivery-db',
  CLUSTER_ACCESS: 'cluster-access',
  PROFILES: 'profiles',
  TESTS: 'tests',
  REPO_CONTEXTS: 'repo-contexts',
  SPECIAL_COMPONENTS: 'special-components',
  SPRINTS: 'sprints',
  UPGRADE_PRS: 'upgrade-prs',
  VERSION_FILTER: 'version-filter',
  JOKES_API: 'jokes-api',
  DASHBOARD_CREATE_ISSUE_URL: 'dashboard-create-issue-url',
  EXTENSIONS_CONFIGURATION: 'extensions-configuration',
  FINDING_CONFIGURATIONS: 'finding-configurations',
}

export const featureStates = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
}

export const pullRequestsStates = {
  OPEN: 'open',
  CLOSED: 'closed',
  ALL: 'all',
}
Object.freeze(pullRequestsStates)

export const TOKEN_KEY = 'delivery_dashboard_jwt'
export const FEATURES_CFG_KEY = 'features'
export const PATH_KEY = 'path'
export const PATH_POS_KEY = 'path_pos'
export const SHOW_SNOWFLAKES = 'show_snowflakes'
export const PROFILE_KEY = 'profile'

export const OCM_REPO_AUTO_OPTION = '<auto>'

export const healthStatuses = {
  HEALTHY: {
    name: 'healthy',
    color: 'levelInfo',
    severity: 1,
  },
  NOT_FOUND: {
    name: 'notFound',
    color: 'levelInfo',
    severity: 2,
  },
  CHECKING: {
    name: 'checking',
    color: 'levelDebug',
    severity: 4,
  },
  RETRIEVAL_ERROR: {
    name: 'retrievalError',
    color: 'levelWarning',
    severity: 8,
  },
  UNHEALTHY: {
    name: 'unhealthy',
    color: 'levelError',
    severity: 16,
  },
}

export const VERSION_FILTER = {
  ALL: 'all',
  RELEASES_ONLY: 'releases_only',
}

// these services work with backlog items
export const COMPLIANCE_TOOLS = {
  BDBA: 'bdba',
  CLAMAV: 'clamav',
  SAST: 'sast',
  ISSUE_REPLICATOR: 'issueReplicator',
}

export const PRIORITIES = {
  NONE: {
    name: 'None',
    value: 0,
    color: 'levelDebug',
  },
  LOW: {
    name: 'Low',
    value: 1,
    color: 'levelInfo',
  },
  MEDIUM: {
    name: 'Medium',
    value: 2,
    color: 'levelWarning',
  },
  HIGH: {
    name: 'High',
    value: 4,
    color: 'high',
  },
  CRITICAL: {
    name: 'Critical',
    value: 8,
    color: 'levelError',
  },
}

export const ARTEFACT_KIND = {
  ARTEFACT: 'artefact',
  RESOURCE: 'resource',
  RUNTIME: 'runtime',
  SOURCE: 'source',
}
Object.freeze(ARTEFACT_KIND)

export const META_RESCORING_RULES = {
  BDBA_TRIAGE: 'bdba-triage',
  CUSTOM_RESCORING: 'custom-rescoring',
  ORIGINAL_SEVERITY: 'original-severity',
}
Object.freeze(META_RESCORING_RULES)

export const META_SPRINT_NAMES = {
  OVERDUE: 'Overdue',
  RESOLVED: 'Resolved',
}
Object.freeze(META_SPRINT_NAMES)


export const USER_IDENTITIES = {
  EMAIL_ADDRESS: 'emailAddress',
  GITHUB_USER: 'githubUser',
  PERSONAL_NAME: 'personalName',
}
Object.freeze(USER_IDENTITIES)


export const FILTER_SEMANTICS = {
  INCLUDE: 'include',
  EXCLUDE: 'exclude',
}
Object.freeze(FILTER_SEMANTICS)


export const SUMMARY_CATEGORISATIONS = {
  CLEAN: 'CLEAN',
  UNKNOWN: 'UNKNOWN',
}


export const RESCORING_MODES = {
  'AUTOMATIC': 'automatic',
  'MANUAL': 'manual',
}
