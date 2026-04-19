import { useEffect, useRef, useCallback, useState } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar'
import { WorkspaceLayout } from './components/WorkspaceLayout'
import { StatusBar } from './components/StatusBar/StatusBar'
import { Preferences } from './components/Preferences/Preferences'
import { DocumentInfo } from './components/DocumentInfo/DocumentInfo'
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
      saveFileAs:  (content: string) => Promise<string | null>
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
      onOpenFile:          (cb: (filePath: string) => void) => void
      removeAllListeners:  (channel: string) => void
    }
  }
}

export function App() {
  const {
    content, filePath, isDirty, theme,
    loadFile, markSaved,
    toggleOutline, toggleMarkdown, toggleDisplay, showAllPanes,
  } = useDocumentStore()

  const [showPreferences, setShowPreferences] = useState(false)
  const [showDocInfo,     setShowDocInfo]     = useState(false)
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
    if (result) loadFile(result.filePath, result.content)
  }, [loadFile])

  const handleSave = useCallback(async () => {
    const savedPath = await window.electronAPI?.saveFile(filePath, content)
    if (savedPath) markSaved(savedPath)
  }, [filePath, content, markSaved])

  const handleSaveAs = useCallback(async () => {
    const savedPath = await window.electronAPI?.saveFileAs(content)
    if (savedPath) markSaved(savedPath)
  }, [content, markSaved])

  const handleOpenPath = useCallback(async (p: string) => {
    try {
      const fileContent = await window.electronAPI?.readFile(p)
      if (fileContent !== undefined) loadFile(p, fileContent)
    } catch (e) { console.error('Failed to open file:', p, e) }
  }, [loadFile])

  // ── Autosave ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || !filePath) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => { handleSave() }, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [content, isDirty, filePath, handleSave])

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
    return () => {
      ['menu:open','menu:save','menu:save-as',
       'menu:toggle-outline','menu:toggle-markdown','menu:toggle-display',
       'menu:all-panes','menu:preferences','menu:doc-info']
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
      if (e.key === 'i') { e.preventDefault(); setShowDocInfo(true) }
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
    </div>
  )
}

export default App
