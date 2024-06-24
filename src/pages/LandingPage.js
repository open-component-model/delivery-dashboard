import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  capitalize,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Popover,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LandscapeIcon from '@mui/icons-material/Landscape'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import EditOffIcon from '@mui/icons-material/EditOff'
import HomeIcon from '@mui/icons-material/Home'
import LaunchIcon from '@mui/icons-material/Launch'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { styled, useTheme } from '@mui/material/styles'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'

import {
  useFetchUpgradePRs,
  useFetchSpecialComponentCurrentDependencies,
  useFetchComponentDescriptor,
  useFetchBom,
  useFetchComplianceSummary,
} from '../api/useFetch'
import { FeatureRegistrationContext } from '../App'
import {
  componentPathQuery,
  getMergedSpecialComponents,
  shortenComponentName,
  urlsFromRepoCtxFeature,
  worstSeverityByType,
} from './../util'
import { ComponentChip } from '../components/dependencies/ComplianceChips'
import PersistentDrawerLeft from '../components/layout/Drawer'
import { SprintInfo } from '../components/util/Sprint'
import { artefactMetadataTypes } from './../ocm/model'
import {
  features,
  FEATURES_CFG_KEY,
  OCM_REPO_AUTO_OPTION,
  pullRequestsStates,
  tabConfig,
} from '../consts'
import FeatureDependent from '../components/util/FeatureDependent'
import ErrorBoundary from '../components/util/ErrorBoundary'
import { VersionOverview, evaluateVersionMatch } from '../components/util/VersionOverview'
import { registerCallbackHandler } from '../feature'


export const LandingPage = () => {
  return <PersistentDrawerLeft
    open={true}
    componentId={null}
    componentIsAddedByUser={null}
  >
    <Stack
      direction='column'
      spacing={5}
    >
      <Typography variant='h4'>Component Overview</Typography>
      <SpecialComponents/>
    </Stack>
  </PersistentDrawerLeft>
}


const SpecialComponent = ({
  component,
  specialComponentsFeature,
}) => {
  const [isEditMode, setIsEditMode] = React.useState(false)

  // eslint-disable-next-line no-unused-vars
  const [componentDependencies, isLoading, isError, error] = useFetchBom(
    component,
    component.repoContextUrl,
    'componentReferences',
  )

  const toggleEditMode = () => {
    if (isEditMode) specialComponentsFeature.triggerRerender()
    setIsEditMode(!isEditMode)
  }

  return <Grid item sx={{ width: 500 }}>
    <Paper
      sx={{
        padding: 1,
        textAlign: 'center',
      }}
    >
      <ComponentBody
        component={component}
        componentDependenciesFetchDetails={{
          componentDependencies: componentDependencies,
          isComponentDependenciesLoading: isLoading,
          isComponentDependenciesError: isError,
        }}
        specialComponentsFeature={specialComponentsFeature}
        isEditMode={isEditMode}
        toggleEditMode={toggleEditMode}
      />
      <div style={{ padding: '0.3em' }} />
      <DefaultFooter
        component={component}
      />
    </Paper>
  </Grid>
}
SpecialComponent.displayName = 'SpecialComponent'
SpecialComponent.propTypes = {
  component: PropTypes.object.isRequired,
  specialComponentsFeature: PropTypes.object.isRequired,
}

const editDepOfCompActions = {
  ADD: 'add',
  REMOVE: 'remove',
  REORDER: 'reorder',
}
Object.freeze(editDepOfCompActions)

