import React from 'react'
import PropTypes from 'prop-types'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Checkbox,
  Grid,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import CenteredSpinner from './../util/CenteredSpinner'
import { ConfigContext } from './../../App'
import { FEATURES_CFG_KEY, PATH_KEY } from './../../consts'
import { median, shortenComponentName } from './../../util'
import { useFetchDoraMetrics } from './../../api/useFetch'
import {
  CommitsDeploymentsChart,
  DeploymentFrequencyPerDependencyChart,
  DeploymentFrequencyPerMonth,
  MedianChangeLeadTimeDependenciesPerMonth,
  MedianChangeLeadTimePerDependencyChart,
  MedianChangeLeadTimePerMonth,
  MedianDeploymentFrequencyPerMonth,
  TotalDeploymentsPerDependencyChart,
} from './Charts'


const TimeSpanSlider = ({
  timeSpanDays,
  setTimeSpanDays,
}) => {
  const marks = [{
    value: 30,
    label: '30 Days',
  }, {
    value: 60,
    label: '60 Days',
  }, {
    value: 90,
    label: '90 Days',
  }, {
    value: 120,
    label: '120 Days',
  }, {
    value: 150,
    label: '150 Days',
  }, {
    value: 180,
    label: '180 Days',
  }]
  Object.freeze(marks)

  const onSliderChange = (e, value) => {
    setTimeSpanDays(value)
  }

  return <Slider
    marks={marks}
    value={timeSpanDays}
    step={30}
    min={30}
    max={180}
    onChangeCommitted={onSliderChange}
  />
}
TimeSpanSlider.displayName = 'TimeSpanSlider'
TimeSpanSlider.propTypes = {
  timeSpanDays: PropTypes.number.isRequired,
  setTimeSpanDays: PropTypes.func.isRequired,
}


const SelectComponentAccordion = ({
  allComponentNames,
  selectedComponentNames,
  setSelectedComponentNames,
}) => {
  const onSelectAll = (e) => {
    setSelectedComponentNames(e.target.checked ? allComponentNames : [])
  }
  const onSelectSingle = (e, componentName) => {
    setSelectedComponentNames(e.target.checked
      ? [...selectedComponentNames, componentName]
      : [...selectedComponentNames.filter((name) => name !== componentName)]
    )
  }

  return <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
      <Typography variant='inherit'>Select Components</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Grid container>
        <Grid item xs={12} display='flex' alignItems='center'>
          <Checkbox
            checked={allComponentNames.length <= selectedComponentNames.length}
            onChange={onSelectAll}
          />
          <Typography variant='inherit'>Select All</Typography>
        </Grid>
        {
          allComponentNames.sort((a, b) => {
            return shortenComponentName(a).localeCompare(shortenComponentName(b))
          }).map((componentName) => <Grid item key={componentName} xs={12} lg={6} xl={4} display='flex' alignItems='center'>
            <Checkbox
              checked={selectedComponentNames.includes(componentName)}
              onChange={(e) => onSelectSingle(e, componentName)}
            />
            <Typography variant='inherit'>
              {
                shortenComponentName(componentName)
              }
            </Typography>
          </Grid>)
        }
      </Grid>
    </AccordionDetails>
  </Accordion>
}
SelectComponentAccordion.displayName = 'SelectComponentAccordion'
SelectComponentAccordion.propTypes = {
  allComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedComponentNames: PropTypes.func.isRequired,
}


const DoraDependenciesViewChangeLeadTime = ({
  doraMetrics,
  timeSpanDays,
  selectedComponentNames,
}) => {
  const changeLeadTimesMedian = median(selectedComponentNames.reduce((changeLeadTimes, componentName) => {
    if (!doraMetrics.dependencies[componentName]) return changeLeadTimes

    const changeLeadTime = doraMetrics.dependencies[componentName].change_lead_time_median
    return [...changeLeadTimes, changeLeadTime]
  }, []))

  return <Grid item xs={12} xl={6} display='flex' alignItems='center' flexDirection='column'>
    <Typography variant='h4'>Change Lead Time</Typography>
    <Typography variant='overline' fontSize='1rem' marginY='1rem'>
      {
        `Median Change Lead Time: ${changeLeadTimesMedian} Days`
      }
    </Typography>
    <Typography variant='h6'>Median Change Lead Time per Component</Typography>
    <MedianChangeLeadTimePerDependencyChart
      doraMetrics={doraMetrics}
      selectedComponentNames={selectedComponentNames}
    />
    <Typography variant='h6' marginTop='4rem'>Median Change Lead Time per Month</Typography>
    <MedianChangeLeadTimeDependenciesPerMonth
      doraMetrics={doraMetrics}
      timeSpanDays={timeSpanDays}
      selectedComponentNames={selectedComponentNames}
    />
  </Grid>
}
DoraDependenciesViewChangeLeadTime.displayName = 'DoraDependenciesViewChangeLeadTime'
DoraDependenciesViewChangeLeadTime.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


