# Eternal Solstice - File Explorer

A modern, beautiful file explorer for Windows 10/11 with glassmorphism design, robust search capabilities, and unique custom icons.

## Features

✨ **Glassmorphism UI** - Beautiful frosted glass effects with blur and transparency  
🔍 **Robust Search** - Real-time file and folder search with type filtering  
🎨 **Unique Icons** - Custom gradient icons for different file types  
📁 **Full File System Access** - Browse all drives and folders on your Windows PC  
⚡ **Fast Navigation** - Breadcrumb navigation, history, and keyboard shortcuts  
📊 **Multiple Views** - Switch between grid and list views  
🎯 **Smart Sorting** - Sort by name, date, size, or type  
⌨️ **Keyboard Shortcuts** - Ctrl+A (select all), Delete, Escape, and more  

## Installation

### Prerequisites
- Windows 10 or Windows 11
- Node.js 16+ installed ([Download here](https://nodejs.org/))

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm start
   ```
   
   Or with DevTools open:
   ```bash
   npm run dev
   ```

3. **Build Installer (Optional)**
   ```bash
   npm run build:win
   ```
   
   This will create a Windows installer in the `dist` folder that you can use to install the app on your PC.

## Usage

### Navigation
- **Back/Forward** - Navigate through your browsing history
- **Up** - Go to parent folder
- **Refresh** - Reload current folder
- **Breadcrumb** - Click any part of the path to jump to that location

### Search
- Type in the search bar to find files and folders
- Use the filter dropdown to search by specific file types
- Search is performed recursively in the current folder

### Selection
- **Single Click** - Select an item
- **Ctrl + Click** - Multi-select items
- **Ctrl + A** - Select all items
- **Double Click** - Open file or folder
- **Right Click** - Show context menu

### Views
- **Grid View** - Display items as large icons in a grid
- **List View** - Display items in a compact list

### Keyboard Shortcuts
- `Ctrl + A` - Select all items
- `Delete` - Delete selected items (moves to Recycle Bin)
- `Escape` - Clear selection
- `Enter` - Open selected item (when context menu is open)

## Quick Access Folders

The sidebar provides quick access to:
- 🖥️ Desktop
- 📄 Documents
- ⬇️ Downloads
- 🖼️ Pictures
- 🎵 Music
- 🎬 Videos
- 💾 All available drives

## File Type Icons

The explorer uses beautiful gradient icons for different file types:
- 📁 Folders (Blue-Purple gradient)
- 📄 Documents (Orange-Yellow gradient)
- 🖼️ Images (Pink-Purple gradient)
- 🎬 Videos (Red-Orange gradient)
- 🎵 Audio (Green-Teal gradient)
- 💻 Code files (Cyan-Blue gradient)
- 📦 Archives (Purple-Pink gradient)
- 📃 Generic files (Gray-Blue gradient)

## Technology Stack

- **Electron** - Cross-platform desktop app framework
- **Node.js** - File system operations
- **HTML/CSS/JavaScript** - Modern web technologies
- **Windows Acrylic** - Native Windows 10/11 glassmorphism effects

## Project Structure

```
eternal-solstice/
├── main.js           # Electron main process
├── preload.js        # Electron preload script (security bridge)
├── index.html        # Application UI
├── styles.css        # Glassmorphism styling
├── app.js            # Application logic
├── package.json      # Dependencies and build config
├── assets/           # Icons and images
└── README.md         # This file
```

## Development

The app is built with Electron, which allows us to create a native Windows desktop application using web technologies while having full access to the file system through Node.js.

### Key Features Implementation

- **Glassmorphism**: Uses CSS `backdrop-filter: blur()` combined with Electron's native Windows Acrylic material
- **File Operations**: All file system operations are handled securely through Electron's IPC (Inter-Process Communication)
- **Search**: Recursive directory traversal with depth limiting for performance
- **Security**: Context isolation and preload scripts prevent direct Node.js access from renderer

## Building for Production

To create a distributable Windows installer:

```bash
npm run build:win
```

This will create:
- An NSIS installer (`.exe`) in the `dist` folder
- The installer allows users to choose installation directory
- Creates desktop shortcuts and Start Menu entries

## License

MIT License - Feel free to use and modify!

## Credits

Created with ❤️ using Electron and modern web technologies.
