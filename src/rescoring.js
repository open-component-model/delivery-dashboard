import React from 'react'

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
  Alert,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useTheme } from '@emotion/react'
import { enqueueSnackbar } from 'notistack'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import UndoIcon from '@mui/icons-material/Undo'
import dayjs from 'dayjs'
import 'dayjs/locale/en-gb'

import PropTypes from 'prop-types'

import {
  ConfigContext,
  SearchParamContext,
} from './App'
import { rescore } from './api'
import {
  errorSnackbarProps,
  META_ALLOWED_PROCESSING_TIME,
  META_RESCORING_RULES,
  META_SPRINT_NAMES,
  RESCORING_MODES,
} from './consts'
import { OcmNode, OcmNodeDetails } from './ocm/iter'
import {
  artefactMetadataTypes,
  dataKey,
  knownLabelNames,
} from './ocm/model'
import {
  formatAndSortSprints,
  normaliseExtraIdentity,
  pluralise,
  toYamlString,
  trimLongString,
  capitalise,
} from './util'
import CopyOnClickChip from './util/copyOnClickChip'
import ErrorBoundary from './util/errorBoundary'
import ExtraWideTooltip from './util/extraWideTooltip'
import MultilineTextViewer from './util/multilineTextViewer'
import { useFetchComponentDescriptor } from './fetch'
import {
  categorisationValueToColor,
  categoriseRescoringProposal,
  findCategorisationById,
  FINDING_TYPES,
  findingCfgForType,
  findingTypeToDisplayName,
  rescorableFindingTypes,
  sprintNameForRescoring,
} from './findings'


const scopeOptions = {
  GLOBAL: 'global',
  COMPONENT: 'component',
  ARTEFACT: 'artefact',
  SINGLE: 'single',
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
      originalDueDate: rescoringProposal.due_date,
    }
  }))
}


const rescoringIdentity = (rescoring) => {
  const key = dataKey({
    type: rescoring.finding_type,
    data: rescoring.finding,
  })
  return `${rescoring.ocmNode.identity()}_${rescoring.finding_type}_${key}`
}


