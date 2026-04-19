# Outline Markdown Editor (OME)

Outline Markdown Editor (OME) is a tri-pane desktop markdown editor built with Electron, React, and CodeMirror 6. It pairs a live-rendered preview and a structured document outline with a full-featured editing surface — giving writers, developers, and note-takers a single workspace where they can navigate by heading, fold and reorganize sections, and format text without leaving the keyboard. OME runs as a native macOS application with full multi-window support and automatic file association for `.md`, `.markdown`, and `.txt` files.

---

## Feature Overview

### The Three Panes

OME's interface is divided into three resizable panes. Each pane can be shown or hidden independently, and all three stay in sync at all times.

| Pane | Position | Purpose |
|------|----------|---------|
| **Outline** | Left | Heading tree navigation and section management |
| **Markdown** | Center | CodeMirror 6 source editor |
| **Display** | Right | Live rendered HTML preview |

Drag the handles between panes to resize them. Use **Cmd+1**, **Cmd+2**, **Cmd+3** to toggle individual panes, or **Cmd+0** to restore all three.

---

### Outline Pane

The Outline pane gives you a bird's-eye view of your document's heading structure.

- **Click any heading** to jump to that section in the Markdown and Display panes simultaneously.
- **Fold / unfold sections** using the ▶/▼ triangle next to each heading. Folding a section hides its content in all three panes at once.
- **Depth filter** — choose how many heading levels to display: H1 only, H1–H2, H1–H3, H1–H4, H1–H5, or all headings. When you demote an H1 to H2 while the depth filter is set to "H1 only," the filter automatically expands to H1–H2 so the heading stays visible.
- **Headings Only mode** — toggle to hide all body text and show only headings across all three panes. Ideal for structural review.
- **Drag-and-drop reorder** — drag any heading in the outline to reorder it. The entire section (heading + all body content beneath it) moves as a unit.
- **Keyboard promote/demote** — with a heading selected in the outline, press **Tab** to demote it one level (H1 → H2, H2 → H3, etc.) or **Shift+Tab** to promote it one level.

---

### Markdown Pane

The Markdown pane is a full CodeMirror 6 editor with live markdown syntax highlighting.

- **Syntax highlighting** — headings are sized visually; bold, italic, code spans, code blocks, links, and blockquotes are all styled distinctly.
- **Line numbers** displayed in the gutter.
- **Undo/redo** with full history.
- **Scroll sync** with the Display pane (ratio-based, smooth).
- **Heading promote/demote** — **Cmd+[** promotes the heading at the cursor; **Cmd+]** demotes it.
- **Section move** — **Alt+Up** / **Alt+Down** moves the entire section at the cursor up or down.
- **Floating selection bubble** — select any text and a formatting toolbar appears above the selection. Buttons: H1, H2, H3, Bold, Italic, Bullet, Numbered, Todo. All formats toggle: applying the same format again removes it.

#### Markdown Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | Cmd+B |
| Italic | Cmd+I |
| Heading 1 | Cmd+Opt+1 |
| Heading 2 | Cmd+Opt+2 |
| Heading 3 | Cmd+Opt+3 |
| Heading 4 | Cmd+Opt+4 |
| Heading 5 | Cmd+Opt+5 |
| Heading 6 | Cmd+Opt+6 |
| Bullet List | Cmd+Shift+8 |
| Numbered List | Cmd+Shift+7 |
| Todo Item | Cmd+Shift+T |
| Promote heading | Cmd+[ |
| Demote heading | Cmd+] |
| Move section up | Alt+Up |
| Move section down | Alt+Down |

---

### Display Pane

- **Rendered preview** using `react-markdown` with `remark-gfm` for full GitHub Flavored Markdown support: tables, task lists, strikethrough, autolinks.
- **Scroll sync** with the Markdown pane (ratio-based).
- **Fold state** — sections folded in the Outline pane are hidden in the Display pane as well.

---

### File Operations

