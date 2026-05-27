# Outline Markdown Editor — Claude Code Context

A tri-pane desktop markdown editor built with Electron + React + TypeScript + CodeMirror 6.
Three synchronized panes: **Outline** (left) | **Markdown editor** (center) | **Display/preview** (right).

---

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 41 (`electron/main.cjs`, `electron/preload.cjs`) |
| UI | React 19 + TypeScript, Vite dev server (port 5173) |
| Editor | CodeMirror 6 with custom markdown syntax highlighting |
| State | Zustand with `subscribeWithSelector` + undo history stack |
| Drag & drop | dnd-kit (`useSortable`) in the outline pane |
| Display pane | `contentEditable` WYSIWYG + hidden ReactMarkdown shadow renderer |
| HTML→MD | `turndown` library |
| Styling | Plain CSS with CSS custom properties; dark mode via `prefers-color-scheme` |

---

## Project Structure

```
electron/
  main.cjs          # Electron main process: BrowserWindow, IPC handlers, autosave, file I/O
  preload.cjs       # contextBridge: exposes electronAPI to renderer

src/
  main.tsx          # React entry point
  App.tsx           # Root component: file open/save, autosave logic, restore dialog
  App.css           # App-level styles including autosave restore modal
  index.css         # Global CSS custom properties (colors, fonts, dark mode)
  scrollSync.ts     # Pub/sub bus for cross-pane scroll synchronisation
  formatBus.ts      # Event bus for formatting toolbar actions
  formatting.ts     # Markdown formatting helpers

  store/
    documentStore.ts  # Zustand store: content, headings, selectedIds, history/undo, mutations

  model/
    documentModel.ts  # Pure functions: parseHeadings, moveSection, moveMultipleSections, etc.

  components/
    WorkspaceLayout.tsx/css   # Three-pane layout with resize handles
    OutlinePane/              # Heading tree, drag-to-reorder, multi-select, Aa toggle
    MarkdownPane/             # CodeMirror 6 editor with custom syntax colours
    DisplayPane/              # WYSIWYG contentEditable preview pane
    Toolbar/                  # Top toolbar (new, open, save, format actions)
    StatusBar/                # Word count, cursor position
    DocumentInfo/             # Document metadata panel
    FormatBubble/             # Floating format toolbar
    Preferences/              # Settings panel
    ResizeHandle/             # Draggable pane divider

  tests/
    documentModel.test.ts
    formatting.test.ts

build/
  icon.icns         # macOS app icon
  icon.ico          # Windows app icon (force-added to git; 16/32/48/64/128/256px)
  icon.png          # Linux app icon (1024px)
  icons.iconset/    # Source PNGs for all icon sizes
```

---

## Key Architecture Patterns

### State & Mutations
- `documentStore.ts` is the single source of truth (`content`, `headings`, `selectedIds`, `history`)
- Every outline mutation calls `pushHistory()` first — enables Cmd+Z undo
- `undo()` restores last `content` snapshot and re-parses headings

### Stale Closure Fix
- `selectedIdsRef` (useRef) mirrors `selectedIds` state — used inside `handleDragEnd` and other callbacks that have stale deps

### Scroll Sync
- `scrollSync.ts` is a simple pub/sub bus (`publish(source, ratio)` / `subscribe(cb)`)
- All three panes subscribe; `suppressScrollRef` + timers prevent feedback loops

### WYSIWYG Display Pane
- Hidden `<div>` renders `<ReactMarkdown>` (source of truth for HTML structure)
- Visible `contentEditable` div is updated via `useLayoutEffect` by copying shadow innerHTML
- `isEditingRef` prevents overwrite while user is typing
- On input: 400ms debounce → `turndown(innerHTML)` → `setContent()` in store

### CodeMirror Syntax Colours (MarkEdit-style)
- Headers: blue (`#5B9EFF` dark / `#1556AB` light)
- Header marks (`##`, `###`): `--me-header-mark` (`#7AADF8`)
- Other marks (`*`, `-`, `>`): `--me-mark` (`#A8B8C6`)
- Defined in `index.css` as CSS vars; applied via `EditorView.theme()` in `MarkdownPane.tsx`

### Autosave
- Writes to `app.getPath('userData')/autosave/` — never overwrites the original file
- Key = MD5 hash of file path (or `'untitled'`)
- IPC handlers: `autosave:write`, `autosave:delete`, `autosave:check`
- On file open: checks if autosave is newer than the original → shows restore dialog
- On successful save: deletes the autosave

### Outline Formatting Toggle (Aa button)
- `showFormatting` state in `OutlinePane`
- Adds `.formatted` class to tree div
- CSS in `OutlinePane.css`: H1→26px bold blue, H2→21px, H3→18px, H4→15px, H5→13px, H6→11px

---

## Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite + Electron in dev mode
npm run build        # TypeScript compile + Vite production build
npm test             # run Vitest unit tests

# Build distributables
npx electron-builder --mac      # DMG: x64 + arm64
npx electron-builder --win      # NSIS installer: x64 + arm64 (combined)
npx electron-builder --linux    # AppImage + deb: x64
```

Built artifacts go to `release/`. The folder is gitignored.

---

## Platform Notes

### macOS
- `titleBarStyle: 'hiddenInset'` — traffic lights overlay the toolbar
- File associations: `.md` registered via `fileAssociations` in `package.json`
- Icons: `build/icon.icns`

### Windows
- NSIS installer with custom install dir, desktop + Start Menu shortcuts
- No code signing — users will see a SmartScreen warning; click "More info → Run anyway"
- Icons: `build/icon.ico`

### Linux
- AppImage: portable, `chmod +x` and run
- deb: `sudo dpkg -i ...`
- `titleBarStyle: 'default'` (hiddenInset is macOS-only)
- Icons: `build/icon.png`
- `fileAssociations.ext` must be a string (not array) — AppImage builder limitation

---

## Known Quirks

### Path history note (2026-05-26 reorg)
This project previously lived under an iCloud folder named **`mark's Mac Studio`** which contained a curly apostrophe (U+2019). That made hardcoded paths annoying: scripts needed `$'\xe2\x80\x99'` in bash or a `’` Unicode escape in Python.

After the 2026-05-26 reorg the project now lives at:

```
/Users/mark/Library/CloudStorage/Dropbox-BPTNB/mark lewis/_GPT Meta/App Development/OutlineMarkdown
```

The new path is **ASCII-clean** — no apostrophe-handling workarounds are needed. The previous workaround notes (bash `$'\xe2\x80\x99'` injection, Python heredoc tricks) have been removed because they no longer apply. If you still see scripts using those patterns, they're stale and can be simplified.

---

## GitHub

- Repo: `https://github.com/teloscientist-hub/outline-markdown-editor`
- Releases include mac (x64 + arm64 DMG), Windows (NSIS exe), Linux (AppImage + deb)
- Use `gh` CLI for release management (`brew install gh` if not present)
