import { normaliseExtraIdentity } from '../util'


const generateArtefactID = (artefact) => {
  return `${artefact.name}_${artefact.version}_${normaliseExtraIdentity(artefact.extraIdentity)}`
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
    if(artefactExtraId && normaliseExtraIdentity(artefactExtraId) !== normaliseExtraIdentity(artefact.artefact_extra_id)) return false
    if(metadataType && metadataType !== metadata.meta.type) return false

    return true
  }
}


export {
  artefactMetadataFilter,
  generateArtefactID,
}
