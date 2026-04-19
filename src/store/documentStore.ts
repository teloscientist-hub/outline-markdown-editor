import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HeadingNode } from '../model/documentModel'
import { parseHeadings, moveSection, changeSectionLevel, moveSectionVertical } from '../model/documentModel'

const SAMPLE_DOCUMENT = `# Welcome to Outline Markdown Editor

A tri-pane Markdown editor with real outline control. Use the **Outline** pane on the left to navigate and restructure your document, the **Markdown** pane in the center to write, and the **Display** pane on the right to see the rendered result.

## Getting Started

- **Open a file** — File › Open (⌘O), or drag a .md file onto the dock icon
- **New window** — File › New Window (⌘N) opens an independent window
- **Recent files** — File › Open Recent shows your last 10 files
- **Save** — ⌘S saves; the app also auto-saves 2 seconds after you stop typing

> 📖 For a full guide, open **Help › User's Manual** from the menu bar.

## The Three Panes

### Outline Pane (left)
The outline shows every heading in your document as a collapsible tree.

- Click a heading to jump to it in the editor and preview
- Click the **▶** triangle to fold a section — it hides in all three panes at once
- Use the **depth selector** to filter which heading levels are visible
- **Tab** demotes a heading one level; **Shift+Tab** promotes it
- **Drag headings** to reorder entire sections

### Markdown Pane (center)
A full-featured CodeMirror editor with markdown syntax highlighting.

- **Select text** to see the floating format toolbar appear above your selection
- **Format menu** (or keyboard shortcuts) to apply headings, bold, italic, lists

| Shortcut | Action |
|---|---|
| ⌘B / ⌘I | Bold / Italic |
| ⌘⌥1–6 | Heading 1–6 |
| ⌘⇧8 / ⌘⇧7 | Bullet / Numbered list |
| ⌘⇧T | Todo item |
| ⌘[ / ⌘] | Promote / Demote heading |
| ⌥↑ / ⌥↓ | Move section up / down |

### Display Pane (right)
Rendered preview with full GitHub Flavored Markdown support — tables, task lists, strikethrough, and more. Scrolls in sync with the Markdown pane.

## Pane Controls

| Shortcut | Action |
|---|---|
| ⌘1 | Toggle Outline pane |
| ⌘2 | Toggle Markdown pane |
| ⌘3 | Toggle Display pane |
| ⌘0 | Show all panes |

Drag the dividers between panes to resize them.

## Help

Open **Help › Feature Overview** for a complete feature reference, or **Help › User's Manual** for step-by-step instructions on every feature.
`

export type DepthMode = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DocumentState {
  // Content
  content: string
  filePath: string | null
  isDirty: boolean

  // Structural state (derived, kept in sync)
  headings: HeadingNode[]

  // Fold state
  foldedIds: Set<string>

  // Depth mode: 0 = show all, 1..6 = show H1..HN
  depthMode: DepthMode

  // Pane visibility
  showOutline: boolean
  showMarkdown: boolean
  showDisplay: boolean

  // Navigation
  activeHeadingId: string | null

  // View mode: headings-only at specified depth (false = show all)
  headingsOnlyMode: boolean

  // Cursor
  cursorLine: number
  cursorCol: number

  // Theme
  theme: 'system' | 'light' | 'dark'

  // Word / char count
  wordCount: number
  charCount: number

  // Actions
  setContent: (content: string, fromEditor?: boolean) => void
  loadFile: (filePath: string, content: string) => void
  newFile: () => void
  markSaved: (filePath: string) => void

  toggleFold: (id: string) => void
  foldAll: () => void
  unfoldAll: () => void
  foldBelowDepth: (depth: number) => void
  setFoldedIds: (ids: Set<string>) => void

  setDepthMode: (mode: DepthMode) => void

  toggleOutline: () => void
  toggleMarkdown: () => void
  toggleDisplay: () => void
  showAllPanes: () => void

  setActiveHeading: (id: string | null) => void
  moveSection: (fromId: string, toId: string, placement: 'before' | 'after') => void
  promoteSectionById: (id: string) => void
  demoteSectionById: (id: string) => void
  moveSectionUp: (id: string) => void
  moveSectionDown: (id: string) => void

  setHeadingsOnlyMode: (v: boolean) => void
  // Set both headingsOnlyMode + depthMode in one call (for the unified View selector)
  setViewMode: (headingsOnly: boolean, depth: DepthMode) => void

  setCursorLine: (line: number) => void
  setCursorPos: (line: number, col: number) => void
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  updateWordCount: (text: string) => void
}

