'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// ── Synchronous initial info ──────────────────────────────────────────────────
const initialInfo = ipcRenderer.sendSync('app:get-initial-info-sync');

contextBridge.exposeInMainWorld('electronAPI', {
  initialInfo,

  // File operations
  openFile:   () => ipcRenderer.invoke('dialog:open'),
  saveFile:   (filePath, content) => ipcRenderer.invoke('dialog:save', { filePath, content }),
  saveFileAs: (content) => ipcRenderer.invoke('dialog:save-as', { content }),
  readFile:   (filePath) => ipcRenderer.invoke('fs:read', filePath),
  statFile:   (filePath) => ipcRenderer.invoke('fs:stat', filePath),

  // Notify main of the current file path
  setFilePath: (filePath) => ipcRenderer.invoke('window:set-file-path', filePath),

  // Preferences
  getPreferences: () => ipcRenderer.invoke('prefs:get'),
  setPreferences: (prefs) => ipcRenderer.invoke('prefs:set', prefs),

  // Menu events
  onMenuOpen:          (cb) => ipcRenderer.on('menu:open',           () => cb()),
  onMenuSave:          (cb) => ipcRenderer.on('menu:save',           () => cb()),
  onMenuSaveAs:        (cb) => ipcRenderer.on('menu:save-as',        () => cb()),
  onMenuToggleOutline: (cb) => ipcRenderer.on('menu:toggle-outline', () => cb()),
  onMenuToggleMarkdown:(cb) => ipcRenderer.on('menu:toggle-markdown',() => cb()),
  onMenuToggleDisplay: (cb) => ipcRenderer.on('menu:toggle-display', () => cb()),
  onMenuAllPanes:      (cb) => ipcRenderer.on('menu:all-panes',      () => cb()),
  onMenuPreferences:   (cb) => ipcRenderer.on('menu:preferences',    () => cb()),
  onMenuDocInfo:       (cb) => ipcRenderer.on('menu:doc-info',       () => cb()),

  // OS-level file open
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_event, filePath) => cb(filePath)),

  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
