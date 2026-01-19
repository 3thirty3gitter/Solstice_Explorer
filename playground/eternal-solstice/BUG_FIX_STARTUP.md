# Bug Fix: App Failing to Load

## 🐛 The Issue
The application would not load the main view, and clicking sidebar items did nothing.
**Cause:** 
1.  **Syntax Error in `app.js`**: A previous automated edit using PowerShell corrupted the `TooltipManager` code, stripping backticks from template literals (e.g., `${var}`). This caused a global syntax error, preventing `app.js` from executing its initialization logic.
2.  **Missing Context Bridge**: The `getFolderSize` function was added to the main process but not exposed in `preload.js`, which would have caused runtime errors when using tooltips.

## 🛠️ The Fix
1.  **Restored `app.js` Syntax**: Manually repaired the `TooltipManager` code to use correct template literals and variable interpolation.
2.  **Updated `preload.js`**: Added `getFolderSize` to the `electronAPI` bridge.
3.  **Added Safety Checks**: Added null checks for `window.FileTreeSystem` and `window.TooltipManager` to prevent total app crashes if modules fail to load.

## ✅ Verification
- The application now starts up and loads the default folder (Documents or Downloads).
- Tooltips now work correctly with glassmorphism and folder size calculation.
- Sidebar navigation works as expected.
