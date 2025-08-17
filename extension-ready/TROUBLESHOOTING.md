# 🔧 Snap Journal - Troubleshooting Guide

> **Quick solutions for common issues and advanced diagnostic procedures**

## 🚨 **Emergency Quick Fixes**

### **Extension Not Working At All**
```
IMMEDIATE ACTIONS (30 seconds):
1. Go to chrome://extensions/
2. Find "Snap Journal" - ensure it's ENABLED ✅
3. Click refresh icon ↻ next to Snap Journal
4. Try capturing screenshot again
```

### **Screenshots Not Capturing**
```
RAPID SOLUTION (1 minute):
1. Refresh the webpage you're trying to capture
2. Click Snap Journal icon → "📷 Capture Screenshot"
3. If still failing, test on google.com to verify extension works
4. Grant any permission requests that appear
```

### **Extension Icon Missing**
```
QUICK FIX (30 seconds):
1. Click puzzle piece icon 🧩 in Chrome toolbar
2. Find "Snap Journal" and click pin icon 📌
3. Extension icon should appear in main toolbar
```

---

## 🗄️ **Storage & Database Issues**

### **Database Errors - Auto-Repair System**

#### **"Database Not Initialized" or "Object Store Not Found"**
**✅ GOOD NEWS: Snap Journal has automatic healing!**

**What Happens Automatically:**
1. **Detection** - System identifies database issues instantly
2. **Auto-Repair** - Missing object stores recreated automatically
3. **Notification** - You'll see: "🔧 Database automatically repaired"
4. **Verification** - System confirms: "✅ Database automatically repaired - PDF export ready!"

**Expected Timeline:**
- **Detection**: Instant
- **Repair Process**: 3-5 seconds
- **Completion**: "Database ready" message appears

**If Auto-Repair Doesn't Work:**
```javascript
MANUAL DATABASE RESET (Advanced Users):
1. Right-click Snap Journal icon → "Inspect"
2. Go to "Console" tab
3. Type: resetDatabaseSchema()
4. Press Enter and wait for "✅ Database reinitialized"
5. Close console and test extension
```

#### **Storage Quota Exceeded**
**✅ AUTOMATIC PREVENTION: Smart storage switching!**

**How Snap Journal Prevents Quota Issues:**
- **Small datasets** (< 2MB) → Chrome storage
- **Large datasets** (> 2MB) → Unlimited IndexedDB
- **PDF exports** → Always unlimited IndexedDB
- **Automatic switching** → No manual intervention needed

**If You Still Get Quota Errors:**
1. **Export to PDF** - Free up storage space
2. **Clear old screenshots** - Remove unnecessary data
3. **System automatically switches** to unlimited IndexedDB

### **PDF Export Database Issues**

#### **"Failed to Store PDF Export Data"**
**Automatic Solutions Active:**
- **Intelligent routing** - Large exports automatically use IndexedDB
- **Data validation** - System validates all data before processing
- **Error recovery** - Automatic fallback to alternative methods

**Manual Troubleshooting:**
1. **Check available disk space** - Ensure sufficient storage
2. **Try smaller batches** - Export fewer screenshots at once
3. **Wait for auto-repair** - Database healing may be in progress
4. **Restart browser** - Fresh start after auto-repair completion

---

## 📸 **Screenshot Capture Problems**

### **Universal Compatibility Issues**

#### **Cannot Capture on Restricted Pages**
**❌ THIS SHOULD NOT HAPPEN - Snap Journal works universally!**

**If capture fails on Chrome internal pages:**
```
DIAGNOSTIC STEPS:
1. Test on chrome://settings/ - should work perfectly
2. Test on file:// local files - should capture normally
3. Test on secure banking sites - should function properly
4. If ANY of these fail, extension needs reinstallation
```

**Solutions:**
1. **Refresh target page** - Reload the page you're trying to capture
2. **Check extension permissions** - Ensure all permissions granted
3. **Restart browser** - Close Chrome completely and reopen
4. **Reinstall extension** - Remove and reinstall if issues persist

#### **Blank or Black Screenshots**

**Common Causes & Solutions:**

| Problem | Cause | Solution |
|---------|-------|----------|
| **Black video areas** | Hardware acceleration | Disable Chrome hardware acceleration |
| **Blank images** | Page not fully loaded | Wait for complete page load |
| **Partial capture** | Browser zoom not 100% | Reset zoom to 100% |
| **Missing content** | Extensions blocking | Disable other screenshot extensions |

