import type { FormatType } from './formatting'

type FormatterFn = (type: FormatType) => void

let _formatter: FormatterFn | null = null

/** Called by MarkdownPane when it mounts an EditorView. */
export function setFormatter(fn: FormatterFn): void { _formatter = fn }

/** Called by MarkdownPane on unmount. */
export function clearFormatter(): void { _formatter = null }

/** Called by App.tsx (menu events) or other consumers. */
export function applyFormat(type: FormatType): void { _formatter?.(type) }

export type { FormatType }
