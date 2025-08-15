# 🚀 EXTENSION INSTALLATION GUIDE

## 📁 **CRITICAL: Use the Correct Folder**

**✅ CORRECT FOLDER TO LOAD:**
```
/app/extension-ready/
```

**❌ WRONG FOLDERS (Will show "manifest file missing"):**
- `/app/` (root directory)  
- `/app/screenshot-annotator-extension/` (repository root)
- Any other subdirectory

---

## 🔧 **Step-by-Step Installation:**

### **Step 1: Open Chrome Extensions**
1. **Open Chrome browser**
2. **Go to:** `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top-right corner)

### **Step 2: Remove Any Old Version**
1. **Look for existing** "Screenshot Annotator" extensions
2. **Click "Remove"** on any old versions
3. **Clear any cached data**

### **Step 3: Load the New Extension**
1. **Click "Load unpacked"** button
2. **Navigate to:** `/app/extension-ready/`
3. **Select the folder** (not individual files)
4. **Click "Select Folder"** or "Open"

### **Step 4: Verify Installation**
✅ **You should see:**
- Extension name: "Screenshot Annotator - Working"  
- Version: "1.0"
- Status: "Enabled"
- No error messages

❌ **If you see "Manifest file missing":**
- You selected the wrong folder
- Try again with `/app/extension-ready/`

### **Step 5: Pin Extension**
1. **Click the puzzle icon** 🧩 in Chrome toolbar
2. **Find "Screenshot Annotator - Working"**
3. **Click the pin icon** 📌 to pin it to toolbar

---

## 🧪 **Test the Extension:**

### **Quick Test:**
1. **Go to any website** (e.g., google.com)
2. **Click the extension icon** 📸
3. **Click "📷 Capture & Annotate"**
4. **Should auto-start annotation mode**
5. **Click anywhere on image** to add annotation

### **Expected Flow:**
```
Click Extension → Capture & Annotate → Image Opens → Click Image → Type Text → Done!
```

---

## 🔍 **Troubleshooting:**

### **"Manifest file missing" Error:**
- **Cause:** Selected wrong directory
- **Solution:** Select `/app/extension-ready/` folder specifically

### **Extension Won't Load:**
- **Check:** Developer mode is enabled
- **Try:** Refresh the extensions page (F5)
- **Verify:** Correct folder selected

### **Extension Loads but Doesn't Work:**
- **Check:** Extension is enabled (toggle switch on)
- **Try:** Test on different website
- **Look:** Console for error messages (F12)

---

## 📂 **File Structure Verification:**

**When you select `/app/extension-ready/`, it should contain:**
```
📁 extension-ready/
  📄 manifest.json     ← MUST BE HERE!
  📄 popup.html
  📄 popup.js  
  📄 content.js
  📄 background.js
  📄 styles.css
  📄 debug.js
  🖼️ icon16.png
  🖼️ icon48.png
  🖼️ icon128.png
  📄 README.md
```

**If `manifest.json` is not directly in the selected folder, you're in the wrong place!**

---

## ✅ **Success Indicators:**

After loading the extension, you should see:
- ✅ Extension appears in `chrome://extensions/`
- ✅ Icon appears in toolbar (after pinning)
- ✅ Clicking icon opens popup with "Capture & Annotate" button
- ✅ No error messages in extensions page

The extension is ready to use with the new seamless workflow! 🎉