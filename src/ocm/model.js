import React from 'react'

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
  Typography,
  useTheme,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import PropTypes from 'prop-types'

import {
  ExtraIdentityHover,
  mixupFindingsWithRescorings,
  toYamlString,
  trimLongString,
} from '../util'
import {
  artefactMetadataFilter,
  generateArtefactID,
} from './util'
import MultilineTextViewer from '../util/multilineTextViewer'
import { useFetchComponentDescriptor, useFetchQueryMetadata } from '../fetch'
import CopyOnClickChip from '../util/copyOnClickChip'
import {
  artefactMetadataCategorisationComparator,
  artefactMetadataCategorisationFilter,
  artefactsCategorisationComparator,
  categorisationValueToColor,
  categoriseFinding,
  FINDING_TYPES,
  findingCfgForType,
  findingTypeToDisplayName,
  worstCategorisation,
} from '../findings'


const knownLabelNames = {
  cveCategorisation: 'gardener.cloud/cve-categorisation',
  responsible: 'cloud.gardener.cnudie/responsibles',
  mainSource: 'cloud.gardener/cicd/source',
}
Object.freeze(knownLabelNames)


const artefactMetadataTypes = {
  ARTEFACT_SCAN_INFO: 'meta/artefact_scan_info',
  STRUCTURE_INFO: 'structure_info',
  RESCORINGS: 'rescorings',
}
Object.freeze(artefactMetadataTypes)


const datasources = {
  BDBA: 'bdba',
  CLAMAV: 'clamav',
  CC_UTILS: 'cc-utils',
}
Object.freeze(datasources)


const asKey = ({
  props,
  separator = '|',
  absentIndicator = 'null',
}) => {
  return props.map((prop) => prop === null || prop === undefined ? absentIndicator : prop).join(separator)
}


/**
 * Generates a key to uniquely identify artefact metadata `data` properties. Mirrors key defintions
 * from https://github.com/gardener/cc-utils/blob/master/dso/model.py.
 *
 * @param {String} type - artefact metadata type
 * @param {Object} data - the artefact metadata `data` payload
 * @returns {String} data key
 */
export const dataKey = ({type, data}) => {
  if (type === artefactMetadataTypes.STRUCTURE_INFO) return asKey({
    props: [data.package_name, data.package_version],
  })

  if (type === FINDING_TYPES.LICENSE) return asKey({
    props: [data.package_name, data.package_version, data.license.name],
  })

  if (type === FINDING_TYPES.VULNERABILITY) return asKey({
    props: [data.package_name, data.package_version, data.cve],
  })

  if (type === FINDING_TYPES.MALWARE) return asKey({
    props: [data.finding.content_digest, data.finding.filename, data.finding.malware],
  })
}


const CategorisationIndicator = ({ categorisation }) => {
  if (!categorisation) return null

  return <Chip
    variant={'outlined'}
    label={categorisation.display_name}
    color={categorisationValueToColor(categorisation.value)}
  />
}
CategorisationIndicator.displayName = 'CategorisationIndicator'
CategorisationIndicator.propTypes = {
  categorisation: PropTypes.object,
}


const displayNameForData = ({
  type,
  data,
}) => {
  const displayName = findingTypeToDisplayName(type)

  if (type === FINDING_TYPES.VULNERABILITY) {
    return `${displayName} ${data.cve}`
  } else if (type === FINDING_TYPES.LICENSE) {
    return `${displayName} ${data.license.name}`
  } else if (type === artefactMetadataTypes.STRUCTURE_INFO) {
    return `Package ${data.package_name} ${data.package_version}`
  } else {
    return displayName
  }
}


const MetadataViewer = ({
  type,
  data,
  categorisation,
  timestamp,
}) => {
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
              displayNameForData({type, data})
            }
          </Typography>
        </Grid>
        <Grid item xs={2}/>
        <Grid item xs={3}>
          <CategorisationIndicator categorisation={categorisation}/>
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
      <MultilineTextViewer
        text={toYamlString(data)}
      />
    </AccordionDetails>
  </Accordion>
}
MetadataViewer.displayName = 'MetadataViewer'
MetadataViewer.propTypes = {
  type: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  categorisation: PropTypes.object,
  timestamp: PropTypes.string,
}


