# Byte Auto-Update Setup Guide

## Overview

Your Byte app now has a complete auto-update system implemented using Tauri's built-in updater plugin. The system consists of:

1. **Frontend**: React component that checks for updates and prompts the user
2. **Backend**: Tauri plugin configured to download and install updates
3. **Update Server**: GitHub releases endpoint that serves update metadata

## How It Works

### 1. Update Flow

1. **On App Start**: The frontend automatically checks for new versions
2. **Periodic Checks**: Updates are checked every hour while the app is running
3. **User Notification**: A banner appears when an update is available
4. **Installation**: User clicks "Install & Restart" to download and install
5. **Auto-Relaunch**: The app automatically restarts with the new version

### 2. Configuration

Your `tauri.conf.json` is already configured with:

```json
"plugins": {
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/usebyte/byte/releases/latest/download/update.json"
    ],
    "dialog": true,
    "pubkey": "..."
  }
}
```

This configuration:
- **active**: Enables the updater plugin
- **endpoints**: Points to your GitHub releases for update metadata
- **dialog**: Shows OS-level update dialogs
- **pubkey**: Verifies signature of update packages (security)

## Setup Requirements

### 1. GitHub Release Configuration

Your updater expects a `update.json` file in your GitHub releases. Here's the format:

```json
{
  "version": "1.0.0",
  "notes": "New features and bug fixes",
  "pub_date": "2024-04-29T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/usebyte/byte/releases/download/v1.0.0/Byte_1.0.0_x64.dmg.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/usebyte/byte/releases/download/v1.0.0/Byte_1.0.0_arm64.dmg.tar.gz"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/usebyte/byte/releases/download/v1.0.0/Byte_1.0.0_x64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/usebyte/byte/releases/download/v1.0.0/Byte_1.0.0_x64.msi.zip"
    }
  }
}
```

### 2. Building Releases

To create a proper release:

1. **Update version** in both files:
   - `package.json`: `"version": "1.0.0"`
   - `src-tauri/Cargo.toml`: `version = "1.0.0"`
   - `src-tauri/tauri.conf.json`: `"version": "1.0.0"`

2. **Build the app**:
   ```bash
   npm run build
   npx tauri build
   ```

3. **Create signatures** (requires private key):
   ```bash
   npx tauri signer sign path/to/app.tar.gz
   ```

4. **Create `update.json`** with the version and platform URLs

5. **Upload to GitHub Releases**:
   - Create a new release with tag `v1.0.0`
   - Upload the built binaries (`.dmg.tar.gz`, `.AppImage.tar.gz`, etc.)
   - Upload the `update.json` file

## Frontend Implementation Details

The frontend (`AppShell.tsx`) now includes:

### Update State
```typescript
const [updateAvailable, setUpdateAvailable] = useState<{
  version: string;
  installing: boolean;
} | null>(null)
```

### Check for Updates (on startup)
```typescript
const { check } = await import('@tauri-apps/plugin-updater')
const update = await check()
```

### Install Update
```typescript
const handleInstallUpdate = async () => {
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (update) {
    await update.downloadAndInstall()
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }
}
```

### Update Banner UI
The app displays a banner showing:
- "Byte {version} available"
- "Install & Restart" button (with loading state)
- Dismiss button (×)

## Troubleshooting

### Update Not Found
- Ensure `update.json` is accessible at: `https://github.com/usebyte/byte/releases/latest/download/update.json`
- Check the version comparison (update.version > current version)

### Signature Verification Fails
- Ensure the `pubkey` in `tauri.conf.json` matches your signing key
- Verify signatures were generated with the correct private key

### Manual Testing
During development, test with:
```bash
# Start the dev server
npx tauri dev

# Check for updates manually
const { check } = await import('@tauri-apps/plugin-updater')
const update = await check()
console.log(update)
```

## Next Steps

1. **Generate Signing Keys** (if not already done):
   ```bash
   npx tauri signer generate -w /path/to/keyfile
   ```

2. **Keep your private key secure** - don't commit it to the repository

3. **Automate releases** using GitHub Actions for:
   - Building and signing binaries
   - Creating `update.json`
   - Uploading to releases

## Additional Resources

- [Tauri Updater Documentation](https://tauri.app/develop/updater/)
- [Tauri Plugin Updater](https://docs.rs/tauri-plugin-updater/latest/tauri_plugin_updater/)
- [Security Best Practices](https://tauri.app/develop/security-best-practices/)
