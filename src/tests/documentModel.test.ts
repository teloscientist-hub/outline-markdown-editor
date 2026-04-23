import { describe, it, expect } from 'vitest'
import {
  parseHeadings,
  getDescendantIds,
  moveSection,
  changeSectionLevel,
  changeMultipleSectionLevels,
  computeHiddenLines,
  isHeadingVisible,
  moveSectionVertical,
  getHeadingAtLine,
  changeHeadingLevel,
} from '../model/documentModel'

// ─────────────────────────────────────────────────────────────────────────────
// parseHeadings
// ─────────────────────────────────────────────────────────────────────────────
describe('parseHeadings', () => {
  it('returns empty array for empty string', () => {
    const result = parseHeadings('')
    expect(result).toEqual([])
  })

  it('returns empty array for content with no headings', () => {
    const result = parseHeadings('Just some text\nNo headings here\n')
    expect(result).toEqual([])
  })

  it('parses single heading', () => {
    const result = parseHeadings('# Hello')
    expect(result).toHaveLength(1)
    expect(result[0].level).toBe(1)
    expect(result[0].text).toBe('Hello')
    expect(result[0].lineStart).toBe(0)
    expect(result[0].sectionEnd).toBe(0)
    expect(result[0].parentId).toBeNull()
    expect(result[0].depth).toBe(0)
    expect(result[0].childIds).toEqual([])
  })

  it('parses multiple root headings', () => {
    const md = '# First\n## Sub\n# Second'
    const result = parseHeadings(md)
    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('First')
    expect(result[1].text).toBe('Sub')
    expect(result[2].text).toBe('Second')
  })

  it('parses headings with body text', () => {
    const md = '# Heading\nSome body text\nMore body\n## Sub\nSub body'
    const result = parseHeadings(md)
    expect(result).toHaveLength(2)
    // H1 sectionEnd should be last line (4)
    expect(result[0].sectionEnd).toBe(4)
    // H2 lineStart=3, sectionEnd=4
    expect(result[1].lineStart).toBe(3)
    expect(result[1].sectionEnd).toBe(4)
  })

  it('computes correct sectionEnd for each heading', () => {
    const md = '# H1\nbody1\n## H2\nbody2\n# H1b\nbody3'
    // lines: 0=# H1, 1=body1, 2=## H2, 3=body2, 4=# H1b, 5=body3
    const result = parseHeadings(md)
    expect(result[0].sectionEnd).toBe(3) // H1 ends before H1b
    expect(result[1].sectionEnd).toBe(3) // H2 ends before H1b
    expect(result[2].sectionEnd).toBe(5) // H1b goes to end
  })

  it('builds nested H1→H2→H3 parent/child links', () => {
    const md = '# H1\n## H2\n### H3'
    const result = parseHeadings(md)
    expect(result[0].parentId).toBeNull()
    expect(result[0].childIds).toContain(result[1].id)
    expect(result[1].parentId).toBe(result[0].id)
    expect(result[1].childIds).toContain(result[2].id)
    expect(result[2].parentId).toBe(result[1].id)
    expect(result[2].childIds).toEqual([])
  })

  it('builds correct depth values', () => {
    const md = '# H1\n## H2\n### H3\n## H2b'
    const result = parseHeadings(md)
    expect(result[0].depth).toBe(0)
    expect(result[1].depth).toBe(1)
    expect(result[2].depth).toBe(2)
    expect(result[3].depth).toBe(1)
  })

  it('handles H1 with H3 children (no H2 in between)', () => {
    const md = '# H1\n### H3'
    const result = parseHeadings(md)
    // H3 should be a direct child of H1
    expect(result[0].childIds).toContain(result[1].id)
    expect(result[1].parentId).toBe(result[0].id)
    expect(result[1].depth).toBe(1)
  })

  it('assigns unique ids based on line numbers', () => {
    const md = '# H1\n## H2\n# H3'
    const result = parseHeadings(md)
    const ids = result.map(h => h.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('ignores lines that are not headings (missing space after #)', () => {
    const md = '#NoSpace\n# Valid heading\n##AlsoNoSpace'
    const result = parseHeadings(md)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Valid heading')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getDescendantIds
// ─────────────────────────────────────────────────────────────────────────────
describe('getDescendantIds', () => {
  it('returns empty array for leaf node (no children)', () => {
    const md = '# H1\n## H2'
    const headings = parseHeadings(md)
    const h2Id = headings[1].id
    const result = getDescendantIds(headings, h2Id)
    expect(result).toEqual([])
  })

  it('returns direct children for one level', () => {
    const md = '# H1\n## Child1\n## Child2'
    const headings = parseHeadings(md)
    const h1Id = headings[0].id
    const result = getDescendantIds(headings, h1Id)
    expect(result).toHaveLength(2)
    expect(result).toContain(headings[1].id)
    expect(result).toContain(headings[2].id)
  })

  it('returns all nested descendants (BFS order)', () => {
    const md = '# H1\n## H2\n### H3\n#### H4'
    const headings = parseHeadings(md)
    const h1Id = headings[0].id
    const result = getDescendantIds(headings, h1Id)
    expect(result).toHaveLength(3)
    expect(result).toContain(headings[1].id)
    expect(result).toContain(headings[2].id)
    expect(result).toContain(headings[3].id)
  })

  it('returns empty array for unknown id', () => {
    const headings = parseHeadings('# H1')
    expect(getDescendantIds(headings, 'nonexistent')).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// moveSection
// ─────────────────────────────────────────────────────────────────────────────
describe('moveSection', () => {
  const md = '# Alpha\n# Beta\n# Gamma'
  // lines: 0=# Alpha, 1=# Beta, 2=# Gamma

  it('returns same content if fromId === toId', () => {
    const headings = parseHeadings(md)
    const id = headings[0].id
    const result = moveSection(md, headings, id, id, 'before')
    expect(result).toBe(md)
  })

  it('moves section before another', () => {
    const headings = parseHeadings(md)
    const gammaId = headings[2].id
    const betaId = headings[1].id
    // Move Gamma before Beta → Alpha, Gamma, Beta
    const result = moveSection(md, headings, gammaId, betaId, 'before')
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Alpha')
    expect(lines[1]).toBe('# Gamma')
    expect(lines[2]).toBe('# Beta')
  })

  it('moves section after another', () => {
    const headings = parseHeadings(md)
    const alphaId = headings[0].id
    const betaId = headings[1].id
    // Move Alpha after Beta → Beta, Alpha, Gamma
    const result = moveSection(md, headings, alphaId, betaId, 'after')
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Beta')
    expect(lines[1]).toBe('# Alpha')
    expect(lines[2]).toBe('# Gamma')
  })

  it('moves first section to end', () => {
    const headings = parseHeadings(md)
    const alphaId = headings[0].id
    const gammaId = headings[2].id
    // Move Alpha after Gamma
    const result = moveSection(md, headings, alphaId, gammaId, 'after')
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Beta')
    expect(lines[1]).toBe('# Gamma')
    expect(lines[2]).toBe('# Alpha')
  })

  it('moves last section to beginning', () => {
    const headings = parseHeadings(md)
    const gammaId = headings[2].id
    const alphaId = headings[0].id
    const result = moveSection(md, headings, gammaId, alphaId, 'before')
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Gamma')
    expect(lines[1]).toBe('# Alpha')
    expect(lines[2]).toBe('# Beta')
  })

  it('moves section with body text and children', () => {
    const md2 = '# Alpha\nbody alpha\n## Sub\nsub body\n# Beta\nbeta body'
    // lines: 0=# Alpha, 1=body alpha, 2=## Sub, 3=sub body, 4=# Beta, 5=beta body
    const headings = parseHeadings(md2)
    const alphaId = headings[0].id  // Alpha with Sub child
    const betaId = headings[2].id   // Beta
    // Move Alpha after Beta
    const result = moveSection(md2, headings, alphaId, betaId, 'after')
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Beta')
    expect(lines[1]).toBe('beta body')
    expect(lines[2]).toBe('# Alpha')
    expect(lines[3]).toBe('body alpha')
    expect(lines[4]).toBe('## Sub')
    expect(lines[5]).toBe('sub body')
  })

  it('returns same content if fromId not found', () => {
    const headings = parseHeadings(md)
    const result = moveSection(md, headings, 'bad-id', headings[1].id, 'before')
    expect(result).toBe(md)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// changeSectionLevel
// ─────────────────────────────────────────────────────────────────────────────
describe('changeSectionLevel', () => {
  it('promotes H2 to H1 (delta=-1)', () => {
    const md = '## Section'
    const headings = parseHeadings(md)
    const result = changeSectionLevel(md, headings, headings[0].id, -1)
    expect(result).toBe('# Section')
  })

  it('demotes H1 to H2 (delta=+1)', () => {
    const md = '# Section'
    const headings = parseHeadings(md)
    const result = changeSectionLevel(md, headings, headings[0].id, 1)
    expect(result).toBe('## Section')
  })

  it('clamps at H1 (cannot go above H1)', () => {
    const md = '# Section'
    const headings = parseHeadings(md)
    const result = changeSectionLevel(md, headings, headings[0].id, -1)
    // Should remain H1
    expect(result).toBe('# Section')
  })

  it('clamps at H6 (cannot go below H6)', () => {
    const md = '###### Section'
    const headings = parseHeadings(md)
    const result = changeSectionLevel(md, headings, headings[0].id, 1)
    expect(result).toBe('###### Section')
  })

  it('changes descendants proportionally', () => {
    const md = '## Parent\n### Child\n#### Grandchild'
    const headings = parseHeadings(md)
    const parentId = headings[0].id
    const result = changeSectionLevel(md, headings, parentId, -1)
    const lines = result.split('\n')
    expect(lines[0]).toBe('# Parent')
    expect(lines[1]).toBe('## Child')
    expect(lines[2]).toBe('### Grandchild')
  })

  it('returns same content for unknown id', () => {
    const md = '# Hello'
    const headings = parseHeadings(md)
    const result = changeSectionLevel(md, headings, 'bad-id', -1)
    expect(result).toBe(md)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// changeMultipleSectionLevels
// ─────────────────────────────────────────────────────────────────────────────
describe('changeMultipleSectionLevels', () => {
  it('promotes subset of headings', () => {
    const md = '## A\n## B\n## C'
    const headings = parseHeadings(md)
    // Promote only A and C
    const result = changeMultipleSectionLevels(md, headings, [headings[0].id, headings[2].id], -1)
    const lines = result.split('\n')
    expect(lines[0]).toBe('# A')
    expect(lines[1]).toBe('## B')
    expect(lines[2]).toBe('# C')
  })

  it('demotes subset of headings', () => {
    const md = '# A\n# B\n# C'
    const headings = parseHeadings(md)
    const result = changeMultipleSectionLevels(md, headings, [headings[1].id], 1)
    const lines = result.split('\n')
    expect(lines[0]).toBe('# A')
    expect(lines[1]).toBe('## B')
    expect(lines[2]).toBe('# C')
  })

  it('does NOT change headings not in the set', () => {
    const md = '# A\n## B\n### C'
    const headings = parseHeadings(md)
    const result = changeMultipleSectionLevels(md, headings, [headings[1].id], -1)
    const lines = result.split('\n')
    expect(lines[0]).toBe('# A')   // unchanged
    expect(lines[1]).toBe('# B')   // promoted
    expect(lines[2]).toBe('### C') // unchanged
  })

  it('handles empty ids array (no-op)', () => {
    const md = '# A\n## B'
    const headings = parseHeadings(md)
    const result = changeMultipleSectionLevels(md, headings, [], -1)
    expect(result).toBe(md)
  })

  it('clamps at H1', () => {
    const md = '# A'
    const headings = parseHeadings(md)
    const result = changeMultipleSectionLevels(md, headings, [headings[0].id], -1)
    expect(result).toBe('# A')
  })

  it('clamps at H6', () => {
    const md = '###### A'
    const headings = parseHeadings(md)
    const result = changeMultipleSectionLevels(md, headings, [headings[0].id], 1)
    expect(result).toBe('###### A')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeHiddenLines
// ─────────────────────────────────────────────────────────────────────────────
describe('computeHiddenLines', () => {
  it('returns empty set when no folds and depthMode=0', () => {
    const md = '# H1\nbody\n## H2'
    const headings = parseHeadings(md)
    const result = computeHiddenLines(md, headings, new Set(), 0)
    expect(result.size).toBe(0)
  })

  it('folds a single section (hides content, not heading line)', () => {
    const md = '# H1\nbody1\nbody2\n# H2'
    // lines: 0=# H1, 1=body1, 2=body2, 3=# H2
    const headings = parseHeadings(md)
    const h1Id = headings[0].id
    const result = computeHiddenLines(md, headings, new Set([h1Id]), 0)
    expect(result.has(0)).toBe(false)  // heading visible
    expect(result.has(1)).toBe(true)   // body hidden
    expect(result.has(2)).toBe(true)   // body hidden
    expect(result.has(3)).toBe(false)  // H2 not in H1's section
  })

  it('folds nested: parent fold hides child headings too', () => {
    const md = '# Parent\n## Child\n### Grandchild\n# Other'
    const headings = parseHeadings(md)
    const parentId = headings[0].id
    const result = computeHiddenLines(md, headings, new Set([parentId]), 0)
    expect(result.has(0)).toBe(false)  // Parent heading visible
    expect(result.has(1)).toBe(true)   // Child hidden (inside parent's fold)
    expect(result.has(2)).toBe(true)   // Grandchild hidden
    expect(result.has(3)).toBe(false)  // Other not hidden
  })

  it('depthMode hides headings beyond depth and their content', () => {
    const md = '# H1\n## H2\n### H3\nbody'
    // lines: 0=# H1, 1=## H2, 2=### H3, 3=body
    const headings = parseHeadings(md)
    const result = computeHiddenLines(md, headings, new Set(), 1)
    expect(result.has(0)).toBe(false)  // H1 visible (level 1 <= depthMode 1)
    expect(result.has(1)).toBe(true)   // H2 hidden (level 2 > 1)
    expect(result.has(2)).toBe(true)   // H3 hidden
    expect(result.has(3)).toBe(true)   // body of H3 hidden
  })

  it('headingsOnlyMode hides all non-heading lines', () => {
    const md = '# H1\nbody text\n## H2\nmore body'
    // lines: 0=# H1, 1=body text, 2=## H2, 3=more body
    const headings = parseHeadings(md)
    const result = computeHiddenLines(md, headings, new Set(), 0, true)
    expect(result.has(0)).toBe(false)  // H1 heading visible
    expect(result.has(1)).toBe(true)   // body hidden
    expect(result.has(2)).toBe(false)  // H2 heading visible
    expect(result.has(3)).toBe(true)   // body hidden
  })

  it('headingsOnlyMode + depthMode hides deep headings', () => {
    const md = '# H1\n## H2\n### H3'
    const headings = parseHeadings(md)
    const result = computeHiddenLines(md, headings, new Set(), 2, true)
    expect(result.has(0)).toBe(false)  // H1 visible
    expect(result.has(1)).toBe(false)  // H2 visible
    expect(result.has(2)).toBe(true)   // H3 hidden (level 3 > depthMode 2)
  })

  it('headingsOnlyMode + folds hides folded child headings', () => {
    const md = '# Parent\n## Child\n# Other'
    const headings = parseHeadings(md)
    const parentId = headings[0].id
    const result = computeHiddenLines(md, headings, new Set([parentId]), 0, true)
    expect(result.has(0)).toBe(false)  // Parent visible
    expect(result.has(1)).toBe(true)   // Child hidden (ancestor folded)
    expect(result.has(2)).toBe(false)  // Other visible
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// isHeadingVisible
// ─────────────────────────────────────────────────────────────────────────────
describe('isHeadingVisible', () => {
  it('visible heading with no folds and depthMode=0', () => {
    const md = '# H1\n## H2'
    const headings = parseHeadings(md)
    expect(isHeadingVisible(headings[0], headings, new Set(), 0)).toBe(true)
    expect(isHeadingVisible(headings[1], headings, new Set(), 0)).toBe(true)
  })

  it('hidden by depthMode', () => {
    const md = '# H1\n## H2\n### H3'
    const headings = parseHeadings(md)
    expect(isHeadingVisible(headings[2], headings, new Set(), 2)).toBe(false)
    expect(isHeadingVisible(headings[1], headings, new Set(), 2)).toBe(true)
  })

  it('hidden by direct fold on itself', () => {
    // isHeadingVisible checks ancestor folds, not self-fold
    // A heading whose own id is in foldedIds is still visible (fold hides content, not itself)
    const md = '# H1'
    const headings = parseHeadings(md)
    const result = isHeadingVisible(headings[0], headings, new Set([headings[0].id]), 0)
    expect(result).toBe(true)
  })

  it('hidden by ancestor fold', () => {
    const md = '# Parent\n## Child\n### Grandchild'
    const headings = parseHeadings(md)
    const parentId = headings[0].id
    // Child hidden because parent is folded
    expect(isHeadingVisible(headings[1], headings, new Set([parentId]), 0)).toBe(false)
    // Grandchild also hidden
    expect(isHeadingVisible(headings[2], headings, new Set([parentId]), 0)).toBe(false)
  })

  it('hidden by grandparent fold but not immediate parent fold of sibling', () => {
    const md = '# P\n## C1\n## C2\n### GC'
    const headings = parseHeadings(md)
    const c1Id = headings[1].id
    const pId = headings[0].id
    // GC hidden if P is folded
    expect(isHeadingVisible(headings[3], headings, new Set([pId]), 0)).toBe(false)
    // C2 hidden if P is folded
    expect(isHeadingVisible(headings[2], headings, new Set([pId]), 0)).toBe(false)
    // C2 visible if only C1 is folded
    expect(isHeadingVisible(headings[2], headings, new Set([c1Id]), 0)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getHeadingAtLine
// ─────────────────────────────────────────────────────────────────────────────
describe('getHeadingAtLine', () => {
  it('returns heading for exact heading line', () => {
    const md = '# H1\nbody\n## H2'
    const headings = parseHeadings(md)
    const result = getHeadingAtLine(headings, 0)
    expect(result?.text).toBe('H1')
  })

  it('returns innermost heading for body line', () => {
    const md = '# H1\n## H2\nbody'
    // line 2 is body of H2
    const headings = parseHeadings(md)
    const result = getHeadingAtLine(headings, 2)
    expect(result?.text).toBe('H2')
  })

  it('returns null for line before any heading', () => {
    const md = 'intro text\n# H1'
    const headings = parseHeadings(md)
    const result = getHeadingAtLine(headings, 0)
    expect(result).toBeNull()
  })

  it('returns null for empty headings', () => {
    expect(getHeadingAtLine([], 0)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// changeHeadingLevel
// ─────────────────────────────────────────────────────────────────────────────
describe('changeHeadingLevel', () => {
  it('promotes heading (delta=-1)', () => {
    const md = '## Section\nbody'
    const result = changeHeadingLevel(md, 0, -1)
    expect(result?.split('\n')[0]).toBe('# Section')
  })

  it('demotes heading (delta=+1)', () => {
    const md = '# Section\nbody'
    const result = changeHeadingLevel(md, 0, 1)
    expect(result?.split('\n')[0]).toBe('## Section')
  })

  it('returns null for non-heading line', () => {
    const md = 'plain text'
    const result = changeHeadingLevel(md, 0, -1)
    expect(result).toBeNull()
  })

  it('returns null when level would not change (at H1, delta=-1)', () => {
    // After clamping at H1, newLevel === oldLevel → returns null
    const md = '# Section'
    const result = changeHeadingLevel(md, 0, -1)
    expect(result).toBeNull()
  })

  it('returns null when level would not change (at H6, delta=+1)', () => {
    const md = '###### Section'
    const result = changeHeadingLevel(md, 0, 1)
    expect(result).toBeNull()
  })

  it('preserves other lines', () => {
    const md = '# Title\nbody text\n## Sub'
    const result = changeHeadingLevel(md, 0, 1)
    expect(result).toBe('## Title\nbody text\n## Sub')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// moveSectionVertical
// ─────────────────────────────────────────────────────────────────────────────
describe('moveSectionVertical', () => {
  const md = '# Alpha\n# Beta\n# Gamma'

  it('returns null moving first section up (no-op)', () => {
    const headings = parseHeadings(md)
    const result = moveSectionVertical(md, headings, headings[0].id, 'up')
    expect(result).toBeNull()
  })

  it('returns null moving last section down (no-op)', () => {
    const headings = parseHeadings(md)
    const result = moveSectionVertical(md, headings, headings[2].id, 'down')
    expect(result).toBeNull()
  })

  it('moves middle section up', () => {
    const headings = parseHeadings(md)
    const result = moveSectionVertical(md, headings, headings[1].id, 'up')
    expect(result).not.toBeNull()
    const lines = result!.split('\n')
    expect(lines[0]).toBe('# Beta')
    expect(lines[1]).toBe('# Alpha')
    expect(lines[2]).toBe('# Gamma')
  })

  it('moves middle section down', () => {
    const headings = parseHeadings(md)
    const result = moveSectionVertical(md, headings, headings[1].id, 'down')
    expect(result).not.toBeNull()
    const lines = result!.split('\n')
    expect(lines[0]).toBe('# Alpha')
    expect(lines[1]).toBe('# Gamma')
    expect(lines[2]).toBe('# Beta')
  })

  it('only moves among same-level siblings (ignores child headings)', () => {
    const md2 = '# Parent\n## Child1\n## Child2\n# Sibling'
    const headings = parseHeadings(md2)
    // Child1 is H2, its siblings are only Child2 (not Parent or Sibling)
    const child1Id = headings[1].id
    const result = moveSectionVertical(md2, headings, child1Id, 'down')
    expect(result).not.toBeNull()
    const lines = result!.split('\n')
    // After moving Child1 down past Child2:
    // # Parent, ## Child2, ## Child1, # Sibling
    expect(lines[0]).toBe('# Parent')
    expect(lines[1]).toBe('## Child2')
    expect(lines[2]).toBe('## Child1')
    expect(lines[3]).toBe('# Sibling')
  })

  it('returns null for unknown heading id', () => {
    const headings = parseHeadings(md)
    const result = moveSectionVertical(md, headings, 'bad-id', 'up')
    expect(result).toBeNull()
  })
})
