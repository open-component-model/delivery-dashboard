import React from 'react'
import PropTypes from 'prop-types'

import {
  Alert,
  AppBar,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Box,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Typography,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Stack,
  Skeleton,
  Select,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ArrowForward, ExpandMore } from '@mui/icons-material'
import ClearIcon from '@mui/icons-material/Clear'
import DeleteIcon from '@mui/icons-material/Delete'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useTheme } from '@emotion/react'

import { SearchParamContext } from './../../App'
import { ComponentVector } from './ComponentVector'
import { shortenComponentName } from '../../util'
import { TabPanel } from './../Tabs'
import { ResourceVector } from './ResourceVector'
import { LabelVector } from './LabelVector'
import {
  useFetchBom,
  useFetchCompDiff,
  useFetchUpgradePRs,
} from '../../api/useFetch'
import CopyOnClickChip from '../util/CopyOnClickChip'
import { components } from '../../api'
import {
  pullRequestsStates,
  errorSnackbarProps,
  VERSION_FILTER,
} from '../../consts'
import { enqueueSnackbar } from 'notistack'


const LoadingDiff = () => {
  return <Accordion>
    <AccordionSummary disabled>
      <Grid
        container
        alignItems='center'
        spacing={3}
      >
        <Grid item xs={3}>
          <Skeleton/>
        </Grid>
        <Grid
          item
          xs={1}
        >
          <Skeleton/>
        </Grid>
        <Grid
          item
          xs={1}
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <ArrowForward/>
        </Grid>
        <Grid item xs={3}>
          <Skeleton/>
        </Grid>
        <Grid
          item
          xs={1}
        >
          <Skeleton/>
        </Grid>
      </Grid>
    </AccordionSummary>
  </Accordion>
}


export const ComponentDiffTabLoading = ({
  loadingPullRequestsCount,
}) => {
  const theme = useTheme()

  return <Stack
    direction='column'
    spacing={5}
  >
    <Typography>Compare Component Versions</Typography>
    <Box>
      <Grid
        container
        spacing={3}
        columns={24}
      >
        <Grid item xs={9}>
          <TextField
            variant='standard'
            label='Name'
            disabled
            fullWidth
          />
        </Grid>
        <Grid item xs={2}>
          <TextField
            variant='standard'
            label='Version'
            disabled
            fullWidth
          />
        </Grid>
        <Grid item xs={1}>
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
            height='100%'
          >
            <TrendingFlatIcon/>
          </Box>
        </Grid>
        <Grid item xs={9}>
          <TextField
            variant='standard'
            label='Name'
            disabled
            fullWidth
          />
        </Grid>
        <Grid item xs={2}>
          <TextField
            variant='standard'
            label='Version'
            disabled
            fullWidth
          />
        </Grid>
        <Grid item xs={1}>
          <IconButton
            disabled
            sx={{
              marginTop: theme.spacing(1) // align with selection textfield
            }}
          >
            <AddIcon color=''/>
          </IconButton>
        </Grid>
      </Grid>
    </Box>
    <div/>
    <Divider orientation='horizontal'/>
    <Box
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
    >
      <Typography
        width='14em'
        sx={{marginTop: 2}}
      >
        Upgrade Pull Requests
      </Typography>
      <TextField
        variant='standard'
        label='Recently closed Pull-Requests'
        disabled
        fullWidth
      />
    </Box>
    <Stack
      direction='column'
      spacing={2}
    >
      {
        [...Array(loadingPullRequestsCount).keys()].map(i => <LoadingDiff key={i}/>)
      }
    </Stack>
  </Stack>
}
ComponentDiffTabLoading.diplayName = 'ComponentDiffTabLoading'
ComponentDiffTabLoading.propTypes = {
  loadingPullRequestsCount: PropTypes.number.isRequired,
}


