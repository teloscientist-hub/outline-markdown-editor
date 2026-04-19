import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { EditorView, lineNumbers, keymap, Decoration, ViewPlugin } from '@codemirror/view'
import type { ViewUpdate, DecorationSet } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, HighlightStyle, syntaxTree } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { useDocumentStore } from '../../store/documentStore'
import { computeHiddenLines, getHeadingAtLine, getHeadingForLine } from '../../model/documentModel'
import { publishScroll, subscribeScroll } from '../../scrollSync'
import { applyFormatting } from '../../formatting'
import { setFormatter, clearFormatter } from '../../formatBus'
import type { FormatType } from '../../formatBus'
import { FormatBubble } from '../FormatBubble/FormatBubble'
import './MarkdownPane.css'

// ── MarkEdit-like highlight style ─────────────────────────────────────────────
const markEditStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.6em',  fontWeight: '700', color: 'var(--me-h1)' },
  { tag: tags.heading2, fontSize: '1.35em', fontWeight: '700', color: 'var(--me-h2)' },
  { tag: tags.heading3, fontSize: '1.15em', fontWeight: '600', color: 'var(--me-h3)' },
  { tag: tags.heading4, fontSize: '1.05em', fontWeight: '600', color: 'var(--me-h4)' },
  { tag: tags.heading5, fontWeight: '600',  color: 'var(--me-h4)' },
  { tag: tags.heading6, fontWeight: '600',  fontStyle: 'italic', color: 'var(--me-h4)' },
  { tag: tags.strong,   fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--me-strike)', opacity: '0.7' },
  { tag: tags.link, color: 'var(--me-link)' },
  { tag: tags.url,  color: 'var(--me-link)' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.88em', color: 'var(--me-code)' },
  { tag: tags.quote,  color: 'var(--me-quote)', fontStyle: 'italic' },
  { tag: tags.contentSeparator, color: 'var(--me-mark)' },
])

// ── Mark-dimmer ViewPlugin ────────────────────────────────────────────────────
const markDimmerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = this.build(view) }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view)
    }
    build(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const dimMark   = Decoration.mark({ class: 'cm-md-mark' })
      const codeBlock = Decoration.mark({ class: 'cm-inline-code' })
      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from, to,
          enter(node) {
            const n = node.type.name
            if (n === 'HeaderMark' || n === 'EmphasisMark' || n === 'CodeMark' ||
                n === 'LinkMark'   || n === 'QuoteMark'    || n === 'ListMark') {
              builder.add(node.from, node.to, dimMark)
            } else if (n === 'InlineCode') {
              builder.add(node.from, node.to, codeBlock)
            }
          },
        })
      }
      return builder.finish()
    }
  },
  { decorations: v => v.decorations }
)

// ── Hidden-lines plugin ───────────────────────────────────────────────────────
function makeHiddenLinesPlugin(getHidden: () => Set<number>) {
  const hiddenLine = Decoration.line({ class: 'cm-line-hidden' })
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) { this.decorations = this.build(view) }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.transactions.length > 0)
          this.decorations = this.build(update.view)
      }
      build(view: EditorView): DecorationSet {
        const hidden = getHidden()
        if (hidden.size === 0) return Decoration.none
        const builder = new RangeSetBuilder<Decoration>()
        for (let i = 1; i <= view.state.doc.lines; i++) {
          if (hidden.has(i - 1)) {
            const line = view.state.doc.line(i)
            builder.add(line.from, line.from, hiddenLine)
          }
        }
        return builder.finish()
      }
    },
    { decorations: v => v.decorations }
  )
}

