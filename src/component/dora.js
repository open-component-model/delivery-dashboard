import React from 'react'

import { Typography, Accordion, AccordionDetails, AccordionSummary, Alert, Checkbox, Grid, Slider, Stack } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { BarChart, ScatterChart } from '@mui/x-charts'

import PropTypes from 'prop-types'

import CenteredSpinner from '../util/centeredSpinner'
import { ConfigContext } from '../App'
import { FEATURES_CFG_KEY, PATH_KEY } from '../consts'
import { getMonthlyDates, median, shortenComponentName } from '../util'
import { useFetchDoraMetrics } from '../fetch'


const ChartSizeWrapper = ({
  children,
  height='20rem',
  width='100%',
}) => {
  return <div style={{ height, width }}>
    {
      children
    }
  </div>
}
ChartSizeWrapper.displayName = 'ChartSizeWrapper'
ChartSizeWrapper.propTypes = {
  children: PropTypes.element.isRequired,
  height: PropTypes.string,
  width: PropTypes.string,
}


export const MonthlyTable = ({
  chartData,
  yAxisDescription,
  seriesValueFormatter,
}) => {
  return <ChartSizeWrapper>
    <BarChart
      series={[{
        data: chartData.map((entry) => entry.value),
        valueFormatter: seriesValueFormatter,
        color: '#009f76',
      }]}
      xAxis={[{
        data: chartData.map((entry) => {
          const date = new Date(entry.month)
          return date.getMonth() === 0 ? date.getFullYear() : date.toLocaleString('en-US', { month: 'long' })
        }),
        scaleType: 'band',
        label: 'Month',
      }]}
      yAxis={[{
        label: yAxisDescription,
        min: 0,
      }]}
    />
  </ChartSizeWrapper>
}
MonthlyTable.displayName = 'MonthlyTable'
MonthlyTable.propTypes = {
  chartData: PropTypes.arrayOf(PropTypes.object).isRequired,
  yAxisDescription: PropTypes.string.isRequired,
  seriesValueFormatter: PropTypes.func.isRequired,
}


export const MedianChangeLeadTimePerDependencyChart = ({
  doraMetrics,
  selectedComponentNames,
}) => {
  const changeLeadTimes = selectedComponentNames.length > 0 ? selectedComponentNames.reduce((changeLeadTimes, componentName) => {
    const changeLeadTime = doraMetrics.dependencies[componentName]?.change_lead_time_median ?? -1

    return [
      ...changeLeadTimes,
      {
        name: shortenComponentName(componentName),
        median: changeLeadTime,
      },
    ]
  }, []).sort((a, b) => a.name.localeCompare(b.name)) : [{
    name: '',
    median: -1,
  }]

  return <ChartSizeWrapper>
    <BarChart
      series={[{
        data: changeLeadTimes.map((entry) => entry.median),
        valueFormatter: (v) => v === -1 ? 'No change' : `${v.toFixed(1)} days`,
        color: '#009f76',
      }]}
      xAxis={[{
        data: changeLeadTimes.map((entry) => entry.name),
        scaleType: 'band',
        label: 'Component',
      }]}
      yAxis={[{
        label: 'Change lead time in days',
        min: 0,
      }]}
    />
  </ChartSizeWrapper>
}
MedianChangeLeadTimePerDependencyChart.displayName = 'MedianChangeLeadTimePerDependencyChart'
MedianChangeLeadTimePerDependencyChart.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


export const MedianChangeLeadTimeDependenciesPerMonth = ({
  doraMetrics,
  timeSpanDays,
  selectedComponentNames,
}) => {
  const medianChangeLeadTimePerMonth = getMonthlyDates(timeSpanDays).map((month) => {
    const changeLeadTimesForMonth = selectedComponentNames.reduce((changeLeadTimes, componentName) => {
      const monthlyChanges = doraMetrics.dependencies[componentName]?.changes_monthly ?? []

      const changesForMonth = monthlyChanges.find((changes) => {
        return new Date(changes.year, changes.month - 1).getTime() === month.getTime()
      })

      if (!changesForMonth) return changeLeadTimes

      return [...changeLeadTimes, changesForMonth.median_change_lead_time]
    }, [])

    if (changeLeadTimesForMonth.length === 0) return {
      month: month,
      value: -1,
    }

    return {
      month: month,
      value: median(changeLeadTimesForMonth),
    }
  })

  return <MonthlyTable
    chartData={medianChangeLeadTimePerMonth}
    yAxisDescription='Change lead time in days'
    seriesValueFormatter={(v) => v === -1 ? 'No change' : `${v.toFixed(1)} days`}
  />
}
MedianChangeLeadTimeDependenciesPerMonth.displayName = 'MedianChangeLeadTimeDependenciesPerMonth'
MedianChangeLeadTimeDependenciesPerMonth.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


