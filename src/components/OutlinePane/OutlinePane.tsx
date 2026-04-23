import { useCallback, useRef, useEffect, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDocumentStore } from '../../store/documentStore'
import type { HeadingNode } from '../../model/documentModel'
import { isHeadingVisible, getDescendantIds } from '../../model/documentModel'
import './OutlinePane.css'

// ── Node component ────────────────────────────────────────────────────────────

interface OutlineNodeProps {
  node: HeadingNode
  allHeadings: HeadingNode[]
  depthMode: number
  foldedIds: Set<string>
  activeHeadingId: string | null
  keyboardFocusId: string | null
  selectedIds: Set<string>
  onToggleFold: (id: string) => void
  onNodeClick: (id: string, e: MouseEvent) => void
}

function OutlineNodeItem({
  node, allHeadings, depthMode, foldedIds, activeHeadingId, keyboardFocusId,
  selectedIds, onToggleFold, onNodeClick,
}: OutlineNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id })

  const isFolded = foldedIds.has(node.id)
  const hasVisibleChildren = depthMode === 0
    ? node.sectionEnd > node.lineStart
    : allHeadings.some(h => h.parentId === node.id && h.level <= depthMode)
  const isActive    = activeHeadingId === node.id
  const isKeyFocused = keyboardFocusId === node.id
  const isSelected  = selectedIds.has(node.id)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        paddingLeft: `${node.depth * 14 + 6}px`,
      }}
      className={[
        'outline-node',
        `level-${node.level}`,
        isActive     ? 'active'     : '',
        isKeyFocused ? 'key-focused': '',
        isSelected   ? 'selected'   : '',
        isDragging   ? 'dragging'   : '',
      ].filter(Boolean).join(' ')}
      data-heading-id={node.id}
    >
      <button
        className={`outline-fold-btn ${hasVisibleChildren ? '' : 'invisible'}`}
        onClick={e => { e.stopPropagation(); onToggleFold(node.id) }}
        tabIndex={-1}
        title={isFolded ? 'Expand' : 'Collapse'}
      >
        {isFolded ? '+' : '−'}
      </button>
      <div
        className="outline-node-label"
        onMouseDown={e => e.preventDefault()}
        onClick={e => onNodeClick(node.id, e)}
        {...attributes}
        {...listeners}
        tabIndex={-1}
        title={node.text}
      >
        {node.text}
      </div>
    </div>
  )
}

// ── Main pane ────────────────────────────────────────────────────────────────

