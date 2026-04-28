'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path   = require('path');
const crypto = require('crypto');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Docs path (bundled via extraResources) ───────────────────────────────────
function getDocsPath() {
  return isDev
    ? path.join(__dirname, '../docs')
    : path.join(process.resourcesPath, 'docs')
}

// ── Per-window data ──────────────────────────────────────────────────────────
const windowData = new Map();

// ── Preferences ──────────────────────────────────────────────────────────────
const PREFS_PATH    = path.join(app.getPath('userData'), 'preferences.json');
const AUTOSAVE_DIR  = path.join(app.getPath('userData'), 'autosave');

// Ensure autosave directory exists
if (!fs.existsSync(AUTOSAVE_DIR)) fs.mkdirSync(AUTOSAVE_DIR, { recursive: true });

// Map filePath (or 'untitled') → deterministic autosave path
function getAutosavePath(filePath) {
  const key  = filePath || 'untitled';
  const hash = crypto.createHash('md5').update(key).digest('hex');
  return path.join(AUTOSAVE_DIR, hash + '.autosave.md');
}
function getAutosaveMetaPath(filePath) { return getAutosavePath(filePath) + '.json'; }
const MAX_RECENT = 10;

function readPrefs() {
  try {
    const p = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
    // Migrate legacy recentFile → recentFiles
    if (!p.recentFiles) {
      p.recentFiles = p.recentFile ? [p.recentFile] : [];
      delete p.recentFile;
    }
    return p;
  } catch {
    return { startup: 'readme', recentFiles: [] };
  }
}

function writePrefs(prefs) {
  try { fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf-8'); }
  catch {}
}

function pushRecentFile(filePath) {
  if (!filePath) return;
  const prefs = readPrefs();
  const files = (prefs.recentFiles || []).filter(f => f !== filePath);
  files.unshift(filePath);
  prefs.recentFiles = files.slice(0, MAX_RECENT);
  writePrefs(prefs);
  buildMenu();
}

// ── Window creation ───────────────────────────────────────────────────────────
function createWindow(filePath = null) {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 800, minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e1e1e',
    show: false,
  });

  windowData.set(win.id, { filePath });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    buildMenu();
  });

  win.on('page-title-updated', () => buildMenu());
  win.on('focus', () => buildMenu());
  win.on('blur',  () => buildMenu());

  win.on('closed', () => {
    windowData.delete(win.id);
    buildMenu();
  });

  return win;
}

// ── Open a recent file (reuse empty window or make a new one) ─────────────────
function openRecentFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const focused = BrowserWindow.getFocusedWindow();
  // Prefer the currently focused window if it has no file (untouched new window)
  if (focused) {
    const d = windowData.get(focused.id);
    if (d && !d.filePath) {
      windowData.set(focused.id, { filePath });
      focused.webContents.send('open-file', filePath);
      return;
    }
  }
  // Find any empty window
  const emptyWin = BrowserWindow.getAllWindows().find(w => {
    const d = windowData.get(w.id);
    return d && !d.filePath;
  });
  if (emptyWin) {
    windowData.set(emptyWin.id, { filePath });
    emptyWin.webContents.send('open-file', filePath);
    if (emptyWin.isMinimized()) emptyWin.restore();
    emptyWin.focus();
  } else {
    createWindow(filePath);
  }
}

// ── macOS open-file ────────────────────────────────────────────────────────────
let pendingOpenFile = null;

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    const emptyWin = BrowserWindow.getAllWindows().find(w => {
      const d = windowData.get(w.id);
      return d && !d.filePath;
    });
    if (emptyWin) {
      windowData.set(emptyWin.id, { filePath });
      emptyWin.webContents.send('open-file', filePath);
      if (emptyWin.isMinimized()) emptyWin.restore();
      emptyWin.focus();
    } else {
      createWindow(filePath);
    }
  } else {
    pendingOpenFile = filePath;
  }
});

