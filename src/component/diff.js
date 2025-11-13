import React from 'react'

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
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined'
import SyncAltIcon from '@mui/icons-material/SyncAlt'

import PropTypes from 'prop-types'
import { useTheme } from '@emotion/react'
import yaml from 'js-yaml'

import { SearchParamContext } from '../App'
import { downloadObject, shortenComponentName, trimComponentName } from '../util'
import { TabPanel } from './tabs'
import {
  useFetchBom,
  useFetchCompDiff,
  useFetchUpgradePRs,
} from '../fetch'
import CopyOnClickChip from '../util/copyOnClickChip'
import { components } from '../api'
import {
  pullRequestsStates,
  errorSnackbarProps,
  fetchBomPopulate,
} from '../consts'
import { enqueueSnackbar } from 'notistack'
import { generateArtefactID } from '../ocm/util'


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
  const [diff, state] = useFetchCompDiff({
    leftName: leftName,
    rightName: rightName,
    leftVersion: leftVersion,
    rightVersion: rightVersion,
  })

  const handleExportDiff = () => {
    const diffBlob = new Blob([JSON.stringify(diff, null, 2)], { type: 'application/json' })
    downloadObject({ obj: diffBlob, fname: 'component-diff.json' })
  }

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
      <Tooltip title={'Export Diff'}>
        <IconButton
          onClick={(event) => {
            event.stopPropagation()
            handleExportDiff()
          }}
        >
          <FileDownloadIcon/>
        </IconButton>
      </Tooltip>
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

  if (state.isLoading) return <LoadingDiff/>
  if (state.error) return <Accordion expanded={false}>
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
        })
        setVersions(lastVersions)
        setIsLoading(false)
      } catch {
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

  const [componentRefs, state] = useFetchBom({
    componentName: component.name,
    componentVersion: component.version,
    ocmRepo: ocmRepo,
    populate: fetchBomPopulate.COMPONENT_REFS,
  })

  const componentNames = [...new Set(componentRefs?.componentDependencies.map(dep => dep.name))]

  const [prs, prState] = useFetchUpgradePRs({
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

  const componentDiffsAsParam = (componentDiffs) => {
    searchParamContext.update({
      componentDiff: componentDiffs.map((diff) => {
        return `${diff.leftName}:${diff.leftVersion}:${diff.rightName}:${diff.rightVersion}`
      })
    })
  }

  const [customDiffs, setCustomDiffs] = React.useState(componentDiffsFromParam())

  if (state.isLoading) return <ComponentDiffTabLoading loadingPullRequestsCount={3}/>

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

    const componentDiffs = [
      ...customDiffs,
      {
        leftName: leftName,
        rightName: rightName,
        leftVersion: leftVersion,
        rightVersion: rightVersion,
      }
    ]
    setCustomDiffs(componentDiffs)
    componentDiffsAsParam(componentDiffs)
  }

  const deleteComponentDiff = ({
    leftName,
    rightName,
    leftVersion,
    rightVersion,
  }) => {
    const componentDiffs = customDiffs.filter(diff => {
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
    })
    setCustomDiffs(componentDiffs)
    componentDiffsAsParam(componentDiffs)
  }

  if (prState.isLoading) return <ComponentDiffTabLoading loadingPullRequestsCount={3}/>

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
        isError={prState.error}
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



export const ComponentVector = ({ diff }) => {
  const [expanded, setExpanded] = React.useState(
    diff.components_changed.map(() => false)
  )

  const [allExpanded, setAllExpanded] = React.useState(false)

  const handleExpandAll = () => {
    setExpanded(diff.components_changed.map(() => !allExpanded))
    setAllExpanded(!allExpanded)
  }

  let addedComponents = (
    <Typography variant='body1'>no components added</Typography>
  )
  let removedComponents = (
    <Typography variant='body1'>no components removed</Typography>
  )
  let changedComponents = (
    <Typography variant='body1'>no components changed</Typography>
  )
  if (!diff) {
    return null
  }
  if (diff.components_added.length > 0) {
    addedComponents = diff.components_added.map((component) => {
      return (
        <ComponentEntry
          icon={<AddCircleOutlineOutlinedIcon />}
          name={component.name}
          version={component.version}
          key={`${component.name}-${component.version}`}
        />
      )
    })
  }
  if (diff && diff.components_removed.length > 0) {
    removedComponents = diff.components_removed.map((component) => {
      return (
        <ComponentEntry
          icon={<RemoveCircleOutlineIcon />}
          name={component.name}
          version={component.version}
          key={`${component.name}-${component.version}`}
        />
      )
    })
  }

  if (diff.components_changed.length > 0) {
    changedComponents = diff.components_changed.map((cpair, idx) => {
      const name = trimComponentName(cpair.left.name) // name is always identical (left/right)
      return (
        <Accordion
          expanded={expanded[idx]}
          key={`${cpair.left.name}-${cpair.left.version}`}
          onChange={(event, isExpanded) => {
            const newExpanded = expanded.map((element, index) => {
              if (index === idx) {
                return isExpanded
              } else {
                return element
              }
            })
            setExpanded(newExpanded)
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Grid container alignItems='center'>
              <Grid item xs={5}>
                <Typography
                  sx={{
                    fontSize: 18,
                    flexBasis: '33.33%',
                    flexShrink: 0,
                  }}
                >
                  {name}
                </Typography>
              </Grid>
              <Grid item xs={7}>
                <Typography
                  component={'span'}
                  sx={{
                    fontSize: 15,
                    color: 'secondary',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <CopyOnClickChip
                      value={cpair.left.version}
                      chipProps={{
                        variant: 'outlined'
                      }}
                    />
                    <ArrowForwardIcon style={{ margin: '0.3em' }} />
                    <CopyOnClickChip
                      value={cpair.right.version}
                      chipProps={{
                        variant: 'outlined'
                      }}
                    />
                  </div>
                </Typography>
              </Grid>
            </Grid>
          </AccordionSummary>
          <AccordionDetails key={cpair.left.name} style={{ padding: '0em' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Divider variant='middle' />
              </Grid>
              <Grid item xs={12}>
                <ComponentVectorTab rightComponent={cpair.right} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )
    })
  }
  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          {addedComponents}
        </Grid>
        <Grid item xs={12}>
          {removedComponents}
        </Grid>
        <Grid item xs={10}>
          <Typography variant='h6' display='block'>
            Changed components:
          </Typography>
        </Grid>
        <Grid item xs={2}>
          <Button
            variant='contained'
            size='small'
            color='primary'
            onClick={handleExpandAll}
          >
            {!allExpanded && (
              <>
                Expand All <ArrowDownwardIcon fontSize='small' />
              </>
            )}
            {allExpanded && (
              <>
                Collapse All <ArrowUpwardIcon fontSize='small' />
              </>
            )}
          </Button>
        </Grid>
        <Grid item xs={12}>
          {changedComponents}
        </Grid>
      </Grid>
    </>
  )
}
ComponentVector.displayName = 'ComponentVector'
ComponentVector.propTypes = {
  diff: PropTypes.object.isRequired,
}

const ComponentEntry = ({ icon, name, version }) => {
  return <Grid container direction='row'>
    <Grid item xs={9}>
      <div style={{ display: 'flex' }}>
        {icon}
        <Typography
          sx={{
            paddingLeft: '0.2em'
          }}
        >
          {name}
        </Typography>
      </div>
    </Grid>
    <Grid item xs={3}>
      <CopyOnClickChip
        value={version}
        chipProps={{
          variant: 'outlined'
        }}
      />
    </Grid>
  </Grid>
}
ComponentEntry.displayName = 'ComponentEntry'
ComponentEntry.propTypes = {
  icon: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
}




const ChangedLabelCard = ({ label }) => {
  let value = label.value

  if (typeof value == 'object') {
    value = yaml.dump(value)
  }
  return (
    <>
      <Typography variant='body2'>{label.name}</Typography>
      <Divider />
      <Typography variant='body2'>{value}</Typography>
    </>
  )
}
ChangedLabelCard.propTypes = {
  label: PropTypes.shape({
    value: PropTypes.any.isRequired,
    name: PropTypes.string.isRequired,
  }),
}

const LabelDiff = ({ left, right }) => {
  return (
    <>
      <Grid item xs={5}>
        <ChangedLabelCard label={left} />
      </Grid>
      <Grid
        item
        xs={2}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ForwardOutlinedIcon />
      </Grid>
      <Grid item xs={5}>
        <ChangedLabelCard label={right} />
      </Grid>
    </>
  )
}

LabelDiff.propTypes = {
  left: PropTypes.object.isRequired,
  right: PropTypes.object.isRequired,
}

const LabelResource = ({ icon, resource }) => {
  const labelItems = resource.labels.map((label) => {
    return (
      <LabelItem
        icon={icon}
        name={label.name}
        value={label.value}
        key={`${resource.name}-${resource.version}-${label.name}`}
      />
    )
  })

  return (
    <Grid container spacing={1}>
      <Grid item xs={12} style={{ display: 'flex' }}>
        <Typography variant='body1'>{resource.name}</Typography>
        <div
          style={{
            paddingLeft: '0.3em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CopyOnClickChip
            value={resource.version}
            chipProps={{
              version: 'outlined',
              size: 'small',
            }}
          />
        </div>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      {labelItems}
    </Grid>
  )
}
LabelResource.displayName = 'LabelResource'
LabelResource.propTypes = {
  icon: PropTypes.object.isRequired,
  resource: PropTypes.object.isRequired,
}

const LabelItem = ({ icon, name, value }) => {
  if (typeof value == 'object') {
    value = yaml.dump(value)
  }

  return (
    <>
      <Grid
        item
        xs={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon}
        <Typography variant='body2' style={{ paddingLeft: '0.2em' }}>
          {name}
        </Typography>
      </Grid>
      <Grid
        item
        xs={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
          {value}
        </Typography>
      </Grid>
    </>
  )
}
LabelItem.displayName = 'LabelItem'
LabelItem.propTypes = {
  icon: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.object.isRequired,
}

export const LabelVector = ({ resources }) => {
  const labelTableHeader = (
    <>
      <Grid item xs={4}>
        <Typography
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
          variant='body1'
        >
          Name
        </Typography>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={7}>
        <Typography
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
          variant='body1'
        >
          Value
        </Typography>
      </Grid>
    </>
  )

  let addedLabels = getLabelsFromResources(resources.added)
  if (addedLabels.length === 0) {
    addedLabels = <Box fontStyle='italic'>no labels added</Box>
  }

  let removedLabels = getLabelsFromResources(resources.removed)
  if (removedLabels.length === 0) {
    removedLabels = <Box fontStyle='italic'>no labels removed</Box>
  }

  let changedLabels = (
    <Grid item xs={12}>
      <Box fontStyle='italic'>no labels changed</Box>
    </Grid>
  )
  if (resources.changed.length > 0) {
    changedLabels = resources.changed.map((resourcePair) => {
      return (
        <Grid
          item
          xs={12}
          key={`${resourcePair.to.name}-${resourcePair.from.version}-${resourcePair.to.version}`}
        >
          <ChangedLabels resourcePair={resourcePair} />
        </Grid>
      )
    })
  }
  return (
    <>
      <Grid container spacing={4}>
        {labelTableHeader}
        <Grid item xs={12}>
          {addedLabels}
          <br />
          {removedLabels}
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>
        {changedLabels}
      </Grid>
    </>
  )
}
LabelVector.displayName = 'LabelVector'
LabelVector.propTypes = {
  resources: PropTypes.object.isRequired,
}

const ChangedLabels = ({ resourcePair }) => {
  const labelDiff = resourcePair.to.label_diff

  // Check for label diff and print out resource name and versions
  if (!labelDiff) {
    return <></>
  }
  let addedLabels = ''
  let removedLabels = ''
  let changedLabels = ''

  if (labelDiff.added.length > 0) {
    addedLabels = labelDiff.added.map((element) => {
      return (
        <LabelItem
          icon={<AddCircleOutlineOutlinedIcon />}
          name={element.name}
          value={element.value}
          key={element.name}
        />
      )
    })
  }

  if (labelDiff.removed.length > 0) {
    removedLabels = labelDiff.removed.map((element) => {
      return (
        <LabelItem
          icon={<RemoveCircleOutlineIcon />}
          name={element.name}
          value={element.value}
          key={element.name}
        />
      )
    })
  }

  if (labelDiff.changed.length > 0) {
    changedLabels = labelDiff.changed.map((element) => {
      return (
        <LabelDiff
          key={element.to.name}
          left={element.from}
          right={element.to}
        />
      )
    })
  }
  if (!changedLabels && !addedLabels && !removedLabels) {
    return ''
  }

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={12} style={{ display: 'flex' }}>
          <Typography variant='body1'>{resourcePair.to.name}</Typography>
          <div
            style={{
              paddingLeft: '0.2em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CopyOnClickChip
              value={resourcePair.from.version}
              chipProps={{
                variant: 'outlined',
                size: 'small',
              }}
            />
            <ArrowForwardIcon style={{ padding: ' 0 0.1em 0 0.1em' }} />
            <CopyOnClickChip
              value={resourcePair.to.version}
              chipProps={{
                variant: 'outlined',
                size: 'small',
              }}
            />
          </div>
        </Grid>
        {addedLabels}
        {removedLabels}
        <Grid item xs={12}>
          <Divider />
        </Grid>
        {changedLabels}
      </Grid>
    </>
  )
}
ChangedLabels.displayName = 'ChangedLabels'
ChangedLabels.propTypes = {
  resourcePair: PropTypes.object.isRequired,
}

const getLabelsFromResources = (resources) => {
  let labels = []
  if (resources.length > 0) {
    labels = resources
      .filter((resource) => {
        if (resource.labels.length === 0) {
          return false
        } else {
          return true
        }
      })
      .map((resource) => {
        return (
          <Grid item xs={12} key={`${resource.name}-${resource.version}`}>
            <LabelResource
              icon={<AddCircleOutlineOutlinedIcon />}
              resource={resource}
            />
          </Grid>
        )
      })
  }
  return labels
}



const isTypeOci = (resource) => {
  if (resource.type === 'ociImage') {
    return true
  } else {
    return false
  }
}

const sortResources = (resources) => {
  resources.sort((a, b) => {
    if (isTypeOci(a) && isTypeOci(b)) {
      return a.access.imageReference.localeCompare(b.access.imageReference)
    } else if (isTypeOci(a) && !isTypeOci(b)) {
      return -1
    } else if (!isTypeOci(a) && isTypeOci(b)) {
      return 1
    } else if (!isTypeOci(a) && !isTypeOci(b)) {
      return a.name.localeCompare(b.name)
    } else {
      throw Error('Resource could not be sorted')
    }
  })

  return resources
}

export const ResourceVector = ({ rightComponent }) => {
  const resources = rightComponent.resources
  let addedResources = <Box fontStyle='italic'>no resources added</Box>
  if (resources.added.length) {
    const sortedResources = sortResources(resources.added)

    addedResources = sortedResources.map((resource) => {
      let name = ''
      if (isTypeOci(resource)) {
        name = resource.access.imageReference
      } else {
        name = `${resource.name}-${resource.version}`
      }
      return (
        <div
          style={{ display: 'flex' }}
          key={generateArtefactID(resource)}
        >
          <AddCircleOutlineOutlinedIcon />
          <Typography
            sx={{
              paddingLeft: '0.2em',
            }}
            variant='body2'
          >
            {name}
          </Typography>
        </div>
      )
    })
  }

  let removedResources = <Box fontStyle='italic'>no resources removed</Box>
  if (resources.removed.length) {
    const sortedResources = sortResources(resources.removed)

    removedResources = sortedResources.map((resource) => {
      let name = ''
      if (isTypeOci(resource)) {
        name = resource.access.imageReference
      } else {
        name = `${resource.name}-${resource.version}`
      }
      return (
        <div
          style={{ display: 'flex' }}
          key={generateArtefactID(resource)}
        >
          <RemoveCircleOutlineIcon />
          <Typography
            variant='body2'
            sx={{
              paddingLeft: '0.2em',
            }}
          >
            {name}
          </Typography>
        </div>
      )
    })
  }

  let changedResources = <Box fontStyle='italic'>no resources changed</Box>
  if (resources.changed.length > 0) {
    changedResources = resources.changed.map((resourcePair) => {
      let name = resourcePair.to.name
      if (isTypeOci(resourcePair.to)) {
        name = resourcePair.to.access.imageReference
      }

      return (
        <ChangedResource
          name={name}
          fromVersion={resourcePair.from.version}
          toVersion={resourcePair.to.version}
          key={`${generateArtefactID(resourcePair.from)}_${resourcePair.to.version}`}
        />
      )
    })
  }

  return (
    <>
      {addedResources}
      <br />
      {removedResources}
      <br />
      {changedResources}
    </>
  )
}
ResourceVector.displayName = 'ResourceVector'
ResourceVector.propTypes = {
  rightComponent: PropTypes.object.isRequired,
}

const ChangedResource = ({ name, fromVersion, toVersion }) => {
  return <Grid container justifyContent='center' alignItems='center' direction='row'>
    <Grid item xs={8} style={{ display: 'flex' }}>
      <SyncAltIcon />
      <Typography
        sx={{
          paddingLeft: '0.2em',
        }}
      >
        {name}
      </Typography>
    </Grid>
    <Grid item xs={4}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CopyOnClickChip
          value={fromVersion}
          chipProps={{
            variant: 'outlined',
            size: 'small',
          }}
        />
        <ArrowForwardIcon style={{ padding: ' 0 0.1em 0 0.1em' }} />
        <CopyOnClickChip
          value={toVersion}
          chipProps={{
            variant: 'outlined',
            size: 'small',
          }}
        />
      </div>
    </Grid>
  </Grid>
}
ChangedResource.displayName = 'ChangedResource'
ChangedResource.propTypes = {
  name: PropTypes.string.isRequired,
  fromVersion: PropTypes.string,
  toVersion: PropTypes.string,
}
