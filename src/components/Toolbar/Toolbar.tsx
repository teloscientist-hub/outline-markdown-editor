import { useDocumentStore } from '../../store/documentStore'
import type { DepthMode } from '../../store/documentStore'
import './Toolbar.css'

// View mode: "all" shows everything; heading values show only headings up to that level
type ViewOption = { headingsOnly: boolean; depth: DepthMode; label: string }

const VIEW_OPTIONS: ViewOption[] = [
  { headingsOnly: false, depth: 0, label: 'Show All' },
  { headingsOnly: true,  depth: 1, label: 'H1' },
  { headingsOnly: true,  depth: 2, label: 'H1–H2' },
  { headingsOnly: true,  depth: 3, label: 'H1–H3' },
  { headingsOnly: true,  depth: 4, label: 'H1–H4' },
  { headingsOnly: true,  depth: 5, label: 'H1–H5' },
  { headingsOnly: true,  depth: 6, label: 'H1–H6' },
]

function viewKey(o: ViewOption) {
  return o.headingsOnly ? String(o.depth) : 'all'
}

interface ToolbarProps {
  onOpen?: () => void
  onSave?: () => void
}

export function Toolbar({ onOpen, onSave }: ToolbarProps) {
  const {
    showOutline, showMarkdown, showDisplay,
    toggleOutline, toggleMarkdown, toggleDisplay,
    depthMode, setViewMode,
    foldAll, unfoldAll,
    filePath, isDirty,
    activeHeadingId,
    promoteSectionById, demoteSectionById,
    moveSectionUp, moveSectionDown,
  } = useDocumentStore()

  const fileName = filePath ? filePath.split('/').pop()! : 'Untitled.md'
  const canEdit = !!activeHeadingId

  // depthMode 0 = Show All; non-zero = last applied heading depth
  const currentKey = depthMode === 0 ? 'all' : String(depthMode)

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-group">
          {onOpen && (
            <button className="toolbar-btn" onClick={onOpen} title="Open file (⌘O)">Open</button>
          )}
          {onSave && (
            <button className="toolbar-btn" onClick={onSave} title="Save file (⌘S)"
              style={{ position: 'relative' }}>
              Save{isDirty ? <span className="toolbar-dirty-dot" /> : null}
            </button>
          )}
        </div>
        <div className="toolbar-divider" />
        <span className="toolbar-filename">{fileName}</span>
      </div>

      <div className="toolbar-center">
        {/* Pane toggles */}
        <div className="toolbar-group">
          <button className={`toolbar-btn ${showOutline ? 'active' : ''}`}
            onClick={toggleOutline} title="Toggle Outline (⌘1)">Outline</button>
          <button className={`toolbar-btn ${showMarkdown ? 'active' : ''}`}
            onClick={toggleMarkdown} title="Toggle Markdown (⌘2)">Markdown</button>
          <button className={`toolbar-btn ${showDisplay ? 'active' : ''}`}
            onClick={toggleDisplay} title="Toggle Display (⌘3)">Display</button>
        </div>

        <div className="toolbar-divider" />

        {/* View mode (headings depth + headings-only toggle) */}
        <div className="toolbar-group">
          <span className="toolbar-label">View:</span>
          <select
            className="toolbar-select"
            value={currentKey}
            onChange={e => {
              const opt = VIEW_OPTIONS.find(o => viewKey(o) === e.target.value)
              if (opt) setViewMode(opt.headingsOnly, opt.depth)
            }}
            title="Choose which heading levels and content to show in all panes"
          >
            {VIEW_OPTIONS.map(o => (
              <option key={viewKey(o)} value={viewKey(o)}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-divider" />

        {/* Fold */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={foldAll} title="Fold all">Fold All</button>
          <button className="toolbar-btn" onClick={unfoldAll} title="Unfold all">Unfold All</button>
        </div>

        <div className="toolbar-divider" />

        {/* Structural */}
        <div className="toolbar-group">
          <button className="toolbar-btn" disabled={!canEdit}
            onClick={() => activeHeadingId && moveSectionUp(activeHeadingId)}
            title="Move section up (Alt+↑)">↑</button>
          <button className="toolbar-btn" disabled={!canEdit}
            onClick={() => activeHeadingId && moveSectionDown(activeHeadingId)}
            title="Move section down (Alt+↓)">↓</button>
          <button className="toolbar-btn" disabled={!canEdit}
            onClick={() => activeHeadingId && promoteSectionById(activeHeadingId)}
            title="Promote heading (⌘[)">← H</button>
          <button className="toolbar-btn" disabled={!canEdit}
            onClick={() => activeHeadingId && demoteSectionById(activeHeadingId)}
            title="Demote heading (⌘])">H →</button>
        </div>
      </div>

      <div className="toolbar-right" />
    </div>
  )
}