**Detailed Solutions:**
1. **Hardware Acceleration Fix:**
   - Chrome Settings → Advanced → System
   - Disable "Use hardware acceleration when available"
   - Restart Chrome and test capture

2. **Page Loading Issues:**
   - Wait for page to completely finish loading
   - Look for loading indicators to disappear
   - Try capture after 2-3 seconds of page stability

3. **Browser Zoom Problems:**
   - Press Ctrl+0 (Windows) or Cmd+0 (Mac) to reset zoom
   - Ensure browser zoom shows 100%
   - Capture after zoom reset

### **Capture Quality Issues**

#### **Low Quality or Blurry Screenshots**
**⚠️ Snap Journal captures at 100% quality - issues likely elsewhere:**

**Diagnostic Checklist:**
- ✅ **Extension Quality**: 100% PNG, no compression
- ❓ **Source Page**: Check if original page is high quality
- ❓ **Browser Zoom**: Ensure 100% zoom level
- ❓ **Display Settings**: Check OS display scaling

**Solutions:**
1. **Verify source quality** - Check if original page is high resolution
2. **Reset browser zoom** - Ensure 100% zoom for optimal capture
3. **Check display scaling** - OS display settings may affect quality
4. **Test on different content** - Verify extension works on high-quality pages

---

## 📄 **PDF Export Troubleshooting**

### **PDF Generation Failures**

#### **"Failed to Generate PDF" Error**
**Most Common Causes:**

1. **No Screenshots Available**
   ```
   SOLUTION:
   ✅ Capture screenshots first before attempting PDF export
   ✅ Check screenshot library has content
   ✅ Verify screenshots loaded properly in popup
   ```

2. **Browser Download Blocking**
   ```
   SOLUTION:
   ✅ Check Chrome download settings
   ✅ Allow downloads from extension popup
   ✅ Check if PDF downloaded silently to Downloads folder
   ```

3. **Large Dataset Processing**
   ```
   SOLUTION (Automatic):
   ✅ Extension handles unlimited data automatically
   ✅ Large exports may take 2-5 minutes - be patient
   ✅ Keep export window open during processing
   ```

#### **PDF Export Window Issues**

**Problem: Export window won't open**
```
SOLUTIONS:
1. Check Chrome popup blocker settings
2. Allow popups for extension
3. Try right-clicking extension icon → Open popup
4. Disable other extensions temporarily
```

**Problem: Export window opens but shows blank/error**
```
SOLUTIONS:
1. Wait for "Database ready" message
2. Auto-repair system may be working - wait 10 seconds
3. Close and reopen export window
4. Check browser console for error messages
```

### **PDF Content Issues**

#### **Missing Screenshots in PDF**
**Diagnostic Steps:**
1. **Verify screenshot data** - Check screenshots exist in popup library
2. **Check export selection** - Ensure screenshots selected for export
3. **Database integrity** - Wait for auto-repair if database messages appear
4. **Try smaller batch** - Export 5-10 screenshots to test

#### **PDF Layout Problems**
**Layout issues automatically handled by professional formatting system:**
- ✅ **Timestamps** - Automatically added to every page
- ✅ **Spacing** - Professional medical journal layout
- ✅ **Centering** - Images automatically centered and sized
- ✅ **Quality** - Full resolution preserved

**If layout still appears incorrect:**
1. **Check PDF viewer** - Try different PDF reader (Adobe, Chrome, etc.)
2. **Re-export PDF** - Generate new PDF to verify consistency
3. **Check source screenshots** - Verify original annotations appear correctly

---

## 🎯 **Annotation System Issues**

### **Marker Placement Problems**

#### **Cannot Place Red Markers**
```
DIAGNOSTIC CHECKLIST:
□ Annotation window is active and focused
□ Image has finished loading completely
□ No other popups or dialogs blocking interface
□ Mouse clicking directly on image area
```

**Solutions:**
1. **Click annotation window** - Ensure window has focus
2. **Wait for image load** - Look for loading indicators to disappear
3. **Try different areas** - Click various parts of the image
4. **Refresh annotation window** - Close and reopen if unresponsive

