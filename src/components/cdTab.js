import React from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Tooltip,
} from '@mui/material'

import MultilineTextViewer from './util/MultilineTextViewer'
import { useFetchComponentDescriptor } from '../api/useFetch'
import CenteredSpinner from './util/CenteredSpinner'
import { SearchParamContext } from '../App'
import { toYamlString } from '../util'


const FetchAndView = ({
  componentName,
  componentVersion,
  ocmRepo,
  versionFilter,
  setRaw,
  raw,
}) => {
  // eslint-disable-next-line no-unused-vars
  const [componentDescriptor, isLoading, isError, error] = useFetchComponentDescriptor({
    componentName: componentName,
    ocmRepoUrl: ocmRepo,
    version: componentVersion,
    versionFilter: versionFilter,
    raw: true,
  })

  React.useEffect(() => {
    setRaw(JSON.stringify(componentDescriptor, null, 2))
  }, [setRaw, componentDescriptor])

  return <MultilineTextViewer
    text={raw}
  />
}
FetchAndView.displayName = 'FetchAndView'
FetchAndView.propTypes = {
  componentName: PropTypes.string.isRequired,
  componentVersion: PropTypes.string.isRequired,
  ocmRepo: PropTypes.string,
  versionFilter: PropTypes.string,
  setRaw: PropTypes.func.isRequired,
  raw: PropTypes.string,
}


const Options = ({
  isLoading,
  showRaw,
  setShowRaw,
}) => {
  return <Box>
    <FormGroup>
      <FormControlLabel
        control={
          <Tooltip
            title='Raw document as retrieved from OCM repository, without (de)serialisation'
          >
            <Switch
              checked={showRaw}
              // eslint-disable-next-line no-unused-vars
              onChange={(event) => setShowRaw((prev) => !prev)}
              disabled={isLoading}
            />
          </Tooltip>
        }
        label='show raw'
      />
    </FormGroup>
  </Box>
}
Options.displayName = 'Options'
Options.propTypes = {
  isLoading: PropTypes.bool,
  showRaw: PropTypes.bool.isRequired,
  setShowRaw: PropTypes.func.isRequired,
}


const ComponentDescriptor = ({
  showRaw,
  raw,
  componentDescriptor,
  setRaw,
  ocmRepo,
  versionFilter,
}) => {
  return (showRaw && !raw) // prevent re-fetching if raw cd is present already
    ? <FetchAndView
      componentName={componentDescriptor.component.name}
      componentVersion={componentDescriptor.component.version}
      ocmRepo={ocmRepo}
      versionFilter={versionFilter}
      setRaw={setRaw}
      raw={raw}
    />
    : <MultilineTextViewer
      text={
        showRaw
          ? raw
          : toYamlString(componentDescriptor)
      }
    />
}
ComponentDescriptor.displayName = 'ComponentDescriptor'
ComponentDescriptor.propTypes = {
  showRaw: PropTypes.bool.isRequired,
  raw: PropTypes.string,
  setRaw: PropTypes.func.isRequired,
  componentDescriptor: PropTypes.object,
  ocmRepo: PropTypes.string,
  versionFilter: PropTypes.string,
}


export const CdTab = ({
  componentDescriptor,
  isLoading,
  ocmRepo,
  versionFilter,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)

  const [showRaw, setShowRaw] = React.useState(searchParamContext.get('rawCd') === 'true')
  const [raw, setRaw] = React.useState()

  React.useEffect(() => {
    searchParamContext.update({'rawCd': showRaw})
  }, [showRaw])

  return <Box
    display='flex'
    flexDirection='column'
  >
    <Options
      isLoading={isLoading}
      showRaw={showRaw}
      setShowRaw={setShowRaw}
    />
    {
      isLoading
        ? <CenteredSpinner/>
        : <ComponentDescriptor
          showRaw={showRaw}
          raw={raw}
          setRaw={setRaw}
          componentDescriptor={componentDescriptor}
          ocmRepo={ocmRepo}
          versionFilter={versionFilter}
        />
    }
  </Box>
}
CdTab.displayName = 'CdTab'
CdTab.propTypes = {
  componentDescriptor: PropTypes.object,
  isLoading: PropTypes.bool,
  ocmRepo: PropTypes.string,
  versionFilter: PropTypes.string,
}
