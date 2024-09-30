import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  Avatar,
  Box,
  Chip,
  Divider,
  Grid,
  Link,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Skeleton,
  Typography,
  Tooltip,
  TableCell,
  Stack,
  IconButton,
} from '@mui/material'
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import IosShareIcon from '@mui/icons-material/IosShare'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SourceIcon from '@mui/icons-material/Source'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'

import {
  evaluateResourceBranch,
  GolangChip,
  IssueChip,
} from './ComplianceChips'
import {
  appendPresentParams,
  artefactMetadatumSeverity,
  capitalise,
  findSeverityCfgByName,
  normaliseObject,
} from '../../util'
import DockerLogo from '../../res/docker-icon.svg'
import { artefactMetadataTypes, datasources, findTypedefByName } from '../../ocm/model'
import { artefactMetadataFilter } from './../../cnudie'
import {
  ARTEFACT_KIND,
  COMPLIANCE_TOOLS,
  PACKAGES,
  SEVERITIES,
  TOKEN_KEY,
} from '../../consts'
import { RescoringModal } from './RescoringModal'
import { OcmNode } from '../../ocm/iter'
import TriggerComplianceToolButton from './../util/TriggerComplianceToolButton'
import { routes } from '../../api'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'


const OsCell = ({
  osData,
  severity,
  isLoading,
}) => {
  const osInfo = osData?.data.os_info
  const emptyOsId = Object.values(osInfo ?? {}).every(e => e === null)
  const msg = evaluateResourceBranch(osData).reason

  return <Tooltip
    title={
      <Stack>
        {
          osInfo && <>
            <List>
              {
                emptyOsId ? <Typography
                  variant='inherit'
                  sx={{
                    whiteSpace: 'pre-wrap',
                    maxWidth: 'none',
                  }}
                >
                  Unable to determine an OS, thus probably a scratch image.
                </Typography> : <>
                  <Typography variant='inherit'>
                    {msg}
                  </Typography>
                  <Divider/>
                  <Typography
                    variant='inherit'
                    sx={{
                      whiteSpace: 'pre-wrap',
                      maxWidth: 'none',
                    }}
                  >
                    {JSON.stringify(osInfo, null, 2)}
                  </Typography>
                </>
              }
            </List>
            <Divider/>
          </>
        }
        {
          isLoading ? <Skeleton sx={{ width: '10rem' }}/> : <Typography variant='inherit'>
            {
              lastScanTimestampStr(osData)
            }
          </Typography>
        }
      </Stack>
    }
  >
    <Grid item>
      {
        osInfo ? (
          emptyOsId ? <Chip
            label='Scratch Image'
            color='default'
            variant='outlined'
            size='small'
          /> : <Chip
            label={`${osInfo.ID} ${osInfo.VERSION_ID ?? ''}`}
            color={severity.color}
            variant='outlined'
            size='small'
          />
        ) : (
          isLoading ? <Chip
            label={`OS Info ${capitalise(severity.name)}`}
            color={severity.color}
            variant='outlined'
            size='small'
          /> : <Chip
            color='default'
            label='No OS Info'
            variant='outlined'
            size='small'
            clickable={false}
          />
        )
      }
    </Grid>
  </Tooltip>
}
OsCell.displayName = 'OsCell'
OsCell.propTypes = {
  osData: PropTypes.object,
  severity: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
}


const artefactTypeFriendlyNames = {
  'ociImage': 'OCI Image',
  'generic': 'Generic',
  'git': 'Git',
}
Object.freeze(artefactTypeFriendlyNames)


const artefactTypeFriendlyName = ({ artefactType }) => {
  const name = artefactTypeFriendlyNames[artefactType]
  if (!name) return artefactType
  return name
}