#### **Markers Not Visible**
**Visibility Issues:**
- **Red background conflict** - Markers may blend with red content
- **Zoom level problems** - Try zooming in/out to see markers
- **Layer ordering** - Markers may be behind other elements

**Solutions:**
1. **Check image background** - Look for red areas where markers might blend
2. **Adjust view zoom** - Use browser zoom to better see markers
3. **Try different positioning** - Place markers on contrasting backgrounds
4. **Refresh interface** - Reload annotation window if rendering issues

### **Text Editing Problems**

#### **Cannot Edit Annotation Text**
```
TROUBLESHOOTING STEPS:
1. Double-click directly on text content (not near it)
2. Wait 1-2 seconds for edit mode to activate
3. Try single-click first, then double-click
4. Ensure annotation window has focus
```

**Common Issues:**
- **Timing** - Double-click too fast or too slow
- **Positioning** - Clicking near text instead of on text
- **Focus** - Annotation window not active
- **Interface lag** - System processing other operations

#### **Text Positioning Issues**
**Problem: Cannot drag text labels**
```
SOLUTIONS:
1. Click and hold on text box background (not just text)
2. Drag the entire text container, not individual words
3. Ensure mouse cursor changes to move cursor (↔)
4. Try clicking edges of text box for better grip
```

**Problem: Text appears in wrong location**
```
SOLUTIONS:
1. Drag text box to desired position
2. Text connects to marker with automatic arrow
3. Use professional spacing - avoid covering image details
4. Position text in clear areas for optimal readability
```

---

## ⚡ **Performance & Memory Issues**

### **Extension Running Slowly**

#### **Browser Performance Issues**
**Automatic Memory Management Active:**
- ✅ **Auto-cleanup** - Corrupted data removed every 5 minutes
- ✅ **Memory optimization** - Resources managed efficiently
- ✅ **Garbage collection** - Automatic cleanup when available

**Manual Performance Optimization:**
```
IMMEDIATE ACTIONS:
1. Export screenshots to PDF - frees memory
2. Clear old screenshots you don't need
3. Close unnecessary browser tabs
4. Restart browser if performance issues persist
```

#### **Large Dataset Performance**
**Problem: Slow performance with many screenshots**
```
AUTOMATIC SOLUTIONS:
✅ Extension optimized for hundreds of screenshots
✅ IndexedDB provides unlimited storage without performance loss
✅ Smart caching system optimizes memory usage
```

**Manual Optimization:**
1. **Regular PDF exports** - Create documentation and clear old data
2. **Batch management** - Work with smaller screenshot sets
3. **Memory monitoring** - Extension shows memory usage statistics

### **PDF Export Performance**

#### **Slow PDF Generation**
**Expected Performance:**
- **Small exports** (1-10 screenshots): 5-15 seconds
- **Medium exports** (10-50 screenshots): 30-90 seconds  
- **Large exports** (50+ screenshots): 2-5 minutes

**Optimization Tips:**
1. **Be patient** - Large datasets take time to process properly
2. **Keep window open** - Don't close export window during processing
3. **Check progress** - Look for progress indicators
4. **Sufficient memory** - Ensure adequate RAM for large exports

---

## 🔧 **Advanced Troubleshooting**

### **Developer Console Debugging**

#### **Accessing Extension Console**
```
STEPS:
1. Right-click Snap Journal icon → "Inspect"
2. Click "Console" tab
3. Look for error messages (shown in red)
4. Copy error messages for further diagnosis
```

#### **Useful Console Commands**
**For Advanced Users:**
```javascript
// Check storage statistics
memoryStatus()

// Check database status
tempStorage.getStorageStats()

// Manual database repair
resetDatabaseSchema()

// Clear all data (WARNING: Destructive)
clearExtensionStorage()

// Memory optimization
optimizeMemory()
```

### **Extension Reinstallation**

#### **Complete Reset Process**
**When all else fails:**
```
STEPS:
1. Export important screenshots to PDF first
2. Go to chrome://extensions/
3. Remove Snap Journal extension
4. Clear browser data for extension
5. Restart Chrome completely
6. Reinstall extension from original files
7. Test functionality on simple webpage
```

#### **Backup Before Reset**
```
IMPORTANT - BACKUP FIRST:
✅ Export all screenshots to PDF
✅ Save any important annotation work
✅ Document any custom settings or workflows
✅ Note any specific pages where extension was used
```

