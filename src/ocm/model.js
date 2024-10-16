import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'

import { SEVERITIES } from '../consts'
import {
  artefactMetadataSeverityComparator,
  artefactMetadatumSeverity,
  findSeverityCfgByName,
  mixupFindingsWithRescorings,
  severityComparator,
  toYamlString,
  trimLongString,
} from '../util'
import {
  artefactMetadataFilter,
  generateArtefactID,
  artefactMetadataSeverityFilter,
  artefactMetadataTypeFilter,
} from '../cnudie'
import MultilineTextViewer from '../components/util/MultilineTextViewer'
import { useFetchComponentDescriptor, useFetchQueryMetadata } from '../api/useFetch'
import CopyOnClickChip from '../components/util/CopyOnClickChip'
import PestControlIcon from '@mui/icons-material/PestControl'
import CoronavirusIcon from '@mui/icons-material/Coronavirus'
import ArticleIcon from '@mui/icons-material/Article'


const knownLabelNames = {
  cveCategorisation: 'gardener.cloud/cve-categorisation',
  responsible: 'cloud.gardener.cnudie/responsibles',
  mainSource: 'cloud.gardener/cicd/source',
}
Object.freeze(knownLabelNames)


const artefactMetadataTypes = {
  ARTEFACT_SCAN_INFO: 'meta/artefact_scan_info',
  STRUCTURE_INFO: 'structure_info',
  LICENSE: 'finding/license',
  VULNERABILITY: 'finding/vulnerability',
  FINDING_MALWARE: 'finding/malware',
  MALWARE: 'malware',
  OS_IDS: 'os_ids',
  CODECHECKS_AGGREGATED: 'codechecks/aggregated',
  RESCORINGS: 'rescorings',
}
Object.freeze(artefactMetadataTypes)


const datasources = {
  BDBA: 'bdba',
  CLAMAV: 'clamav',
  CC_UTILS: 'cc-utils',
}
Object.freeze(datasources)


/**
 * Icon representing severity, defaults to UNKNOWN
 * @param {String} severity   Severity
 * @param {Number} threshold  Return null if severity < threshold
 */
const SeverityIndicator = ({ severity, threshold = null }) => {
  if (!severity) return null

  let color = findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).color

  if (threshold && !(severity.value >= threshold)) {
    return null
  }

  if (severity.color) color = severity.color

  return <Chip
    variant={'outlined'}
    label={severity.name}
    color={color}
  />
}
SeverityIndicator.displayName = 'SeverityIndicator'
SeverityIndicator.propTypes = {
  severity: PropTypes.object.isRequired,
  threshold: PropTypes.number,
}


const findTypedefByName = ({
  name,
  typedefs = knownMetadataTypes,
}) => {
  return typedefs.find(typdef => typdef.name === name)
}


const defaultTypedefForName = ({
  name,
}) => {
  return {
    name: name,
    friendlyName: name,
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon,
  }
}


const MetadataViewer = ({
  type,
  data,
  severity,
  timestamp,
  ArtefactMetadataViewer,
}) => {
  const typedef = findTypedefByName({name: type})
  const displayName = typedef ? typedef.friendlyName : defaultTypedefForName({name: type}).friendlyName

  return <Accordion
    TransitionProps={{ unmountOnExit: true }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
    >
      <Grid container alignItems='center'>
        <Grid item xs={3}>
          <Typography>
            {
              type === artefactMetadataTypes.VULNERABILITY ?
                `${displayName} ${data.cve}` :
                (
                  type === artefactMetadataTypes.LICENSE ?
                    `${displayName} ${data.license.name}` :
                    (
                      type === artefactMetadataTypes.STRUCTURE_INFO ?
                        `Package ${data.package_name} ${data.package_version}` :
                        displayName
                    )
                )
            }
          </Typography>
        </Grid>
        <Grid item xs={2}/>
        <Grid item xs={3}>
          <SeverityIndicator
            severity={severity}
            threshold={findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).value}
          />
        </Grid>
        <Grid item xs={1}/>
        <Grid item xs={2}>
          <Chip
            variant='outlined'
            label={new Date(timestamp).toLocaleString()}
          />
        </Grid>
        <Grid item xs={1}/>
      </Grid>
    </AccordionSummary>
    <AccordionDetails>
      <ArtefactMetadataViewer
        text={toYamlString(data)}
      />
    </AccordionDetails>
  </Accordion>
}
MetadataViewer.displayName = 'MetadataViewer'
MetadataViewer.propTypes = {
  type: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  severity: PropTypes.object,
  timestamp: PropTypes.string,
  ArtefactMetadataViewer: PropTypes.func.isRequired,
}