const IconCell = ({
  artefact,
  defaultIcon = <AutoAwesomeMosaicIcon/>,
}) => {
  const ArtefactTypeIcons = {
    'ociImage': <img src={DockerLogo} alt='docker-logo'/>,
    'generic': <SourceIcon/>,
  }

  const Icon = ArtefactTypeIcons[artefact.type] ?
    ArtefactTypeIcons[artefact.type] : defaultIcon

  return <TableCell component='th' scope='row'>
    <Tooltip
      title={
        <Typography
          variant='inherit'
          sx={{
            whiteSpace: 'pre-wrap',
            maxWidth: 'none',
          }}
        >
          {artefactTypeFriendlyName({artefactType: artefact.type})}
        </Typography>
      }
      placement='top-start'
      describeChild
    >
      <Box display='flex' alignItems='center' justifyContent='center'>
        {Icon}
      </Box>
    </Tooltip>
  </TableCell>
}
IconCell.displayName = 'IconCell'
IconCell.propTypes = {
  artefact: PropTypes.object.isRequired,
  defaultIcon: PropTypes.element,
}


const findLastScan = (complianceData, datasource) => {
  return complianceData?.find((d) => {
    return (
      d.meta.type === artefactMetadataTypes.ARTEFACT_SCAN_INFO
      && d.meta.datasource === datasource
    )
  })
}


const lastScanTimestampStr = (lastScan) => {
  if (!lastScan) return 'No last scan'
  return `Last scan: ${new Date(lastScan.meta.last_update ?? lastScan.meta.creation_date).toLocaleString()}`
}


const ComplianceCell = ({
  component,
  artefact,
  ocmRepo,
  complianceSummaryFetchDetails,
  complianceDataFetchDetails,
  fetchComplianceSummary,
  scanConfig,
}) => {
  const {complianceSummary, isSummaryLoading, isSummaryError} = complianceSummaryFetchDetails
  const {complianceData, state} = complianceDataFetchDetails

  const componentSummary = complianceSummary?.complianceSummary.find((componentSummary) => {
    return (
      componentSummary.componentId.name === component.name
      && componentSummary.componentId.version === component.version
    )
  })

  const artefactSummary = componentSummary?.artefacts.find((artefactSummary) => {
    return (
      artefactSummary.artefact.artefact_kind === artefact.kind
      && artefactSummary.artefact.artefact.artefact_name === artefact.name
      && artefactSummary.artefact.artefact.artefact_version == artefact.version
      && artefactSummary.artefact.artefact.artefact_type == artefact.type
      && JSON.stringify(normaliseObject(artefactSummary.artefact.artefact.artefact_extra_id))
        === JSON.stringify(normaliseObject(artefact.extraIdentity))
    )
  })

  if (isSummaryError || state.error || (!isSummaryLoading && !artefactSummary)) return <TableCell>
    <Alert severity='error'>Unable to fetch Compliance Data</Alert>
  </TableCell>

  const getMaxSeverity = (type) => {
    if (!artefactSummary) return findSeverityCfgByName({name: SEVERITIES.UNKNOWN})
    const entry = artefactSummary.entries.find((summary) => summary.type === type)
    return findSeverityCfgByName({name: entry.severity})
  }

  const complianceFiltered = complianceData?.filter(artefactMetadataFilter({
    artefactKind: artefact.kind,
    artefactName: artefact.name,
    artefactVersion: artefact.version,
    artefactType: artefact.type,
  }))

  const structureInfos = complianceFiltered?.filter((d) => d.meta.type === artefactMetadataTypes.STRUCTURE_INFO)
  const osData = complianceFiltered?.find((d) => d.meta.type === artefactMetadataTypes.OS_IDS)
  const codecheckData = complianceFiltered?.find((d) => d.meta.type === artefactMetadataTypes.CODECHECKS_AGGREGATED)

  const lastBdbaScan = findLastScan(complianceFiltered, datasources.BDBA)
  const lastMalwareScan = findLastScan(complianceFiltered, datasources.CLAMAV)

  return <TableCell>
    <Grid container direction='row-reverse' spacing={1}>
      <IssueChip
        component={component}
        artefact={artefact}
        scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.ISSUE_REPLICATOR in scanConfig.config ? scanConfig : null}
      />
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <BDBACell
          component={component}
          artefact={artefact}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.LICENSE}
          severity={getMaxSeverity(artefactMetadataTypes.LICENSE)}
          lastScan={lastBdbaScan}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.BDBA in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <GolangChip
          versions={structureInfos?.filter((structureInfo) => {
            return structureInfo.data.package_name === PACKAGES.GOLANG
          }).map((structureInfo) => structureInfo.data.package_version)}
          timestamp={lastScanTimestampStr(lastBdbaScan)}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <MalwareFindingCell
          ocmNode={new OcmNode([component], artefact, ARTEFACT_KIND.RESOURCE)}
          ocmRepo={ocmRepo}
          metadataTypedef={findTypedefByName({name: artefactMetadataTypes.FINDING_MALWARE})}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.CLAMAV in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          lastScan={lastMalwareScan}
          severity={getMaxSeverity(artefactMetadataTypes.FINDING_MALWARE)}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <OsCell
          osData={osData}
          severity={getMaxSeverity(artefactMetadataTypes.OS_IDS)}
          isLoading={state.isLoading}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.SOURCE && <CodecheckCell
          data={codecheckData?.data}
          severity={artefactMetadatumSeverity(codecheckData)}
          timestamp={codecheckData?.meta.creation_date}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <BDBACell
          component={component}
          artefact={artefact}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.VULNERABILITY}
          severity={getMaxSeverity(artefactMetadataTypes.VULNERABILITY)}
          lastScan={lastBdbaScan}
          scanConfig={scanConfig?.config && COMPLIANCE_TOOLS.BDBA in scanConfig.config ? scanConfig : null}
          fetchComplianceSummary={fetchComplianceSummary}
          isLoading={state.isLoading}
        />
      }
    </Grid>
  </TableCell>
}
ComplianceCell.displayName = 'ComplianceCell'
ComplianceCell.propTypes = {
  component: PropTypes.object.isRequired,
  artefact: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  complianceSummaryFetchDetails: PropTypes.object.isRequired,
  complianceDataFetchDetails: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfig: PropTypes.object,
}


