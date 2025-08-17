console.log('[Snap Journal] 🚀 Service Worker initializing...');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Snap Journal] ✅ Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        // First-time installation
        console.log('[Snap Journal] 🎉 Welcome to Snap Journal!');
        
        // Set up default settings
        chrome.storage.local.set({
            'snapJournalSettings': {
                version: '2.0.1',
                installDate: new Date().toISOString(),
                debugMode: false,
                autoSave: true
            }
        });
    } else if (details.reason === 'update') {
        // Extension update
        console.log('[Snap Journal] 🔄 Extension updated to version 2.0.1');
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('[Snap Journal] 🌅 Extension startup');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Snap Journal] 📨 Message received:', request);
    
    switch (request.action) {
        case 'captureScreenshot':
            handleCaptureScreenshot(request, sender, sendResponse);
            return true; // Keep channel open for async response
            
        case 'openAnnotationWindow':
            handleOpenAnnotationWindow(request, sender, sendResponse);
            return true;
            
        case 'pdfExportCompleted':
            handlePdfExportCompleted(request, sender, sendResponse);
            break;
            
        case 'getExtensionInfo':
            sendResponse({
                version: '2.0.1',
                name: 'Snap Journal'
            });
            break;
            
        default:
            console.log('[Snap Journal] ⚠️ Unknown message action:', request.action);
            sendResponse({ error: 'Unknown action' });
    }
});

// Handle screenshot capture requests
async function handleCaptureScreenshot(request, sender, sendResponse) {
    try {
        console.log('[Snap Journal] 📸 Handling screenshot capture request');
        
        // Get the active tab
        const [activeTab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true 
        });
        
        if (!activeTab) {
            throw new Error('No active tab found');
        }
        
        console.log('[Snap Journal] 📍 Capturing tab:', {
            title: activeTab.title,
            url: activeTab.url,
            id: activeTab.id
        });
        
        // Capture the visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
            format: 'png',
            quality: 100
        });
        
        console.log('[Snap Journal] ✅ Screenshot captured successfully');
        
        // Send response with screenshot data
        sendResponse({
            success: true,
            dataUrl: dataUrl,
            tabInfo: {
                title: activeTab.title,
                url: activeTab.url,
                id: activeTab.id,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('[Snap Journal] ❌ Screenshot capture failed:', error);
        
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Handle annotation window opening
async function handleOpenAnnotationWindow(request, sender, sendResponse) {
    try {
        console.log('[Snap Journal] 🪟 Opening annotation window');
        
        const annotationUrl = chrome.runtime.getURL('annotation.html');
        
        // Create new window for annotation
        const window = await chrome.windows.create({
            url: annotationUrl,
            type: 'popup',
            width: 1200,
            height: 800,
            focused: true
        });
        
        console.log('[Snap Journal] ✅ Annotation window opened:', window.id);
        
        sendResponse({
            success: true,
            windowId: window.id
        });
        
    } catch (error) {
        console.error('[Snap Journal] ❌ Failed to open annotation window:', error);
        
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Handle PDF export completion notifications
function handlePdfExportCompleted(request, sender, sendResponse) {
    console.log('[Snap Journal] 📄 PDF export completed:', request);
    
    // Could trigger notifications or cleanup here
    if (request.success) {
        console.log('[Snap Journal] ✅ PDF export successful');
    } else {
        console.error('[Snap Journal] ❌ PDF export failed:', request.error);
    }
    
    sendResponse({ acknowledged: true });
}

// Handle tab updates for potential screenshot capture
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only log significant changes to avoid spam
    if (changeInfo.status === 'complete') {
        console.log('[Snap Journal] 📄 Tab loaded:', {
            id: tabId,
            title: tab.title,
            url: tab.url
        });
    }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        console.log('[Snap Journal] 🔍 Window focused:', windowId);
    }
});

// Cleanup on extension suspension
chrome.runtime.onSuspend.addListener(() => {
    console.log('[Snap Journal] 😴 Extension suspending...');
});

// Handle extension uninstall
chrome.runtime.setUninstallURL('https://forms.gle/feedback');

// Periodic cleanup and maintenance
chrome.alarms.create('maintenance', {
    delayInMinutes: 60, // Run every hour
    periodInMinutes: 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'maintenance') {
        console.log('[Snap Journal] 🔧 Running periodic maintenance');
        performMaintenance();
    }
});

async function performMaintenance() {
    try {
        // Clean up old temporary data
        const result = await chrome.storage.local.get(null);
        const keys = Object.keys(result);
        
        // Remove temporary keys older than 24 hours
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        const keysToRemove = [];
        
        keys.forEach(key => {
            if (key.startsWith('temp_') || key.startsWith('cache_')) {
                const data = result[key];
                if (data && data.timestamp && data.timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
            }
        });
        
        if (keysToRemove.length > 0) {
            await chrome.storage.local.remove(keysToRemove);
            console.log('[Snap Journal] 🧹 Cleaned up temporary data:', keysToRemove.length);
        }
        
        console.log('[Snap Journal] ✅ Maintenance completed');
        
    } catch (error) {
        console.error('[Snap Journal] ❌ Maintenance failed:', error);
    }
}

// Error handling for unhandled errors
self.addEventListener('error', (event) => {
    console.error('[Snap Journal] ❌ Unhandled error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[Snap Journal] ❌ Unhandled promise rejection in service worker:', event.reason);
});

console.log('[Snap Journal] ✅ Service Worker initialized successfully');