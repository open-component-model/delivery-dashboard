import React from 'react'

import {
  Box,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'

import PropTypes from 'prop-types'

const GroupedSection = ({ groupKey, items, renderItem }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        sx={{ px: 1.5, py: 0.5 }}
        dense
      >
        <ListItemText
          primary={groupKey}
          primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          {items.length}
        </Typography>
        {open ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List dense disablePadding>
          {items.map((item, idx) => (
            <ListItem key={idx} disablePadding sx={{ px: 2.5, py: 0.25 }}>
              {renderItem ? (
                renderItem(item)
              ) : (
                <>
                  {item.icon && (
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {item.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={item.primary}
                    secondary={item.secondary}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </>
              )}
            </ListItem>
          ))}
        </List>
      </Collapse>
    </>
  )
}
GroupedSection.propTypes = {
  groupKey: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func,
}

const ListContent = ({ items, groups, renderItem }) => {
  if (items.length === 0) return null

  if (groups) {
    return (
      <List dense disablePadding>
        {[...groups.entries()].map(([groupKey, groupItems]) => (
          <GroupedSection
            key={groupKey}
            groupKey={groupKey}
            items={groupItems}
            renderItem={renderItem}
          />
        ))}
      </List>
    )
  }

  return (
    <List dense disablePadding>
      {items.map((item, idx) => (
        <ListItem key={idx} disablePadding sx={{ px: 1.5, py: 0.25 }}>
          {renderItem ? (
            renderItem(item)
          ) : (
            <>
              {item.icon && (
                <ListItemIcon sx={{ minWidth: 28 }}>{item.icon}</ListItemIcon>
              )}
              <ListItemText
                primary={item.primary}
                secondary={item.secondary}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </>
          )}
        </ListItem>
      ))}
    </List>
  )
}
ListContent.propTypes = {
  items: PropTypes.array.isRequired,
  groups: PropTypes.instanceOf(Map),
  renderItem: PropTypes.func,
}

const ScrollableList = ({
  title,
  titleIcon,
  titleColor,
  items,
  renderItem,
  maxHeight,
  emptyText,
  groupBy,
}) => {
  const [expanded, setExpanded] = React.useState(false)

  const groups = React.useMemo(() => {
    if (!groupBy) return null
    const map = new Map()
    for (const item of items) {
      const key = item[groupBy] ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return map
  }, [items, groupBy])

  const titleRow = (
    <Box display="flex" alignItems="center" gap={0.5}>
      {titleIcon}
      <Typography variant="subtitle2" color={titleColor} sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      {items.length > 0 && (
        <Tooltip title="Expand">
          <IconButton size="small" onClick={() => setExpanded(true)}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )

  return (
    <Box>
      {titleRow}
      <Box
        sx={{
          maxHeight: maxHeight ?? '200px',
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mt: 0.5,
        }}
      >
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            {emptyText ?? 'No items.'}
          </Typography>
        ) : (
          <ListContent items={items} groups={groups} renderItem={renderItem} />
        )}
      </Box>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            {titleIcon}
            <Typography variant="subtitle1" color={titleColor}>
              {title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setExpanded(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <ListContent items={items} groups={groups} renderItem={renderItem} />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
ScrollableList.displayName = 'ScrollableList'
ScrollableList.propTypes = {
  title: PropTypes.string.isRequired,
  titleIcon: PropTypes.node,
  titleColor: PropTypes.string,
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func,
  maxHeight: PropTypes.string,
  emptyText: PropTypes.string,
  groupBy: PropTypes.string,
}

export default ScrollableList