const editDepOfComp = (depName, component, actionObject) => {
  const addDep = (dependencies) => {
    const maxPosition = Math.max(...dependencies.filter((d) => d.disabled === false).map((d) => d.position !== undefined ? d.position : -1))

    return [
      ...dependencies.filter((d) => d.name !== depName),
      {
        name: depName,
        disabled: false,
        position: maxPosition >= 0 ? maxPosition + 1 : 0,
      }
    ]
  }
  const removeDep = (dependencies) => {
    const oldPosition = dependencies.find((d) => d.name === depName).position

    return [
      ...dependencies.filter((d) => d.name !== depName),
      {
        name: depName,
        disabled: true,
      }
    ].map((d) => {
      if (!d.disabled && d.position > oldPosition) d.position -= 1
      return d
    })
  }
  const reorderDep = (dependencies, fromIndex, toIndex) => {
    return dependencies.map((d) => {
      if (d.disabled) return d
  
      if (d.name === depName) d.position = toIndex
      else if (d.position > fromIndex && d.position <= toIndex) d.position -= 1
      else if (d.position < fromIndex && d.position >= toIndex)  d.position += 1
      return d
    })
  }
  const updateDeps = (dependencies) => {
    if (actionObject.action === editDepOfCompActions.ADD) {
      return addDep(dependencies)
    } else if (actionObject.action === editDepOfCompActions.REMOVE) {
      return removeDep(dependencies)
    } else if (actionObject.action === editDepOfCompActions.REORDER) {
      return reorderDep(dependencies, actionObject.fromIndex, actionObject.toIndex)
    } else {
      return dependencies
    }
  }

  const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ? JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) : {}

  const userComponents = featuresCfg.userComponents ? featuresCfg.userComponents : []
  const specialComponents = featuresCfg.specialComponents ? featuresCfg.specialComponents : []
  const components = component.isAddedByUser ? userComponents : specialComponents

  const cfg = components.find((comp) => comp.id === component.id)
  const dependencies = cfg?.dependencies ? cfg.dependencies : []

  const modifiedComponents = [
    ...components.filter((comp) => comp.id !== component.id),
    {
      ...cfg,
      id: component.id,
      name: component.name,
      version: component.version,
      dependencies: updateDeps(dependencies),
    },
  ]

  if (component.isAddedByUser) {
    featuresCfg.userComponents = modifiedComponents
  } else {
    featuresCfg.specialComponents = modifiedComponents
  }

  localStorage.setItem(FEATURES_CFG_KEY, JSON.stringify(featuresCfg))
}

const SpecialComponents = () => {
  const theme = useTheme()
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()
  const [repoCtxFeature, setRepoCtxFeature] = React.useState()
  const [dialogOpen, setDialogOpen] = React.useState(false)

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.REPO_CONTEXTS,
      callback: ({feature}) => setRepoCtxFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  if (
    !specialComponentsFeature ||
    !specialComponentsFeature.isAvailable ||
    !repoCtxFeature ||
    !repoCtxFeature.isAvailable
  ) {
    return null
  }

  const handleOpenNewSpecialComponent = () => {
    setDialogOpen(true)
  }
  const handleCloseNewSpecialComponent = () => {
    setDialogOpen(false)
  }

  const mergedSpecialComponents = getMergedSpecialComponents(specialComponentsFeature)

  const handleDragEnd = (result) => {
    if (!result.destination || result.reason === 'CANCEL' || result.destination.index === result.source.index) return
    const [depName, componentId, componentIsAddedByUser] = result.draggableId.split('|')

    const componentIdentity = (comp) => {
      return JSON.stringify({
        id: comp.id,
        isAddedByUser: String(comp.isAddedByUser),
      })
    }

    const localComp = {
      id: parseInt(componentId),
      isAddedByUser: componentIsAddedByUser,
    }

    const component = mergedSpecialComponents.find((comp) => {
      return componentIdentity(comp) === componentIdentity(localComp)
    })

    editDepOfComp(depName, component, { action: editDepOfCompActions.REORDER, fromIndex: result.source.index, toIndex: result.destination.index })
    specialComponentsFeature.triggerRerender()
  }

  const specialComponentTypes = [... new Set(mergedSpecialComponents.map(c => c.type))]

  return <>
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2}>
        {
          mergedSpecialComponents.map((component) => {
            return <SpecialComponent
              key={`${component.id}-${component.isAddedByUser}`}
              component={component}
              specialComponentsFeature={specialComponentsFeature}
            />
          })
        }
      </Grid> 
    </DragDropContext>
    <Fab
      style={{backgroundColor: theme.dependentComponentOverview.color, color: theme.bomButton.color, position: 'fixed', bottom: '1.5rem', right: '1.5rem'}}
      onClick={handleOpenNewSpecialComponent}
    >
      <AddIcon/>
    </Fab>
    {
      dialogOpen && <SpecialComponentDialog
        handleClose={handleCloseNewSpecialComponent}
        specialComponentsFeature={specialComponentsFeature}
        repoCtxFeature={repoCtxFeature}
        specialComponentTypes={specialComponentTypes}
      />
    }
  </>
}
SpecialComponents.displayName = 'SpecialComponents'

