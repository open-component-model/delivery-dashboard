import React from 'react'

import {
  Box,
  Tab,
  Tabs,
} from '@mui/material'

import PropTypes from 'prop-types'

import { FeatureRegistrationContext, SearchParamContext } from '../App'
import { BomTab } from './bom'
import CenteredSpinner from '../util/centeredSpinner'
import FeatureDependent from '../util/featureDependent'
import ComplianceTab from './compliance'
import { ComponentDiffTab, ComponentDiffTabLoading } from './diff'
import {
  features,
  tabConfig,
} from '../consts'
import { registerCallbackHandler } from '../feature'
import { TestDownload } from './tests'
import { CdTab } from './componentDescriptor'
import { DoraTabWrapper } from './dora'


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
  versionFilter,
  specialComponentId,
  browserLocalOnly,
}) => {
  const featureRegistrationContext = React.useContext(FeatureRegistrationContext)
  const [upgradePRsFeature, setUpgradePRsFeature] = React.useState()
  const [testsFeature, setTestsFeature] = React.useState()
  const [authFeature, setAuthFeature] = React.useState()
  const [findingCfgsFeature, setFindingCfgsFeature] = React.useState()

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

  React.useEffect(() => {
    return registerCallbackHandler({
      featureRegistrationContext: featureRegistrationContext,
      featureName: features.FINDING_CONFIGURATIONS,
      callback: ({feature}) => setFindingCfgsFeature(feature),
    })
  }, [featureRegistrationContext])

  const handleChange = (_, newView) => {
    searchParamContext.update({'view': newView})
  }

  // only show compliance tab if there are finding cfgs available
  // or it is unclear yet whether they are available (-> feature is loading)
  const findingCfgs = findingCfgsFeature?.isAvailable ? findingCfgsFeature.finding_cfgs : []
  const complianceTabIsRequired = !findingCfgsFeature || (findingCfgsFeature.isAvailable && findingCfgs.length > 0)

  function* iterTabs() {
    yield tabConfig.BOM
    yield tabConfig.COMPONENT_DESCRIPTOR

    if (!upgradePRsFeature || upgradePRsFeature.isAvailable) yield tabConfig.COMPONENT_DIFF
    if (!testsFeature || testsFeature.isAvailable) yield tabConfig.TESTS
    if ((!authFeature || authFeature.isAvailable) && complianceTabIsRequired) yield tabConfig.COMPLIANCE

    yield tabConfig.DORA
  }

  const tabs = [...iterTabs()]

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
        specialComponentId={specialComponentId}
        browserLocalOnly={browserLocalOnly}
        searchQuery={searchQuery}
        updateSearchQuery={delaySearchQueryUpdate}
      />
    </TabPanel>
    <TabPanel value={searchParamContext.get('view')} index={tabConfig.COMPONENT_DESCRIPTOR.id}>
      <CdTab
        componentDescriptor={componentDescriptor}
        isLoading={isLoading}
        ocmRepo={ocmRepo}
        versionFilter={versionFilter}
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
    {
      complianceTabIsRequired && <FeatureDependent requiredFeatures={[features.AUTHENTICATION]}>
        <TabPanel value={searchParamContext.get('view')} index={tabConfig.COMPLIANCE.id}>
          {
            isLoading || !findingCfgs ? <CenteredSpinner sx={{ height: '90vh' }} /> : <ComplianceTab
              component={componentDescriptor.component}
              ocmRepo={ocmRepo}
              findingCfgs={findingCfgs}
            />
          }
        </TabPanel>
      </FeatureDependent>
    }
    <TabPanel value={searchParamContext.get('view')} index={tabConfig.DORA.id}>
      {
        isLoading ? <CenteredSpinner sx={{ height: '90vh' }} /> : <DoraTabWrapper
          componentName={componentDescriptor.component.name}
          specialComponentId={specialComponentId}
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
  versionFilter: PropTypes.string,
  specialComponentId: PropTypes.string,
  browserLocalOnly: PropTypes.bool,
}
