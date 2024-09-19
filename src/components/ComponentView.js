import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  TextField,
  Tooltip,
  useTheme,
} from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'

import { useNavigate } from 'react-router-dom'

import { FeatureRegistrationContext, SearchParamContext } from './../App'
import {
  features,
  OCM_REPO_AUTO_OPTION,
  PATH_KEY,
  PATH_POS_KEY,
  VERSION_FILTER,
} from '../consts'
import { useFetchGreatestVersions } from '../api/fetchGreatestVersions'
import {
  componentPathQuery,
  shortenComponentName,
  urlsFromRepoCtxFeature,
  useDebounce,
} from '../util'
import { useFetchComponentDescriptor } from '../api/useFetch'
import { registerCallbackHandler } from '../feature'
import NotFoundPage from '../pages/NotFoundPage'
import { ComponentTabs } from './Tabs'


const ComponentDescriptorError = ({
  component,
  errorMsg,
}) => {
  return  <Box>
    <Alert severity='error'>
      Component descriptor <b>{component.name}:{component.version}</b> could not be fetched.
    </Alert>
    <NotFoundPage reason={errorMsg}/>
  </Box>
}
ComponentDescriptorError.displayName = 'ComponentDescriptorError'
ComponentDescriptorError.propTypes = {
  component: PropTypes.object.isRequired,
  errorMsg: PropTypes.string,
}


export const ComponentView = ({
  componentMeta,
  ocmRepo,
}) => {
  const [componentDescriptor, isLoading, isError, error] = useFetchComponentDescriptor({
    componentName: componentMeta.name,
    ocmRepoUrl: ocmRepo,
    version: componentMeta.version,
    versionFilter: componentMeta.versionFilter,
  })

  return <Box>
    <NavigationHeader
      component={componentDescriptor ? componentDescriptor.component : componentMeta}
      isLoading={isLoading}
    />
    <div style={{ padding: '1em' }} />
    {
      isError ? <ComponentDescriptorError
        component={componentMeta}
        errorMsg={error}
      /> : <ComponentTabs
        componentDescriptor={componentDescriptor}
        isLoading={isLoading}
        ocmRepo={ocmRepo}
        versionFilter={componentMeta.versionFilter}
      />
    }
  </Box>
}
ComponentView.displayName = 'ComponentView'
ComponentView.propTypes = {
  componentMeta: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


const ComponentOcmRepoSelector = ({
  ocmRepo,
  setOcmRepo,
  color,
  focused,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [repoCtxFeature, setRepoCtxFeature] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.REPO_CONTEXTS,
      callback: ({feature}) => setRepoCtxFeature(feature),
    })
  }, [featureRegistrationContext])

  return <Autocomplete
    freeSolo
    value={ocmRepo}
    options={urlsFromRepoCtxFeature(repoCtxFeature)}
    fullWidth
    disableClearable
    onChange={(event, value) => setOcmRepo(value)}
    renderInput={(params) => {
      return (
        <TextField
          onChange={(event) => setOcmRepo(event.target.value)}
          variant='standard'
          {...params}
          label='OCM Repository'
          color={color}
          focused={focused}
          InputProps={{
            ...params.InputProps,
          }}
        />
      )
    }}
  />
}
ComponentOcmRepoSelector.displayName = 'ComponentOcmRepoSelector'
ComponentOcmRepoSelector.propTypes = {
  ocmRepo: PropTypes.string,
  setOcmRepo: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  focused: PropTypes.bool.isRequired,
}

