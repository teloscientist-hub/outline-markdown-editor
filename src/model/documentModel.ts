export interface HeadingNode {
  id: string
  level: number       // 1–6
  text: string
  lineStart: number   // 0-based line of the heading itself
  sectionEnd: number  // 0-based last line of section content (inclusive)
  parentId: string | null
  childIds: string[]
  depth: number       // nesting depth in tree (root headings = 0)
}

// Parse raw Markdown into a flat list of HeadingNodes with parent/child links.
export function parseHeadings(content: string): HeadingNode[] {
  const lines = content.split('\n')
  const flat: HeadingNode[] = []

  // First pass: collect all headings with lineStart
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      flat.push({
        id: `h-${i}`,
        level: m[1].length,
        text: m[2].trim(),
        lineStart: i,
        sectionEnd: lines.length - 1, // will be computed
        parentId: null,
        childIds: [],
        depth: 0,
      })
    }
  }

  // Compute sectionEnd: last line before next heading of SAME OR HIGHER level
  // (i.e. the full extent of the section including all child sections)
  for (let i = 0; i < flat.length; i++) {
    const level = flat[i].level
    let found = false
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j].level <= level) {
        flat[i].sectionEnd = flat[j].lineStart - 1
        found = true
        break
      }
    }
    if (!found) flat[i].sectionEnd = lines.length - 1
  }

  // Build parent/child links using a stack
  const stack: HeadingNode[] = []
  for (const node of flat) {
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length) {
      const parent = stack[stack.length - 1]
      node.parentId = parent.id
      node.depth = parent.depth + 1
      parent.childIds.push(node.id)
    } else {
      node.depth = 0
    }
    stack.push(node)
  }

  return flat
}

// Get just root-level headings (parentId === null)
export function getRootHeadings(headings: HeadingNode[]): HeadingNode[] {
  return headings.filter(h => h.parentId === null)
}

// Get a heading by id
export function getHeading(headings: HeadingNode[], id: string): HeadingNode | undefined {
  return headings.find(h => h.id === id)
}

// Get all descendant IDs of a heading (recursive)
export function getDescendantIds(headings: HeadingNode[], id: string): string[] {
  const node = getHeading(headings, id)
  if (!node) return []
  const result: string[] = []
  const queue = [...node.childIds]
  while (queue.length) {
    const childId = queue.shift()!
    result.push(childId)
    const child = getHeading(headings, childId)
    if (child) queue.push(...child.childIds)
  }
  return result
}

// Extract the full text of a section (heading line + all content until next same-or-higher heading)
export function getSectionLines(content: string, heading: HeadingNode): string[] {
  const lines = content.split('\n')
  return lines.slice(heading.lineStart, heading.sectionEnd + 1)
}

// Move a section (heading + all its content) to a new position.
// toId: the heading to move relative to
// placement: 'before' | 'after'
export function moveSection(
  content: string,
  headings: HeadingNode[],
  fromId: string,
  toId: string,
  placement: 'before' | 'after'
): string {
  if (fromId === toId) return content

  const from = getHeading(headings, fromId)
  const to = getHeading(headings, toId)
  if (!from || !to) return content

  const lines = content.split('\n')

  // Extract the moving block
  const blockLines = lines.slice(from.lineStart, from.sectionEnd + 1)
  const blockText = blockLines.join('\n')

  // Remove the block from source
  const withoutBlock = [
    ...lines.slice(0, from.lineStart),
    ...lines.slice(from.sectionEnd + 1),
  ]

  // Recompute target heading position after removal
  const insertBefore = placement === 'before' ? to.lineStart : to.sectionEnd + 1

  // Adjust target line if from came before to
  let adjustedInsert = insertBefore
  if (from.lineStart < to.lineStart) {
    const blockLen = from.sectionEnd - from.lineStart + 1
    adjustedInsert = insertBefore - blockLen
  }

  // Insert block at adjusted position
  const result = [
    ...withoutBlock.slice(0, adjustedInsert),
    ...blockText.split('\n'),
    ...withoutBlock.slice(adjustedInsert),
  ]

  return result.join('\n')
}