const DoraDependenciesViewDeploymentFrequency = ({
  doraMetrics,
  timeSpanDays,
  selectedComponentNames,
}) => {
  const medianDeploymentFrequency = median(selectedComponentNames.reduce((deploymentFrequencies, componentName) => {
    const deployments = doraMetrics.dependencies[componentName]?.deployments ?? []

    if (deployments.length === 0) return deploymentFrequencies

    const deploymentFrequency = timeSpanDays / deployments.length
    return [
      ...deploymentFrequencies,
      deploymentFrequency,
    ]
  }, []))

  return <Grid item xs={12} xl={6} display='flex' alignItems='center' flexDirection='column'>
    <Typography variant='h4'>Deployment Frequency</Typography>
    <Typography variant='overline' fontSize='1rem' marginY='1rem'>
      {
        `Median Deployment Frequency: every ${medianDeploymentFrequency} Days`
      }
    </Typography>
    <Typography variant='h6'>Deployment Frequency per Component</Typography>
    <DeploymentFrequencyPerDependencyChart
      doraMetrics={doraMetrics}
      timeSpanDays={timeSpanDays}
      selectedComponentNames={selectedComponentNames}
    />
    <Typography variant='h6' marginTop='4rem'>Total Deployments per Component</Typography>
    <TotalDeploymentsPerDependencyChart
      doraMetrics={doraMetrics}
      selectedComponentNames={selectedComponentNames}
    />
    <Typography variant='h6' marginTop='4rem'>Median Deployment Frequency per Month</Typography>
    <MedianDeploymentFrequencyPerMonth
      doraMetrics={doraMetrics}
      timeSpanDays={timeSpanDays}
      selectedComponentNames={selectedComponentNames}
    />
  </Grid>
}
DoraDependenciesViewDeploymentFrequency.displayName = 'DoraDependenciesViewDeploymentFrequency'
DoraDependenciesViewDeploymentFrequency.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


const DoraDependenciesView = ({
  doraMetrics,
  timeSpanDays,
}) => {
  const [selectedComponentNames, setSelectedComponentNames] = React.useState(Object.keys(doraMetrics.dependencies))

  return <div style={{ marginTop: '2rem'}}>
    <SelectComponentAccordion
      allComponentNames={Object.keys(doraMetrics.dependencies)}
      selectedComponentNames={selectedComponentNames}
      setSelectedComponentNames={setSelectedComponentNames}
    />
    <Grid container marginTop='3rem'>
      <DoraDependenciesViewChangeLeadTime
        doraMetrics={doraMetrics}
        timeSpanDays={timeSpanDays}
        selectedComponentNames={selectedComponentNames}
      />
      <DoraDependenciesViewDeploymentFrequency
        doraMetrics={doraMetrics}
        timeSpanDays={timeSpanDays}
        selectedComponentNames={selectedComponentNames}
      />
    </Grid>
  </div>
}
DoraDependenciesView.displayName = 'DoraDependenciesView'
DoraDependenciesView.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
}


