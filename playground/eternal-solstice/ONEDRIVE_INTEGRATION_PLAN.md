# OneDrive Integration - Implementation Plan

## 🎯 Goals

Create a **robust OneDrive integration** that provides:
1. **Seamless Access** - Browse OneDrive like local folders
2. **Sync Status** - Visual indicators for sync state
3. **Cloud Operations** - Upload, download, share
4. **Smart Features** - Auto-sync, conflict resolution
5. **Performance** - Caching and lazy loading

---

## 📋 Features to Implement

### Phase 1: Core Integration (Essential)
1. **OneDrive Authentication**
   - Microsoft OAuth 2.0 login
   - Token management and refresh
   - Secure credential storage

2. **File Browsing**
   - List OneDrive files and folders
   - Navigate OneDrive directory structure
   - Display in all view modes (grid, list, details)

3. **Sync Status Indicators**
   - ✅ Synced (green checkmark)
   - 🔄 Syncing (blue arrows)
   - ⚠️ Sync pending (yellow warning)
   - ❌ Sync error (red X)
   - ☁️ Cloud-only (cloud icon)
   - 📌 Always available (pin icon)

4. **Basic Operations**
   - Download files from OneDrive
   - Upload files to OneDrive
   - Create folders in OneDrive
   - Delete files/folders
   - Rename items

### Phase 2: Advanced Features
5. **File Sharing**
   - Generate share links
   - Set permissions (view/edit)
   - Copy link to clipboard
   - Share via email

6. **Offline Access**
   - Mark files for offline availability
   - Download for offline use
   - Sync when online

7. **Conflict Resolution**
   - Detect file conflicts
   - Show conflict dialog
   - Choose version (local/cloud/both)

8. **Smart Sync**
   - Auto-upload on file change
   - Background sync
   - Bandwidth throttling
   - Pause/resume sync

### Phase 3: Premium Features
9. **Version History**
   - View file versions
   - Restore previous versions
   - Compare versions

10. **Search Integration**
    - Search OneDrive content
    - Filter by OneDrive location
    - Search shared files

11. **Collaboration**
    - See who's editing
    - Real-time collaboration status
    - Comments and annotations

---

## 🏗️ Architecture

### Backend (main.js)
```javascript
// OneDrive API Integration
- authenticateOneDrive()
- refreshToken()
- listOneDriveFiles(path)
- downloadFromOneDrive(itemId, destination)
- uploadToOneDrive(source, destination)
- getOneDriveSyncStatus(path)
- shareOneDriveItem(itemId, permissions)
- deleteOneDriveItem(itemId)
- renameOneDriveItem(itemId, newName)
```

### Frontend (app.js)
```javascript
// OneDrive UI Integration
- showOneDriveLogin()
- displayOneDriveFiles(items)
- renderSyncStatus(item)
- handleOneDriveOperation(action, item)
- syncOneDriveFolder(path)
- showShareDialog(item)
```

### Data Models
```javascript
OneDriveItem {
    id: string,
    name: string,
    path: string,
    size: number,
    modified: date,
    isDirectory: boolean,
    syncStatus: 'synced' | 'syncing' | 'pending' | 'error' | 'cloud-only',
    isShared: boolean,
    shareLink: string,
    permissions: object,
    version: number
}
```

---

## 🔧 Technical Implementation

### 1. Microsoft Graph API
We'll use Microsoft Graph API for OneDrive access:
- **Endpoint**: `https://graph.microsoft.com/v1.0/me/drive`
- **Authentication**: OAuth 2.0 with MSAL (Microsoft Authentication Library)
- **Scopes**: `Files.ReadWrite.All`, `offline_access`

### 2. Required Dependencies
```json
{
  "@azure/msal-node": "^2.x",
  "@microsoft/microsoft-graph-client": "^3.x",
  "axios": "^1.x"
}
```

### 3. Authentication Flow
1. User clicks "Connect OneDrive"
2. Open Microsoft login in browser
3. User authorizes app
4. Receive auth code
5. Exchange for access token
6. Store token securely (encrypted)
7. Use token for API calls
8. Auto-refresh when expired

### 4. File Operations
- **List**: `GET /me/drive/root/children`
- **Download**: `GET /me/drive/items/{id}/content`
- **Upload**: `PUT /me/drive/root:/{path}:/content`
- **Delete**: `DELETE /me/drive/items/{id}`
- **Share**: `POST /me/drive/items/{id}/createLink`

---

## 🎨 UI/UX Design

