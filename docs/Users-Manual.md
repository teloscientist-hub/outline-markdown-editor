# Outline Markdown Editor — User's Manual

Welcome to **Outline Markdown Editor (OME)**. This manual walks you through every feature in plain language, step by step. Whether you're new to markdown or a seasoned writer, you'll find everything you need to get productive quickly.

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
10. [Multi-Window Workflow](#10-multi-window-workflow)
11. [Pane Layout and View Controls](#11-pane-layout-and-view-controls)
12. [Document Info](#12-document-info)
13. [Preferences](#13-preferences)
14. [Help Menu](#14-help-menu)
15. [Frequently Asked Questions](#15-frequently-asked-questions)

---

## 1. Getting Started

### Opening the App

Launch **Outline Markdown Editor** from your Applications folder or the Dock. When it opens, OME will do one of the following depending on your Preferences setting:

- Open the built-in README document
- Open a blank, untitled document
- Reopen the last file you were working on

You can change this behavior any time in **Preferences** (see [Section 13](#13-preferences)).

### Opening a File

**From the menu:**
1. Go to **File > Open** (or press **Cmd+O**).
2. A file picker will appear. Navigate to your file.
3. Select a `.md`, `.markdown`, or `.txt` file and click **Open**.

**From Finder:**
Simply double-click any `.md` or `.markdown` file. OME is registered as the default handler for these file types and will open it automatically. You can also right-click a file in Finder and choose **Open With > Outline Markdown Editor**.

**From Recent Files:**
Go to **File > Open Recent** to see a submenu listing your last 10 opened files. Click any file to reopen it instantly. Choose **Clear Recent Files** at the bottom of the submenu to wipe the list.

### Your First Look

Once a file is open, you'll see three panels side by side:

- **Left (Outline):** a tree of all the headings in your document
- **Center (Markdown):** the raw markdown source — this is where you type
- **Right (Display):** a live rendered preview of your document

All three panels stay in sync as you work.

---

## 2. The Three Panes

OME's three panes work together. When you click a heading in the Outline, both the Markdown and Display panes scroll to that section. When you scroll in the Markdown pane, the Display pane follows.

### Resizing Panes

Click and drag the thin vertical divider between any two panes to resize them. You can make the Markdown pane wider for focused editing, or enlarge the Display pane to review your formatted output.

### Hiding and Showing Panes

You can hide any pane you don't need:

| Action | Shortcut |
|--------|----------|
| Toggle Outline pane | **Cmd+1** |
| Toggle Markdown pane | **Cmd+2** |
| Toggle Display pane | **Cmd+3** |
| Restore all three panes | **Cmd+0** |

You can also use the toolbar buttons at the top of the window to toggle each pane.

---

## 3. Working with Files

### Creating a New Window

Go to **File > New Window** or press **Cmd+N**. A completely independent editor window opens. Each window has its own file, its own undo history, and its own pane layout. You can have as many windows open at once as you like.

### Saving a File

- **Save (Cmd+S):** Saves the file in place. If the document has never been saved, a Save dialog will appear so you can choose a location and filename.
- **Save As (Cmd+Shift+S):** Saves a copy of the document with a new name and/or in a new location. The newly saved copy becomes the active document.

### Auto-Save

Once a file has been saved to disk at least once, OME will automatically save it **2 seconds after you stop typing**. You don't need to do anything — just keep writing. A brief indicator may appear to confirm the save. Auto-save does not apply to brand-new, unsaved documents; use **Cmd+S** to save those first.

### Opening Recent Files

**File > Open Recent** shows your 10 most recently opened files. Click any filename to reopen it. To clear the list, choose **Clear Recent Files** at the bottom of the submenu.

---

## 4. The Outline Pane

The Outline pane is one of OME's most powerful features. It shows the structure of your document as a tree of headings, and lets you navigate, reorganize, and control which parts of the document are visible.

### Navigating with the Outline

**Click any heading** in the Outline pane to jump directly to that section. The Markdown pane will scroll to that heading, and the Display pane will follow. This is the fastest way to move around long documents.

### The Depth Filter

At the top of the Outline pane is a **depth filter** control. Use it to choose how many levels of headings to display in the outline tree:

- **H1** — show only top-level headings
- **H1–H2** — show H1 and H2
- **H1–H3**, **H1–H4**, **H1–H5**, **All** — progressively show more heading levels

This doesn't hide anything in the document itself — it only controls how much detail you see in the Outline tree. It's useful for getting a high-level view of a long document without losing yourself in the subheadings.

> **Tip:** If you demote an H1 to H2 while the depth filter is set to "H1 only," OME will automatically expand the filter to "H1–H2" so the heading you just changed doesn't disappear from the outline.

### Headings Only Mode

Toggle **Headings Only** mode to hide all body text and show only headings across all three panes. This is a great way to review and restructure your document's outline without the distraction of body copy. Toggle it off to bring all your content back.

### Promoting and Demoting Headings from the Outline

With a heading selected in the Outline pane:

- Press **Tab** to **demote** it one level (e.g., H1 becomes H2, H2 becomes H3).
- Press **Shift+Tab** to **promote** it one level (e.g., H2 becomes H1).

The change is applied to the heading in the Markdown source, and the outline tree updates immediately.

---

## 5. The Markdown Pane

The Markdown pane is where you write and edit. It's powered by CodeMirror 6, a professional-grade code editor adapted for markdown.

### What You'll See

- **Line numbers** appear in the left gutter.
- **Syntax highlighting** colors and styles your markdown as you type:
  - Headings are displayed at different visual sizes
  - Bold and italic text are styled
  - Code spans and code blocks are visually distinct
  - Links are highlighted
  - Blockquotes are indented and styled

### Typing and Editing

Just click anywhere in the Markdown pane and start typing. All standard text editing shortcuts work: Cmd+Z to undo, Cmd+Shift+Z to redo, Cmd+A to select all, etc.

### Promoting and Demoting Headings

With your cursor anywhere on a heading line:

- **Cmd+[** — promote the heading one level (H2 → H1, H3 → H2, etc.)
- **Cmd+]** — demote the heading one level (H1 → H2, H2 → H3, etc.)

The outline and display panes update immediately.

### Moving Sections Up and Down

With your cursor anywhere inside a section:

- **Alt+Up** — move the entire section (the heading plus all its body content) up above the previous section.
- **Alt+Down** — move the entire section down below the next section.

This is the fastest way to reorder your document without cutting and pasting.

### Scroll Sync

As you scroll in the Markdown pane, the Display pane scrolls in proportion. You'll always see the rendered version of whatever part of the source you're looking at.

---

## 6. The Display Pane

The Display pane shows your markdown rendered as it would appear on a webpage or in a document reader. It supports **GitHub Flavored Markdown (GFM)**, which includes:

- **Tables** — markdown tables render with proper formatting
- **Task lists** — `- [ ]` and `- [x]` render as checkboxes
- **Strikethrough** — `~~text~~` renders with a line through it
- **Autolinks** — bare URLs become clickable links

The Display pane is read-only. To make changes, edit the Markdown pane.

**Scroll sync:** The Display pane stays in sync with the Markdown pane as you scroll, so you can always see the rendered version of what you're editing.

**Fold state:** When you fold a section in the Outline pane, it's hidden in the Display pane too.

---

## 7. Formatting Text

OME gives you three ways to apply formatting: keyboard shortcuts, the Format menu, and the floating selection bubble.

### Keyboard Shortcuts

These shortcuts work in the Markdown pane:

| Format | Shortcut |
|--------|----------|
| **Bold** | Cmd+B |
| *Italic* | Cmd+I |
| Heading 1 | Cmd+Opt+1 |
| Heading 2 | Cmd+Opt+2 |
| Heading 3 | Cmd+Opt+3 |
| Heading 4 | Cmd+Opt+4 |
| Heading 5 | Cmd+Opt+5 |
| Heading 6 | Cmd+Opt+6 |
| Bullet list item | Cmd+Shift+8 |
| Numbered list item | Cmd+Shift+7 |
| Todo item | Cmd+Shift+T |

### The Format Menu

The **Format** menu (between Edit and View in the menu bar) contains every formatting option listed above. Click any item to apply it to your current selection or cursor position.

### The Floating Selection Bubble

1. Click and drag to **select any text** in the Markdown pane.
2. A small toolbar will appear **above your selection** with buttons: H1, H2, H3, Bold, Italic, Bullet, Numbered, Todo.
3. Click any button to apply that format.
4. Click the same button again on already-formatted text to **remove** the format (all formats toggle).

The bubble disappears when you click elsewhere or deselect the text.

### Toggling Formats Off

Every formatting command is a toggle. If your cursor is on bold text and you press **Cmd+B**, the bold markers are removed. If you select an H2 heading and press **Cmd+Opt+2**, the heading markers are removed and the line becomes plain text. This applies to all format operations, including the selection bubble.

---

## 8. Folding and Hiding Sections

Folding lets you temporarily collapse sections you're not working on, keeping your document tidy and your focus sharp.

### How to Fold a Section

1. Look at the **Outline pane** on the left.
2. Find the heading you want to fold.
3. Click the **▶** (triangle) to the left of the heading.
4. The triangle turns to ▼ when the section is folded.

When a section is folded:
- Its content is hidden in the **Outline pane** (subheadings disappear)
- The body text is hidden in the **Markdown pane**
- The content is hidden in the **Display pane**

### How to Unfold

Click the **▼** triangle next to a folded heading. The content reappears in all three panes.

### Headings Only Mode

For a broader view, toggle **Headings Only** mode in the Outline pane. This hides all body text across all three panes, leaving only headings visible. It's like folding every section at once. Toggle it off to restore all content.

---

## 9. Reordering Sections

OME gives you two ways to move sections around: drag-and-drop in the Outline pane, and keyboard shortcuts in the Markdown pane.

### Drag-and-Drop in the Outline Pane

1. In the Outline pane, hover over the heading you want to move.
2. Click and hold, then **drag** the heading up or down in the list.
3. Release to drop it in the new position.

The **entire section** moves — heading, subheadings, and all body content beneath it. This is the most visual way to restructure a document.

### Keyboard Shortcut in the Markdown Pane

1. Click anywhere inside the section you want to move.
2. Press **Alt+Up** to move it above the preceding section.
3. Press **Alt+Down** to move it below the following section.

Again, the entire section (heading + body) moves as a unit.

---

## 10. Multi-Window Workflow

OME supports having multiple documents open at the same time, each in its own window.

### Opening a New Window

Go to **File > New Window** (or press **Cmd+N**). A fresh editor window appears. You can open different files in each window.

### Switching Between Windows

Use the **Window menu** in the menu bar. It lists all your open documents by filename. Click any name to bring that window to the front. You can also use the standard macOS **Cmd+`** (backtick) shortcut to cycle between windows of the same application.

---

## 11. Pane Layout and View Controls

### Toggling Individual Panes

| Pane | Toggle Shortcut |
|------|----------------|
| Outline (left) | Cmd+1 |
| Markdown (center) | Cmd+2 |
| Display (right) | Cmd+3 |
| Restore all | Cmd+0 |

You can also click the corresponding toolbar buttons at the top of the window.

### Resizing Panes

Drag the vertical divider between any two panes. There's no minimum size enforced — you can give nearly all the space to one pane if you prefer a more focused layout.

### Common Layouts

- **Distraction-free writing:** Hide the Outline (Cmd+1) and Display (Cmd+3) panes, leaving only the Markdown editor.
- **Review mode:** Hide the Markdown pane (Cmd+2), leaving the Outline and Display side by side.
- **Structural editing:** Use the Outline and Markdown panes with Display hidden.

---

## 12. Document Info

**File > Document Info** (or **Cmd+Shift+I**) opens a modal panel with detailed statistics about the current document:

| Stat | Description |
|------|-------------|
| Word count | Total words in the document |
| Character count | Total characters (including spaces) |
| Line count | Total number of lines |
| Heading count | Number of headings at all levels |
| Estimated pages | Approximate page count at standard font size |
| Reading time | Estimated time to read at average reading speed |
| File path | Full path to the file on disk |
| Created date | When the file was first created |
| Modified date | When the file was last saved |
| File size | Size of the file on disk |

Close the panel by clicking the Close button or pressing Escape.

---

## 13. Preferences

Open Preferences with **Cmd+,** or via the application menu.

### On Launch

Choose what OME does when you start the application:

- **Open README document** — loads the built-in README file so you have something to read right away.
- **Open blank document** — starts with an empty, untitled document.
- **Open most recent document** — automatically reopens the last file you were editing, picking up right where you left off.

---

## 14. Help Menu

The Help menu provides quick access to OME's built-in documentation — opening the documents directly in the editor so you can read them like any other markdown file.

- **Feature Overview** — opens the Feature Overview document, which summarizes all of OME's features.
- **User's Manual** — opens this User's Manual in the editor.

You can read, search, copy from, or even edit these documents. They're just markdown files.

---

## 15. Frequently Asked Questions

### "A heading I just changed disappeared from the Outline pane."

This usually happens when you **demote a heading to a level that's filtered out** by the depth filter. For example, if your depth filter is set to "H1 only" and you demote an H1 to H2, the H2 level isn't shown. OME normally adjusts the depth filter automatically when you do this via the outline or the Markdown pane shortcut — but if it didn't, click the depth filter control and expand it to show H1–H2.

### "How do I get all my panes back?"

Press **Cmd+0** (zero). This restores all three panes to their default visible state.

### "My file isn't auto-saving. Why?"

Auto-save only works for files that have **already been saved to disk at least once**. If your document is new and unsaved ("Untitled"), press **Cmd+S** to save it to a location first. After that, auto-save will take over.

### "I accidentally folded a section and can't find my content."

Look in the Outline pane for a heading with a **▼** triangle — that indicates a folded (hidden) section. Click the triangle to unfold it and restore the content. If you're not sure which section is folded, toggle **Headings Only** mode off (if it was on) and then scan the outline for folded markers.

### "How do I undo a drag-and-drop reorder?"

Press **Cmd+Z** in the Markdown pane to undo. All operations — including drag-and-drop reorders, promote/demote actions, and section moves — are recorded in the undo history.

### "Can I have two different documents open at the same time?"

Yes. Use **File > New Window** (**Cmd+N**) to open a second window, then open a different file in it using **Cmd+O**. Each window is completely independent.

### "How do I remove a format I applied by mistake?"

Every format in OME is a toggle. Place your cursor in the formatted text (or select it) and press the same shortcut again. For example, press **Cmd+B** on bold text to remove the bold. The same works in the floating selection bubble and the Format menu.

### "What markdown features does the Display pane support?"

The Display pane renders standard CommonMark markdown plus **GitHub Flavored Markdown (GFM)** extensions: tables, task lists (`- [ ]` / `- [x]`), strikethrough (`~~text~~`), and autolinks.

### "The Outline pane is empty even though I have content."

The Outline pane only shows **headings** (lines starting with `#`, `##`, `###`, etc.). If your document has no headings, the outline will be blank. Add a heading with **Cmd+Opt+1** (for H1) or type `# Your Heading Title` at the start of a line.

### "How do I open a .txt file?"

Go to **File > Open** (**Cmd+O**) and select your `.txt` file. OME supports `.md`, `.markdown`, and `.txt` files. Note that `.txt` files are not registered as a default file type in Finder, so you won't be able to double-click them directly — use File > Open instead.

### "Where are my files saved?"

Files are saved wherever you chose when you first used **File > Save** or **File > Save As**. To see the exact path of the current file, open **File > Document Info** (**Cmd+Shift+I**) — the full file path is shown there.

---

*For a quick reference of all features and shortcuts, see the [Feature Overview](Feature-Overview.md).*
