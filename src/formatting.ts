import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

export type FormatType = 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'bold'|'italic'|'ul'|'ol'|'todo'

/**
 * Apply a markdown formatting operation to the editor view.
 * Toggles: applying again removes the formatting.
 */
export function applyFormatting(view: EditorView, type: FormatType): boolean {
  const state = view.state
  const sel   = state.selection.main

  // ── Inline: bold / italic ──────────────────────────────────────────────────
  if (type === 'bold' || type === 'italic') {
    const marker   = type === 'bold' ? '**' : '_'
    const selected = state.sliceDoc(sel.from, sel.to)
    const wrapped  = selected.startsWith(marker) && selected.endsWith(marker)
                     && selected.length > marker.length * 2

    if (wrapped) {
      // Unwrap
      const inner = selected.slice(marker.length, -marker.length)
      view.dispatch({
        changes:   { from: sel.from, to: sel.to, insert: inner },
        selection: EditorSelection.range(sel.from, sel.from + inner.length),
      })
    } else {
      const text   = selected || 'text'
      const insert = `${marker}${text}${marker}`
      view.dispatch({
        changes:   { from: sel.from, to: sel.to, insert },
        selection: EditorSelection.range(
          sel.from + marker.length,
          sel.from + marker.length + text.length,
        ),
      })
    }
    view.focus()
    return true
  }

  // ── Block: headings ────────────────────────────────────────────────────────
  if (type.startsWith('h') && '123456'.includes(type[1])) {
    const level    = parseInt(type[1])
    const prefix   = '#'.repeat(level) + ' '
    const fromLine = state.doc.lineAt(sel.from)
    const toLine   = state.doc.lineAt(sel.to)
    const changes: { from: number; to: number; insert: string }[] = []
    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line    = state.doc.line(i)
      const stripped = line.text.replace(/^#{1,6}\s+/, '')
      // Toggle: if already this heading level, remove heading
      if (line.text === prefix + stripped && stripped !== line.text) {
        changes.push({ from: line.from, to: line.to, insert: stripped })
      } else {
        changes.push({ from: line.from, to: line.to, insert: prefix + stripped })
      }
    }
    view.dispatch({ changes })
    view.focus()
    return true
  }

  // ── Block: lists ────────────────────────────────────────────────────────────
  if (type === 'ul' || type === 'ol' || type === 'todo') {
    const fromLine = state.doc.lineAt(sel.from)
    const toLine   = state.doc.lineAt(sel.to)
    const changes: { from: number; to: number; insert: string }[] = []

    for (let i = fromLine.number, num = 1; i <= toLine.number; i++, num++) {
      const line = state.doc.line(i)
      const alreadyUl   = type === 'ul'   && /^- (?!\[)/.test(line.text)
      const alreadyOl   = type === 'ol'   && /^\d+\. /.test(line.text)
      const alreadyTodo = type === 'todo' && /^- \[[ x]\] /.test(line.text)

      if (alreadyUl || alreadyOl || alreadyTodo) {
        // Toggle off
        const stripped = line.text.replace(/^(- \[[ x]\] |- (?!\[)|\d+\. )/, '')
        changes.push({ from: line.from, to: line.to, insert: stripped })
      } else {
        const pfx = type === 'ul' ? '- ' : type === 'ol' ? `${num}. ` : '- [ ] '
        changes.push({ from: line.from, to: line.from, insert: pfx })
      }
    }
    view.dispatch({ changes })
    view.focus()
    return true
  }

  return false
}
