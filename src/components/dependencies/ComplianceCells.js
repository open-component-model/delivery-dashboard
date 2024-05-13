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
import { artefactMetadataTypes, findTypedefByName } from '../../ocm/model'
import { artefactMetadataFilter } from './../../cnudie'
import { COMPLIANCE_TOOLS, SEVERITIES, TOKEN_KEY } from '../../consts'
import { BDBARescoringModal } from './BDBARescoring'
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
    return findings.find((finding) => finding.data.scan_id.report_url)?.data.scan_id.report_url
  }

  const complianceFiltered = compliance.filter(artefactMetadataFilter({
    artefactName: artefact.name,
    artefactVersion: artefact.version,
  }))

  const bdbaFindings = complianceFiltered.filter((d) => d.meta.datasource === 'bdba')
  const structureInfos = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.STRUCTURE_INFO)
  const licenseFindings = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.LICENSE)
  const vulnerabilities = bdbaFindings.filter((d) => d.meta.type === artefactMetadataTypes.VULNERABILITY)
  const malwareData = complianceFiltered.find((d) => d.meta.type === artefactMetadataTypes.MALWARE)
  const osData = complianceFiltered.find((d) => d.meta.type === artefactMetadataTypes.OS_IDS)
  const codecheckData = complianceFiltered.find((d) => d.meta.type === artefactMetadataTypes.CODECHECKS_AGGREGATED)

  return <TableCell>
    <Grid container direction='row-reverse' spacing={1}>
      <IssueChip
        component={component}
        artefact={artefact}
        scanConfigs={scanConfigs}
      />
      {
        artefact.kind === 'resource' && <BDBACell
          component={component}
          artefact={artefact}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.LICENSE}
          severity={getMaxSeverity(licenseFindings)}
          lastUpdateDate={getLatestUpdateTimestamp(bdbaFindings).toLocaleString()}
          reportUrl={getReportUrl(bdbaFindings)}
          scanConfigs={scanConfigs}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
        />
      }
      <GolangChip
        versions={structureInfos.filter((structureInfo) => {
          return structureInfo.data.id.package_name === 'golang-runtime'
        }).map((structureInfo) => structureInfo.data.id.package_version)}
        timestamp={getLatestUpdateTimestamp(structureInfos).toLocaleString()}
      />
      {
        artefact.kind === 'resource' && <MalwareCell
          findings={malwareData?.data.findings}
          timestamp={malwareData?.meta.creation_date}
          severity={artefactMetadatumSeverity(malwareData)}
        />
      }
      {
        artefact.kind === 'resource' && <OsCell
          severity={artefactMetadatumSeverity(osData)}
          timestamp={osData?.meta.creation_date}
          msg={evaluateResourceBranch(osData).reason}
          osInfo={osData?.data.os_info}
        />
      }
      {
        artefact.kind === 'source' && <CodecheckCell
          data={codecheckData?.data}
          severity={artefactMetadatumSeverity(codecheckData)}
          timestamp={codecheckData?.meta.creation_date}
        />
      }
      {
        artefact.kind === 'resource' && <BDBACell
          component={component}
          artefact={artefact}
          ocmRepo={ocmRepo}
          type={artefactMetadataTypes.VULNERABILITY}
          severity={getMaxSeverity(vulnerabilities)}
          lastUpdateDate={getLatestUpdateTimestamp(bdbaFindings).toLocaleString()}
          reportUrl={getReportUrl(bdbaFindings)}
          scanConfigs={scanConfigs}
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


const BDBACell = ({
  component,
  artefact,
  ocmRepo,
  type,
  severity,
  lastUpdateDate,
  reportUrl,
  scanConfigs,
  fetchComplianceData,
  fetchComplianceSummary,
}) => {
  const [mountRescoring, setMountRescoring] = React.useState(false)

  const handleRescoringClose = () => {
    setMountRescoring(false)
  }

  // only show the "shortcut" bdba rescan button iff there is _one_ scan config and this scan config includes
  // a bdba configuration (otherwise, we're not able to determine the correct bdba configs (i.e. groups))
  const scanConfig = scanConfigs?.length === 1 && COMPLIANCE_TOOLS.BDBA in scanConfigs[0].config ? scanConfigs[0] : null

  if (scanConfig) {
    // if artefact type filter is set, don't show bdba cell for types that are filtered out
    const artefactTypes = scanConfig.config.bdba.artefact_types
      ? scanConfig.config.bdba.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (artefactTypes && !artefactTypes.some((type) => type === artefact.type)) {
      return null
    }
  }

  const ocmNode = new OcmNode([component], artefact, 'resource')
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
      mountRescoring && <BDBARescoringModal
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
              title={`${title} Rescoring`}
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
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
}


const MalwareCell = ({
  findings,
  timestamp,
  severity,
}) => {
  if (severity.name === findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).name) return <Tooltip
    title={<Typography variant='inherit'>Last scan: Not scanned yet</Typography>}
  >
    <Grid item>
      <Chip
        color='default'
        label='No Malware Scan'
        variant='outlined'
        size='small'
        clickable={false}
      />
    </Grid>
  </Tooltip>

  return <Tooltip
    title={
      <Typography
        variant='inherit'
        sx={{
          whiteSpace: 'pre-wrap',
          maxWidth: 'none',
        }}
      >
        {findings.length
          ? JSON.stringify(findings, null, 2)
          : `Last scan: ${new Date(timestamp).toLocaleString()}`}
      </Typography>
    }
  >
    <Grid item>
      <Chip
        color={severity.color}
        label={!findings.length ? 'No Malware' : 'Malware found'}
        variant='outlined'
        size='small'
      />
    </Grid>
  </Tooltip>
}
MalwareCell.displayName = 'MalwareCell'
MalwareCell.propTypes = {
  findings: PropTypes.arrayOf(PropTypes.object),
  timestamp: PropTypes.string,
  severity: PropTypes.object.isRequired,
}


export { ComplianceCell, ArtefactCell, IconCell }