// ── Menu ──────────────────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const focused = BrowserWindow.getFocusedWindow();
  const allWins = BrowserWindow.getAllWindows();

  const send = (channel, ...args) => focused?.webContents.send(channel, ...args);

  // Recent Files submenu
  const prefs = readPrefs();
  const recentFiles = prefs.recentFiles || [];
  const recentSubmenu = recentFiles.length
    ? [
        ...recentFiles.map((fp, i) => ({
          label: `${i + 1}. ${path.basename(fp)}`,
          sublabel: fp,
          click: () => openRecentFile(fp),
        })),
        { type: 'separator' },
        {
          label: 'Clear Recent Files',
          click: () => {
            const p = readPrefs(); p.recentFiles = []; writePrefs(p); buildMenu();
          },
        },
      ]
    : [{ label: 'No Recent Files', enabled: false }];

  const template = [
    ...(isMac ? [{
      role: 'appMenu',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences\u2026',
          accelerator: 'Cmd+,',
          click: () => send('menu:preferences'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // New Window always opens blank — startup pref only applies at launch.
            const w = createWindow(null);
            windowData.set(w.id, { filePath: null, forceBlank: true });
          },
        },
        { label: 'Open\u2026',     accelerator: 'CmdOrCtrl+O',       click: () => send('menu:open') },
        {
          label: 'Open Recent',
          submenu: recentSubmenu,
        },
        { type: 'separator' },
        { label: 'Save',          accelerator: 'CmdOrCtrl+S',       click: () => send('menu:save') },
        { label: 'Save As\u2026', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        {
          label: 'Document Info\u2026',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => send('menu:doc-info'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Format',
      submenu: [
        { label: 'Heading 1', accelerator: 'CmdOrCtrl+Alt+1', click: () => send('menu:format', 'h1') },
        { label: 'Heading 2', accelerator: 'CmdOrCtrl+Alt+2', click: () => send('menu:format', 'h2') },
        { label: 'Heading 3', accelerator: 'CmdOrCtrl+Alt+3', click: () => send('menu:format', 'h3') },
        { label: 'Heading 4', accelerator: 'CmdOrCtrl+Alt+4', click: () => send('menu:format', 'h4') },
        { label: 'Heading 5', accelerator: 'CmdOrCtrl+Alt+5', click: () => send('menu:format', 'h5') },
        { label: 'Heading 6', accelerator: 'CmdOrCtrl+Alt+6', click: () => send('menu:format', 'h6') },
        { type: 'separator' },
        { label: 'Promote Heading  (H−)', accelerator: 'CmdOrCtrl+[', click: () => send('menu:format', 'promote') },
        { label: 'Demote Heading  (H+)',  accelerator: 'CmdOrCtrl+]', click: () => send('menu:format', 'demote') },
        { type: 'separator' },
        { label: 'Bold',          accelerator: 'CmdOrCtrl+B',       click: () => send('menu:format', 'bold') },
        { label: 'Italic',        accelerator: 'CmdOrCtrl+I',       click: () => send('menu:format', 'italic') },
        { type: 'separator' },
        { label: 'Bullet List',   accelerator: 'CmdOrCtrl+Shift+8', click: () => send('menu:format', 'ul') },
        { label: 'Numbered List', accelerator: 'CmdOrCtrl+Shift+7', click: () => send('menu:format', 'ol') },
        { label: 'Todo Item',     accelerator: 'CmdOrCtrl+Shift+T', click: () => send('menu:format', 'todo') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Outline',  accelerator: 'CmdOrCtrl+1', click: () => send('menu:toggle-outline') },
        { label: 'Toggle Markdown', accelerator: 'CmdOrCtrl+2', click: () => send('menu:toggle-markdown') },
        { label: 'Toggle Display',  accelerator: 'CmdOrCtrl+3', click: () => send('menu:toggle-display') },
        { type: 'separator' },
        { label: 'All Panes',       accelerator: 'CmdOrCtrl+0', click: () => send('menu:all-panes') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ role: 'front' }, { type: 'separator' }] : [{ type: 'separator' }]),
        ...allWins.map(win => ({
          label: win.getTitle() || 'Untitled \u2014 Outline Markdown Editor',
          type: 'checkbox',
          checked: win.id === focused?.id,
          click: () => { if (win.isMinimized()) win.restore(); win.focus(); },
        })),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Feature Overview',
          click: () => openRecentFile(path.join(getDocsPath(), 'Feature-Overview.md')),
        },
        {
          label: "User's Manual",
          click: () => openRecentFile(path.join(getDocsPath(), 'Users-Manual.md')),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC: synchronous initial-info ─────────────────────────────────────────────
ipcMain.on('app:get-initial-info-sync', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const data = windowData.get(win?.id);
  const prefs = readPrefs();

  if (data?.filePath) {
    try {
      const content = fs.readFileSync(data.filePath, 'utf-8');
      event.returnValue = { type: 'file', filePath: data.filePath, content, prefs };
      return;
    } catch {}
  }

  if (data?.forceBlank) {
    event.returnValue = { type: 'blank', filePath: null, content: '', prefs };
    return;
  }

  if (prefs.startup === 'blank') {
    event.returnValue = { type: 'blank', filePath: null, content: '', prefs };
  } else if (prefs.startup === 'recent' && prefs.recentFiles?.length) {
    try {
      const fp = prefs.recentFiles[0];
      const content = fs.readFileSync(fp, 'utf-8');
      event.returnValue = { type: 'file', filePath: fp, content, prefs };
    } catch {
      event.returnValue = { type: 'readme', filePath: null, content: null, prefs };
    }
  } else {
    event.returnValue = { type: 'readme', filePath: null, content: null, prefs };
  }
});

// ── IPC: preferences ──────────────────────────────────────────────────────────
ipcMain.handle('prefs:get', () => readPrefs());
ipcMain.handle('prefs:set', (_, prefs) => writePrefs(prefs));

// ── IPC: window file path update ──────────────────────────────────────────────
ipcMain.handle('window:set-file-path', (event, filePath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    windowData.set(win.id, { ...windowData.get(win.id), filePath });
    if (filePath) pushRecentFile(filePath);
  }
});

// ── IPC: file stat (for Document Info) ───────────────────────────────────────
ipcMain.handle('fs:stat', (_, filePath) => {
  if (!filePath) return null;
  try {
    const s = fs.statSync(filePath);
    return { created: s.birthtime.toISOString(), modified: s.mtime.toISOString(), size: s.size };
  } catch { return null; }
});

// ── IPC: file dialogs ─────────────────────────────────────────────────────────
ipcMain.handle('dialog:open', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('dialog:save', async (event, { filePath, content }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  let savePath = filePath;
  if (!savePath) {
    const result = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md',
    });
    if (result.canceled) return null;
    savePath = result.filePath;
  }
  fs.writeFileSync(savePath, content, 'utf-8');
  return savePath;
});

ipcMain.handle('dialog:save-as', async (event, { content }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    defaultPath: 'untitled.md',
  });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return result.filePath;
});

ipcMain.handle('fs:read', (_, filePath) => fs.readFileSync(filePath, 'utf-8'));

// ── Autosave IPC ──────────────────────────────────────────────────────────────

// Write content to the autosave slot for this filePath
ipcMain.handle('autosave:write', (_, { content, filePath }) => {
  try {
    const p = getAutosavePath(filePath);
    fs.writeFileSync(p, content, 'utf-8');
    fs.writeFileSync(getAutosaveMetaPath(filePath), JSON.stringify({
      filePath,
      savedAt: new Date().toISOString(),
    }), 'utf-8');
  } catch (e) { console.error('autosave:write failed', e); }
});

// Delete the autosave slot (called after a successful real save)
ipcMain.handle('autosave:delete', (_, { filePath }) => {
  try {
    const p = getAutosavePath(filePath);
    if (fs.existsSync(p))                      fs.unlinkSync(p);
    if (fs.existsSync(getAutosaveMetaPath(filePath))) fs.unlinkSync(getAutosaveMetaPath(filePath));
  } catch (e) { console.error('autosave:delete failed', e); }
});

// Check whether a newer autosave exists for this filePath.
// Returns { content, savedAt, originalPath } or null.
ipcMain.handle('autosave:check', (_, { filePath }) => {
  try {
    const p = getAutosavePath(filePath);
    if (!fs.existsSync(p)) return null;

    const autosaveStat = fs.statSync(p);

    // If there IS an original file, only offer restore if autosave is strictly newer
    if (filePath) {
      try {
        const origStat = fs.statSync(filePath);
        if (autosaveStat.mtime <= origStat.mtime) {
          // Autosave is stale — clean it up silently
          fs.unlinkSync(p);
          if (fs.existsSync(getAutosaveMetaPath(filePath))) fs.unlinkSync(getAutosaveMetaPath(filePath));
          return null;
        }
      } catch { /* original file missing — still offer restore */ }
    }

    const autosaveContent = fs.readFileSync(p, 'utf-8');
    let savedAt = autosaveStat.mtime.toISOString();
    try {
      const meta = JSON.parse(fs.readFileSync(getAutosaveMetaPath(filePath), 'utf-8'));
      savedAt = meta.savedAt || savedAt;
    } catch {}

    return { content: autosaveContent, savedAt, originalPath: filePath };
  } catch (e) { return null; }
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  const fileToOpen = pendingOpenFile;
  pendingOpenFile = null;

  const cliFile = process.argv.find(
    (a, i) => i >= (isDev ? 2 : 1) && a !== '.' && fs.existsSync(a)
  ) || null;

  createWindow(fileToOpen || cliFile || null);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