const ComponentVersionDiff = ({
  leftName,
  rightName,
  leftVersion,
  rightVersion,
  pullRequest,
  deleteDiff,
}) => {
  const [diff, isDiffLoading, isDiffError] = useFetchCompDiff({
    leftName: leftName,
    rightName: rightName,
    leftVersion: leftVersion,
    rightVersion: rightVersion,
  })

  const summaryContent = <Grid
    container
    alignItems='center'
    spacing={3}
  >
    <Grid item xs={3}>
      <Typography>{shortenComponentName(leftName)}</Typography>
    </Grid>
    <Grid
      item
      xs={1}
    >
      <CopyOnClickChip
        value={leftVersion}
        chipProps={{
          variant: 'outlined'
        }}
      />
    </Grid>
    <Grid
      item
      xs={1}
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      <ArrowForward/>
    </Grid>
    <Grid item xs={3}>
      <Typography>{shortenComponentName(rightName)}</Typography>
    </Grid>
    <Grid
      item
      xs={1}
    >
      <CopyOnClickChip
        value={rightVersion}
        chipProps={{
          variant: 'outlined'
        }}
      />
    </Grid>
    <Grid
      item
      xs={2}
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      {
        pullRequest && <Button
          variant='contained'
          component='a'
          href={pullRequest.html_url}
          target='_blank'
        >
          Jump to PR #{pullRequest.number}
        </Button>
      }
    </Grid>
    <Grid
      item
      xs={1}
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      {
        deleteDiff && <Tooltip
          title={'Delete Diff'}
        >
          <IconButton
            onClick={() => deleteDiff({
              leftName: leftName,
              rightName: rightName,
              leftVersion: leftVersion,
              rightVersion: rightVersion,
            })}
          >
            <DeleteIcon/>
          </IconButton>
        </Tooltip>
      }
    </Grid>
  </Grid>

  if (isDiffLoading || isDiffLoading) return <LoadingDiff/>
  if (isDiffError) return <Accordion expanded={false}>
    <AccordionSummary
      expandIcon={
        <Tooltip
          title='Failed to fetch Diff'
        >
          <WarningAmberIcon color='error'/>
        </Tooltip>
      }
    >
      {summaryContent}
    </AccordionSummary>
  </Accordion>

  return <Accordion>
    <AccordionSummary expandIcon={<ExpandMore />}>
      {summaryContent}
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={3}>
        <Divider/>
        {
          diff && <ComponentVector diff={diff}/>
        }
      </Stack>
    </AccordionDetails>
  </Accordion>
}
ComponentVersionDiff.displayName = 'ComponentVersionDiff'
ComponentVersionDiff.propTypes = {
  leftName: PropTypes.string.isRequired,
  rightName: PropTypes.string.isRequired,
  leftVersion: PropTypes.string.isRequired,
  rightVersion: PropTypes.string.isRequired,
  pullRequest: PropTypes.object,
  deleteDiff: PropTypes.func,
}


const diffIdentity = (
  leftName,
  rightName,
  leftVersion,
  rightVersion,
) => {
  return `${leftName}_${rightName}_${leftVersion}_${rightVersion}`
}


