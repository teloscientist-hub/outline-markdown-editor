type FindMode = 'find' | 'replace'
type FindListener = (mode: FindMode) => void

let listener: FindListener | null = null

export function setFindListener(fn: FindListener) { listener = fn }
export function clearFindListener() { listener = null }
export function openFind()        { listener?.('find') }
export function openFindReplace() { listener?.('replace') }