const rescoringNeedsComment = (rescoring) => {
  return (
    rescoring.matching_rules.includes(META_RESCORING_RULES.CUSTOM_RESCORING)
    && (
      rescoring.severity !== rescoring.originalSeverityProposal
      || rescoring.due_date !== rescoring.originalDueDate
    ) && !rescoring.comment
  )
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


const CveCategorisationLabel = ({
  ocmNode,
  ocmRepo,
}) => {
  // ocmNode may be incomplete (e.g. if based on ComplianceSummary labels are absent)
  const [componentDescriptor, state] = useFetchComponentDescriptor({
    componentName: ocmNode.component.name,
    componentVersion: ocmNode.component.version,
    ocmRepo: ocmRepo,
  })

  if (state.isLoading) return <CircularProgress/>
  if (state.error) return <Alert severity='error'>
    Unable to fetch CVE Categorisation Label
  </Alert>

  const artefact = [
    ...componentDescriptor.component.resources,
    ...componentDescriptor.component.sources,
  ].find(artefact => {
    return (
      artefact.name === ocmNode.artefact.name
      && artefact.version === ocmNode.artefact.version
      && artefact.type === ocmNode.artefact.type
      && normaliseExtraIdentity(artefact.extraIdentity) === ocmNode.normalisedExtraIdentity()
    )
  })

  // there might be no respective artefact if component-descriptor and ocm-node are not in sync yet
  if (!artefact) return <CircularProgress/>

  const cveCategorisationLabel = new OcmNode(
    [componentDescriptor.component],
    artefact,
    ocmNode.artefactKind,
  ).findLabel(knownLabelNames.cveCategorisation)

  return <MultilineTextViewer
    text={
      cveCategorisationLabel
        ? toYamlString(cveCategorisationLabel)
        : 'no label found for this artefact'}
  />
}
CveCategorisationLabel.displayName = 'CveCategorisationLabel'
CveCategorisationLabel.propTypes = {
  ocmNode: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


const VulnerabilityRescoringInputs = ({
  ocmNodes,
  ocmRepo,
}) => {
  const [selectedNode, setSelectedNode] = React.useState(ocmNodes[0])

  return <Stack spacing={2} paddingBottom='1em'>
    <Typography>CVSS Categorisation (from Component-Descriptor label)</Typography>
    <FormControl>
      <InputLabel>Artefact</InputLabel>
      <Select
        value={selectedNode.identity()}
        label='Artefact'
        onChange={(e) => setSelectedNode(ocmNodes.find(ocmNode => ocmNode.identity() === e.target.value))}
      >
        {
          ocmNodes.map((ocmNode, idx) => <MenuItem
            key={idx}
            value={ocmNode.identity()}
          >
            {
              ocmNode.name()
            }
          </MenuItem>)
        }
      </Select>
    </FormControl>
    <Box border={1} borderColor='primary.main'>
      <CveCategorisationLabel
        ocmNode={selectedNode}
        ocmRepo={ocmRepo}
      />
    </Box>
    <Divider/>
  </Stack>
}
VulnerabilityRescoringInputs.displayName = 'VulnerabilityRescoringInputs'
VulnerabilityRescoringInputs.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  ocmRepo: PropTypes.string,
}


const RescoringRulesetDrawer = ({
  open,
  handleClose,
  findingCfg,
  ocmNodes,
  ocmRepo,
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
        {
          findingCfg.type === FINDING_TYPES.VULNERABILITY && <VulnerabilityRescoringInputs
            ocmNodes={ocmNodes}
            ocmRepo={ocmRepo}
          />
        }
        <Stack spacing={2}>
          <Typography>Rescoring Ruleset</Typography>
          <Box border={1} borderColor='primary.main'>
            <MultilineTextViewer text={toYamlString(findingCfg.rescoring_ruleset)}/>
          </Box>
        </Stack>
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
RescoringRulesetDrawer.displayName = 'RescoringRulesetDrawer'
RescoringRulesetDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  findingCfg: PropTypes.object.isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  ocmRepo: PropTypes.string,
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
  defaultSelection,
  colorCallback = () => 'default',
}) => {
  const theme = useTheme()
  const [selected, setSelected] = React.useState(defaultSelection || [])

  React.useEffect(() => {
    // options not yet fetched
    if (isLoading) return

    const selectedSet = new Set(selected)
    const optionsSet = new Set(options.map(optionIdCallback))

    // nothing to do
    if (selectedSet.isSubsetOf(optionsSet)) return

    // remove selected filter if option is not available anymore (e.g. finding type has changed)
    setSelected(prev => prev.filter(s => options.some(o => optionIdCallback(o) === s)))
  }, [
    options,
    selected,
    setSelected,
  ])

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

  return <Stack direction='column' spacing={2} sx={{width: '20vw'}}>
    <Typography>
      {title}
    </Typography>
    {
      isLoading || options.length > 0 ?  <Box
        sx={{
          display: 'flex',
          justifyContent: 'left',
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
      </Box> : <Typography>No options available</Typography>
    }
  </Stack>
}
RescoringFilterOption.displayName = 'RescoringFilterOption'
RescoringFilterOption.propTypes = {
  updateFilterCallback: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  filterCallback: PropTypes.func.isRequired,
  countCallback: PropTypes.func.isRequired,
  colorCallback: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  optionIdCallback: PropTypes.func.isRequired,
  optionNameCallback: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  defaultSelection: PropTypes.array,
}


const RescoringFilter = ({
  availableSprints,
  preSelectedSprints,
  findingCfg,
  findingType,
  setFindingType,
  findingTypes,
  updateFilter,
  rescoringsLoading,
  sprintsLoading,
  toggleRescored,
  rescorings,
}) => {
  const countRescored = rescorings.filter(rescoring => rescoring.applicable_rescorings.length !== 0).length

  return <Stack direction='row' spacing={5} display='flex' alignItems='center' justifyContent='center'>
    <FormControl variant='standard' sx={{ width: '10vw'}}>
      <InputLabel>Finding Type</InputLabel>
      <Select
        value={findingType}
        label='Finding Type'
        onChange={(e) => {
          updateFilter('categorisation', () => true) // reset categorisation selection upon type change
          setFindingType(e.target.value)
        }}
      >
        {
          findingTypes.map((type) => <MenuItem key={type} value={type}>
            <Typography variant='body2'>
              {findingTypeToDisplayName(type)}
            </Typography>
          </MenuItem>)
        }
      </Select>
    </FormControl>
    <Divider
      orientation='vertical'
      flexItem
    />
    <RescoringFilterOption
      updateFilterCallback={React.useCallback((callback) => updateFilter('categorisation', callback), [updateFilter])}
      isLoading={rescoringsLoading}
      filterCallback={React.useCallback((selected, rescoring) => selected.some(s => {
        return s === categoriseRescoringProposal({rescoring, findingCfg}).id
      }), [findingCfg])}
      countCallback={(categorisation) => rescorings.filter(rescoring => {
        return categoriseRescoringProposal({rescoring, findingCfg}).id === categorisation.id
      }).length}
      colorCallback={(categorisation) => categorisationValueToColor(categorisation.value)}
      options={findingCfg.categorisations}
      optionIdCallback={(categorisation) => categorisation.id}
      optionNameCallback={(categorisation) => categorisation.display_name}
      title='Categorisation'
    />
    <Divider
      orientation='vertical'
      flexItem
    />
    <RescoringFilterOption
      updateFilterCallback={React.useCallback(callback => updateFilter('sprint', callback), [updateFilter])}
      isLoading={sprintsLoading}
      filterCallback={React.useCallback((selected, rescoring) => selected.some((sprint) => {
        return sprintNameForRescoring({rescoring, findingCfg}) === sprint
      }), [])}
      countCallback={(sprint) => sprint.count}
      options={availableSprints}
      optionIdCallback={(sprint) => sprint.name}
      optionNameCallback={(sprint) => sprint.displayName}
      title='Due Date'
      defaultSelection={preSelectedSprints}
    />
    <Divider
      orientation='vertical'
      flexItem
    />
    <FormGroup sx={{width: '15vw'}}>
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
  </Stack>
}
RescoringFilter.displayName = 'RescoringFilter'
RescoringFilter.propTypes = {
  availableSprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  preSelectedSprints: PropTypes.arrayOf(PropTypes.string),
  findingCfg: PropTypes.object.isRequired,
  findingType: PropTypes.string.isRequired,
  setFindingType: PropTypes.func.isRequired,
  findingTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  updateFilter: PropTypes.func.isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
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
    <TableCell width='6%'/>
    <TableCell width='12%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='16%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='11%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='9%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='6%' align='center'>
      <TrendingFlatIcon/>
    </TableCell>
    <TableCell width='13%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='21%'>
      <Skeleton/>
    </TableCell>
    <TableCell width='6%'/>
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
  findingCfg,
  applicableRescoring,
  discoveryDate,
  priority,
}) => {
  const componentName = applicableRescoring.artefact.component_name
  const artefactName = applicableRescoring.artefact.artefact.artefact_name
  const artefactVersion = applicableRescoring.artefact.artefact.artefact_version

  const scope = !componentName ? scopeOptions.GLOBAL
    : (!artefactName ? scopeOptions.COMPONENT
      : (!artefactVersion ? scopeOptions.ARTEFACT
        : scopeOptions.SINGLE
      )
    )

  const localeDate = new Date(applicableRescoring.meta.creation_date).toLocaleString()
  const categorisation = findCategorisationById({
    id: applicableRescoring.data.severity,
    findingCfg: findingCfg,
  })

  const dueDate = () => {
    const _dueDate = applicableRescoring.data.due_date
    const _allowedProcessingTime = applicableRescoring.data.allowed_processing_time

    if (_dueDate) return (new Date(_dueDate)).toLocaleDateString()
    if (!_allowedProcessingTime) return null

    const _discoveryDate = new Date(discoveryDate)
    // `allowed_processing_time` of a rescoring is always stored as seconds
    _discoveryDate.setSeconds(_discoveryDate.getSeconds() + _allowedProcessingTime.replace('s', ''))
    return _discoveryDate.toLocaleDateString()
  }

  return <TableRow hover>
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
        value={capitalise(scope)}
        message='Scope copied!'
        chipProps={{
          variant: 'outlined',
          title: scope,
        }}
      />
    </TableCell>
    <TableCell align='center'>
      <Typography
        variant='inherit'
        color={`${categorisationValueToColor(categorisation.value)}.main`}
      >
        {
          categorisation.display_name
        }
      </Typography>
    </TableCell>
    <TableCell align='center' sx={{ wordWrap: 'break-word' }}>{applicableRescoring.data.user.username}</TableCell>
    <TableCell>
      <Typography variant='inherit' sx={{ wordWrap: 'break-word' }}>{applicableRescoring.data.comment}</Typography>
    </TableCell>
    <TableCell>
      <Typography align='center' variant='inherit'>{dueDate()}</Typography>
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
  </TableRow>
}
ApplicableRescoringsRow.displayName = 'ApplicableRescoringsRow'
ApplicableRescoringsRow.propTypes = {
  findingCfg: PropTypes.object.isRequired,
  applicableRescoring: PropTypes.object.isRequired,
  discoveryDate: PropTypes.string.isRequired,
  priority: PropTypes.number.isRequired,
}


const ApplicableRescorings = ({
  findingCfg,
  rescoring,
  expanded,
}) => {
  if (rescoring.applicable_rescorings.length === 0) {
    // if all applicable rescorings were deleted, don't show collapse anymore
    return null
  }

  return <TableRow>
    <TableCell sx={{ padding: 0, border: 'none' }} colSpan={9}>
      <Collapse in={expanded} unmountOnExit>
        <Card sx={{ paddingY: '1rem' }}>
          <Typography sx={{ paddingLeft: '1rem' }}>Rescorings</Typography>
          <Table sx={{ tableLayout: 'fixed', overflowX: 'hidden' }}>
            <TableHead>
              <TableRow>
                <TableCell width='5%' align='center'>
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
                <TableCell width='12%' align='center'>Date</TableCell>
                <TableCell width='12%'>
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
                <TableCell width='11%' align='center'>Categorisation</TableCell>
                <TableCell width='11%' align='center'>User</TableCell>
                <TableCell width='20%'>Comment</TableCell>
                <TableCell width='10%' align='center'>New Due Date</TableCell>
                <TableCell width='19%'>Applied Rules</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                rescoring.applicable_rescorings.map((ap, idx) => <ApplicableRescoringsRow
                  key={idx}
                  findingCfg={findingCfg}
                  applicableRescoring={ap}
                  discoveryDate={rescoring.discovery_date}
                  priority={idx + 1}
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
  findingCfg: PropTypes.object.isRequired,
  rescoring: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
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


const CryptoExtraInfo = ({
  locations,
  properties,
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
          Properties
        </Typography>
        <Typography variant='inherit' whiteSpace='pre-wrap'>
          {
            JSON.stringify(properties, null, 2)
          }
        </Typography>
        <Divider/>
        <Typography
          variant='inherit'
          sx={{
            fontWeight: 'bold',
          }}
          marginBottom='0.5rem'
        >
          Locations
        </Typography>
        <Typography variant='inherit' whiteSpace='pre-wrap'>
          {
            JSON.stringify(locations, null, 2)
          }
        </Typography>
      </div>
    }
  >
    <InfoOutlinedIcon sx={{ height: '1rem' }}/>
  </ExtraWideTooltip>
}
CryptoExtraInfo.displayName = 'CryptoExtraInfo'
CryptoExtraInfo.propTypes = {
  locations: PropTypes.arrayOf(PropTypes.string).isRequired,
  properties: PropTypes.object.isRequired,
}


const Subject = ({
  rescoring,
  ocmNode,
  ocmRepo,
}) => {
  const finding = rescoring.finding

  if ([
    FINDING_TYPES.VULNERABILITY,
    FINDING_TYPES.LICENSE,
  ].includes(rescoring.finding_type)
  ) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.package_name}</Typography>
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
      <Typography variant='inherit' whiteSpace='pre-line'>{finding.package_versions.sort().join('\n')}</Typography>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.MALWARE) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.finding.filename.split('/').pop()}</Typography>
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.SAST) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.sub_type}</Typography>
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.CRYPTO) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TruncatedTextWithTooltip
          text={`${finding.asset.names.sort().join('\n')}${finding.asset.properties.version ? '\n' : ''}${finding.asset.properties.version ? finding.asset.properties.version : ''}`}
          maxLength={30}
          typographyProps={{
            variant: 'inherit',
            whiteSpace: 'pre-line',
            sx: {
              wordBreak: 'break-word',
            },
          }}
        />
        <OcmNodeDetails ocmNode={ocmNode} ocmRepo={ocmRepo} iconProps={{ sx: { height: '1rem' } }}/>
      </div>
    </Stack>
  } else if (rescoring.finding_type === FINDING_TYPES.OSID) {
    return <Stack>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant='inherit'>{finding.osid.NAME}</Typography>
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


const TruncatedTextWithTooltip = ({
  text,
  maxLength,
  typographyProps,
}) => {
  if (text.length <= maxLength) return <Typography {...typographyProps}>
    {text}
  </Typography>

  return <Tooltip
    title={<Typography {...typographyProps}>
      {text}
    </Typography>}
  >
    <Typography {...typographyProps}>
      {text.substring(0, maxLength)}...
    </Typography>
  </Tooltip>
}
TruncatedTextWithTooltip.displayName = 'TruncatedTextWithTooltip'
TruncatedTextWithTooltip.propTypes = {
  text: PropTypes.string.isRequired,
  maxLength: PropTypes.number.isRequired,
  typographyProps: PropTypes.object.isRequired,
}


const Finding = ({
  rescoring,
  findingCfg,
}) => {
  const finding = rescoring.finding
  const categorisation = findCategorisationById({
    id: finding.severity,
    findingCfg: findingCfg,
  })

  if (rescoring.finding_type === FINDING_TYPES.VULNERABILITY) {
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
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
      </div>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>CVSS v3:</Typography>
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            finding.cvss_v3_score
          }
        </Typography>
      </div>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.MALWARE) {
    return <Stack spacing={0.5}>
      <TruncatedTextWithTooltip
        text={finding.finding.malware}
        maxLength={24}
        typographyProps={{
          variant: 'inherit',
          marginRight: '0.4rem',
        }}
      />
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
        <MalwareExtraInfo
          contentDigest={finding.finding.content_digest}
          filename={finding.finding.filename}
        />
      </div>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.LICENSE) {
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
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
      </div>
      <Typography variant='inherit' marginRight='0.4rem'>{finding.malware}</Typography>
    </Stack>
  } else if (rescoring.finding_type === FINDING_TYPES.SAST) {
    return <Stack spacing={0.5}>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
      </div>
      <Typography variant='inherit' marginRight='0.4rem'>{finding.sast_status}</Typography>
    </Stack>

  } else if (rescoring.finding_type === FINDING_TYPES.CRYPTO) {
    return <Stack spacing={0.5}>
      <Tooltip
        title={<div style={{ overflowY: 'auto', maxHeight: '15rem' }}>
          <Typography variant='inherit' whiteSpace='pre-line'>
            {
              finding.summary ?? 'No summary available'
            }
          </Typography>
        </div>}
      >
        <Typography variant='inherit' marginRight='0.4rem'>
          {
            finding.asset.asset_type
          }
        </Typography>
      </Tooltip>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
        <CryptoExtraInfo
          locations={finding.asset.locations}
          properties={finding.asset.properties}
        />
      </div>
      <Typography variant='inherit'>
        {
          finding.standard
        }
      </Typography>
    </Stack>
  } else if (rescoring.finding_type === FINDING_TYPES.OSID) {
    return <Stack spacing={0.5}>
      <div style={{ display: 'flex' }}>
        <Typography variant='inherit' marginRight='0.4rem'>Original:</Typography>
        <Typography variant='inherit' color={`${categorisationValueToColor(categorisation.value)}.main`}>
          {
            categorisation.display_name
          }
        </Typography>
      </div>
      <Typography variant='inherit' marginRight='0.4rem'>{finding.osid.VERSION_ID} → {finding.greatest_version}</Typography>
    </Stack>
  }
}
Finding.displayName = 'Finding'
Finding.propTypes = {
  rescoring: PropTypes.object.isRequired,
  findingCfg: PropTypes.object.isRequired,
}