export function OutlinePane() {
  const {
    content, headings, foldedIds, depthMode, activeHeadingId,
    toggleFold, setActiveHeading, moveSection,
    promoteSectionById, demoteSectionById,
    promoteMultipleById, demoteMultipleById,
    moveSectionsById, undo,
  } = useDocumentStore()

  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [keyFocusId, setKeyFocusId]   = useState<string | null>(null)

  // ── Multi-select state ────────────────────────────────────────────────────
  // selectedIds: the set of headings currently highlighted (multi-select).
  // anchorId: the last heading clicked without Shift — pivot for range selection.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [anchorId, setAnchorId]       = useState<string | null>(null)

  const paneRef        = useRef<HTMLDivElement>(null)
  const treeRef        = useRef<HTMLDivElement>(null)
  const searchRef      = useRef<HTMLInputElement>(null)
  // Ref so handleDragEnd always sees the latest selectedIds (avoids stale closure)
  const selectedIdsRef = useRef<Set<string>>(selectedIds)
  selectedIdsRef.current = selectedIds

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Returns the set of IDs for a heading and all its descendants.
  const getSubtreeIds = useCallback((headingId: string): Set<string> => {
    const ids = new Set<string>()
    ids.add(headingId)
    const descendants = getDescendantIds(headings, headingId)
    descendants.forEach(id => ids.add(id))
    return ids
  }, [headings])

  // Visible headings filtered by depth + fold state + search
  const visibleHeadings = headings.filter(h => {
    if (!isHeadingVisible(h, headings, foldedIds, depthMode)) return false
    if (!search.trim()) return true
    return h.text.toLowerCase().includes(search.toLowerCase())
  })

  const visibleHeadingsRef = useRef(visibleHeadings)
  visibleHeadingsRef.current = visibleHeadings

  // Clear selection when headings list changes substantially
  // (e.g. after a drag that renumbers line IDs)
  const headingCountRef = useRef(headings.length)
  useEffect(() => {
    if (headings.length !== headingCountRef.current) {
      setSelectedIds(new Set())
      setAnchorId(null)
      headingCountRef.current = headings.length
    }
  }, [headings])

  // Auto-scroll outline to active heading
  useEffect(() => {
    if (!activeHeadingId || !treeRef.current) return
    const el = treeRef.current.querySelector(`[data-heading-id="${activeHeadingId}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeHeadingId])

  // Clear multi-select when scroll/navigation moves focus outside the selected set.
  // This prevents the "frozen blue subtree" visual tracking confusion.
  useEffect(() => {
    if (activeHeadingId && selectedIds.size > 0 && !selectedIds.has(activeHeadingId)) {
      setSelectedIds(new Set())
      setAnchorId(null)
    }
  }, [activeHeadingId])

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((id: string, e: MouseEvent) => {
    // Synchronously move keyboard focus to the pane div.
    // dnd-kit injects tabIndex={0} via {...attributes}; overriding it with tabIndex={-1}
    // and calling preventDefault on mousedown keeps focus off the label. This call
    // is the safety net that handles any remaining edge cases.
    paneRef.current?.focus()

    if (e.shiftKey && anchorId) {
      // Range select: all visible headings between anchor and clicked item (inclusive)
      const visibleIds = visibleHeadingsRef.current.map(h => h.id)
      const anchorIdx  = visibleIds.indexOf(anchorId)
      const clickIdx   = visibleIds.indexOf(id)
      if (anchorIdx !== -1 && clickIdx !== -1) {
        const start = Math.min(anchorIdx, clickIdx)
        const end   = Math.max(anchorIdx, clickIdx)
        setSelectedIds(new Set(visibleIds.slice(start, end + 1)))
      }
      // Do NOT update anchorId on shift-click — keep the original pivot
    } else {
      // Regular click: navigate to heading, clear any multi-select
      setSelectedIds(new Set())
      setAnchorId(id)
      setActiveHeading(id)
      setKeyFocusId(null)
    }
  }, [anchorId, setActiveHeading])

  // Click on empty space in the tree clears selection
  const handleTreeClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!target.closest('.outline-node')) {
      setSelectedIds(new Set())
      setAnchorId(null)
    }
  }, [])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const ids = visibleHeadings.map(h => h.id)
    const currentId  = keyFocusId ?? activeHeadingId
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
      case 'z':
      case 'Z': {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          undo()
        }
        break
      }
      case 'c':
      case 'C': {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          if (selectedIds.size > 0) {
            // Copy full markdown for all selected sections (each carrying its subtree)
            const idSet = new Set(selectedIds)
            const roots = headings
              .filter(h => idSet.has(h.id) && (!h.parentId || !idSet.has(h.parentId)))
              .sort((a, b) => a.lineStart - b.lineStart)
            const docLines = content.split('\n')
            const blockLines: string[] = []
            for (const root of roots) {
              if (blockLines.length > 0) blockLines.push('')
              blockLines.push(...docLines.slice(root.lineStart, root.sectionEnd + 1))
            }
            navigator.clipboard.writeText(blockLines.join('\n'))
          }
        }
        break
      }
      case 'Tab': {
        e.preventDefault()
        const focusId = keyFocusId ?? activeHeadingId
        if (!focusId) break

        if (e.shiftKey) {
          // Promote ——————————————————————————————————————————————————
          // If multiple headings selected, batch-promote exactly those IDs.
          // Otherwise fall through to single-heading promote (which also
          // promotes descendants via changeSectionLevel in the store).
          if (selectedIds.size > 1) {
            promoteMultipleById(Array.from(selectedIds))
          } else {
            promoteSectionById(focusId)
          }
        } else {
          // Demote ———————————————————————————————————————————————————
          if (selectedIds.size > 1) {
            demoteMultipleById(Array.from(selectedIds))
          } else {
            demoteSectionById(focusId)
          }
        }
        break
      }
      case 'Escape': {
        if (search) { setSearch(''); searchRef.current?.blur() }
        setKeyFocusId(null)
        setSelectedIds(new Set())
        setAnchorId(null)
        break
      }
    }
  }, [
    visibleHeadings, keyFocusId, activeHeadingId, foldedIds, search,
    selectedIds, getSubtreeIds, content, headings,
    toggleFold, setActiveHeading, undo,
    promoteSectionById, demoteSectionById,
    promoteMultipleById, demoteMultipleById,
  ])

  // ── Drag ─────────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDraggingId(e.active.id as string)
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    // Capture selection BEFORE clearing it (selectedIdsRef always has latest value)
    const draggedSelection = selectedIdsRef.current
    setDraggingId(null)
    setSelectedIds(new Set())
    setAnchorId(null)
    if (!e.over || e.active.id === e.over.id) return

    const vh = visibleHeadingsRef.current
    const oldIndex = vh.findIndex(h => h.id === e.active.id)
    const newIndex = vh.findIndex(h => h.id === e.over!.id)
    if (oldIndex === -1 || newIndex === -1) return

    const placement = newIndex > oldIndex ? 'after' : 'before'
    const toId = e.over.id as string

    // If the dragged item is part of a multi-selection, move all selected headings
    if (draggedSelection.size > 1 && draggedSelection.has(e.active.id as string)) {
      moveSectionsById(Array.from(draggedSelection), toId, placement)
    } else {
      moveSection(e.active.id as string, toId, placement)
    }
  }, [moveSection, moveSectionsById])

  const draggingNode = draggingId ? headings.find(h => h.id === draggingId) : null
  // Count how many sub-headings the dragged node carries along
  const draggingSubCount = draggingId
    ? getDescendantIds(headings, draggingId).length
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="outline-pane" ref={paneRef} onKeyDown={handleKeyDown} tabIndex={0}>

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

      {/* Selection info bar */}
      {selectedIds.size > 1 && (
        <div className="outline-selection-bar">
          <span>{selectedIds.size} headings selected</span>
          <div className="outline-selection-actions">
            <button
              className="outline-sel-btn"
              title="Promote selected  (Shift+Tab)"
              onClick={() => promoteMultipleById(Array.from(selectedIds))}
            >H−</button>
            <button
              className="outline-sel-btn"
              title="Demote selected  (Tab)"
              onClick={() => demoteMultipleById(Array.from(selectedIds))}
            >H+</button>
            <button
              className="outline-sel-btn outline-sel-btn--clear"
              title="Clear selection  (Esc)"
              onClick={() => { setSelectedIds(new Set()); setAnchorId(null) }}
            >✕</button>
          </div>
        </div>
      )}

      {/* Tree */}
      {visibleHeadings.length === 0 ? (
        <div className="outline-empty">
          {search ? `No headings match "${search}"` : 'No headings yet.\nAdd # Heading in Markdown.'}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleHeadings.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <div className="outline-tree" ref={treeRef} onClick={handleTreeClick}>
              {visibleHeadings.map(node => (
                <OutlineNodeItem
                  key={node.id}
                  node={node}
                  allHeadings={headings}
                  depthMode={depthMode}
                  foldedIds={foldedIds}
                  activeHeadingId={activeHeadingId}
                  keyboardFocusId={keyFocusId}
                  selectedIds={selectedIds}
                  onToggleFold={toggleFold}
                  onNodeClick={handleNodeClick}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {draggingNode && (
              <div className={`outline-drag-overlay level-${draggingNode.level}`}>
                <span>↕</span>
                {draggingNode.text}
                {draggingSubCount > 0 && (
                  <span className="outline-drag-sub-count">
                    +{draggingSubCount} sub-heading{draggingSubCount !== 1 ? 's' : ''}
                  </span>
                )}
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
