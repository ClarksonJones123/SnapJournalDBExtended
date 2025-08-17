# 🔧 Snap Journal - API Reference

## 📋 **Technical Documentation for Developers**

### **Extension Architecture Overview**

#### **Core Components**
- **Service Worker** (`background.js`) - Chrome APIs and inter-component communication
- **Popup Interface** (`popup.js`) - Main user interface and screenshot management
- **Content Script** (`content.js`) - Page interaction and screenshot capture preparation
- **Annotation System** (`annotation.js`) - Standalone annotation interface
- **Storage Manager** (`temp-storage.js`) - IndexedDB unlimited storage system
- **PDF Engine** (`pdf-export.js`) - Professional PDF generation with timestamps

#### **Data Flow Architecture**
```
User Action → Popup Interface → Chrome APIs → Storage System → Annotation Interface → PDF Export
     ↑                                                                                      ↓
Extension Icon ← Background Script ← Content Script ← IndexedDB ← TempStorageManager ← jsPDF
```

---

## 🗄️ **Storage System API**

### **TempStorageManager Class**

#### **Core Methods**

##### **`init(): Promise<void>`**
Initializes IndexedDB database with comprehensive schema validation.

```javascript
const storage = new TempStorageManager();
await storage.init();
// Creates IndexedDB v2 with object stores: screenshots, sessions, tempImages, pdfExports
```

**Features**:
- Automatic schema validation and repair
- Version migration from v1 to v2
- Error recovery with fallback mechanisms
- Race condition prevention during initialization

##### **`saveScreenshot(screenshot): Promise<{success: boolean}>`**
Saves screenshot with annotations to unlimited IndexedDB storage.

```javascript
const screenshot = {
    id: 'screenshot_' + Date.now(),
    imageData: 'data:image/png;base64,...',
    annotations: [
        {
            id: 'marker_1',
            x: 150,
            y: 200,
            text: 'Annotation text',
            timestamp: new Date().toISOString()
        }
    ],
    timestamp: new Date().toISOString(),
    displayWidth: 1920,
    displayHeight: 1080
};

await storage.saveScreenshot(screenshot);
```

##### **`getAllScreenshots(sessionId?): Promise<Screenshot[]>`**
Retrieves all screenshots, optionally filtered by session.

```javascript
// Get all screenshots
const allScreenshots = await storage.getAllScreenshots();

// Get screenshots for specific session
const sessionScreenshots = await storage.getAllScreenshots('session_123');
```

##### **`getStorageStats(): Promise<StorageStats>`**
Returns comprehensive storage statistics and usage information.

```javascript
const stats = await storage.getStorageStats();
console.log(stats);
// {
//   totalScreenshots: 150,
//   totalSessions: 5,
//   totalSize: 50331648,
//   totalSizeMB: 48,
//   unlimited: true,
//   capacity: 'UNLIMITED (IndexedDB)',
//   currentUsage: '48MB (Would exceed Chrome storage!)'
// }
```

#### **PDF Export API**

##### **`storePdfExportData(exportId, exportData): Promise<{success: boolean, exportId: string}>`**
Stores large PDF export dataset in IndexedDB to bypass Chrome storage quotas.

```javascript
const exportData = {
    screenshots: validScreenshots,
    totalAnnotations: 25,
    exportDate: new Date().toISOString(),
    exportMethod: 'IndexedDB'
};

await storage.storePdfExportData('pdf_export_123', exportData);
```

##### **`getPdfExportData(exportId): Promise<ExportData>`**
Retrieves PDF export data with comprehensive validation.

```javascript
const exportData = await storage.getPdfExportData('pdf_export_123');
// Returns validated data structure with screenshots array
```

#### **Error Handling & Recovery**

##### **`validateAndFixSchema(): Promise<ValidationResult>`**
Comprehensive schema validation with automatic repair capabilities.

```javascript
const result = await storage.validateAndFixSchema();
console.log(result);
// {
//   repaired: true,
//   success: true,
//   missingStores: ['pdfExports'],
//   fixedStores: ['screenshots', 'sessions', 'tempImages', 'pdfExports'],
//   message: 'Schema automatically repaired - PDF export ready!'
// }
```

