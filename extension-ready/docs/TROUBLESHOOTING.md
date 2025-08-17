# 🔧 Snap Journal - Troubleshooting Guide

## 🚨 **Quick Emergency Fixes**

### **Extension Not Working At All**
1. **Check Extension Status**
   - Go to `chrome://extensions/`
   - Verify "Snap Journal" is **enabled**
   - If disabled, click toggle to enable

2. **Refresh Extension**
   - Click refresh/reload icon next to extension
   - Close and reopen browser
   - Try capturing screenshot again

3. **Check Permissions**
   - Extension should show permissions for:
     - ✅ Take screenshots
     - ✅ Access storage
     - ✅ Access tabs
   - If missing, remove and reinstall extension

### **Screenshots Not Capturing**
1. **Immediate Fix**
   - Refresh the webpage you're trying to capture
   - Click extension icon → "📷 Capture Screenshot"
   - If still failing, try different webpage

2. **Permission Issue**
   - Extension may need additional permissions
   - Check for permission popup when clicking capture
   - Grant all requested permissions

---

## 🗄️ **Storage & Database Issues**

### **"Database Not Initialized" Errors**

#### **Automatic Repair System**
The extension includes **automatic database healing** that should fix most issues:

1. **Wait for Auto-Repair**
   - Look for "🔧 Database automatically repaired" message
   - Process usually takes 3-5 seconds
   - Extension will show "✅ Database automatically repaired - PDF export ready!"

2. **If Auto-Repair Doesn't Work**
   - Close all browser tabs and windows
   - Reopen browser and try extension again
   - Auto-repair system will attempt fix on startup

#### **Manual Database Reset (Advanced)**
If automatic repair fails:

1. **Open Browser Console**
   - Right-click extension popup → "Inspect"
   - Go to "Console" tab
   - Type: `resetDatabaseSchema()`
   - Press Enter and wait for completion

2. **Verification**
   - Look for "✅ Database reinitialized with correct schema"
   - Close console and try extension again

### **Storage Quota Issues**

#### **"Quota Exceeded" Errors**
The extension uses **intelligent storage selection** to prevent quota issues:

**Automatic Prevention**:
- Small datasets (< 2MB) → Chrome storage
- Large datasets (> 2MB) → IndexedDB unlimited storage
- System automatically chooses best method

**If You Still Get Quota Errors**:
1. **Export to PDF** - Clear up storage space
2. **Clear Screenshots** - Remove old screenshots you don't need
3. **System will automatically switch** to unlimited IndexedDB storage

### **"Object Store Not Found" Errors**

#### **PDF Export Issues**
If PDF export fails with object store errors:

1. **Automatic Fix Active**
   - Extension automatically detects and repairs these issues
   - Look for database repair messages in popup

2. **Manual Solution**
   - Wait for automatic repair to complete
   - If issue persists, try manual database reset (see above)

---

## 📸 **Screenshot Capture Problems**

### **Blank or Black Screenshots**

#### **Common Causes & Solutions**

**Problem**: Screenshots show blank or black images
**Solutions**:
1. **Page Loading** - Wait for page to fully load before capturing
2. **Video Content** - Some video players may show black (browser limitation)  
3. **Hardware Acceleration** - Try disabling Chrome hardware acceleration
   - Chrome Settings → Advanced → System → Disable "Use hardware acceleration"

**Problem**: Screenshots missing content or partially blank
**Solutions**:
1. **Scroll Position** - Extension captures visible viewport only
2. **Zoom Level** - Try resetting page zoom to 100%
3. **Browser Size** - Maximize browser window for full capture

### **Capture Fails on Specific Sites**

#### **Restricted Content**
**Problem**: Cannot capture on certain websites
**Solutions**:
1. **This extension works on ALL sites** - If failing, it's likely temporary
2. **Refresh page** and try again
3. **Check browser console** for any error messages
4. **Try different browser tab** to test extension functionality

#### **Chrome Internal Pages**
**Problem**: Cannot capture Chrome settings or internal pages
**Solutions**:
1. **This should work** - Extension designed for universal compatibility
2. **Check developer mode** - Ensure extension loaded in developer mode
3. **Extension permissions** - Verify all permissions granted
4. **Restart browser** - Close completely and reopen

---

## 📄 **PDF Export Issues**

### **PDF Generation Failures**

#### **"Failed to Generate PDF" Errors**
**Causes & Solutions**:

1. **No Screenshots to Export**
   - **Check screenshot library** - Ensure you have captured screenshots
   - **Capture new screenshots** if library is empty

2. **Browser Download Blocking**
   - **Check download permissions** in Chrome settings
   - **Allow downloads** from extension popup domain
   - **Check Downloads folder** - PDF may have downloaded silently

3. **Large Dataset Issues**
   - **Extension handles unlimited data** automatically
   - **If export fails**, try smaller batches of screenshots
   - **Wait longer** - Large exports may take several minutes

#### **PDF Quality Issues**
**Problem**: PDF images appear low quality or compressed
**Solutions**:
1. **Extension uses 100% quality** - No compression applied
2. **Check original screenshots** - Quality may be from capture source
3. **Browser zoom level** - Capture at 100% zoom for best quality

### **Timestamp or Layout Problems**

#### **Missing Timestamps**
**Problem**: PDF doesn't show capture dates/times
**Solutions**:
1. **Feature is automatic** - Should appear on all PDF exports
2. **Check screenshot data** - Older screenshots may lack timestamp data
3. **Recapture screenshots** if timestamps are critical

#### **Layout Issues**
**Problem**: Images not properly spaced or positioned
**Solutions**:
1. **Professional layout is automatic** - Should have proper spacing
2. **Check PDF viewer** - Try different PDF viewer software
3. **Re-export** - Try generating PDF again

