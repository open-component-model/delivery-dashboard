import React from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Tab,
  Tabs,
} from '@mui/material'

import { FeatureRegistrationContext, SearchParamContext } from '../App'
import { BomTab } from './dependencies/DependenciesTab'
import CenteredSpinner from './util/CenteredSpinner'
import FeatureDependent from './util/FeatureDependent'
import ComplianceTab from './compliance/Compliance'
import { ComponentDiffTab, ComponentDiffTabLoading } from './componentDiff/ComponentDiffTab'

import {
  features,
  tabConfig,
} from '../consts'
import { registerCallbackHandler } from '../feature'
import { TestDownload } from './tests/TestTab'
import { CdTab } from './cdTab'
import { DoraTabWrapper } from './dora/DoraTab'


export const TabPanel = (props) => {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`wrapped-tabpanel-${index}`}
      aria-labelledby={`wrapped-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={2}>{children}</Box>}
    </div>
  )
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
}


export const ComponentTabs = ({
  componentDescriptor,
  isLoading,
  ocmRepo,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [upgradePRsFeature, setUpgradePRsFeature] = React.useState()
  const [testsFeature, setTestsFeature] = React.useState()
  const [authFeature, setAuthFeature] = React.useState()

  const searchParamContext = React.useContext(SearchParamContext)

  const [searchQuery, setSearchQuery] = React.useState(searchParamContext.get('query'))
  const [searchQueryTimer, setSearchQueryTimer] = React.useState(null)

  const delaySearchQueryUpdate = (change) => {
    if (searchQueryTimer) {
      clearTimeout(searchQueryTimer)
      setSearchQueryTimer(null)
    }
    setSearchQueryTimer(
      setTimeout(() => {
        searchParamContext.update({'query': change})
        setSearchQuery(change)
      }, 300)
    )
  }

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.UPGRADE_PRS,
      callback: ({feature}) => setUpgradePRsFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.TESTS,
      callback: ({feature}) => setTestsFeature(feature),
    })
  }, [featureRegistrationContext])

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.AUTHENTICATION,
      callback: ({feature}) => setAuthFeature(feature),
    })
  }, [featureRegistrationContext])

  const handleChange = (_, newView) => {
    searchParamContext.update({'view': newView})
  }

  function* iterTabs() {
    yield tabConfig.BOM
    yield tabConfig.COMPONENT_DESCRIPTOR

    if (!upgradePRsFeature || upgradePRsFeature.isAvailable) yield tabConfig.COMPONENT_DIFF
    if (!testsFeature || testsFeature.isAvailable) yield tabConfig.TESTS
    if (!authFeature || authFeature.isAvailable) yield tabConfig.COMPLIANCE

    yield tabConfig.DORA
  }

  let tabs = []
  for (let tab of iterTabs()) tabs.push(tab)

  return <div>
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={searchParamContext.get('view')}
        onChange={handleChange}
        variant='scrollable'
        scrollButtons='auto'
        textColor='secondary'
      >
        {tabs.map((tab) => {
          return <Tab
            label={tab.caption}
            key={tab.id}
            value={tab.id}
          />
        })}
      </Tabs>
    </Box>
    <TabPanel value={searchParamContext.get('view')} index={tabConfig.BOM.id}>
      <BomTab
        component={componentDescriptor?.component}
        isLoading={isLoading}
        ocmRepo={ocmRepo}
        searchQuery={searchQuery}
        updateSearchQuery={delaySearchQueryUpdate}
      />
    </TabPanel>
    <TabPanel value={searchParamContext.get('view')} index={tabConfig.COMPONENT_DESCRIPTOR.id}>
      <CdTab
        componentDescriptor={componentDescriptor}
        isLoading={isLoading}
      />
    </TabPanel>
    <FeatureDependent requiredFeatures={[features.UPGRADE_PRS]}>
      <TabPanel value={searchParamContext.get('view')} index={tabConfig.COMPONENT_DIFF.id}>
        {
          isLoading ? <ComponentDiffTabLoading loadingPullRequestsCount={3}/> : <ComponentDiffTab
            component={componentDescriptor.component}
            ocmRepo={ocmRepo}
          />
        }
      </TabPanel>
    </FeatureDependent>
    <FeatureDependent requiredFeatures={[features.TESTS]}>
      <TabPanel value={searchParamContext.get('view')} index={tabConfig.TESTS.id}>
        {
          isLoading ? <CenteredSpinner sx={{ height: '90vh' }}/> : <TestDownload
            component={componentDescriptor.component}
            ocmRepo={ocmRepo}
            testsFeature={testsFeature}
          />
        }
      </TabPanel>
    </FeatureDependent>
    <FeatureDependent requiredFeatures={[features.AUTHENTICATION]}>
      <TabPanel value={searchParamContext.get('view')} index={tabConfig.COMPLIANCE.id}>
        {
          isLoading ? <CenteredSpinner sx={{ height: '90vh' }} /> : <ComplianceTab
            component={componentDescriptor.component}
            ocmRepo={ocmRepo}
          />
        }
      </TabPanel>
    </FeatureDependent>
    <TabPanel value={searchParamContext.get('view')} index={tabConfig.DORA.id}>
      {
        isLoading ? <CenteredSpinner sx={{ height: '90vh' }} /> : <DoraTabWrapper
          componentName={componentDescriptor.component.name}
        />
      }
    </TabPanel>
  </div>
}
ComponentTabs.displayName = 'ComponentTabs'
ComponentTabs.propTypes = {
  componentDescriptor: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
  ocmRepo: PropTypes.string,
}
