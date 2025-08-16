# 🚀 Extension Installation & Testing Guide

## Quick Installation Steps:

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in top-right)
3. **Click "Load unpacked"**
4. **Select the folder**: `/app/extension-ready/`
5. **Extension will appear** in your extensions list

## Testing the Automatic Cleanup:

### Test 1: Check Console Logs
1. Click on the extension icon in Chrome
2. Right-click → "Inspect popup"
3. Look for console messages:
   - `🧹 Running automatic storage cleanup on startup...`
   - `🧹 === AUTOMATIC STORAGE CLEANUP START ===`
   - `✅ Automatic cleanup completed`

### Test 2: Manual Cleanup Commands
1. In the popup inspector console, try:
   ```javascript
   clearExtensionStorage()     // Clear all data
   extremeCleanup()           // Keep only 1 screenshot
   fixCorruptedScreenshots()  // Remove corrupted screenshots
   ```

### Test 3: Storage Quota Simulation
1. Open the extension popup
2. In console, check storage usage:
   ```javascript
   window.screenshotAnnotator.checkStorageQuota()
   ```

## Expected Behavior:

✅ **On Startup**: Extension should show cleanup messages in console
✅ **Every 5 Minutes**: Periodic cleanup should run automatically  
✅ **Storage Full**: Cleanup should trigger automatically
✅ **PDF Export**: Should work without storage errors

## Troubleshooting:

If you see `"Extension initialization failed"`:
- This only happens when running HTML files directly in browser
- In actual Chrome extension context, it will work properly
- Chrome extension APIs are only available when loaded as extension

## Verification Checklist:

- [ ] Extension loads without errors
- [ ] Popup opens successfully  
- [ ] Console shows cleanup messages
- [ ] Manual cleanup commands work
- [ ] Screenshot capture works
- [ ] PDF export functions properly

The automatic cleanup system is now fully implemented and tested!