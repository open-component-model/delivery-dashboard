import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Box,
  Card,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import { enqueueSnackbar } from 'notistack'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import UndoIcon from '@mui/icons-material/Undo'

import { ConfigContext, FeatureRegistrationContext } from './../../App'
import { rescore } from './../../api'
import {
  copyNotificationCfg,
  errorSnackbarProps,
  features,
  SEVERITIES,
  TOKEN_KEY,
} from './../../consts'
import { registerCallbackHandler } from './../../feature'
import { OcmNode, OcmNodeDetails } from './../../ocm/iter'
import {
  artefactMetadataTypes,
  findTypedefByName,
  knownLabelNames,
} from './../../ocm/model'
import {
  findSeverityCfgByName,
  isTokenExpired,
  mostSpecificRescoring,
  normaliseObject,
  orderRescoringsBySpecificity,
  pluralise,
  trimLongString,
} from './../../util'
import CopyOnClickChip from './../util/CopyOnClickChip'
import ErrorBoundary from './../util/ErrorBoundary'
import ObjectTextViewer from './../util/ObjectTextViewer'


const CUSTOM_RESCORING_RULE_NAME = 'custom-rescoring'

const scopeOptions = {
  GLOBAL: 'Global',
  COMPONENT: 'Component',
  ARTEFACT: 'Artefact',
  SINGLE: 'Single',
}
Object.freeze(scopeOptions)
const scopeHelp = (
  `The scope defines the range of artefacts this rescoring is applied to.
  "Global" indicates the rescoring is applied independently of any component or artefact. All findings with the same identity in the same package will receive the rescoring.
  "Component" implies the rescoring is done among all component versions and for all artefacts of this component.
  "Artefact" means the rescoring is applied to all matching findings which share the same component name as well as artefact name (the rescoring is re-used across version updates).
  "Single" indicates the rescoring is only valid for the exact pair of component name and version as well as artefact name and version (the rescoring is not transported across any version updates).`
)


/**
 * patch ocmNode and originally proposed rescoring to rescoring proposals
 */
const patchRescoringProposals = (rescoringProposals, ocmNode) => {
  return rescoringProposals.then((rp) => rp.map((rescoringProposal) => {
    if (!ocmNode) return rescoringProposal
    return {
      ...rescoringProposal,
      ocmNode: ocmNode,
      originalSeverityProposal: rescoringProposal.severity,
      originalMatchingRules: rescoringProposal.matching_rules,
    }
  }))
}


const rescoringIdentity = (rescoring) => {
  const findingId = JSON.stringify(normaliseObject(rescoring.finding.id))

  return `${rescoring.ocmNode.identity()}_${findingId}_${rescoring.finding.cve}`
}


const rescoringProposalSeverity = (rescoringProposal) => {
  const applicableRescorings = rescoringProposal.applicable_rescorings

  if (applicableRescorings.length === 0) {
    return rescoringProposal.finding.severity
  }

  return mostSpecificRescoring(applicableRescorings).data.severity
}


const LinearProgressWithLabel = ({value}) => {
  return <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Box sx={{ width: '100%', mr: 1 }}>
      <Tooltip title='Fetching rescorings ...'>
        <LinearProgress variant='determinate' value={value} color='secondary'/>
      </Tooltip>
    </Box>
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress size='3em'/>
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant='body' color='text.secondary'>
          {
            `${Math.round(value)}%`
          }
        </Typography>
      </Box>
    </Box>
  </Box>
}
LinearProgressWithLabel.displayName = 'LinearProgressWithLabel'
LinearProgressWithLabel.propTypes = {
  value: PropTypes.number.isRequired,
}


const SelectCveRescoringRuleSet = ({
  cveRescoringRuleSet,
  setCveRescoringRuleSet,
  rescoringFeature,
}) => {
  const cveRescoringRuleSets = rescoringFeature.rescoring_rule_sets

  return <Select
    value={cveRescoringRuleSet.name}
    onChange={(e) => setCveRescoringRuleSet(cveRescoringRuleSets.find((rs) => rs.name === e.target.value))}
  >
    {
      cveRescoringRuleSets.map((ruleSet, idx) => <MenuItem
        value={ruleSet.name}
        key={idx}
      >
        {
          ruleSet.name
        }
      </MenuItem>)
    }
  </Select>
}
SelectCveRescoringRuleSet.displayName = 'SelectCveRescoringRuleSet'
SelectCveRescoringRuleSet.propTypes = {
  cveRescoringRuleSet: PropTypes.object.isRequired,
  setCveRescoringRuleSet: PropTypes.func.isRequired,
  rescoringFeature: PropTypes.object.isRequired,
}


const VulnerabilityRescoringInputs = ({
  cveRescoringRuleSet,
  setCveRescoringRuleSet,
  rescoringFeature,
  ocmNodes,
}) => {
  const [selectedNode, setSelectedNode] = React.useState(ocmNodes[0])
  const cveCategorisationLabel = selectedNode.findLabel(knownLabelNames.cveCategorisation)

  return <Stack spacing={2}>
    <Typography>CVE Categorisation (from Component-Descriptor label)</Typography>
    <FormControl>
      <InputLabel>Artefact</InputLabel>
      <Select
        value={selectedNode}
        label='Artefact'
        onChange={(e) => setSelectedNode(e.target.value)}
      >
        {
          ocmNodes.map((ocmNode, idx) => <MenuItem
            key={idx}
            value={ocmNode}
          >
            {
              ocmNode.name()
            }
          </MenuItem>)
        }
      </Select>
    </FormControl>
    <Box border={1} borderColor='primary.main'>
      <ObjectTextViewer obj={cveCategorisationLabel ? cveCategorisationLabel : { info: 'no label found for this artefact' } }/>
    </Box>
    <Divider/>
    <Typography>CVE Rescoring Rule Set</Typography>
    <SelectCveRescoringRuleSet
      cveRescoringRuleSet={cveRescoringRuleSet}
      setCveRescoringRuleSet={setCveRescoringRuleSet}
      rescoringFeature={rescoringFeature}
    />
    <Box border={1} borderColor='primary.main'>
      <ObjectTextViewer obj={cveRescoringRuleSet.rules}/>
    </Box>
  </Stack>
}
VulnerabilityRescoringInputs.displayName = 'VulnerabilityRescoringInputs'
VulnerabilityRescoringInputs.propTypes = {
  cveRescoringRuleSet: PropTypes.object.isRequired,
  setCveRescoringRuleSet: PropTypes.func.isRequired,
  rescoringFeature: PropTypes.object.isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
}


