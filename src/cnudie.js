import { sanitiseArtefactExtraId } from './ocm/util'
import { artefactMetadatumSeverity } from './util'


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
  // eslint-disable-next-line no-unused-vars
  artefactExtraId,
  metadataType,
}) => {
  return (metadata) => {
    const id = metadata.artefactId
    if(componentName && componentName !== id.componentName) return false
    if(componentVersion && componentVersion !== id.componentVersion) return false
    if(artefactKind && artefactKind !== id.artefactKind) return false
    if(artefactType && artefactType !== id.artefactType) return false
    if(artefactName && artefactName !== id.artefactName) return false
    if(artefactVersion && artefactVersion !== id.artefactVersion) return false
    // XXX ignore artefactExtraId for now (need to normalise and compare)
    if(metadataType && metadataType !== metadata.type) return false

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

    return positiveList.includes(artefactMetadata.type)
  }
}


export {
  artefactMetadataFilter,
  artefactMetadataSeverityFilter,
  artefactMetadataTypeFilter,
  generateArtefactID,
}