const SpecialComponentDialog = ({
  handleClose,
  specialComponentsFeature,
  repoCtxFeature,
  specialComponentTypes,
}) => {
  const theme = useTheme()
  const [dialogError, setDialogError] = React.useState()

  const [componentName, setComponentName] = React.useState()
  const [displayName, setDisplayName] = React.useState()
  const [type, setType] = React.useState(specialComponentTypes[0])
  const [ocmRepo, setOcmRepo] = React.useState(OCM_REPO_AUTO_OPTION)
  const [icon, setIcon] = React.useState('')

  const remove = () => {
    if (!componentName) {
      setDialogError('Please specify a component name')
      return
    }
    if (!displayName) {
      setDialogError('Please specify a display name')
      return
    }
    if (!type) {
      setDialogError('Please specify a component type')
      return
    }

    const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ? JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) : {}

    const id = featuresCfg.nextUserComponentId ? featuresCfg.nextUserComponentId : 0
    featuresCfg.nextUserComponentId = id + 1

    const specialComponent = {
      id: id,
      name: componentName,
      displayName: displayName,
      type: type,
      version: 'greatest',
      ...ocmRepo && ocmRepo !== OCM_REPO_AUTO_OPTION && {repoContextUrl: ocmRepo},
      ...icon !== '' && {icon: icon},
      isAddedByUser: true,
    }

    featuresCfg.userComponents = [
      ...(featuresCfg.userComponents ? featuresCfg.userComponents : []),
      specialComponent,
    ]

    localStorage.setItem(FEATURES_CFG_KEY, JSON.stringify(featuresCfg))

    specialComponentsFeature.triggerRerender()

    handleClose()
  }

  return <Dialog open={true} onClose={handleClose}>
    <DialogTitle>Add Component to Overview</DialogTitle>
    <DialogContent>
      <DialogContentText>
        To add a component, please enter its component name and the preferred 
        displayed name. Also, specify the type which is used to group multiple
        components as well as the repository context.
      </DialogContentText>
      <Stack spacing={1} sx={{ mt: 2 }}>
        {dialogError && <Alert severity='error'>{dialogError}</Alert>}
        <TextField
          autoFocus
          placeholder='e.g. github.com/gardener/gardener'
          margin='dense'
          label='Name'
          fullWidth
          variant='standard'
          onChange={(e) => {
            setComponentName(e.target.value)
          }}
        />
        <TextField
          margin='dense'
          label='Display Name'
          fullWidth
          variant='standard'
          inputProps={{ maxLength: 30 }}
          onChange={(e) => {
            setDisplayName(e.target.value)
          }}
        />
        <Autocomplete
          value={type}
          freeSolo
          disableClearable
          options={specialComponentTypes}
          onInputChange={(e, newValue) => {
            setType(newValue)
          }}
          renderInput={(params) => {
            return (
              <TextField
                {...params}
                variant='standard'
                label='Type'
                inputProps={{
                  ...params.inputProps,
                  maxLength: 20,
                }}
                InputProps={{
                  ...params.InputProps,
                }}
              />
            )
          }}
        />
        <Autocomplete
          value={ocmRepo}
          freeSolo
          disableClearable
          options={urlsFromRepoCtxFeature(repoCtxFeature)}
          onInputChange={(e, newValue) => {
            setOcmRepo(newValue)
          }}
          renderInput={(params) => {
            return (
              <TextField
                {...params}
                variant='standard'
                label='Repo context'
                InputProps={{
                  ...params.InputProps,
                }}
              />
            )
          }}
        />
        <FormControl style={{marginTop: '1rem'}}>
          <InputLabel id='new-special-component-icon-label'>Icon</InputLabel>
          <Select
            labelId='new-special-component-icon-label'
            value={icon}
            label='Icon'
            onChange={(e) => setIcon(e.target.value)}
          >
            <MenuItem value={''}>None</MenuItem>
            <MenuItem value={'home'}><HomeIcon style={{color: theme.bomButton.color}}/></MenuItem>
            <MenuItem value={'landscape'}><LandscapeIcon style={{color: theme.bomButton.color}}/></MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button color='inherit' onClick={handleClose}>
        Cancel
      </Button>
      <Button color='inherit' onClick={remove}>
        Ok
      </Button>
    </DialogActions>
  </Dialog>
}
SpecialComponentDialog.displayName = 'SpecialComponentDialog'
SpecialComponentDialog.propTypes = {
  handleClose: PropTypes.func.isRequired,
  specialComponentsFeature: PropTypes.object.isRequired,
  repoCtxFeature: PropTypes.object.isRequired,
  specialComponentTypes: PropTypes.array.isRequired,
}

