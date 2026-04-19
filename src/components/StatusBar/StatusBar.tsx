import { useDocumentStore } from '../../store/documentStore'
import { getHeading } from '../../model/documentModel'
import './StatusBar.css'

export function StatusBar() {
  const {
    wordCount, charCount,
    cursorLine, cursorCol,
    activeHeadingId, headings,
    theme, setTheme,
  } = useDocumentStore()

  // Build breadcrumb from active heading
  const breadcrumb = buildBreadcrumb(activeHeadingId, headings)

  const themeIcon = theme === 'dark' ? '☽' : theme === 'light' ? '☀' : '◑'
  const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'

  return (
    <div className="status-bar">
      <div className="status-left">
        {breadcrumb && (
          <span className="status-breadcrumb" title="Current heading">
            {breadcrumb}
          </span>
        )}
      </div>

      <div className="status-center">
        <span className="status-item" title="Word count">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span className="status-sep">·</span>
        <span className="status-item" title="Character count">
          {charCount.toLocaleString()} chars
        </span>
      </div>

      <div className="status-right">
        <span className="status-item" title="Cursor position">
          Ln {cursorLine + 1}, Col {cursorCol + 1}
        </span>
        <span className="status-sep">·</span>
        <button
          className="status-btn"
          onClick={() => setTheme(nextTheme)}
          title={`Theme: ${theme} (click to cycle)`}
        >
          {themeIcon} {theme}
        </button>
      </div>
    </div>
  )
}

function buildBreadcrumb(
  activeId: string | null,
  headings: ReturnType<typeof useDocumentStore.getState>['headings']
): string {
  if (!activeId) return ''
  const parts: string[] = []
  let id: string | null = activeId
  while (id) {
    const h = getHeading(headings, id)
    if (!h) break
    parts.unshift(h.text.length > 28 ? h.text.substring(0, 28) + '…' : h.text)
    id = h.parentId
  }
  return parts.join(' › ')
}
