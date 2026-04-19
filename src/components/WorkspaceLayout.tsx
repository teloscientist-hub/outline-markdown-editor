import { useState, useCallback } from 'react'
import { useDocumentStore } from '../store/documentStore'
import { OutlinePane } from './OutlinePane/OutlinePane'
import { MarkdownPane } from './MarkdownPane/MarkdownPane'
import { DisplayPane } from './DisplayPane/DisplayPane'
import { ResizeHandle } from './ResizeHandle/ResizeHandle'
import './WorkspaceLayout.css'

const MIN_PANE = 160
const DEFAULT_OUTLINE = 220
const DEFAULT_MARKDOWN_RATIO = 0.5  // of remaining space

export function WorkspaceLayout() {
  const { showOutline, showMarkdown, showDisplay } = useDocumentStore()

  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE)
  // markdownRatio: fraction of (total - outlineWidth) given to markdown
  const [markdownRatio, setMarkdownRatio] = useState(DEFAULT_MARKDOWN_RATIO)

  const handleResizeOutline = useCallback((delta: number) => {
    setOutlineWidth(w => Math.max(MIN_PANE, Math.min(480, w + delta)))
  }, [])

  const handleResizeMarkdown = useCallback((delta: number) => {
    setMarkdownRatio(r => {
      const newR = r + delta / (window.innerWidth - outlineWidth)
      return Math.max(0.15, Math.min(0.85, newR))
    })
  }, [outlineWidth])

  // Build pane style based on what's visible
  const getMarkdownStyle = () => {
    if (!showOutline && !showDisplay) return { flex: 1 }
    if (!showDisplay) return { flex: 1 }
    if (!showOutline) return { flex: markdownRatio, minWidth: MIN_PANE }
    return { flex: markdownRatio, minWidth: MIN_PANE }
  }

  const getDisplayStyle = () => {
    if (!showMarkdown) return { flex: 1 }
    return { flex: 1 - markdownRatio + 0.01, minWidth: MIN_PANE }
  }

  return (
    <div className="workspace">
      {showOutline && (
        <>
          <div className="pane pane-outline" style={{ width: outlineWidth, flexShrink: 0 }}>
            <OutlinePane />
          </div>
          {(showMarkdown || showDisplay) && (
            <ResizeHandle onResize={handleResizeOutline} />
          )}
        </>
      )}

      {showMarkdown && (
        <>
          <div className="pane pane-markdown" style={getMarkdownStyle()}>
            <MarkdownPane />
          </div>
          {showDisplay && (
            <ResizeHandle onResize={handleResizeMarkdown} />
          )}
        </>
      )}

      {showDisplay && (
        <div className="pane pane-display" style={getDisplayStyle()}>
          <DisplayPane />
        </div>
      )}
    </div>
  )
}