const VulnerabilityRescoringDrawer = ({
  open,
  handleClose,
  cveRescoringRuleSet,
  setCveRescoringRuleSet,
  rescoringFeature,
  ocmNodes,
}) => {
  return <Drawer
    PaperProps={{
      style: {
        position: 'absolute',
        width: '100vh',
      }
    }}
    variant='persistent'
    anchor='left'
    open={open}
    onClick={(e) => e.stopPropagation()}
  >
    <Box
      borderLeft={1}
      borderRight={1}
      borderLeftColor={'primary.main'}
      borderRightColor={'primary.main'}
    >
      <Box
        position='sticky'
        top={0}
        left={0}
        width='100%'
        zIndex={999}
        paddingTop={3}
        paddingLeft={3}
        paddingRight={3}
        bgcolor='background.paper'
        borderTop={1}
        borderTopColor='primary.main'
      >
        <Tooltip title='Close rescoring rules'>
          <IconButton onClick={handleClose}>
            <ChevronLeftIcon/>
          </IconButton>
        </Tooltip>
        <div style={{ padding: '0.5em' }}/>
        <Divider/>
      </Box>
      <Box paddingLeft={3} paddingRight={3}>
        <div style={{ padding: '0.5em' }}/>
        <VulnerabilityRescoringInputs
          cveRescoringRuleSet={cveRescoringRuleSet}
          setCveRescoringRuleSet={setCveRescoringRuleSet}
          rescoringFeature={rescoringFeature}
          ocmNodes={ocmNodes}
        />
      </Box>
      <Box
        position='sticky'
        bottom={0}
        right={0}
        width='100%'
        zIndex={999}
        paddingBottom={3}
        paddingLeft={3}
        paddingRight={3}
        bgcolor='background.paper'
        borderBottom={1}
        borderBottomColor='primary.main'
      >
        <Divider/>
      </Box>
    </Box>
  </Drawer>
}
VulnerabilityRescoringDrawer.displayName = 'VulnerabilityRescoringDrawer'
VulnerabilityRescoringDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  cveRescoringRuleSet: PropTypes.object.isRequired,
  setCveRescoringRuleSet: PropTypes.func.isRequired,
  rescoringFeature: PropTypes.object.isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const RescoringHeader = ({
  ocmNodes,
  title,
}) => {
  return <Stack display='flex' justifyContent='center' alignItems='center'>
    <Typography variant='h6'>{title}</Typography>
    <Tooltip
      title={<Stack>
        {
          ocmNodes.map((ocmNode, idx) => <Typography key={idx}>
            {
              ocmNode.name()
            }
          </Typography>)
        }
      </Stack>}
    >
      <Typography variant='h6' color='secondary'>
        {
          trimLongString((ocmNodes.map((ocmNode) => ocmNode.name())).join(', '), 100)
        }
      </Typography>
    </Tooltip>
  </Stack>
}
RescoringHeader.displayName = 'RescoringHeader'
RescoringHeader.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  title: PropTypes.string.isRequired,
}


const RescoringRowLoading = () => {
  return <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
    <TableCell width='50vw'/>
    <TableCell width='100vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='140vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='70vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='40vw'>
      <TrendingFlatIcon/>
    </TableCell>
    <TableCell width='120vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='220vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='150vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='50vw'/>
  </TableRow>
}
RescoringRowLoading.displayName = 'RescoringRowLoading'