const ArtefactCell = ({
  artefact,
  component,
}) => {
  const artefactDisplayName = `${artefact.name}:${artefact.version}`
  const downloadUrl = new URL(routes.ocm.artefactsBlob)
  appendPresentParams(downloadUrl, {
    component: `${component.name}:${component.version}`,
    artefact: artefact.name,
    unzip: 'true',
  })

  if (artefact.type === 'ociImage')
    return <TableCell>
      <Link
        href={
          artefact.access.imageReference
            ? `https://${artefact.access.imageReference}`
            : 'https://gardener.github.io/component-spec/component-descriptor-v2.html#component_resources_items_anyOf_i1_access'
        }
        target='_blank'
        rel='noreferrer'
        color='inherit'
      >
        {artefactDisplayName}
      </Link>
    </TableCell>
  if (artefact.access.type.toLowerCase() === 'github') {
    return <TableCell>
      <Link
        href={
          artefact.access.repoUrl.startsWith('https://')
            ? `${artefact.access.repoUrl}/tree/${artefact.access.commit}`
            : `https://${artefact.access.repoUrl}/tree/${artefact.access.commit}`
        }
        target='_blank'
        rel='noreferrer'
        color='inherit'
      >
        {artefactDisplayName}
      </Link>
    </TableCell>
  }
  if (Object.values(artefact.extraIdentity).length > 0)
    return <TableCell>
      <Tooltip
        title={
          <Typography
            variant='inherit'
            sx={{
              whiteSpace: 'pre-wrap',
              maxWidth: 'none',
            }}
          >
            {JSON.stringify(artefact.extraIdentity, null, 2)}
          </Typography>
        }
        placement='top-start'
        describeChild
      >
        <Typography variant='inherit'>{`${artefactDisplayName}*`}</Typography>
      </Tooltip>
    </TableCell>
  if (artefact.access.type === 'localBlob/v1') {
    const isAuthenticated = JSON.parse(localStorage.getItem(TOKEN_KEY)) !== null

    return <TableCell>
      <Box
        display='flex'
        flexDirection='row'
        alignItems='center'
      >
        <Typography variant='inherit'>
          {artefactDisplayName}
        </Typography>
        <div style={{ padding: '0.3em' }} />
        <Tooltip
          title={
            isAuthenticated
              ? 'Download'
              : 'You need to login first'
          }
        >
          <span>
            <a
              href={downloadUrl}
              target='_blank'
              rel='noreferrer'
            >
              <IconButton
                size='small'
                disabled={!isAuthenticated}
              >
                <CloudDownloadIcon/>
              </IconButton>
            </a>
          </span>
        </Tooltip>
      </Box>
    </TableCell>
  }

  return <TableCell>{artefactDisplayName}</TableCell>
}
ArtefactCell.displayName = 'ArtefactCell'
ArtefactCell.propTypes = {
  artefact: PropTypes.object.isRequired,
  component: PropTypes.object.isRequired,
}