const severityConfigs = [
  {
    name: SEVERITIES.UNKNOWN,
    value: 0,
    color: 'default',
    Indicator: HelpOutlineOutlinedIcon,
  },
  {
    name: SEVERITIES.CLEAN,
    value: 1,
    color: 'levelInfo',
    Indicator: CheckCircleOutlineOutlinedIcon,
  },
  {
    name: SEVERITIES.LOW,
    value: 2,
    color: 'info',
    Indicator: ReportProblemOutlinedIcon,
  },
  {
    name: SEVERITIES.MEDIUM,
    value: 4,
    color: 'warning',
    Indicator: ReportProblemOutlinedIcon,
  },
  {
    name: SEVERITIES.HIGH,
    value: 8,
    color: 'high',
    Indicator: ReportProblemOutlinedIcon,
  },
  {
    name: SEVERITIES.CRITICAL,
    value: 16,
    color: 'critical',
    Indicator: ReportProblemOutlinedIcon,
  },
  {
    name: SEVERITIES.BLOCKER,
    value: 32,
    color: 'blocker',
    Indicator: ReportProblemIcon,
  },
]


const knownMetadataTypes = [
  {
    name: 'structure_info',
    friendlyName: 'Structure Info',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon
  },
  {
    name: 'finding/license',
    friendlyName: 'License',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon
  },
  {
    name: 'malware',
    friendlyName: 'Malware',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon
  },
  {
    name: 'os_ids',
    friendlyName: 'OS Information',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon
  },
  {
    name: 'finding/vulnerability',
    friendlyName: 'Vulnerability',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: PestControlIcon
  },
  {
    name: 'codechecks/aggregated',
    friendlyName: 'Codechecks',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: ArticleIcon
  },
  {
    name: 'finding/malware',
    friendlyName: 'Malware',
    SpecificTypeHandler: MultilineTextViewer,
    Icon: CoronavirusIcon
  },
]


const SeveritySelector = ({
  selected,
  setSelected,
}) => {
  const theme = useTheme()

  return <Stack direction='column' spacing={2}>
    <Typography>
      Severity Filter
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
        severityConfigs.map((severityCfg) => {
          return <li
            key={severityCfg.name}
            style={{
              margin: theme.spacing(0.5),
            }}
          >
            {
              selected.includes(severityCfg.name) ? <Chip
                label={severityCfg.name}
                variant={'filled'}
                onClick={() => setSelected(selected.filter(entry => entry !== severityCfg.name))}
                color={severityCfg.color}
                size={'small'}
              /> : <Chip
                label={severityCfg.name}
                variant={'outlined'}
                onClick={() => setSelected([...selected, severityCfg.name])}
                color={severityCfg.color}
                size={'small'}
              />
            }
          </li>
        })
      }
    </Box>
  </Stack>
}
SeveritySelector.displayName = 'SeveritySelector'
SeveritySelector.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelected: PropTypes.func.isRequired,
}