const CategorisationSelector = ({
  selectedCategorisations,
  setSelectedCategorisations,
  categorisations,
}) => {
  const theme = useTheme()

  return <Stack direction='column' spacing={2}>
    <Typography>
      Categorisation Filter
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
        categorisations.map((categorisation) => <li
          key={categorisation.id}
          style={{
            margin: theme.spacing(0.5),
          }}
        >
          {
            selectedCategorisations.find((c) => c.id === categorisation.id) ? <Chip
              label={categorisation.display_name}
              variant='filled'
              onClick={() => setSelectedCategorisations(selectedCategorisations.filter(c => c.id !== categorisation.id))}
              color={categorisationValueToColor(categorisation.value)}
              size='small'
            /> : <Chip
              label={categorisation.display_name}
              variant='outlined'
              onClick={() => setSelectedCategorisations([...selectedCategorisations, categorisation])}
              color={categorisationValueToColor(categorisation.value)}
              size='small'
            />
          }
        </li>)
      }
    </Box>
  </Stack>
}
CategorisationSelector.displayName = 'CategorisationSelector'
CategorisationSelector.propTypes = {
  selectedCategorisations: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedCategorisations: PropTypes.func.isRequired,
  categorisations: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const MetadataFilter = ({
  selectedCategorisations,
  setSelectedCategorisations,
  categorisations,
  metadataType,
  setMetadataType,
  metadataTypes,
}) => {

  return <Stack
    direction='row'
    spacing={5}
    display='flex'
    alignItems='center'
  >
    <MetadataTypeSelector
      metadataType={metadataType}
      setMetadataType={setMetadataType}
      metadataTypes={metadataTypes}
    />
    {
      categorisations && <>
        <Divider
          orientation='vertical'
          flexItem
        />
        <CategorisationSelector
          selectedCategorisations={selectedCategorisations}
          setSelectedCategorisations={setSelectedCategorisations}
          categorisations={categorisations}
        />
      </>
    }
  </Stack>
}
MetadataFilter.displayName = 'MetadataFilter'
MetadataFilter.propTypes = {
  selectedCategorisations: PropTypes.arrayOf(PropTypes.object).isRequired,
  setSelectedCategorisations: PropTypes.func.isRequired,
  categorisations: PropTypes.arrayOf(PropTypes.object),
  metadataType: PropTypes.string.isRequired,
  setMetadataType: PropTypes.func.isRequired,
  metadataTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
}


const MetadataTypeSelector = ({
  metadataType,
  setMetadataType,
  metadataTypes,
}) => {
  return <FormControl variant='standard' sx={{ width: '10vw'}}>
    <InputLabel>Metadata Type</InputLabel>
    <Select
      value={metadataType}
      label='Metadata Type'
      onChange={(e) => setMetadataType(e.target.value)}
    >
      {
        metadataTypes.map((type) => <MenuItem key={type} value={type}>
          <Typography variant='body2'>
            {findingTypeToDisplayName(type)}
          </Typography>
        </MenuItem>)
      }
    </Select>
  </FormControl>
}
MetadataTypeSelector.displayName = 'MetadataTypeSelector'
MetadataTypeSelector.propTypes = {
  metadataType: PropTypes.string.isRequired,
  setMetadataType: PropTypes.func.isRequired,
  metadataTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
}


const AccordionHeader = ({
  expandAll,
  setExpandAll,
  attributeToSortBy,
  sortDirection,
  setAttributeToSortBy,
  setSortDirection,
  categorisations,
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
      <Grid item xs={4}/>
      <Grid item xs={3}>
        {
          categorisations && <Box
            display='flex'
            justifyContent='center'
          >
            <Button
              color='secondary'
              onClick={() => sortByAttribute({attribute: 'categorisation'})}
              endIcon={
                attributeToSortBy === 'categorisation' && <SortDirectionIcon
                  sortDirection={sortDirection}
                />
              }
            >
                Sort by Categorisation
            </Button>
          </Box>
        }
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
  categorisations: PropTypes.arrayOf(PropTypes.object),
}


const MetadataViewerAccordion = ({
  artefact,
  artefactMetadata,
  findingCfg,
  expandAll,
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
          <ExtraIdentityHover
            displayName={artefact.name}
            extraIdentity={artefact.extraIdentity}
          />
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
          <CategorisationIndicator categorisation={worstCategorisation({
            findings: artefactMetadata,
            findingCfg: findingCfg,
          })}/>
        </Grid>
        <Grid item xs={2}/>
      </Grid>
    </AccordionSummary>
    <AccordionDetails>
      {
        artefactMetadata.map((data) => {
          const key = asKey({
            props: [
              data.meta.type,
              dataKey({
                type: data.meta.type,
                data: data.data,
              }),
            ],
          })

          return <MetadataViewer
            key={key}
            type={data.meta.type}
            data={{
              ...data.data,
              ...data.rescorings && { rescorings: data.rescorings },
            }}
            categorisation={categoriseFinding({
              finding: data,
              findingCfg: findingCfg,
            })}
            timestamp={data.meta.last_update ?? data.meta.creation_date}
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
  findingCfg: PropTypes.object,
  expandAll: PropTypes.bool.isRequired,
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


const MetadataViewerPopover = ({
  popoverProps,
  handleClose,
}) => {
  const { componentName, componentVersion, ocmRepo, findingCfgs } = popoverProps

  const [open, setOpen] = React.useState(false)
  const [metadataType, setMetadataType] = React.useState()

  const [cd, state] = useFetchComponentDescriptor({
    componentName: componentName,
    componentVersion: componentVersion,
    ocmRepo: ocmRepo,
  })

  const components = React.useMemo(() => [{
    component_name: componentName,
    component_version: componentVersion,
  }], [componentName, componentVersion])

  // structure info might also be available in case at least one finding cfg is available which
  // uses BDBA for scanning
  const includeStructureInfo = findingCfgs.find((findingCfg) => [
    FINDING_TYPES.LICENSE,
    FINDING_TYPES.VULNERABILITY,
  ].includes(findingCfg.type))

  const types = React.useMemo(() => {
    const findingTypes = findingCfgs.map((findingCfg) => findingCfg.type)

    if (!includeStructureInfo) return findingTypes
    return findingTypes.concat([artefactMetadataTypes.STRUCTURE_INFO])
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

  const [selectedCategorisations, setSelectedCategorisations] = React.useState([])

  const [attributeToSortBy, setAttributeToSortBy] = React.useState('categorisation')
  const [sortDirection, setSortDirection] = React.useState('desc')

  const [expandAll, setExpandAll] = React.useState(false)

  // only show those types for which some metadata is actually available
  const metadataTypes = [...new Set((findings ?? []).map((finding) => finding.meta.type))].sort()

  React.useEffect(() => {
    setSelectedCategorisations([])
  }, [metadataType])

  if (
    !open &&
    cd &&
    !state.isLoading &&
    !state.error &&
    findings &&
    rescorings &&
    metadataTypes &&
    !findingsState.isLoading &&
    !findingsState.error &&
    !rescoringsState.isLoading &&
    !rescoringsState.error) {
    setMetadataType(metadataTypes[0])
    setOpen(true)
  }
  if (!open || !metadataType) return null

  // finding cfg might not be available as we also allow plain informational metadata (e.g. structure info)
  const findingCfg = findingCfgForType({
    findingType: metadataType,
    findingCfgs: findingCfgs,
  })

  const compliance = mixupFindingsWithRescorings(findings, rescorings)
  const artefactMetadataCount = compliance.length
  let filteredArtefactMetadataCount = 0

  /**
   * Component is not passend from parent, but retrieved locally.
   * Thus, it is mutable and modifying (e.g. sort by categorisation) influences other components.
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
    } else if (attributeToSortBy === 'categorisation') {
      return artefacts.sort((left, right) => artefactsCategorisationComparator({
        left: left,
        right: right,
        artefactMetadata: compliance,
        metadataType: metadataType,
        positiveListCategorisations: selectedCategorisations,
        findingCfg: findingCfg,
        ascending: (sortDirection === 'asc'),
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
    } else if (attributeToSortBy === 'categorisation') {
      return artefactMetadata.sort((left, right) => artefactMetadataCategorisationComparator({
        left: left,
        right: right,
        findingCfg: findingCfg,
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
            selectedCategorisations={selectedCategorisations}
            setSelectedCategorisations={setSelectedCategorisations}
            categorisations={findingCfg?.categorisations}
            metadataType={metadataType}
            setMetadataType={setMetadataType}
            metadataTypes={metadataTypes}
          />
        </Box>
        <AccordionHeader
          expandAll={expandAll}
          setExpandAll={setExpandAll}
          attributeToSortBy={attributeToSortBy}
          sortDirection={sortDirection}
          setAttributeToSortBy={setAttributeToSortBy}
          setSortDirection={setSortDirection}
          categorisations={findingCfg?.categorisations}
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
            const artefactMetadata = compliance.filter(artefactMetadataFilter({
              artefactName: artefact.name,
              artefactVersion: artefact.version,
              artefactType: artefact.type,
              artefactExtraId: artefact.extraIdentity,
              metadataType: metadataType,
            }))

            const filteredArtefactMetadata = artefactMetadata.filter(artefactMetadataCategorisationFilter({
              positiveList: selectedCategorisations,
              findingCfg: findingCfg,
            }))

            filteredArtefactMetadataCount += filteredArtefactMetadata.length

            if (filteredArtefactMetadata.length === 0) return null

            return <MetadataViewerAccordion
              key={generateArtefactID(artefact)}
              artefact={artefact}
              artefactMetadata={sortArtefactMetadata({
                artefactMetadata: filteredArtefactMetadata,
              })}
              findingCfg={findingCfg}
              expandAll={expandAll}
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
  popoverProps: PropTypes.object.isRequired,
  handleClose: PropTypes.func.isRequired,
}


export {
  artefactMetadataTypes,
  datasources,
  knownLabelNames,
  MetadataViewerPopover,
  CategorisationIndicator,
}
