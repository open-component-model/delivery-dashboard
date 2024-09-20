import React from 'react'
import PropTypes from 'prop-types'

import { langs } from '@uiw/codemirror-extensions-langs'
import CodeMirror, { EditorSelection, lineNumbers } from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { bbedit } from '@uiw/codemirror-theme-bbedit'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

import { useTheme } from '@emotion/react'
import { SearchParamContext } from '../../App'
import { useSnackbar } from 'notistack'
import { errorSnackbarProps } from '../../consts'


const editorView = EditorView.baseTheme({
  '&': {
    fontSize: '16px',
  },
  '.cm-lineNumbers': {
    cursor: 'pointer'
  }
})


const scrollDocToView = (editor, lines, handleException) => {
  if (!editor || !editor.state?.doc) return // is loading
  if (!lines) return

  const maxLength = editor.state.doc.length
  const [from, to] = lines.split(':')

  if ( // validate selection to prevent crash
    to > maxLength
    || from > maxLength
  ) return

  try {
    const selection = EditorSelection.single(from, to)
    editor.view?.dispatch({
      selection: selection,
      scrollIntoView: true,
    })
  } catch (e) {
    // should only occur if user manually modifies url parameter (to an unallowed value)
    handleException(e)
    return
  }
}


const MultilineTextViewer = ({
  text,
}) => {
  const theme = useTheme()
  const searchParamContext = React.useContext(SearchParamContext)
  const { enqueueSnackbar } = useSnackbar()

  return <CodeMirror
    ref={(editor) => scrollDocToView(
      editor,
      searchParamContext.get('cdLines'),
      (e) => {enqueueSnackbar(
        'Something went wrong scrolling to selected line',
        {
          details: e.toString(),
          ...errorSnackbarProps,
        }
      )}
    )}
    value={text}
    theme={theme.palette.mode == 'dark' ? vscodeDark : bbedit}
    readOnly
    basicSetup={{
      lineNumbers: false, // use custom lineNumber gutter to allow sharing of line selection
    }}
    extensions={[
      editorView,
      langs.yaml(),
      lineNumbers({
        domEventHandlers: {
          mousedown(_, line) {
            searchParamContext.update({'cdLines': `${line.from}:${line.to}`})
            return true
          }
        }
      })
    ]}
  />
}
MultilineTextViewer.propTypes = {
  text: PropTypes.string,
}

export default MultilineTextViewer
