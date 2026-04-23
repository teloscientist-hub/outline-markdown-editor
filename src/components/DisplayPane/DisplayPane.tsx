import { useRef, useEffect, useLayoutEffect, useMemo, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TurndownService from 'turndown'
import { useDocumentStore } from '../../store/documentStore'
import { computeHiddenLines } from '../../model/documentModel'
import { publishScroll, subscribeScroll } from '../../scrollSync'
import { applyFormat } from '../../formatBus'
import type { FormatType } from '../../formatBus'
import { FormatBubble } from '../FormatBubble/FormatBubble'
import './DisplayPane.css'

interface BubbleState { x: number; y: number; headingLevel: number }

// ── Turndown instance (module-level, created once) ────────────────────────────
const td = new TurndownService({
  headingStyle:    'atx',
  bulletListMarker: '-',
  codeBlockStyle:  'fenced',
  hr:              '---',
  strongDelimiter: '**',
  emDelimiter:     '*',
})
// Ignore custom data attributes and class names — just convert the element
td.addRule('passthrough-attrs', {
  filter: ['h1','h2','h3','h4','h5','h6'],
  replacement(content, node) {
    const level = parseInt((node as HTMLElement).tagName[1], 10)
    const hashes = '#'.repeat(level)
    return `\n\n${hashes} ${content.trim()}\n\n`
  },
})

// ── Component ─────────────────────────────────────────────────────────────────
export function DisplayPane() {
  const {
    content, headings, foldedIds, depthMode, headingsOnlyMode,
    activeHeadingId, setActiveHeading,
  } = useDocumentStore()

  const scrollRef    = useRef<HTMLDivElement>(null)   // outer scroll container
  const shadowRef    = useRef<HTMLDivElement>(null)   // hidden ReactMarkdown render target
  const editableRef  = useRef<HTMLDivElement>(null)   // visible contenteditable div

  const activeHeadingRef  = useRef<string | null>(null)
  const suppressScrollRef = useRef(false)
  const suppressTimerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isEditingRef      = useRef(false)  // true while display pane is focused
  const inputTimerRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [bubble, setBubble] = useState<BubbleState | null>(null)

  // ── Visible content (fold / depth filtering) ──────────────────────────────
  const visibleContent = useMemo(() => {
    if (foldedIds.size === 0 && depthMode === 0 && !headingsOnlyMode) return content
    const hidden = computeHiddenLines(content, headings, foldedIds, depthMode, headingsOnlyMode)
    return content.split('\n')
      .map((line, i) => (hidden.has(i) ? null : line))
      .filter(l => l !== null)
      .join('\n')
  }, [content, headings, foldedIds, depthMode, headingsOnlyMode])

  // ── Shadow → editable copy (runs synchronously before paint) ─────────────
  // Only updates the editable div when content changed from outside
  // (i.e., the user is NOT currently typing in the display pane).
  useLayoutEffect(() => {
    if (isEditingRef.current) return
    const shadow   = shadowRef.current
    const editable = editableRef.current
    if (!shadow || !editable) return
    editable.innerHTML = shadow.innerHTML
  }, [visibleContent])

  // ── Input handler: HTML → Markdown ────────────────────────────────────────
  const handleInput = useCallback(() => {
    const editable = editableRef.current
    if (!editable) return
    clearTimeout(inputTimerRef.current)
    inputTimerRef.current = setTimeout(() => {
      const markdown = td.turndown(editable.innerHTML)
      useDocumentStore.getState().setContent(markdown)
    }, 400)
  }, [])

  const handleBlur = useCallback(() => {
    isEditingRef.current = false
    // Final flush on blur
    clearTimeout(inputTimerRef.current)
    const editable = editableRef.current
    if (!editable) return
    const markdown = td.turndown(editable.innerHTML)
    if (markdown !== useDocumentStore.getState().content) {
      useDocumentStore.getState().setContent(markdown)
    }
  }, [])

  // ── Format bubble ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = (_e: MouseEvent) => {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || sel.toString().trim() === '') { setBubble(null); return }
        const container = editableRef.current || scrollRef.current
        if (!container) return
        const range = sel.getRangeAt(0)
        if (!container.contains(range.commonAncestorContainer)) { setBubble(null); return }
        const anchorEl = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as HTMLElement)
          : range.startContainer.parentElement
        const headingEl = anchorEl?.closest('h1,h2,h3,h4,h5,h6')
        const headingLevel = headingEl ? parseInt(headingEl.tagName[1], 10) : 0
        const rect = range.getBoundingClientRect()
        setBubble({ x: rect.left + rect.width / 2, y: rect.top - 8, headingLevel })
      }, 0)
    }
    const handleMouseDown = (_e: MouseEvent) => {
      if ((_e.target as HTMLElement).closest('.fmt-bubble')) return
      setBubble(null)
    }
    const handleKeyDown = () => setBubble(null)
    document.addEventListener('mouseup',   handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown',   handleKeyDown)
    return () => {
      document.removeEventListener('mouseup',   handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown',   handleKeyDown)
    }
  }, [])

  const handleFormat = useCallback((type: FormatType) => {
    applyFormat(type); setBubble(null)
  }, [])

  // ── Heading click (event delegation) ─────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent) => {
    const headingEl = (e.target as HTMLElement).closest('[data-heading-id]')
    if (headingEl) {
      const id = headingEl.getAttribute('data-heading-id')
      if (id) setActiveHeading(id)
    }
  }, [setActiveHeading])

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const getAbsTop = useCallback((el: HTMLElement): number => {
    const container = scrollRef.current
    if (!container) return 0
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  }, [])

  const handleScroll = useCallback(() => {
    if (suppressScrollRef.current || !scrollRef.current || !editableRef.current) return
    const container  = scrollRef.current
    const editable   = editableRef.current
    const scrollTop  = container.scrollTop
    const headingEls = Array.from(editable.querySelectorAll<HTMLElement>('[data-heading-id]'))

    let prevEl: HTMLElement | null = null
    let nextEl: HTMLElement | null = null
    for (const el of headingEls) {
      const absTop = getAbsTop(el)
      if (absTop <= scrollTop + 1) prevEl = el
      else if (!nextEl) nextEl = el
    }

    const prevId = prevEl?.getAttribute('data-heading-id') ?? null
    const nextId = nextEl?.getAttribute('data-heading-id') ?? null

    let ratio = 0
    if (headingEls.length === 0) {
      const maxScroll = container.scrollHeight - container.clientHeight
      ratio = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0
    } else {
      const startTop = prevEl ? getAbsTop(prevEl) : 0
      const endTop   = nextEl ? getAbsTop(nextEl) : container.scrollHeight
      const sectionH = endTop - startTop
      ratio = sectionH > 0 ? Math.max(0, Math.min(1, (scrollTop - startTop) / sectionH)) : 0
    }

    publishScroll('display', { prevHeadingId: prevId, nextHeadingId: nextId, ratio })

    if (prevId && prevId !== activeHeadingRef.current) {
      activeHeadingRef.current = prevId
      setActiveHeading(prevId)
    }
  }, [setActiveHeading, getAbsTop])

  // ── Incoming scroll from Markdown pane ───────────────────────────────────
  useEffect(() => {
    return subscribeScroll('display', (pos) => {
      if (suppressScrollRef.current || !scrollRef.current || !editableRef.current) return
      const container = scrollRef.current
      const editable  = editableRef.current
      let startTop = 0, endTop = container.scrollHeight
      if (pos.prevHeadingId) {
        const el = editable.querySelector<HTMLElement>(`[data-heading-id="${pos.prevHeadingId}"]`)
        if (el) startTop = getAbsTop(el)
      }
      if (pos.nextHeadingId) {
        const el = editable.querySelector<HTMLElement>(`[data-heading-id="${pos.nextHeadingId}"]`)
        if (el) endTop = getAbsTop(el)
      }
      const targetTop = (!pos.prevHeadingId && !pos.nextHeadingId)
        ? pos.ratio * Math.max(0, container.scrollHeight - container.clientHeight)
        : startTop + pos.ratio * Math.max(0, endTop - startTop)
      suppressScrollRef.current = true
      clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 150)
      container.scrollTop = Math.max(0, targetTop)
    })
  }, [getAbsTop])

  // ── Scroll to active heading (outline click) ──────────────────────────────
  useEffect(() => {
    if (!activeHeadingId || !scrollRef.current || !editableRef.current) return
    if (activeHeadingId === activeHeadingRef.current) return
    const el = editableRef.current.querySelector<HTMLElement>(`[data-heading-id="${activeHeadingId}"]`)
    if (!el) return
    suppressScrollRef.current = true
    clearTimeout(suppressTimerRef.current)
    suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 300)
    activeHeadingRef.current = activeHeadingId
    scrollRef.current.scrollTop = Math.max(0, getAbsTop(el) - 24)
  }, [activeHeadingId, getAbsTop])

  // ── Shadow heading components (add data-heading-id, no click handler) ─────
  const shadowComponents = useMemo(() => {
    function makeH(level: number) {
      const Tag = `h${level}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'
      return ({ children, ...props }: { children?: React.ReactNode }) => {
        const text = reactChildrenToText(children)
        const heading = headings.find(h => h.level === level && normalizeText(h.text) === normalizeText(text))
        return <Tag {...props} data-heading-id={heading?.id} className="display-heading">{children}</Tag>
      }
    }
    return { h1: makeH(1), h2: makeH(2), h3: makeH(3), h4: makeH(4), h5: makeH(5), h6: makeH(6) }
  }, [headings])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden shadow renderer — ReactMarkdown writes here; we copy innerHTML to the editable div */}
      <div ref={shadowRef} style={{ display: 'none' }} aria-hidden="true">
        <div className="display-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={shadowComponents}>
            {visibleContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Scrollable container */}
      <div className="display-pane" ref={scrollRef} onScroll={handleScroll}>
        {/* Editable WYSIWYG surface — innerHTML managed by shadow copy + turndown */}
        <div
          ref={editableRef}
          className="display-content display-editable"
          contentEditable={true}
          suppressContentEditableWarning={true}
          onFocus={() => { isEditingRef.current = true }}
          onBlur={handleBlur}
          onInput={handleInput}
          onClick={handleClick}
          spellCheck={true}
        />
      </div>

      {bubble && createPortal(
        <FormatBubble
          x={bubble.x}
          y={bubble.y}
          headingLevel={bubble.headingLevel}
          onFormat={handleFormat}
        />,
        document.body
      )}
    </>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function normalizeText(s: React.ReactNode): string {
  return reactChildrenToText(s).toLowerCase().trim().replace(/\s+/g, ' ')
}
function reactChildrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(reactChildrenToText).join('')
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return reactChildrenToText((children as React.ReactElement<{children: React.ReactNode}>).props.children)
  }
  return ''
}
