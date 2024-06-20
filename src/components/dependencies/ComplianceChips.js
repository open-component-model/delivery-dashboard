import React from 'react'
import PropTypes from 'prop-types'

import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Grid,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  Skeleton,
  Stack,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'

import SemVer from 'semver'

import { OcmNode } from './../../ocm/iter'
import { defaultTypedefForName, findTypedefByName } from '../../ocm/model'
import { parseRelaxedSemver } from '../../osUtil'
import { findSeverityCfgByName } from '../../util'
import { COMPLIANCE_TOOLS, SEVERITIES } from './../../consts'
import TriggerComplianceToolButton from './../util/TriggerComplianceToolButton'


const ComponentChip = ({ componentSummary }) => {
  if (!componentSummary) return <Skeleton/>

  const mostCriticalSeverity = componentSummary.entries.reduce((element,max) => {
    if (findSeverityCfgByName({name: element.severity}).value > findSeverityCfgByName({name: max.severity}).value) {
      return element
    } else {
      return max
    }
  })

  const mostCriticalSeverityValues = componentSummary.entries.filter((element) => {
    return findSeverityCfgByName({name: element.severity}).value === findSeverityCfgByName({name: mostCriticalSeverity.severity}).value
  })

  const IndicatorTooltipTitle = ({ summaries }) => {
    return <Stack direction='column' spacing={1}>
      {
        summaries.map((summary) => {
          let typedef = findTypedefByName({name: summary.type})
          if (!typedef) typedef = defaultTypedefForName({name: summary.type})
          const severityCfg = findSeverityCfgByName({name: summary.severity})
          const Indicator = severityCfg.Indicator

          return <Stack
            key={JSON.stringify(summary)}
            direction='column'
            spacing={1}
          >
            <Stack direction='row' spacing={1} key={JSON.stringify(summary)+'_title'}>
              <Indicator color={severityCfg.color} size='small'/>
              <Box display='flex' alignItems='center' justifyContent='center'>
                <Typography>{typedef.friendlyName}</Typography>
              </Box>
            </Stack>
            <Stack direction='column' spacing={0} key={JSON.stringify(summary)+'_body'}>
              <Typography variant='caption'>Severity: {summary.severity}</Typography>
              <Typography variant='caption'>Source: {summary.source}</Typography>
              <Typography variant='caption'>ScanStatus: {summary.scanStatus}</Typography>
            </Stack>
            <Divider/>
          </Stack>
        })
      }
    </Stack>
  }
  IndicatorTooltipTitle.displayName = 'IndicatorTooltipTitle'
  IndicatorTooltipTitle.propTypes = {
    summaries: PropTypes.array.isRequired,
  }

  // only low and more severe
  if (!(findSeverityCfgByName({name : mostCriticalSeverity.severity}).value >= findSeverityCfgByName({name: SEVERITIES.MEDIUM}).value)) return null

  componentSummary.entries.sort((left, right) => {
    const leftCfg = findSeverityCfgByName({name: left.severity})
    const rightCfg = findSeverityCfgByName({name: right.severity})
    if (leftCfg.value > rightCfg.value) return -1
    if (leftCfg.value < rightCfg.value) return 1
    return 0
  })

  const severityCfg = findSeverityCfgByName({name: mostCriticalSeverity.severity})
  const Indicator = severityCfg.Indicator

  return <Box display='flex' alignItems='center' justifyContent='center'>
    <Tooltip
      title={<IndicatorTooltipTitle summaries={componentSummary.entries}/>}
    >
      <Badge
        badgeContent={mostCriticalSeverityValues.length}
        color='primary'
        invisible={mostCriticalSeverityValues.length > 1 ? false : true}
      >
        <Indicator color={severityCfg.color}/>
      </Badge>
    </Tooltip>
  </Box>
}
ComponentChip.displayName = 'ComponentChip'
ComponentChip.propTypes = {
  componentSummary: PropTypes.object,
}

/**
 * reasoned color string for given resource os information
 */
const evaluateResourceBranch = (resource) => {
  const eolString = (eolInfo) => {
    if (typeof eolInfo == 'string') return `EOL reached on ${new Date(eolInfo).toLocaleDateString()}`

    return 'EOL reached'
  }

  const newerVersionAvailableString = (version) => {
    return `Newer Patch Version is available, ${version}`
  }

  if (!resource)
    return {
      reason: 'no resource os information found',
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }

  if (!resource.branchInfo)
    return {
      reason: 'no os branch information found',
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }

  const now = new Date()
  const branchEol = new Date(resource.branchInfo.eol_date)
  const resourceSemVer = parseRelaxedSemver(resource.data.os_info.VERSION_ID)
  let branchSemVer = null
  if (resource.branchInfo.greatest_version) {
    branchSemVer = parseRelaxedSemver(resource.branchInfo.greatest_version)
  }
  if (!resourceSemVer && !branchSemVer) {
    return {
      severity: findSeverityCfgByName({name: SEVERITIES.UNKNOWN}),
    }
  }

  if (!branchSemVer) {
    if (now > branchEol) {
      // eol reached
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: 'Greatest Version',
      severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
    }
  }

  if (SemVer.eq(branchSemVer, resourceSemVer)) {
    // is greatest version
    if (now > branchEol) {
      // eol reached
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: 'Greatest Version',
      severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
    }
  } else if (SemVer.lt(resourceSemVer, branchSemVer)) {
    if (now > branchEol) {
      return {
        reason: eolString(resource.branchInfo.eol_date),
        severity: findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
      }
    }
    return {
      reason: newerVersionAvailableString(branchSemVer),
      severity: findSeverityCfgByName({name: SEVERITIES.MEDIUM}),
    }
  }

  /**
   * image has newer os version than we know
   * occurred when EOL API removed debian latest release minor
   * see: https://github.com/endoflife-date/endoflife.date/issues/1396
   */
  return {
    reason: 'Greatest Version',
    severity: findSeverityCfgByName({name: SEVERITIES.CLEAN}),
  }
}