// Determine initial document content from the synchronous preload info,
// so the correct content is shown from the very first render — no flash.
function getInitialDoc(): { content: string; filePath: string | null } {
  if (typeof window !== 'undefined') {
    const info = (window as Window & { electronAPI?: { initialInfo?: { type: string; filePath?: string | null; content?: string | null } } })
      .electronAPI?.initialInfo
    if (info) {
      if (info.type === 'file' && info.filePath && info.content != null)
        return { content: info.content, filePath: info.filePath }
      if (info.type === 'blank')
        return { content: '', filePath: null }
    }
  }
  return { content: SAMPLE_DOCUMENT, filePath: null }
}

const _init = getInitialDoc()

export const useDocumentStore = create<DocumentState>()(
  subscribeWithSelector((set, get) => ({
    content: _init.content,
    filePath: _init.filePath,
    isDirty: false,
    headings: parseHeadings(_init.content),
    wordCount: _init.content.trim() ? _init.content.trim().split(/\s+/).length : 0,
    charCount: _init.content.length,
    foldedIds: new Set<string>(),
    depthMode: 0,
    showOutline: true,
    showMarkdown: true,
    showDisplay: true,
    activeHeadingId: null,
    headingsOnlyMode: false,
    cursorLine: 0,
    cursorCol: 0,
    theme: 'system',

    setContent: (content, _fromEditor = false) => {
      const words = content.trim() ? content.trim().split(/\s+/).length : 0
      set({
        content,
        headings: parseHeadings(content),
        isDirty: true,
        wordCount: words,
        charCount: content.length,
      })
    },

    loadFile: (filePath, content) => {
      set({
        content,
        filePath,
        isDirty: false,
        headings: parseHeadings(content),
        foldedIds: new Set<string>(),
        activeHeadingId: null,
        headingsOnlyMode: false,
        cursorLine: 0,
        cursorCol: 0,
      })
    },

    newFile: () => {
      set({
        content: '',
        filePath: null,
        isDirty: false,
        headings: [],
        foldedIds: new Set<string>(),
        activeHeadingId: null,
        headingsOnlyMode: false,
        cursorLine: 0,
        cursorCol: 0,
      })
    },

    markSaved: (filePath) => set({ filePath, isDirty: false }),

    toggleFold: (id) => {
      const { foldedIds } = get()
      const next = new Set(foldedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      set({ foldedIds: next })
    },

    foldAll: () => {
      const { headings } = get()
      set({ foldedIds: new Set(headings.map(h => h.id)) })
    },

    unfoldAll: () => set({ foldedIds: new Set<string>() }),

    foldBelowDepth: (depth) => {
      const { headings } = get()
      set({ foldedIds: new Set(headings.filter(h => h.level >= depth).map(h => h.id)) })
    },

    setFoldedIds: (ids) => set({ foldedIds: ids }),

    setDepthMode: (mode) => set({ depthMode: mode }),

    setViewMode: (headingsOnly, depth) => {
      if (depth === 0) {
        // "Show All" — clear everything, show all content
        set({ foldedIds: new Set<string>(), depthMode: 0, headingsOnlyMode: false })
      } else {
        // Filtered mode — let computeHiddenLines handle depth + headingsOnly.
        // Clear foldedIds so the user starts with a clean fold state they control.
        set({ foldedIds: new Set<string>(), depthMode: depth as DepthMode, headingsOnlyMode: headingsOnly })
      }
    },

    toggleOutline: () => {
      const { showOutline, showMarkdown, showDisplay } = get()
      const next = !showOutline
      if (!next && !showMarkdown && !showDisplay) return
      set({ showOutline: next })
    },

    toggleMarkdown: () => {
      const { showOutline, showMarkdown, showDisplay } = get()
      const next = !showMarkdown
      if (!next && !showOutline && !showDisplay) return
      set({ showMarkdown: next })
    },

    toggleDisplay: () => {
      const { showOutline, showMarkdown, showDisplay } = get()
      const next = !showDisplay
      if (!next && !showOutline && !showMarkdown) return
      set({ showDisplay: next })
    },

    showAllPanes: () => set({ showOutline: true, showMarkdown: true, showDisplay: true }),

    setActiveHeading: (id) => set({ activeHeadingId: id }),

    setHeadingsOnlyMode: (v) => set({ headingsOnlyMode: v }),

    setCursorLine: (line) => set({ cursorLine: line }),
    setCursorPos: (line, col) => set({ cursorLine: line, cursorCol: col }),
    setTheme: (theme) => set({ theme }),
    updateWordCount: (text) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      set({ wordCount: words, charCount: text.length })
    },

    promoteSectionById: (id) => {
      const { content, headings, foldedIds } = get()
      const newContent = changeSectionLevel(content, headings, id, -1)
      const newHeadings = parseHeadings(newContent)
      // Unfold the heading itself after promotion so it's always visible
      const newFoldedIds = new Set(foldedIds)
      newFoldedIds.delete(id)
      set({ content: newContent, headings: newHeadings, isDirty: true, foldedIds: newFoldedIds })
    },

    demoteSectionById: (id) => {
      const { content, headings, depthMode, foldedIds } = get()
      const newContent = changeSectionLevel(content, headings, id, 1)
      const newHeadings = parseHeadings(newContent)

      // Find the heading's new level after demotion
      const newHeading = newHeadings.find(h => h.id === id)
      const origHeading = headings.find(h => h.id === id)
      const newLevel = newHeading?.level ?? (origHeading ? origHeading.level + 1 : 2)

      // If depthMode would hide the demoted heading, expand it to include the new level.
      // This keeps other headings at that level hidden (their parent H1s are still folded)
      // while making only this heading visible — exactly like Word's outline behaviour.
      let newDepthMode: DepthMode = depthMode
      if (depthMode > 0 && newLevel > depthMode) {
        newDepthMode = Math.min(6, newLevel) as DepthMode
      }

      // Unfold the heading itself and all its ancestors so it becomes visible
      const newFoldedIds = new Set(foldedIds)
      newFoldedIds.delete(id)
      if (newHeading) {
        let pid = newHeading.parentId
        while (pid) {
          newFoldedIds.delete(pid)
          const parent = newHeadings.find(h => h.id === pid)
          pid = parent?.parentId ?? null
        }
      }

      set({
        content: newContent,
        headings: newHeadings,
        isDirty: true,
        depthMode: newDepthMode,
        foldedIds: newFoldedIds,
      })
    },

    moveSectionUp: (id) => {
      const { content, headings } = get()
      const newContent = moveSectionVertical(content, headings, id, 'up')
      if (newContent) set({ content: newContent, headings: parseHeadings(newContent), isDirty: true })
    },

    moveSectionDown: (id) => {
      const { content, headings } = get()
      const newContent = moveSectionVertical(content, headings, id, 'down')
      if (newContent) set({ content: newContent, headings: parseHeadings(newContent), isDirty: true })
    },

    moveSection: (fromId, toId, placement) => {
      const { content, headings } = get()
      const newContent = moveSection(content, headings, fromId, toId, placement)
      set({
        content: newContent,
        headings: parseHeadings(newContent),
        isDirty: true,
      })
    },
  }))
)