const ComponentVersionSelector = ({
  name,
  ocmRepo,
  componentVersion,
  setComponentVersion,
  versionFilter,
  color,
  focused,
}) => {
  // a mechanism is required to prevent greatest version fetching
  // as it already protects itself against null values for name or repo ctx, we initially
  // fetch version suggestions with null (thus prevent actual call) and set name onClick
  const [nameOrNull, setNameOrNull] = React.useState(null)

  const [
    versions,
    isLoading,
    // eslint-disable-next-line no-unused-vars
    isError,
  ] = useFetchGreatestVersions({
    componentName: nameOrNull,
    ocmRepoUrl: ocmRepo,
    versionFilter: versionFilter,
  })

  return <Autocomplete
    freeSolo
    options={
      isLoading || !versions
        ? []
        : versions.sort().reverse()
    }
    disableClearable
    onChange={(event, value) => setComponentVersion(value)}
    loading={isLoading}
    style={{flex: 1}}
    value={componentVersion}
    renderInput={(params) => <TextField
      onChange={(event) => setComponentVersion(event.target.value)}
      variant='standard'
      {...params}
      label='Component Version'
      focused={focused}
      color={color}
      InputProps={{
        ...params.InputProps,
        onClick: () => setNameOrNull(name),
        endAdornment: <>
          {isLoading && <CircularProgress color='inherit' size={20}/>}
          {params.InputProps.endAdornment}
        </>,
      }}
    />
    }
  />
}
ComponentVersionSelector.displayName = 'ComponentVersionSelector'
ComponentVersionSelector.propTypes = {
  name: PropTypes.string,
  ocmRepo: PropTypes.string,
  componentVersion: PropTypes.string,
  setComponentVersion: PropTypes.func.isRequired,
  versionFilter: PropTypes.string,
  color: PropTypes.string.isRequired,
  focused: PropTypes.bool.isRequired,
}

const NavigationHeader = ({
  component,
  isLoading,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)
  const theme = useTheme()

  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : [{name: component.name, version: component.version}]
  const pathPosItem = localStorage.getItem(PATH_POS_KEY)
  const pathPos = pathPosItem ? parseInt(pathPosItem) : 0

  return <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <IconButton
        title='Drill up'
        sx={{
          color: theme.palette.text.primary,
        }}
        onClick={(event) => {
          event.stopPropagation()
          const targetComponent = path[pathPos - 1]

          localStorage.setItem(PATH_POS_KEY, pathPos - 1)
          searchParamContext.update({
            'name': targetComponent.name,
            'version': targetComponent.version,
          })
        }}
        disabled={pathPos === 0}
      >
        <ArrowBackIosNewIcon sx={{fontSize: '0.75em'}} />
      </IconButton>
      <IconButton
        title='Drill down'
        sx={{
          color: theme.palette.text.primary,
        }}
        onClick={(event) => {
          event.stopPropagation()
          const targetComponent = path[pathPos + 1]

          localStorage.setItem(PATH_POS_KEY, pathPos + 1)
          searchParamContext.update({
            'name': targetComponent.name,
            'version': targetComponent.version,
          })
        }}
        disabled={pathPos === path.length - 1}
      >
        <ArrowForwardIosIcon sx={{fontSize: '0.75em'}} />
      </IconButton>
      {
        path.map((pathElem, idx) => <div key={idx} style={{display: 'flex', alignItems: 'center'}}>
          <Link
            key={idx}
            sx={{
              color: parseInt(pathPos) === idx ? theme.palette.secondary.main : 'grey',
              textAlign: 'center',
            }}
            // use href rather than router to enable "open in new tab"
            href={`#${componentPathQuery({
              name: pathElem.name,
              version: pathElem.version,
              ocmRepo: searchParamContext.get('ocmRepo'),
            })}`}
            // don't expand accordion
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {`${shortenComponentName(pathElem.name)}:${pathElem.version}`}
          </Link>
          {
            idx < path?.length - 1 && <ArrowForwardIosIcon fontSize={'0.5em'} sx={{color: 'grey', marginX: '0.25em'}} />
          }
        </div>)
      }
    </AccordionSummary>
    <AccordionDetails>
      <ComponentHeader
        name={component.name}
        version={component.version}
        ocmRepository={searchParamContext.get('ocmRepo') ? searchParamContext.get('ocmRepo') : OCM_REPO_AUTO_OPTION}
        isLoading={isLoading}
      />
    </AccordionDetails>
  </Accordion>
}
NavigationHeader.displayName = 'NavigationHeader'
NavigationHeader.propTypes = {
  component: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
}