---

## 📸 **Screenshot Capture API**

### **ScreenshotAnnotator Class**

#### **Core Capture Methods**

##### **`captureScreenshot(): Promise<void>`**
Captures current tab screenshot with 100% quality and automatic processing.

```javascript
const annotator = new ScreenshotAnnotator();
await annotator.captureScreenshot();
// Automatically opens annotation interface with captured image
```

**Process Flow**:
1. Request active tab information via Chrome APIs
2. Capture visible tab content at 100% quality
3. Process image data and create screenshot object
4. Save to IndexedDB with automatic quota management
5. Open annotation interface for immediate editing

##### **`loadScreenshots(): Promise<void>`**
Loads and displays all saved screenshots in popup interface.

```javascript
await annotator.loadScreenshots();
// Populates screenshot grid with thumbnails and metadata
```

#### **Memory Management**

##### **`automaticStorageCleanup(): Promise<void>`**
Intelligent storage optimization and cleanup.

```javascript
await annotator.automaticStorageCleanup();
// Removes corrupted data, optimizes storage, manages resources
```

##### **`optimizeMemory(): Promise<void>`**
Aggressive memory optimization for large datasets.

```javascript
await annotator.optimizeMemory();
// Clears DOM image cache, runs garbage collection, optimizes resources
```

---

## 📝 **Annotation System API**

### **Annotation Interface**

#### **Marker System**

##### **`addAnnotation(x, y, text): string`**
Creates new annotation marker at specified coordinates.

```javascript
// Add annotation at pixel coordinates
const markerId = addAnnotation(150, 200, 'Important finding');
// Returns unique marker ID for reference
```

**Marker Properties**:
- **Precise Positioning** - Pixel-perfect coordinate placement
- **Draggable Interface** - Click and drag to reposition
- **Visual Design** - 16px red circle with white border
- **Auto-numbering** - Sequential numbering (optional)

##### **`updateAnnotation(markerId, newText): void`**
Updates annotation text content.

```javascript
updateAnnotation('marker_123', 'Updated annotation text');
```

#### **Arrow System**

##### **Dynamic SVG Arrows**
Automatic arrow generation connecting markers to text labels.

```javascript
// Arrows automatically created and updated
const arrow = {
    id: 'arrow_marker_123',
    startX: markerX,
    startY: markerY,
    endX: textX,
    endY: textY,
    style: 'dashed',
    strokeWidth: 3,
    opacity: 0.9
};
```

**Arrow Features**:
- **Real-time Updates** - Adjust as components move
- **Professional Styling** - Dashed lines with medical appearance
- **Smart Visibility** - Hide when text close to marker
- **SVG Rendering** - Scalable vector graphics for quality

#### **Text Label System**

##### **Draggable Text Boxes**
Professional text label system with optimal positioning.

```javascript
const textLabel = {
    id: 'text_marker_123',
    content: 'Annotation text',
    x: 200,
    y: 180,
    draggable: true,
    style: {
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ccc',
        padding: '8px',
        borderRadius: '4px'
    }
};
```

---

## 📄 **PDF Export API**

### **PDFJournalExporter Class**

#### **Professional PDF Generation**

##### **`generatePDF(): Promise<void>`**
Creates professional medical-grade PDF with timestamps and spacing.

```javascript
const exporter = new PDFJournalExporter();
await exporter.generatePDF();
// Generates PDF with professional layout and downloads automatically
```

**PDF Features**:
- **Comprehensive Timestamps** - Full date/time headers
- **Horizontal Spacing** - Professional medical journal layout
- **Aspect Ratio Preservation** - Images maintain original proportions
- **Unlimited Capacity** - Support for hundreds of screenshots

##### **`addScreenshotPage(pdf, screenshot, pageNumber): Promise<void>`**
Adds individual screenshot page with professional layout.

```javascript
await exporter.addScreenshotPage(pdf, screenshot, pageNumber, pageWidth, pageHeight, margin, contentWidth, contentHeight);
```

