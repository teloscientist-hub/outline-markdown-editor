import { useEffect, useRef, useCallback, useState } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar'
import { WorkspaceLayout } from './components/WorkspaceLayout'
import { StatusBar } from './components/StatusBar/StatusBar'
import { Preferences } from './components/Preferences/Preferences'
import { DocumentInfo } from './components/DocumentInfo/DocumentInfo'
import { applyFormat } from './formatBus'
import type { FormatType } from './formatBus'
import { useDocumentStore } from './store/documentStore'
import './App.css'

declare global {
  interface Window {
    electronAPI?: {
      initialInfo?: {
        type: 'file' | 'blank' | 'readme'
        filePath?: string | null
        content?: string | null
        prefs?: Record<string, unknown>
      }
      openFile:    () => Promise<{ filePath: string; content: string } | null>
      saveFile:    (filePath: string | null, content: string) => Promise<string | null>
      saveFileAs:  (content: string, defaultPath?: string) => Promise<string | null>
      readFile:    (filePath: string) => Promise<string>
      statFile:    (filePath: string) => Promise<{ created: string; modified: string; size: number } | null>
      setFilePath: (filePath: string | null) => Promise<void>
      getPreferences: () => Promise<{ startup: string; recentFiles?: string[] }>
      setPreferences: (prefs: Record<string, unknown>) => Promise<void>
      onMenuOpen:          (cb: () => void) => void
      onMenuSave:          (cb: () => void) => void
      onMenuSaveAs:        (cb: () => void) => void
      onMenuToggleOutline: (cb: () => void) => void
      onMenuToggleMarkdown:(cb: () => void) => void
      onMenuToggleDisplay: (cb: () => void) => void
      onMenuAllPanes:      (cb: () => void) => void
      onMenuPreferences:   (cb: () => void) => void
      onMenuDocInfo:       (cb: () => void) => void
      onMenuFormat:        (cb: (type: FormatType) => void) => void
      onOpenFile:          (cb: (filePath: string) => void) => void
      autosaveWrite:  (content: string, filePath: string | null) => Promise<void>
      autosaveDelete: (filePath: string | null) => Promise<void>
      autosaveCheck:  (filePath: string | null) => Promise<{
        content: string; savedAt: string; originalPath: string | null
      } | null>
      removeAllListeners:  (channel: string) => void
    }
  }
}

// Format an ISO date string into a human-readable relative time
function formatSavedAt(iso: string): string {
  try {
    const d    = new Date(iso)
    const diff = Math.round((Date.now() - d.getTime()) / 1000)
    if (diff <  60)  return `${diff}s ago`
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return 'recently' }
}

