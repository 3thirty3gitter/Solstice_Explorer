# 🚀 Proposed Killer Features for Eternal Solstice

Based on research into modern "power user" file explorers (Directory Opus, Total Commander, XYplorer, fman), here is a curated list of high-impact features we could implement next.

## 1. "God Mode" Dual Panes 🌗
**Concept:** Split the main view into two independent panes (side-by-side or top-bottom).
**Why:** Essential for copying/moving files between directories without opening two windows.
**Effort:** ⭐⭐⭐ (High - requires refactoring main view layout)

## 2. "Peek" Quick Look 👁️
**Concept:** Press `Spacebar` to instantly preview the selected file in a large modal overlay (like macOS Quick Look).
**Details:** Support for High-res Images, Video auto-play, Code syntax highlighting, PDF rendering, and Markdown preview.
**Effort:** ⭐⭐ (Medium - requires integrating preview renderers)

## 3. "Commander" Command Palette ⌨️
**Concept:** A keyboard-centric interface (triggered by `Ctrl+P` or `Ctrl+K`) to execute any action.
**Capabilities:** Fuzzy search to jump to folders, run batch commands, toggle view modes, or changing themes instantly.
**Effort:** ⭐⭐ (Medium - UI overlay + extensive command mapping)

## 4. "Flow" Miller Columns 🪜
**Concept:** A navigation layout where clicking a folder opens its contents in a new column to the right.
**Why:** Unbeatable for navigating deep hierarchies without losing context (macOS Finder style).
**Effort:** ⭐⭐⭐ (High - distinctive new layout engine)

## 5. "Terminal" Integrated Drawer 📟
**Concept:** A collapsible bottom pane running a real PowerShell/Terminal session, automatically synced to the current folder.
**Why:** The ultimate power-user feature for developers.
**Effort:** ⭐⭐⭐ (High - requires `node-pty` integration and xterm.js)

## 6. "Zen" Workspaces 🧘
**Concept:** Save and restore named sets of open tabs/panes/layouts (e.g., "Project X Setup", "Photo Sorting").
**Why:** Context switching becomes instant.
**Effort:** ⭐ (Low - State serialization similar to Favorites)

## 7. Advanced Batch Renamer 🏷️
**Concept:** Select multiple files -> "Rename". Interface allows Regex replace, counter insertion (`file_001.txt`), and case transformation (camelCase, snake_case).
**Effort:** ⭐⭐ (Medium - mostly UI calculation logic)

## 8. Git Status Indicators 🐙
**Concept:** Show small icons/color coding next to files to indicate git status (modified, new, ignored) within repositories.
**Effort:** ⭐⭐ (Medium - requires watcher and git command execution)

---

### 💡 Recommendation
I recommend starting with **2. "Peek" Quick Look**. It adds immediate "wow" factor, feels extremely premium, and improves the browsing experience significantly without needing a massive layout refactor.
