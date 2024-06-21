import React from 'react'
import PropTypes from 'prop-types'

import {
  Button,
  Box,
  Card,
  Checkbox,
  Chip,
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
  Switch,
  FormGroup,
  FormControlLabel,
  FormLabel,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import { enqueueSnackbar } from 'notistack'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import UndoIcon from '@mui/icons-material/Undo'

import {
  ConfigContext,
  FeatureRegistrationContext,
  SearchParamContext,
} from '../../App'
import { rescore } from '../../api'
import {
  ARTEFACT_KIND,
  copyNotificationCfg,
  errorSnackbarProps,
  features,
  META_RESCORING_RULES,
  META_SPRINT_NAMES,
  SEVERITIES,
  TOKEN_KEY,
} from '../../consts'
import { registerCallbackHandler } from '../../feature'
import { OcmNode, OcmNodeDetails } from '../../ocm/iter'
import {
  artefactMetadataTypes,
  defaultTypedefForName,
  findTypedefByName,
  knownLabelNames,
} from '../../ocm/model'
import {
  findSeverityCfgByName,
  formatAndSortSprints,
  isTokenExpired,
  normaliseObject,
  pluralise,
  rescoringProposalSeverity,
  sprintNameForRescoring,
  trimLongString,
} from '../../util'
import CopyOnClickChip from '../util/CopyOnClickChip'
import ErrorBoundary from '../util/ErrorBoundary'
import ExtraWideTooltip from '../util/ExtraWideTooltip'
import ObjectTextViewer from '../util/ObjectTextViewer'

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


const typeSpecificRescoringIdentity = (rescoring) => {
  const finding = rescoring.finding

  if (finding.cve) {
    return `${finding.package_name}_${finding.cve}`
  } else if (finding.license) {
    return `${finding.package_name}_${finding.license.name}`
  } else if (finding.malware) {
    return `${finding.malware}_${finding.content_digest}_${finding.filename}`
  }
}


const rescoringIdentity = (rescoring) => {
  return `${rescoring.ocmNode.identity()}_${rescoring.finding_type}_${typeSpecificRescoringIdentity(rescoring)}`
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
    <Typography>CVSS Categorisation (from Component-Descriptor label)</Typography>
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
    <Typography>CVSS Rescoring Rule Set</Typography>
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


const FilterCount = ({
  count,
}) => {
  const theme = useTheme()

  return <div style={{
    background: theme.bomButton.color === 'white' ? 'black' : 'white',
    marginBottom: '1rem',
    marginRight: '-0.5rem',
    borderRadius: '50%',
    width: '1.3rem',
    height: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'solid',
    borderWidth: '0.1rem',
  }}>
    <Typography variant='caption' color={theme.bomButton.color}>
      {count}
    </Typography>
  </div>
}
FilterCount.displayName = 'FilterCount'
FilterCount.propTypes = {
  count: PropTypes.number.isRequired,
}


const RescoringFilterOption = ({
  updateFilterCallback,
  isLoading,
  filterCallback,
  countCallback,
  options,
  optionIdCallback,
  optionNameCallback,
  title,
  colorCallback = () => 'default',
}) => {
  const theme = useTheme()
  const [selected, setSelected] = React.useState([])

  React.useEffect(() => {
    updateFilterCallback((rescoring) => {
      if (selected.length === 0) return true
      return filterCallback(selected, rescoring)
    })
  }, [updateFilterCallback, selected, filterCallback])

  const Loading = () => {
    return <li>
      <Box width='15vw'>
        <Skeleton/>
      </Box>
    </li>
  }

  return <Stack direction='column' spacing={2}>
    <Typography>
      {title}
    </Typography>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        listStyle: 'none',
        p: 0.5,
        m: 0,
      }}
      component='ul'
    >
      {
        isLoading ? <Loading/> : options.map((option) => {
          const count = countCallback(option)

          const select = (current, target) => {
            setSelected([...current, target])
          }

          const unselect = (current, target) => {
            setSelected(current.filter(s => s !== target))
          }

          const isSelected = (current, target) => {
            return current.includes(target)
          }

          const onToggle = (current, target) => {
            isSelected(current, target)
              ? unselect(current, target)
              : select(current, target)
          }

          return <li
            key={optionIdCallback(option)}
            style={{
              margin: theme.spacing(0.5),
            }}
          >
            {
              <Chip
                label={optionNameCallback(option)}
                variant={
                  isSelected(selected, optionIdCallback(option))
                    ? 'filled'
                    : 'outlined'
                }
                color={colorCallback(option)}
                size={'small'}
                deleteIcon={count ? <FilterCount count={count}/> : <></>}
                onClick={() => onToggle(selected, optionIdCallback(option))}
                onDelete={() => onToggle(selected, optionIdCallback(option))}
              />
            }
          </li>
        })
      }
    </Box>
  </Stack>
}
RescoringFilterOption.displayName = 'RescoringFilterOption'
RescoringFilterOption.propTypes = {
  updateFilterCallback: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  filterCallback: PropTypes.func.isRequired,
  countCallback: PropTypes.func.isRequired,
  colorCallback: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  optionIdCallback: PropTypes.func.isRequired,
  optionNameCallback: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
}