const CodecheckCell = ({
  data,
  severity,
  timestamp,
}) => {
  if (severity.name === findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).name) return <Tooltip
    title={<Typography variant='inherit'>No last scan</Typography>}
  >
    <Grid item>
      <Chip
        color='default'
        label='No Codecheck'
        variant='outlined'
        size='small'
        clickable={false}
      />
    </Grid>
  </Tooltip>

  const localeDateTime = new Date(timestamp).toLocaleString()
  const findings = data.findings

  return <Tooltip
    title={
      <Stack direction='column' spacing={1}>
        <Stack direction='column' spacing={0} key={JSON.stringify(data)+'_body'}>
          <Typography variant='caption'>High: {findings.high}</Typography>
          <Typography variant='caption'>Medium: {findings.medium}</Typography>
          <Typography variant='caption'>Low: {findings.low}</Typography>
          <Typography variant='caption'>Info: {findings.info}</Typography>
          <Typography variant='caption'>Risk Rating: {data.risk_rating}</Typography>
          <Typography variant='caption'>Risk Severity: {data.risk_severity}</Typography>
        </Stack>
        <Divider/>
        <Typography variant='inherit'>
          {`Last scan: ${localeDateTime}`}
        </Typography>
      </Stack>
    }
  >
    <Grid item>
      <Chip
        color={severity.color}
        label={<Link color={'inherit'}>Codechecks</Link>}
        variant='outlined'
        size='small'
        icon={<IosShareIcon/>}
        clickable={true}
        onClick={() => {
          data
            ? window.open(data.overview_url, '_blank')
            : null
        }}
      />
    </Grid>
  </Tooltip>
}
CodecheckCell.displayName = 'CodecheckCell'
CodecheckCell.propTypes = {
  data: PropTypes.object,
  severity: PropTypes.object.isRequired,
  timestamp: PropTypes.string,
}


const RescoringButton = ({
  setMountRescoring,
  title,
}) => {
  return <ListItemButton
    onClick={(e) => {
      setMountRescoring(true)
      e.stopPropagation()
    }}
    divider
  >
    <ListItemAvatar>
      <Avatar>
        <AutorenewIcon/>
      </Avatar>
    </ListItemAvatar>
    <ListItemText primary={title}/>
  </ListItemButton>
}
RescoringButton.displayName = 'RescoringButton'
RescoringButton.propTypes = {
  setMountRescoring: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
}


const BDBAButton = ({
  reportUrl,
}) => {
  return <ListItemButton
    onClick={(e) => e.stopPropagation()}
    component='a'
    href={reportUrl}
    target='_blank'
    divider
  >
    <ListItemAvatar>
      <Avatar>
        <OpenInNewIcon/>
      </Avatar>
    </ListItemAvatar>
    <ListItemText
      primary='View in BDBA'
      secondary={new URL(reportUrl).host}
      secondaryTypographyProps={{ color: 'lightgrey' }}
    />
  </ListItemButton>
}
BDBAButton.displayName = 'BDBAButton'
BDBAButton.propTypes = {
  reportUrl: PropTypes.string.isRequired,
}