const GolangChip = ({
  versions,
  timestamp,
}) => {
  if (!versions?.length > 0) return null

  const hasNoNullVersion = versions.find((e) => {
    if (e === undefined) return false
    return true
  })

  const sortedVersions = versions.filter((e) => e !== null).sort((left, right) => {
    if (!SemVer.valid(left)) return 1
    if (!SemVer.valid(right)) return -1

    return SemVer.lt(parseRelaxedSemver(left), parseRelaxedSemver(right))
  })

  return <Tooltip
    title={
      <Stack direction='column' spacing={1}>
        {
          <Stack direction='column'>
            {sortedVersions.map((version) => {
              return (
                <Typography
                  key={version}
                  variant='inherit'
                  sx={{
                    whiteSpace: 'pre-wrap',
                    maxWidth: 'none',
                  }}
                >
                  {version}
                </Typography>
              )
            })}
            {
              !hasNoNullVersion ? <Typography
                key={'golang_null'}
                variant='inherit'
                sx={{
                  whiteSpace: 'pre-wrap',
                  maxWidth: 'none',
                }}
              >
                Unknown Version
              </Typography> : null
            }
          </Stack>
        }
        <Divider/>
        <Typography variant='inherit'>
          {`Last scan: ${timestamp}`}
        </Typography>
      </Stack>
    }
  >
    <Grid item>
      <Chip
        label='Golang'
        variant='outlined'
        size='small'
        color={hasNoNullVersion ? 'default' : 'warning'}
      />
    </Grid>
  </Tooltip>
}
GolangChip.displayName = 'GolangChip'
GolangChip.propTypes = {
  versions: PropTypes.arrayOf(PropTypes.string),
  timestamp: PropTypes.string,
}

const IssueChip = ({
  component,
  artefact,
  scanConfigs,
}) => {
  // only show issue cell iff there is _one_ scan config and this scan config includes an
  // issue replicator configuration (otherwise, we're not able to determine a github repo url)
  if (!(scanConfigs?.length === 1 && COMPLIANCE_TOOLS.ISSUE_REPLICATOR in scanConfigs[0].config)) return
  const scanConfig = scanConfigs[0]

  if (scanConfig) {
    // if artefact type filter is set, don't show license chip for types that are filtered out
    const artefactTypes = scanConfig.config.issueReplicator.artefact_types
      ? scanConfig.config.issueReplicator.artefact_types
      : scanConfig.config.defaults.artefact_types

    if (artefactTypes && !artefactTypes.some((type) => type === artefact.type)) {
      return null
    }
  }

  const repoUrl = scanConfig.config.issueReplicator.github_issues_target_repository_url
  const issueState = encodeURIComponent('is:open')
  const name = encodeURIComponent(`${component.name}:${artefact.name}`)
  const repoUrlForArtefact = `https://${repoUrl}/issues?q=${issueState}+${name}`

  return <Tooltip
    title={
      <List>
        <TriggerComplianceToolButton
          ocmNode={new OcmNode([component], artefact, 'resource')}
          cfgName={scanConfig.name}
          service={COMPLIANCE_TOOLS.ISSUE_REPLICATOR}
        />
        <ListItemButton
          onClick={(e) => e.stopPropagation()}
          component='a'
          href={repoUrlForArtefact}
          target='_blank'
        >
          <ListItemAvatar>
            <Avatar>
              <OpenInNewIcon/>
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={'View on GitHub'}
            secondary={repoUrl}
            secondaryTypographyProps={{color: 'lightgrey'}}
          />
        </ListItemButton>
      </List>
    }
  >
    <Grid item>
      <Chip
        color='default'
        label='Issues'
        variant='outlined'
        size='small'
        icon={<UnfoldMoreIcon/>}
        clickable={false}
      />
    </Grid>
  </Tooltip>
}
IssueChip.displayName = 'IssueChip'
IssueChip.propTypes = {
  component: PropTypes.object.isRequired,
  artefact: PropTypes.object.isRequired,
  scanConfigs: PropTypes.arrayOf(PropTypes.object),
}

export {
  ComponentChip,
  GolangChip,
  IssueChip,
  evaluateResourceBranch,
}