export const DeploymentFrequencyPerDependencyChart = ({
  doraMetrics,
  timeSpanDays,
  selectedComponentNames,
}) => {
  const deploymentFrequencyPerDependency = selectedComponentNames.length > 0 ? selectedComponentNames.reduce((deploymentFrequencyPerDependency, componentName) => {
    const deployments = doraMetrics.dependencies[componentName]?.deployments ?? []

    return [
      ...deploymentFrequencyPerDependency,
      {
        name: shortenComponentName(componentName),
        value: deployments.length > 0 ? timeSpanDays / deployments.length : -1,
      },
    ]
  }, []).sort((a, b) => a.name.localeCompare(b.name)) : [{
    name: '',
    value: -1,
  }]

  return <ChartSizeWrapper>
    <BarChart
      series={[{
        data: deploymentFrequencyPerDependency.map((entry) => entry.value),
        valueFormatter: (v) => v === -1 ? 'No deployment' : `every ${v.toFixed(1)} days`,
        color:'#009f76',
      }]}
      xAxis={[{
        data: deploymentFrequencyPerDependency.map((entry) => entry.name),
        scaleType: 'band',
        label: 'Component',
      }]}
      yAxis={[{
        label: 'Deployment frequency in days',
        min: 0,
      }]}
    />
  </ChartSizeWrapper>
}
DeploymentFrequencyPerDependencyChart.displayName = 'DeploymentFrequencyPerDependencyChart'
DeploymentFrequencyPerDependencyChart.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


export const TotalDeploymentsPerDependencyChart = ({
  doraMetrics,
  selectedComponentNames,
}) => {
  const deploymentsPerDependency = selectedComponentNames.length > 0 ? selectedComponentNames.reduce((deploymentsPerDependency, componentName) => {
    const deployments = doraMetrics.dependencies[componentName]?.deployments ?? []

    return [
      ...deploymentsPerDependency,
      {
        name: shortenComponentName(componentName),
        value: deployments.length,
      },
    ]
  }, []).sort((a, b) => a.name.localeCompare(b.name)) : [{
    name: '',
    value: -1,
  }]

  return <ChartSizeWrapper>
    <BarChart
      series={[{
        data: deploymentsPerDependency.map((entry) => entry.value),
        valueFormatter: (v) => v === -1 ? 'No deployment' : `${v} deployments`,
        color:'#009f76',
      }]}
      xAxis={[{
        data: deploymentsPerDependency.map((entry) => entry.name),
        scaleType: 'band',
        label: 'Component',
      }]}
      yAxis={[{
        label: 'Number of deployments',
        min: 0,
      }]}
    />
  </ChartSizeWrapper>
}
TotalDeploymentsPerDependencyChart.displayName = 'TotalDeploymentsPerDependencyChart'
TotalDeploymentsPerDependencyChart.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


