import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HeadingNode } from '../model/documentModel'
import { parseHeadings, moveSection, changeSectionLevel, moveSectionVertical } from '../model/documentModel'

const SAMPLE_DOCUMENT = `![Outline Markdown Editor](app-icon-128.png)

# Welcome to Outline Markdown Editor

A tri-pane Markdown editor with real outline control.

## Getting Started

Open a file from the **File** menu, or start typing here.

### Pane Controls

Use the toolbar buttons to toggle which panes are visible:
- **Outline** — structural tree of headings
- **Markdown** — raw source editor
- **Display** — rendered reading view

### Outline Depth

Use the depth selector to filter which heading levels appear.

## Features

### Folding

Click the triangle next to any heading in the outline to fold or unfold its section.
Folding propagates across all visible panes.

### Navigation

Click any heading in the outline to jump to it in the editor and display panes.

### Section Reordering

Drag headings in the outline to reorder sections. The full section content moves with the heading.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Cmd+1 | Toggle Outline |
| Cmd+2 | Toggle Markdown |
| Cmd+3 | Toggle Display |
| Cmd+O | Open file |
| Cmd+S | Save file |

## Tips

### Large Documents

Use the depth selector to work at a high level first, then drill down into specific sections.

### Writing Workflow

Start in the Outline pane to structure your document, then switch to Markdown for detailed writing, then check the Display pane for a clean reading view.
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

    setViewMode: (_headingsOnly, depth) => {
      const { headings } = get()
      if (depth === 0) {
        // "Show All" — unfold everything, clear any filter state
        set({ foldedIds: new Set<string>(), depthMode: 0, headingsOnlyMode: false })
      } else {
        // Fold all headings at level >= depth (Word-style temporal fold)
        // Headings shallower than `depth` are left as-is so user can navigate them
        const newFolded = new Set(
          headings
            .filter(h => h.level >= depth && h.sectionEnd > h.lineStart)
            .map(h => h.id)
        )
        // depthMode stored only for dropdown display — not used as a filter
        set({ foldedIds: newFolded, depthMode: depth as DepthMode, headingsOnlyMode: false })
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