const ComponentBody = ({
  component,
  componentDependenciesFetchDetails,
  specialComponentsFeature,
  isEditMode,
  toggleEditMode,
}) => {
  const theme = useTheme()
  const [addDepDialogOpen, setAddDepDialogOpen] = React.useState(false)
  const [specialComponentStatus, isLoading, isError] = useFetchSpecialComponentCurrentDependencies(component)

  const componentUrl = `#${componentPathQuery({
    name: component.name,
    version: component.version,
    versionFilter: component.versionFilter,
    view: 'bom',
    ocmRepo: component.repoContextUrl,
    specialComponentId: component.id,
    specialComponentIsAddedByUser: component.isAddedByUser,
  })}`

  // component derived from specialComponents has version 'greatest', therefore retrieve again
  // eslint-disable-next-line no-unused-vars
  const [cd, isCdLoading, isCdError, cdError] = useFetchComponentDescriptor({
    componentName: component.name,
    ocmRepoUrl: component.repoContextUrl,
    version: component.version,
    versionFilter: component.versionFilter,
  })
  const { componentDependencies, isComponentDependenciesLoading, isComponentDependenciesError } = componentDependenciesFetchDetails

  if (isLoading || isCdLoading || isComponentDependenciesLoading) {
    return <div>
      <ComponentHeader
        component={component}
        specialComponentsFeature={specialComponentsFeature}
        isEditMode={isEditMode}
        toggleEditMode={toggleEditMode}
        isLoading
        componentUrl={componentUrl}
      />
      <a
        style={{ textDecoration: 'none', color: 'inherit' }}
        href={componentUrl}
      >
        <VersionOverview isLoading />
      </a>
    </div>
  }
  if (isError || isCdError || isComponentDependenciesError) {
    return <ComponentHeader
      component={component}
      specialComponentsFeature={specialComponentsFeature}
      isEditMode={isEditMode}
      toggleEditMode={toggleEditMode}
      isError
      componentUrl={componentUrl}
    />
  }

  const dependencies = [...new Set(componentDependencies.componentDependencies.map((dep) => dep.name))].map((depName, idx) => {
    const userCfgDep = component.dependencies?.find((d) => d.name === depName)
    const remoteDep = specialComponentStatus.component_dependencies?.find((d) => d.name === depName)

    // Init position property of displayed deps (only applies for the first run)
    if (!userCfgDep?.disabled && // Dep is not manually disabled
      userCfgDep?.position === undefined && // Dep has no position specified yet
      (remoteDep || component.name === depName || userCfgDep?.disabled === false)) { // Remote deps, the component itself and manually added deps should be displayed by default
      editDepOfComp(depName, component, { action: editDepOfCompActions.ADD })
      specialComponentsFeature.triggerRerender()
    }

    if (component.name === depName) {
      return {
        name: component.name,
        displayName: component.displayName,
        localVersions: [cd.component.version],
        remoteVersion: specialComponentStatus.version,
        disabled: userCfgDep ? userCfgDep.disabled : false,
        position: userCfgDep ? userCfgDep.position : idx,
      }
    }

    const localVersions = componentDependencies.componentDependencies.filter((d) => d.name === depName).map((d) => d.version)
    return {
      name: depName,
      displayName: remoteDep?.displayName ? remoteDep.displayName : capitalize(shortenComponentName(depName)),
      localVersions: localVersions,
      remoteVersion: remoteDep?.version,
      disabled: userCfgDep ? userCfgDep.disabled : !remoteDep, // if it is a remote dep defaults to enabled, otherwise disabled
      position: userCfgDep ? userCfgDep.position : idx,
    }
  })

  const versionsMatch = specialComponentStatus.component_dependencies ? evaluateVersionMatch(dependencies.filter((dep) => dep.name !== component.name)) : undefined

  const handleAddDep = (e) => {
    e.preventDefault()
    setAddDepDialogOpen(true)
  }
  const handleAddDepDialogClose = () => {
    setAddDepDialogOpen(false)
  }

  const disabledDependencyNames = dependencies
    .filter((dep) => dep.disabled)
    .map((dep) => dep.name)
    .sort((a, b) => a.localeCompare(b))

  return <>
    <ComponentHeader
      component={component}
      releaseSucceeded={versionsMatch}
      specialComponentsFeature={specialComponentsFeature}
      isEditMode={isEditMode}
      toggleEditMode={toggleEditMode}
      componentUrl={componentUrl}
    />
    <a
      style={{ textDecoration: 'none', color: 'inherit' }}
      href={componentUrl}
    >
      {
        (isEditMode || dependencies.some((dep) => !dep.disabled)) && <DependentComponentBox sx={{
          borderRadius: '0.5rem',
          padding: '0.5rem',
          marginTop: '0.5rem',
          marginBottom: '0.5rem',
        }}>
          <Droppable droppableId={`${component.id}|${component.isAddedByUser}`} type={`${component.id}-${component.isAddedByUser}`}>
            {(provided) => (
              <Stack ref={provided.innerRef} {...provided.droppableProps} direction='column'>
                <VersionOverview
                  component={component}
                  dependencies={dependencies.filter((dep) => !dep.disabled)}
                  removeDepFromComp={(depName, component) => editDepOfComp(depName, component, { action: editDepOfCompActions.REMOVE })}
                  specialComponentsFeature={specialComponentsFeature}
                  isEditMode={isEditMode}
                  provided={provided}
                />
                {
                  isEditMode && disabledDependencyNames.length > 0 && <Grid container columns={11} spacing={1} sx={{py: 0}}>
                    <Grid item xs={5}/>
                    <Grid item xs={1}>
                      <IconButton onClick={handleAddDep}>
                        <AddIcon style={{color: theme.bomButton.color}}/>
                      </IconButton>
                    </Grid>
                    <Grid item xs={5}/>
                  </Grid>
                }
              </Stack>
            )}
          </Droppable>
        </DependentComponentBox>
      }
    </a>
    {
      addDepDialogOpen && <AddDependencyDialog
        handleClose={handleAddDepDialogClose}
        component={component}
        dependencies={dependencies.filter((dep) => dep.disabled).sort((a, b) => {
          // Show dep for component itself always as first elem
          if (a.name === component.name) return -1
          if (b.name === component.name) return 1
          // Show deps with remote versions always before deps without remote versions
          if (a.remoteVersion && !b.remoteVersion) return -1
          if (b.remoteVersion && !a.remoteVersion) return 1
          // Otherwise order by dep name
          return a.displayName.localeCompare(b.displayName)
        }).map((dep) => dep.name)}
        specialComponentsFeature={specialComponentsFeature}
      />
    }
  </>
}
ComponentBody.displayName = 'ComponentBody'
ComponentBody.propTypes = {
  component: PropTypes.object.isRequired,
  componentDependenciesFetchDetails: PropTypes.object.isRequired,
  specialComponentsFeature: PropTypes.object.isRequired,
  isEditMode: PropTypes.bool.isRequired,
  toggleEditMode: PropTypes.func.isRequired,
}

