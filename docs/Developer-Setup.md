# Developer Setup

This document covers how to build, run, and package Outline Markdown Editor from source.

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 41 |
| UI Framework | React 19 + TypeScript |
| Editor | CodeMirror 6 |
| State | Zustand 5 |
| Drag & Drop | dnd-kit |
| Markdown render | react-markdown + remark-gfm |
| Build | Vite 8 + tsc |
| Packaging | electron-builder |

## Prerequisites

- Node.js 18+
- npm 9+
- macOS (for .dmg packaging; Windows/Linux builds not yet configured)

## Installation

```bash
git clone https://github.com/teloscientist-hub/outline-markdown-editor.git
cd outline-markdown-editor
npm install
```

## Development

Start Vite dev server + Electron together:

```bash
npm run electron:dev
```

The renderer runs at `http://localhost:5173`. Electron loads it via `loadURL`.
Hot module replacement is active — changes to `src/` reload instantly.

## Build

Compile TypeScript and bundle with Vite:

```bash
npm run build
```

Output goes to `dist/`.

## Preview packaged app (without DMG)

```bash
npm run electron:preview
```

## Package DMGs

```bash
npx electron-builder --mac dmg --x64 --arm64
```

Output goes to `release/`. Both Intel and Apple Silicon DMGs are built.

## Project Structure

```
electron/
  main.cjs       — Main process (windows, menus, IPC, file I/O, preferences)
  preload.cjs    — Context bridge (exposes electronAPI to renderer)

src/
  App.tsx                         — Root component, menu wiring, keyboard shortcuts
  main.tsx                        — React entry point
  store/documentStore.ts          — Zustand store (all document + UI state)
  model/documentModel.ts          — Heading parsing, fold computation, section ops
  formatting.ts                   — Markdown formatting logic (bold, italic, headings, lists)
  formatBus.ts                    — Module-level formatter pub/sub (menu → editor bridge)
  scrollSync.ts                   — Module-level scroll event pub/sub

  components/
    OutlinePane/     — Heading tree, fold toggles, depth filter, drag-and-drop
    MarkdownPane/    — CodeMirror 6 editor, format keymaps, format bubble
    DisplayPane/     — react-markdown rendered preview, scroll sync
    FormatBubble/    — Floating toolbar (portal, appears on text selection)
    Toolbar/         — Pane visibility toggles
    StatusBar/       — Word/char count, cursor position, file status
    Preferences/     — Startup behavior modal
    DocumentInfo/    — Statistics modal
    ResizeHandle/    — Draggable pane dividers
    WorkspaceLayout/ — Three-pane flex layout

docs/
  Feature-Overview.md    — App feature reference (also serves as README)
  Users-Manual.md        — Step-by-step user guide
  Developer-Setup.md     — This file

build/
  icon.icns    — macOS app icon (required for electron-builder)

public/
  app-icon-128.png    — Icon used inside the welcome document
```

## Key Architecture Notes

### Multi-window
Each `BrowserWindow` is an independent renderer process with its own Zustand store.
`windowData` Map in `main.cjs` tracks `{ filePath }` per window ID.
`buildMenu()` rebuilds the entire menu bar on every title/focus/close event.

### No-flash file open
`preload.cjs` uses `ipcRenderer.sendSync('app:get-initial-info-sync')` to fetch file content
**synchronously before the renderer's JavaScript runs**. The Zustand store initializes with
the actual file content, so the README never flashes.

### Scroll sync
`scrollSync.ts` is a module-level pub/sub (not Zustand) to avoid re-renders on every scroll event.
Each pane publishes `{ prevHeadingId, nextHeadingId, ratio }` and subscribes to receive positions
from other panes. A 150ms suppression flag prevents echo loops.

### Fold sync
Folding uses CSS `cm-line-hidden` (not CodeMirror's fold API) applied identically in both the
Markdown pane and Display pane. `computeHiddenLines()` in `documentModel.ts` is the single source
of truth for which lines are hidden.

### Format bus
`formatBus.ts` holds a single formatter reference. `MarkdownPane` registers its EditorView's
formatter on mount and clears it on unmount. `App.tsx` calls `applyFormat(type)` in response to
Format menu IPC events.

## ESLint

The project uses `typescript-eslint` with recommended rules. To enable stricter type-aware rules,
update `eslint.config.js` to use `tseslint.configs.recommendedTypeChecked` and add:

```js
languageOptions: {
  parserOptions: {
    project: ['./tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: import.meta.dirname,
  },
}
```
