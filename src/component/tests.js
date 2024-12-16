import React from 'react'

import {
  Alert,
  Button,
  List,
  ListItemText,
  ListItem,
  ListItemSecondaryAction,
  Tooltip,
} from '@mui/material'
import { Box } from '@mui/system'

import PropTypes from 'prop-types'

import { routes } from '../api'
import { useFetchBom } from '../fetch'
import CenteredSpinner from '../util/centeredSpinner'
import { fetchBomPopulate } from '../consts'


const TestDownload = ({
  component,
  ocmRepo,
  testsFeature,
}) => {
  const [componentRefs, state] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
    populate: fetchBomPopulate.COMPONENT_REFS,
  })

  if (state.isLoading) return <CenteredSpinner sx={{ height: '90vh' }} />
  if (state.error) return <Alert severity='error'>
    Component descriptor <b>{component.name}:{component.version}</b> could not be fetched.
  </Alert>

  const componentsWithTests = testsFeature.components_with_tests
    .filter((comp) => componentRefs.componentDependencies.find(dep => dep.name === comp.componentName))
    .map((comp) => {
      return {
        ...componentRefs.componentDependencies.find(dep => dep.name === comp.componentName),
        description: comp.description,
        displayName: comp.displayName,
      }
    })

  if (componentsWithTests.length === 0) return <Alert severity='warning'>
    Tests are not available for this component. You can specify this in the features config.
  </Alert>

  return <Box
    sx={{
      minHeight: '500px',
    }}
  >
    <List>
      {
        componentsWithTests.map((comp) => {
          const downloadUrl = new URL(routes.downloadTestResults())
          downloadUrl.searchParams.append('componentName', comp.name)
          downloadUrl.searchParams.append('componentVersion', comp.version)

          return <ListItem key={`tests-${comp.name}-${comp.version}`}>
            <ListItemText
              primary={comp.description}
              secondary={`for ${comp.displayName} ${comp.version}`}
            />
            <ListItemSecondaryAction>
              <Tooltip title='Download an archive containing all test results'>
                <Button
                  variant='contained'
                  href={downloadUrl.href}
                >
                  Download
                </Button>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        })
      }
    </List>
  </Box>
}
TestDownload.displayName = 'TestDownload'
TestDownload.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
  testsFeature: PropTypes.object,
}


export { TestDownload }