export function App() {
  const {
    content, filePath, isDirty, theme,
    loadFile, markSaved,
    toggleOutline, toggleMarkdown, toggleDisplay, showAllPanes,
  } = useDocumentStore()

  const [showPreferences, setShowPreferences] = useState(false)
  const [showDocInfo,     setShowDocInfo]     = useState(false)
  const [restoreOffer, setRestoreOffer] = useState<{
    content: string; savedAt: string; originalContent: string; filePath: string | null
  } | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Window title ────────────────────────────────────────────────────────────
  useEffect(() => {
    const name = filePath
      ? filePath.split('/').pop() ?? 'Untitled'
      : 'Untitled'
    document.title = name + (isDirty ? ' \u2022' : '') + ' \u2014 Outline Markdown Editor'
  }, [filePath, isDirty])

  // ── Notify main process of file path ───────────────────────────────────────
  useEffect(() => {
    window.electronAPI?.setFilePath(filePath)
  }, [filePath])

  // ── File operations ─────────────────────────────────────────────────────────
  const handleOpen = useCallback(async () => {
    const result = await window.electronAPI?.openFile()
    if (!result) return
    const autosave = await window.electronAPI?.autosaveCheck(result.filePath)
    if (autosave) {
      setRestoreOffer({
        content:         autosave.content,
        savedAt:         autosave.savedAt,
        originalContent: result.content,
        filePath:        result.filePath,
      })
      // Load the original first so the file is "open"; restore will swap content
      loadFile(result.filePath, result.content)
    } else {
      loadFile(result.filePath, result.content)
    }
  }, [loadFile])

  const handleSave = useCallback(async () => {
    const savedPath = await window.electronAPI?.saveFile(filePath, content)
    if (savedPath) {
      markSaved(savedPath)
      // Real save succeeded — autosave is now redundant, remove it
      window.electronAPI?.autosaveDelete(savedPath)
    }
  }, [filePath, content, markSaved])

  const handleSaveAs = useCallback(async () => {
    const savedPath = await window.electronAPI?.saveFileAs(content)
    if (savedPath) {
      markSaved(savedPath)
      window.electronAPI?.autosaveDelete(savedPath)
    }
  }, [content, markSaved])

  const handleOpenPath = useCallback(async (p: string) => {
    try {
      const fileContent = await window.electronAPI?.readFile(p)
      if (fileContent !== undefined) loadFile(p, fileContent)
    } catch (e) { console.error('Failed to open file:', p, e) }
  }, [loadFile])

  // ── Autosave (writes to ~/Library/Application Support/…/autosave/ NOT the original) ──
  useEffect(() => {
    if (!isDirty) return                        // nothing changed — nothing to save
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      window.electronAPI?.autosaveWrite(content, filePath)
    }, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [content, isDirty, filePath])

  // ── Check for autosave on initial launch ──────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { filePath: initialPath, content: initialContent } = useDocumentStore.getState()
      const autosave = await window.electronAPI?.autosaveCheck(initialPath)
      if (!autosave) return
      setRestoreOffer({
        content:         autosave.content,
        savedAt:         autosave.savedAt,
        originalContent: initialContent,
        filePath:        initialPath,
      })
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Electron menu events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onMenuOpen(handleOpen)
    window.electronAPI.onMenuSave(handleSave)
    window.electronAPI.onMenuSaveAs(handleSaveAs)
    window.electronAPI.onMenuToggleOutline(toggleOutline)
    window.electronAPI.onMenuToggleMarkdown(toggleMarkdown)
    window.electronAPI.onMenuToggleDisplay(toggleDisplay)
    window.electronAPI.onMenuAllPanes(showAllPanes)
    window.electronAPI.onMenuPreferences(() => setShowPreferences(true))
    window.electronAPI.onMenuDocInfo(() => setShowDocInfo(true))
    window.electronAPI.onMenuFormat((type) => applyFormat(type))
    return () => {
      ['menu:open','menu:save','menu:save-as',
       'menu:toggle-outline','menu:toggle-markdown','menu:toggle-display',
       'menu:all-panes','menu:preferences','menu:doc-info','menu:format']
        .forEach(c => window.electronAPI?.removeAllListeners(c))
    }
  }, [filePath, content, handleOpen, handleSave, handleSaveAs,
      toggleOutline, toggleMarkdown, toggleDisplay, showAllPanes])

  // ── OS open-file events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onOpenFile(handleOpenPath)
    return () => window.electronAPI?.removeAllListeners('open-file')
  }, [handleOpenPath])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === '1') { e.preventDefault(); toggleOutline() }
      if (e.key === '2') { e.preventDefault(); toggleMarkdown() }
      if (e.key === '3') { e.preventDefault(); toggleDisplay() }
      if (e.key === '0') { e.preventDefault(); showAllPanes() }
      if (e.key === 's' && !e.shiftKey) { e.preventDefault(); handleSave() }
      if (e.key === 's' &&  e.shiftKey) { e.preventDefault(); handleSaveAs() }
      if (e.key === 'o') { e.preventDefault(); handleOpen() }
      if (e.key === ',') { e.preventDefault(); setShowPreferences(true) }
      if (e.key === 'i' && !e.shiftKey) { /* handled by CM keymap (italic) */ }
      if (e.key === 'i' &&  e.shiftKey) { e.preventDefault(); setShowDocInfo(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleOpen, handleSave, handleSaveAs,
      toggleOutline, toggleMarkdown, toggleDisplay, showAllPanes])

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    if (theme === 'light') root.classList.add('theme-light')
    if (theme === 'dark')  root.classList.add('theme-dark')
  }, [theme])

  return (
    <div className="app">
      <Toolbar onOpen={handleOpen} onSave={handleSave} />
      <WorkspaceLayout />
      <StatusBar />
      {showPreferences && <Preferences onClose={() => setShowPreferences(false)} />}
      {showDocInfo     && <DocumentInfo onClose={() => setShowDocInfo(false)} />}

      {/* Autosave restore offer */}
      {restoreOffer && (() => {
        const origName = restoreOffer.filePath
          ? restoreOffer.filePath.split('/').pop()!.replace(/\.md$/i, '')
          : 'untitled'
        const origDir  = restoreOffer.filePath
          ? restoreOffer.filePath.substring(0, restoreOffer.filePath.lastIndexOf('/'))
          : null
        const saveAsPath = origDir
          ? `${origDir}/${origName}-autosaved.md`
          : `${origName}-autosaved.md`
        return (
          <div className="autosave-restore-overlay">
            <div className="autosave-restore-dialog">
              <h3>Unsaved changes found</h3>
              <p className="autosave-restore-filename">
                {restoreOffer.filePath ? restoreOffer.filePath.split('/').pop() : 'Untitled (unsaved)'}
              </p>
              <p>
                An autosave from <strong>{formatSavedAt(restoreOffer.savedAt)}</strong> is available.
              </p>
              <div className="autosave-restore-actions">
                <button
                  className="autosave-btn autosave-btn--primary"
                  onClick={() => {
                    useDocumentStore.getState().setContent(restoreOffer.content)
                    setRestoreOffer(null)
                  }}
                >
                  Restore Autosave
                </button>
                <button
                  className="autosave-btn"
                  onClick={async () => {
                    // Save autosave content as a new file so user can compare
                    await window.electronAPI?.saveFileAs(restoreOffer.content, saveAsPath)
                    window.electronAPI?.autosaveDelete(restoreOffer.filePath)
                    setRestoreOffer(null)
                  }}
                >
                  Save as New…
                </button>
                <button
                  className="autosave-btn"
                  onClick={() => {
                    window.electronAPI?.autosaveDelete(restoreOffer.filePath)
                    setRestoreOffer(null)
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default App
