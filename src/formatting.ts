import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

export type FormatType =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'promote' | 'demote' | 'remove-heading'
  | 'bold' | 'italic'
  | 'ul' | 'ol' | 'todo'

/**
 * Apply a markdown formatting operation to the editor view.
 * Most formats toggle: applying again removes the formatting.
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

  // ── Block: set specific heading level ──────────────────────────────────────
  if (type.startsWith('h') && '123456'.includes(type[1])) {
    const level    = parseInt(type[1])
    const prefix   = '#'.repeat(level) + ' '
    const fromLine = state.doc.lineAt(sel.from)
    const toLine   = state.doc.lineAt(sel.to)
    const changes: { from: number; to: number; insert: string }[] = []
    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line     = state.doc.line(i)
      const stripped = line.text.replace(/^#{1,6}\s+/, '')
      // Toggle: if already this exact heading level, remove it
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

  // ── Block: promote heading (H3 → H2, fewer #'s) ───────────────────────────
  if (type === 'promote' || type === 'demote') {
    const fromLine = state.doc.lineAt(sel.from)
    const toLine   = state.doc.lineAt(sel.to)
    const changes: { from: number; to: number; insert: string }[] = []
    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line  = state.doc.line(i)
      const match = line.text.match(/^(#{1,6})\s/)
      if (!match) continue
      const level    = match[1].length
      const newLevel = type === 'promote'
        ? Math.max(1, level - 1)
        : Math.min(6, level + 1)
      if (newLevel === level) continue
      const stripped = line.text.replace(/^#{1,6}\s+/, '')
      changes.push({ from: line.from, to: line.to,
        insert: '#'.repeat(newLevel) + ' ' + stripped })
    }
    if (changes.length > 0) {
      view.dispatch({ changes })
      view.focus()
    }
    return true
  }

  // ── Block: remove heading prefix ───────────────────────────────────────────
  if (type === 'remove-heading') {
    const fromLine = state.doc.lineAt(sel.from)
    const toLine   = state.doc.lineAt(sel.to)
    const changes: { from: number; to: number; insert: string }[] = []
    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line     = state.doc.line(i)
      const stripped = line.text.replace(/^#{1,6}\s+/, '')
      if (stripped !== line.text)
        changes.push({ from: line.from, to: line.to, insert: stripped })
    }
    if (changes.length > 0) {
      view.dispatch({ changes })
      view.focus()
    }
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