const AddDependencyDialog = ({
  handleClose,
  component,
  dependencies,
  specialComponentsFeature,
}) => {
  const handleAddDep = (depName) => {
    editDepOfComp(depName, component, { action: editDepOfCompActions.ADD })
    specialComponentsFeature.triggerRerender()
    handleClose()
  }

  return <Dialog open={true} onClose={handleClose}>
    <DialogTitle>Add Dependency to Component Overview</DialogTitle>
    <DialogContent>
      <DialogContentText>
        To add a dependency, please click its name.
      </DialogContentText>
      <Stack spacing={1} sx={{ mt: 2 }}>
        {
          dependencies.map((depName) => {
            return <Button
              key={`dep-${depName}`}
              color='secondary'
              style={{textTransform: 'none', justifyContent: 'flex-start'}}
              onClick={() => handleAddDep(depName)}
            >
              {depName}
            </Button>
          })
        }
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button color='inherit' onClick={handleClose}>
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
}
AddDependencyDialog.displayName = 'AddDependencyDialog'
AddDependencyDialog.propTypes = {
  handleClose: PropTypes.func.isRequired,
  component: PropTypes.object.isRequired,
  dependencies: PropTypes.array.isRequired,
  specialComponentsFeature: PropTypes.object.isRequired,
}

