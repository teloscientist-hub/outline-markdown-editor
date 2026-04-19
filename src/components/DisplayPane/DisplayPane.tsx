import { useRef, useEffect, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDocumentStore } from '../../store/documentStore'
import { computeHiddenLines } from '../../model/documentModel'
import { publishScroll, subscribeScroll } from '../../scrollSync'
import './DisplayPane.css'

export function DisplayPane() {
  const { content, headings, foldedIds, depthMode, headingsOnlyMode, activeHeadingId, setActiveHeading } =
    useDocumentStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeHeadingRef = useRef<string | null>(null)
  // true while we are programmatically scrolling — prevents echo back to markdown pane
  const suppressScrollRef = useRef(false)
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Build visible content: filter out hidden lines
  const visibleContent = useMemo(() => {
    if (foldedIds.size === 0 && depthMode === 0 && !headingsOnlyMode) return content
    const hidden = computeHiddenLines(content, headings, foldedIds, depthMode, headingsOnlyMode)
    const lines = content.split('\n')
    return lines
      .map((line, i) => (hidden.has(i) ? null : line))
      .filter(l => l !== null)
      .join('\n')
  }, [content, headings, foldedIds, depthMode, headingsOnlyMode])

  // ── Helper: absolute top of an element within the scroll container ───────────
  const getAbsTop = useCallback((el: HTMLElement): number => {
    const container = scrollRef.current
    if (!container) return 0
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  }, [])

  // ── Scroll event: compute ratio and publish to markdown pane ─────────────────
  const handleScroll = useCallback(() => {
    if (suppressScrollRef.current || !scrollRef.current) return
    const container = scrollRef.current
    const scrollTop = container.scrollTop

    const headingEls = Array.from(container.querySelectorAll<HTMLElement>('[data-heading-id]'))

    let prevEl: HTMLElement | null = null
    let nextEl: HTMLElement | null = null

    for (const el of headingEls) {
      const absTop = getAbsTop(el)
      // Element is at or above the current scroll position (with 1px epsilon)
      if (absTop <= scrollTop + 1) {
        prevEl = el
      } else if (!nextEl) {
        nextEl = el
      }
    }

    const prevId = prevEl?.getAttribute('data-heading-id') ?? null
    const nextId = nextEl?.getAttribute('data-heading-id') ?? null

    let ratio = 0
    if (headingEls.length === 0) {
      // No headings — use pure scroll percentage
      const maxScroll = container.scrollHeight - container.clientHeight
      ratio = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0
    } else {
      const startTop = prevEl ? getAbsTop(prevEl) : 0
      const endTop   = nextEl ? getAbsTop(nextEl) : container.scrollHeight
      const sectionH = endTop - startTop
      ratio = sectionH > 0 ? Math.max(0, Math.min(1, (scrollTop - startTop) / sectionH)) : 0
    }

    publishScroll('display', { prevHeadingId: prevId, nextHeadingId: nextId, ratio })

    // Update active heading for outline pane
    if (prevId && prevId !== activeHeadingRef.current) {
      activeHeadingRef.current = prevId
      setActiveHeading(prevId)
    }
  }, [setActiveHeading, getAbsTop])

  // ── Incoming scroll from Markdown pane ───────────────────────────────────────
  useEffect(() => {
    return subscribeScroll('display', (pos) => {
      if (suppressScrollRef.current || !scrollRef.current) return
      const container = scrollRef.current

      let startTop = 0
      let endTop = container.scrollHeight

      if (pos.prevHeadingId) {
        const el = container.querySelector<HTMLElement>(`[data-heading-id="${pos.prevHeadingId}"]`)
        if (el) startTop = getAbsTop(el)
      }
      if (pos.nextHeadingId) {
        const el = container.querySelector<HTMLElement>(`[data-heading-id="${pos.nextHeadingId}"]`)
        if (el) endTop = getAbsTop(el)
      }

      let targetTop: number
      if (!pos.prevHeadingId && !pos.nextHeadingId) {
        // Pure percentage (no headings in doc)
        targetTop = pos.ratio * Math.max(0, container.scrollHeight - container.clientHeight)
      } else {
        targetTop = startTop + pos.ratio * Math.max(0, endTop - startTop)
      }

      suppressScrollRef.current = true
      clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 150)

      container.scrollTop = Math.max(0, targetTop)
    })
  }, [getAbsTop])

  // ── Scroll to active heading (from outline pane click) ───────────────────────
  useEffect(() => {
    if (!activeHeadingId || !scrollRef.current) return
    if (activeHeadingId === activeHeadingRef.current) return
    const container = scrollRef.current
    const el = container.querySelector<HTMLElement>(`[data-heading-id="${activeHeadingId}"]`)
    if (!el) return

    suppressScrollRef.current = true
    clearTimeout(suppressTimerRef.current)
    suppressTimerRef.current = setTimeout(() => { suppressScrollRef.current = false }, 300)

    activeHeadingRef.current = activeHeadingId
    const targetTop = Math.max(0, getAbsTop(el) - 24)
    container.scrollTop = targetTop
  }, [activeHeadingId, getAbsTop])

  return (
    <div className="display-pane" ref={scrollRef} onScroll={handleScroll}>
      <div className="display-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => {
              const id = headingToId(children)
              const heading = headings.find(h => h.level === 1 && normalize(h.text) === normalize(String(children)))
              return (
                <h1
                  {...props}
                  id={id}
                  data-heading-id={heading?.id}
                  className="display-heading"
                  onClick={() => heading && setActiveHeading(heading.id)}
                >
                  {children}
                </h1>
              )
            },
            h2: ({ children, ...props }) => {
              const id = headingToId(children)
              const heading = headings.find(h => h.level === 2 && normalize(h.text) === normalize(String(children)))
              return (
                <h2
                  {...props}
                  id={id}
                  data-heading-id={heading?.id}
                  className="display-heading"
                  onClick={() => heading && setActiveHeading(heading.id)}
                >
                  {children}
                </h2>
              )
            },
            h3: ({ children, ...props }) => {
              const id = headingToId(children)
              const heading = headings.find(h => h.level === 3 && normalize(h.text) === normalize(String(children)))
              return (
                <h3
                  {...props}
                  id={id}
                  data-heading-id={heading?.id}
                  className="display-heading"
                  onClick={() => heading && setActiveHeading(heading.id)}
                >
                  {children}
                </h3>
              )
            },
            h4: ({ children, ...props }) => {
              const heading = headings.find(h => h.level === 4 && normalize(h.text) === normalize(String(children)))
              return <h4 {...props} data-heading-id={heading?.id} className="display-heading" onClick={() => heading && setActiveHeading(heading.id)}>{children}</h4>
            },
            h5: ({ children, ...props }) => {
              const heading = headings.find(h => h.level === 5 && normalize(h.text) === normalize(String(children)))
              return <h5 {...props} data-heading-id={heading?.id} className="display-heading" onClick={() => heading && setActiveHeading(heading.id)}>{children}</h5>
            },
            h6: ({ children, ...props }) => {
              const heading = headings.find(h => h.level === 6 && normalize(h.text) === normalize(String(children)))
              return <h6 {...props} data-heading-id={heading?.id} className="display-heading" onClick={() => heading && setActiveHeading(heading.id)}>{children}</h6>
            },
          }}
        >
          {visibleContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function normalize(s: React.ReactNode): string {
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

function headingToId(children: React.ReactNode): string {
  return reactChildrenToText(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}