**Page Layout**:
```
┌─────────────────────────────────────────┐
│  📸 Captured: Mon, Jan 15, 2025 at 2:30:45 PM  │ ← Timestamp Header (15mm)
├─────────────────────────────────────────┤
│           [Horizontal Spacing]           │ ← Spacing (10mm)
│  ┌─────────────────────────────────────┐ │
│  │         Screenshot Image            │ │ ← Centered Image
│  │       (Maintains Aspect Ratio)     │ │
│  └─────────────────────────────────────┘ │
│           [Horizontal Spacing]           │ ← Spacing (10mm)
└─────────────────────────────────────────┘
```

#### **Timestamp System**

##### **`formatTimestamp(date): string`**
Professional timestamp formatting for medical documentation.

```javascript
const formattedTimestamp = formatTimestamp(new Date());
// Returns: "📸 Captured: Mon, Jan 15, 2025 at 2:30:45 PM"
```

---

## 🔄 **Chrome Extension APIs**

### **Background Script Integration**

#### **Service Worker (`background.js`)**

##### **Message Handling**
Inter-component communication system.

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'captureScreenshot':
            // Handle screenshot capture request
            break;
        case 'pdfExportCompleted':
            // Handle PDF export completion
            break;
    }
});
```

##### **Tab Capture API**
High-quality screenshot capture with Chrome APIs.

```javascript
chrome.tabs.captureVisibleTab(null, {
    format: 'png',
    quality: 100
}, (dataUrl) => {
    // Process captured screenshot data
});
```

#### **Content Script Integration**

##### **Page Interaction**
Universal page compatibility and interaction.

```javascript
// Inject content script for page interaction
chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
});
```

---

## 🛡️ **Error Handling & Debugging**

### **Comprehensive Error System**

#### **Automatic Error Recovery**

##### **Database Healing**
```javascript
// Automatic schema repair on initialization
try {
    await storage.init();
} catch (error) {
    // Automatic repair system activates
    const repairResult = await storage.performAutomaticSchemaRepair();
    if (repairResult.success) {
        console.log('✅ Database automatically healed');
    }
}
```

##### **Quota Management**
```javascript
// Intelligent storage method selection
const useIndexedDB = (
    totalDataSize > 2 * 1024 * 1024 ||  // > 2MB
    validScreenshots.length > 3 ||      // > 3 screenshots
    totalSizeMB > 2                     // Additional safety check
);

if (useIndexedDB) {
    return await this.exportPdfJournalViaIndexedDB(validScreenshots);
} else {
    return await this.exportPdfJournalViaChrome(validScreenshots);
}
```

#### **Debug Interface**

##### **Console Commands**
Development and troubleshooting commands available in browser console.

```javascript
// Storage diagnostics
memoryStatus()              // Show detailed storage breakdown
getStorageStats()           // Get comprehensive statistics
optimizeMemory()            // Perform memory optimization

// Database management
resetDatabaseSchema()       // Manual database repair
clearExtensionStorage()     // Clear all data (warning: destructive)
fixCorruptedScreenshots()   // Remove corrupted data

// Performance monitoring
window.screenshotAnnotator.updateUI()  // Force UI refresh
window.debugLog('Custom message')      // Add debug entry
```

##### **Error Logging System**
```javascript
// Enhanced debug logging with persistence
window.debugLog = function(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    // Automatically saved to localStorage for persistence
};