const ReleaseSucceededIcon = ({ releaseSucceeded }) => {
  if (releaseSucceeded === undefined) {
    // Just a placeholder to ensure the layout has the same size
    return <CheckCircleOutlineIcon style={{visibility: 'hidden'}}/>
  }
  if (releaseSucceeded) return <Tooltip
    title='Release Succeeded'
  >
    <CheckCircleOutlineIcon color='success' fontSize='medium' />
  </Tooltip>
  return <Tooltip
    title='Release Pending'
  >
    <WarningAmberIcon color='warning' fontSize='medium' />
  </Tooltip>
}
ReleaseSucceededIcon.displayName = 'ReleaseSucceededIcon'
ReleaseSucceededIcon.propTypes = {
  releaseSucceeded: PropTypes.bool,
}

const ComponentHeader = ({
  component,
  releaseSucceeded,
  specialComponentsFeature,
  isEditMode,
  toggleEditMode,
  isLoading,
  isError,
  componentUrl,
}) => {
  const theme = useTheme()
  const [optionsAnchorElement, setOptionsAnchorElement] =  React.useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const handleOpenOptions = (e) => {
    e.preventDefault()
    setOptionsAnchorElement(e.currentTarget)
  }
  const handleCloseOptions = () => {
    setOptionsAnchorElement(null)
  }

  const handleClickEditMode = () => {
    handleCloseOptions()
    toggleEditMode()
  }

  const handleCancelEdit = (e) => {
    e.preventDefault()
    toggleEditMode()
  }

  const handleDeleteDialogOpen = () => {
    handleCloseOptions()
    setDeleteDialogOpen(true)
  }
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false)
  }

  const handleChangeDisplayName = (e) => {
    const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ? JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) : {}
    const components = component.isAddedByUser ?
      (featuresCfg.userComponents ? featuresCfg.userComponents : []) :
      (featuresCfg.specialComponents ? featuresCfg.specialComponents : [])

    let cfg = components.find((comp) => comp.id === component.id)

    if (cfg) {
      cfg.displayName = e.target.value
    } else {
      cfg = {
        id: component.id,
        name: component.name,
        version: component.version,
        displayName: e.target.value,
      }
    }

    if (component.isAddedByUser) {
      featuresCfg.userComponents = [
        ...components.filter((comp) => comp.id !== component.id),
        cfg,
      ]
    } else {
      featuresCfg.specialComponents = [
        ...components.filter((comp) => comp.id !== component.id),
        cfg,
      ]
    }
    localStorage.setItem(FEATURES_CFG_KEY, JSON.stringify(featuresCfg))
  }

  const getSpecialComponentFeature = () => {
    if (!specialComponentsFeature || !specialComponentsFeature.isAvailable)
      return null

    return specialComponentsFeature.cfg.specialComponents.find(c => c.name === component.name)
  }

  const specialComponentFeature = getSpecialComponentFeature()

  return <>
    <Grid container alignItems='center' marginTop='0.5rem' marginBottom='0.5rem'>
      <Grid item xs={2} marginLeft='0.5rem' marginRight='-0.5rem'>
        {
          isLoading ? <Skeleton /> : <Stack spacing={1} direction='row'>
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
            >
              <ReleaseSucceededIcon releaseSucceeded={releaseSucceeded} />
            </Box>
            {
              specialComponentFeature && <Box
                display='flex'
                justifyContent='center'
                alignItems='center'
              >
                <Tooltip
                  title={'Jump to Release Pipeline'}
                >
                  <IconButton
                    component='a'
                    href={specialComponentFeature?.releasePipelineUrl}
                    target='_blank'
                  >
                    <LaunchIcon/>
                  </IconButton>
                </Tooltip>
              </Box>
            }
          </Stack>
        }
      </Grid>
      <Grid item xs={8}>
        <a
          style={{ textDecoration: 'none', color: 'inherit' }}
          href={componentUrl}
        >
          <Stack direction='row' spacing={1} justifyContent='center'>
            {
              component.icon === 'landscape' ? <LandscapeIcon/> : (
                component.icon === 'home' ? <HomeIcon/> : null
              )
            }
            {
              isError ? <Typography variant='caption'>Error fetching Component</Typography> : (isEditMode ? <form>
                <input type='text' onClick={(e) => e.preventDefault()} onChange={handleChangeDisplayName} defaultValue={component.displayName} maxLength={30}/> 
              </form> : <Typography style={{ fontSize: 'medium', fontWeight: 'bold' }}>
                {component.displayName}
              </Typography>)
            }
          </Stack>
        </a>
      </Grid>
      <Grid item xs={2}>
        {
          isEditMode ? <IconButton onClick={handleCancelEdit} size='small'>
            <EditOffIcon style={{color: theme.bomButton.color}}/>
          </IconButton> : <IconButton onClick={handleOpenOptions} size='small'>
            <MoreVertIcon style={{color: theme.bomButton.color}}/>
          </IconButton>
        }
      </Grid>
    </Grid>
    <Popover
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={!!optionsAnchorElement}
      anchorEl={optionsAnchorElement}
      onClose={handleCloseOptions}
    >
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <ListItemButton onClick={handleClickEditMode}>
            <EditIcon/>
            <div style={{ padding: '0.3em' }} />
            <ListItemText primary={'Edit Component'} />
          </ListItemButton>
          {
            component.isAddedByUser && <ListItem disablePadding>
              <ListItemButton onClick={handleDeleteDialogOpen}>
                <DeleteIcon/>
                <div style={{ padding: '0.3em' }} />
                <ListItemText primary={'Remove Component'} />
              </ListItemButton>
            </ListItem>
          }
        </List>
      </Box>
    </Popover>
    {
      deleteDialogOpen && <DeleteUserComponentDialog
        handleClose={handleDeleteDialogClose}
        component={component}
        specialComponentsFeature={specialComponentsFeature}
      />
    }
  </>
}
ComponentHeader.displayName = 'ComponentHeader'
ComponentHeader.propTypes = {
  component: PropTypes.object,
  releaseSucceeded: PropTypes.bool,
  specialComponentsFeature: PropTypes.object.isRequired,
  isEditMode: PropTypes.bool,
  toggleEditMode: PropTypes.func,
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
  componentUrl: PropTypes.string,
}