const RescoringFilter = ({
  sprints,
  findingTypes,
  updateFilter,
  rescoringsLoading,
  sprintsLoading,
  severityCfgs,
  toggleRescored,
  rescorings,
}) => {
  const countRescored = rescorings.filter(rescoring => rescoring.applicable_rescorings.length !== 0).length

  return <Stack direction='column' spacing={5}>
    <Stack direction='row' spacing={5}>
      <RescoringFilterOption
        updateFilterCallback={React.useCallback((callback) => updateFilter('severity', callback), [updateFilter])}
        isLoading={rescoringsLoading}
        filterCallback={React.useCallback((selected, rescoring) => selected.some(s => s === rescoringProposalSeverity(rescoring)), [])}
        countCallback={(severityCfg) => rescorings.filter(rescoring => rescoringProposalSeverity(rescoring) === severityCfg.name).length}
        colorCallback={(severityCfg) => severityCfg.color}
        options={severityCfgs}
        optionIdCallback={(severityCfg) => severityCfg.name}
        optionNameCallback={(severityCfg) => severityCfg.name}
        title='Severity'
      />
      <Divider
        orientation='vertical'
        flexItem
      />
      <RescoringFilterOption
        updateFilterCallback={React.useCallback((callback) => updateFilter('sprint', callback), [updateFilter])}
        isLoading={rescoringsLoading}
        filterCallback={React.useCallback((selected, rescoring) => selected.some(s => s === rescoring.finding_type), [])}
        countCallback={(metadataType) => rescorings.filter(rescoring => rescoring.finding_type === metadataType.name).length}
        options={findingTypes}
        optionIdCallback={(metadataType) => metadataType.name}
        optionNameCallback={(metadataType) => metadataType.friendlyName}
        title='Finding Type'
      />
      <Divider
        orientation='vertical'
        flexItem
      />
      <RescoringFilterOption
        updateFilterCallback={React.useCallback(callback => updateFilter('sprint', callback), [updateFilter])}
        isLoading={sprintsLoading}
        filterCallback={React.useCallback((selected, rescoring) => selected.some((sprint) => sprintNameForRescoring(rescoring) === sprint), [])}
        countCallback={(sprint) => sprint.count}
        options={sprints}
        optionIdCallback={(sprint) => sprint.name}
        optionNameCallback={(sprint) => sprint.displayName}
        title='Due Date'
      />
      <Divider
        orientation='vertical'
        flexItem
      />
      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
      >
        <FormGroup>
          <FormLabel>
            Hide findings
          </FormLabel>
          <FormControlLabel
            control={
              <Switch
                onChange={(e, s) => toggleRescored(e, s)}
                disabled={rescoringsLoading}
              />
            }
            label={`with rescorings ${rescoringsLoading ? '' : `(${countRescored})`}`}
          />
        </FormGroup>
      </Box>
    </Stack>
  </Stack>
}
RescoringFilter.displayName = 'RescoringFilter'
RescoringFilter.propTypes = {
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  findingTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
  updateFilter: PropTypes.func.isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
  severityCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  toggleRescored: PropTypes.func.isRequired,
  rescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const RescoringRowLoading = () => {
  return <TableRow
    sx={{
      '&:last-child td, &:last-child th': { border: 0 },
      height: '15vh',
    }}
  >
    <TableCell width='50vw'/>
    <TableCell width='90vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='100vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='40vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='80vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='70vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='50vw' align='center'>
      <TrendingFlatIcon/>
    </TableCell>
    <TableCell width='70vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='200vw'>
      <Skeleton/>
    </TableCell>
    <TableCell width='50vw'/>
  </TableRow>
}
RescoringRowLoading.displayName = 'RescoringRowLoading'
RescoringRowLoading.propTypes = {}


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
      filesystemPaths.map((filesystemPath, idx) => <React.Fragment key={`${filesystemPath.digest}${idx}`}>
        {
          idx !== 0 && <Divider sx={{ marginY: '0.5rem' }}/>
        }
        <Typography variant='inherit' whiteSpace='pre-wrap'>
          {
            `Digest: ${filesystemPath.digest}\nPath: ${filesystemPath.path.map((pathEntry, idx) => {
              return `\n${'   '.repeat(idx)}- ${pathEntry.path} (${pathEntry.type})`
            }).join('')}`
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
  return filesystemPaths.length > 0 && <ExtraWideTooltip
    title={
      <div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
        <FilesystemPathsInfo filesystemPaths={filesystemPaths}/>
      </div>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </ExtraWideTooltip>
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

  return <ExtraWideTooltip
    title={
      <div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
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
      </div>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </ExtraWideTooltip>
}
VulnerabilityExtraInfo.displayName = 'VulnerabilityExtraInfo'
VulnerabilityExtraInfo.propTypes = {
  vector: PropTypes.string.isRequired,
  filesystemPaths: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const AppliedRulesExtraInfo = ({
  matchingRules,
}) => {
  if (matchingRules.every((rule) => [
    META_RESCORING_RULES.ORIGINAL_SEVERITY,
    META_RESCORING_RULES.CUSTOM_RESCORING,
  ].includes(rule))) {
    return null
  }

  return <Tooltip
    title={
      <Stack onClick={(e) => e.stopPropagation()}>
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          Applied Rules
        </Typography>
        {
          matchingRules.map((rule) => <Typography key={rule} variant='inherit'>
            {
              rule
            }
          </Typography>)
        }
      </Stack>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </Tooltip>
}
AppliedRulesExtraInfo.displayName = 'AppliedRulesExtraInfo'
AppliedRulesExtraInfo.propTypes = {
  matchingRules: PropTypes.arrayOf(PropTypes.string).isRequired,
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
    <TableCell align='center' sx={{ wordWrap: 'break-word' }}>{applicableRescoring.data.user.username}</TableCell>
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
      isAuthenticated && !applicableRescoring.data.matching_rules.includes(META_RESCORING_RULES.BDBA_TRIAGE) ? <TableCell
        align='center'
        sx={{ border: 0 }}
      >
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
      </TableCell> : <TableCell sx={{ border: 0 }}/>
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
    <TableCell sx={{ padding: 0, border: 'none' }} colSpan={10}>
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
  sprintsIsAvailable: PropTypes.bool.isRequired,
}


const MalwareExtraInfo = ({
  contentDigest,
  filename,
}) => {
  return <ExtraWideTooltip
    title={
      <div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          Content Digest
        </Typography>
        <Typography variant='inherit'>
          {contentDigest}
        </Typography>
        <Divider/>
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          Layer Digest
        </Typography>
        <Divider/>
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          Filename
        </Typography>
        <Typography variant='inherit'>
          {filename}
        </Typography>
      </div>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </ExtraWideTooltip>
}
MalwareExtraInfo.displayName = 'MalwareExtraInfo'
MalwareExtraInfo.propTypes = {
  contentDigest: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
}


const Subject = ({
  rescoring,
  ocmNode,
  ocmRepo,
}) => {
  const finding = rescoring.finding

  if ([
    artefactMetadataTypes.VULNERABILITY,
    artefactMetadataTypes.LICENSE,
  ].includes(rescoring.finding_type)
  ) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.package_name}</Typography>
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
      <Typography variant='inherit' whiteSpace='pre-line'>{finding.package_versions}</Typography>
    </Stack>

  } else if (rescoring.finding_type === artefactMetadataTypes.FINDING_MALWARE) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.filename.split('/').pop()}</Typography>
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
    </Stack>
  }
}
Subject.displayName = 'Subject'
Subject.propTypes = {
  rescoring: PropTypes.object.isRequired,
  ocmNode: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


const Finding = ({
  rescoring,
  severity,
}) => {
  const finding = rescoring.finding

  if (rescoring.finding_type === artefactMetadataTypes.VULNERABILITY) {
    return <Stack spacing={0.5}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem'}}>
        <Tooltip
          title={<div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
            {
              finding.summary ?? 'No description available, please use the link instead'
            }
          </div>}
        >
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
        </Tooltip>
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

  } else if (rescoring.finding_type === artefactMetadataTypes.FINDING_MALWARE) {
    return <Stack spacing={0.5}>
      <Typography variant='inherit' marginRight='0.4rem'>{finding.malware}</Typography>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${findSeverityCfgByName({name: severity}).color}.main`}>
          {severity}
        </Typography>
        <MalwareExtraInfo
          contentDigest={finding.content_digest}
          filename={finding.filename}
        />
      </div>
    </Stack>
  } else if (rescoring.finding_type === artefactMetadataTypes.LICENSE) {
    return <Stack spacing={0.5}>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>{finding.license.name}</Typography>
        <ExtraWideTooltip
          title={
            <div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
              {
                finding.filesystem_paths.length > 0 && <>
                  <FilesystemPathsInfo filesystemPaths={finding.filesystem_paths}/>
                  <Divider sx={{ marginTop: '0.5rem', marginBottom: '1rem' }}/>
                </>
              }
            </div>
          }
        >
          <InfoOutlinedIcon sx={{ height: '1rem' }}/>
        </ExtraWideTooltip>
      </div>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${findSeverityCfgByName({name: severity}).color}.main`}>
          {severity}
        </Typography>
      </div>
      <Typography variant='inherit' marginRight='0.4rem'>{finding.malware}</Typography>
    </Stack>
  }
}
Finding.displayName = 'Finding'
Finding.propTypes = {
  rescoring: PropTypes.object.isRequired,
  severity: PropTypes.string.isRequired,
}


const RescoringContentTableRow = ({
  ocmRepo,
  rescoring,
  editRescoring,
  selectedRescorings,
  selectRescoring,
  sprints,
  scanConfig,
  setRescorings,
  fetchComplianceData,
  fetchComplianceSummary,
  rescoringFeature,
  severityCfgs,
}) => {
  const {
    severity,
    matching_rules,
    applicable_rescorings,
    ocmNode,
    originalSeverityProposal,
    originalMatchingRules,
  } = rescoring

  const [expanded, setExpanded] = React.useState(false)

  const matchingRules = matching_rules
  const applicableRescorings = applicable_rescorings

  const currentSeverity = rescoringProposalSeverity(rescoring)
  const currentSeverityCfg = findSeverityCfgByName({name: currentSeverity})

  const isAuthenticated = JSON.parse(localStorage.getItem(TOKEN_KEY)) !== null
  const sprintInfo = sprints.find((s) => s.name === sprintNameForRescoring(rescoring))

  const severityToDays = (severity, maxProcessingDays) => {
    const severityLowerCase = severity.toLowerCase()
    if (!maxProcessingDays)
      return null
    if (severityLowerCase in maxProcessingDays)
      return maxProcessingDays[severityLowerCase]
    if (severityLowerCase === SEVERITIES.CRITICAL.toLowerCase())
      return maxProcessingDays.very_high_or_greater
    return null
  }

  const maxProcessingDays = scanConfig?.config.issueReplicator?.max_processing_days
  const currentDays = severityToDays(currentSeverity, maxProcessingDays)
  const rescoredDays = severityToDays(severity, maxProcessingDays)
  const diffDays = rescoredDays !== null && currentDays !== null && currentDays !== rescoredDays
    ? `${rescoredDays - currentDays >= 0 ? '+' : ''}${rescoredDays - currentDays} days`
    : null

  const newProccesingDays = diffDays ? <Tooltip
    title={`Rescoring to ${severity} will modify the due date by ${diffDays}`}
  >
    <Typography variant='inherit'>{diffDays}</Typography>
  </Tooltip> : <Typography variant='inherit' visibility='hidden'>Dummy</Typography>

  const [commentDelayTimer, setCommentDelayTimer] = React.useState(null)

  const delayCommentUpdate = (comment) => {
    if (commentDelayTimer) {
      clearTimeout(commentDelayTimer)
      setCommentDelayTimer(null)
    }
    setCommentDelayTimer(
      setTimeout(() => {
        editRescoring({
          rescoring,
          comment,
        })
      }, 300)
    )
  }

  const typedef = findTypedefByName({name: rescoring.finding_type})
  const Icon = typedef ? typedef.Icon
    : defaultTypedefForName({name: rescoring.finding_type}).Icon


  return <>
    <TableRow
      onClick={() => {
        if (applicableRescorings.length > 0) {
          setExpanded(!expanded)
        }
      }}
      sx={{
        height: '15vh',
        ...(applicableRescorings.length > 0 ? { '&:hover': { cursor: 'pointer' }} : {})
      }}
      hover
    >
      <TableCell
        onClick={(e) => {
          e.stopPropagation()
          selectRescoring(rescoring)
        }}
        sx={{ '&:hover': { cursor: 'pointer' } }}>
        <Checkbox
          checked={Boolean(selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring)))}
        />
      </TableCell>
      <TableCell>
        <Subject
          rescoring={rescoring}
          ocmNode={ocmNode}
          ocmRepo={ocmRepo}
        />
      </TableCell>
      <TableCell>
        <Finding
          rescoring={rescoring}
          ocmNode={ocmNode}
          ocmRepo={ocmRepo}
          severity={severity}
        />
      </TableCell>
      <TableCell align='center'>
        <Tooltip title={typedef.friendlyName}>
          <Icon/>
        </Tooltip>
      </TableCell>
      <TableCell align='center'>
        {
          sprintInfo ? <Tooltip
            title={<Typography
              variant='inherit'
              whiteSpace='pre-line'
            >
              {
                `${sprintInfo.tooltip}\nFirst discovered on ${new Date(rescoring.discovery_date).toLocaleDateString()}`
              }
            </Typography>}
          >
            <Chip
              label={sprintInfo.displayName}
              variant='outlined'
              color={sprintInfo.color}
              size='small'
            />
          </Tooltip> : <></>
        }
      </TableCell>
      <TableCell align='right' sx={{ paddingX: 0 }}>
        <Typography variant='inherit' color={`${currentSeverityCfg.color}.main`}>
          {
            currentSeverity
          }
        </Typography>
      </TableCell>
      <TableCell align='center'>
        <TrendingFlatIcon/>
      </TableCell>
      <TableCell sx={{ paddingX: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Typography variant='inherit' visibility='hidden'>Dummy</Typography>
            <Select
              value={severity}
              onChange={(e) => {
                editRescoring({
                  rescoring: rescoring,
                  severity: e.target.value,
                  matchingRules: [META_RESCORING_RULES.CUSTOM_RESCORING],
                })
                if (!selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
                  selectRescoring(rescoring)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              variant='standard'
              disabled={!isAuthenticated}
              sx={{ marginY: '0.5rem' }}
            >
              {
                severityCfgs.map((cfg) => {
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
              newProccesingDays
            }
          </div>
          {
            matchingRules.includes(META_RESCORING_RULES.CUSTOM_RESCORING) && <Tooltip
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
                    selectRescoring(rescoring)
                  }
                }}
              >
                <UndoIcon fontSize='small'/>
              </IconButton>
            </Tooltip>
          }
          <AppliedRulesExtraInfo matchingRules={matchingRules}/>
        </div>
      </TableCell>
      <TableCell>
        <TextField
          defaultValue={rescoring.comment}
          onChange={(e) => delayCommentUpdate(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          error={!rescoring.comment && rescoring.matching_rules.includes(META_RESCORING_RULES.CUSTOM_RESCORING)}
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
      <TableCell align='center'>
        {
          applicableRescorings.length > 0 && <Tooltip
            title='Show Rescorings'
          >
            <span>
              {
                (
                  applicableRescorings.length > 0
                  && expanded
                )
                  ? <KeyboardArrowUpIcon fontSize='small'/>
                  : <KeyboardArrowDownIcon fontSize='small'/>
              }
            </span>
          </Tooltip>
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
RescoringContentTableRow.displayName = 'RescoringContentTableRow'
RescoringContentTableRow.propTypes = {
  ocmRepo: PropTypes.string,
  rescoring: PropTypes.object.isRequired,
  editRescoring: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectRescoring: PropTypes.func.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  scanConfig: PropTypes.object,
  setRescorings: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  rescoringFeature: PropTypes.object.isRequired,
  severityCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const RescoringContent = ({
  ocmRepo,
  rescorings,
  setRescorings,
  editRescoring,
  selectedRescorings,
  setSelectedRescorings,
  sprints,
  scanConfig,
  fetchComplianceData,
  fetchComplianceSummary,
  rescoringFeature,
  rescoringsLoading,
  severityCfgs,
  sprintsLoading,
}) => {
  const theme = useTheme()
  const context = React.useContext(ConfigContext)

  const orderDirections = React.useMemo(() => {
    return {
      ASCENDING: 'asc',
      DESCENDING: 'desc',
    }
  }, [])

  const orderAttributes = React.useMemo(() => {
    return {
      SUBJECT: 'subject',
      FINDING: 'finding',
      SPRINT: 'sprint',
      CURRENT: 'current',
      RESCORED: 'rescored',
    }
  }, [])

  const [order, setOrder] = React.useState(orderDirections.ASCENDING)
  const [orderBy, setOrderBy] = React.useState(orderAttributes.SPRINT)

  const sortData = (data, comparator) => {
    return data.sort(comparator)
  }

  const handleSort = React.useCallback((desired) => {
    setOrder(order === orderDirections.ASCENDING ? orderDirections.DESCENDING : orderDirections.ASCENDING)
    setOrderBy(desired)
  }, [order, orderDirections])

  const selectRescoring = React.useCallback((rescoring) => {
    const isSelected = () => {
      return selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
    }

    const select = () => {
      setSelectedRescorings((prev) => [
        ...prev,
        rescoring,
      ])
    }

    const unselect = () => {
      setSelectedRescorings((prev) => prev.filter((r) => rescoringIdentity(r) !== rescoringIdentity(rescoring)))
    }

    return isSelected() ? unselect() : select()
  }, [selectedRescorings, setSelectedRescorings])

  const clearSelectedRescorings = React.useCallback(() => {
    setSelectedRescorings([])
  }, [setSelectedRescorings])

  const selectAllRescorings = React.useCallback(() => {
    setSelectedRescorings(rescorings)
  }, [rescorings, setSelectedRescorings])

  const allSelected = React.useCallback(() => {
    if (!rescorings) return false
    return rescorings.every((rescoring) => {
      return selectedRescorings.map((r) => rescoringIdentity(r)).includes(rescoringIdentity(rescoring))
    })
  }, [rescorings, selectedRescorings])

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(25)

  const descendingComparator = (l, r) => {
    if (r < l) return -1
    if (r > l) return 1
    return 0
  }

  const accessMethod = (rescoring, desired) => {
    const rescoringType = rescoring.finding_type

    const bdbaFinding = (rescoring) => {
      const suffix = () => {
        if (rescoringType === artefactMetadataTypes.LICENSE) {
          return rescoring.finding.license.name
        } else if (rescoringType === artefactMetadataTypes.VULNERABILITY) {
          return rescoring.finding.cve
        }
      }

      return `${rescoring.finding_type}_${suffix()}`
    }

    const bdbaAccesses = {
      [orderAttributes.SUBJECT]: rescoring.finding.package_name,
      [orderAttributes.FINDING]: bdbaFinding(rescoring),
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(-1),
      [orderAttributes.CURRENT]: findSeverityCfgByName({name: rescoringProposalSeverity(rescoring)}).value,
      [orderAttributes.RESCORED]: findSeverityCfgByName({name: rescoring.severity}).value,
      [orderAttributes.TYPE]: rescoring.finding_type,
    }

    const malwareAccess = {
      [orderAttributes.SUBJECT]: rescoring.finding.filename,
      [orderAttributes.FINDING]: `${artefactMetadataTypes.FINDING_MALWARE}_${rescoring.finding.malware}`,
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(-1),
      [orderAttributes.CURRENT]: findSeverityCfgByName({name: rescoringProposalSeverity(rescoring)}).value,
      [orderAttributes.RESCORED]: findSeverityCfgByName({name: rescoring.severity}).value,
      [orderAttributes.TYPE]: rescoring.finding_type,
    }

    if (
      rescoringType === artefactMetadataTypes.VULNERABILITY
      || rescoringType === artefactMetadataTypes.LICENSE
    ) {
      return bdbaAccesses[desired]
    } else if (rescoringType === artefactMetadataTypes.FINDING_MALWARE) {
      return malwareAccess[desired]
    }

  }

  const getComparator = (desired) => {
    return order === orderDirections.DESCENDING
      ? (l, r) => descendingComparator(accessMethod(l, desired), accessMethod(r, desired))
      : (l, r) => -descendingComparator(accessMethod(l, desired), accessMethod(r, desired))
  }

  const handleChangePage = (e, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  return <Paper sx={{ background: alpha(theme.palette.common.black, context.prefersDarkMode ? 0.3 : 0.03) }}>
    <TableContainer>
      <Table sx={{ tableLayout: 'fixed' }} stickyHeader>
        <RescoringContentTableHeader
          handleSort={handleSort}
          order={order}
          orderAttributes={orderAttributes}
          orderBy={orderBy}
          allSelected={allSelected}
          selectAllRescorings={selectAllRescorings}
          clearSelectedRescorings={clearSelectedRescorings}
          sprints={sprints}
          rescoringsLoading={rescoringsLoading}
          sprintsLoading={sprintsLoading}
        />
        <TableBody>
          {
            rescoringsLoading ? [...Array(25).keys()].map((e) => <RescoringRowLoading
              key={e}
            />) : sortData([...rescorings], getComparator(orderBy))
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((rescoring) => <RescoringContentTableRow
                key={rescoringIdentity(rescoring)}
                ocmRepo={ocmRepo}
                rescoring={rescoring}
                editRescoring={editRescoring}
                selectedRescorings={selectedRescorings}
                selectRescoring={selectRescoring}
                sprints={sprints}
                scanConfig={scanConfig}
                setRescorings={setRescorings}
                fetchComplianceData={fetchComplianceData}
                fetchComplianceSummary={fetchComplianceSummary}
                rescoringFeature={rescoringFeature}
                severityCfgs={severityCfgs}
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
RescoringContent.displayName = 'RescoringContent'
RescoringContent.propTypes = {
  ocmRepo: PropTypes.string,
  rescorings: PropTypes.arrayOf(PropTypes.object),
  setRescorings: PropTypes.func.isRequired,
  editRescoring: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  scanConfig: PropTypes.object,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func.isRequired,
  rescoringFeature: PropTypes.object,
  rescoringsLoading: PropTypes.bool.isRequired,
  severityCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
}


const SprintHeader = ({
  sprintsLoading,
  sprints,
  headerBackground,
  onSort,
  active,
  direction,
}) => {

  if (sprintsLoading) return <TableCell width='80vw' align='center' sx={{ background: headerBackground }}>
    <Skeleton/>
  </TableCell>

  // rather display empty cell than re-order table if no sprints are provided
  if (
    !sprints
    || sprints.length === 0
  ) return <TableCell width='80vw' align='center' sx={{ background: headerBackground }}>
    <></>
  </TableCell>

  return <TableCell width='80vw' align='center' sx={{ background: headerBackground }}>
    <TableSortLabel
      onClick={onSort}
      active={active}
      direction={direction}
    >
      Due Date
    </TableSortLabel>
  </TableCell>
}
SprintHeader.displayName = 'SprintHeader'
SprintHeader.propTypes = {
  sprintsLoading: PropTypes.bool.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  headerBackground: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
  active: PropTypes.bool.isRequired,
  direction: PropTypes.string.isRequired,
}


const RescoringContentTableHeader = ({
  handleSort,
  order,
  orderAttributes,
  orderBy,
  allSelected,
  clearSelectedRescorings,
  selectAllRescorings,
  sprints,
  rescoringsLoading,
  sprintsLoading,
}) => {
  const theme = useTheme()
  const context = React.useContext(ConfigContext)
  const headerBackground = alpha(theme.palette.common.black, context.prefersDarkMode ? 0.3 : 0.07)

  return <TableHead>
    <TableRow>
      <TableCell
        width='50vw'
        onClick={() => {
          if (allSelected()) {
            clearSelectedRescorings()
            return
          }
          selectAllRescorings()
        }}
        sx={{
          '&:hover': {
            cursor: 'pointer',
          },
          background: headerBackground,
        }}
      >
        <Checkbox checked={allSelected() && !rescoringsLoading}/>
      </TableCell>
      <TableCell width='90vw' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.SUBJECT)}
          active={orderBy === orderAttributes.SUBJECT}
          direction={order}
        >
          Subject
        </TableSortLabel>
      </TableCell>
      <TableCell width='100vw' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.FINDING)}
          active={orderBy === orderAttributes.FINDING}
          direction={order}
        >
          <Typography variant='inherit'>Finding</Typography>
        </TableSortLabel>
      </TableCell>
      <TableCell width='40vw' sx={{ background: headerBackground }} align='center'>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.TYPE)}
          active={orderBy === orderAttributes.TYPE}
          direction={order}
        >
          <Typography variant='inherit'>Type</Typography>
        </TableSortLabel>
      </TableCell>
      <SprintHeader
        sprints={sprints}
        sprintsLoading={sprintsLoading}
        headerBackground={headerBackground}
        onSort={() => handleSort(orderAttributes.SPRINT)}
        active={orderBy === orderAttributes.SPRINT}
        direction={order}
      />
      <TableCell width='70vw' align='right' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.CURRENT)}
          active={orderBy === orderAttributes.CURRENT}
          direction={order}
        >
          Current
        </TableSortLabel>
      </TableCell>
      <TableCell width='50vw' sx={{ background: headerBackground }}/>
      <TableCell width='70vw' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.RESCORED)}
          active={orderBy === orderAttributes.RESCORED}
          direction={order}
        >
          Rescored
        </TableSortLabel>
      </TableCell>
      <TableCell width='200vw' sx={{ background: headerBackground }}>
        Comment
      </TableCell>
      <TableCell width='50vw' sx={{ background: headerBackground }}/>
    </TableRow>
  </TableHead>
}
RescoringContentTableHeader.displayName = 'RescoringContentTableHeader'
RescoringContentTableHeader.propTypes = {
  handleSort: PropTypes.func.isRequired,
  order: PropTypes.string.isRequired,
  orderAttributes: PropTypes.object.isRequired,
  orderBy: PropTypes.string,
  allSelected: PropTypes.func.isRequired,
  clearSelectedRescorings: PropTypes.func.isRequired,
  selectAllRescorings: PropTypes.func.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
}


const Rescoring = ({
  ocmNodes,
  cveRescoringRuleSet,
  rescorings,
  setRescorings,
  setFilteredRescorings,
  selectedRescorings,
  setSelectedRescorings,
  editRescoring,
  setProgress,
  setShowProgress,
  fetchComplianceData,
  fetchComplianceSummary,
  rescoringFeature,
  sprints,
  scanConfig,
  setRescoringsLoading,
  rescoringsLoading,
  severityCfgs,
  sprintsLoading,
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
              types: [
                artefactMetadataTypes.VULNERABILITY,
                artefactMetadataTypes.LICENSE,
                artefactMetadataTypes.FINDING_MALWARE,
              ]
            }),
            ocmNode,
          )
          finishedRequestCount++
          setProgress(finishedRequestCount / (requestCount / 100))
          return rescoringProposals
        }))
        const updatedRescorings = rescoringProposals.reduce((prev, rescoringProposal) => [...prev, ...rescoringProposal], [])
        setRescorings(updatedRescorings)
        setFilteredRescorings(updatedRescorings)
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
      setRescoringsLoading(false)
      setIsLoading(false)
      setShowProgress(false)
      setProgress(0)
    }
    fetchRescorings(ocmNodes)
  }, [
    ocmNodes,
    rescorings,
    setRescorings,
    setFilteredRescorings,
    cveRescoringRuleSet,
    isLoading,
    setIsLoading,
    isError,
    setIsError,
    setProgress,
    setShowProgress,
    setRescoringsLoading,
  ])

  if (isError) return <Box display='flex' justifyContent='center'>
    <Typography display='flex' justifyContent='center' variant='h6'>
      {
        `Something went wrong ${String.fromCodePoint('0x1F625')}` // "sad but relieved face" symbol
      }
    </Typography>
  </Box>

  if (
    rescorings?.length === 0
    && !rescoringsLoading
  ) return <Box display='flex' justifyContent='center'>
    <Box
      display='flex'
      flexDirection='column'
      alignItems='center'
      alignContent='center'
    >
      <Typography display='flex' justifyContent='center' variant='h6'>
        No rescorings match your selection
      </Typography>
    </Box>
  </Box>

  return <RescoringContent
    rescorings={rescorings}
    setRescorings={setRescorings}
    editRescoring={editRescoring}
    selectedRescorings={selectedRescorings}
    setSelectedRescorings={setSelectedRescorings}
    sprints={sprints}
    scanConfig={scanConfig}
    fetchComplianceData={fetchComplianceData}
    fetchComplianceSummary={fetchComplianceSummary}
    rescoringFeature={rescoringFeature}
    rescoringsLoading={rescoringsLoading}
    severityCfgs={severityCfgs}
    sprintsLoading={sprintsLoading}
  />
}
Rescoring.displayName = 'Rescoring'
Rescoring.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  cveRescoringRuleSet: PropTypes.object,
  rescorings: PropTypes.array,
  setRescorings: PropTypes.func.isRequired,
  setFilteredRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.array.isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  editRescoring: PropTypes.func.isRequired,
  setProgress: PropTypes.func.isRequired,
  setShowProgress: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  rescoringFeature: PropTypes.object,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  scanConfig: PropTypes.object,
  setRescoringsLoading: PropTypes.func.isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
  severityCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
}