export const MedianDeploymentFrequencyPerMonth = ({
  doraMetrics,
  timeSpanDays,
  selectedComponentNames,
}) => {
  const dayInMillis = 1000 * 60 * 60 * 24
  const today = new Date()
  const startDate = new Date(today - timeSpanDays * dayInMillis)

  const medianDeploymentFrequencyPerMonth = getMonthlyDates(timeSpanDays).map((month) => {
    const daysSinceBeginOfMonth = (today - month) / dayInMillis

    const deploymentFrequenciesForMonth = selectedComponentNames.reduce((deploymentFrequencies, componentName) => {
      const deployments = doraMetrics.dependencies[componentName]?.deployments ?? []

      const deploymentsForMonth = deployments.filter((deployment) => {
        const deploymentDate = new Date(deployment.deployment_date)
        const deploymentMonth = new Date(deploymentDate.getFullYear(), deploymentDate.getMonth())

        return deploymentMonth.getTime() === month.getTime()
      })

      if (deploymentsForMonth.length === 0) return deploymentFrequencies

      if (startDate >= month) { // first month
        return [
          ...deploymentFrequencies,
          (30 - (startDate - month) / dayInMillis) / deploymentsForMonth.length,
        ]
      } else if (daysSinceBeginOfMonth > 30) { // month in between
        return [
          ...deploymentFrequencies,
          30 / deploymentsForMonth.length,
        ]
      } else { // last month
        return [
          ...deploymentFrequencies,
          daysSinceBeginOfMonth / deploymentsForMonth.length,
        ]
      }
    }, [])

    if (deploymentFrequenciesForMonth.length === 0) return {
      month: month,
      value: -1,
    }

    return {
      month: month,
      value: median(deploymentFrequenciesForMonth),
    }
  })

  return <MonthlyTable
    chartData={medianDeploymentFrequencyPerMonth}
    yAxisDescription='Deployment frequency'
    seriesValueFormatter={(v) => v === -1 ? 'No deployment' : `every ${v.toFixed(1)} days`}
  />
}
MedianDeploymentFrequencyPerMonth.displayName = 'MedianDeploymentFrequencyPerMonth'
MedianDeploymentFrequencyPerMonth.propTypes = {
  doraMetrics: PropTypes.object.isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  selectedComponentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
}


