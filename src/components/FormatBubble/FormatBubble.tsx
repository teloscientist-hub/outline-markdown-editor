import { createPortal } from 'react-dom'
import type { FormatType } from '../../formatBus'
import './FormatBubble.css'

interface Props {
  x: number          // viewport center-x of the bubble
  y: number          // viewport top-y of the selection (bubble appears above this)
  onFormat: (type: FormatType) => void
}

const BUTTONS: { type: FormatType; label: string; title: string }[] = [
  { type: 'h1',    label: 'H1',  title: 'Heading 1  (⌘⌥ 1)' },
  { type: 'h2',    label: 'H2',  title: 'Heading 2  (⌘⌥ 2)' },
  { type: 'h3',    label: 'H3',  title: 'Heading 3  (⌘⌥ 3)' },
  { type: 'bold',  label: 'B',   title: 'Bold  (⌘B)' },
  { type: 'italic',label: 'I',   title: 'Italic  (⌘I)' },
  { type: 'ul',    label: '•',   title: 'Bullet list  (⌘⇧ 8)' },
  { type: 'ol',    label: '1.',  title: 'Numbered list  (⌘⇧ 7)' },
  { type: 'todo',  label: '☐',  title: 'Todo  (⌘⇧T)' },
]

export function FormatBubble({ x, y, onFormat }: Props) {
  const bubble = (
    <div
      className="fmt-bubble"
      style={{ left: x, top: y }}
      // Prevent mousedown from stealing focus from the editor
      onMouseDown={e => e.preventDefault()}
    >
      {BUTTONS.map(btn => (
        <button
          key={btn.type}
          className={`fmt-btn fmt-btn--${btn.type}`}
          title={btn.title}
          onClick={() => onFormat(btn.type)}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
  return createPortal(bubble, document.body)
}
