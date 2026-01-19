# Quick Start Guide

## Running the Application

1. **First Time Setup**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Development Mode (with DevTools)**
   ```bash
   npm run dev
   ```

## Building an Installer

To create a Windows installer that you can distribute:

```bash
npm run build:win
```

The installer will be created in the `dist` folder as `Eternal Solstice Explorer Setup.exe`

## Features at a Glance

### Navigation
- **Back/Forward** buttons - Navigate through history
- **Up** button - Go to parent folder  
- **Refresh** button - Reload current folder
- **Breadcrumb** - Click any path segment to jump there

### Search & Filter
- Type in search bar for real-time search
- Use dropdown to filter by file type (Documents, Images, Videos, etc.)
- Search works recursively in current folder

### Views
- **Grid View** - Large icons in a grid (default)
- **List View** - Compact list with details

### Selection
- **Click** - Select single item
- **Ctrl+Click** - Multi-select
- **Ctrl+A** - Select all
- **Double-Click** - Open file/folder
- **Right-Click** - Context menu

### Keyboard Shortcuts
- `Ctrl + A` - Select all
- `Delete` - Move to Recycle Bin
- `Escape` - Clear selection

## Troubleshooting

**App won't start?**
- Make sure Node.js is installed
- Run `npm install` first
- Check that no other instance is running

**Can't see certain folders?**
- The app only shows folders that exist and are accessible
- Some system folders may be hidden for security

**Search not working?**
- Make sure you're in a valid folder first
- Search only works within the current folder and subfolders
- Try adjusting the file type filter

## Next Steps

- Customize the colors in `styles.css`
- Add more file type icons
- Build the installer and share with friends!