const MetadataFilter = ({
  selectedSeverities,
  setSelectedSeverities,
  selectedMetadataTypes,
  setSelectedMetadataTypes,
  metadataTypes,
}) => {

  return <Stack direction='column' spacing={5}>
    <Stack direction='row' spacing={5}>
      <SeveritySelector
        selected={selectedSeverities}
        setSelected={setSelectedSeverities}
      />
      <Divider
        orientation='vertical'
        flexItem
      />
      <MetadataTypeSelector
        selected={selectedMetadataTypes}
        setSelected={setSelectedMetadataTypes}
        metadataTypes={metadataTypes}
      />
    </Stack>
  </Stack>
}
MetadataFilter.displayName = 'MetadataFilter'
MetadataFilter.propTypes = {
  selectedSeverities: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedSeverities: PropTypes.func.isRequired,
  selectedMetadataTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedMetadataTypes: PropTypes.func.isRequired,
  metadataTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const MetadataTypeSelector = ({
  selected,
  setSelected,
  metadataTypes
}) => {
  const theme = useTheme()

  return <Stack direction='column' spacing={2}>
    <Typography>Metadata Type Filter</Typography>
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
        metadataTypes.map((metadataType) => {
          return <li
            key={metadataType.name}
            style={{
              margin: theme.spacing(0.5),
            }}
          >
            {
              selected.includes(metadataType.name) ? <Chip
                label={metadataType.friendlyName}
                variant={'filled'}
                onClick={() => setSelected(selected.filter(entry => entry !== metadataType.name))}
                color={'default'}
                size={'small'}
              /> :  <Chip
                label={metadataType.friendlyName}
                variant={'outlined'}
                onClick={() => setSelected([...selected, metadataType.name])}
                color={'default'}
                size={'small'}
              />
            }
          </li>
        })
      }
    </Box>
  </Stack>
}
MetadataTypeSelector.displayName = 'MetadataTypeSelector'
MetadataTypeSelector.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelected: PropTypes.func.isRequired,
  metadataTypes: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const AccordionHeader = ({
  expandAll,
  setExpandAll,
  attributeToSortBy,
  sortDirection,
  setAttributeToSortBy,
  setSortDirection,
}) => {
  const sortByAttribute = ({ attribute }) => {
    if (attributeToSortBy !== attribute) {
      // attribute changed, keep sort direction
      setAttributeToSortBy(attribute)
    } else {
      let newSortDirection
      if (sortDirection === 'asc') {
        newSortDirection = 'desc'
      } else {
        newSortDirection = 'asc'
      }

      setSortDirection(newSortDirection)
    }
  }
  sortByAttribute.propTypes = {
    handleSortClick: PropTypes.string.isRequired,
  }

  return <Paper
    elevation={0}
  >
    <Grid container alignItems='center'>
      <Grid item xs={2}>
        <Button
          color='secondary'
          onClick={() => sortByAttribute({attribute: 'name'})}
          endIcon={
            attributeToSortBy === 'name' && <SortDirectionIcon
              sortDirection={sortDirection}
            />
          }
        >
            Sort by Artefact
        </Button>
      </Grid>
      <Grid item xs={5}/>
      <Grid item xs={2}>
        <Box
          display='flex'
          justifyContent='center'
        >
          <Button
            color='secondary'
            onClick={() => sortByAttribute({attribute: 'severity'})}
            endIcon={
              attributeToSortBy === 'severity' && <SortDirectionIcon
                sortDirection={sortDirection}
              />
            }
          >
              Sort by Severity
          </Button>
        </Box>
      </Grid>
      <Grid item xs={2}/>
      <Grid item xs={1}>
        <Box
          display='flex'
          justifyContent='right'
        >
          <Button
            color='secondary'
            onClick={() => setExpandAll(!expandAll)}
          >
            {
              expandAll ? 'Fold All' : 'Expand All'
            }
          </Button>
        </Box>
      </Grid>
    </Grid>
  </Paper>
}
AccordionHeader.displayName = 'AccordionHeader'
AccordionHeader.propTypes = {
  expandAll: PropTypes.bool.isRequired,
  setExpandAll: PropTypes.func.isRequired,
  attributeToSortBy: PropTypes.string.isRequired,
  sortDirection: PropTypes.string.isRequired,
  setAttributeToSortBy: PropTypes.func.isRequired,
  setSortDirection: PropTypes.func.isRequired,
}