// Given fold state and depth mode, return the set of line numbers that should be hidden.
// depthMode: 0 = show all, N = show H1..HN (headings deeper than N and their content are hidden)
export function computeHiddenLines(
  content: string,
  headings: HeadingNode[],
  foldedIds: Set<string>,
  depthMode: number,
  headingsOnlyMode = false
): Set<number> {
  const lines = content.split('\n')
  const hidden = new Set<number>()

  // Headings-only mode: hide all non-heading lines and headings beyond depthMode
  if (headingsOnlyMode) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s/)
      if (!m) {
        hidden.add(i)  // hide body text
      } else {
        const level = m[1].length
        if (depthMode > 0 && level > depthMode) hidden.add(i)  // hide deep headings
      }
    }
    // Also respect fold state: hide headings whose ancestor is folded
    for (const heading of headings) {
      if (!heading.parentId) continue
      let pid: string | null = heading.parentId
      while (pid) {
        if (foldedIds.has(pid)) {
          // Hide this heading line (body already hidden above)
          hidden.add(heading.lineStart)
          break
        }
        const parent = getHeading(headings, pid)
        pid = parent?.parentId ?? null
      }
    }
    return hidden
  }

  for (const heading of headings) {
    // Depth mode: hide headings deeper than depthMode and their full sections
    if (depthMode > 0 && heading.level > depthMode) {
      for (let i = heading.lineStart; i <= heading.sectionEnd; i++) {
        hidden.add(i)
      }
      continue
    }

    // Fold: hide content lines (not the heading line itself, but all content below it)
    if (foldedIds.has(heading.id)) {
      // Hide from lineStart+1 to sectionEnd
      for (let i = heading.lineStart + 1; i <= heading.sectionEnd; i++) {
        hidden.add(i)
      }
    }
  }

  // Also hide any heading whose ancestor is folded
  for (const heading of headings) {
    if (!heading.parentId) continue
    let pid: string | null = heading.parentId
    while (pid) {
      if (foldedIds.has(pid)) {
        for (let i = heading.lineStart; i <= heading.sectionEnd; i++) {
          hidden.add(i)
        }
        break
      }
      const parent = getHeading(headings, pid)
      pid = parent?.parentId ?? null
    }
  }

  return hidden
}

// Find which heading the cursor is in, given a 0-based line number
export function getHeadingAtLine(headings: HeadingNode[], line: number): HeadingNode | null {
  let result: HeadingNode | null = null
  for (const h of headings) {
    if (h.lineStart <= line && line <= h.sectionEnd) {
      if (!result || h.lineStart > result.lineStart) result = h
    }
  }
  return result
}

// Check if a heading is visible given fold state and depth mode
export function isHeadingVisible(
  heading: HeadingNode,
  headings: HeadingNode[],
  foldedIds: Set<string>,
  depthMode: number
): boolean {
  if (depthMode > 0 && heading.level > depthMode) return false
  // Check if any ancestor is folded
  let pid = heading.parentId
  while (pid) {
    if (foldedIds.has(pid)) return false
    const parent = getHeading(headings, pid)
    pid = parent?.parentId ?? null
  }
  return true
}

// ── Structural editing helpers ────────────────────────────────────────────

