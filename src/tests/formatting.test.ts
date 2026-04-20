import { describe, it, expect } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { applyFormatting } from '../formatting'

/**
 * Create an EditorView with the given content and cursor/selection.
 * anchor/head are character offsets (0-based).
 */
function makeView(content: string, anchor: number, head?: number): EditorView {
  const state = EditorState.create({
    doc: content,
    selection: { anchor, head: head ?? anchor },
  })
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  return new EditorView({ state, parent })
}

/** Get resulting doc text after applying a format */
function applyAndGet(content: string, anchor: number, head: number | undefined, type: Parameters<typeof applyFormatting>[1]): string {
  const view = makeView(content, anchor, head)
  applyFormatting(view, type)
  const result = view.state.doc.toString()
  view.destroy()
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Bold
// ─────────────────────────────────────────────────────────────────────────────
describe('applyFormatting - bold', () => {
  it('wraps selected text with **', () => {
    // "hello" selected at offset 0..5
    const result = applyAndGet('hello world', 0, 5, 'bold')
    expect(result).toBe('**hello** world')
  })

  it('toggles off bold when selected text is wrapped with **', () => {
    // Select the whole "**hello**"
    const result = applyAndGet('**hello**', 0, 9, 'bold')
    expect(result).toBe('hello')
  })

  it('toggles off bold when markers are outside the selection', () => {
    // Doc is "**hello**", selection is the inner "hello" at 2..7
    const result = applyAndGet('**hello**', 2, 7, 'bold')
    expect(result).toBe('hello')
  })

  it('inserts placeholder "text" when no selection', () => {
    // cursor at position 0, no selection
    const result = applyAndGet('', 0, 0, 'bold')
    expect(result).toBe('**text**')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Italic
// ─────────────────────────────────────────────────────────────────────────────
describe('applyFormatting - italic', () => {
  it('wraps selected text with _', () => {
    const result = applyAndGet('hello', 0, 5, 'italic')
    expect(result).toBe('_hello_')
  })

  it('toggles off italic when selected text is wrapped with _', () => {
    const result = applyAndGet('_hello_', 0, 7, 'italic')
    expect(result).toBe('hello')
  })

  it('toggles off italic when markers are outside selection', () => {
    const result = applyAndGet('_hello_', 1, 6, 'italic')
    expect(result).toBe('hello')
  })

  it('inserts placeholder "text" when no selection', () => {
    const result = applyAndGet('', 0, 0, 'italic')
    expect(result).toBe('_text_')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Heading levels
// ─────────────────────────────────────────────────────────────────────────────
describe('applyFormatting - headings', () => {
  it('applies H1 to plain text line', () => {
    const result = applyAndGet('Hello', 0, 0, 'h1')
    expect(result).toBe('# Hello')
  })

  it('applies H2 to plain text line', () => {
    const result = applyAndGet('Hello', 0, 0, 'h2')
    expect(result).toBe('## Hello')
  })

  it('applies H3 to plain text line', () => {
    const result = applyAndGet('Hello', 0, 0, 'h3')
    expect(result).toBe('### Hello')
  })

  it('applies H4', () => {
    const result = applyAndGet('Hello', 0, 0, 'h4')
    expect(result).toBe('#### Hello')
  })

  it('applies H5', () => {
    const result = applyAndGet('Hello', 0, 0, 'h5')
    expect(result).toBe('##### Hello')
  })

  it('applies H6', () => {
    const result = applyAndGet('Hello', 0, 0, 'h6')
    expect(result).toBe('###### Hello')
  })

  it('toggles off heading when same level applied again', () => {
    // Applying H1 to an H1 line removes the heading
    const result = applyAndGet('# Hello', 0, 0, 'h1')
    expect(result).toBe('Hello')
  })

  it('replaces existing heading level with new one', () => {
    // Applying H2 to an H1 line changes to H2
    const result = applyAndGet('# Hello', 0, 0, 'h2')
    expect(result).toBe('## Hello')
  })

  it('applies heading to multiple lines in selection', () => {
    const doc = 'Line1\nLine2\nLine3'
    // Select from start of Line1 to end of Line2 (offset 0..11)
    const result = applyAndGet(doc, 0, 11, 'h1')
    expect(result).toBe('# Line1\n# Line2\nLine3')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Promote / Demote
// ─────────────────────────────────────────────────────────────────────────────
describe('applyFormatting - promote/demote', () => {
  it('promotes H2 to H1', () => {
    const result = applyAndGet('## Hello', 0, 0, 'promote')
    expect(result).toBe('# Hello')
  })

  it('promotes H3 to H2', () => {
    const result = applyAndGet('### Hello', 0, 0, 'promote')
    expect(result).toBe('## Hello')
  })

  it('does not promote below H1', () => {
    const result = applyAndGet('# Hello', 0, 0, 'promote')
    // No change, already H1
    expect(result).toBe('# Hello')
  })

  it('demotes H1 to H2', () => {
    const result = applyAndGet('# Hello', 0, 0, 'demote')
    expect(result).toBe('## Hello')
  })

  it('demotes H2 to H3', () => {
    const result = applyAndGet('## Hello', 0, 0, 'demote')
    expect(result).toBe('### Hello')
  })

  it('does not demote beyond H6', () => {
    const result = applyAndGet('###### Hello', 0, 0, 'demote')
    expect(result).toBe('###### Hello')
  })

  it('skips non-heading lines during promote', () => {
    // Plain text line — should remain unchanged
    const result = applyAndGet('plain text', 0, 0, 'promote')
    expect(result).toBe('plain text')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Lists
// ─────────────────────────────────────────────────────────────────────────────
describe('applyFormatting - bullet list (ul)', () => {
  it('adds bullet prefix to plain text', () => {
    const result = applyAndGet('Item', 0, 0, 'ul')
    expect(result).toBe('- Item')
  })

  it('toggles off bullet prefix', () => {
    const result = applyAndGet('- Item', 0, 0, 'ul')
    expect(result).toBe('Item')
  })

  it('adds bullet to multiple lines', () => {
    const doc = 'A\nB\nC'
    const result = applyAndGet(doc, 0, 5, 'ul')
    expect(result).toBe('- A\n- B\n- C')
  })

  it('does not toggle ul when line is a todo item', () => {
    // "- [ ] Item" should NOT be toggled off by ul (it's not a plain bullet)
    const result = applyAndGet('- [ ] Item', 0, 0, 'ul')
    // todo lines are not matched by alreadyUl (which uses /^- (?!\[)/)
    expect(result).toBe('- - [ ] Item')
  })
})

describe('applyFormatting - numbered list (ol)', () => {
  it('adds numbered prefix to plain text', () => {
    const result = applyAndGet('Item', 0, 0, 'ol')
    expect(result).toBe('1. Item')
  })

  it('toggles off numbered prefix', () => {
    const result = applyAndGet('1. Item', 0, 0, 'ol')
    expect(result).toBe('Item')
  })

  it('adds sequential numbers to multiple lines', () => {
    const doc = 'A\nB\nC'
    const result = applyAndGet(doc, 0, 5, 'ol')
    expect(result).toBe('1. A\n2. B\n3. C')
  })
})

describe('applyFormatting - todo list', () => {
  it('adds todo prefix to plain text', () => {
    const result = applyAndGet('Item', 0, 0, 'todo')
    expect(result).toBe('- [ ] Item')
  })

  it('toggles off todo prefix', () => {
    const result = applyAndGet('- [ ] Item', 0, 0, 'todo')
    expect(result).toBe('Item')
  })

  it('toggles off checked todo', () => {
    const result = applyAndGet('- [x] Item', 0, 0, 'todo')
    expect(result).toBe('Item')
  })

  it('adds todo to multiple lines', () => {
    const doc = 'A\nB'
    const result = applyAndGet(doc, 0, 3, 'todo')
    expect(result).toBe('- [ ] A\n- [ ] B')
  })
})