window.debugError = function(message, error = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ❌ ${message}`;
    // Enhanced error logging with stack traces
};
```

---

## 📊 **Performance Monitoring**

### **Memory Management**

#### **Automatic Cleanup System**
```javascript
// Scheduled cleanup every 5 minutes
setInterval(async () => {
    await this.automaticStorageCleanup();
}, 5 * 60 * 1000);

// Memory optimization
const cleanup = {
    clearImageCache: () => {
        // Remove DOM img elements
        document.querySelectorAll('img[id^="screenshot-img-"]').forEach(img => img.remove());
    },
    
    optimizeStorage: async () => {
        // Run storage optimization
        await this.tempStorage.cleanupOldPdfExports();
    },
    
    garbageCollection: () => {
        // Force garbage collection if available
        if (window.gc) window.gc();
    }
};
```

#### **Storage Analytics**
```javascript
// Real-time storage monitoring
const analytics = {
    totalScreenshots: screenshots.length,
    totalSizeMB: Math.round(totalSize / 1024 / 1024),
    unlimited: true,
    capacity: 'UNLIMITED (IndexedDB)',
    memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        allocated: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    } : 'Not available'
};
```

---

## 🔒 **Security Implementation**

### **Content Security Policy**

#### **Strict CSP Configuration**
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self';"
    }
}
```

**Security Features**:
- **No Inline Scripts** - All JavaScript in separate files
- **No Eval** - No dynamic code execution
- **Self-Only Sources** - Only extension files allowed
- **XSS Prevention** - Input validation and sanitization

#### **Permission Model**
```json
{
    "permissions": ["activeTab", "storage", "tabs", "downloads", "scripting"],
    "host_permissions": ["<all_urls>"]
}
```

**Minimal Permissions**:
- **activeTab** - Screenshot capture only
- **storage** - Local data persistence
- **tabs** - Tab information for capture
- **downloads** - PDF file saving
- **scripting** - Content script injection
- **host_permissions** - Universal page compatibility

---

## 🎯 **Development Guidelines**

### **Extension Development**

#### **Manifest V3 Standards**
```json
{
    "manifest_version": 3,
    "name": "Screenshot Annotator - Universal",
    "version": "2.0.0",
    "description": "Medical-grade screenshot annotation with unlimited storage",
    "background": {
        "service_worker": "background.js"
    },
    "action": {
        "default_popup": "popup.html",
        "default_title": "Screenshot Annotator"
    }
}
```

#### **Code Quality Standards**
- **ESLint Compliance** - Follow JavaScript best practices
- **Error Handling** - Comprehensive try-catch blocks
- **Memory Management** - Proper cleanup and resource disposal
- **Performance** - Efficient algorithms and minimal DOM manipulation
- **Accessibility** - Keyboard navigation and screen reader support

#### **Testing Requirements**
- **Unit Testing** - Individual function validation
- **Integration Testing** - Component interaction verification
- **Error Scenario Testing** - Edge case and failure handling
- **Performance Testing** - Memory usage and processing speed
- **Security Testing** - XSS prevention and input validation

---

## 📚 **API Reference Summary**

### **Core Classes**
- **`TempStorageManager`** - Unlimited IndexedDB storage system
- **`ScreenshotAnnotator`** - Main extension interface and functionality
- **`PDFJournalExporter`** - Professional PDF generation with timestamps
- **`AnnotationSystem`** - Marker, text, and arrow management

### **Key Methods**
- **Storage**: `init()`, `saveScreenshot()`, `getAllScreenshots()`, `getStorageStats()`
- **Capture**: `captureScreenshot()`, `loadScreenshots()`, `automaticStorageCleanup()`
- **PDF Export**: `generatePDF()`, `storePdfExportData()`, `getPdfExportData()`
- **Error Recovery**: `validateAndFixSchema()`, `performAutomaticSchemaRepair()`

### **Chrome APIs Used**
- **`chrome.tabs.captureVisibleTab`** - Screenshot capture
- **`chrome.storage.local`** - Fallback storage system
- **`chrome.runtime.sendMessage`** - Inter-component communication
- **`chrome.downloads.download`** - PDF file saving

### **Data Structures**
- **Screenshot Object** - Image data, annotations, timestamps, metadata
- **Annotation Object** - Position, text, styling, relationships
- **Export Data** - Screenshots collection, statistics, formatting options
- **Storage Stats** - Usage information, capacity, performance metrics

---

*This API reference covers the complete technical implementation of Screenshot Annotator v2.0.0. For usage examples and workflows, see the [User Guide](USER_GUIDE.md). For troubleshooting, see the [Troubleshooting Guide](TROUBLESHOOTING.md).*