const ComponentVersionSelect = ({
  componentName,
  componentVersion,
  ocmRepo,
  versions,
  setVersions,
  setComponentVersion,
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  // eslint-disable-next-line no-unused-vars
  const [isError, setIsError] = React.useState()

  const fetchVersions = () => {
    setIsLoading(true)

    const fetchLastVersions = async () => {
      try {
        const lastVersions = await components.lastVersions({
          componentName: componentName,
          ocmRepoUrl: ocmRepo,
          max: 15,
          versionFilter: VERSION_FILTER.ALL,
        })
        setVersions(lastVersions)
        setIsLoading(false)
      } catch (e) {
        setIsError(true)
      }
    }
    fetchLastVersions()
  }

  return <Autocomplete
    freeSolo
    options={versions.sort().reverse()}
    loading={isLoading}
    // eslint-disable-next-line no-unused-vars
    onInputChange={(event, value, reason) => {
      setComponentVersion(value)
    }}
    value={componentVersion}
    renderInput={(params) => {
      return <TextField
        {...params}
        label='Version'
        value={componentVersion}
        variant='standard'
        fullWidth
        InputProps={{
          ...params.InputProps,
          onClick: () => {
            if (!componentName || versions.length) return
            fetchVersions()
          },
        }}
      />
    }}
  />
}
ComponentVersionSelect.displayName = 'ComponentVersionSelect'
ComponentVersionSelect.propTypes = {
  componentName: PropTypes.string.isRequired,
  componentVersion: PropTypes.string.isRequired,
  ocmRepo: PropTypes.string,
  versions: PropTypes.arrayOf(PropTypes.string).isRequired,
  setVersions: PropTypes.func.isRequired,
  setComponentVersion: PropTypes.func.isRequired,
}


const ComponentNameSelect = ({
  name,
  setName,
  names,
  onSelectCallback,
}) => {
  return <Autocomplete
    freeSolo
    options={names.sort()}
    // eslint-disable-next-line no-unused-vars
    onInputChange={(event, value, reason) => {
      setName(value)
      onSelectCallback()
    }}
    value={name}
    renderInput={(params) => {
      return <TextField
        {...params}
        label='Name'
        value={name}
        variant='standard'
        fullWidth
        InputProps={{
          ...params.InputProps,
        }}
      />
    }}
  />
}
ComponentNameSelect.displayName = 'ComponentNameSelect'
ComponentNameSelect.propTypes = {
  name: PropTypes.string.isRequired,
  setName: PropTypes.func.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectCallback: PropTypes.func.isRequired,
}


const ComponentSelection = ({
  ocmRepo,
  componentNames,
  addComponentDiff,
  inputComponentName,
  inputComponentVersion,
  mountFetchClosedPrs,
}) => {
  const theme = useTheme()

  const [leftName, setLeftName] = React.useState(inputComponentName)
  const [rightName, setRightName] = React.useState(inputComponentName)
  const [leftVersion, setLeftVersion] = React.useState(inputComponentVersion)
  const [rightVersion, setRightVersion] = React.useState(inputComponentVersion)

  const [leftVersionCandidates, setLeftVersionCandidates] = React.useState([])
  const [rightVersionCandidates, setRightVersionCandidates] = React.useState([])

  return <Grid
    container
    spacing={3}
    columns={24}
  >
    <Grid item xs={9}>
      <ComponentNameSelect
        names={componentNames}
        name={leftName}
        setName={setLeftName}
        onSelectCallback={() => {
          setLeftVersion('')
          setLeftVersionCandidates([])
        }}
      />
    </Grid>
    <Grid item xs={2}>
      <ComponentVersionSelect
        componentName={leftName}
        componentVersion={leftVersion}
        ocmRepo={ocmRepo}
        versions={leftVersionCandidates}
        setVersions={setLeftVersionCandidates}
        setComponentVersion={setLeftVersion}
      />
    </Grid>
    <Grid item xs={1}>
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100%'
      >
        <TrendingFlatIcon/>
      </Box>
    </Grid>
    <Grid item xs={9}>
      <ComponentNameSelect
        names={componentNames}
        name={rightName}
        setName={setRightName}
        onSelectCallback={() => {
          setRightVersion('')
          setRightVersionCandidates([])
        }}
      />
    </Grid>
    <Grid item xs={2}>
      <ComponentVersionSelect
        componentName={rightName}
        componentVersion={rightVersion}
        ocmRepo={ocmRepo}
        versions={rightVersionCandidates}
        setVersions={setRightVersionCandidates}
        setComponentVersion={setRightVersion}
      />
    </Grid>
    <Grid
      item
      xs={1}
      display='flex'
      justifyContent='center'
    >
      <Tooltip
        title={'Add Component Diff'}
      >
        <span>
          <IconButton
            onClick={() => {
              addComponentDiff({
                leftName: leftName,
                rightName: rightName,
                leftVersion: leftVersion,
                rightVersion: rightVersion,
              })
              mountFetchClosedPrs() // fetch closed PRs to link custom diff to PR
            }}
            disabled={
              !leftName
              || !rightName
              || !leftVersion
              || !rightVersion
              || (leftName === rightName && leftVersion === rightVersion)
            }
            sx={{
              marginTop: theme.spacing(1) // align with selection textfield
            }}
          >
            <AddIcon color=''/>
          </IconButton>
        </span>
      </Tooltip>
    </Grid>
  </Grid>
}
ComponentSelection.displayName = 'ComponentSelection'
ComponentSelection.propTypes = {
  ocmRepo: PropTypes.string,
  componentNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  addComponentDiff: PropTypes.func.isRequired,
  inputComponentName: PropTypes.string.isRequired,
  inputComponentVersion: PropTypes.string.isRequired,
  mountFetchClosedPrs: PropTypes.func.isRequired,
}


const PullRequests = ({
  pullRequests,
  isError,
}) => {
  if (isError) return <Alert severity='error'>Error fetching Pull-Requests.</Alert>

  if (pullRequests && pullRequests.length < 1)
    return <Alert severity='info'>Currently, there are no Upgrade-Pull-Requests.</Alert>

  return <Stack
    direction='column'
    spacing={2}
  >
    {
      pullRequests.map(pr => <ComponentVersionDiff
        key={JSON.stringify(pr)}
        leftName={pr.from.name}
        rightName={pr.to.name}
        leftVersion={pr.from.version}
        rightVersion={pr.to.version}
        pullRequest={pr.pr}
      />)
    }
  </Stack>
}
PullRequests.displayName = 'PullRequests'
PullRequests.propTypes = {
  pullRequests: PropTypes.arrayOf(PropTypes.object).isRequired,
  isError: PropTypes.bool,
}


const ClosedPullRequests = ({
  pullRequests,
  isLoading,
  isError,
  onSelectPr,
  mountFetchClosedPrs,
}) => {
  const [selectedPr, setSelectedPr] = React.useState('')

  if (isError) return <Alert severity='error'>
    Unable to fetch Closed PRs
  </Alert>

  return <FormControl
    fullWidth
    variant='standard'
  >
    <InputLabel>Recently closed Pull-Requests</InputLabel>
    <Select
      value={selectedPr}
      onOpen={() => mountFetchClosedPrs()}
      onChange={(event) => {
        setSelectedPr(event.target.value)
        onSelectPr(pullRequests.find(pr => {
          return diffIdentity(
            pr.from.name,
            pr.to.name,
            pr.from.version,
            pr.to.version
          ) === event.target.value
        }))
      }}
      endAdornment={
        selectedPr != '' && <InputAdornment
          position='end'
          sx={{
            marginRight: 3 // do not overlap with select-fold-icon
          }}
        >
          <Tooltip
            title='clear'
          >
            <IconButton
              onClick={() => {
                setSelectedPr('')
                onSelectPr('')
              }}
              size='small'
            >
              <ClearIcon fontSize='small'/>
            </IconButton>
          </Tooltip>
        </InputAdornment>
      }
    >
      {
        (!pullRequests || isLoading) ? <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
        >
          <Typography>Fetching closed Upgrade Pull-Requests</Typography>
          <div style={{ padding: '1em' }} />
          <CircularProgress color='inherit' size='1.5em'/>
        </Box> : pullRequests.map(pr => {
          const prId = diffIdentity(pr.from.name, pr.to.name, pr.from.version, pr.to.version)
          return <MenuItem
            key={prId}
            value={prId}
          >
            <Grid
              container
              spacing={1}
              alignItems='center'
              columns={24}
            >
              <Grid
                item
                xs={7}
              >
                <Typography>{shortenComponentName(pr.from.name)}</Typography>
              </Grid>
              <Grid
                item
                xs={4}
                justifyContent='center'
                display='flex'
              >
                <CopyOnClickChip
                  value={pr.from.version}
                  chipProps={{
                    variant: 'outlined'
                  }}
                />
              </Grid>
              <Grid
                item
                xs={2}
              >
                <TrendingFlatIcon/>
              </Grid>
              <Grid
                item
                xs={7}
              >
                <Typography>{shortenComponentName(pr.to.name)}</Typography>
              </Grid>
              <Grid
                item
                xs={4}
                justifyContent='center'
                display='flex'
              >
                <CopyOnClickChip
                  value={pr.to.version}
                  chipProps={{
                    variant: 'outlined'
                  }}
                />
              </Grid>
            </Grid>
          </MenuItem>
        })
      }
    </Select>
  </FormControl>
}
ClosedPullRequests.displayName = 'ClosedPullRequests'
ClosedPullRequests.propTypes = {
  pullRequests: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isError: PropTypes.bool,
  onSelectPr: PropTypes.func.isRequired,
  mountFetchClosedPrs: PropTypes.func.isRequired,
}


const FetchUpgradePullRequests = ({
  setPullRequests,
  setIsLoading,
  setIsError,
  componentName,
  prState,
}) => {
  React.useEffect(() => {
    setIsLoading(true)
    const fetchUpgradePrs = async (componentName) => {
      try {
        const prs = await components.upgradePullRequests({
          componentName: componentName,
          state: prState,
        })
        setPullRequests(prs)
        setIsLoading(false)

      } catch (error) {
        setIsError(true)
        setIsLoading(false)

        enqueueSnackbar(
          'Pull Requests could not be fetched',
          {
            ...errorSnackbarProps,
            details: error.toString(),
            onRetry: () => fetchUpgradePrs(componentName),
          }
        )
      }
    }
    fetchUpgradePrs(componentName)
  }, [
    componentName,
    prState,
    setIsError,
    setIsLoading,
    setPullRequests,
  ])

}
FetchUpgradePullRequests.displayName = 'FetchUpgradePullRequests'
FetchUpgradePullRequests.propTypes = {
  setPullRequests: PropTypes.func.isRequired,
  setIsLoading: PropTypes.func.isRequired,
  setIsError: PropTypes.func.isRequired,
  componentName: PropTypes.string.isRequired,
  prState: PropTypes.string.isRequired,
}


export const ComponentDiffTab = React.memo(({
  component,
  ocmRepo,
}) => {
  const searchParamContext = React.useContext(SearchParamContext)

  // eslint-disable-next-line no-unused-vars
  const [componentRefs, isRefsLoading, isRefsError, refsError] = useFetchBom(
    component,
    ocmRepo,
    'componentReferences',
  )

  const componentNames = [...new Set(componentRefs?.componentDependencies.map(dep => dep.name))]

  const [prs, prsLoading, prFetchError] = useFetchUpgradePRs({
    componentName: component.name,
    state: pullRequestsStates.OPEN,
  })

  const [mountFetchClosedPrs, setMountFetchClosedPrs] = React.useState(false)

  const [closedPrs, setClosedPrs] = React.useState()
  const [closedPrsLoading, setClosedPrsLoading] = React.useState()
  const [closedPrsError, setClosedPrsError] = React.useState()

  const [selectedClosedPr, setSelectedClosedPr] = React.useState()

  const componentDiffsFromParam = () => {
    const componentDiffs = searchParamContext.getAll('componentDiff')

    // only try to parse those component diffs which have all required parts supplied
    // -> <leftName>:<leftVersion>:<rightName>:<rightVersion>
    return componentDiffs.filter((diff) => diff.split(':').length === 4).map((diff) => {
      const diffParts = diff.split(':')
      return {
        leftName: diffParts[0],
        leftVersion: diffParts[1],
        rightName: diffParts[2],
        rightVersion: diffParts[3],
      }
    })
  }

  const [customDiffs, setCustomDiffs] = React.useState(componentDiffsFromParam())

  React.useEffect(() => {
    searchParamContext.update({
      componentDiff: customDiffs.map((diff) => {
        return `${diff.leftName}:${diff.leftVersion}:${diff.rightName}:${diff.rightVersion}`
      })
    })
  }, [customDiffs, searchParamContext])

  if (isRefsLoading) return <ComponentDiffTabLoading loadingPullRequestsCount={3}/>

  const addComponentDiff = ({
    leftName,
    rightName,
    leftVersion,
    rightVersion,
  }) => {

    const diffExists = customDiffs.find(diff => {
      return diffIdentity(
        diff.leftName,
        diff.rightName,
        diff.leftVersion,
        diff.rightVersion,
      ) === diffIdentity(
        leftName,
        rightName,
        leftVersion,
        rightVersion,
      )
    })

    if (diffExists) return

    setCustomDiffs(prev => [
      ...prev,
      {
        leftName: leftName,
        rightName: rightName,
        leftVersion: leftVersion,
        rightVersion: rightVersion,
      }
    ])
  }

  const deleteComponentDiff = ({
    leftName,
    rightName,
    leftVersion,
    rightVersion,
  }) => {
    setCustomDiffs(prev => prev.filter(diff => {
      return diffIdentity(
        diff.leftName,
        diff.rightName,
        diff.leftVersion,
        diff.rightVersion,
      ) !== diffIdentity(
        leftName,
        rightName,
        leftVersion,
        rightVersion,
      )
    }))
  }

  if (prsLoading) return <ComponentDiffTabLoading loadingPullRequestsCount={3}/>

  const findPullRequest = ({
    leftName,
    rightName,
    leftVersion,
    rightVersion,
  }) => {
    return [
      ...prs,
      ...(closedPrs || []),
    ].find(pr => {
      return diffIdentity(
        pr.from.name,
        pr.to.name,
        pr.from.version,
        pr.to.version
      ) === diffIdentity(
        leftName,
        rightName,
        leftVersion,
        rightVersion
      )
    })?.pr
  }

  return <Stack
    direction='column'
    spacing={5}
  >
    {
      mountFetchClosedPrs && <FetchUpgradePullRequests
        setPullRequests={setClosedPrs}
        setIsLoading={setClosedPrsLoading}
        setIsError={setClosedPrsError}
        componentName={component.name}
        prState={pullRequestsStates.CLOSED}
      />
    }
    <Typography>Compare Component Versions</Typography>
    <Box>
      <ComponentSelection
        ocmRepo={ocmRepo}
        componentNames={componentNames}
        addComponentDiff={addComponentDiff}
        inputComponentName={component.name}
        inputComponentVersion={component.version}
        mountFetchClosedPrs={() => setMountFetchClosedPrs(true)}
      />
    </Box>
    <Stack
      direction='column'
      spacing={2}
    >
      {
        customDiffs.map(customDiff => <ComponentVersionDiff
          key={diffIdentity(customDiff.leftName, customDiff.rightName, customDiff.leftVersion, customDiff.rightVersion)}
          leftName={customDiff.leftName}
          rightName={customDiff.rightName}
          leftVersion={customDiff.leftVersion}
          rightVersion={customDiff.rightVersion}
          pullRequest={findPullRequest({
            leftName: customDiff.leftName,
            rightName: customDiff.rightName,
            leftVersion: customDiff.leftVersion,
            rightVersion: customDiff.rightVersion,
          })}
          deleteDiff={deleteComponentDiff}
        />)
      }
    </Stack>
    <Divider orientation='horizontal'/>
    <Box
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
    >
      <Typography
        width='14em'
        marginTop={2}
      >
        Upgrade Pull Requests
      </Typography>
      <ClosedPullRequests
        pullRequests={closedPrs}
        isLoading={closedPrsLoading}
        isError={closedPrsError}
        onSelectPr={setSelectedClosedPr}
        mountFetchClosedPrs={() => setMountFetchClosedPrs(true)}
      />
    </Box>
    <Stack
      direction='column'
      spacing={2}
    >
      {
        selectedClosedPr && <ComponentVersionDiff
          key={JSON.stringify(selectedClosedPr)}
          leftName={selectedClosedPr.from.name}
          rightName={selectedClosedPr.to.name}
          leftVersion={selectedClosedPr.from.version}
          rightVersion={selectedClosedPr.to.version}
          pullRequest={selectedClosedPr.pr}
        />
      }
      <PullRequests
        pullRequests={prs}
        isError={prFetchError}
      />
    </Stack>
  </Stack>
})
ComponentDiffTab.displayName = 'ComponentDiffTab'
ComponentDiffTab.propTypes = {
  component: PropTypes.object.isRequired,
  ocmRepo: PropTypes.string,
}


export const ComponentVectorTab = ({ rightComponent }) => {
  const [value, setValue] = React.useState(0)

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

  return (
    <div>
      <AppBar
        position='static'
        sx={{
          borderBottom: '1px solid #e8e8e8',
          //backgroundColor: theme.palette.background.paper,
        }}
        elevation={0}
      >
        <Tabs
          textcolor='secondary'
          value={value}
          onChange={handleChange}
          variant='fullWidth'
        >
          <Tab label='Resources' />
          <Tab label='Labels' />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0}>
        <ResourceVector rightComponent={rightComponent} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <LabelVector resources={rightComponent.resources} />
      </TabPanel>
    </div>
  )
}
ComponentVectorTab.propTypes = {
  rightComponent: PropTypes.shape({
    resources: PropTypes.object.isRequired,
  }).isRequired,
}