const DeleteUserComponentDialog = ({
  handleClose,
  component,
  specialComponentsFeature,
}) => {
  const submit = () => {
    const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY))

    featuresCfg.userComponents = [
      ...featuresCfg.userComponents.filter((comp) => comp.id !== component.id),
    ]
    localStorage.setItem(FEATURES_CFG_KEY, JSON.stringify(featuresCfg))

    specialComponentsFeature.triggerRerender()

    handleClose()
  }

  return <Dialog open={true} onClose={handleClose}>
    <DialogTitle>Remove Component from Overview</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Do you really want to remove this component from your overview page?
        This action cannot be undone.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button color='inherit' onClick={handleClose}>
        Cancel
      </Button>
      <Button color='inherit' onClick={submit}>
        Ok
      </Button>
    </DialogActions>
  </Dialog>
}
DeleteUserComponentDialog.displayName = 'DeleteUserComponentDialog'
DeleteUserComponentDialog.propTypes = {
  handleClose: PropTypes.func.isRequired,
  component: PropTypes.object.isRequired,
  specialComponentsFeature: PropTypes.object.isRequired,
}

const DependentComponentBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.dependentComponentOverview.color,
}))

const DefaultFooter = ({ component }) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  const sprintRules = () => {
    if (!specialComponentsFeature || !specialComponentsFeature.isAvailable) {
      return null
    }

    const sprintComponent = specialComponentsFeature.cfg.specialComponents.find(c => c.name === component.name)
    return sprintComponent ? sprintComponent.sprintRules : null
  }
  const now = new Date()

  return <Grid
    container
    display='flex'
    alignItems='center'
    spacing={2}
  >
    <Grid item xs={5}>
      <FeatureDependent requiredFeatures={[features.SPRINTS]}>
        <ErrorBoundary>
          <SprintInfo
            sprintRules={sprintRules()}
            date={now}
          />
        </ErrorBoundary>
      </FeatureDependent>
    </Grid>
    <Grid item xs={2}>
      <FeatureDependent requiredFeatures={[features.DELIVERY_DB]}>
        <ComponentCompliance
          component={component}
        />
      </FeatureDependent>
    </Grid>
    <Grid item xs={5}>
      <FeatureDependent requiredFeatures={[features.UPGRADE_PRS]}>
        <PullRequestsOverview
          component={component}
        />
      </FeatureDependent>
    </Grid>
  </Grid>
}
DefaultFooter.displayName = 'DefaultFooter'
DefaultFooter.propTypes = {
  component: PropTypes.object.isRequired,
}

