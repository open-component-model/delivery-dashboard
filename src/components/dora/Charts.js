import React from 'react'
import PropTypes from 'prop-types'

import { Typography } from '@mui/material'
import {
  BarChart,
  ScatterChart,
} from '@mui/x-charts'

import { getMonthlyDates, median, shortenComponentName } from './../../util'


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
