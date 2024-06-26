import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Link,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
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
} from '../../util'
import DockerLogo from '../../res/docker-icon.svg'
import { artefactMetadataTypes, datasources, findTypedefByName } from '../../ocm/model'
import { artefactMetadataFilter } from './../../cnudie'
import {
  ARTEFACT_KIND,
  COMPLIANCE_TOOLS,
  SEVERITIES,
  TOKEN_KEY,
} from '../../consts'
import { RescoringModal } from './RescoringModal'
import { OcmNode } from '../../ocm/iter'
import TriggerComplianceToolButton from './../util/TriggerComplianceToolButton'
import { routes } from '../../api'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'


const OsCell = ({
  severity,
  timestamp,
  msg,
  osInfo,
}) => {
  if (!osInfo) return <Tooltip
    title={<Typography variant='inherit'>Last scan: Not scanned yet</Typography>}
  >
    <Grid item>
      <Chip
        color='default'
        label='No OS Info'
        variant='outlined'
        size='small'
        clickable={false}
      />
    </Grid>
  </Tooltip>

  const emptyOsId = Object.values(osInfo).every(e => e === null)

  if (emptyOsId) return <Tooltip
    title={
      <Typography
        variant='inherit'
        sx={{
          whiteSpace: 'pre-wrap',
          maxWidth: 'none',
        }}
      >
        Unable to determine an OS, thus probably a scratch image.
      </Typography>
    }
    placement='top-start'
    describeChild
  >
    <Grid item>
      <Chip
        label='Scratch Image'
        variant='outlined'
        color='default'
        size='small'
      />
    </Grid>
  </Tooltip>

  const localeDateTime = new Date(timestamp).toLocaleString()
  return <Tooltip
    title={
      <Stack direction='column' spacing={1}>
        <Stack direction={'column'} spacing={1}>
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
        label={`${osInfo.ID} ${osInfo.VERSION_ID}`}
        variant='outlined'
        size='small'
      />
    </Grid>
  </Tooltip>
}
OsCell.displayName = 'OsCell'
OsCell.propTypes = {
  severity: PropTypes.object.isRequired,
  timestamp: PropTypes.string,
  msg: PropTypes.string,
  osInfo: PropTypes.object,
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
  return complianceData.find((d) => {
    return (
      d.meta.type === artefactMetadataTypes.ARTEFACT_SCAN_INFO
      && d.meta.datasource === datasource
    )
  })
}


const ComplianceCell = ({
  component,
  artefact,
  ocmRepo,
  compliance,
  fetchComplianceData,
  fetchComplianceSummary,
  scanConfigs,
  isLoading,
  isError,
}) => {
  if (isError) {
    return <TableCell>
      <Stack direction='row-reverse' spacing={2}>
        <Alert severity='error'>Unable to fetch Compliance Data</Alert>
      </Stack>
    </TableCell>
  }
  if (isLoading) {
    return <TableCell>
      <Stack direction='row-reverse' spacing={2}>
        <CircularProgress color='inherit' size={20}/>
      </Stack>
    </TableCell>
  }

  const getMaxSeverity = (findings) => {
    return findings.reduce((prevSeverity, curFinding) => {
      const curSeverity = artefactMetadatumSeverity(curFinding)
      return curSeverity.value > prevSeverity.value ? curSeverity : prevSeverity
    }, findSeverityCfgByName({name: SEVERITIES.CLEAN}))
  }
  const getLatestUpdateTimestamp = (findings) => {
    return findings.reduce((prevDate, curFinding) => {
      const curDate = new Date(curFinding.meta.last_update)
      if (!prevDate || curDate.getTime() > prevDate.getTime()) {
        return curDate
      }
      return prevDate
    }, new Date(0))
  }
  const getReportUrl = (findings) => {
    return findings.find((finding) => finding.data.report_url)?.data.report_url
  }

  const complianceFiltered = compliance.filter(artefactMetadataFilter({
    artefactName: artefact.name,
    artefactVersion: artefact.version,
  }))

  const bdbaFindings = complianceFiltered.filter((d) => d.meta.datasource === 'bdba')
  const structureInfos = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.STRUCTURE_INFO)
  const licenseFindings = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.LICENSE)
  const vulnerabilities = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.VULNERABILITY)
  const osData = complianceFiltered.find((d) => d.meta.type === artefactMetadataTypes.OS_IDS)
  const codecheckData = complianceFiltered.find((d) => d.meta.type === artefactMetadataTypes.CODECHECKS_AGGREGATED)

  const malwareFindings = complianceFiltered.filter((d) => d.meta.type === artefactMetadataTypes.FINDING_MALWARE)
  const lastMalwareScan = findLastScan(complianceFiltered, datasources.CLAMAV)

  const singleScanCfgOrNull = ({
    scanCfgs,
    complianceToolName,
  }) => {
    // only show the "shortcut" rescan button iff there is _one_ scan config and this scan config includes
    // a certain configuration (otherwise, we're not able to determine the correct configs (i.e. bdba groups))
    return scanCfgs?.length === 1 && complianceToolName in scanCfgs[0].config ? scanCfgs[0] : null
  }

  return <TableCell>
    <Grid container direction='row-reverse' spacing={1}>
      <IssueChip
        component={component}
        artefact={artefact}
        scanConfigs={scanConfigs}
      />
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <BDBACell
          component={component}
          artefact={artefact}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.LICENSE}
          severity={getMaxSeverity(licenseFindings)}
          lastUpdateDate={getLatestUpdateTimestamp(bdbaFindings).toLocaleString()}
          reportUrl={getReportUrl(bdbaFindings)}
          scanConfig={singleScanCfgOrNull({scanCfgs: scanConfigs, complianceToolName: COMPLIANCE_TOOLS.BDBA})}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
        />
      }
      <GolangChip
        versions={structureInfos.filter((structureInfo) => {
          return structureInfo.data.package_name === 'golang-runtime'
        }).map((structureInfo) => structureInfo.data.package_version)}
        timestamp={getLatestUpdateTimestamp(structureInfos).toLocaleString()}
      />
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <MalwareFindingCell
          ocmNode={new OcmNode([component], artefact, ARTEFACT_KIND.RESOURCE)}
          ocmRepo={ocmRepo}
          metadataTypedef={findTypedefByName({name: artefactMetadataTypes.FINDING_MALWARE})}
          scanConfig={singleScanCfgOrNull({scanCfgs: scanConfigs, complianceToolName: COMPLIANCE_TOOLS.CLAMAV})}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
          lastScan={lastMalwareScan}
          severity={getMaxSeverity(malwareFindings)}
        />
      }
      {
        artefact.kind === ARTEFACT_KIND.RESOURCE && <OsCell
          severity={artefactMetadatumSeverity(osData)}
          timestamp={osData?.meta.creation_date}
          msg={evaluateResourceBranch(osData).reason}
          osInfo={osData?.data.os_info}
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
          severity={getMaxSeverity(vulnerabilities)}
          lastUpdateDate={getLatestUpdateTimestamp(bdbaFindings).toLocaleString()}
          reportUrl={getReportUrl(bdbaFindings)}
          scanConfig={singleScanCfgOrNull({scanCfgs: scanConfigs, complianceToolName: COMPLIANCE_TOOLS.BDBA})}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
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
  compliance: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
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
    title={<Typography variant='inherit'>Last scan: Not scanned yet</Typography>}
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
  fetchComplianceData,
  fetchComplianceSummary,
  lastScan,
  severity,
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

  const lastScanTimestamp = (lastScan) => {
    if (!lastScan) return null
    return new Date(lastScan.meta.last_update).toLocaleString()
  }

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={[ocmNode]}
        ocmRepo={ocmRepo}
        handleClose={handleRescoringClose}
        fetchComplianceData={fetchComplianceData}
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
          <Typography variant='inherit'>
            {
              lastScan
                ? `Last scan: ${lastScanTimestamp(lastScan)}`
                : 'No last scan'
            }
          </Typography>
        </Stack>
      }
    >
      {
        lastScan ? <Chip
          color={severity.color}
          label={severity.name === SEVERITIES.CLEAN
            ? `No ${title}`
            : `${title} found`
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
          icon={scanConfig && <UnfoldMoreIcon/>}
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
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
}


const BDBACell = ({
  component,
  artefact,
  ocmRepo,
  type,
  severity,
  lastUpdateDate,
  reportUrl,
  scanConfig,
  fetchComplianceData,
  fetchComplianceSummary,
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

  if (!reportUrl) return <Tooltip
    title={
      <Stack>
        {
          scanConfig && <TriggerComplianceToolButton
            ocmNode={ocmNode}
            cfgName={scanConfig.name}
            service={COMPLIANCE_TOOLS.BDBA}
          />
        }
        <Typography variant='inherit'>Last scan: Not scanned yet</Typography>
      </Stack>
    }
  >
    <Grid item>
      <Chip
        color='default'
        label={`No ${title} Scan`}
        variant='outlined'
        size='small'
        icon={scanConfig && <UnfoldMoreIcon/>}
        clickable={false}
      />
    </Grid>
  </Tooltip>

  return <Grid item onClick={(e) => e.stopPropagation()}>
    {
      mountRescoring && <RescoringModal
        ocmNodes={[ocmNode]}
        ocmRepo={ocmRepo}
        type={type}
        handleClose={handleRescoringClose}
        fetchComplianceData={fetchComplianceData}
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
            <BDBAButton reportUrl={reportUrl}/>
          </List>
          <Divider/>
          <Typography variant='inherit'>
            {`Last scan: ${lastUpdateDate}`}
          </Typography>
        </Stack>
      }
    >
      <Chip
        color={severity.color}
        label={severity.name === SEVERITIES.CLEAN
          ? `No ${title} Findings`
          : `${title} ${capitalise(severity.name)}`
        }
        variant='outlined'
        size='small'
        icon={<UnfoldMoreIcon/>}
        clickable={false}
      />
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
  lastUpdateDate: PropTypes.string.isRequired,
  reportUrl: PropTypes.string,
  scanConfig: PropTypes.object,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
}


export { ComplianceCell, ArtefactCell, IconCell }