---

## 🔍 **Diagnostic Information Collection**

### **System Information Gathering**
**For Support Requests:**
```
COLLECT THIS INFORMATION:
□ Chrome version: chrome://version/
□ Extension version: Check chrome://extensions/
□ Operating system: Windows/Mac/Linux version
□ Error messages: Copy exact text from console
□ Steps to reproduce: Detailed sequence of actions
□ Screenshots: Capture error messages if possible
```

### **Error Pattern Analysis**

#### **Common Error Categories**
| Error Type | Symptoms | Auto-Fix Available |
|------------|----------|-------------------|
| **Database Issues** | "Object store not found" | ✅ Automatic repair |
| **Storage Quota** | "Quota exceeded" errors | ✅ Automatic switching |
| **Capture Failures** | Black/blank screenshots | ❌ Manual troubleshooting |
| **Permission Issues** | "Access denied" messages | ❌ Manual permission grant |

#### **Pattern Recognition**
- **Consistent failures** - Indicates system configuration issue
- **Intermittent problems** - Usually resolved by auto-repair systems
- **Page-specific issues** - May indicate page compatibility problem
- **Recent onset** - Could be browser update compatibility issue

---

## 📞 **Getting Additional Help**

### **Self-Service Resources**
1. **USER_MANUAL.md** - Comprehensive feature documentation
2. **INSTALLATION_GUIDE.md** - Detailed setup instructions
3. **FEATURE_DOCUMENTATION.md** - Complete feature reference
4. **QUICK_START_GUIDE.md** - Fast setup and basic usage

### **Before Requesting Support**
```
CHECKLIST:
□ Tried basic troubleshooting steps
□ Checked Chrome/extension versions
□ Tested on multiple pages/websites
□ Collected error messages and console output
□ Attempted extension reinstallation
□ Documented steps to reproduce issue
```

### **Issue Reporting Template**
```
PROVIDE THIS INFORMATION:
1. Issue Description: What exactly is not working?
2. System Information: Chrome version, OS, extension version
3. Error Messages: Exact text from console or interface
4. Steps to Reproduce: Detailed sequence of actions
5. Troubleshooting Attempted: What solutions have you tried?
6. Frequency: Does this happen always or intermittently?
```

---

## ✅ **Prevention Best Practices**

### **Avoiding Common Issues**
1. **Keep Chrome Updated** - Use latest stable version
2. **Grant All Permissions** - Don't deny extension permission requests
3. **Export Regularly** - Create PDF backups of important work
4. **Monitor Performance** - Watch for memory usage warnings
5. **Restart Periodically** - Restart Chrome weekly for optimal performance

### **Optimal Usage Patterns**
1. **Capture → Annotate → Export** - Follow recommended workflow
2. **Batch Processing** - Capture multiple screenshots, then annotate all
3. **Regular Maintenance** - Export and clear old screenshots monthly
4. **Test New Features** - Try new functionality on non-critical content first

### **Early Warning Signs**
Watch for these indicators of potential issues:
- **Slow capture response** - May indicate memory issues
- **Database messages** - Auto-repair system activating
- **Export delays** - Large dataset processing in progress
- **Permission prompts** - Browser security settings may need adjustment

---

## 🏆 **Troubleshooting Success Indicators**

### **✅ System Working Properly When:**
- Screenshots capture instantly on any page type
- Annotation interface responds immediately to clicks
- Text editing works with smooth double-click activation
- PDF exports complete successfully with professional layout
- Storage shows unlimited capacity with IndexedDB
- Auto-repair messages show successful database maintenance

### **✅ Performance Optimal When:**
- Extension icon loads popup instantly
- Screenshot thumbnails display quickly in library
- Annotation window opens without delay
- PDF generation completes within expected timeframes
- Memory usage statistics show normal ranges

### **✅ Universal Compatibility Verified When:**
- Works on chrome://settings/ and other internal pages
- Captures local file:// URLs successfully  
- Functions on secure banking and healthcare sites
- Operates normally on corporate intranets and restricted content

---

**🎯 Most issues resolve automatically with Snap Journal's built-in repair and optimization systems. When problems occur, they're usually temporary and fix themselves within seconds.** ✨

*For additional support, consult the comprehensive USER_MANUAL.md and FEATURE_DOCUMENTATION.md guides.*