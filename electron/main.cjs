'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, screen } = require('electron');
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

// Bundled reference docs (Feature Overview, User's Manual) are read-only material
// shipped with the app. They must never be autosaved or offered for restore.
function isBundledDoc(filePath) {
  if (!filePath) return false;
  try {
    const rel = path.relative(getDocsPath(), filePath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  } catch { return false; }
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

// ── Save-time safety net ───────────────────────────────────────────────────────
// A save-time bug (e.g. writing back a folded/filtered view of the document as
// if it were the whole thing) can silently destroy content with no way back.
// These two mechanisms exist so that class of bug can never cause permanent
// data loss again: every overwrite is preceded by a timestamped backup, and an
// overwrite that would drastically shrink an existing file requires confirmation.
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const MAX_BACKUPS_PER_FILE = 25;

function getBackupDir(filePath) {
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  return path.join(BACKUP_DIR, hash);
}

// Copy the file's current on-disk contents into a timestamped backup before we
// overwrite it. Best-effort — a backup failure must never block the actual save.
function backupBeforeOverwrite(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath) || isBundledDoc(filePath)) return;
    const dir = getBackupDir(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(filePath, path.join(dir, `${ts}.md`));
    const kept = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
    while (kept.length > MAX_BACKUPS_PER_FILE) fs.unlinkSync(path.join(dir, kept.shift()));
  } catch (e) { console.error('backupBeforeOverwrite failed', e); }
}

// Warn before a save that would drastically shrink an existing document — the
// exact shape of a "wrote back a filtered view" bug. Returns true to proceed.
async function confirmIfSuspiciousShrink(win, filePath, newContent) {
  try {
    if (!filePath || !fs.existsSync(filePath) || isBundledDoc(filePath)) return true;
    const oldSize = fs.statSync(filePath).size;
    const newSize = Buffer.byteLength(newContent, 'utf-8');
    if (oldSize < 200 || newSize >= oldSize * 0.5) return true; // too small to matter, or not a drastic shrink
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancel', 'Save Anyway'],
      defaultId: 0,
      cancelId: 0,
      title: 'Large content decrease detected',
      message: `Saving "${path.basename(filePath)}" would shrink it from ${oldSize.toLocaleString()} to ${newSize.toLocaleString()} bytes.`,
      detail: 'If this is unexpected, click Cancel. A backup of the current file is kept either way — see Help › Reveal Debug & Backup Folder.',
    });
    return response === 1;
  } catch (e) { console.error('confirmIfSuspiciousShrink failed', e); return true; }
}

// ── Debug log ──────────────────────────────────────────────────────────────────
// Append-only structured log for diagnosing content-loss and other hard-to-
// reproduce bugs. Kept small and rotated so it never grows unbounded.
const LOG_PATH = path.join(app.getPath('userData'), 'debug.log');
const MAX_LOG_BYTES = 2 * 1024 * 1024; // 2 MB

function debugLog(event, data) {
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > MAX_LOG_BYTES) {
      // Rotate: keep the newer half rather than growing forever
      const lines = fs.readFileSync(LOG_PATH, 'utf-8').split('\n');
      fs.writeFileSync(LOG_PATH, lines.slice(Math.floor(lines.length / 2)).join('\n'));
    }
    const line = JSON.stringify({ t: new Date().toISOString(), event, ...data });
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch (e) { console.error('debugLog failed', e); }
}

function readPrefs() {
  try {
    const p = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
    // Migrate legacy recentFile → recentFiles
    if (!p.recentFiles) {
      p.recentFiles = p.recentFile ? [p.recentFile] : [];
      delete p.recentFile;
    }
    // Migrate the legacy default 'readme' (which opened the welcome doc on every
    // launch) to 'auto' — show it for the first few launches, then open blank.
    // Only migrate if the user never explicitly picked a startup mode themselves.
    if (p.startup === 'readme' && !p.startupChosen) p.startup = 'auto';
    return p;
  } catch {
    return { startup: 'auto', recentFiles: [], launchCount: 0 };
  }
}

// Launches 1–3 show the welcome README; launch 4+ opens a blank document.
const README_LAUNCH_LIMIT = 3;

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
const CASCADE = 28;