const ComponentHeader = ({
  name,
  version,
  ocmRepository,
  isLoading,
}) => {
  const navigate = useNavigate()

  const searchParamContext = React.useContext(SearchParamContext)

  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)

  const [componentName, setComponentName] = React.useState(name)
  const [componentVersion, setComponentVersion] = React.useState(version)
  const [versionFilter, setVersionFilter] = React.useState(VERSION_FILTER.RELEASES_ONLY)
  const [ocmRepo, setOcmRepo] = React.useState(ocmRepository)
  const [searchError, setSearchError] = React.useState()

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.VERSION_FILTER,
      callback: ({feature}) => {
        if (feature?.isAvailable) setVersionFilter(feature.version_filter)
      },
    })
  }, [featureRegistrationContext])

  const selectionElementNames = {
    VERSION: 'version',
    NAME: 'name',
    OCM_REPO: 'ocmRepo',
  }
  Object.freeze(selectionElementNames)

  const [erroneousElementName, setErroneousElementName] = React.useState(null)

  const debouncedCName = useDebounce(componentName, 500)
  const debouncedOcmRepo = useDebounce(ocmRepo, 500)

  const theme = useTheme()

  const colorForElementName = ({ name }) => {
    if (name === erroneousElementName) return 'error'
    return 'primary'
  }

  const focusForElementName = ({ name }) => {
    if (name === erroneousElementName) return true
    return false
  }

  React.useEffect(() => {
    setComponentName(name)
  }, [name])
  React.useEffect(() => {
    setComponentVersion(version)
  }, [version])
  React.useEffect(() => {
    setOcmRepo(ocmRepository)
  }, [ocmRepository])

  return <Grid container display='flex' alignItems='center' spacing={2}>
    {searchError && (
      <Grid item xs={12}>
        <Alert severity='error'>{searchError}</Alert>
      </Grid>
    )}
    <Grid item xs={9} md={12} lg={8} xl={4}>
      <TextField
        value={componentName}
        onChange={(event) => {
          setComponentName(event.target.value)
        }}
        label='Component Name'
        variant='standard'
        fullWidth
        color={colorForElementName({name: selectionElementNames.NAME})}
        focused={focusForElementName({name: selectionElementNames.NAME})}
        disabled={isLoading}
      />
    </Grid>
    <Grid item xs={9} md={12} lg={8} xl={2}>
      <div style={{display: 'flex', alignItems: 'end'}}>
        {
          isLoading ? <TextField
            value={componentVersion}
            label='Component Version'
            variant='standard'
            fullWidth
            disabled
          /> : <ComponentVersionSelector
            name={debouncedCName}
            ocmRepo={debouncedOcmRepo === OCM_REPO_AUTO_OPTION ? null : debouncedOcmRepo}
            componentVersion={componentVersion}
            setComponentVersion={setComponentVersion}
            versionFilter={versionFilter}
            color={colorForElementName({name: selectionElementNames.VERSION})}
            focused={focusForElementName({name: selectionElementNames.VERSION})}
          />
        }
        <Tooltip title='Show Prerelease Versions'>
          <Checkbox
            size='small'
            color='default'
            disabled={isLoading}
            checked={versionFilter === VERSION_FILTER.ALL}
            onChange={(e) => setVersionFilter(e.target.checked ? VERSION_FILTER.ALL : VERSION_FILTER.RELEASES_ONLY)}
          />
        </Tooltip>
      </div>
    </Grid>
    <Grid item xs={8} md={8} lg={10} xl={5}>
      {
        isLoading ? <TextField
          value={ocmRepo}
          label='OCM Repository'
          variant='standard'
          fullWidth
          disabled
        /> : <ComponentOcmRepoSelector
          ocmRepo={ocmRepo}
          setOcmRepo={setOcmRepo}
          color={colorForElementName({name: selectionElementNames.OCM_REPO})}
          focused={focusForElementName({name: selectionElementNames.OCM_REPO})}
        />
      }
    </Grid>
    <Grid item xs={1} md={1} lg={1} xl={1} display='flex' justifyContent='center'>
      <IconButton
        title='Search component'
        sx={{
          backgroundColor: theme.palette.grey,
          border: `1px solid ${theme.palette.text.primary}`,
          color: theme.palette.text.primary,
        }}
        onClick={() => {
          setErroneousElementName(null)
          if (!componentVersion || !componentName) {
            if (!componentVersion) setErroneousElementName(selectionElementNames.VERSION)
            if (!componentName) setErroneousElementName(selectionElementNames.NAME)
          } else {
            setSearchError('')
            navigate(componentPathQuery({
              name: componentName,
              version: componentVersion,
              view: searchParamContext.get('view'),
              ocmRepo: ocmRepo === OCM_REPO_AUTO_OPTION ? null : ocmRepo,
            }))
          }
        }}
        disabled={isLoading}
      >
        <RefreshIcon />
      </IconButton>
    </Grid>
  </Grid>
}
ComponentHeader.displayName = 'ComponentHeader'
ComponentHeader.propTypes = {
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  ocmRepository: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
}

export default ComponentView
