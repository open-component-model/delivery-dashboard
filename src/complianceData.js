import { osBranches } from './api'
import { SEVERITIES } from './consts'
import { determineOsBranch } from './osUtil'


const osInfoCache = {}


const osInfo = async ({ osId }) => {
  if (osId === null) return null
  if (osInfoCache[osId]) return osInfoCache[osId]
  osInfoCache[osId] = osBranches(osId)
  return await osInfoCache[osId]
}


const addMetadata = async (complianceData) => {
  // handle no severity as unknown for now
  if (!complianceData.data.severity && !complianceData.meta.severity) {
    complianceData.data.severity = SEVERITIES.UNKNOWN
  }

  if (complianceData.meta.type === 'os_ids') {
    return await addOsInfo(complianceData)
  } else {
    return complianceData
  }
}


const addOsInfo = async (complianceData) => {
  const osData = await osInfo({ osId: complianceData.data.os_info.ID })
  const branch = determineOsBranch(
    complianceData.data.os_info.VERSION_ID,
    osData
  )
  complianceData.branchInfo = branch
  return complianceData
}

export { addMetadata }
