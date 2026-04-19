# Outline Markdown Editor

A tri-pane desktop Markdown editor with real outline control — fold, filter, reorder, and navigate
your document structure without leaving the app.

Built with Electron, React 19, TypeScript, and CodeMirror 6.

---

## Panes

| Pane | Purpose |
|---|---|
| **Outline** | Heading tree — fold, filter depth, drag-and-drop reorder |
| **Markdown** | CodeMirror 6 source editor with live syntax highlighting |
| **Display** | Rendered preview (GFM: tables, task lists, strikethrough) |

All three panes stay in sync: folding a section in the Outline hides it in both the Markdown and Display panes simultaneously.

## Highlights

- **Floating format bubble** — select text, a toolbar appears above it with H1–H3, Bold, Italic, Bullet, Numbered, Todo
- **Format menu + shortcuts** — `⌘B` bold, `⌘I` italic, `⌘⌥1–6` headings, `⌘⇧7/8/T` lists
- **Depth filter** — show only H1s, H1+H2, etc. while writing at a high level
- **Multi-window** — `⌘N` opens a new independent window; Window menu lists all open docs
- **Open Recent** — File › Open Recent keeps the last 10 files one click away
- **Document Info** — word count, character count, pages, reading time, file dates (`⌘⇧I`)
- **No-flash file open** — opening a file via Finder/Open With goes straight to your doc
- **Autosave** — saves 2 seconds after you stop typing

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘N` | New window |
| `⌘O` | Open file |
| `⌘S` / `⌘⇧S` | Save / Save As |
| `⌘⇧I` | Document Info |
| `⌘,` | Preferences |
| `⌘1/2/3` | Toggle Outline / Markdown / Display |
| `⌘0` | Show all panes |
| `⌘B` / `⌘I` | Bold / Italic |
| `⌘⌥1–6` | Heading 1–6 |
| `⌘⇧8` / `⌘⇧7` | Bullet / Numbered list |
| `⌘⇧T` | Todo item |
| `Tab` / `⇧Tab` | Demote / Promote heading (Outline pane) |
| `⌘[` / `⌘]` | Promote / Demote heading (Markdown pane) |
| `⌥↑` / `⌥↓` | Move section up / down (Markdown pane) |

## Docs

- [Feature Overview](docs/Feature-Overview.md) — full feature reference
- [User's Manual](docs/Users-Manual.md) — step-by-step guide for every feature
- [Developer Setup](docs/Developer-Setup.md) — build instructions, architecture notes

## Tech Stack

Electron 41 · React 19 · TypeScript · CodeMirror 6 · Zustand · dnd-kit · react-markdown

## License

MIT