const FilesystemPathsInfo = ({
  filesystemPaths,
}) => {
  return <>
    <Typography
      variant='inherit'
      sx={{
        fontWeight: 'bold',
      }}
      marginBottom='0.5rem'
    >
      Filesystem Paths
    </Typography>
    {
      filesystemPaths.map((filesystemPath, idx) => <React.Fragment key={filesystemPath.digest}>
        {
          idx !== 0 && <Divider sx={{ marginY: '0.5rem' }}/>
        }
        <Typography variant='inherit' whiteSpace='pre-line'>
          {
            `Path: ${filesystemPath.path}
            Digest: ${filesystemPath.digest}`
          }
        </Typography>
      </React.Fragment>)
    }
  </>
}
FilesystemPathsInfo.displayName = 'FilesystemPathsInfo'
FilesystemPathsInfo.propTypes = {
  filesystemPaths: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const LicenseExtraInfo = ({
  filesystemPaths,
}) => {
  return filesystemPaths.length > 0 && <Tooltip
    title={<FilesystemPathsInfo filesystemPaths={filesystemPaths}/>}
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </Tooltip>
}
LicenseExtraInfo.displayName = 'LicenseExtraInfo'
LicenseExtraInfo.propTypes = {
  filesystemPaths: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const VulnerabilityExtraInfo = ({
  vector,
  filesystemPaths,
}) => {
  // example: AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L
  // see https://www.first.org/cvss/ for more context

  const details = {
    AV: {
      name: 'Attack Vector (AV)',
      values: {
        N: 'Network',
        A: 'Adjacent Network',
        L: 'Local',
        P: 'Physical',
      },
    },
    AC: {
      name: 'Attack Complexity (AC)',
      values: {
        L: 'Low',
        H: 'High',
      },
    },
    PR: {
      name: 'Privileges Required (PR)',
      values: {
        N: 'None',
        L: 'Low',
        H: 'High',
      },
    },
    UI: {
      name: 'User Interaction (UI)',
      values: {
        N: 'None',
        R: 'Required',
      },
    },
    S: {
      name: 'Scope (S)',
      values: {
        U: 'Unchanged',
        C: 'Changed',
      },
    },
    C: {
      name: 'Confidentiality (C)',
      values: {
        N: 'None',
        L: 'Low',
        H: 'High',
      },
    },
    I: {
      name: 'Integrity (I)',
      values: {
        N: 'None',
        L: 'Low',
        H: 'High',
      },
    },
    A: {
      name: 'Availability (A)',
      values: {
        N: 'None',
        L: 'Low',
        H: 'High',
      },
    },
  }
  Object.freeze(details)

  return <Tooltip
    title={
      <Stack onClick={(e) => e.stopPropagation()}>
        {
          filesystemPaths.length > 0 && <>
            <FilesystemPathsInfo filesystemPaths={filesystemPaths}/>
            <Divider sx={{ marginTop: '0.5rem', marginBottom: '1rem' }}/>
          </>
        }
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          CVSS Attack Vector
        </Typography>
        {
          vector.split('/').map((e) => {
            const [name, value] = e.split(':')
            return <Typography key={name} variant='inherit'>
              {
                `${details[name].name}: ${details[name].values[value]}`
              }
            </Typography>
          })
        }
      </Stack>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </Tooltip>
}
VulnerabilityExtraInfo.displayName = 'VulnerabilityExtraInfo'
VulnerabilityExtraInfo.propTypes = {
  vector: PropTypes.string.isRequired,
  filesystemPaths: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const ApplicableRescoringsRow = ({
  applicableRescoring,
  priority,
  fetchDeleteApplicableRescoring,
  isAuthenticated,
}) => {
  const [rowHovered, setRowHovered] = React.useState(false)
  const [isConfirmDeletion, setIsConfirmDeletion] = React.useState(false)

  const componentName = applicableRescoring.artefact.component_name
  const componentVersion = applicableRescoring.artefact.component_version
  const artefactName = applicableRescoring.artefact.artefact.artefact_name

  const scope = !componentName ? scopeOptions.GLOBAL
    : (!artefactName ? scopeOptions.COMPONENT
      : (!componentVersion ? scopeOptions.ARTEFACT
        : scopeOptions.SINGLE
      )
    )

  const localeDate = new Date(applicableRescoring.meta.creation_date).toLocaleString()

  return <TableRow
    onMouseEnter={() => setRowHovered(true)}
    onMouseLeave={() => {
      setRowHovered(false)
      setIsConfirmDeletion(false)
    }}
    hover
  >
    <TableCell align='center'>{priority}</TableCell>
    <TableCell>
      <Stack alignItems='center'>
        <Typography variant='inherit'>
          {
            localeDate.split(', ')[0] // date
          }
        </Typography>
        <Typography variant='inherit'>
          {
            localeDate.split(', ')[1] // time
          }
        </Typography>
      </Stack>
    </TableCell>
    <TableCell align='center'>
      <CopyOnClickChip
        value={scope}
        message='Scope copied!'
        chipProps={{
          variant: 'outlined',
          title: scope,
        }}
      />
    </TableCell>
    <TableCell align='center'>
      <Typography variant='inherit' color={`${findSeverityCfgByName({name: applicableRescoring.data.severity}).color}.main`}>
        {
          applicableRescoring.data.severity
        }
      </Typography>
    </TableCell>
    <TableCell align='center'>{applicableRescoring.data.user.username}</TableCell>
    <TableCell>
      <Typography variant='inherit' sx={{ wordWrap: 'break-word' }}>{applicableRescoring.data.comment}</Typography>
    </TableCell>
    <TableCell>
      {
        applicableRescoring.data.matching_rules.map((rule_name) => <Typography key={rule_name} variant='inherit'>
          {
            rule_name
          }
        </Typography>)
      }
    </TableCell>
    {
      isAuthenticated && <TableCell align='center' sx={{ border: 0 }}>
        {
          rowHovered && (isConfirmDeletion ? <Tooltip title='Confirm'>
            <IconButton onClick={() => fetchDeleteApplicableRescoring(applicableRescoring)}>
              <CheckIcon/>
            </IconButton>
          </Tooltip> : <Tooltip title='Delete applied rescoring'>
            <IconButton onClick={() => setIsConfirmDeletion(true)}>
              <DeleteIcon/>
            </IconButton>
          </Tooltip>)
        }
      </TableCell>
    }
  </TableRow>
}
ApplicableRescoringsRow.displayName = 'ApplicableRescoringsRow'
ApplicableRescoringsRow.propTypes = {
  applicableRescoring: PropTypes.object.isRequired,
  priority: PropTypes.number.isRequired,
  fetchDeleteApplicableRescoring: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
}


const ApplicableRescorings = ({
  rescoring,
  setRescorings,
  fetchComplianceData,
  fetchComplianceSummary,
  isAuthenticated,
  expanded,
  rescoringFeature,
}) => {
  if (rescoring.applicable_rescorings.length === 0) {
    // if all applicable rescorings were deleted, don't show collapse anymore
    return null
  }

  const fetchDeleteApplicableRescoring = async (applicableRescoring) => {
    try {
      await rescore.delete({
        id: applicableRescoring.id,
      })
      fetchComplianceData()
      if (fetchComplianceSummary) {
        // function is not defined when invoked from compliance tab
        fetchComplianceSummary(false)
      }
    } catch (error) {
      enqueueSnackbar(
        'Rescoring could not be deleted',
        {
          ...errorSnackbarProps,
          details: error.toString(),
          onRetry: () => fetchDeleteApplicableRescoring(applicableRescoring),
        },
      )
      return
    }

    enqueueSnackbar(
      'Successfully deleted rescoring',
      {
        variant: 'success',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
        autoHideDuration: 6000,
      },
    )

    const normalisedRescoring = JSON.stringify(normaliseObject(applicableRescoring))
    setRescorings((prev) => prev.map((r) => {
      return {
        ...r,
        applicable_rescorings: r.applicable_rescorings.filter((ar) => {
          return JSON.stringify(normaliseObject(ar)) !== normalisedRescoring
        }),
      }
    }))
  }

  return <TableRow>
    <TableCell sx={{ padding: 0, border: 'none' }} colSpan={9}>
      <Collapse in={expanded} unmountOnExit>
        <Card sx={{ paddingY: '1rem' }}>
          <Typography sx={{ paddingLeft: '1rem' }}>Applicable Rescorings</Typography>
          <Table sx={{ tableLayout: 'fixed', overflowX: 'hidden' }}>
            <TableHead>
              <TableRow>
                <TableCell width='40vw' align='center'>
                  <Tooltip
                    title={`
                      The rescoring with priority "1" is the one that is used for this finding.
                      The remaining rescorings (if any), also match this finding based on their
                      scope, but they're not applied because they are less specific or older than
                      the rescoring with priority "1".
                    `}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant='inherit'>Prio</Typography>
                      <HelpOutlineIcon sx={{ height: '1rem' }}/>
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell width='100vw' align='center'>Date</TableCell>
                <TableCell width='100vw'>
                  <Tooltip
                    title={<Typography
                      variant='inherit'
                      whiteSpace='pre-line'
                    >
                      {
                        scopeHelp
                      }
                    </Typography>}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant='inherit'>Scope</Typography>
                      <HelpOutlineIcon sx={{ height: '1rem' }}/>
                    </div>
                  </Tooltip>
                </TableCell>
                <TableCell width='90vw' align='center'>Severity</TableCell>
                <TableCell width='90vw' align='center'>User</TableCell>
                <TableCell width='200vw'>Comment</TableCell>
                <TableCell width='150vw'>
                  {
                    rescoringFeature?.cve_categorisation_label_url ? <Tooltip
                      title={<Typography variant='inherit'>
                        See <Link
                          href={rescoringFeature.cve_categorisation_label_url}
                          target='_blank'
                          sx={{
                            color: 'orange'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {' docs '}
                        </Link> for more information about rescoring rules.
                      </Typography>}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant='inherit'>Applied Rules</Typography>
                        <HelpOutlineIcon sx={{ height: '1rem' }}/>
                      </div>
                    </Tooltip> : <Typography variant='inherit'>Applied Rules</Typography>
                  }
                </TableCell>
                {
                  isAuthenticated && <TableCell width='40vw' sx={{ border: 0 }}/>
                }
              </TableRow>
            </TableHead>
            <TableBody>
              {
                rescoring.applicable_rescorings.map((ap, idx) => <ApplicableRescoringsRow
                  key={idx}
                  applicableRescoring={ap}
                  priority={idx + 1}
                  fetchDeleteApplicableRescoring={fetchDeleteApplicableRescoring}
                  isAuthenticated={isAuthenticated}
                />)
              }
            </TableBody>
          </Table>
        </Card>
      </Collapse>
    </TableCell>
  </TableRow>
}
ApplicableRescorings.displayName = 'ApplicableRescorings'
ApplicableRescorings.propTypes = {
  rescoring: PropTypes.object.isRequired,
  setRescorings: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  isAuthenticated: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  rescoringFeature: PropTypes.object,
}


const RescoringRow = ({
  rescoring,
  setRescorings,
  selectedRescorings,
  setSelectedRescorings,
  type,
  editRescoring,
  fetchComplianceData,
  fetchComplianceSummary,
  ocmRepo,
  rescoringFeature,
}) => {
  const [expanded, setExpanded] = React.useState(false)

  const {
    finding,
    severity,
    matching_rules,
    applicable_rescorings,
    ocmNode,
    originalSeverityProposal,
    originalMatchingRules,
  } = rescoring
  const currentSeverity = rescoringProposalSeverity(rescoring)
  const currentSeverityCfg = findSeverityCfgByName({name: currentSeverity})

  const isAuthenticated = JSON.parse(localStorage.getItem(TOKEN_KEY)) !== null

  const maxVersionStrLength = 12
  const packageVersions = finding.id.package_versions.map((version) => {
    return trimLongString(version, maxVersionStrLength)
  }).join('\n')
  const versionHasOverlength = finding.id.package_versions.reduce((hasOverlength, version) => {
    return hasOverlength || version.length > maxVersionStrLength
  }, false)

  const selectRescoring = () => {
    if (selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
      setSelectedRescorings((prev) => prev.filter((r) => rescoringIdentity(r) !== rescoringIdentity(rescoring)))
      return
    }
    setSelectedRescorings((prev) => [
      ...prev,
      rescoring,
    ])
  }

  return <>
    <TableRow
      onClick={() => {
        if (applicable_rescorings.length > 0) {
          setExpanded(!expanded)
        }
      }}
      sx={applicable_rescorings.length > 0 ? { '&:hover': { cursor: 'pointer' } } : {}}
      hover
    >
      <TableCell
        onClick={(e) => {
          e.stopPropagation()
          selectRescoring()
        }}
        sx={{ '&:hover': { cursor: 'pointer' } }}>
        <Checkbox
          checked={Boolean(selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring)))}
        />
      </TableCell>
      <TableCell>
        <Stack>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant='inherit'>{finding.id.package_name}</Typography>
            <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
          </div>
          {
            versionHasOverlength ? <Tooltip
              title={<Typography
                variant='inherit'
                whiteSpace='pre-line'
              >
                {
                  finding.id.package_versions.join('\n')
                }
              </Typography>}
            >
              <Typography variant='inherit' whiteSpace='pre-line'>{packageVersions}</Typography>
            </Tooltip> : <Typography variant='inherit' whiteSpace='pre-line'>{packageVersions}</Typography>
          }
        </Stack>
      </TableCell>
      <TableCell>
        {
          type === artefactMetadataTypes.LICENSE ? <Stack spacing={0.5}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem'}}>
              <Typography
                variant='inherit'
                sx={{ fontWeight: 'bold' }}
                marginRight='0.4rem'
              >
                {
                  finding.license.name
                }
              </Typography>
              <LicenseExtraInfo filesystemPaths={finding.filesystem_paths}/>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
              <Typography variant='inherit' color={`${findSeverityCfgByName({name: finding.severity}).color}.main`}>
                {
                  finding.severity
                }
              </Typography>
            </div>
          </Stack> : <Stack spacing={0.5}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem'}}>
              <Link
                href={finding.urls[0]} // assume first always nist.gov
                target='_blank'
                rel='noopener'
                color='secondary'
                marginRight='0.4rem'
                variant='inherit'
              >
                {
                  finding.cve
                }
              </Link>
              <VulnerabilityExtraInfo vector={finding.cvss} filesystemPaths={finding.filesystem_paths}/>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
              <Typography variant='inherit' color={`${findSeverityCfgByName({name: finding.severity}).color}.main`}>
                {
                  finding.severity
                }
              </Typography>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography variant='inherit' marginRight='0.4rem'>CVSS v3:</Typography>
              <Typography variant='inherit' color={`${findSeverityCfgByName({name: finding.severity}).color}.main`}>
                {
                  finding.cvss_v3_score
                }
              </Typography>
            </div>
          </Stack>
        }
      </TableCell>
      <TableCell align='right'>
        <Typography variant='inherit' color={`${currentSeverityCfg.color}.main`}>
          {
            currentSeverity
          }
        </Typography>
      </TableCell>
      <TableCell align='center'>
        <TrendingFlatIcon/>
      </TableCell>
      <TableCell>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Select
            value={severity}
            onChange={(e) => {
              editRescoring({
                rescoring: rescoring,
                severity: e.target.value,
                matchingRules: [CUSTOM_RESCORING_RULE_NAME],
              })
              if (!selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
                selectRescoring()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            variant='standard'
            disabled={!isAuthenticated}
          >
            {
              [
                findSeverityCfgByName({name: SEVERITIES.NONE}),
                findSeverityCfgByName({name: SEVERITIES.LOW}),
                findSeverityCfgByName({name: SEVERITIES.MEDIUM}),
                findSeverityCfgByName({name: SEVERITIES.HIGH}),
                findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
                findSeverityCfgByName({name: SEVERITIES.BLOCKER}),
              ].map((cfg) => {
                return <MenuItem key={cfg.name} value={cfg.name}>
                  <Typography color={`${cfg.color}.main`} variant='body2'>
                    {
                      cfg.name
                    }
                  </Typography>
                </MenuItem>
              })
            }
          </Select>
          {
            matching_rules.includes(CUSTOM_RESCORING_RULE_NAME) && <Tooltip
              title={`Reset to ${originalSeverityProposal}`}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  editRescoring({
                    rescoring: rescoring,
                    severity: originalSeverityProposal,
                    matchingRules: originalMatchingRules,
                  })
                  if (selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
                    selectRescoring()
                  }
                }}
              >
                <UndoIcon fontSize='small'/>
              </IconButton>
            </Tooltip>
          }
        </div>
      </TableCell>
      <TableCell>
        <TextField
          defaultValue={rescoring.comment}
          onChange={(e) => {
            editRescoring({
              rescoring: rescoring,
              comment: e.target.value,
            })
          }}
          onClick={(e) => e.stopPropagation()}
          error={!rescoring.comment && rescoring.matching_rules.includes(CUSTOM_RESCORING_RULE_NAME)}
          disabled={!isAuthenticated}
          size='small'
          maxRows={4}
          InputProps={{
            sx: {
              fontSize: 'inherit',
            },
          }}
          fullWidth
          multiline
        />
      </TableCell>
      <TableCell align='right'>
        <Stack>
          {
            matching_rules.map((rule_name) => <Typography key={rule_name} variant='inherit'>
              {
                rule_name
              }
            </Typography>)
          }
        </Stack>
      </TableCell>
      <TableCell>
        {
          applicable_rescorings.length > 0 && (
            expanded ? <KeyboardArrowUpIcon fontSize='small'/> : <KeyboardArrowDownIcon fontSize='small'/>
          )
        }
      </TableCell>
    </TableRow>
    <ApplicableRescorings
      rescoring={rescoring}
      setRescorings={setRescorings}
      fetchComplianceData={fetchComplianceData}
      fetchComplianceSummary={fetchComplianceSummary}
      isAuthenticated={isAuthenticated}
      expanded={expanded}
      rescoringFeature={rescoringFeature}
    />
  </>
}
RescoringRow.displayName = 'RescoringRow'
RescoringRow.propTypes = {
  rescoring: PropTypes.object.isRequired,
  setRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  editRescoring: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  ocmRepo: PropTypes.string,
  rescoringFeature: PropTypes.object,
}


const RescoringDiff = ({
  rescorings,
  setRescorings,
  selectedRescorings,
  setSelectedRescorings,
  type,
  editRescoring,
  fetchComplianceData,
  fetchComplianceSummary,
  ocmRepo,
  rescoringFeature,
}) => {
  const theme = useTheme()
  const context = React.useContext(ConfigContext)

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(25)

  const orderDirections = {
    ASCENDING: 'asc',
    DESCENDING: 'desc',
  }
  const orderAttributes = {
    PACKAGE: 'package',
    FINDING: 'finding',
    CURRENT: 'current',
    RESCORED: 'rescored',
    RULES: 'rules',
  }

  const [order, setOrder] = React.useState(orderDirections.ASCENDING)
  const [orderBy, setOrderBy] = React.useState(orderAttributes.PACKAGE)

  const allSelected = () => {
    if (!rescorings) return false
    return rescorings.every((rescoring) => {
      return selectedRescorings.map((r) => rescoringIdentity(r)).includes(rescoringIdentity(rescoring))
    })
  }

  const handleSort = (orderBy) => {
    setOrder(order === orderDirections.ASCENDING ? orderDirections.DESCENDING : orderDirections.ASCENDING)
    setOrderBy(orderBy)
  }

  const sortData = (data, comparator) => {
    return data.sort(comparator)
  }

  const getAccessMethod = () => {
    if (orderBy === orderAttributes.PACKAGE) return (r) => r.finding.id.package_name
    if (orderBy === orderAttributes.FINDING) return (r) => {
      if (type === artefactMetadataTypes.LICENSE) {
        return r.finding.license.name
      } else if (type === artefactMetadataTypes.VULNERABILITY) {
        return parseInt(r.finding.cve.replace(/\D/g,'')) // sort numbers rather than strings
      }
    }
    if (orderBy === orderAttributes.CURRENT) return (r) => findSeverityCfgByName({name: rescoringProposalSeverity(r)}).value
    if (orderBy === orderAttributes.RESCORED) return (r) => findSeverityCfgByName({name: r.severity}).value
    if (orderBy === orderAttributes.RULES) return (r) => r.matching_rules.toString()
  }

  const descendingComparator = (l, r) => {
    if (r < l) return -1
    if (r > l) return 1
    return 0
  }

  const getComparator = () => {
    const accessOrderByProperty = getAccessMethod()
    return order === orderDirections.DESCENDING
      ? (l, r) => descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
      : (l, r) => -descendingComparator(accessOrderByProperty(l), accessOrderByProperty(r))
  }

  const loadingRowsCount = 25

  React.useEffect(() => {
    const calculateMaxPage = () => {
      if (!rescorings) return 0
      return parseInt((rescorings.length - 1) / rowsPerPage)
    }
    if (page > calculateMaxPage()) setPage(calculateMaxPage())
  }, [rescorings, page, rowsPerPage])

  const handleChangePage = (e, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const headerBackground = alpha(theme.palette.common.black, context.prefersDarkMode ? 0.3 : 0.07)

  return <Paper sx={{ background: alpha(theme.palette.common.black, context.prefersDarkMode ? 0.3 : 0.03) }}>
    <TableContainer>
      <Table sx={{ tableLayout: 'fixed' }} stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              width='50vw'
              onClick={() => {
                if (allSelected()) {
                  setSelectedRescorings((prev) => [
                    ...prev.filter((rescoring) => !rescorings.map((r) => rescoringIdentity(r)).includes(rescoringIdentity(rescoring)))
                  ])
                  return
                }
                setSelectedRescorings((prev) => [
                  ...prev,
                  ...rescorings.filter((rescoring) => !selectedRescorings.map((r) => rescoringIdentity(r)).includes(rescoringIdentity(rescoring)))
                ])
              }}
              sx={{
                '&:hover': {
                  cursor: 'pointer',
                },
                background: headerBackground,
              }}
            >
              <Checkbox checked={allSelected()}/>
            </TableCell>
            <TableCell width='100vw' sx={{ background: headerBackground }}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.PACKAGE)}
                active={orderBy === orderAttributes.PACKAGE}
                direction={order}
              >
                Package
              </TableSortLabel>
            </TableCell>
            <TableCell width='140vw' sx={{ background: headerBackground }}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.FINDING)}
                active={orderBy === orderAttributes.FINDING}
                direction={order}
              >
                {
                  type === artefactMetadataTypes.LICENSE ? <Typography variant='inherit'>
                    License
                  </Typography> : (rescoringFeature?.cve_severity_url ? <Tooltip
                    title={<Typography variant='inherit'>
                      See <Link
                        href={rescoringFeature.cve_severity_url}
                        target='_blank'
                        sx={{
                          color: 'orange'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {' docs '}
                      </Link> for more information about the calculation of the severity based on the CVSS v3 score.
                      The severity is used to determine the maximum processing times.
                    </Typography>}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant='inherit'>CVE</Typography>
                      <HelpOutlineIcon sx={{ height: '1rem' }}/>
                    </div>
                  </Tooltip> : <Typography variant='inherit'>CVE</Typography>)
                }
              </TableSortLabel>
            </TableCell>
            <TableCell width='70vw' align='right' sx={{ background: headerBackground }}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.CURRENT)}
                active={orderBy === orderAttributes.CURRENT}
                direction={order}
              >
                Current
              </TableSortLabel>
            </TableCell>
            <TableCell width='40vw' sx={{ background: headerBackground }}/>
            <TableCell width='120vw' sx={{ background: headerBackground }}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.RESCORED)}
                active={orderBy === orderAttributes.RESCORED}
                direction={order}
              >
                Rescored
              </TableSortLabel>
            </TableCell>
            <TableCell width='220vw' sx={{ background: headerBackground }}>
              Comment
            </TableCell>
            <TableCell width='150vw' align='right' sx={{ background: headerBackground }}>
              <TableSortLabel
                onClick={() => handleSort(orderAttributes.RULES)}
                active={orderBy === orderAttributes.RULES}
                direction={order}
              >
                {
                  rescoringFeature?.cve_categorisation_label_url ? <Tooltip
                    title={<Typography variant='inherit'>
                      See <Link
                        href={rescoringFeature.cve_categorisation_label_url}
                        target='_blank'
                        sx={{
                          color: 'orange'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {' docs '}
                      </Link> for more information about rescoring rules.
                    </Typography>}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant='inherit'>Applied Rules</Typography>
                      <HelpOutlineIcon sx={{ height: '1rem' }}/>
                    </div>
                  </Tooltip> : <Typography variant='inherit'>Applied Rules</Typography>
                }
              </TableSortLabel>
            </TableCell>
            <TableCell width='50vw' sx={{ background: headerBackground }}/>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            !rescorings ? [...Array(loadingRowsCount).keys()].map((e) => <RescoringRowLoading
              key={e}
            />) : sortData([...rescorings], getComparator())
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((rescoring, idx) => <RescoringRow
                key={`${rescoringIdentity(rescoring)}${idx}`}
                rescoring={rescoring}
                setRescorings={setRescorings}
                selectedRescorings={selectedRescorings}
                setSelectedRescorings={setSelectedRescorings}
                type={type}
                editRescoring={editRescoring}
                fetchComplianceData={fetchComplianceData}
                fetchComplianceSummary={fetchComplianceSummary}
                ocmRepo={ocmRepo}
                rescoringFeature={rescoringFeature}
              />)
          }
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={[10, 25, 50]}
      component='div'
      count={rescorings ? rescorings.length : 0}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
    />
  </Paper>
}
RescoringDiff.displayName = 'RescoringDiff'
RescoringDiff.propTypes = {
  rescorings: PropTypes.arrayOf(PropTypes.object),
  setRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  editRescoring: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  ocmRepo: PropTypes.string,
  rescoringFeature: PropTypes.object,
}


const RescoringDiffGroup = ({
  rescorings,
  setRescorings,
  selectedRescorings,
  setSelectedRescorings,
  type,
  editRescoring,
  fetchComplianceData,
  fetchComplianceSummary,
  ocmRepo,
  defaultExpanded,
  title,
  rescoringFeature,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  return <Accordion
    TransitionProps={{ unmountOnExit: true }}
    expanded={expanded}
    onClick={() => setExpanded(!expanded)}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
      <Typography>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails onClick={(e) => e.stopPropagation()}>
      <RescoringDiff
        rescorings={rescorings}
        setRescorings={setRescorings}
        selectedRescorings={selectedRescorings}
        setSelectedRescorings={setSelectedRescorings}
        type={type}
        editRescoring={editRescoring}
        fetchComplianceData={fetchComplianceData}
        fetchComplianceSummary={fetchComplianceSummary}
        ocmRepo={ocmRepo}
        rescoringFeature={rescoringFeature}
      />
    </AccordionDetails>
  </Accordion>
}
RescoringDiffGroup.displayName = 'RescoringDiffGroup'
RescoringDiffGroup.propTypes = {
  rescorings: PropTypes.arrayOf(PropTypes.object),
  setRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  editRescoring: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  ocmRepo: PropTypes.string,
  defaultExpanded: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  rescoringFeature: PropTypes.object,
}


const Rescoring = ({
  ocmNodes,
  ocmRepo,
  type,
  cveRescoringRuleSet,
  rescorings,
  setRescorings,
  selectedRescorings,
  setSelectedRescorings,
  editRescoring,
  setProgress,
  setShowProgress,
  fetchComplianceData,
  fetchComplianceSummary,
  rescoringFeature,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isError, setIsError] = React.useState(false)

  React.useEffect(() => {
    if (!ocmNodes || isLoading || isError || rescorings) return
    setIsLoading(true)

    const fetchRescorings = async (ocmNodes) => {
      let finishedRequestCount = 0
      const requestCount = ocmNodes.length // 1 calculate rescoring request per node
      if (requestCount > 1) {
        /**
         * only show progress bar if it is meaningful
         * if only 1 artefact will be rescored, there is only 1 rescore-calculate request
         * therefore, progress bar values will be either 0(%) or 100(%)
         *
         * additionally to progress bar, skeletons are rendered
         * therefore, there is loading feedback to user already
         */
        setShowProgress(true)
      }

      try {
        const rescoringProposals = await Promise.all(ocmNodes.map(async (ocmNode) => {
          const rescoringProposals = await patchRescoringProposals(
            rescore.get({
              componentName: ocmNode.component.name,
              componentVersion: ocmNode.component.version,
              artefactKind: ocmNode.artefactKind,
              artefactName: ocmNode.artefact.name,
              artefactVersion: ocmNode.artefact.version,
              artefactType: ocmNode.artefact.type,
              artefactExtraId: ocmNode.artefact.extraIdentity,
              cveRescoringRuleSetName: cveRescoringRuleSet?.name,
              types: [type]
            }),
            ocmNode,
          )
          finishedRequestCount++
          setProgress(finishedRequestCount / (requestCount / 100))
          return rescoringProposals
        }))
        setRescorings(rescoringProposals.reduce((prev, rescoringProposal) => [...prev, ...rescoringProposal], []))
      } catch (error) {
        enqueueSnackbar(
          'Rescoring could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchRescorings(ocmNodes),
          }
        )
        setIsError(true)
      }
      setIsLoading(false)
      setShowProgress(false)
      setProgress(0)
    }
    fetchRescorings(ocmNodes)
  }, [ocmNodes, type, rescorings, setRescorings, cveRescoringRuleSet, isLoading, setIsLoading, isError, setIsError, setProgress, setShowProgress])

  if (isError) return <Box display='flex' justifyContent='center'>
    <Typography display='flex' justifyContent='center' variant='h6'>
      {
        `Something went wrong ${String.fromCodePoint('0x1F625')}` // "sad but relieved face" symbol
      }
    </Typography>
  </Box>

  if (rescorings?.length === 0) return <Box display='flex' justifyContent='center'>
    <Typography justifyContent='center' variant='h6'>
      {
        `No open findings, good job! ${String.fromCodePoint('0x1F973')}` // "party-face" symbol
      }
    </Typography>
  </Box>

  const findingsWithoutRescoring = rescorings?.filter((rescoring) => {
    return rescoring.applicable_rescorings.length === 0 && rescoring.finding.severity !== SEVERITIES.NONE
  })
  const rescoredFindings = rescorings?.filter((rescoring) => {
    if (rescoring.applicable_rescorings.length === 0) return false
    const rescoringsOrderedBySpecificity = orderRescoringsBySpecificity(rescoring.applicable_rescorings)
    return rescoringsOrderedBySpecificity[0].data.severity !== SEVERITIES.NONE
  })
  const resolvedFindings = rescorings?.filter((rescoring) => {
    if (rescoring.applicable_rescorings.length === 0) return false
    const rescoringsOrderedBySpecificity = orderRescoringsBySpecificity(rescoring.applicable_rescorings)
    return rescoringsOrderedBySpecificity[0].data.severity === SEVERITIES.NONE
  })

  const title = findTypedefByName({name: type}).friendlyName

  return <Stack spacing={3}>
    {
      (!findingsWithoutRescoring || findingsWithoutRescoring.length > 0) && <RescoringDiffGroup
        rescorings={findingsWithoutRescoring}
        setRescorings={setRescorings}
        selectedRescorings={selectedRescorings}
        setSelectedRescorings={setSelectedRescorings}
        type={type}
        editRescoring={editRescoring}
        fetchComplianceData={fetchComplianceData}
        fetchComplianceSummary={fetchComplianceSummary}
        ocmRepo={ocmRepo}
        defaultExpanded={true}
        title={findingsWithoutRescoring
          ? `${pluralise(title, findingsWithoutRescoring.length)} (${findingsWithoutRescoring.length})`
          : pluralise(title)
        }
        rescoringFeature={rescoringFeature}
      />
    }
    {
      rescoredFindings?.length > 0 && <RescoringDiffGroup
        rescorings={rescoredFindings}
        setRescorings={setRescorings}
        selectedRescorings={selectedRescorings}
        setSelectedRescorings={setSelectedRescorings}
        type={type}
        editRescoring={editRescoring}
        fetchComplianceData={fetchComplianceData}
        fetchComplianceSummary={fetchComplianceSummary}
        ocmRepo={ocmRepo}
        defaultExpanded={false}
        title={`Rescored ${pluralise(title, rescoredFindings.length)} (${rescoredFindings.length})`}
        rescoringFeature={rescoringFeature}
      />
    }
    {
      resolvedFindings?.length > 0 && <RescoringDiffGroup
        rescorings={resolvedFindings}
        setRescorings={setRescorings}
        selectedRescorings={selectedRescorings}
        setSelectedRescorings={setSelectedRescorings}
        type={type}
        editRescoring={editRescoring}
        fetchComplianceData={fetchComplianceData}
        fetchComplianceSummary={fetchComplianceSummary}
        ocmRepo={ocmRepo}
        defaultExpanded={false}
        title={`Resolved ${pluralise(title, resolvedFindings.length)} (${resolvedFindings.length})`}
        rescoringFeature={rescoringFeature}
      />
    }
  </Stack>
}
Rescoring.displayName = 'Rescoring'
Rescoring.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  ocmRepo: PropTypes.string,
  type: PropTypes.string.isRequired,
  cveRescoringRuleSet: PropTypes.object,
  rescorings: PropTypes.array,
  setRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.array.isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  editRescoring: PropTypes.func.isRequired,
  setProgress: PropTypes.func.isRequired,
  setShowProgress: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  rescoringFeature: PropTypes.object,
}