| Action | Shortcut | Description |
|--------|----------|-------------|
| New Window | Cmd+N | Opens a new, independent editor window |
| Open | Cmd+O | Open any `.md`, `.markdown`, or `.txt` file |
| Open Recent | — | Submenu of the last 10 opened files; includes "Clear Recent Files" |
| Save | Cmd+S | Save the current file |
| Save As | Cmd+Shift+S | Save a copy with a new name or location |
| Document Info | Cmd+Shift+I | Modal with word count, character count, line count, heading count, estimated pages, reading time, file path, created date, modified date, and file size |

**Auto-save:** OME automatically saves your file 2 seconds after you stop typing. Auto-save applies only to files that have already been saved to disk at least once.

**macOS file association:** `.md` and `.markdown` files are associated with OME. Double-clicking them in Finder, or using "Open With → Outline Markdown Editor," opens them directly in OME.

---

### Formatting

Formatting can be applied from three places: the **Format menu**, **keyboard shortcuts** in the Markdown pane, or the **floating selection bubble**.

**Format Menu (between Edit and View):**

- Heading 1–6 (Cmd+Opt+1–6)
- Bold (Cmd+B)
- Italic (Cmd+I)
- Bullet List (Cmd+Shift+8)
- Numbered List (Cmd+Shift+7)
- Todo Item (Cmd+Shift+T)

All format operations toggle — invoking the same format on already-formatted text removes the formatting.

---

### Multi-Window Support

OME supports multiple independent windows, each with its own file, history, and pane layout.

- **File > New Window (Cmd+N)** opens a fresh editor window.
- The **Window menu** lists all currently open documents by filename. Click any entry to bring that window to the front.

---

### Preferences

Open Preferences with **Cmd+,**.

**On Launch** — choose what OME does when it starts:
- Open the README document
- Open a blank document
- Open the most recently opened document

---

### View Controls

| Action | Shortcut |
|--------|----------|
| Toggle Outline pane | Cmd+1 |
| Toggle Markdown pane | Cmd+2 |
| Toggle Display pane | Cmd+3 |
| Show all panes | Cmd+0 |

---

### Help Menu

- **Feature Overview** — opens `Feature-Overview.md` as a document in the editor.
- **User's Manual** — opens `Users-Manual.md` as a document in the editor.

---

## Complete Keyboard Shortcuts Reference

### File

| Action | Shortcut |
|--------|----------|
| New Window | Cmd+N |
| Open | Cmd+O |
| Save | Cmd+S |
| Save As | Cmd+Shift+S |
| Document Info | Cmd+Shift+I |
| Preferences | Cmd+, |

### Edit / Format

| Action | Shortcut |
|--------|----------|
| Bold | Cmd+B |
| Italic | Cmd+I |
| Heading 1 | Cmd+Opt+1 |
| Heading 2 | Cmd+Opt+2 |
| Heading 3 | Cmd+Opt+3 |
| Heading 4 | Cmd+Opt+4 |
| Heading 5 | Cmd+Opt+5 |
| Heading 6 | Cmd+Opt+6 |
| Bullet List | Cmd+Shift+8 |
| Numbered List | Cmd+Shift+7 |
| Todo Item | Cmd+Shift+T |

### Navigation & Structure

| Action | Shortcut |
|--------|----------|
| Promote heading (Markdown pane) | Cmd+[ |
| Demote heading (Markdown pane) | Cmd+] |
| Move section up | Alt+Up |
| Move section down | Alt+Down |
| Promote heading (Outline pane) | Shift+Tab |
| Demote heading (Outline pane) | Tab |

### View

| Action | Shortcut |
|--------|----------|
| Toggle Outline | Cmd+1 |
| Toggle Markdown | Cmd+2 |
| Toggle Display | Cmd+3 |
| All Panes | Cmd+0 |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop runtime | [Electron 41](https://www.electronjs.org/) |
| UI framework | [React 19](https://react.dev/) |
| Language | TypeScript |
| Code editor | [CodeMirror 6](https://codemirror.net/) |
| State management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Drag-and-drop | [dnd-kit](https://dndkit.com/) |
| Markdown rendering | [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) |

---

*For step-by-step instructions on using every feature, see the [User's Manual](Users-Manual.md).*
