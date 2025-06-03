import React from 'react'

import {
  Avatar,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges'

import PropTypes from 'prop-types'
import { useSnackbar } from 'notistack'

import { errorSnackbarProps } from '../consts'
import {
  routes,
  serviceExtensions,
} from '../api'
import { useFetchAuthUser } from '../fetch'
import {
  camelCaseToDisplayText,
  hasUserAccess,
} from '../util'


export const triggerComplianceTool = ({
  service,
  ocmNodes,
  enqueueSnackbar,
  priority,
  setIsLoading,
}) => {
  const fetchBacklogItems = async ({artefacts}) => {
    const artefactPhrase = artefacts.length === 1 ?
      `${artefacts[0].artefact.artefact_name}:${artefacts[0].artefact.artefact_version}` :
      `${ocmNodes.length} artefacts`
    if (setIsLoading) {
      setIsLoading(true)
    }
    try {
      await serviceExtensions.backlogItems.create({
        service: service,
        priority: priority ? priority : 'Critical',
        artefacts: artefacts,
      })
    } catch(error) {
      enqueueSnackbar(
        `Could not schedule ${artefactPhrase} for ${camelCaseToDisplayText(service).toLowerCase()}`,
        {
          ...errorSnackbarProps,
          details: error.toString(),
          onRetry: () => fetchBacklogItems({artefacts}),
        },
      )
      if (setIsLoading) {
        setIsLoading(false)
      }
      return false
    }

    enqueueSnackbar(
      `Successfully scheduled ${artefactPhrase} for ${camelCaseToDisplayText(service).toLowerCase()}`,
      {
        variant: 'success',
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
        autoHideDuration: 6000,
      },
    )
    if (setIsLoading) {
      setIsLoading(false)
    }
    return true
  }

  const artefacts = ocmNodes.map((ocmNode) => {
    return {
      component_name: ocmNode.component.name,
      component_version: ocmNode.component.version,
      artefact_kind: ocmNode.artefactKind,
      artefact: {
        artefact_name: ocmNode.artefact.name,
        artefact_version: ocmNode.artefact.version,
        artefact_type: ocmNode.artefact.type,
        artefact_extra_id: ocmNode.artefact.extraIdentity,
      },
    }
  })

  return fetchBacklogItems({artefacts})
}
triggerComplianceTool.propTypes = {
  service: PropTypes.string.isRequired,
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  enqueueSnackbar: PropTypes.func.isRequired,
  priority: PropTypes.string,
  setIsLoading: PropTypes.func,
}


const TriggerComplianceToolButton = ({
  ocmNodes,
  service,
}) => {
  const { enqueueSnackbar } = useSnackbar()

  const [user] = useFetchAuthUser()
  const route = new URL(routes.serviceExtensions.backlogItems()).pathname
  const isAuthorised = hasUserAccess({
    permissions: user?.permissions,
    route: route,
    method: 'POST',
  })

  if (!isAuthorised) return null

  return <ListItemButton
    onClick={(e) => {
      e.stopPropagation()
      triggerComplianceTool({
        service: service,
        ocmNodes: ocmNodes,
        enqueueSnackbar: enqueueSnackbar,
      })
    }}
    divider
  >
    <ListItemAvatar>
      <Avatar>
        <PublishedWithChangesIcon/>
      </Avatar>
    </ListItemAvatar>
    <ListItemText primary={`Trigger ${camelCaseToDisplayText(service)} Scan`}/>
  </ListItemButton>
}
TriggerComplianceToolButton.displayName = 'TriggerComplianceToolButton'
TriggerComplianceToolButton.propTypes = {
  ocmNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  service: PropTypes.string.isRequired,
}


export default TriggerComplianceToolButton