const RescoringContentTableRow = ({
  ocmRepo,
  rescoring,
  editRescoring,
  selectedRescorings,
  selectRescoring,
  sprints,
  findingCfg,
}) => {
  const {
    severity,
    matching_rules,
    applicable_rescorings,
    discovery_date,
    due_date,
    ocmNode,
    originalSeverityProposal,
    originalMatchingRules,
    originalDueDate,
  } = rescoring

  const [expanded, setExpanded] = React.useState(false)

  const matchingRules = matching_rules
  const applicableRescorings = applicable_rescorings

  const currentCategorisation = categoriseRescoringProposal({rescoring, findingCfg})
  const rescoredCategorisation = findCategorisationById({
    id: severity,
    findingCfg: findingCfg,
  })
  const originalCategorisationProposal = findCategorisationById({
    id: originalSeverityProposal,
    findingCfg: findingCfg,
  })

  const sprintInfo = sprints.find((s) => s.name === sprintNameForRescoring({rescoring, findingCfg}))

  const allowedProcessingDays = (dueDate) => {
    return Math.max(0, Math.round((new Date(dueDate) - new Date(discovery_date)) / 1000 / 60 / 60 / 24)) // ms -> days
  }

  const currentDays = allowedProcessingDays(originalDueDate)
  const rescoredDays = rescoredCategorisation.allowed_processing_time === META_ALLOWED_PROCESSING_TIME.INPUT
    ? allowedProcessingDays(due_date)
    : rescoredCategorisation.allowed_processing_time / 60 / 60 / 24 // sec -> days

  // don't show day-diff if one of both categorisations has no processing time set or there is no difference
  const diffDays = (
    currentCategorisation.allowed_processing_time !== null
    && rescoredCategorisation.allowed_processing_time !== null
    && currentDays !== rescoredDays
  ) ? `${rescoredDays - currentDays >= 0 ? '+' : ''}${rescoredDays - currentDays} day${Math.abs(rescoredDays - currentDays) === 1 ? '' : 's'}`
    : null

  const newProccesingDays = diffDays ? <Tooltip
    title={`Rescoring to "${rescoredCategorisation.display_name}" will modify the due date by ${diffDays}`}
  >
    <Typography variant='inherit'>{diffDays}</Typography>
  </Tooltip> : <Typography variant='inherit' visibility='hidden'>Dummy</Typography>

  const [updateDelayTimer, setUpdateDelayTimer] = React.useState(null)

  const delayRescoringUpdate = ({
    comment,
    due_date,
  }) => {
    if (updateDelayTimer) {
      clearTimeout(updateDelayTimer)
      setUpdateDelayTimer(null)
    }
    setUpdateDelayTimer(
      setTimeout(() => {
        editRescoring({
          rescoring,
          comment,
          due_date,
        })
        if (!selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
          selectRescoring(rescoring)
        }
      }, 300)
    )
  }

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
        <Finding rescoring={rescoring} findingCfg={findingCfg}/>
      </TableCell>
      <TableCell align='center'>
        {
          sprintInfo && <Tooltip
            title={<Typography
              variant='inherit'
              whiteSpace='pre-line'
            >
              {
                `${sprintInfo.tooltip}\nFirst discovered on ${new Date(discovery_date).toLocaleDateString()}`
              }
            </Typography>}
          >
            <Chip
              label={sprintInfo.displayName}
              variant='outlined'
              color={sprintInfo.color}
              size='small'
            />
          </Tooltip>
        }
      </TableCell>
      <TableCell align='right' sx={{ paddingX: 0 }}>
        <Typography variant='inherit' color={`${categorisationValueToColor(currentCategorisation.value)}.main`}>
          {
            currentCategorisation.display_name
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
                const id = e.target.value
                const categorisation = findCategorisationById({id, findingCfg})
                const dueDate = categorisation.allowed_processing_time === META_ALLOWED_PROCESSING_TIME.INPUT
                  ? originalDueDate
                  : new Date(discovery_date) + categorisation.allowed_processing_time * 1000 // sec -> ms

                editRescoring({
                  rescoring: rescoring,
                  severity: id,
                  matchingRules: [META_RESCORING_RULES.CUSTOM_RESCORING],
                  due_date: dueDate,
                })
                if (!selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))) {
                  selectRescoring(rescoring)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              variant='standard'
              sx={{
                marginY: '0.5rem',
                '& .MuiSelect-select': {
                  whiteSpace: 'normal',
                },
              }}
            >
              {
                findingCfg.categorisations.filter((categorisation) => {
                  return categorisation.rescoring?.includes(RESCORING_MODES.MANUAL)
                }).map((categorisation) => <MenuItem
                  key={categorisation.id}
                  value={categorisation.id}
                >
                  <Typography color={`${categorisationValueToColor(categorisation.value)}.main`} variant='body2'>
                    {
                      categorisation.display_name
                    }
                  </Typography>
                </MenuItem>)
              }
            </Select>
            {
              newProccesingDays
            }
          </div>
          {
            severity !== originalSeverityProposal && <Tooltip
              title={`Reset to ${originalCategorisationProposal.display_name}`}
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
        <Stack spacing={2}>
          <TextField
            label='Comment'
            defaultValue={rescoring.comment}
            onChange={(e) => delayRescoringUpdate({comment: e.target.value})}
            onClick={(e) => e.stopPropagation()}
            error={rescoringNeedsComment(rescoring)}
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
          {
            rescoredCategorisation.allowed_processing_time === META_ALLOWED_PROCESSING_TIME.INPUT && <Box
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale='en-gb'
              >
                <DatePicker
                  label='Due Date'
                  defaultValue={dayjs(due_date ? new Date(due_date) : new Date())}
                  onChange={(value) => delayRescoringUpdate({due_date: value.format('YYYY-MM-DD')})}
                  slotProps={{
                    textField: {
                      size: 'small',
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
          }
        </Stack>
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
      findingCfg={findingCfg}
      rescoring={rescoring}
      expanded={expanded}
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
  findingCfg: PropTypes.object.isRequired,
}


const RescoringContent = ({
  ocmRepo,
  rescorings,
  editRescoring,
  selectedRescorings,
  setSelectedRescorings,
  sprints,
  findingCfg,
  findingType,
  rescoringsLoading,
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
        if (rescoringType === FINDING_TYPES.LICENSE) {
          return rescoring.finding.license.name
        } else if (rescoringType === FINDING_TYPES.VULNERABILITY) {
          return rescoring.finding.cve
        }
      }

      return `${rescoring.finding_type}_${suffix()}`
    }

    const bdbaAccesses = {
      [orderAttributes.SUBJECT]: rescoring.finding.package_name,
      [orderAttributes.FINDING]: bdbaFinding(rescoring),
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(8640000000000000), // maximum date according to https://262.ecma-international.org/11.0/#sec-time-values-and-time-range
      [orderAttributes.CURRENT]: categoriseRescoringProposal({rescoring, findingCfg}).value,
      [orderAttributes.RESCORED]: findCategorisationById({
        id: rescoring.severity,
        findingCfg: findingCfg,
      }).value,
    }

    const malwareAccess = {
      [orderAttributes.SUBJECT]: rescoring.finding.filename,
      [orderAttributes.FINDING]: `${FINDING_TYPES.MALWARE}_${rescoring.finding.malware}`,
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(8640000000000000),
      [orderAttributes.CURRENT]: categoriseRescoringProposal({rescoring, findingCfg}).value,
      [orderAttributes.RESCORED]: findCategorisationById({
        id: rescoring.severity,
        findingCfg: findingCfg,
      }).value,
    }

    const sastAccesses = {
      [orderAttributes.SUBJECT]: rescoring.finding.sub_type,
      [orderAttributes.FINDING]: rescoring.finding.sast_status,
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(8640000000000000),
      [orderAttributes.CURRENT]: categoriseRescoringProposal({rescoring, findingCfg}).value,
      [orderAttributes.RESCORED]: findCategorisationById({
        id: rescoring.severity,
        findingCfg: findingCfg,
      }).value,
    }

    const cryptoAccess = {
      [orderAttributes.SUBJECT]: rescoring.finding.asset?.names.sort(),
      [orderAttributes.FINDING]: `${FINDING_TYPES.CRYPTO}_${rescoring.finding.standard}_${rescoring.finding.asset?.asset_type}`,
      [orderAttributes.SPRINT]: rescoring.sprint ? new Date(rescoring.sprint.end_date) : new Date(8640000000000000),
      [orderAttributes.CURRENT]: categoriseRescoringProposal({rescoring, findingCfg}).value,
      [orderAttributes.RESCORED]: findCategorisationById({
        id: rescoring.severity,
        findingCfg: findingCfg,
      }).value,
    }

    if (
      rescoringType === FINDING_TYPES.VULNERABILITY
      || rescoringType === FINDING_TYPES.LICENSE
    ) {
      return bdbaAccesses[desired]
    } else if (rescoringType === FINDING_TYPES.MALWARE) {
      return malwareAccess[desired]
    } else if (rescoringType === FINDING_TYPES.SAST) {
      return sastAccesses[desired]
    } else if (rescoringType === FINDING_TYPES.CRYPTO) {
      return cryptoAccess[desired]
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
            rescoringsLoading || rescorings.find((rescoring) => rescoring.finding_type !== findingType) ? [...Array(25).keys()].map((e) => <RescoringRowLoading
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
                findingCfg={findingCfg}
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
  editRescoring: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  findingCfg: PropTypes.object.isRequired,
  findingType: PropTypes.string.isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
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

  if (sprintsLoading) return <TableCell width='11%' align='center' sx={{ background: headerBackground }}>
    <Skeleton/>
  </TableCell>

  // rather display empty cell than re-order table if no sprints are provided
  if (
    !sprints
    || sprints.length === 0
  ) return <TableCell width='11%' align='center' sx={{ background: headerBackground }}>
    <></>
  </TableCell>

  return <TableCell width='11%' align='center' sx={{ background: headerBackground }}>
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
        width='6%'
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
      <TableCell width='12%' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.SUBJECT)}
          active={orderBy === orderAttributes.SUBJECT}
          direction={order}
        >
          Subject
        </TableSortLabel>
      </TableCell>
      <TableCell width='16%' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.FINDING)}
          active={orderBy === orderAttributes.FINDING}
          direction={order}
        >
          <Typography variant='inherit'>Finding</Typography>
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
      <TableCell width='9%' align='right' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.CURRENT)}
          active={orderBy === orderAttributes.CURRENT}
          direction={order}
        >
          Current
        </TableSortLabel>
      </TableCell>
      <TableCell width='6%' sx={{ background: headerBackground }}/>
      <TableCell width='13%' sx={{ background: headerBackground }}>
        <TableSortLabel
          onClick={() => handleSort(orderAttributes.RESCORED)}
          active={orderBy === orderAttributes.RESCORED}
          direction={order}
        >
          Rescored
        </TableSortLabel>
      </TableCell>
      <TableCell width='21%' sx={{ background: headerBackground }}>
        Comment
      </TableCell>
      <TableCell width='6%' sx={{ background: headerBackground }}/>
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
  rescorings,
  setRescorings,
  setFilteredRescorings,
  selectedRescorings,
  setSelectedRescorings,
  editRescoring,
  setProgress,
  setShowProgress,
  sprints,
  sprintsLoading,
  findingCfg,
  findingCfgs,
  findingType,
  setRescoringsLoading,
  rescoringsLoading,
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
              types: rescorableFindingTypes({findingCfgs}),
            }),
            ocmNode,
          )
          finishedRequestCount++
          setProgress(finishedRequestCount / (requestCount / 100))
          return rescoringProposals
        }))
        const updatedRescorings = rescoringProposals.reduce((prev, rescoringProposal) => [...prev, ...rescoringProposal], [])
        setRescorings(updatedRescorings)
        setFilteredRescorings(updatedRescorings.filter((rescoring) => rescoring.finding_type === findingType))
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
    findingCfgs,
    setRescorings,
    setFilteredRescorings,
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
    editRescoring={editRescoring}
    selectedRescorings={selectedRescorings}
    setSelectedRescorings={setSelectedRescorings}
    sprints={sprints}
    findingCfg={findingCfg}
    findingType={findingType}
    rescoringsLoading={rescoringsLoading}
    sprintsLoading={sprintsLoading}
  />
}
Rescoring.displayName = 'Rescoring'
Rescoring.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.instanceOf(OcmNode)).isRequired,
  rescorings: PropTypes.array,
  setRescorings: PropTypes.func.isRequired,
  setFilteredRescorings: PropTypes.func.isRequired,
  selectedRescorings: PropTypes.array.isRequired,
  setSelectedRescorings: PropTypes.func.isRequired,
  editRescoring: PropTypes.func.isRequired,
  setProgress: PropTypes.func.isRequired,
  setShowProgress: PropTypes.func.isRequired,
  sprints: PropTypes.arrayOf(PropTypes.object).isRequired,
  sprintsLoading: PropTypes.bool.isRequired,
  findingCfg: PropTypes.object.isRequired,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
  findingType: PropTypes.string.isRequired,
  setRescoringsLoading: PropTypes.func.isRequired,
  rescoringsLoading: PropTypes.bool.isRequired,
}


