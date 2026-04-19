// scrollSync.ts
// Module-level scroll-position bus. Avoids Zustand re-renders for high-frequency
// scroll events.  Position is expressed as (prevHeadingId, nextHeadingId, ratio)
// where ratio is 0..1 between the two heading boundaries.

export interface ScrollPos {
  prevHeadingId: string | null
  nextHeadingId: string | null
  /** 0 = at prevHeading, 1 = at nextHeading */
  ratio: number
}

type Listener = (pos: ScrollPos) => void
const _listeners = new Map<string, Listener>()

/** Register a listener. Returns an unsubscribe function. */
export function subscribeScroll(id: string, fn: Listener): () => void {
  _listeners.set(id, fn)
  return () => _listeners.delete(id)
}

/** Broadcast a scroll position to all OTHER listeners. */
export function publishScroll(fromId: string, pos: ScrollPos): void {
  for (const [id, fn] of _listeners) {
    if (id !== fromId) fn(pos)
  }
}