const Rescore = ({
  rescorings,
  handleClose,
  setShowProgress,
  scope,
  fetchComplianceData,
  fetchComplianceSummary,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const serialiseRescoring = React.useCallback((rescoring) => {
    const artefact = {
      component_name: [scopeOptions.COMPONENT, scopeOptions.ARTEFACT, scopeOptions.SINGLE].includes(scope) ? rescoring.ocmNode.component.name : null,
      component_version: scopeOptions.SINGLE === scope ? rescoring.ocmNode.component.version : null,
      artefact_kind: ARTEFACT_KIND.RESOURCE,
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
      type: artefactMetadataTypes.RESCORINGS,
      creation_date: date,
      last_update: date,
    }

    const findingForType = (type) => {
      if (type === artefactMetadataTypes.LICENSE) {
        return {
          package_name: rescoring.finding.package_name,
          license: rescoring.finding.license,
        }
      } else if (type === artefactMetadataTypes.VULNERABILITY) {
        return {
          package_name: rescoring.finding.package_name,
          cve: rescoring.finding.cve,
        }
      } else if (type === artefactMetadataTypes.FINDING_MALWARE) {
        return {
          content_digest: rescoring.finding.content_digest,
          filename: rescoring.finding.filename,
          malware: rescoring.finding.malware,
        }
      }
    }

    const data = {
      finding: findingForType(rescoring.finding_type),
      referenced_type: rescoring.finding_type,
      severity: rescoring.severity,
      matching_rules: rescoring.matching_rules,
      comment: rescoring.comment,
    }

    return {artefact, meta, data}
  }, [scope])

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
    Apply Rescoring
  </Button>

  const customRescoringsWithoutComment = rescorings.filter((rescoring) => {
    return rescoring.matching_rules.includes(META_RESCORING_RULES.CUSTOM_RESCORING) && (!rescoring.comment)
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
                typeSpecificRescoringIdentity(r)
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
          `Apply Rescoring (${rescorings.length})`
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
            'rescoring could not be applied',
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
      `Apply Rescoring (${rescorings.length})`
    }
  </Button>
}
Rescore.displayName = 'Rescore'
Rescore.propTypes = {
  rescorings: PropTypes.arrayOf(PropTypes.object),
  handleClose: PropTypes.func.isRequired,
  setShowProgress: PropTypes.func.isRequired,
  scope: PropTypes.string.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
}


const RescoringModal = ({
  ocmNodes,
  ocmRepo,
  handleClose,
  fetchComplianceData,
  fetchComplianceSummary,
  scanConfig,
}) => {
  const [openInput, setOpenInput] = React.useState(false)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const searchParamContext = React.useContext(SearchParamContext)
  const [rescoringFeature, setRescoringFeature] = React.useState()
  const [cveRescoringRuleSet, setCveRescoringRuleSet] = React.useState()
  const [rescorings, setRescorings] = React.useState([])
  const [rescoringsLoading, setRescoringsLoading] = React.useState(true)
  const [filteredRescorings, setFilteredRescorings] = React.useState()
  const [selectedRescorings, setSelectedRescorings] = React.useState([])
  const [progress, setProgress] = React.useState(0)
  const [showProgress, setShowProgress] = React.useState(false)
  const [sprints, setSprints] = React.useState([])
  const [sprintsLoading, setSprintsLoading] = React.useState(true)
  const [selectedSprints, setSelectedSprints] = React.useState(searchParamContext.getAll('sprints').map((sprint) => {
    // since url parameters are interpreted as string, parse it to null again
    if (sprint === 'null') return null
    return sprint
  }) ?? [])

  const [scope, setScope] = React.useState(scopeOptions.ARTEFACT)
  const [filters, setFilters] = React.useState({})
  /**
   * a filter is a key:value pair whereas key MUST be a unique str identity and value a callback.
   * the callback must accept a rescoring as single parameter and return true if the rescoring is not
   * filtered out.
   *
   * the filter MUST also consider its base case where no selection is made and MUST return true
   * in this case.
   */

  const updateFilter = React.useCallback((id, filter) => {
    setFilters(prev => {
      return {
        ...prev,
        [id]: filter
      }
    })
  }, [])

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

    // set initial value to default cvss rescoring rule set
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

  React.useEffect(() => {
    if (rescoringsLoading) return

    if (!rescorings.some((rescoring) => rescoring.sprint)) {
      setSprints([])
      setSprintsLoading(false)
      return
    }

    // get unique sprints by name if any
    setSprints(formatAndSortSprints(rescorings ? [...new Map(rescorings.map((rescoring) => {
      const sprintName = sprintNameForRescoring(rescoring)
      return [
        sprintName,
        {
          ...(rescoring.sprint ?? {}),
          name: sprintName,
          count: rescorings.filter((r) => sprintName === sprintNameForRescoring(r)).length,
        },
      ]
    })).values()]: []))
    setSprintsLoading(false)
  }, [rescorings, setSprints, rescoringsLoading])

  const allowedRescorings = filteredRescorings?.filter((rescoring) => {
    return (
      selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
      && rescoring.severity !== rescoringProposalSeverity(rescoring)
    )
  })
  const filteredOutRescoringsLength = filteredRescorings ? selectedRescorings.length - allowedRescorings.length : 0

  React.useEffect(() => {
    setFilteredRescorings(rescorings.filter(rescoring => {
      for (const filter of Object.values(filters)) {
        // all filters must match to keep a rescoring
        if (!filter(rescoring)) return false
      }
      return true
    }))
  }, [filters, rescorings])

  const closeInput = (e) => {
    if (openInput) setOpenInput(false)
    e.stopPropagation() // stop interaction with background
  }

  // if there are any sprints selected which don't have any
  // associated findings, remove them from the selection
  if (selectedSprints.some((sprint) => !sprints.find((s) => sprint === s.name))) {
    const updatedSprintSelection = selectedSprints.filter((sprint) => sprints.find((s) => sprint === s.name))
    setSelectedSprints(updatedSprintSelection)
    searchParamContext.update({'sprints': updatedSprintSelection})
  }

  const uniqueTypedefs = (rescorings) => {
    if (rescorings.length === 0) return []

    const typeDefs = new Map()

    rescorings.map((rescoring) => {
      const typedef = findTypedefByName({name: rescoring.finding_type}) || defaultTypedefForName({name: rescoring.finding_type})
      typeDefs.set(typedef.name, typedef)
    })

    return [...typeDefs.values()]
  }

  const severityCfgs = React.useCallback(() => [
    findSeverityCfgByName({name: SEVERITIES.NONE}),
    findSeverityCfgByName({name: SEVERITIES.LOW}),
    findSeverityCfgByName({name: SEVERITIES.MEDIUM}),
    findSeverityCfgByName({name: SEVERITIES.HIGH}),
    findSeverityCfgByName({name: SEVERITIES.CRITICAL}),
    findSeverityCfgByName({name: SEVERITIES.BLOCKER}),
  ], [])

  const toggleRescored = React.useCallback((event, toggled) => {
    updateFilter('toggleRescored', (rescoring) => {
      if (!toggled) return true
      return rescoring.applicable_rescorings.length === 0
    })
  }, [updateFilter] )

  return <Dialog
    open
    onClose={handleClose}
    maxWidth={false}
    fullWidth
    PaperProps={{ sx: { width: '85%', height: '95%' } }}
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
          <Grid item xs={1}>
            {
              cveRescoringRuleSet && <>
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
              </>
            }
          </Grid>
        }
        <Grid item xs={10}>
          <RescoringHeader
            ocmNodes={ocmNodes}
            title={'Rescoring'}
          />
        </Grid>
        <Grid item xs={1}/>
      </Grid>
      <Grid item xs={12}>
        <div style={{ padding: '0.3em' }} />
        <Box
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <RescoringFilter
            sprints={sprints.filter((sprint) => sprint.name !== META_SPRINT_NAMES.RESOLVED)}
            findingTypes={uniqueTypedefs(rescorings)}
            updateFilter={updateFilter}
            rescoringsLoading={rescoringsLoading}
            sprintsLoading={sprintsLoading}
            severityCfgs={severityCfgs().filter(severityCfg => {
              // only show relevant severities
              return rescorings.some(r => rescoringProposalSeverity(r) === severityCfg.name)
            })}
            toggleRescored={toggleRescored}
            rescorings={rescorings}
          />
        </Box>
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
          cveRescoringRuleSet={cveRescoringRuleSet}
          rescorings={filteredRescorings}
          setRescorings={setRescorings}
          setFilteredRescorings={setFilteredRescorings}
          selectedRescorings={selectedRescorings}
          setSelectedRescorings={setSelectedRescorings}
          editRescoring={editRescoring}
          setProgress={setProgress}
          setShowProgress={setShowProgress}
          fetchComplianceData={fetchComplianceData}
          fetchComplianceSummary={fetchComplianceSummary}
          rescoringFeature={rescoringFeature}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          scanConfig={scanConfig}
          setRescoringsLoading={setRescoringsLoading}
          rescoringsLoading={rescoringsLoading}
          severityCfgs={severityCfgs()}
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
        <Grid item xs={1}>
          <Box
            display='flex'
            justifyContent='left'
          >
            {
              rescoringsLoading ? <Box width='100vw'>
                <Skeleton/>
              </Box> : <Typography
                variant='body1'
                color='secondary'
              >
                {`${filteredRescorings?.length}/${rescorings.length}`}
              </Typography>
            }
          </Box>
        </Grid>
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
              rescorings={allowedRescorings}
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
                filtered out or the severity did not change`
              }
            >
              <InfoOutlinedIcon sx={{ height: '1rem' }}/>
            </Tooltip>
          }
        </Grid>
        <Grid item xs={1}/>
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
RescoringModal.displayName = 'RescoringModal'
RescoringModal.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
  handleClose: PropTypes.func.isRequired,
  fetchComplianceData: PropTypes.func.isRequired,
  fetchComplianceSummary: PropTypes.func,
  scanConfig: PropTypes.object,
}


export { RescoringModal }
