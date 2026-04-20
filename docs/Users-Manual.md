# Outline Markdown Editor — User's Manual

Welcome to **Outline Markdown Editor (OME)**. This manual covers every action you can take in the app, from opening a file to batch-promoting a selection of headings. Use the Table of Contents to jump to any section.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Three Panes](#2-the-three-panes)
3. [Working with Files](#3-working-with-files)
4. [The Outline Pane](#4-the-outline-pane)
5. [The Markdown Pane](#5-the-markdown-pane)
6. [The Display Pane](#6-the-display-pane)
7. [Formatting Text](#7-formatting-text)
8. [Folding and Hiding Sections](#8-folding-and-hiding-sections)
9. [Reordering Sections](#9-reordering-sections)
10. [Multi-Select in the Outline](#10-multi-select-in-the-outline)
11. [Multi-Window Workflow](#11-multi-window-workflow)
12. [Pane Layout and View Controls](#12-pane-layout-and-view-controls)
13. [Document Info](#13-document-info)
14. [Preferences](#14-preferences)
15. [Help Menu](#15-help-menu)
16. [Keyboard Shortcut Reference](#16-keyboard-shortcut-reference)
17. [Frequently Asked Questions](#17-frequently-asked-questions)

---

## 1. Getting Started

### Opening the App

Launch **Outline Markdown Editor** from your Applications folder or the Dock. On first launch you'll see the built-in README document. You can change this behavior in **Preferences** (see [Section 14](#14-preferences)).

### Opening a File

**From the menu:** Go to **File > Open** (⌘O), choose a `.md`, `.markdown`, or `.txt` file, and click Open.

**From Finder:** Double-click any `.md` or `.markdown` file. OME is registered as the default handler and opens it automatically.

**From Recent Files:** Go to **File > Open Recent** to see your last 10 opened files. Click any name to reopen it instantly.

### Your First Look

Once a file is open you'll see three panels side by side:

- **Left — Outline:** every heading in the document shown as a collapsible tree
- **Center — Markdown:** the raw markdown source — this is where you type
- **Right — Display:** a live rendered preview

All three panels stay in sync as you work.

---

## 2. The Three Panes

### Resizing Panes

Drag the thin vertical divider between any two panes. Release to lock the new size.

### Hiding and Showing Panes

| Action | Shortcut |
|--------|----------|
| Toggle Outline pane | ⌘1 |
| Toggle Markdown pane | ⌘2 |
| Toggle Display pane | ⌘3 |
| Restore all three panes | ⌘0 |

You can also click the **1 / 2 / 3** toolbar buttons at the top of the window.

### Common Layouts

- **Distraction-free writing:** Hide Outline (⌘1) and Display (⌘3) — only the editor remains.
- **Review mode:** Hide Markdown (⌘2) — Outline and Preview side by side.
- **Structural editing:** Keep Outline and Markdown, hide Display.

---

## 3. Working with Files

### New Window

**File > New Window** (⌘N) opens a completely blank, independent editor window. Each window has its own file, undo history, and pane layout. You can have as many windows open as you like.

### Saving

- **Save (⌘S):** Saves in place. On a new document a Save dialog appears so you can choose a filename and location.
- **Save As (⌘⇧S):** Saves a copy under a new name and/or location. The new copy becomes the active document.
- **Auto-save:** Once a file has been saved to disk at least once, OME automatically saves it 2 seconds after you stop typing. Auto-save does not apply to brand-new, unsaved documents.

### Open Recent

**File > Open Recent** lists your 10 most recently opened files. **Clear Recent Files** at the bottom of the submenu wipes the list.

---

## 4. The Outline Pane

The Outline pane is the structural heart of OME. It shows your document as a heading tree and gives you navigation, reorganisation, search, and view-filtering tools.

### Navigating

**Click any heading** to jump to that section. The Markdown and Display panes both scroll to it.

### Searching Headings

Type in the **search box** at the top of the Outline pane to filter the heading list to only those that match your query. Press **/** or **F** while the outline pane is focused to jump to the search box. Press **Escape** to clear the search.

### Keyboard Navigation

Click anywhere in the Outline pane to give it keyboard focus, then:

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move the keyboard highlight up/down the list |
| Enter | Jump to the highlighted heading |
| → | Expand a collapsed section |
| ← | Collapse an expanded section |
| Tab | Demote the focused heading one level |
| ⇧Tab | Promote the focused heading one level |
| / or F | Focus the search box |
| Escape | Clear search / clear selection |

### The Depth Filter

The depth filter in the Outline pane toolbar controls how many heading levels are shown:

- **H1** — only top-level headings
- **H1–H2**, **H1–H3**, … **H1–H6** — progressively more levels
- **All** — every heading

This only changes what's visible in the outline tree; it does not hide document content.

> **Tip:** If you demote a heading to a level currently filtered out, OME automatically expands the depth filter so the heading stays visible.

### Headings Only Mode

Toggle **Headings Only** mode to hide all body text across all three panes, showing only headings. Great for reviewing or restructuring document structure without body copy distraction. Toggle it off to restore all content.

### Folding Sections

Click the **▶ / ▼ triangle** next to any heading to collapse or expand its section. When a section is folded:

- Its content is hidden in the Markdown pane
- Its content is hidden in the Display pane
- Sub-headings disappear from the Outline pane

Click the triangle again to expand.

### Promoting and Demoting a Single Heading

With keyboard focus on a heading in the Outline pane:

- **Tab** — demote one level (H1 → H2, H2 → H3, …)
- **⇧Tab** — promote one level (H2 → H1, H3 → H2, …)

The entire subtree (all sub-headings and their content) moves with the heading, keeping relative depths intact.

---

## 5. The Markdown Pane

### Typing and Editing

Click anywhere in the Markdown pane and start writing. All standard shortcuts work: ⌘Z undo, ⌘⇧Z redo, ⌘A select all, etc.

### Syntax Highlighting

As you type, OME styles your markdown:

- Headings are shown at visually distinct sizes
- Bold and italic text are rendered styled
- Code spans and blocks are highlighted
- Links and blockquotes are styled

### Promoting and Demoting Headings

With your cursor on any heading line:

- **⌘[** — promote one level (## → #)
- **⌘]** — demote one level (# → ##)

The heading and all its children shift together.

### Moving Sections Up and Down

With your cursor anywhere inside a section:

- **⌥↑** — move the section up above the previous sibling section
- **⌥↓** — move the section down below the next sibling section

The heading plus all its body text and sub-headings move as a unit.

### Scroll Sync

The Display pane scrolls in proportion as you scroll the Markdown pane. You always see the rendered version of what you're currently editing.

---

## 6. The Display Pane

The Display pane renders your markdown as it would appear on a webpage. It supports **GitHub Flavored Markdown (GFM)**:

- **Tables** — render with proper formatting
- **Task lists** — `- [ ]` and `- [x]` render as checkboxes
- **Strikethrough** — `~~text~~` renders with a line through it
- **Autolinks** — bare URLs become clickable links

### Selecting Text and Formatting from the Display Pane

You can select text in the Display pane and apply formatting using the floating Format Bubble (see [Section 7](#7-formatting-text)). The format is applied to the corresponding text in the Markdown pane.

To select a heading for formatting, click and drag across the heading text in the Display pane.

### Click to Navigate

Click any **heading** in the Display pane to scroll the Markdown pane to that section.

### Fold State

When you fold a section in the Outline pane, its content is hidden in the Display pane too.

---

## 7. Formatting Text

OME offers three ways to apply formatting: keyboard shortcuts, the Format menu, and the floating Format Bubble.

### The Floating Format Bubble

The Format Bubble appears automatically whenever you **select text** in either the Markdown pane or the Display pane:

1. Click and drag to select any text (or double-click to select a word).
2. A small toolbar appears **above your selection** with these controls:

```
[ H− ]  [ ─ H ▾ ]  [ H+ ]  |  [ B ]  [ I ]  |  [ • ]  [ 1. ]  [ ☐ ]
```

| Button | Action |
|--------|--------|
| **H−** | Promote heading one level (disabled if not a heading or already H1) |
| **─ H ▾** | Dropdown: choose H1–H6, or select "— H" to remove the heading |
| **H+** | Demote heading one level (disabled if already H6) |
| **B** | Bold (toggle) |
| **I** | Italic (toggle) |
| **•** | Bullet list item |
| **1.** | Numbered list item |
| **☐** | Todo / checkbox item |

The bubble disappears when you click elsewhere or press a key.

**Toggling formats off:** Click the same button on already-formatted text to remove the format. Bold, italic, and heading formats are all toggles.

### Keyboard Shortcuts (Markdown Pane)

| Format | Shortcut |
|--------|----------|
| Bold | ⌘B |
| Italic | ⌘I |
| Heading 1 | ⌘⌥1 |
| Heading 2 | ⌘⌥2 |
| Heading 3 | ⌘⌥3 |
| Heading 4 | ⌘⌥4 |
| Heading 5 | ⌘⌥5 |
| Heading 6 | ⌘⌥6 |
| Promote heading | ⌘[ |
| Demote heading | ⌘] |
| Bullet list item | ⌘⇧8 |
| Numbered list item | ⌘⇧7 |
| Todo / checkbox | ⌘⇧T |
| Move section up | ⌥↑ |
| Move section down | ⌥↓ |
| Document Info | ⌘⇧I |

### The Format Menu

The **Format** menu (between Edit and View in the menu bar) contains all the formatting options above. Every item can also be triggered by its keyboard shortcut.

---

## 8. Folding and Hiding Sections

### Folding a Single Section

In the Outline pane, click the **▶ triangle** next to any heading. The section collapses — its body text and sub-headings are hidden in all three panes.

Click the **▼ triangle** (or press **→** with keyboard focus on that heading) to expand.

### Fold All / Unfold All

Right-click in the Outline pane (or use the View menu) for fold-all and unfold-all options.

### Headings Only Mode

Toggling **Headings Only** hides all body text in the Markdown, Display, and Outline panes at once — more aggressive than folding individual sections. It's like folding every section simultaneously.

### Depth Filter

The depth filter hides sub-headings beyond a chosen level from the Outline tree (but does not hide them from the Markdown or Display panes unless Headings Only mode is also on).

---

## 9. Reordering Sections

### Drag-and-Drop in the Outline Pane

1. Hover over the heading you want to move.
2. Click and hold, then **drag** it up or down in the list.
3. Release to drop it in the new position.

The drag overlay shows the heading text and a badge like **+3 sub-headings**, so you always know how much content is moving. The **entire section** moves — heading, all sub-headings, and all body content beneath it.

### Keyboard (Markdown Pane)

- **⌥↑** — move section up
- **⌥↓** — move section down

Moves the section the cursor is in above/below its sibling.

---

## 10. Multi-Select in the Outline

The Outline pane supports selecting multiple headings at once so you can promote, demote, or move them as a group.

### Selecting a Heading and Its Subtree (Single Click)

**Click any heading** in the Outline pane. That heading and all of its sub-headings are instantly highlighted in blue. This makes the full subtree visible so you know exactly what will be affected before you act.

### Range Selection (Shift-Click)

1. Click the first heading in the range you want to select. It highlights together with its subtree.
2. **Shift-click** a different heading further up or down the list.
3. All visible headings between the first and second click are selected and highlighted.

You can continue shift-clicking to extend or change the range. The original click is the fixed anchor.

### Acting on a Selection

Once headings are highlighted, you can:

**Promote / Demote — Keyboard:**
- **⇧Tab** — promote all selected headings one level (H2 → H1, H3 → H2, etc.)
- **Tab** — demote all selected headings one level (H1 → H2, H2 → H3, etc.)
- All selected headings shift by exactly one level, preserving their relative depths.

**Promote / Demote — Selection Bar:**
When 2 or more headings are selected, a blue bar appears just below the search box showing:

```
3 headings selected   [ H− ]  [ H+ ]  [ ✕ ]
```

- **H−** — promote all selected headings
- **H+** — demote all selected headings
- **✕** — clear the selection

**Clearing the Selection:**
- Click an empty area of the Outline pane
- Press **Escape**
- Click the **✕** in the selection bar

### Notes on Multi-Select

- Dragging moves only the heading you grab (along with its full section content including sub-headings). Moving multiple discontiguous sections by drag simultaneously is not currently supported — use Tab/⇧Tab for batch indenting instead.
- When Tab/⇧Tab operates on a subtree selection (single click), the relative depths within the subtree are preserved (the whole group shifts together by one level).

---

## 11. Multi-Window Workflow

### Opening a New Window

**File > New Window** (⌘N) always opens a blank, untitled document in a new independent window. Each window has its own file, undo history, and layout.

### Opening a File in an Existing Window

Use **⌘O** in any window to open a file in that window, replacing its current content (after a save prompt if needed).

### Switching Between Windows

Use the **Window** menu to see all open documents by filename. Click any name to bring that window to the front. You can also press **⌘`** (backtick) to cycle between OME windows.

---

## 12. Pane Layout and View Controls

### Toggle Shortcuts

| Pane | Shortcut |
|------|----------|
| Outline (left) | ⌘1 |
| Markdown (center) | ⌘2 |
| Display (right) | ⌘3 |
| Restore all | ⌘0 |

### Toolbar Buttons

The toolbar at the top of each window has:
- **Open** — open a file (⌘O)
- **Save** — save (⌘S)
- **1 / 2 / 3** — toggle Outline / Markdown / Display panes
- **Depth selector** — filter the outline depth (H1 through All)
- **Headings Only** toggle

---

## 13. Document Info

**File > Document Info** (⌘⇧I) opens a statistics panel for the current document:

| Statistic | Description |
|-----------|-------------|
| Word count | Total words |
| Character count | Total characters (with spaces) |
| Characters (no spaces) | Characters excluding spaces |
| Line count | Total lines |
| Heading count | Number of headings at all levels |
| Estimated pages | Approximate page count at standard font size |
| Reading time | Estimated at average reading pace |
| File path | Full path to the file on disk |
| Created | When the file was first created |
| Last modified | When the file was last saved |
| File size | Size on disk |

Press **Escape** or click the close button to dismiss.

---

## 14. Preferences

Open with **⌘,** or the application menu.

### On Launch

Choose what OME does when you start the app:

- **Open README document** — loads the built-in welcome guide
- **Open blank document** — starts with an empty untitled document
- **Open most recent document** — reopens the last file you had open

> **Note:** This setting only affects the very first window when the app launches. **File > New Window** (⌘N) always opens blank, regardless of this setting.

---

## 15. Help Menu

The Help menu opens OME's built-in documentation directly in the editor as readable markdown files:

- **Feature Overview** — a summary of all major features
- **User's Manual** — this document

You can read, search, copy from, or edit these files just like any other document.

---

## 16. Keyboard Shortcut Reference

### File

| Action | Shortcut |
|--------|----------|
| New Window | ⌘N |
| Open | ⌘O |
| Save | ⌘S |
| Save As | ⌘⇧S |
| Document Info | ⌘⇧I |

### Edit

| Action | Shortcut |
|--------|----------|
| Undo | ⌘Z |
| Redo | ⌘⇧Z |
| Cut | ⌘X |
| Copy | ⌘C |
| Paste | ⌘V |
| Select All | ⌘A |
| Find | ⌘F |

### Format (Markdown Pane)

| Action | Shortcut |
|--------|----------|
| Bold | ⌘B |
| Italic | ⌘I |
| Heading 1 | ⌘⌥1 |
| Heading 2 | ⌘⌥2 |
| Heading 3 | ⌘⌥3 |
| Heading 4 | ⌘⌥4 |
| Heading 5 | ⌘⌥5 |
| Heading 6 | ⌘⌥6 |
| Promote heading | ⌘[ |
| Demote heading | ⌘] |
| Bullet list | ⌘⇧8 |
| Numbered list | ⌘⇧7 |
| Todo item | ⌘⇧T |
| Move section up | ⌥↑ |
| Move section down | ⌥↓ |

### View / Panes

| Action | Shortcut |
|--------|----------|
| Toggle Outline | ⌘1 |
| Toggle Markdown | ⌘2 |
| Toggle Display | ⌘3 |
| Show all panes | ⌘0 |

### Outline Pane (when focused)

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate headings |
| → | Expand section |
| ← | Collapse section |
| Enter | Jump to heading |
| Tab | Demote heading (or demote all selected) |
| ⇧Tab | Promote heading (or promote all selected) |
| ⇧Click | Range-select headings |
| / or F | Focus search box |
| Escape | Clear search / clear selection |

---

## 17. Frequently Asked Questions

### A heading I just changed disappeared from the Outline pane.

Most likely you demoted it to a level filtered out by the depth filter. Expand the depth filter control to include the new level, or set it to **All**.

### How do I get all my panes back?

Press **⌘0** (zero). All three panes restore to their default visible state.

### My file isn't auto-saving. Why?

Auto-save only works for files **already saved to disk at least once**. Press **⌘S** to give a new document a filename and location first.

### I accidentally folded a section and can't find my content.

Look in the Outline pane for a heading with a **▼** triangle — that's a folded section. Click the triangle to expand it. If you're not sure which one is folded, scan the outline for headings that have no visible children below them when you'd expect some.

### How do I undo a drag-and-drop reorder?

Press **⌘Z** in the Markdown pane. All operations — drag reorder, promote/demote, section moves — are recorded in the undo history.

### Can I have two different documents open at the same time?

Yes. Use **File > New Window** (⌘N) to open a second window, then open a file in it with **⌘O**.

### How do I remove a format I applied by mistake?

Every format is a toggle. Press the same shortcut again (e.g., ⌘B on bold text removes bold), or use the Format Bubble button on the selected text.

### The floating Format Bubble doesn't appear.

Make sure you have **text selected** — the bubble only appears when there is an active text selection. Click and drag to select, or double-click a word.

### The Outline pane is empty even though I have content.

The Outline only shows **headings** (lines starting with `#`, `##`, etc.). If your document has no headings the outline will be blank. Add one with ⌘⌥1 or type `# Your Title` on a new line.

### What markdown does the Display pane support?

Standard CommonMark plus **GitHub Flavored Markdown (GFM)**: tables, task lists (`- [ ]` / `- [x]`), strikethrough (`~~text~~`), and autolinks.

### Where are my files saved?

Wherever you chose when you first used **File > Save**. To find the path of the current file, open **File > Document Info** (⌘⇧I).

### New Window vs. opening a file in the current window — what's the difference?

**File > New Window** (⌘N) always opens a fresh blank document in a brand-new window. **File > Open** (⌘O) in an existing window replaces that window's content with the file you choose (after a save prompt if there are unsaved changes).

---

*For a quick feature summary, see the [Feature Overview](Feature-Overview.md).*