const MetadataViewerAccordion = ({
  artefact,
  artefactMetadata,
  expandAll,
  hiddenaArtefactMetadataTypes,
}) => {
  const [expanded, setExpanded] = React.useState(expandAll)
  const [allExpanded, setAllExpanded] = React.useState(expandAll)

  if (allExpanded !== expandAll) {
    setExpanded(expandAll)
    setAllExpanded(expandAll)
  }

  return <Accordion
    expanded={expanded}
    onChange={() => setExpanded(!expanded)}
    key={generateArtefactID(artefact)}
    TransitionProps={{ unmountOnExit: true }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
    >
      <Grid container alignItems='center'>
        <Grid item xs={5}>
          <Typography variant='body1'>{artefact.name}</Typography>
        </Grid>
        <Grid item xs={3}>
          <CopyOnClickChip
            value={artefact.version}
            label={trimLongString(artefact.version, 30)}
            chipProps={{
              variant: 'outlined'
            }}
          />
        </Grid>
        <Grid item xs={2}>
          <SeverityIndicator
            severity={worstSeverity({artefactMetadataSequence: artefactMetadata})}
            threshold={findSeverityCfgByName({name: SEVERITIES.UNKNOWN}).value}
          />
        </Grid>
        <Grid item xs={1}>
          {
            hiddenaArtefactMetadataTypes.length !== 0 && <Tooltip
              title={
                <Stack direction='column' spacing={1}>
                  <Typography variant='subtitle1'>Filtered out:</Typography>
                  <Divider orientation='horizontal' />
                  <Stack direction='column' spacing={0}>
                    {
                      hiddenaArtefactMetadataTypes.map((type) => {
                        const typedef = findTypedefByName({name: type})
                        return <Typography
                          variant='body1'
                          key={type}
                        >
                          {typedef ? typedef.friendlyName : type}
                        </Typography>
                      })
                    }
                  </Stack>
                </Stack>
              }
            >
              <Box
                display='flex'
                justifyContent='center'
              >
                <InfoOutlinedIcon
                  sx={{
                    position: 'relative',
                  }}
                />
              </Box>
            </Tooltip>
          }
        </Grid>
        <Grid item xs={1}/>
      </Grid>
    </AccordionSummary>
    <AccordionDetails>
      {
        artefactMetadata.map((data) => {
          const typedef = findTypedefByName({name: data.meta.type})
          const Handler = typedef ? typedef.SpecificTypeHandler
            : defaultTypedefForName({name: data.meta.type}).SpecificTypeHandler

          const key = data.meta.type === artefactMetadataTypes.VULNERABILITY ?
            `${data.meta.type}:${data.data.cve}:${data.artefact.artefact.artefact_name}:${data.artefact.artefact.artefact_version}:${data.data.package_name}:${data.data.package_version}` :
            (
              data.meta.type === artefactMetadataTypes.LICENSE ?
                `${data.meta.type}:${data.data.license.name}:${data.artefact.artefact.artefact_name}:${data.artefact.artefact.artefact_version}` :
                (
                  data.meta.type === artefactMetadataTypes.STRUCTURE_INFO ?
                    `${data.meta.type}:${data.data.package_name}:${data.data.package_version}` :
                    data.meta.type
                )
            )
          return <MetadataViewer
            key={key}
            type={data.meta.type}
            data={{
              ...data.data,
              ...data.rescorings && { rescorings: data.rescorings },
            }}
            severity={artefactMetadatumSeverity(data)}
            timestamp={data.meta.last_update ?? data.meta.creation_date}
            ArtefactMetadataViewer={Handler}
          />
        })
      }
    </AccordionDetails>
  </Accordion>
}
MetadataViewerAccordion.displayName = 'MetadataViewerAccordion'
MetadataViewerAccordion.propTypes = {
  artefact: PropTypes.object.isRequired,
  artefactMetadata: PropTypes.arrayOf(PropTypes.object).isRequired,
  expandAll: PropTypes.bool.isRequired,
  hiddenaArtefactMetadataTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
}


const SortDirectionIcon = ({ sortDirection }) => {
  if (sortDirection === 'asc') {
    return <ArrowUpwardIcon/>
  } else if (sortDirection === 'desc') {
    return <ArrowDownwardIcon/>
  }
}
SortDirectionIcon.displayName = 'SortDirectionIcon'
SortDirectionIcon.propTypes = {
  sortDirection: PropTypes.string.isRequired,
}

/**
 * Returns worst severity of all artefactMetadata with severity defined in .meta or .rescorings
 * Returns `null` if no severity is found
 */
const worstSeverity = ({ artefactMetadataSequence }) => {
  const severities = artefactMetadataSequence.map((artefactMetadatum) => {
    return artefactMetadatumSeverity(artefactMetadatum)
  })

  return severities.reduce((worst, current) => {
    if (!worst) return current
    return current.value > worst.value ? current : worst
  }, null)
}


const uniqueTypedefs = ({
  complianceData,
}) => {
  const typeDefs = new Map()

  complianceData.map((data) => {
    const typedef = findTypedefByName({name: data.meta.type}) || defaultTypedefForName({name: data.meta.type})
    typeDefs.set(typedef.name, typedef)
  })

  return [...typeDefs.values()]
}


const MetadataViewerPopover = ({
  popoverProps,
  handleClose,
}) => {
  const { componentName, componentVersion, ocmRepo } = popoverProps

  const [open, setOpen] = React.useState(false)

  const [cd, state] = useFetchComponentDescriptor({
    componentName: componentName,
    componentVersion: componentVersion,
    ocmRepo: ocmRepo,
  })

  const components = React.useMemo(() => [{
    component_name: componentName,
    component_version: componentVersion,
  }], [componentName, componentVersion])

  const types = React.useMemo(() => {
    return Object.values(artefactMetadataTypes).filter((type) => ![
      artefactMetadataTypes.ARTEFACT_SCAN_INFO,
      artefactMetadataTypes.RESCORINGS,
    ].includes(type))
  }, [artefactMetadataTypes])

  const [findings, findingsState] = useFetchQueryMetadata({
    artefacts: components,
    types: types,
  })

  const rescoringTypes = React.useMemo(() => [artefactMetadataTypes.RESCORINGS], [])

  const [rescorings, rescoringsState] = useFetchQueryMetadata({
    artefacts: components,
    types: rescoringTypes,
    referenced_types: types,
  })

  const [selectedSeverities, setSelectedSeverities] = React.useState([])
  const [selectedMetadataTypes, setSelectedMetadataTypes] = React.useState([])

  const [attributeToSortBy, setAttributeToSortBy] = React.useState('severity')
  const [sortDirection, setSortDirection] = React.useState('desc')

  const [expandAll, setExpandAll] = React.useState(false)

  if (
    !open &&
    cd &&
    !state.isLoading &&
    !state.error &&
    findings &&
    rescorings &&
    !findingsState.isLoading &&
    !findingsState.error &&
    !rescoringsState.isLoading &&
    !rescoringsState.error) {
    setOpen(true)
  }
  if (!open) return null

  const compliance = mixupFindingsWithRescorings(findings, rescorings)
  const artefactMetadataCount = compliance.length
  let filteredArtefactMetadataCount = 0

  /**
   * Component is not passend from parent, but retrieved locally.
   * Thus, it is mutable and modifying (e.g. sort by severity) influences other components.
   *
   * --> work on a deep copy
   */
  const component = JSON.parse(JSON.stringify(cd.component))
  const artefacts = [...component.resources, ...component.sources]

  const sortArtefacts = (artefacts) => {
    if (attributeToSortBy === 'name') {
      if (sortDirection === 'asc') {
        // a -> Z
        return artefacts.sort((left, right) => left.name.localeCompare(right.name))
      } else if (sortDirection === 'desc') {
        // Z -> a
        return artefacts.sort((left, right) => -left.name.localeCompare(right.name))
      }
    } else if (attributeToSortBy === 'severity') {
      return artefacts.sort((left ,right) => severityComparator({
        left: left,
        right: right,
        artefactMetadata: compliance,
        ascending: (sortDirection === 'asc'),
        positiveListSeverity: selectedSeverities,
        positiveListType: selectedMetadataTypes,
      }))
    }
  }

  const sortArtefactMetadata = ({
    artefactMetadata,
  }) => {
    if (attributeToSortBy === 'name') {
      if (sortDirection === 'asc') {
        // a -> Z
        return artefactMetadata.sort((left, right) => left.meta.type.localeCompare(right.meta.type))
      } else if (sortDirection === 'desc') {
        // Z -> a
        return artefactMetadata.sort((left, right) => -left.meta.type.localeCompare(right.meta.type))
      }
    } else if (attributeToSortBy === 'severity') {
      return artefactMetadata.sort((left ,right) => artefactMetadataSeverityComparator({
        left: left,
        right: right,
        ascending: (sortDirection === 'asc'),
      }))
    }
  }
  sortArtefactMetadata.propTypes = {
    artefactMetadata: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  return <Dialog
    open={open}
    onClose={handleClose}
    maxWidth={false}
    fullWidth
    PaperProps={{
      sx: {
        width: '75%',
        height: '95%'
      }
    }}
  >
    <DialogTitle
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #000',
      }}
    >
      <Stack direction='column' spacing={4}>
        <Grid container alignItems='center'>
          <Grid item xs={1}/>
          <Grid item xs={10}>
            <Typography
              variant='h6'
              component='h2'
              align='center'
              color='secondary'
            >
              {`${component.name}:${component.version}`}
            </Typography>
          </Grid>
          <Grid item xs={1}/>
        </Grid>
        <Box
          display='flex'
          justifyContent='center'
        >
          <MetadataFilter
            selectedSeverities={selectedSeverities}
            setSelectedSeverities={setSelectedSeverities}
            selectedMetadataTypes={selectedMetadataTypes}
            setSelectedMetadataTypes={setSelectedMetadataTypes}
            metadataTypes={uniqueTypedefs({complianceData: compliance}).sort((left, right) => {
              return left.friendlyName.localeCompare(right.friendlyName)
            })}
          />
        </Box>
        <AccordionHeader
          expandAll={expandAll}
          setExpandAll={setExpandAll}
          attributeToSortBy={attributeToSortBy}
          sortDirection={sortDirection}
          setAttributeToSortBy={setAttributeToSortBy}
          setSortDirection={setSortDirection}
        />
      </Stack>
    </DialogTitle>
    <DialogContent
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
      }}
    >
      <div style={{height: '1em'}}/>
      <Stack direction='column' spacing={1}>
        {
          sortArtefacts(artefacts).map((artefact) => {
            const artefactMetadata = compliance.filter(
              artefactMetadataFilter({
                artefactName: artefact.name,
                artefactVersion: artefact.version,
                artefactExtraId: artefact.extraIdentity,
              })
            )

            const filteredArtefactMetadata = artefactMetadata.filter(
              artefactMetadataSeverityFilter({positiveList: selectedSeverities})
            ).filter(
              artefactMetadataTypeFilter({positiveList: selectedMetadataTypes})
            )

            filteredArtefactMetadataCount += filteredArtefactMetadata.length

            const artefactMetadataTypes = artefactMetadata.map(e => e.meta.type)
            const filteredArtefactMetadataTypes = filteredArtefactMetadata.map(e => e.meta.type)
            const hiddenaArtefactMetadataTypes = [...new Set(artefactMetadataTypes.filter((type) => {
              return !filteredArtefactMetadataTypes.includes(type)
            }))]

            if (filteredArtefactMetadata.length === 0) return null

            return <MetadataViewerAccordion
              key={generateArtefactID(artefact)}
              artefact={artefact}
              artefactMetadata={sortArtefactMetadata({
                artefactMetadata: filteredArtefactMetadata,
              })}
              expandAll={expandAll}
              hiddenaArtefactMetadataTypes={hiddenaArtefactMetadataTypes.sort()}
            />
          })
        }
      </Stack>
    </DialogContent>
    <DialogActions
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid #000',
      }}
    >
      <Grid container alignItems='center'>
        <Grid item xs={3}>
          <Box
            display='flex'
            justifyContent='left'
          >
            <Typography
              variant='body1'
              color='secondary'
            >
              {`${filteredArtefactMetadataCount}/${artefactMetadataCount} records are shown.`}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={8}/>
        <Grid item xs={1}>
          <Box
            display='flex'
            justifyContent='right'
          >
            <Button sx={{height: '100%', width: '100%'}} onClick={handleClose} color='secondary'>
                Close
            </Button>
          </Box>
        </Grid>
      </Grid>
    </DialogActions>
  </Dialog>
}
MetadataViewerPopover.displayName = 'MetadataViewerPopover'
MetadataViewerPopover.propTypes = {
  popoverProps: PropTypes.object,
  handleClose: PropTypes.func.isRequired,
}

