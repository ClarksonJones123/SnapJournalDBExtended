// Background script for Screenshot Annotator
console.log('🚀 Screenshot Annotator background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', {
    action: message.action,
    sender: sender.tab ? `Tab ${sender.tab.id}: ${sender.tab.url}` : 'Extension popup',
    timestamp: new Date().toISOString()
  });
  
  if (message.action === 'ping') {
    console.log('🏓 Ping received');
    sendResponse({ success: true, message: 'Extension background is working!' });
    return true;
  }
  
  if (message.action === 'captureVisibleTab') {
    console.log('📸 Starting visible tab capture...');
    
    try {
      chrome.tabs.captureVisibleTab(
        null,
        { format: 'png', quality: 100 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Capture error:', chrome.runtime.lastError);
            console.error('❌ Error message:', chrome.runtime.lastError.message);
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
          } else if (!dataUrl) {
            console.error('❌ No data URL returned from capture');
            sendResponse({ 
              success: false, 
              error: 'No screenshot data returned' 
            });
          } else {
            console.log('✅ Screenshot captured successfully');
            console.log('📏 Data URL length:', dataUrl.length, 'characters');
            console.log('📏 Data URL prefix:', dataUrl.substring(0, 50) + '...');
            
            sendResponse({ 
              success: true, 
              imageData: dataUrl 
            });
          }
        }
      );
    } catch (captureError) {
      console.error('❌ Exception during capture:', captureError);
      sendResponse({ 
        success: false, 
        error: `Capture exception: ${captureError.message}` 
      });
    }
    
    return true; // Keep message channel open for async response
  }
  
  console.log('❓ Unknown action received:', message.action);
  sendResponse({ success: false, error: `Unknown action: ${message.action}` });
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('💾 Storage change detected:', {
    area: areaName,
    keys: Object.keys(changes),
    timestamp: new Date().toISOString()
  });
  
  if (areaName === 'local' && changes.screenshots) {
    const oldValue = changes.screenshots.oldValue || [];
    const newValue = changes.screenshots.newValue || [];
    
    console.log('📸 Screenshots storage updated:', {
      oldCount: oldValue.length,
      newCount: newValue.length,
      change: newValue.length - oldValue.length
    });
    
    // Calculate memory usage
    let totalSize = 0;
    newValue.forEach(screenshot => {
      if (screenshot.imageData) {
        totalSize += screenshot.imageData.length;
      }
    });
    
    const totalSizeKB = Math.round(totalSize / 1024);
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    
    console.log('📊 Memory usage calculation:', {
      totalSize: totalSize,
      sizeKB: totalSizeKB,
      sizeMB: totalSizeMB
    });
    
    // Warn if memory usage is high
    if (totalSize > 50 * 1024 * 1024) { // 50MB
      console.warn('⚠️ High memory usage detected:', totalSizeMB, 'MB');
    }
  }
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🎉 Screenshot Annotator installed/updated:', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
    timestamp: new Date().toISOString()
  });
  
  // Clear any existing data on fresh install
  if (details.reason === 'install') {
    console.log('🧹 Clearing storage on fresh install...');
    chrome.storage.local.clear().then(() => {
      console.log('✅ Storage cleared for fresh install');
    }).catch((error) => {
      console.error('❌ Failed to clear storage on install:', error);
    });
  }
});

// Startup handler
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension starting up at:', new Date().toISOString());
});