const Rescore = ({
  rescorings,
  type,
  handleClose,
  setShowProgress,
  scope,
  fetchComplianceData,
  fetchComplianceSummary,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const title = findTypedefByName({name: type}).friendlyName

  const serialiseRescoring = React.useCallback((rescoring) => {
    const artefact = {
      component_name: [scopeOptions.COMPONENT, scopeOptions.ARTEFACT, scopeOptions.SINGLE].includes(scope) ? rescoring.ocmNode.component.name : null,
      component_version: scopeOptions.SINGLE === scope ? rescoring.ocmNode.component.version : null,
      artefact_kind: 'resource',
      artefact: {
        artefact_name: [scopeOptions.ARTEFACT, scopeOptions.SINGLE].includes(scope) ? rescoring.ocmNode.artefact.name : null,
        artefact_version: scopeOptions.SINGLE === scope ? rescoring.ocmNode.artefact.version : null,
        artefact_type: rescoring.ocmNode.artefact.type,
        artefact_extra_id: scopeOptions.SINGLE === scope ? rescoring.ocmNode.artefact.extraIdentity : {},
      },
    }

    const date = new Date().toISOString()
    const meta = {
      datasource: 'delivery-dashboard',
      type: 'rescorings',
      relation: {
        refers_to: type,
        relation_kind: 'rescore',
      },
      creation_date: date,
      last_update: date,
    }

    const data = {
      finding: {
        id: {
          package_name: rescoring.finding.id.package_name,
          source: rescoring.finding.id.source,
        },
        ...type === artefactMetadataTypes.LICENSE ? {
          license: rescoring.finding.license,
        } : {
          cve: rescoring.finding.cve,
        },
      },
      severity: rescoring.severity,
      matching_rules: rescoring.matching_rules,
      comment: rescoring.comment,
    }

    return {artefact, meta, data}
  }, [scope, type])

  const token = JSON.parse(localStorage.getItem(TOKEN_KEY))

  if (!token) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth
  >
    Log in to apply rescorings
  </Button>

  if (!rescorings?.length > 0) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth
  >
    {`Apply ${title} Rescoring`}
  </Button>

  const customRescoringsWithoutComment = rescorings.filter((rescoring) => {
    return rescoring.matching_rules.includes(CUSTOM_RESCORING_RULE_NAME) && (!rescoring.comment)
  })

  if (customRescoringsWithoutComment.length > 0) return <Tooltip
    title={
      <>
        <Typography variant='body2'>Following custom rescorings are missing a comment</Typography>
        <div style={{ padding: '0.3em' }}/>
        <Stack>
          {
            customRescoringsWithoutComment.map((r, idx) => <Typography key={idx} variant='body2'>
              {
                `${r.finding.id.package_name} - ${type === artefactMetadataTypes.LICENSE ? r.finding.license.name : r.finding.cve}`
              }
            </Typography>)
          }
        </Stack>
      </>
    }
  >
    <div style={{ width: '100%' }}> {/* disabled button requires span to be "interactive" */}
      <Button
        variant='contained'
        color='secondary'
        disabled
        fullWidth
      >
        {
          `Apply ${title} Rescoring (${rescorings.length})`
        }
      </Button>
    </div>
  </Tooltip>

  return <Button
    variant='contained'
    color='secondary'
    disabled={isLoading}
    fullWidth
    startIcon={isLoading && <CircularProgress size='1em'/>}
    onClick={() => {
      const fetchRescorings = async () => {
        setIsLoading(true)

        const serialisedRescorings = rescorings.map((rescoring) => serialiseRescoring(rescoring))
        const lenSerialisedRescorings = serialisedRescorings.length

        try {
          if (lenSerialisedRescorings > 0) {
            await rescore.create({
              rescorings: {
                entries: serialisedRescorings,
              },
            })
          }
        } catch (error) {
          enqueueSnackbar(
            `${title} rescoring could not be applied`,
            {
              ...errorSnackbarProps,
              details: error.toString(),
              onRetry: () => fetchRescorings(),
            }
          )
          setShowProgress(false)
          setIsLoading(false)
          return
        }

        enqueueSnackbar(
          lenSerialisedRescorings > 0
            ? `Successfully applied ${lenSerialisedRescorings} ${pluralise('rescoring', lenSerialisedRescorings)}`
            : 'No rescoring was applied because no severity changed',
          {
            variant: lenSerialisedRescorings > 0 ? 'success' : 'info',
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'right',
            },
            autoHideDuration: 6000,
          }
        )
        setIsLoading(false)

        if (lenSerialisedRescorings > 0) {
          fetchComplianceData()
          if (fetchComplianceSummary) {
            // function is not defined when invoked from compliance tab
            fetchComplianceSummary(false)
          }
          handleClose()
        }
      }

      if (isTokenExpired(token)) {
        enqueueSnackbar('Session expired, please login again', {
          ...copyNotificationCfg,
        })
        localStorage.removeItem(TOKEN_KEY)
        return
      }

      fetchRescorings()
    }}
  >
    {
      `Apply ${title} Rescoring (${rescorings.length})`
    }
  </Button>
}
Rescore.displayName = 'Rescore'
Rescore.propTypes = {
  rescorings: PropTypes.arrayOf(PropTypes.object),
  type: PropTypes.string.isRequired,
  handleClose: PropTypes.func.isRequired,
  setShowProgress: PropTypes.func.isRequired,
  scope: PropTypes.string.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
}


