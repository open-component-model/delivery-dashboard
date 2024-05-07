import React from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Collapse,
  Divider,
  Grid,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  capitalize,
} from '@mui/material'

import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'

import { FeatureRegistrationContext, SearchParamContext } from '../../App'
import {
  camelCaseToDisplayText,
  componentPathQuery,
  getMergedSpecialComponents,
} from './../../util'
import { useFetchServiceExtensions } from './../../api/useFetch'

import GardenerLogo from '../../res/gardener-logo.svg'
import SAPLogo from '../../res/sap-logo.svg'
import { registerCallbackHandler } from '../../feature'
import {
  features,
  MONITORING_PATH,
  SERVICES_PATH,
} from '../../consts'


const ComponentNavigationHeader = () => {
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <Grid item xs={12}>
        <Link href='#'>
          <img src={GardenerLogo} alt='gardener-logo'/>
        </Link>
      </Grid>
      <Grid item xs={12}>
        <Typography variant='h5' gutterBottom>
          {
            // eslint-disable-next-line no-undef
            document.title = process.env.REACT_APP_DASHBOARD_TITLE
          }
        </Typography>
      </Grid>
      <Typography
        variant='caption'
        marginRight='0.4em'
        display='flex'
        alignSelf='flex-end'
        color='grey'
        gutterBottom
      >
        Build:{' '}
        {
          // eslint-disable-next-line no-undef
          process.env.REACT_APP_BUILD_VERSION
        }
      </Typography>
    </div>
  </div>
}

const LogoCorner = () => {
  return <Box
    sx={{
      position: 'fixed',
      paddingLeft: '1rem',
      bottom: 0,
    }}
  >
    <img src={SAPLogo} alt='sap-logo'/>
  </Box>
}

export const ComponentNavigation = React.memo(({ componentId, componentIsAddedByUser }) => {
  return <>
    <ComponentNavigationHeader/>
    <Divider/>
    <div style={{ marginBottom: '3.5rem' }}>
      <LandscapeList componentId={componentId} componentIsAddedByUser={componentIsAddedByUser}/>
      <ServiceList/>
    </div>
    <LogoCorner/>
  </>
})
ComponentNavigation.displayName = 'componentNavigation'
ComponentNavigation.propTypes = {
  componentId: PropTypes.any,
  componentIsAddedByUser: PropTypes.any,
}

const LandscapeListEntry = ({
  typeName,
  components,
  view,
  selectedComponentId,
  selectedComponentIsAddedByUser,
}) => {
  const [open, setOpen] = React.useState(true)

  const handleClick = () => {
    setOpen(!open)
  }

  return <div>
    <ListItemButton onClick={handleClick}>
      <ListItemText primary={capitalize(typeName)}/>
      {
        open ? <ExpandLess/> : <ExpandMore/>
      }
    </ListItemButton>
    <Collapse in={open} timeout='auto' unmountOnExit>
      <List disablePadding>
        {
          components.map(component => <ListItemButton
            key={JSON.stringify(component)}
            sx={{
              paddingLeft: 4,
            }}
            // use href rather than router to enable "open in new tab"
            href={`#${componentPathQuery({
              name: component.name,
              version: component.version,
              versionFilter: component.versionFilter,
              view: view,
              ocmRepo: component.repoContextUrl,
              specialComponentId: component.id,
              specialComponentIsAddedByUser: component.isAddedByUser,
            }
            )}`}
            selected={selectedComponentId === component.id && selectedComponentIsAddedByUser === component.isAddedByUser}
          >
            <ListItemText>
              {
                capitalize(component.displayName)
              }
            </ListItemText>
          </ListItemButton>)
        }
      </List>
    </Collapse>
  </div>
}
LandscapeListEntry.displayName = 'LandscapeListEntry'
LandscapeListEntry.propTypes = {
  typeName: PropTypes.string.isRequired,
  components: PropTypes.arrayOf(PropTypes.object).isRequired,
  view: PropTypes.string,
  selectedComponentId: PropTypes.any,
  selectedComponentIsAddedByUser: PropTypes.any,
}


const LandscapeList = ({ componentId, componentIsAddedByUser }) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [specialComponentsFeature, setSpecialComponentsFeature] = React.useState()

  const searchParamContext = React.useContext(SearchParamContext)

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.SPECIAL_COMPONENTS,
      callback: ({feature}) => setSpecialComponentsFeature(feature),
    })
  }, [featureRegistrationContext])

  const getSpecialComponents = () => {
    return specialComponentsFeature?.isAvailable
      ? getMergedSpecialComponents(specialComponentsFeature)
      : []
  }

  const specialComponentTypes = [... new Set(getSpecialComponents().map((c) => c.type))]

  return <List component='nav'>
    {
      specialComponentTypes.map((type) => <LandscapeListEntry
        key={type}
        typeName={type}
        components={getSpecialComponents().filter((component) => component.type === type)}
        view={searchParamContext.get('view')}
        selectedComponentId={componentId}
        selectedComponentIsAddedByUser={componentIsAddedByUser}
      />)
    }
  </List>
}
LandscapeList.displayName = 'LandscapeList'
LandscapeList.propTypes = {
  componentId: PropTypes.any,
  componentIsAddedByUser: PropTypes.any,
}


const ServiceListEntry = ({
  service,
}) => {
  const query = new URLSearchParams({
    service: service,
  })
  return <ListItemButton
    // use href rather than router to enable "open in new tab"
    href={`#${MONITORING_PATH}?${query.toString()}`}
    sx={{
      paddingLeft: 4
    }}
  >
    <ListItemText>
      {
        camelCaseToDisplayText(service)
      }
    </ListItemText>
  </ListItemButton>
}
ServiceListEntry.displayName = 'ServiceListEntry'
ServiceListEntry.propTypes = {
  service: PropTypes.string.isRequired,
}


const ServiceList = () => {
  const [services, isLoading, isError] = useFetchServiceExtensions()
  const [open, setOpen] = React.useState(true)

  const handleClick = () => {
    setOpen(!open)
  }

  if (isLoading || isError || !services) {
    return null
  }

  return <List component='nav'>
    <ListItemButton onClick={handleClick} href={`#${SERVICES_PATH}`}>
      <ListItemText primary='Extensions'/>
      {open ? <ExpandLess/> : <ExpandMore/>}
    </ListItemButton>
    <Collapse in={open} timeout='auto' unmountOnExit>
      <List disablePadding>
        {
          services.map((service) => <ServiceListEntry key={service} service={service}/>)
        }
      </List>
    </Collapse>
  </List>
}
ServiceList.displayName = 'ServiceList'
ServiceList.propTypes = {}
