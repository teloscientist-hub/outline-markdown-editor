import { useEffect, useRef, useState, useCallback } from 'react'
import type { EditorView } from '@codemirror/view'
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll } from '@codemirror/search'
import './FindReplace.css'

interface Props {
  mode: 'find' | 'replace'
  onModeChange: (mode: 'find' | 'replace') => void
  onClose: () => void
  viewRef: React.RefObject<EditorView | null>
}

export function FindReplace({ mode, onModeChange, onClose, viewRef }: Props) {
  const [findText,    setFindText]    = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase,   setMatchCase]   = useState(false)
  const [wholeWord,   setWholeWord]   = useState(false)
  const [matchCount,  setMatchCount]  = useState<number | null>(null)

  const findInputRef = useRef<HTMLInputElement>(null)

  // Focus find input on open
  useEffect(() => {
    requestAnimationFrame(() => findInputRef.current?.focus())
  }, [])

  // Build and dispatch a SearchQuery to CodeMirror whenever inputs change
  const applyQuery = useCallback((find: string, caseSensitive: boolean, word: boolean) => {
    const view = viewRef.current
    if (!view) return

    const query = new SearchQuery({ search: find, caseSensitive, wholeWord: word })
    view.dispatch({ effects: setSearchQuery.of(query) })

    // Count matches
    if (!find) { setMatchCount(null); return }
    try {
      const doc = view.state.doc.toString()
      const flags = caseSensitive ? 'g' : 'gi'
      let pattern = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (word) pattern = `\\b${pattern}\\b`
      const count = (doc.match(new RegExp(pattern, flags)) ?? []).length
      setMatchCount(count)
    } catch { setMatchCount(null) }
  }, [viewRef])

  useEffect(() => {
    applyQuery(findText, matchCase, wholeWord)
  }, [findText, matchCase, wholeWord, applyQuery])

  // Clear highlights when closing
  useEffect(() => {
    return () => {
      const view = viewRef.current
      if (view) {
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) })
      }
    }
  }, [viewRef])

  const handleFindNext = useCallback(() => {
    const view = viewRef.current
    if (!view || !findText) return
    findNext(view)
    view.focus()
  }, [viewRef, findText])

  const handleFindPrev = useCallback(() => {
    const view = viewRef.current
    if (!view || !findText) return
    findPrevious(view)
    view.focus()
  }, [viewRef, findText])

  const handleReplaceOne = useCallback(() => {
    const view = viewRef.current
    if (!view || !findText) return
    // Push the current replace text into the query before replacing.
    view.dispatch({ effects: setSearchQuery.of(
      new SearchQuery({ search: findText, replace: replaceText, caseSensitive: matchCase, wholeWord })
    )})
    replaceNext(view)
    applyQuery(findText, matchCase, wholeWord)
    view.focus()
  }, [viewRef, findText, replaceText, matchCase, wholeWord, applyQuery])

  const handleReplaceAll = useCallback(() => {
    const view = viewRef.current
    if (!view || !findText) return
    view.dispatch({ effects: setSearchQuery.of(
      new SearchQuery({ search: findText, replace: replaceText, caseSensitive: matchCase, wholeWord })
    )})
    replaceAll(view)
    applyQuery(findText, matchCase, wholeWord)
    view.focus()
  }, [viewRef, findText, replaceText, matchCase, wholeWord, applyQuery])

  const handleFindKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) handleFindPrev()
      else handleFindNext()
    }
  }, [onClose, handleFindNext, handleFindPrev])

  const handleReplaceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter') { e.preventDefault(); handleReplaceOne() }
  }, [onClose, handleReplaceOne])

  const matchLabel = matchCount === null ? '' :
    matchCount === 0 ? 'No results' :
    `${matchCount} match${matchCount !== 1 ? 'es' : ''}`

  return (
    <div className="find-replace-bar" role="search">
      <div className="find-replace-row">
        <div className="find-replace-inputs">
          <div className="find-input-wrapper">
            <input
              ref={findInputRef}
              className="find-input"
              type="text"
              placeholder="Find"
              value={findText}
              onChange={e => setFindText(e.target.value)}
              onKeyDown={handleFindKeyDown}
              spellCheck={false}
            />
            {matchLabel && (
              <span className={`find-match-count ${matchCount === 0 ? 'find-match-count--none' : ''}`}>
                {matchLabel}
              </span>
            )}
          </div>

          {mode === 'replace' && (
            <input
              className="find-input"
              type="text"
              placeholder="Replace"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              spellCheck={false}
            />
          )}
        </div>

        <div className="find-replace-options">
          <button
            className={`find-option-btn ${matchCase ? 'find-option-btn--active' : ''}`}
            title="Match Case (Alt+C)"
            onClick={() => setMatchCase(v => !v)}
          >Aa</button>
          <button
            className={`find-option-btn ${wholeWord ? 'find-option-btn--active' : ''}`}
            title="Whole Word (Alt+W)"
            onClick={() => setWholeWord(v => !v)}
          >[W]</button>
        </div>

        <div className="find-replace-nav">
          <button className="find-nav-btn" title="Previous (Shift+Enter)" onClick={handleFindPrev} disabled={!findText}>↑</button>
          <button className="find-nav-btn" title="Next (Enter)"           onClick={handleFindNext} disabled={!findText}>↓</button>
        </div>

        {mode === 'replace' && (
          <div className="find-replace-actions">
            <button className="find-action-btn" onClick={handleReplaceOne} disabled={!findText}>Replace</button>
            <button className="find-action-btn" onClick={handleReplaceAll} disabled={!findText}>All</button>
          </div>
        )}

        <div className="find-replace-toggles">
          <button
            className="find-mode-btn"
            title={mode === 'find' ? 'Show Replace' : 'Hide Replace'}
            onClick={() => onModeChange(mode === 'find' ? 'replace' : 'find')}
          >{mode === 'find' ? '⇄' : '⇄'}</button>
          <button className="find-close-btn" title="Close (Esc)" onClick={onClose}>✕</button>
        </div>
      </div>
    </div>
  )
}