const DoraComponentViewChangeLeadTime = ({
  timeSpanDays,
  targetComponentName,
  changeLeadTimeMedian,
  allChanges,
  monthlyChanges,
  deployments,
}) => {
  return <Grid item xs={12} xl={6} display='flex' alignItems='center' flexDirection='column'>
    <Typography variant='h4'>Change Lead Time</Typography>
    {
      allChanges.length > 0 ? <>
        <Typography variant='overline' fontSize='1rem' marginY='1rem'>
          {
            `Median Change Lead Time: ${changeLeadTimeMedian} Days`
          }
        </Typography>
        <Typography variant='h6'>Median Change Lead Time per Month</Typography>
        <MedianChangeLeadTimePerMonth
          monthlyChanges={monthlyChanges}
        />
        <Typography variant='h6' marginTop='4rem'>Change Lead Time per Commit</Typography>
        <CommitsDeploymentsChart
          allChanges={allChanges}
          deployments={deployments}
          timeSpanDays={timeSpanDays}
          targetComponentName={targetComponentName}
        />
      </> : <Typography variant='overline' fontSize='1rem' marginTop='1rem'>
        {
          `No change within the last ${timeSpanDays} days`
        }
      </Typography>
    }
  </Grid>
}
DoraComponentViewChangeLeadTime.displayName = 'DoraComponentViewChangeLeadTime'
DoraComponentViewChangeLeadTime.propTypes = {
  timeSpanDays: PropTypes.number.isRequired,
  targetComponentName: PropTypes.string.isRequired,
  changeLeadTimeMedian: PropTypes.number.isRequired,
  allChanges: PropTypes.arrayOf(PropTypes.object).isRequired,
  monthlyChanges: PropTypes.arrayOf(PropTypes.object).isRequired,
  deployments: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const DoraComponentViewDeploymentFrequency = ({
  timeSpanDays,
  deploymentFrequency,
  deployments,
}) => {
  return <Grid item xs={12} xl={6} display='flex' alignItems='center' flexDirection='column'>
    <Typography variant='h4'>Deployment Frequency</Typography>
    {
      deployments.length > 0 ? <>
        <Typography variant='overline' fontSize='1rem' marginY='1rem'>
          {
            `A new Deployment every ${deploymentFrequency} Days`
          }
        </Typography>
        <Typography variant='h6'>Deployment Frequency per Month</Typography>
        <DeploymentFrequencyPerMonth
          timeSpanDays={timeSpanDays}
          deployments={deployments}
        />
      </> : <Typography variant='overline' fontSize='1rem' marginY='1rem'>
        {
          `No new deployment within the last ${timeSpanDays} Days`
        }
      </Typography>
    }
  </Grid>
}
DoraComponentViewDeploymentFrequency.displayName = 'DoraComponentViewDeploymentFrequency'
DoraComponentViewDeploymentFrequency.propTypes = {
  timeSpanDays: PropTypes.number.isRequired,
  deploymentFrequency: PropTypes.number.isRequired,
  deployments: PropTypes.arrayOf(PropTypes.object).isRequired,
}


const DoraComponentView = ({
  doraMetrics,
  timeSpanDays,
  componentName,
  targetComponentName,
}) => {
  const changeLeadTimeMedian = doraMetrics.dependencies[componentName]?.change_lead_time_median ?? -1
  const deploymentFrequency = doraMetrics.dependencies[componentName]?.deployment_frequency ?? -1
  const allChanges = doraMetrics.dependencies[componentName]?.all_changes ?? []
  const monthlyChanges = doraMetrics.dependencies[componentName]?.changes_monthly ?? []
  const deployments = doraMetrics.dependencies[componentName]?.deployments ?? []

  return <Grid container marginTop='2rem'>
    <DoraComponentViewChangeLeadTime
      timeSpanDays={timeSpanDays}
      targetComponentName={targetComponentName}
      changeLeadTimeMedian={changeLeadTimeMedian}
      allChanges={allChanges}
      monthlyChanges={monthlyChanges}
      deployments={deployments}
    />
    <DoraComponentViewDeploymentFrequency
      timeSpanDays={timeSpanDays}
      deploymentFrequency={deploymentFrequency}
      deployments={deployments}
    />
  </Grid>
}
DoraComponentView.displayName = 'DoraComponentView'
DoraComponentView.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  componentName: PropTypes.string.isRequired,
  targetComponentName: PropTypes.string.isRequired,
}


const DoraTab = ({
  componentName,
  targetComponentName,
  filterComponentNames,
  isSpecialComponent,
}) => {
  const context = React.useContext(ConfigContext)
  const [timeSpanDays, setTimeSpanDays] = React.useState(90)

  const [doraMetrics, isLoading, isError] = useFetchDoraMetrics({
    targetComponentName,
    filterComponentNames,
    timeSpanDays,
  })

  if (isError) {
    return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
      Dora metrics could not be fetched
    </Alert>
  }

  if (isLoading || !doraMetrics) {
    return <Stack spacing={5} alignItems='center'>
      <TimeSpanSlider
        timeSpanDays={timeSpanDays}
        setTimeSpanDays={setTimeSpanDays}
      />
      <CenteredSpinner/>
      <Alert severity='info' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
        Fetching dora metrics may take a while...
      </Alert>
    </Stack>
  }

  if (isSpecialComponent) {
    return <>
      <TimeSpanSlider
        timeSpanDays={timeSpanDays}
        setTimeSpanDays={setTimeSpanDays}
      />
      <DoraDependenciesView
        doraMetrics={doraMetrics}
        timeSpanDays={timeSpanDays}
      />
    </>
  }

  return <>
    <TimeSpanSlider
      timeSpanDays={timeSpanDays}
      setTimeSpanDays={setTimeSpanDays}
    />
    <DoraComponentView
      doraMetrics={doraMetrics}
      timeSpanDays={timeSpanDays}
      componentName={componentName}
      targetComponentName={targetComponentName}
    />
  </>
}
DoraTab.displayName = 'DoraTab'
DoraTab.propTypes = {
  componentName: PropTypes.string.isRequired,
  targetComponentName: PropTypes.string.isRequired,
  filterComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  isSpecialComponent: PropTypes.bool.isRequired,
}


export const DoraTabWrapper = ({ componentName }) => {
  const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ? JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) : {}
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const isSpecialComponent = Boolean(featuresCfg.specialComponents?.some(
    (specialComponent) => specialComponent.name == componentName,
  ))

  if (isSpecialComponent || path?.length > 0) {
    return <DoraTab
      componentName={componentName}
      targetComponentName={isSpecialComponent ? componentName : path[0].name}
      filterComponentNames={isSpecialComponent ? [] : [componentName]}
      isSpecialComponent={isSpecialComponent}
    />
  }

  return <DoraTab
    componentName={componentName}
    targetComponentName={componentName}
    filterComponentNames={[componentName]}
    isSpecialComponent={isSpecialComponent}
  />
}
DoraTabWrapper.displayName = 'DoraTabWrapper'
DoraTabWrapper.propTypes = {
  componentName: PropTypes.string.isRequired,
}
