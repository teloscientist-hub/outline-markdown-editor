import { useCallback, useRef, useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDocumentStore } from '../../store/documentStore'
import type { HeadingNode } from '../../model/documentModel'
import { isHeadingVisible } from '../../model/documentModel'
import './OutlinePane.css'

interface OutlineNodeProps {
  node: HeadingNode
  foldedIds: Set<string>
  activeHeadingId: string | null
  keyboardFocusId: string | null
  onToggleFold: (id: string) => void
  onSelect: (id: string) => void
}

function OutlineNodeItem({
  node, foldedIds, activeHeadingId, keyboardFocusId, onToggleFold, onSelect
}: OutlineNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id })

  const isFolded = foldedIds.has(node.id)
  const hasContent = node.sectionEnd > node.lineStart  // subheadings or body text
  const isActive = activeHeadingId === node.id
  const isKeyFocused = keyboardFocusId === node.id

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        paddingLeft: `${node.depth * 14 + 6}px`,
      }}
      className={`outline-node level-${node.level}${isActive ? ' active' : ''}${isKeyFocused ? ' key-focused' : ''}${isDragging ? ' dragging' : ''}`}
      data-heading-id={node.id}
    >
      <button
        className={`outline-fold-btn ${hasContent ? '' : 'invisible'}`}
        onClick={e => { e.stopPropagation(); onToggleFold(node.id) }}
        tabIndex={-1}
        title={isFolded ? 'Expand' : 'Collapse'}
      >
        {isFolded ? '+' : '−'}
      </button>
      <div
        className="outline-node-label"
        onClick={() => onSelect(node.id)}
        {...attributes}
        {...listeners}
        title={node.text}
      >
        {node.text}
      </div>
    </div>
  )
}

export function OutlinePane() {
  const {
    headings, foldedIds, depthMode, activeHeadingId,
    toggleFold, setActiveHeading, moveSection,
    promoteSectionById, demoteSectionById,
  } = useDocumentStore()

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [keyFocusId, setKeyFocusId] = useState<string | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // Visible headings filtered by depth + fold state + search
  const visibleHeadings = headings.filter(h => {
    if (!isHeadingVisible(h, headings, foldedIds, depthMode)) return false
    if (!search.trim()) return true
    return h.text.toLowerCase().includes(search.toLowerCase())
  })

  // Keep a current ref so handleDragEnd never reads stale visibleHeadings
  const visibleHeadingsRef = useRef(visibleHeadings)
  visibleHeadingsRef.current = visibleHeadings

  // Auto-scroll outline to active heading
  useEffect(() => {
    if (!activeHeadingId || !treeRef.current) return
    const el = treeRef.current.querySelector(`[data-heading-id="${activeHeadingId}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeHeadingId])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const ids = visibleHeadings.map(h => h.id)
    const currentId = keyFocusId ?? activeHeadingId
    const currentIdx = currentId ? ids.indexOf(currentId) : -1

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = ids[currentIdx + 1] ?? ids[0]
        if (next) {
          setKeyFocusId(next)
          treeRef.current?.querySelector<HTMLElement>(`[data-heading-id="${next}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = ids[currentIdx - 1] ?? ids[ids.length - 1]
        if (prev) {
          setKeyFocusId(prev)
          treeRef.current?.querySelector<HTMLElement>(`[data-heading-id="${prev}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        }
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        const id = keyFocusId ?? activeHeadingId
        if (id && foldedIds.has(id)) toggleFold(id)
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        const id = keyFocusId ?? activeHeadingId
        if (id && !foldedIds.has(id)) toggleFold(id)
        break
      }
      case 'Enter': {
        e.preventDefault()
        const id = keyFocusId ?? activeHeadingId
        if (id) { setActiveHeading(id); setKeyFocusId(null) }
        break
      }
      case '/':
      case 'f': {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          searchRef.current?.focus()
        }
        break
      }
      case 'Tab': {
        e.preventDefault()
        const id = keyFocusId ?? activeHeadingId
        if (id) {
          // Tab = demote (# → ##, indent deeper in outline)
          // Shift-Tab = promote (## → #, outdent in outline)
          if (e.shiftKey) promoteSectionById(id)
          else demoteSectionById(id)
        }
        break
      }
      case 'Escape': {
        if (search) { setSearch(''); searchRef.current?.blur() }
        setKeyFocusId(null)
        break
      }
    }
  }, [visibleHeadings, keyFocusId, activeHeadingId, foldedIds, toggleFold, setActiveHeading, search, promoteSectionById, demoteSectionById])

  const handleDragStart = useCallback((e: DragStartEvent) => setDraggingId(e.active.id as string), [])
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingId(null)
    if (!e.over || e.active.id === e.over.id) return

    const vh = visibleHeadingsRef.current
    const oldIndex = vh.findIndex(h => h.id === e.active.id)
    const newIndex = vh.findIndex(h => h.id === e.over!.id)
    if (oldIndex === -1 || newIndex === -1) return

    // dnd-kit reports the item whose CENTER the dragged item has crossed.
    // Moving DOWN (newIndex > oldIndex): cursor passed over.id's center → insert AFTER it.
    // Moving UP   (newIndex < oldIndex): cursor passed over.id's center → insert BEFORE it.
    const placement = newIndex > oldIndex ? 'after' : 'before'
    moveSection(e.active.id as string, e.over.id as string, placement)
  }, [moveSection])

  const draggingNode = draggingId ? headings.find(h => h.id === draggingId) : null

  return (
    <div className="outline-pane" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Search */}
      <div className="outline-search-bar">
        <input
          ref={searchRef}
          className="outline-search"
          type="text"
          placeholder="Search headings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur() } }}
        />
        {search && (
          <button className="outline-search-clear" onClick={() => setSearch('')} tabIndex={-1}>✕</button>
        )}
      </div>

      {/* Tree */}
      {visibleHeadings.length === 0 ? (
        <div className="outline-empty">
          {search ? `No headings match "${search}"` : 'No headings yet.\nAdd # Heading in Markdown.'}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleHeadings.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <div className="outline-tree" ref={treeRef}>
              {visibleHeadings.map(node => (
                <OutlineNodeItem
                  key={node.id}
                  node={node}
                  foldedIds={foldedIds}
                  activeHeadingId={activeHeadingId}
                  keyboardFocusId={keyFocusId}
                  onToggleFold={toggleFold}
                  onSelect={id => { setActiveHeading(id); setKeyFocusId(null) }}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {draggingNode && (
              <div className={`outline-drag-overlay level-${draggingNode.level}`}>
                <span>↕</span> {draggingNode.text}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Search result count */}
      {search && visibleHeadings.length > 0 && (
        <div className="outline-search-count">
          {visibleHeadings.length} match{visibleHeadings.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  )
}