const MalwareFindingCell = ({
  ocmNode,
  ocmRepo,
  metadataTypedef,
  scanConfig,
  fetchComplianceSummary,
  lastScan,
  severity,
  isLoading,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  if (scanConfig) {
    // if artefact type filter is set, don't show bdba cell for types that are filtered out
    const artefactTypes = scanConfig.config.clamav.artefact_types
      ? scanConfig.config.clamav.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (artefactTypes && !artefactTypes.some((type) => type === ocmNode.artefact.type)) {
      return null
    }
  }

  const title = metadataTypedef.friendlyName

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={[ocmNode]}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Tooltip
      title={
        <Stack>
          <List>
            {
              scanConfig && <TriggerComplianceToolButton
                ocmNode={ocmNode}
                cfgName={scanConfig.name}
                service={COMPLIANCE_TOOLS.CLAMAV}
              />
            }
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
          </List>
          {
            isLoading ? <Skeleton/> : <Typography variant='inherit'>
              {
                lastScanTimestampStr(lastScan)
              }
            </Typography>
          }
        </Stack>
      }
    >
      {
        lastScan || isLoading ? <Chip
          color={severity.color}
          label={severity.name === SEVERITIES.CLEAN
            ? `No ${title} Findings`
            : `${title} ${capitalise(severity.name)}`
          }
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        /> : <Chip
          color='default'
          label={`No ${title} Scan`}
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        />
      }
    </Tooltip>
  </Grid>
}
MalwareFindingCell.displayName = 'MalwareFindingCell'
MalwareFindingCell.propTypes = {
  ocmNode: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  metadataTypedef: PropTypes.object.isRequired,
  severity: PropTypes.object.isRequired,
  lastScan: PropTypes.object,
  scanConfig: PropTypes.object,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}


const BDBACell = ({
  component,
  artefact,
  ocmRepo,
  type,
  severity,
  lastScan,
  scanConfig,
  fetchComplianceSummary,
  isLoading,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  if (scanConfig) {
    // if artefact type filter is set, don't show bdba cell for types that are filtered out
    const artefactTypes = scanConfig.config.bdba.artefact_types
      ? scanConfig.config.bdba.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (artefactTypes && !artefactTypes.some((type) => type === artefact.type)) {
      return null
    }
  }

  const ocmNode = new OcmNode([component], artefact, ARTEFACT_KIND.RESOURCE)
  const title = findTypedefByName({name: type}).friendlyName
  const reportUrl = lastScan?.data.report_url

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={[ocmNode]}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceSummary={fetchComplianceSummary}
        scanConfig={scanConfig}
      />
    }
    <Tooltip
      title={
        <Stack>
          <List>
            {
              scanConfig && <TriggerComplianceToolButton
                ocmNode={ocmNode}
                cfgName={scanConfig.name}
                service={COMPLIANCE_TOOLS.BDBA}
              />
            }
            <RescoringButton
              setMountRescoring={setMountRescoring}
              title={'Rescoring'}
            />
            {
              reportUrl && <BDBAButton reportUrl={reportUrl}/>
            }
          </List>
          {
            isLoading ? <Skeleton/> : <Typography variant='inherit'>
              {
                lastScanTimestampStr(lastScan)
              }
            </Typography>
          }
        </Stack>
      }
    >
      {
        lastScan || isLoading ? <Chip
          color={severity.color}
          label={severity.name === SEVERITIES.CLEAN
            ? `No ${title} Findings`
            : `${title} ${capitalise(severity.name)}`
          }
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        /> : <Chip
          color='default'
          label={`No ${title} Scan`}
          variant='outlined'
          size='small'
          icon={<UnfoldMoreIcon/>}
          clickable={false}
        />
      }
    </Tooltip>
  </Grid>
}
BDBACell.displayName = 'BDBACell'
BDBACell.propTypes = {
  component: PropTypes.object.isRequired,
  artefact: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  type: PropTypes.string.isRequired,
  severity: PropTypes.object.isRequired,
  lastScan: PropTypes.object,
  scanConfig: PropTypes.object,
  fetchComplianceSummary: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
}


export { ComplianceCell, ArtefactCell, IconCell }