const ComplianceDataTypeSelector = ({ currentSelection, types, handleChange }) => {
  const [value, setValue] = React.useState(currentSelection)

  const onChange = (event) => {
    setValue(event.target.value)
    handleChange(event.target.value)
  }

  return <FormControl
    fullWidth
  >
    <InputLabel id='demo-simple-select-label' color='secondary'>Compliance Data Type</InputLabel>
    <Select
      labelId='demo-simple-select-label'
      id='demo-simple-select'
      value={value}
      label='Compliance Data Type'
      onChange={onChange}
    >
      {
        types.sort().map((type) => {
          const typedef = findTypedefByName({name: type})
          return <MenuItem
            value={type}
            key={type}
          >
            {
              typedef ? typedef.friendlyName : type
            }
          </MenuItem>
        })
      }
    </Select>
  </FormControl>
}
ComplianceDataTypeSelector.displayName = 'ComplianceDataTypeSelector'
ComplianceDataTypeSelector.propTypes = {
  currentSelection: PropTypes.string,
  types: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleChange: PropTypes.func.isRequired,
}


export {
  artefactMetadataTypes,
  datasources,
  defaultTypedefForName,
  findTypedefByName,
  knownMetadataTypes,
  knownLabelNames,
  MetadataViewer,
  MetadataViewerPopover,
  severityConfigs,
  SeverityIndicator,
  worstSeverity,
}