const BDBARescoringModal = ({
  ocmNodes,
  ocmRepo,
  type,
  handleClose,
  fetchComplianceData,
  fetchComplianceSummary,
}) => {
  const [openInput, setOpenInput] = React.useState(false)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [rescoringFeature, setRescoringFeature] = React.useState()
  const [cveRescoringRuleSet, setCveRescoringRuleSet] = React.useState()
  const [rescorings, setRescorings] = React.useState()
  const [selectedRescorings, setSelectedRescorings] = React.useState([])
  const [progress, setProgress] = React.useState(0)
  const [showProgress, setShowProgress] = React.useState(false)

  const [scope, setScope] = React.useState(scopeOptions.ARTEFACT)

  const editRescoring = React.useCallback(({
    rescoring,
    severity,
    matchingRules,
    comment,
  }) => {
    setRescorings((prev) => {
      // explicitly check for `undefined` as `null` is a valid value
      const newRescoreProposal = severity === rescoring.originalSeverityProposal ? {
        severity: rescoring.originalSeverityProposal,
        matching_rules: rescoring.originalMatchingRules,
        comment: comment === undefined ? rescoring.comment : comment,
      } : {
        severity: severity === undefined ? rescoring.severity : severity,
        matching_rules: matchingRules === undefined ? rescoring.matching_rules : matchingRules,
        comment: comment === undefined ? rescoring.comment : comment,
      }

      // don't mess up table sorting, therefore insert at index
      const index = prev.findIndex((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
      prev[index] = {
        ...rescoring,
        ...newRescoreProposal,
      }

      // reconstruct array to trigger state-update (thus re-render)
      return [...prev]
    })
  }, [])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.RESCORING,
      callback: ({feature}) => setRescoringFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    if (cveRescoringRuleSet || !rescoringFeature?.isAvailable) return

    // set initial value to default cve rescoring rule set
    const defaultCveRescoringruleSet = rescoringFeature.rescoring_rule_sets.find((rs) => {
      return rs.name === rescoringFeature.default_rescoring_rule_set_name
    })

    if (defaultCveRescoringruleSet) {
      setCveRescoringRuleSet(defaultCveRescoringruleSet)
      return
    }

    // if no default is configured explicitly, fallback to first
    setCveRescoringRuleSet(rescoringFeature.rescoring_rule_sets[0])
  }, [rescoringFeature, cveRescoringRuleSet])

  const closeInput = (e) => {
    if (openInput) setOpenInput(false)
    e.stopPropagation() // stop interaction with background
  }

  const filteredRescorings = rescorings?.filter((rescoring) => {
    return (
      selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
      && rescoring.severity !== rescoringProposalSeverity(rescoring)
    )
  })
  const filteredOutRescoringsLength = rescorings ? selectedRescorings.length - filteredRescorings.length : 0

  return <Dialog
    open
    onClose={handleClose}
    maxWidth={false}
    fullWidth
    PaperProps={{ sx: { width: '75%', height: '95%' } }}
    onClick={(e) => {
      handleClose()
      e.stopPropagation()
    }}
  >
    <DialogTitle
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'primary.main',
      }}
      onClick={closeInput}
    >
      <Grid container>
        {
          cveRescoringRuleSet && type === artefactMetadataTypes.VULNERABILITY ? <Grid item xs={1}>
            {
              openInput ? <VulnerabilityRescoringDrawer
                open={openInput}
                handleClose={() => setOpenInput(false)}
                cveRescoringRuleSet={cveRescoringRuleSet}
                setCveRescoringRuleSet={setCveRescoringRuleSet}
                rescoringFeature={rescoringFeature}
                ocmNodes={ocmNodes}
              /> : <Box paddingTop={1}>
                <Tooltip title='Open rescoring rules'>
                  <IconButton onClick={() => setOpenInput(true)}>
                    <ChevronRightIcon/>
                  </IconButton>
                </Tooltip>
              </Box>
            }
          </Grid> : <Grid item xs={1}/>
        }
        <Grid item xs={10}>
          <RescoringHeader
            ocmNodes={ocmNodes}
            title={`${findTypedefByName({name: type}).friendlyName} Rescoring`}
          />
        </Grid>
        <Grid item xs={1}/>
      </Grid>
    </DialogTitle>
    <DialogContent
      sx={{
        bgcolor: 'background.paper',
        // top/bottom borders via header/footer borders
        borderRight: 1,
        borderLeft: 1,
        borderRightColor: 'primary.main',
        borderLeftColor: 'primary.main',
        boxShadow: 24,
      }}
      onClick={closeInput}
    >
      <ErrorBoundary>
        <div style={{ padding: '0.5em' }}/>
        <Rescoring
          ocmNodes={ocmNodes}
          ocmRepo={ocmRepo}
          type={type}
          cveRescoringRuleSet={cveRescoringRuleSet}
          rescorings={rescorings}
          setRescorings={setRescorings}
          selectedRescorings={selectedRescorings}
          setSelectedRescorings={setSelectedRescorings}
          editRescoring={editRescoring}
          setProgress={setProgress}
          setShowProgress={setShowProgress}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
          rescoringFeature={rescoringFeature}
        />
      </ErrorBoundary>
    </DialogContent>
    <DialogActions
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'primary.main',
        padding: 2,
      }}
      onClick={closeInput}
    >
      <Grid container alignItems='center' spacing={2}>
        <Grid item xs={2}>
          {
            showProgress && <LinearProgressWithLabel value={progress}/>
          }
        </Grid>
        <Grid item xs={2}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'end' }}>
            <Tooltip
              title={<Typography
                variant='inherit'
                whiteSpace='pre-line'
              >
                {
                  scopeHelp
                }
              </Typography>}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
                <Typography variant='inherit'>Scope</Typography>
                <HelpOutlineIcon sx={{ height: '1rem' }}/>
              </div>
            </Tooltip>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              variant='standard'
              fullWidth
            >
              {
                Object.values(scopeOptions).map((scopeOption) => <MenuItem key={scopeOption} value={scopeOption}>
                  <Typography variant='inherit'>{scopeOption}</Typography>
                </MenuItem>)
              }
            </Select>
          </div>
        </Grid>
        <Grid item xs={4}>
          <Box display='flex' justifyContent='center'>
            <Rescore
              rescorings={filteredRescorings}
              type={type}
              handleClose={handleClose}
              setShowProgress={setShowProgress}
              scope={scope}
              fetchComplianceData={fetchComplianceData}
              fetchComplianceSummary={fetchComplianceSummary}
            />
          </Box>
        </Grid>
        <Grid item xs={1}>
          {
            filteredOutRescoringsLength > 0 && <Tooltip
              title={
                `${filteredOutRescoringsLength} ${pluralise('rescoring', filteredOutRescoringsLength, 'is', 'are')}
                filtered out because the severity did not change`
              }
            >
              <InfoOutlinedIcon sx={{ height: '1rem' }}/>
            </Tooltip>
          }
        </Grid>
        <Grid item xs={2}/>
        <Grid item xs={1}>
          <Box display='flex' justifyContent='right'>
            <Button
              sx={{ height: '100%', width: '100%' }}
              onClick={handleClose}
              color='secondary'
            >
              Close
            </Button>
          </Box>
        </Grid>
      </Grid>
    </DialogActions>
  </Dialog>
}
BDBARescoringModal.displayName = 'BDBARescoringModal'
BDBARescoringModal.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
  type: PropTypes.string.isRequired,
  handleClose: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
}


export { BDBARescoringModal }