const PullRequestsOverview = ({
  component,
}) => {
  const [prs, prsLoading, prFetchError] = useFetchUpgradePRs({
    componentName: component.name,
    state: pullRequestsStates.OPEN,
  })

  if (prsLoading) {
    return <Skeleton />
  }
  if (prFetchError) {
    return <Typography variant='caption'> error while fetching useFetchUpgradePRs</Typography>
  }
  if (prs.length === 0) {
    return <Button
      disabled
      style={{ textTransform: 'none' }}
      variant='outlined'
      fullWidth
      color='success'
    >
      PRs(0)
    </Button>
  }

  return <Tooltip
    title={
      <List>
        {prs.map((pr) => {
          return <PullRequestReference
            key={pr.pr.title}
            pr={pr}
          />
        })}
      </List>
    }
  >
    <Box display='flex' alignItems='right' justifyContent='center'>
      <Button
        style={{ textDecoration: 'none', textTransform: 'none' }}
        variant='outlined'
        fullWidth
        color='success'
        href={`#${componentPathQuery({
          name: component.name,
          version: component.version,
          versionFilter: component.versionFilter,
          view: tabConfig.COMPONENT_DIFF.id,
          ocmRepo: component.repoContextUrl,
          specialComponentId: component.id,
          specialComponentIsAddedByUser: component.isAddedByUser,
        })}`}>
        {`PRs(${prs.length})`}
      </Button>
    </Box>
  </Tooltip>
}
PullRequestsOverview.displayName = 'PullRequestsOverview'
PullRequestsOverview.propTypes = {
  component: PropTypes.object.isRequired,
}

const PullRequestReference = ({ pr }) => {
  return <ListItem disablePadding>
    <ListItemButton href={pr.pr.html_url}>
      <Grid container columns={10} rowSpacing={{ md: 0 }} columnSpacing={{ md: 1 }} style={{ alignItems: 'center' }}>
        <Grid item xs={4}>
          {pr.from.version}
        </Grid>
        <Grid item xs={2}>
          <TrendingFlatIcon fontSize='small' style={{ float: 'center', verticalAlign: 'middle' }} />
        </Grid>
        <Grid item xs={4} style={{ float: 'right' }}>
          {pr.to.version}
        </Grid>
      </Grid>
    </ListItemButton>
  </ListItem>
}
PullRequestReference.displayName = 'PullRequestReference'
PullRequestReference.propTypes = {
  pr: PropTypes.object.isRequired,
}


const ComponentCompliance = ({ component }) => {
  const [complianceSummary, isSummaryLoading, isSummaryError] = useFetchComplianceSummary({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: component.repoContextUrl,
    enableCache: true,
  })

  if (isSummaryLoading) {
    return <Skeleton />
  }

  if (isSummaryError) {
    return <Chip label='FetchError' variant='outlined' color='warning' />
  }

  function* iterSummaries(complianceSummary) {
    const worstVulnerability = worstSeverityByType(artefactMetadataTypes.VULNERABILITY, complianceSummary.complianceSummary)
    const worstOsInformation = worstSeverityByType(artefactMetadataTypes.OS_IDS, complianceSummary.complianceSummary)
    const worstMalware = worstSeverityByType(artefactMetadataTypes.FINDING_MALWARE, complianceSummary.complianceSummary)
    const worstLicenses = worstSeverityByType(artefactMetadataTypes.LICENSE, complianceSummary.complianceSummary)
    const worstCodeChecks = worstSeverityByType(artefactMetadataTypes.CODECHECKS_AGGREGATED, complianceSummary.complianceSummary)  

    if (worstVulnerability) yield worstVulnerability
    if (worstOsInformation) yield worstOsInformation
    if (worstMalware) yield worstMalware
    if (worstLicenses) yield worstLicenses
    if (worstCodeChecks) yield worstCodeChecks
  }

  return <ComponentChip
    componentSummary={{
      entries: [...iterSummaries(complianceSummary)]
    }}
  />
}
ComponentCompliance.displayName = 'ComponentCompliance'
ComponentCompliance.propTypes = {
  component: PropTypes.object.isRequired,
}
