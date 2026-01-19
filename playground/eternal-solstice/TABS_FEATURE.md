# Feature 1: Chrome-style Tabs System

## 🌟 Capabilities
- **Multi-Tab Browsing**: Open multiple folders in parallel.
- **State Persistence**: Each tab remembers its own:
    - Current Path
    - Navigation History (Back/Forward)
    - Scroll Position
- **Full Management**: Create, Close, and Switch tabs instantly.

## 🛠️ Technical Implementation
- **Architecture**: `TabManager` class (Singleton) acts as the controller.
- **State Isolation**: `app.js` global state is swapped dynamically when tabs are switched.
- **UI Integration**: Injected a sleek glassmorphism tab bar into the main layout.

## 🎮 How to Use
1.  **New Tab**: Click the `+` button in the top bar.
2.  **Switch**: Click any tab to jump to its state instantly.
3.  **Close**: Hover over a tab and click `x`.

This transforms the application from a simple viewer into a multi-tasking workspace.