### 1. OneDrive Sidebar Section
```
Quick Access
  Desktop
  Documents
  Downloads
  
☁️ OneDrive
  📁 Personal
  📁 Shared with me
  📁 Recent
  
This PC
  C:\ Drive
  D:\ Drive
```

### 2. Sync Status Badges
Files will show status badges:
- Small icon overlay on file icon
- Color-coded for quick recognition
- Tooltip on hover with details

### 3. OneDrive Toolbar
New toolbar section:
```
[☁️ Upload] [⬇️ Download] [🔗 Share] [📌 Make Available Offline] [🔄 Sync Now]
```

### 4. Login Dialog
```
┌─────────────────────────────────────┐
│  Connect to OneDrive                │
├─────────────────────────────────────┤
│                                     │
│  Access your OneDrive files         │
│  directly from Eternal Solstice     │
│                                     │
│  [🔐 Sign in with Microsoft]        │
│                                     │
│  ✓ Secure OAuth 2.0                 │
│  ✓ No password stored               │
│  ✓ Revoke access anytime            │
│                                     │
└─────────────────────────────────────┘
```

### 5. Share Dialog
```
┌─────────────────────────────────────┐
│  Share "Document.docx"              │
├─────────────────────────────────────┤
│                                     │
│  🔗 Share Link                      │
│  ┌───────────────────────────────┐ │
│  │ https://1drv.ms/w/s!Ak...     │ │
│  └───────────────────────────────┘ │
│  [📋 Copy Link]                     │
│                                     │
│  Permissions:                       │
│  ○ Anyone with link can view        │
│  ○ Anyone with link can edit        │
│  ● Only specific people             │
│                                     │
│  [Cancel] [Share]                   │
└─────────────────────────────────────┘
```

---

## 📊 Implementation Phases

### Phase 1: Foundation (2-3 hours)
- [ ] Install dependencies
- [ ] Set up Microsoft App Registration
- [ ] Implement OAuth authentication
- [ ] Basic file listing
- [ ] Display OneDrive files in UI

### Phase 2: Core Features (3-4 hours)
- [ ] Upload/download operations
- [ ] Sync status indicators
- [ ] Create/delete/rename
- [ ] Error handling
- [ ] Progress indicators

### Phase 3: Advanced (2-3 hours)
- [ ] File sharing
- [ ] Offline availability
- [ ] Conflict resolution
- [ ] Background sync
- [ ] Performance optimization

### Phase 4: Polish (1-2 hours)
- [ ] UI refinements
- [ ] Loading states
- [ ] Error messages
- [ ] Documentation
- [ ] Testing

**Total Estimated Time: 8-12 hours**

---

## 🔐 Security Considerations

1. **Token Storage**
   - Encrypt tokens using Windows DPAPI
   - Never store in plain text
   - Clear on logout

2. **API Keys**
   - Store in environment variables
   - Never commit to git
   - Use Azure Key Vault in production

3. **Permissions**
   - Request minimal scopes needed
   - Explain why each permission is needed
   - Allow user to revoke access

4. **Data Privacy**
   - No data stored on our servers
   - Direct API calls to Microsoft
   - User data stays with Microsoft

---

## 🚀 Getting Started

### Step 1: Microsoft App Registration
1. Go to Azure Portal
2. Register new application
3. Get Client ID and Client Secret
4. Configure redirect URI
5. Set API permissions

### Step 2: Install Dependencies
```bash
npm install @azure/msal-node @microsoft/microsoft-graph-client axios
```

### Step 3: Environment Setup
```
ONEDRIVE_CLIENT_ID=your_client_id
ONEDRIVE_CLIENT_SECRET=your_client_secret
ONEDRIVE_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

## 💡 Key Benefits

1. **Seamless Integration** - OneDrive feels like local storage
2. **Always Accessible** - Access files from anywhere
3. **Automatic Backup** - Files auto-sync to cloud
4. **Easy Sharing** - Share with one click
5. **Version Control** - Never lose work
6. **Collaboration** - Work together in real-time

---

## 🎯 Success Criteria

- [ ] User can authenticate with Microsoft account
- [ ] OneDrive files appear in sidebar
- [ ] Can browse OneDrive folders
- [ ] Can upload/download files
- [ ] Sync status is visible
- [ ] Can share files with links
- [ ] Performance is smooth (< 1s load time)
- [ ] Error handling is robust
- [ ] UI is intuitive and beautiful

---

## 📝 Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Azure setup** - Create Microsoft App Registration
3. **Install dependencies** - Add required packages
4. **Implement Phase 1** - Authentication and basic listing
5. **Test and iterate** - Ensure quality

Ready to proceed? I can start with Phase 1 (authentication and basic file listing) right away!