// ── Editor theme ──────────────────────────────────────────────────────────────
const markEditTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: 'var(--color-editor-bg)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', height: '100%', fontFamily: 'inherit' },
  '.cm-content': {
    padding: '24px 0 48px',
    caretColor: 'var(--color-active)',
    lineHeight: '1.75',
    fontFamily: 'inherit',
  },
  '.cm-line': { padding: '0 48px 0 4px', maxWidth: '780px' },
  '.cm-gutters': {
    background: 'var(--color-editor-gutter)',
    borderRight: '1px solid var(--color-border)',
    width: '44px',
    minWidth: '44px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--color-text-muted)',
    fontSize: '11px',
    padding: '0 8px',
    opacity: '0.5',
    minWidth: '36px',
    textAlign: 'right',
  },
  '.cm-activeLine': { background: 'var(--color-editor-active-line)' },
  '.cm-activeLineGutter': { background: 'var(--color-editor-active-gutter)' },
  '.cm-selectionBackground, ::selection': { background: 'var(--color-selection) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--color-active)', borderLeftWidth: '2px' },
  '.cm-md-mark': { color: 'var(--me-mark) !important', fontWeight: 'normal !important' },
  '.cm-inline-code': { background: 'var(--me-code-bg)', borderRadius: '3px', padding: '0 2px' },
  '.cm-line-hidden': { display: 'none !important' },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function cmLineTop(view: EditorView, lineStart1: number): number {
  try {
    const line = view.state.doc.line(Math.max(1, Math.min(lineStart1, view.state.doc.lines)))
    return view.lineBlockAt(line.from).top
  } catch { return 0 }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MarkdownPane() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef   = useRef<EditorView | null>(null)

  const activeHeadingRef  = useRef<string | null>(null)
  const suppressScrollRef = useRef(false)
  const suppressTimerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hiddenLinesRef    = useRef<Set<number>>(new Set())

  // Bubble: null = hidden, {x,y} = visible at viewport position
  const [bubble, setBubble] = useState<{ x: number; y: number; level: number } | null>(null)

  const {
    content,
    headings, foldedIds,
    activeHeadingId,
    headingsOnlyMode, depthMode,
    promoteSectionById, demoteSectionById,
    moveSectionUp, moveSectionDown,
  } = useDocumentStore()

  const hiddenLines = useMemo(
    () => computeHiddenLines(content, headings, foldedIds, depthMode, headingsOnlyMode),
    [content, headings, foldedIds, depthMode, headingsOnlyMode]
  )
  hiddenLinesRef.current = hiddenLines

  const structuralKeymap = useCallback(() => keymap.of([
    {
      key: 'Mod-[', preventDefault: true,
      run(view) {
        const idx = view.state.doc.lineAt(view.state.selection.main.head).number - 1
        const h = getHeadingForLine(useDocumentStore.getState().headings, idx)
        if (h) promoteSectionById(h.id); return true
      },
    },
    {
      key: 'Mod-]', preventDefault: true,
      run(view) {
        const idx = view.state.doc.lineAt(view.state.selection.main.head).number - 1
        const h = getHeadingForLine(useDocumentStore.getState().headings, idx)
        if (h) demoteSectionById(h.id); return true
      },
    },
    {
      key: 'Alt-ArrowUp', preventDefault: true,
      run(view) {
        const idx = view.state.doc.lineAt(view.state.selection.main.head).number - 1
        const h = getHeadingForLine(useDocumentStore.getState().headings, idx)
        if (h) moveSectionUp(h.id); return true
      },
    },
    {
      key: 'Alt-ArrowDown', preventDefault: true,
      run(view) {
        const idx = view.state.doc.lineAt(view.state.selection.main.head).number - 1
        const h = getHeadingForLine(useDocumentStore.getState().headings, idx)
        if (h) moveSectionDown(h.id); return true
      },
    },
  ]), [promoteSectionById, demoteSectionById, moveSectionUp, moveSectionDown])

  // ── Format keymap (in-editor shortcuts) ──────────────────────────────────
  const formatKeymap = useCallback(() => keymap.of([
    { key: 'Mod-b', preventDefault: true, run: (v) => { applyFormatting(v, 'bold');   return true } },
    { key: 'Mod-i', preventDefault: true, run: (v) => { applyFormatting(v, 'italic'); return true } },
    { key: 'Mod-Alt-1', preventDefault: true, run: (v) => { applyFormatting(v, 'h1'); return true } },
    { key: 'Mod-Alt-2', preventDefault: true, run: (v) => { applyFormatting(v, 'h2'); return true } },
    { key: 'Mod-Alt-3', preventDefault: true, run: (v) => { applyFormatting(v, 'h3'); return true } },
    { key: 'Mod-Alt-4', preventDefault: true, run: (v) => { applyFormatting(v, 'h4'); return true } },
    { key: 'Mod-Alt-5', preventDefault: true, run: (v) => { applyFormatting(v, 'h5'); return true } },
    { key: 'Mod-Alt-6', preventDefault: true, run: (v) => { applyFormatting(v, 'h6'); return true } },
    { key: 'Mod-Shift-8', preventDefault: true, run: (v) => { applyFormatting(v, 'ul');   return true } },
    { key: 'Mod-Shift-7', preventDefault: true, run: (v) => { applyFormatting(v, 'ol');   return true } },
    { key: 'Mod-Shift-t', preventDefault: true, run: (v) => { applyFormatting(v, 'todo'); return true } },
  ]), [])

  // ── Create editor (once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return

    const scrollSyncExt = EditorView.domEventHandlers({
      scroll(_e, view) {
        if (suppressScrollRef.current) return false
        const dom = view.scrollDOM
        const scrollTop = Math.max(0, dom.scrollTop)
        const hs = useDocumentStore.getState().headings

        let prevH: typeof hs[0] | null = null
        let nextH: typeof hs[0] | null = null
        if (hs.length > 0) {
          let lineNum = 0
          try { lineNum = view.state.doc.lineAt(view.lineBlockAtHeight(scrollTop).from).number - 1 }
          catch { lineNum = 0 }
          for (let i = 0; i < hs.length; i++) {
            if (hs[i].lineStart <= lineNum) prevH = hs[i]
            else { nextH = hs[i]; break }
          }
        }

        let startTop = 0, endTop = dom.scrollHeight
        if (prevH) startTop = cmLineTop(view, prevH.lineStart + 1)
        if (nextH) endTop   = cmLineTop(view, nextH.lineStart + 1)

        const sectionH = endTop - startTop
        const ratio = sectionH > 0
          ? Math.max(0, Math.min(1, (scrollTop - startTop) / sectionH)) : 0

        publishScroll('markdown', {
          prevHeadingId: prevH?.id ?? null,
          nextHeadingId: nextH?.id ?? null,
          ratio,
        })

        if (prevH && prevH.id !== activeHeadingRef.current) {
          activeHeadingRef.current = prevH.id
          useDocumentStore.getState().setActiveHeading(prevH.id)
        }
        return false
      },
    })

    const view = new EditorView({
      doc: content,
      extensions: [
        history(),
        lineNumbers(),
        makeHiddenLinesPlugin(() => hiddenLinesRef.current),
        markDimmerPlugin,
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(markEditStyle),
        markEditTheme,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        structuralKeymap(),
        formatKeymap(),
        scrollSyncExt,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            useDocumentStore.getState().setContent(update.state.doc.toString(), true)
          }
          if (update.selectionSet || update.docChanged) {
            const sel  = update.state.selection.main
            const line = update.state.doc.lineAt(sel.head)
            useDocumentStore.getState().setCursorPos(line.number - 1, sel.head - line.from)
            const found = getHeadingAtLine(useDocumentStore.getState().headings, line.number - 1)
            if (found && found.id !== activeHeadingRef.current) {
              activeHeadingRef.current = found.id
              useDocumentStore.getState().setActiveHeading(found.id)
            }

            // ── Bubble: show on non-empty selection ────────────────────────
            if (!sel.empty) {
              const coords = update.view.coordsAtPos(sel.from)
              if (coords) {
                const editorRect = editorRef.current?.getBoundingClientRect()
                const bubbleX = editorRect
                  ? editorRect.left + editorRect.width / 2
                  : coords.left
                // Detect heading level of the cursor line for the select
                const cursorLine = update.state.doc.lineAt(sel.from)
                const hMatch = cursorLine.text.match(/^(#{1,6})\s/)
                const headingLevel = hMatch ? hMatch[1].length : 0
                requestAnimationFrame(() =>
                  setBubble({ x: bubbleX, y: coords.top, level: headingLevel })
                )
              }
            } else {
              setBubble(null)
            }
          }
        }),
        EditorView.lineWrapping,
      ],
      parent: editorRef.current,
    })
    viewRef.current = view

    // Register this view's formatter with the format bus
    setFormatter((type: FormatType) => applyFormatting(view, type))

    return () => {
      clearFormatter()
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Trigger plugin refresh when fold/visibility state changes ─────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: [] })
    view.requestMeasure()
  }, [hiddenLines])

  // ── Sync content from outside ─────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      const anchor = Math.min(view.state.selection.main.anchor, content.length)
      view.dispatch({ changes: { from: 0, to: current.length, insert: content }, selection: { anchor } })
    }
  }, [content])

  // ── Incoming scroll from Display pane ────────────────────────────────────
  useEffect(() => {
    return subscribeScroll('markdown', (pos) => {
      if (suppressScrollRef.current) return
      const view = viewRef.current
      if (!view) return
      const dom = view.scrollDOM
      const hs = useDocumentStore.getState().headings
      let startTop = 0, endTop = dom.scrollHeight
      if (pos.prevHeadingId) {
        const h = hs.find(x => x.id === pos.prevHeadingId)
        if (h) startTop = cmLineTop(view, h.lineStart + 1)
      }
      if (pos.nextHeadingId) {
        const h = hs.find(x => x.id === pos.nextHeadingId)
        if (h) endTop = cmLineTop(view, h.lineStart + 1)
      }
      const targetTop = startTop + pos.ratio * Math.max(0, endTop - startTop)
      suppressScrollRef.current = true
      clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 150)
      dom.scrollTop = Math.max(0, targetTop)
    })
  }, [])

  // ── Scroll to active heading (outline click) ──────────────────────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view || !activeHeadingId || activeHeadingId === activeHeadingRef.current) return
    const heading = headings.find(h => h.id === activeHeadingId)
    if (!heading) return
    const lineNum = heading.lineStart + 1
    if (lineNum > view.state.doc.lines) return
    const line = view.state.doc.line(lineNum)
    suppressScrollRef.current = true
    clearTimeout(suppressTimerRef.current)
    suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 300)
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 40 }),
    })
    activeHeadingRef.current = activeHeadingId
  }, [activeHeadingId, headings])

  return (
    <div className="markdown-pane">
      <div ref={editorRef} className="cm-editor-wrapper" />
      {bubble && (
        <FormatBubble
          x={bubble.x}
          y={bubble.y}
          headingLevel={bubble.level}
          onFormat={(type) => {
            const view = viewRef.current
            if (view) applyFormatting(view, type)
          }}
        />
      )}
    </div>
  )
}
