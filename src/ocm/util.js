/**
 * removes attributes from artefact-extra-id
 */
export const sanitiseArtefactExtraId = (artefactExtraId) => {
  // following attributes are about to be removed from artefact-extra-id
  const IMAGE_VECTOR_REPO = 'imagevector-gardener-cloud+repository'
  const IMAGE_VECTOR_TAG = 'imagevector-gardener-cloud+tag'

  // deconstruct object to remove unwanted properties
  // as these properies are not valid javascript identifiers, map to valid ones
  const {
    // eslint-disable-next-line no-unused-vars
    [IMAGE_VECTOR_REPO]: omit1,
    // eslint-disable-next-line no-unused-vars
    [IMAGE_VECTOR_TAG]: omit2,
    ...sanitised
  } = artefactExtraId

  if (!sanitised) return {}

  return sanitised
}

import { artefactMetadatumSeverity, normaliseObject } from '../util'


const generateArtefactID = (artefact) => {
  const cleanArtefactExtraId = sanitiseArtefactExtraId(artefact.extraIdentity)
  return `${artefact.name}_${artefact.version}_${JSON.stringify(cleanArtefactExtraId)}`
}

/*/
 * creates a filter function expecting a metadata object as input (as returned
 * from delivery-service's /artefact/query-metadata) based on the given filtering
 * criteria.
 * All values are optional (passing no argument is equivalent to creating a "match-all" filter
 */
const artefactMetadataFilter = ({
  componentName,
  componentVersion,
  artefactKind,
  artefactType,
  artefactName,
  artefactVersion,
  artefactExtraId,
  metadataType,
}) => {
  return (metadata) => {
    const artefact = metadata.artefact.artefact
    if(componentName && componentName !== metadata.artefact.component_name) return false
    if(componentVersion && componentVersion !== metadata.artefact.component_version) return false
    if(artefactKind && artefactKind !== metadata.artefact.artefact_kind) return false
    if(artefactType && artefactType !== artefact.artefact_type) return false
    if(artefactName && artefactName !== artefact.artefact_name) return false
    if(artefactVersion && artefactVersion !== artefact.artefact_version) return false
    if(artefactExtraId && JSON.stringify(normaliseObject(artefactExtraId)) !== JSON.stringify(normaliseObject(artefact.artefact_extra_id))) return false
    if(metadataType && metadataType !== metadata.meta.type) return false

    return true
  }
}


const artefactMetadataSeverityFilter = ({
  positiveList,
}) => {
  return (artefactMetadata) => {
    if (positiveList.length === 0) return true

    const severity = artefactMetadatumSeverity(artefactMetadata)
    return positiveList.includes(severity.name)
  }
}

const artefactMetadataTypeFilter = ({
  positiveList,
}) => {
  return (artefactMetadata) => {
    if (positiveList.length === 0) return true

    return positiveList.includes(artefactMetadata.meta.type)
  }
}


export {
  artefactMetadataFilter,
  artefactMetadataSeverityFilter,
  artefactMetadataTypeFilter,
  generateArtefactID,
}
