import React from 'react'

import {
  Avatar,
  Box,
  Link,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'

import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import EmailIcon from '@mui/icons-material/Email'
import FirstPageIcon from '@mui/icons-material/FirstPage'
import GitHubIcon from '@mui/icons-material/GitHub'
import IconButton from '@mui/material/IconButton'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import LastPageIcon from '@mui/icons-material/LastPage'
import { useTheme } from '@mui/material/styles'

import PropTypes from 'prop-types'

import { USER_IDENTITIES } from './consts'


const Responsibles = ({ componentResponsibles, isResponsibleDataLoading }) => {
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(3)

  // compare with same number as `rowsPerPage` inital value
  const usePagination = componentResponsibles ? componentResponsibles.responsibles.length > 3 : false

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0
      ? Math.max(
        0,
        (1 + page) * rowsPerPage - componentResponsibles.responsibles.length
      )
      : 0

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const ResponsiblesTableBody = () => {
    return (
      <TableBody>
        {isResponsibleDataLoading
          ? // match default page size
          Array.from(Array(3).keys()).map((i) => (
            <TableRow
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              key={i}
            >
              <TableCell component='th' scope='row'>
                <Skeleton />
              </TableCell>
              <TableCell align='left'>
                <Skeleton />
              </TableCell>
              <TableCell align='right'>
                <Skeleton />
              </TableCell>
            </TableRow>
          ))
          : (rowsPerPage > 0
            ? componentResponsibles.responsibles.slice(
              page * rowsPerPage,
              page * rowsPerPage + rowsPerPage
            )
            : componentResponsibles.responsibles
          ).map((responsible) => (
            <Responsible
              responsible={responsible}
              key={JSON.stringify(responsible)}
            />
          ))}
        {emptyRows > 0 && (
          <TableRow style={{ height: 33 * emptyRows }}>
            <TableCell colSpan={6} />
          </TableRow>
        )}
      </TableBody>
    )
  }

  const ResponsiblesTableFoot = () => {
    return (
      <TableFooter>
        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
          <TablePagination
            rowsPerPageOptions={[3, 10, 25, { label: 'All', value: -1 }]}
            colSpan={3}
            count={
              isResponsibleDataLoading
                ? 0
                : componentResponsibles.responsibles.length
            }
            rowsPerPage={rowsPerPage}
            page={page}
            SelectProps={{
              inputProps: {
                'aria-label': 'rows per page',
              },
              native: true,
            }}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            ActionsComponent={TablePaginationActions}
          />
        </TableRow>
      </TableFooter>
    )
  }

  if (
    !isResponsibleDataLoading &&
    componentResponsibles.responsibles.length === 0
  ) {
    return (
      <Typography variant='h8'>
        No responsibles found for this component
      </Typography>
    )
  }

  return (
    <TableContainer onClick={(e) => e.stopPropagation()}>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          <TableRow>
            {/* fix width to prevent header bouncing */}
            <TableCell align='left' width='30%'>
              Name
              <AccountCircleIcon
                fontSize='small'
                sx={{
                  position: 'relative',
                  top: '4px',
                  left: '5px',
                }}
              />
            </TableCell>
            <TableCell width='30%'>
              E-Mail
              <EmailIcon
                fontSize='small'
                sx={{
                  position: 'relative',
                  top: '4px',
                  left: '5px',
                }}
              />
            </TableCell>
            <TableCell align='right' width='20%'>
              Github
              <GitHubIcon
                fontSize='small'
                sx={{
                  position: 'relative',
                  top: '4px',
                  left: '5px',
                }}
              />
            </TableCell>
          </TableRow>
        </TableHead>
        <ResponsiblesTableBody />
        {
          usePagination && <ResponsiblesTableFoot/>
        }
      </Table>
    </TableContainer>
  )
}
Responsibles.displayName = 'Responsibles'
Responsibles.propTypes = {
  componentResponsibles: PropTypes.object,
  isResponsibleDataLoading: PropTypes.bool.isRequired,
}

const TablePaginationActions = ({ count, page, rowsPerPage, onPageChange }) => {
  const theme = useTheme()

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0)
  }

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1)
  }

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1)
  }

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))
  }

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label='first page'
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label='previous page'
      >
        {theme.direction === 'rtl' ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label='next page'
      >
        {theme.direction === 'rtl' ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label='last page'
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  )
}
TablePaginationActions.displayName = 'TablePaginationActions'
TablePaginationActions.propTypes = {
  count: PropTypes.number,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  onPageChange: PropTypes.func,
}

const Responsible = ({ responsible }) => {
  const githubUsers = responsible.filter(
    (identifier) => identifier.type === USER_IDENTITIES.GITHUB_USER
  )
  const emailAddress = responsible.find(
    (identifier) => identifier.type === USER_IDENTITIES.EMAIL_ADDRESS
  )
  const personalName = responsible.find(
    (identifier) => identifier.type === USER_IDENTITIES.PERSONAL_NAME
  )

  return (
    <TableRow
      key={JSON.stringify(responsible)}
      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
    >
      <TableCell align='left'>
        {personalName
          ? `${personalName.first_name} ${personalName.last_name}`
          : null}
      </TableCell>
      <TableCell align='left'>
        {emailAddress ? (
          <Link href={`mailto:${emailAddress.email}`} color='inherit'>
            {emailAddress.email}
          </Link>
        ) : null}
      </TableCell>
      <TableCell align='right'>
        {githubUsers.length ? (
          <GithubUsers githubUsers={githubUsers} />
        ) : null}
      </TableCell>
    </TableRow>
  )
}
Responsible.displayName = 'Responsible'
Responsible.propTypes = {
  responsible: PropTypes.array,
}

const userUrl = (githubUser) => {
  return `https://${githubUser.github_hostname}/${githubUser.username}`
}

const GithubUsers = ({ githubUsers }) => {
  let mainUser = githubUsers.find((githubUser) => {
    return githubUser.github_hostname === 'github.com'
  })
  // fallback to any
  if (!mainUser) mainUser = githubUsers[0]
  return (
    <Tooltip
      title={
        <List>
          {githubUsers.map((githubUser) => {
            return (
              <ListItemButton
                key={JSON.stringify(githubUser)}
                onClick={() => window.open(userUrl(githubUser))}
              >
                <ListItemAvatar>
                  <Avatar>
                    <GitHubIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={githubUser.username}
                  secondary={githubUser.github_hostname}
                  secondaryTypographyProps={{color: 'lightgrey'}}
                />
              </ListItemButton>
            )
          })}
        </List>
      }
      placement='top-start'
      describeChild
    >
      <Link color='inherit'>{mainUser.username}</Link>
    </Tooltip>
  )
}
GithubUsers.displayName = 'GithubUsers'
GithubUsers.propTypes = {
  githubUsers: PropTypes.array,
}

export { Responsibles }
