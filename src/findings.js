import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'

import {
  FILTER_SEMANTICS,
  META_SPRINT_NAMES,
  RESCORING_MODES,
  SUMMARY_CATEGORISATIONS,
} from './consts'
import {
  capitalise,
  mostSpecificRescoring,
  orderRescoringsBySpecificity,
} from './util'
import { artefactMetadataFilter } from './ocm/util'


export const FINDING_TYPES = {
  CRYPTO: 'finding/crypto',
  DIKI: 'finding/diki',
  LICENSE: 'finding/license',
  MALWARE: 'finding/malware',
  OSID: 'finding/osid',
  SAST: 'finding/sast',
  VULNERABILITY: 'finding/vulnerability',
}
Object.freeze(FINDING_TYPES)


/**
 * Creates a display name for artefact metadata types by removing the finding prefix `finding/`,
 * turning `_` as well as `/` into spaces and capitalising each word.
 */
export const findingTypeToDisplayName = (findingType) => {
  const replacedFindingType = findingType.replace(/^finding\//, '').replaceAll('_', ' ').replaceAll('/', ' ')
  return replacedFindingType.split(' ').map(capitalise).join(' ')
}


export const findingCfgForType = ({
  findingType,
  findingCfgs,
}) => {
  return findingCfgs.find((findingCfg) => findingCfg.type === findingType)
}


export const retrieveFindingsForType = ({
  findingType,
  findingCfgs,
  ocmNode,
}) => {
  const findingCfg = findingCfgForType({findingType, findingCfgs})

  return findingCfg && findingCfgMatchesOcmNode({findingCfg, ocmNode})
}


export const rescorableFindingTypes = ({findingCfgs}) => {
  return findingCfgs.filter((findingCfg) => {
    return findingCfg.categorisations.find((categorisation) => {
      return categorisation.rescoring?.includes(RESCORING_MODES.MANUAL)
    })
  }).map((findingCfg) => findingCfg.type)
}


export const findCategorisationById = ({
  id,
  findingCfg,
}) => {
  const categorisation = findingCfg.categorisations.find((categorisation) => categorisation.id === id)

  if (categorisation) return categorisation

  if (id === SUMMARY_CATEGORISATIONS.UNKNOWN) return {
    id: SUMMARY_CATEGORISATIONS.UNKNOWN,
    display_name: SUMMARY_CATEGORISATIONS.UNKNOWN,
    value: -1,
  }

  if (id === SUMMARY_CATEGORISATIONS.CLEAN) return {
    id: SUMMARY_CATEGORISATIONS.CLEAN,
    display_name: SUMMARY_CATEGORISATIONS.CLEAN,
    value: 0,
  }
}


/**
 * Return the categorisation with the minimum value >0. If no such categorisation is found,
 * it returns the categorisation with the minimum value.
 *
 * Note: This might be used as a reasonable default selection for categorisation selectors.
 */
export const findMinimumCategorisation = ({
  categorisations,
}) => {
  if (!categorisations?.length > 0) return null

  const sortedCategorisations = categorisations.sort((a, b) => a.value - b.value)
  const minimumCategorisation = sortedCategorisations.find((categorisation) => categorisation.value > 0)

  return minimumCategorisation ?? sortedCategorisations[0]
}


/**
 * TODO We might change the value ranges here to allow a broader value range.
 */
export const categorisationValueToColor = (value) => {
  if (value < 0) return 'default'
  if (value === 0) return 'levelInfo'
  if (value <= 1) return 'info'
  if (value <= 2) return 'warning'
  if (value <= 4) return 'high'
  if (value <= 8) return 'critical'
  return 'blocker'
}


/**
 * TODO We might change the value ranges here to allow a broader value range.
 */
export const categorisationValueToIndicator = (value) => {
  if (value < 0) return HelpOutlineOutlinedIcon
  if (value === 0) return CheckCircleOutlineOutlinedIcon
  if (value <= 1) return ReportProblemOutlinedIcon
  if (value <= 2) return ReportProblemOutlinedIcon
  if (value <= 4) return ReportProblemOutlinedIcon
  if (value <= 8) return ReportProblemOutlinedIcon
  return ReportProblemIcon
}


export const categoriseRescoringProposal = ({
  rescoring,
  findingCfg,
}) => {
  const id = rescoring.applicable_rescorings.length > 0
    ? mostSpecificRescoring(rescoring.applicable_rescorings).data.severity
    : rescoring.finding.severity

  return findCategorisationById({id, findingCfg})
}


export const categoriseFinding = ({
  finding,
  findingCfg,
}) => {
  if (!finding || !findingCfg) return null

  if (finding.rescorings?.length > 0) return findCategorisationById({
    id: mostSpecificRescoring(finding.rescorings).data.severity,
    findingCfg: findingCfg,
  })

  if (finding.data.severity) return findCategorisationById({
    id: finding.data.severity,
    findingCfg: findingCfg,
  })

  return findCategorisationById({
    id: finding.meta.severity,
    findingCfg: findingCfg,
  })
}


export const worstCategorisation = ({
  findings,
  findingCfg,
}) => {
  const categorisations = findings.map((finding) => categoriseFinding({finding, findingCfg}))

  return categorisations.reduce((worst, current) => {
    return !worst || current.value > worst.value ? current : worst
  })
}


export const findingIsResolved = ({
  rescoring,
  findingCfg,
}) => {
  if (rescoring.applicable_rescorings.length === 0) return false

  const rescoringsOrderedBySpecificity = orderRescoringsBySpecificity(rescoring.applicable_rescorings)
  const id = rescoringsOrderedBySpecificity[0].data.severity
  const categorisation = findCategorisationById({id, findingCfg})

  return categorisation.value === 0
}

export const sprintNameForRescoring = ({
  rescoring,
  findingCfg,
}) => {
  const now = new Date(new Date().setHours(0, 0, 0, 0))

  if (findingIsResolved({rescoring, findingCfg}))
    return META_SPRINT_NAMES.RESOLVED
  if (!rescoring.sprint)
    return null
  if (new Date(rescoring.sprint.end_date) < now)
    return META_SPRINT_NAMES.OVERDUE

  return rescoring.sprint.name
}


export const artefactMetadataCategorisationFilter = ({
  positiveList,
  findingCfg,
}) => {
  return (artefactMetadata) => {
    if (positiveList.length === 0) return true

    const categorisation = categoriseFinding({
      finding: artefactMetadata,
      findingCfg: findingCfg,
    })
    if (!categorisation) return false // pure metadata (e.g. structure info) does not have any categorisation

    return positiveList.find((c) => c.id === categorisation.id)
  }
}


export const artefactMetadataCategorisationComparator = ({
  left,
  right,
  findingCfg,
  ascending,
}) => {
  const leftCategorisation = categoriseFinding({
    finding: left,
    findingCfg: findingCfg,
  })
  const rightCategorisation = categoriseFinding({
    finding: right,
    findingCfg: findingCfg,
  })

  // pure metadata (e.g. structure info) does not have any categorisation
  if (!leftCategorisation || !rightCategorisation) return 0

  if (ascending) return leftCategorisation.value - rightCategorisation.value
  return rightCategorisation.value - leftCategorisation.value
}


export const artefactsCategorisationComparator = ({
  left,
  right,
  artefactMetadata,
  metadataType,
  positiveListCategorisations,
  findingCfg,
  ascending,
}) => {
  const filteredArtefactMetadata = artefactMetadata.filter(artefactMetadataCategorisationFilter({
    positiveList: positiveListCategorisations,
    findingCfg: findingCfg,
  }))

  const leftArtefactMetadata = filteredArtefactMetadata.filter(artefactMetadataFilter({
    artefactName: left.name,
    artefactVersion: left.version,
    artefactType: left.type,
    artefactExtraId: left.extraIdentity,
    metadataType: metadataType,
  }))
  if (leftArtefactMetadata.length === 0) return 1

  const rightArtefactMetadata = filteredArtefactMetadata.filter(artefactMetadataFilter({
    artefactName: right.name,
    artefactVersion: right.version,
    artefactType: left.type,
    artefactExtraId: left.extraIdentity,
    metadataType: metadataType,
  }))
  if (rightArtefactMetadata.length === 0) return -1

  const leftCategorisation = worstCategorisation({
    findings: leftArtefactMetadata,
    findingCfg: findingCfg,
  })
  const rightCategorisation = worstCategorisation({
    findings: rightArtefactMetadata,
    findingCfg: findingCfg,
  })

  // pure metadata (e.g. structure info) does not have any categorisation
  if (!leftCategorisation || !rightCategorisation) return 0

  if (ascending) return leftCategorisation.value - rightCategorisation.value
  return rightCategorisation.value - leftCategorisation.value
}


const filterMatchesOcmNode = ({
  filter,
  ocmNode,
}) => {
  const matchRegexes = (patterns, string) => {
    if (!patterns?.length > 0) return true
    if (!string) return filter.semantics === FILTER_SEMANTICS.INCLUDE

    return Boolean(patterns.find((pattern) => (new RegExp(pattern)).test(string)))
  }

  if (!matchRegexes(filter.component_name, ocmNode.component.name)) return false
  if (!matchRegexes(filter.component_version, ocmNode.component.version)) return false
  if (filter.artefact_kind?.length > 0 && !filter.artefact_kind.includes(ocmNode.artefactKind)) return false
  if (!matchRegexes(filter.artefact_name, ocmNode.artefact.name)) return false
  if (!matchRegexes(filter.artefact_version, ocmNode.artefact.version)) return false
  if (!matchRegexes(filter.artefact_type, ocmNode.artefact.type)) return false
  if (filter.artefact_extra_id?.length > 0 && !filter.artefact_extra_id.includes(ocmNode.normalisedExtraIdentity())) return false

  return true
}


export const findingCfgMatchesOcmNode = ({
  findingCfg,
  ocmNode,
}) => {
  if (!findingCfg.filter?.length > 0) return true

  // we need to check whether there is at least one "include" filter because if there is none,
  // all not explicitly excluded artefacts are automatically included
  const isIncludeFilter = findingCfg.filter.map((filter) => filter.semantics).includes(FILTER_SEMANTICS.INCLUDE)

  let isIncluded = false
  let isExcluded = false

  findingCfg.filter.forEach((filter) => {
    const filterMatches = filterMatchesOcmNode({filter, ocmNode})

    if (filter.semantics === FILTER_SEMANTICS.INCLUDE && filterMatches) {
      isIncluded = true
    } else if (filter.semantics === FILTER_SEMANTICS.EXCLUDE && filterMatches) {
      isExcluded = true
    }
  })

  return !isExcluded && (!isIncludeFilter || isIncluded)
}
