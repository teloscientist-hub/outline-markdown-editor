import { createPortal } from 'react-dom'
import type { FormatType } from '../../formatBus'
import './FormatBubble.css'

interface Props {
  x: number            // viewport center-x
  y: number            // viewport top-y of selection (bubble appears above)
  headingLevel: number // 0 = not a heading, 1–6 = H1–H6
  onFormat: (type: FormatType) => void
}

export function FormatBubble({ x, y, headingLevel, onFormat }: Props) {
  const isHeading = headingLevel > 0

  const bubble = (
    <div
      className="fmt-bubble"
      style={{ left: x, top: y }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* ── Heading controls ─────────────────────────────── */}
      <button
        className="fmt-btn fmt-btn--nudge"
        title="Promote heading — fewer #'s  (⌘[)"
        disabled={!isHeading || headingLevel <= 1}
        onClick={() => onFormat('promote')}
      >H−</button>

      <select
        className="fmt-select"
        value={headingLevel}
        title="Set heading level"
        onChange={e => {
          const val = parseInt(e.target.value)
          onFormat(val === 0 ? 'remove-heading' : `h${val}` as FormatType)
        }}
      >
        <option value={0}>— H</option>
        <option value={1}>H 1</option>
        <option value={2}>H 2</option>
        <option value={3}>H 3</option>
        <option value={4}>H 4</option>
        <option value={5}>H 5</option>
        <option value={6}>H 6</option>
      </select>

      <button
        className="fmt-btn fmt-btn--nudge"
        title="Demote heading — more #'s  (⌘])"
        disabled={!isHeading || headingLevel >= 6}
        onClick={() => onFormat('demote')}
      >H+</button>

      <div className="fmt-sep" />

      {/* ── Inline ───────────────────────────────────────── */}
      <button className="fmt-btn fmt-btn--bold"
        title="Bold  (⌘B)" onClick={() => onFormat('bold')}>B</button>
      <button className="fmt-btn fmt-btn--italic"
        title="Italic  (⌘I)" onClick={() => onFormat('italic')}>I</button>

      <div className="fmt-sep" />

      {/* ── Lists ────────────────────────────────────────── */}
      <button className="fmt-btn"
        title="Bullet list  (⌘⇧8)" onClick={() => onFormat('ul')}>•</button>
      <button className="fmt-btn"
        title="Numbered list  (⌘⇧7)" onClick={() => onFormat('ol')}>1.</button>
      <button className="fmt-btn"
        title="Todo item  (⌘⇧T)" onClick={() => onFormat('todo')}>☐</button>
    </div>
  )

  return createPortal(bubble, document.body)
}