export const MedianChangeLeadTimePerMonth = ({
  monthlyChanges,
}) => {
  const changeLeadTimesPerMonth = monthlyChanges.map((monthlyChange) => {
    return {
      month: new Date(monthlyChange.year, monthlyChange.month - 1),
      value: monthlyChange.median_change_lead_time,
    }
  }).sort((a, b) => a.month - b.month)

  return <MonthlyTable
    chartData={changeLeadTimesPerMonth}
    yAxisDescription='Change lead time in days'
    seriesValueFormatter={(v) => v === -1 ? 'No change' : `${v.toFixed(1)} days`}
  />
}
MedianChangeLeadTimePerMonth.displayName = 'MedianChangeLeadTimePerMonth'
MedianChangeLeadTimePerMonth.propTypes = {
  monthlyChanges: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export const CommitsDeploymentsChart = ({
  allChanges,
  deployments,
  timeSpanDays,
  targetComponentName,
}) => {
  const dayInMillis = 1000 * 60 * 60 * 24
  const today = new Date()
  const startDate = new Date(today - timeSpanDays * dayInMillis)

  const deploymentScatterPoints = deployments.map((deployment, idx) => {
    return {
      id: -idx,
      x: new Date(deployment.deployment_date).getTime(),
      y: 0, // deployment is just displayed as dot on the x-axis
      componentVersion: deployment.component_version,
      targetComponentVersion: deployment.target_deployment_version,
    }
  })

  const commitScatterPoints = allChanges.map((commit, idx) => {
    const changeLeadTimeMillis = new Date(commit.deployment_date) - new Date(commit.commit_date)
    return {
      id: idx,
      x: new Date(commit.commit_date).getTime(),
      y: changeLeadTimeMillis / dayInMillis, // change lead time in days
    }
  })

  return <ChartSizeWrapper>
    <ScatterChart
      xAxis={[{
        min: startDate,
        max: today,
        valueFormatter: (month) => new Date(month).toLocaleDateString(),
      }]}
      yAxis={[{
        min: 0,
        max: commitScatterPoints.length === 0 ? 10 : null,
        label: 'Change lead time in days',
      }]}
      series={[{
        label: 'Changes (commits)',
        data: commitScatterPoints,
        valueFormatter: ({ x, y }) => `${new Date(x).toLocaleDateString()} | ${y.toFixed(2)} days to deployment`,
        color: '#009f76',
      }, {
        label: 'Deployments',
        data: deploymentScatterPoints,
        valueFormatter: ({ x, componentVersion, targetComponentVersion }) => <>
          <Typography>
            {
              new Date(x).toLocaleDateString()
            }
          </Typography>
          <Typography>Deployment of version {componentVersion}</Typography>
          <Typography>in {shortenComponentName(targetComponentName)}:{targetComponentVersion}</Typography>
        </>,
        markerSize: 7,
        color: '#316de6',
      }]}
    />
  </ChartSizeWrapper>
}
CommitsDeploymentsChart.displayName = 'CommitsDeploymentsChart'
CommitsDeploymentsChart.propTypes = {
  allChanges: PropTypes.arrayOf(PropTypes.object).isRequired,
  deployments: PropTypes.arrayOf(PropTypes.object).isRequired,
  timeSpanDays: PropTypes.number.isRequired,
  targetComponentName: PropTypes.string.isRequired,
}


export const DeploymentFrequencyPerMonth = ({
  timeSpanDays,
  deployments,
}) => {
  const dayInMillis = 1000 * 60 * 60 * 24
  const today = new Date()
  const startDate = new Date(today - timeSpanDays * dayInMillis)

  const deploymentFrequencyPerMonth = getMonthlyDates(timeSpanDays).map((month) => {
    const deploymentsForMonth = deployments.filter((deployment) => {
      const deploymentDate = new Date(deployment.deployment_date)
      const deploymentMonth = new Date(deploymentDate.getFullYear(), deploymentDate.getMonth())

      return deploymentMonth.getTime() === month.getTime()
    })

    if (deploymentsForMonth.length === 0) return {
      month: month,
      value: -1,
    }

    const daysSinceBeginOfMonth = (today - month) / dayInMillis

    if (startDate >= month) { // first month
      return {
        month: month,
        value: (30 - (startDate - month) / dayInMillis) / deploymentsForMonth.length,
      }
    } else if (daysSinceBeginOfMonth > 30) { // month in between
      return {
        month: month,
        value: 30 / deploymentsForMonth.length,
      }
    } else { // last month
      return {
        month: month,
        value: daysSinceBeginOfMonth / deploymentsForMonth.length,
      }
    }
  })

  return <MonthlyTable
    chartData={deploymentFrequencyPerMonth}
    yAxisDescription='Deployment frequency in days'
    seriesValueFormatter={(v) => v === -1 ? 'No deployment' : `every ${v.toFixed(1)} days`}
  />
}
DeploymentFrequencyPerMonth.displayName = 'DeploymentFrequencyPerMonth'
DeploymentFrequencyPerMonth.propTypes = {
  timeSpanDays: PropTypes.number.isRequired,
  deployments: PropTypes.arrayOf(PropTypes.object).isRequired,
}



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

  const [doraMetrics, state] = useFetchDoraMetrics({
    targetComponentName,
    filterComponentNames,
    timeSpanDays,
  })

  if (state.error) {
    return <Alert severity='error' variant={context.prefersDarkMode ? 'outlined' : 'standard'}>
      Dora metrics could not be fetched
    </Alert>
  }

  if (state.isLoading) {
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


export const DoraTabWrapper = ({
  componentName,
  specialComponentId,
}) => {
  const featuresCfg = JSON.parse(localStorage.getItem(FEATURES_CFG_KEY)) ?? {}
  const pathItem = localStorage.getItem(PATH_KEY)
  const path = pathItem ? JSON.parse(pathItem) : null
  const isSpecialComponent = Boolean(featuresCfg.specialComponents?.some(
    (specialComponent) => specialComponent.id.toString() == specialComponentId,
  ))

  const filterComponentNames = React.useCallback(() => {
    if (isSpecialComponent) return []
    return [componentName]
  }, [isSpecialComponent, componentName])

  if (isSpecialComponent || path?.length > 0) {
    return <DoraTab
      componentName={componentName}
      targetComponentName={isSpecialComponent ? componentName : path[0].name}
      filterComponentNames={filterComponentNames()}
      isSpecialComponent={isSpecialComponent}
    />
  }

  return <DoraTab
    componentName={componentName}
    targetComponentName={componentName}
    filterComponentNames={filterComponentNames()}
    isSpecialComponent={isSpecialComponent}
  />
}
DoraTabWrapper.displayName = 'DoraTabWrapper'
DoraTabWrapper.propTypes = {
  componentName: PropTypes.string.isRequired,
  specialComponentId: PropTypes.string,
}