const Rescore = ({
  rescorings,
  handleClose,
  setShowProgress,
  scope,
  findingCfg,
  fetchComplianceSummary,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const serialiseRescoring = React.useCallback((rescoring) => {
    const component = rescoring.ocmNode.component
    const artefact = rescoring.ocmNode.artefact
    const artefactKind = rescoring.ocmNode.artefactKind

    const componentArtefactId = {
      component_name: [scopeOptions.COMPONENT, scopeOptions.ARTEFACT, scopeOptions.SINGLE].includes(scope) ? component.name : null,
      component_version: scopeOptions.SINGLE === scope ? component.version : null,
      artefact_kind: artefactKind,
      artefact: {
        artefact_name: [scopeOptions.ARTEFACT, scopeOptions.SINGLE].includes(scope) ? artefact.name : null,
        artefact_version: scopeOptions.SINGLE === scope ? artefact.version : null,
        artefact_type: artefact.type,
        artefact_extra_id: scopeOptions.SINGLE === scope ? artefact.extraIdentity : {},
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
      if (type === FINDING_TYPES.LICENSE) {
        return {
          package_name: rescoring.finding.package_name,
          license: rescoring.finding.license,
        }
      } else if (type === FINDING_TYPES.VULNERABILITY) {
        return {
          package_name: rescoring.finding.package_name,
          cve: rescoring.finding.cve,
        }
      } else if (type === FINDING_TYPES.MALWARE) {
        return {
          content_digest: rescoring.finding.finding.content_digest,
          filename: rescoring.finding.finding.filename,
          malware: rescoring.finding.finding.malware,
        }
      } else if (type === FINDING_TYPES.SAST) {
        return {
          sast_status: rescoring.finding.sast_status,
          sub_type: rescoring.finding.sub_type,
        }
      } else if (type === FINDING_TYPES.CRYPTO) {
        return {
          standard: rescoring.finding.standard,
          asset: rescoring.finding.asset,
        }
      } else if (type === FINDING_TYPES.OSID) {
        return {
          osid: rescoring.finding.osid,
        }
      }
    }

    const categorisation = findCategorisationById({
      id: rescoring.severity,
      findingCfg: findingCfg,
    })

    const _allowedProcessingTime = categorisation.allowed_processing_time
    const allowedProcessingTime = _allowedProcessingTime === null || _allowedProcessingTime === undefined || _allowedProcessingTime === META_ALLOWED_PROCESSING_TIME.INPUT
      ? _allowedProcessingTime
      : `${_allowedProcessingTime}s` // `allowed_processing_time` of a rescoring is always stored as seconds

    const data = {
      finding: findingForType(rescoring.finding_type),
      referenced_type: rescoring.finding_type,
      severity: rescoring.severity,
      matching_rules: rescoring.matching_rules,
      comment: rescoring.comment,
      allowed_processing_time: allowedProcessingTime,
      due_date: allowedProcessingTime === META_ALLOWED_PROCESSING_TIME.INPUT ? rescoring.due_date : null,
    }

    return {
      artefact: componentArtefactId,
      meta: meta,
      data: data,
    }
  }, [scope])

  if (!rescorings?.length > 0) return <Button
    variant='contained'
    color='secondary'
    disabled
    fullWidth
  >
    Apply Rescoring
  </Button>

  const customRescoringsWithoutComment = rescorings.filter(rescoringNeedsComment)

  if (customRescoringsWithoutComment.length > 0) return <Tooltip
    title={
      <>
        <Typography variant='body2'>Following custom rescorings are missing a comment</Typography>
        <div style={{ padding: '0.3em' }}/>
        <Stack>
          {
            customRescoringsWithoutComment.map((r, idx) => <Typography key={idx} variant='body2'>
              {
                dataKey({
                  type: r.finding_type,
                  data: r.finding,
                })
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
            : 'No rescoring was applied because no categorisation changed',
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
          if (fetchComplianceSummary) {
            // function is not defined when invoked for runtime artefacts
            fetchComplianceSummary(false)
          }
          handleClose()
        }
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
  findingCfg: PropTypes.object.isRequired,
  fetchComplianceSummary: PropTypes.func,
}


const RescoringModal = ({
  ocmNodes,
  ocmRepo,
  handleClose,
  fetchComplianceSummary,
  initialFindingType,
  findingCfgs,
}) => {
  const [openInput, setOpenInput] = React.useState(false)

  const [findingType, setFindingType] = React.useState(initialFindingType)
  const [findingCfg, setFindingCfg] = React.useState(findingCfgForType({findingType, findingCfgs}))
  const [rescorings, setRescorings] = React.useState([])
  const [rescoringsLoading, setRescoringsLoading] = React.useState(true)
  const [rescoringsForType, setRescoringsForType] = React.useState()
  const [filteredRescorings, setFilteredRescorings] = React.useState()
  const [selectedRescorings, setSelectedRescorings] = React.useState([])
  const [progress, setProgress] = React.useState(0)
  const [showProgress, setShowProgress] = React.useState(false)
  const [sprints, setSprints] = React.useState([])
  const [sprintsLoading, setSprintsLoading] = React.useState(true)

  const [scope, setScope] = React.useState(findingCfg.default_scope)
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
    due_date,
  }) => {
    setRescorings((prev) => {
      // don't mess up table sorting, therefore insert at index
      const index = prev.findIndex((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
      // explicitly check for `undefined` as `null` is a valid value
      prev[index] = {
        ...rescoring,
        ...severity !== undefined && {severity: severity},
        ...matchingRules !== undefined && {
          matching_rules: severity === rescoring.originalSeverityProposal ? rescoring.originalMatchingRules : matchingRules,
        },
        ...comment !== undefined && {comment: comment},
        ...due_date !== undefined && {due_date: due_date}
      }

      // reconstruct array to trigger state-update (thus re-render)
      return [...prev]
    })
  }, [])

  React.useEffect(() => {
    setSelectedRescorings([])
    const newFindingCfg = findingCfgForType({findingType, findingCfgs})
    setFindingCfg(newFindingCfg)
    setScope(newFindingCfg.default_scope)
  }, [findingType])

  React.useEffect(() => {
    if (rescoringsLoading) return

    setRescoringsForType(rescorings.filter((rescoring) => rescoring.finding_type === findingType))
  }, [rescoringsLoading, rescorings, findingType])

  React.useEffect(() => {
    if (!rescoringsForType) return

    // get unique sprints by name if any
    setSprints(formatAndSortSprints([...new Map(rescoringsForType.map((rescoring) => {
      const sprintName = sprintNameForRescoring({rescoring, findingCfg})
      return [
        sprintName,
        {
          ...(rescoring.sprint ?? {}),
          name: sprintName,
          count: rescoringsForType.filter((r) => sprintName === sprintNameForRescoring({
            rescoring: r,
            findingCfg: findingCfg,
          })).length,
        },
      ]
    })).values()]))
    setSprintsLoading(false)
  }, [setSprints, rescoringsForType])

  const allowedRescorings = filteredRescorings?.filter((rescoring) => {
    // only rescorings are allowed iff their severity has changed OR they allow a custom due date
    // input and the due date has changed
    return (
      selectedRescorings.find((r) => rescoringIdentity(r) === rescoringIdentity(rescoring))
      && (
        rescoring.severity !== categoriseRescoringProposal({rescoring, findingCfg}).id
        || rescoring.due_date !== rescoring.originalDueDate
      )
    )
  })
  const filteredOutRescoringsLength = filteredRescorings ? selectedRescorings.length - allowedRescorings.length : 0

  React.useEffect(() => {
    if (!rescoringsForType) return

    setFilteredRescorings(rescoringsForType.filter(rescoring => {
      for (const filter of Object.values(filters)) {
        // all filters must match to keep a rescoring
        if (!filter(rescoring)) return false
      }
      return true
    }))
  }, [rescoringsForType, filters])

  const closeInput = (e) => {
    if (openInput) setOpenInput(false)
    e.stopPropagation() // stop interaction with background
  }

  const toggleRescored = React.useCallback((event, toggled) => {
    updateFilter('toggleRescored', (rescoring) => {
      if (!toggled) return true
      return rescoring.applicable_rescorings.length === 0
    })
  }, [updateFilter] )

  const searchParamContext = React.useContext(SearchParamContext)
  const preSelectedSprints = searchParamContext.getAll('sprints')

  React.useEffect(() => {
    return () => {
      if (preSelectedSprints.length === 0) return
      // clear sprints from URL again
      searchParamContext.delete('sprints')
    }
  }, [])

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
              findingCfg.rescoring_ruleset && <>
                {
                  openInput ? <ErrorBoundary>
                    <RescoringRulesetDrawer
                      open={openInput}
                      handleClose={closeInput}
                      findingCfg={findingCfg}
                      ocmNodes={ocmNodes}
                      ocmRepo={ocmRepo}
                    />
                  </ErrorBoundary> : <Box paddingTop={1}>
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
            title='Rescoring'
          />
        </Grid>
        <Grid item xs={1}/>
      </Grid>
      <Grid item xs={12}>
        <div style={{ padding: '0.3em' }} />
        <RescoringFilter
          availableSprints={sprints.filter((sprint) => sprint.name !== META_SPRINT_NAMES.RESOLVED)}
          preSelectedSprints={preSelectedSprints}
          findingCfg={findingCfg}
          findingType={findingType}
          setFindingType={setFindingType}
          findingTypes={rescorableFindingTypes({findingCfgs})}
          updateFilter={updateFilter}
          rescoringsLoading={rescoringsLoading}
          sprintsLoading={sprintsLoading}
          toggleRescored={toggleRescored}
          rescorings={rescoringsForType ?? []}
        />
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
          rescorings={filteredRescorings}
          setRescorings={setRescorings}
          setFilteredRescorings={setFilteredRescorings}
          selectedRescorings={selectedRescorings}
          setSelectedRescorings={setSelectedRescorings}
          editRescoring={editRescoring}
          setProgress={setProgress}
          setShowProgress={setShowProgress}
          sprints={sprints}
          sprintsLoading={sprintsLoading}
          findingCfg={findingCfg}
          findingCfgs={findingCfgs}
          findingType={findingType}
          setRescoringsLoading={setRescoringsLoading}
          rescoringsLoading={rescoringsLoading}
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
                  <Typography variant='inherit'>{capitalise(scopeOption)}</Typography>
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
              findingCfg={findingCfg}
              fetchComplianceSummary={fetchComplianceSummary}
            />
          </Box>
        </Grid>
        <Grid item xs={1}>
          {
            filteredOutRescoringsLength > 0 && <Tooltip
              title={
                `${filteredOutRescoringsLength} ${pluralise('rescoring', filteredOutRescoringsLength, 'is', 'are')}
                filtered out or the categorisation did not change`
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
  fetchComplianceSummary: PropTypes.func,
  initialFindingType: PropTypes.string.isRequired,
  findingCfgs: PropTypes.arrayOf(PropTypes.object).isRequired,
}


export { RescoringModal }
