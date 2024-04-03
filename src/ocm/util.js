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
