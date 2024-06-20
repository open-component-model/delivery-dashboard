import { SemVer } from 'semver'

/**
 * yields (operating system distribution) branch name candidates derived from the given version.
 * This is helpful to "guess" branch names for different os-distributions (such as alpine, debian, ..),
 * which use different naming schemes (e.g. alpine uses `v<major>.<minor>`, while debian uses just `<major>`).
 *
 * @param {String} version
 * @returns {Generator}
 */
function* iterOsBranchnameCandidates(version) {
  yield version
  yield `v${version}`
  yield version.split('.', 1).join('.')
  yield `v${version.split('.', 1).join('.')}`
  yield version.split('.', 2).join('.')
  yield `v${version.split('.', 2).join('.')}`
}

/**
 * By "trying out" all candidates, we can avoid hard-coding distribution-specific knowledge,
 * and will hopefully also be able to identify distributions we do so far not yet know about.
 * Returns branch if match successful, otherwise null
 *
 * @param {String} os
 * @param {List} branches
 */
const determineOsBranch = (os, branches) => {
  if (!branches) return null

  let res
  for (const candidate of iterOsBranchnameCandidates(os)) {
    res = branches.find((branch) => candidate === branch.name)
    if (res) return res
  }

  return null
}

/**
 * Splits given version by dot to array of length 3
 * Fills null with 0
 *
 * @param {String} version
 * @returns {String}
 */
const normaliseSemVer = (version) => {
  const a = version.split('.', 3)
  const major = a[0]
  const minor = a[1] | 0
  const patch = a[2] | 0

  return `${major}.${minor}.${patch}`
}

/**
 * Tries to parse to SemVer with normalisation
 *
 * @param {string} version
 * @returns {SemVer}
 */
const parseRelaxedSemver = (version) => {
  version = version.replace('v', '')
  try {
    return new SemVer(version)
  } catch {
    try {
      return new SemVer(normaliseSemVer(version))
    } catch {
      return
    }
  }
}

export { determineOsBranch, parseRelaxedSemver }