function getCascadePosition() {
  const all = BrowserWindow.getAllWindows();
  if (all.length === 0) return {};
  const ref = BrowserWindow.getFocusedWindow() || all[all.length - 1];
  const { x, y } = ref.getBounds();
  const display = screen.getDisplayNearestPoint({ x, y });
  const wa = display.workArea;
  let nx = x + CASCADE;
  let ny = y + CASCADE;
  // Wrap if the new window would fall outside the work area
  if (nx + 1400 > wa.x + wa.width || ny + 900 > wa.y + wa.height) {
    nx = wa.x + CASCADE;
    ny = wa.y + CASCADE;
  }
  return { x: nx, y: ny };
}

function createWindow(filePath = null) {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 800, minHeight: 600,
    ...getCascadePosition(),
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

// ── Open a past saved version (from the Versions menu) in a new, untitled window ──
// Never touches the original file or the backup itself — the user must
// explicitly Save As if they want to keep what they're looking at.
function openVersionBackup(backupFilePath) {
  try {
    const content = fs.readFileSync(backupFilePath, 'utf-8');
    const w = createWindow(null);
    windowData.set(w.id, { filePath: null, initialContent: content });
  } catch (e) { console.error('openVersionBackup failed', e); }
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

  // Resolve the focused window at click time (not build time) so menu actions
  // always reach the currently-active window even if the menu wasn't rebuilt.
  const send = (channel, ...args) => {
    const target = BrowserWindow.getFocusedWindow() || focused;
    target?.webContents.send(channel, ...args);
  };

  // Format a shortcut for display in the Shortcuts reference menu.
  // mac → symbol form (⌥⇧⌘X, modifier order ⌃⌥⇧⌘); others → Ctrl+Shift+Alt+X.
  const sc = ({ ctrl, alt, shift, cmd, key }) => isMac
    ? `${ctrl ? '⌃' : ''}${alt ? '⌥' : ''}${shift ? '⇧' : ''}${cmd ? '⌘' : ''}${key}`
    : [cmd && 'Ctrl', ctrl && 'Ctrl', shift && 'Shift', alt && 'Alt', key].filter(Boolean).join('+');
  // A Shortcuts-menu row: shows "Label    ⌘X" and, when given an onClick,
  // is clickable (runs the same action). The shortcut lives in the label text
  // (not the accelerator field) so it does not double-register and conflict
  // with the real File/Edit/View/Format menu accelerators.
  const ref = (label, parts, onClick) => ({
    label: `${label} — ${sc(parts)}`,
    ...(onClick ? { click: onClick } : { enabled: false }),
  });

  // New blank window (mirrors File > New Window behavior)
  const newBlankWindow = () => {
    const w = createWindow(null);
    windowData.set(w.id, { filePath: null, forceBlank: true });
  };

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

  // Versions submenu: past saved snapshots of the FOCUSED window's file (see
  // backupBeforeOverwrite), newest first. Each opens read-only-in-spirit in a
  // new untitled window — Save As to keep it, the original file is untouched.
  const versionsFilePath = focused ? windowData.get(focused.id)?.filePath : null;
  let versionsSubmenu;
  if (!versionsFilePath) {
    versionsSubmenu = [{ label: 'Save the document first', enabled: false }];
  } else {
    let backups = [];
    try {
      const dir = getBackupDir(versionsFilePath);
      if (fs.existsSync(dir)) {
        backups = fs.readdirSync(dir)
          .filter(f => f.endsWith('.md'))
          .map(f => {
            const full = path.join(dir, f);
            return { full, mtime: fs.statSync(full).mtime };
          })
          .sort((a, b) => b.mtime - a.mtime);
      }
    } catch (e) { console.error('list backups failed', e); }
    versionsSubmenu = backups.length
      ? backups.map(b => ({
          label: b.mtime.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit',
          }),
          click: () => openVersionBackup(b.full),
        }))
      : [{ label: 'No versions yet — saved versions appear here after your next save', enabled: false }];
  }

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
        { role: 'reload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find…',
          accelerator: 'CmdOrCtrl+F',
          click: () => send('menu:find'),
        },
        {
          label: 'Find & Replace…',
          accelerator: 'CmdOrCtrl+R',
          click: () => send('menu:find-replace'),
        },
      ],
    },
    {
      label: 'Versions',
      submenu: versionsSubmenu,
    },
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
      label: 'Shortcuts',
      submenu: [
        { label: 'Keyboard Shortcuts', enabled: false },
        { type: 'separator' },

        { label: 'File', enabled: false },
        ref('New Window',    { cmd: true, key: 'N' }, () => newBlankWindow()),
        ref('Open',          { cmd: true, key: 'O' }, () => send('menu:open')),
        ref('Save',          { cmd: true, key: 'S' }, () => send('menu:save')),
        ref('Save As',       { cmd: true, shift: true, key: 'S' }, () => send('menu:save-as')),
        ref('Document Info', { cmd: true, shift: true, key: 'I' }, () => send('menu:doc-info')),
        { type: 'separator' },

        { label: 'Find', enabled: false },
        ref('Find',           { cmd: true, key: 'F' }, () => send('menu:find')),
        ref('Find & Replace', { cmd: true, key: 'R' }, () => send('menu:find-replace')),
        { type: 'separator' },

        { label: 'View', enabled: false },
        ref('Toggle Outline',  { cmd: true, key: '1' }, () => send('menu:toggle-outline')),
        ref('Toggle Markdown', { cmd: true, key: '2' }, () => send('menu:toggle-markdown')),
        ref('Toggle Display',  { cmd: true, key: '3' }, () => send('menu:toggle-display')),
        ref('Show All Panes',  { cmd: true, key: '0' }, () => send('menu:all-panes')),
        { type: 'separator' },

        { label: 'Format', enabled: false },
        ref('Heading 1', { cmd: true, alt: true, key: '1' }, () => send('menu:format', 'h1')),
        ref('Heading 2', { cmd: true, alt: true, key: '2' }, () => send('menu:format', 'h2')),
        ref('Heading 3', { cmd: true, alt: true, key: '3' }, () => send('menu:format', 'h3')),
        ref('Heading 4', { cmd: true, alt: true, key: '4' }, () => send('menu:format', 'h4')),
        ref('Heading 5', { cmd: true, alt: true, key: '5' }, () => send('menu:format', 'h5')),
        ref('Heading 6', { cmd: true, alt: true, key: '6' }, () => send('menu:format', 'h6')),
        ref('Bold',          { cmd: true, key: 'B' }, () => send('menu:format', 'bold')),
        ref('Italic',        { cmd: true, key: 'I' }, () => send('menu:format', 'italic')),
        ref('Bullet List',   { cmd: true, shift: true, key: '8' }, () => send('menu:format', 'ul')),
        ref('Numbered List', { cmd: true, shift: true, key: '7' }, () => send('menu:format', 'ol')),
        ref('Todo Item',     { cmd: true, shift: true, key: 'T' }, () => send('menu:format', 'todo')),
        ref('Promote Heading', { cmd: true, key: '[' }, () => send('menu:format', 'promote')),
        ref('Demote Heading',  { cmd: true, key: ']' }, () => send('menu:format', 'demote')),
        { type: 'separator' },

        { label: 'Outline / Sections', enabled: false },
        ref('Move Section Up',   { alt: true, key: '↑' }, () => send('menu:move-section-up')),
        ref('Move Section Down', { alt: true, key: '↓' }, () => send('menu:move-section-down')),
        { type: 'separator' },

        { label: 'App', enabled: false },
        ref('Preferences', { cmd: true, key: ',' }, () => send('menu:preferences'))
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
        { type: 'separator' },
        {
          label: 'Reveal Debug & Backup Folder',
          click: () => shell.showItemInFolder(LOG_PATH),
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

  // Opened from the Versions menu: a past backup's content, not tied to any file.
  if (data?.initialContent !== undefined) {
    event.returnValue = { type: 'unsaved', filePath: null, content: data.initialContent, prefs };
    return;
  }

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
  } else if (prefs.startup === 'auto') {
    // Show the welcome README for the first few launches, then open blank.
    const type = (prefs.launchCount || 0) <= README_LAUNCH_LIMIT ? 'readme' : 'blank';
    event.returnValue = { type, filePath: null, content: type === 'blank' ? '' : null, prefs };
  } else {
    // Explicit 'readme' — always show the welcome document.
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
    buildMenu(); // Versions submenu depends on this window's filePath
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

// Suggest a filename from the document's first non-blank line, stripping a
// leading ATX heading marker (# .. ######) so "# My Notes" -> "My Notes.md".
function suggestFilename(content) {
  const firstLine = (content || '').split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
  let name = firstLine.replace(/^#{1,6}\s+/, '').trim();
  name = name.replace(/[/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim(); // strip filename-illegal chars
  name = name.replace(/[.\s]+$/, '').slice(0, 80).trim(); // no trailing dots/spaces; cap length
  return (name || 'untitled') + '.md';
}

ipcMain.handle('dialog:save', async (event, { filePath, content }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  let savePath = filePath;
  if (!savePath) {
    const result = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: suggestFilename(content),
    });
    if (result.canceled) return null;
    savePath = result.filePath;
  }
  if (!(await confirmIfSuspiciousShrink(win, savePath, content))) {
    debugLog('save:cancelled-shrink-guard', { filePath: savePath, bytes: Buffer.byteLength(content, 'utf-8') });
    return null;
  }
  backupBeforeOverwrite(savePath);
  fs.writeFileSync(savePath, content, 'utf-8');
  debugLog('save', { filePath: savePath, bytes: Buffer.byteLength(content, 'utf-8') });
  buildMenu(); // refresh Versions submenu with the backup just taken
  return savePath;
});

ipcMain.handle('dialog:save-as', async (event, { content, defaultPath }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    defaultPath: defaultPath || suggestFilename(content),
  });
  if (result.canceled) return null;
  if (!(await confirmIfSuspiciousShrink(win, result.filePath, content))) {
    debugLog('save-as:cancelled-shrink-guard', { filePath: result.filePath, bytes: Buffer.byteLength(content, 'utf-8') });
    return null;
  }
  backupBeforeOverwrite(result.filePath);
  fs.writeFileSync(result.filePath, content, 'utf-8');
  debugLog('save-as', { filePath: result.filePath, bytes: Buffer.byteLength(content, 'utf-8') });
  buildMenu(); // refresh Versions submenu with the backup just taken
  return result.filePath;
});

ipcMain.handle('debug:log', (_event, { event: name, data }) => {
  debugLog(name, data || {});
});

ipcMain.handle('fs:read', (_, filePath) => fs.readFileSync(filePath, 'utf-8'));

// ── Link handling ─────────────────────────────────────────────────────────────
ipcMain.handle('link:open', (_, url) => shell.openExternal(url));

ipcMain.handle('link:context-menu', (event, url) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const menu = Menu.buildFromTemplate([
    { label: 'Open Link in Browser', click: () => shell.openExternal(url) },
    { label: 'Copy Link', click: () => require('electron').clipboard.writeText(url) },
  ]);
  menu.popup({ window: win });
});


// ── Autosave IPC ──────────────────────────────────────────────────────────────

// Write content to the autosave slot for this filePath
ipcMain.handle('autosave:write', (_, { content, filePath }) => {
  // Bundled reference docs are read-only — never autosave them.
  if (isBundledDoc(filePath)) return;
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

    // Bundled reference docs are read-only — never offer a restore for them.
    // Clean up any stale autosave left over from before this rule existed.
    if (isBundledDoc(filePath)) {
      try { fs.unlinkSync(p); } catch {}
      try { fs.unlinkSync(getAutosaveMetaPath(filePath)); } catch {}
      return null;
    }

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

    // Discard autosaves older than 24 hours — stale leftovers from previous sessions
    const ageMs = Date.now() - autosaveStat.mtime.getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      try { fs.unlinkSync(p); } catch {}
      try { fs.unlinkSync(getAutosaveMetaPath(filePath)); } catch {}
      return null;
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
  // Bump launch counter so the renderer can prompt for startup preference
  try {
    const p = readPrefs();
    p.launchCount = (p.launchCount || 0) + 1;
    writePrefs(p);
  } catch {}
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