// Change the level of a single heading line (e.g. ## → # or ## → ###)
// Returns new content string, or null if line is not a heading.
export function changeHeadingLevel(content: string, lineIndex: number, delta: number): string | null {
  const lines = content.split('\n')
  const line = lines[lineIndex]
  const m = line.match(/^(#{1,6})(\s.*)$/)
  if (!m) return null
  const newLevel = Math.max(1, Math.min(6, m[1].length + delta))
  if (newLevel === m[1].length) return null
  lines[lineIndex] = '#'.repeat(newLevel) + m[2]
  return lines.join('\n')
}

// Promote/demote an entire section: changes the heading AND all descendant headings by delta.
export function changeSectionLevel(
  content: string,
  headings: HeadingNode[],
  headingId: string,
  delta: number
): string {
  const heading = getHeading(headings, headingId)
  if (!heading) return content

  const lines = content.split('\n')
  const affected = [heading, ...getDescendantIds(headings, headingId).map(id => getHeading(headings, id)!)]

  for (const h of affected) {
    const line = lines[h.lineStart]
    const m = line.match(/^(#{1,6})(\s.*)$/)
    if (!m) continue
    const newLevel = Math.max(1, Math.min(6, m[1].length + delta))
    lines[h.lineStart] = '#'.repeat(newLevel) + m[2]
  }

  return lines.join('\n')
}

// Move a section up or down relative to its siblings at the same level.
// Returns new content, or null if move is not possible.
export function moveSectionVertical(
  content: string,
  headings: HeadingNode[],
  headingId: string,
  direction: 'up' | 'down'
): string | null {
  const heading = getHeading(headings, headingId)
  if (!heading) return null

  // Find siblings: headings at same level with same parent
  const siblings = headings.filter(h =>
    h.level === heading.level && h.parentId === heading.parentId
  )

  const idx = siblings.findIndex(s => s.id === headingId)
  if (idx === -1) return null

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= siblings.length) return null

  const targetId = siblings[targetIdx].id
  const placement = direction === 'up' ? 'before' : 'after'

  return moveSection(content, headings, headingId, targetId, placement)
}


// Change the heading level of an arbitrary set of headings in one pass.
// Unlike changeSectionLevel, this does NOT automatically include descendants —
// the caller decides exactly which IDs to include.
// Safe to call with any mix of related/unrelated headings; processes in document
// order so no offset issues (level changes never affect line count).
export function changeMultipleSectionLevels(
  content: string,
  headings: HeadingNode[],
  ids: string[],
  delta: number
): string {
  if (ids.length === 0) return content
  const idSet = new Set(ids)
  const lines = content.split('\n')
  for (const heading of headings) {
    if (!idSet.has(heading.id)) continue
    const line = lines[heading.lineStart]
    const m = line.match(/^(#{1,6})(\s.*)$/)
    if (!m) continue
    const newLevel = Math.max(1, Math.min(6, m[1].length + delta))
    if (newLevel === m[1].length) continue
    lines[heading.lineStart] = '#'.repeat(newLevel) + m[2]
  }
  return lines.join('\n')
}


// Move a set of headings (each carrying its full subtree) to a new position as a group.
// ids: the selected heading IDs to move
// toId: the drop-target heading ID
// placement: insert the block 'before' or 'after' the target heading's full section
export function moveMultipleSections(
  content: string,
  headings: HeadingNode[],
  ids: string[],
  toId: string,
  placement: 'before' | 'after'
): string {
  if (ids.length === 0) return content

  const idSet = new Set(ids)

  // Cannot drop onto a heading that is being moved
  if (idSet.has(toId)) return content

  const toHeading = getHeading(headings, toId)
  if (!toHeading) return content

  // Sort selected headings by line position
  const selectedHeadings = headings
    .filter(h => idSet.has(h.id))
    .sort((a, b) => a.lineStart - b.lineStart)

  if (selectedHeadings.length === 0) return content

  // Root headings: those whose parent is NOT also in the selection.
  // Each root carries its entire subtree (lineStart → sectionEnd).
  const roots = selectedHeadings.filter(h => !h.parentId || !idSet.has(h.parentId))

  const lines = content.split('\n')

  // Lines covered by root blocks
  const linesToRemove = new Set<number>()
  for (const root of roots) {
    for (let i = root.lineStart; i <= root.sectionEnd; i++) {
      linesToRemove.add(i)
    }
  }

  // Safety: cannot insert inside a removed block
  if (linesToRemove.has(toHeading.lineStart)) return content

  // Build the combined block in document order
  const blockLines: string[] = []
  for (const root of roots) {
    blockLines.push(...lines.slice(root.lineStart, root.sectionEnd + 1))
  }

  // Remaining document with blocks removed
  const remainingLines = lines.filter((_, i) => !linesToRemove.has(i))

  // Insert position in original line numbers, then adjust for removed lines
  const insertLine = placement === 'before'
    ? toHeading.lineStart
    : toHeading.sectionEnd + 1

  let removedBefore = 0
  for (const lineNum of linesToRemove) {
    if (lineNum < insertLine) removedBefore++
  }
  const adjustedInsert = insertLine - removedBefore

  return [
    ...remainingLines.slice(0, adjustedInsert),
    ...blockLines,
    ...remainingLines.slice(adjustedInsert),
  ].join('\n')
}

// Toggle fold for the heading at or containing the given line index.
export function getHeadingForLine(headings: HeadingNode[], lineIndex: number): HeadingNode | null {
  // First check if the line IS a heading
  const exact = headings.find(h => h.lineStart === lineIndex)
  if (exact) return exact
  // Otherwise find the innermost heading containing this line
  return getHeadingAtLine(headings, lineIndex)
}
