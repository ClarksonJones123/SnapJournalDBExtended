# 🧪 Chrome Extension Testing Guide

## Pre-Testing Setup
1. **Reload the extension** in Chrome (chrome://extensions/)
2. **Open Developer Console** (F12) when testing the popup
3. **Clear existing screenshots** to start fresh

## Test 1: Storage Quota Management
**Expected**: No more "quota exceeded" errors

```bash
# What to test:
1. Capture 1 screenshot → Should save successfully
2. Capture 2-3 more → Should see cleanup messages in console
3. Check console for logs like:
   - "🧹 Aggressive storage cleanup..."
   - "📊 Storage info after cleanup"
   - "✅ Saved screenshots: X"
```

## Test 2: Image Quality & Compression
**Expected**: Better quality images, smaller storage footprint

```bash
# What to test:
1. Capture a screenshot
2. Check console for logs:
   - "🖼️ Original image dimensions: XXXXxXXXX"
   - "🎯 Storage-optimized dimensions: XXXXxXXXX"
   - "📊 Size reduction: XX%"
3. Verify image looks good in popup preview
```

## Test 3: PDF Export with Annotations
**Expected**: High-quality PDF with correctly positioned annotations

```bash
# What to test:
1. Capture screenshot
2. Add annotations via annotation interface
3. Export to PDF
4. Check console for:
   - "🎨 Creating high-quality image for PDF from original..."
   - "📏 Correct scaling factors: ..."
   - "✅ High-quality annotated image created for PDF"
5. Verify PDF shows annotations in correct positions
```

## Test 4: Error Handling
**Expected**: Graceful error recovery

```bash
# What to test:
1. Try to capture on restricted pages (chrome://)
2. Fill storage to near quota limit
3. Check for error messages and recovery actions
```

## Console Commands for Manual Testing

```javascript
// Check current storage usage
chrome.storage.local.getBytesInUse().then(bytes => 
  console.log('Storage used:', Math.round(bytes/1024), 'KB')
);

// Check storage quota
chrome.storage.local.getBytesInUse().then(bytes => {
  const quota = chrome.storage.local.QUOTA_BYTES;
  console.log('Usage:', Math.round((bytes/quota)*100) + '%');
});

// Clear all storage (emergency reset)
chrome.storage.local.clear().then(() => console.log('Storage cleared'));
```

## Success Indicators

✅ **Storage Management Working**:
- No "quota exceeded" errors
- Console shows cleanup messages
- Maximum 5 screenshots kept automatically

✅ **Image Quality Good**:
- Screenshots look clear in popup
- PDF export creates high-quality images
- File sizes are reasonable (under 1MB each)

✅ **Annotations Accurate**:
- Pinpoints appear exactly where clicked
- Text labels are properly positioned
- PDF shows annotations correctly scaled

## Troubleshooting

🔧 **If storage errors persist**:
1. Clear all screenshots manually
2. Reload extension
3. Check console for error messages

🔧 **If annotations are mispositioned**:
1. Check console for "📏 Scaling factors" logs
2. Verify displayWidth/Height values
3. Look for coordinate transformation logs

🔧 **If PDF quality is poor**:
1. Check for "createHighQualityImageForPDF" logs
2. Verify PNG format is being used for PDF
3. Look for dimension processing messages

## Expected Console Output (Success)

```
🗜️ Processing image (storage-optimized mode)...
📊 Original size: 2.1 MB
🖼️ Original image dimensions: 1920 x 1080
🎯 Storage-optimized dimensions: 1400 x 788
✅ Storage-optimized size: 451 KB
📊 Size reduction: 78%
🧹 Pre-save cleanup to prevent quota issues...
✅ Saved screenshots: 3
📄 PDF journal export opened with annotated images!
```