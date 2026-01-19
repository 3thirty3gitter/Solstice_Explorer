# Glassmorphism Tooltip & Folder Sizes

## ✨ New Features
1.  **Glassmorphism Tooltip**: A beautiful, translucent, blurred tooltip appears on hover.
2.  **Dynamic Folder Sizes**: When hovering over a folder, the tooltip shows "Calculating..." and then updates with the actual size of the folder contents!

## 🛠️ Implementation
- **Frontend**: `TooltipManager` handles mouse tracking and positioning.
- **Backend**: New `get-folder-size` IPC handler recursively calculates bytes.
- **Design**:
    - Backdrop blur `12px`
    - Semi-transparent background
    - Dynamic positioning to stay on screen

## 🎮 How to Test
1.  Hover over any **File**: See details immediately.
2.  Hover over a **Folder**: See "Calculating..." then the size (e.g., "1.2 GB").

This makes the explorer feel significantly more premium and functional.