---

## 🎯 **Annotation Problems**

### **Cannot Place Markers**

#### **Mouse Click Issues**
**Problem**: Clicking on image doesn't place red markers
**Solutions**:
1. **Ensure annotation window is active** - Click on window first
2. **Check image loading** - Wait for image to fully load
3. **Try different areas** - Click on different parts of image
4. **Reload annotation page** - Refresh if interface not responding

#### **Markers Not Visible**
**Problem**: Red dots placed but not visible
**Solutions**:
1. **Check image background** - Red dots may blend with red content
2. **Zoom in/out** - Adjust view to see markers better
3. **Drag markers** - Try dragging to different positions

### **Text Editing Issues**

#### **Cannot Edit Annotation Text**
**Problem**: Double-clicking text doesn't allow editing
**Solutions**:
1. **Double-click precisely** - Click directly on text content
2. **Wait for interface** - Allow time for edit mode to activate
3. **Try single-click first** - Select text area, then double-click
4. **Refresh page** - Reload annotation window if unresponsive

#### **Text Positioning Problems**
**Problem**: Cannot drag text labels to desired positions
**Solutions**:
1. **Click and hold** - Ensure proper drag action
2. **Drag text box, not text** - Drag the container, not just text
3. **Check for overlaps** - Text may be behind other elements

---

## ⚡ **Performance Issues**

### **Extension Running Slowly**

#### **Memory Usage**
**Problem**: Browser becomes slow when using extension
**Solutions**:
1. **Automatic memory management** - Extension cleans up automatically
2. **Export and clear** - Export screenshots to PDF, then clear library
3. **Restart browser** - Close and reopen if performance issues persist
4. **Check other extensions** - Disable other extensions temporarily

#### **Large Dataset Performance**
**Problem**: Slow performance with many screenshots
**Solutions**:
1. **Extension optimized for large datasets** - Should handle hundreds of screenshots
2. **Export regularly** - Create PDF exports and clear old screenshots
3. **Close unused tabs** - Reduce browser memory usage overall

### **PDF Export Performance**

#### **Slow PDF Generation**
**Problem**: PDF export takes very long time
**Solutions**:
1. **Large datasets take time** - Be patient with 100+ screenshots
2. **Check progress** - Look for progress indicators in export window
3. **Don't close window** - Keep export window open during generation
4. **Check available memory** - Ensure sufficient RAM for large exports

---

## 🔧 **Advanced Troubleshooting**

### **Console Debugging**

#### **Viewing Debug Information**
If you're comfortable with browser developer tools:

1. **Open Extension Console**
   - Right-click extension popup → "Inspect"
   - Go to "Console" tab
   - Look for error messages in red

2. **Common Error Patterns**
   - **IndexedDB errors** - Database initialization issues
   - **Storage errors** - Chrome storage quota problems  
   - **Capture errors** - Screenshot API issues
   - **PDF errors** - Export processing problems

#### **Debug Commands**
Advanced users can use these console commands:

```javascript
// Check storage statistics
memoryStatus()

// Clear all extension data (warning: deletes all screenshots)
clearExtensionStorage()

// Fix database issues manually
resetDatabaseSchema()

// Optimize memory usage
optimizeMemory()
```

### **Extension Reinstallation**

#### **Complete Reset Process**
If all else fails, completely reset the extension:

1. **Export Important Screenshots** - Save any screenshots you want to keep as PDF
2. **Remove Extension** - Go to `chrome://extensions/` and remove
3. **Clear Browser Data** - Clear extension-related data
4. **Reinstall** - Add extension again from Chrome Web Store or manual install
5. **Reconfigure** - Set up permissions and test functionality

#### **Backup Before Reset**
Before reinstalling:
- **Export all screenshots** to PDF
- **Save annotation templates** if you have standard formats
- **Document settings** you want to restore

---

## 📞 **Getting Additional Help**

### **Self-Help Resources**
1. **User Guide** - Check [USER_GUIDE.md](USER_GUIDE.md) for complete instructions
2. **Privacy Policy** - Review [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for data handling
3. **Extension Console** - Use browser developer tools for technical debugging

### **Reporting Issues**
If problems persist after trying these solutions:

1. **Gather Information**
   - What were you trying to do?
   - What error messages appeared?
   - What steps did you already try?
   - What browser version are you using?

2. **Console Information**
   - Copy any error messages from browser console
   - Note extension version and settings
   - Document steps to reproduce the issue

### **Common Issue Patterns**

#### **Issues That Auto-Resolve**
- Database initialization errors (automatic repair system)
- Storage quota issues (automatic method switching)
- Temporary capture failures (usually resolved by refresh)

#### **Issues Requiring Manual Action**
- Permission-related problems (grant permissions manually)
- Browser-specific compatibility (update browser)
- Hardware acceleration conflicts (disable in Chrome settings)

---

## ✅ **Prevention Best Practices**

### **Avoiding Future Issues**
1. **Keep Browser Updated** - Use latest Chrome version
2. **Grant All Permissions** - Don't deny extension permissions
3. **Export Regularly** - Create PDF backups of important screenshots
4. **Monitor Storage** - Extension shows storage usage information
5. **Don't Disable Extension** - Keep extension enabled for automatic maintenance

### **Optimal Usage Patterns**
1. **Capture → Annotate → Export** - Follow this workflow for best results
2. **Batch Processing** - Capture multiple screenshots, then annotate all
3. **Regular Cleanup** - Export to PDF and clear old screenshots periodically
4. **Test New Features** - Try new functionality on non-critical content first

**🎯 Most issues resolve automatically with the extension's built-in repair and optimization systems. When in doubt, try refreshing the page and waiting for automatic fixes to complete!** ✨