// Debug script for popup.js issues
// This script helps identify why screenshots aren't showing in the popup list

class PopupDebugger {
  constructor() {
    this.console = console;
    this.startDebugging();
  }
  
  startDebugging() {
    this.log('🔍 Starting popup debug session...');
    this.checkEnvironment();
    this.checkDOM();
    this.checkStorage();
  }
  
  log(message, data = null) {
    console.log(`[POPUP DEBUG] ${message}`, data || '');
  }
  
  error(message, error = null) {
    console.error(`[POPUP DEBUG] ${message}`, error || '');
  }
  
  checkEnvironment() {
    this.log('Checking environment...');
    
    // Check Chrome APIs
    if (typeof chrome !== 'undefined') {
      this.log('✅ Chrome APIs available');
      
      if (chrome.storage) {
        this.log('✅ Chrome storage API available');
      } else {
        this.error('❌ Chrome storage API not available');
      }
      
      if (chrome.runtime) {
        this.log('✅ Chrome runtime API available');
      } else {
        this.error('❌ Chrome runtime API not available');
      }
      
    } else {
      this.error('❌ Chrome APIs not available - extension may not be loaded');
    }
  }
  
  checkDOM() {
    this.log('Checking DOM elements...');
    
    const requiredElements = [
      'captureBtn',
      'annotateBtn', 
      'clearAllBtn',
      'exportPdfBtn',
      'screenshotGrid',
      'memoryUsage',
      'screenshotCount',
      'statusMessage'
    ];
    
    let missingElements = [];
    
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.log(`✅ Found element: ${id}`);
      } else {
        this.error(`❌ Missing element: ${id}`);
        missingElements.push(id);
      }
    });
    
    if (missingElements.length > 0) {
      this.error('Missing DOM elements could cause UI issues:', missingElements);
    } else {
      this.log('✅ All required DOM elements found');
    }
  }
  
  async checkStorage() {
    this.log('Checking storage...');
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('screenshots');
        const screenshots = result.screenshots || [];
        
        this.log(`📊 Found ${screenshots.length} screenshots in storage`);
        
        if (screenshots.length > 0) {
          this.log('Screenshots data:', screenshots.map(s => ({
            id: s.id,
            title: s.title ? s.title.substring(0, 50) + '...' : 'No title',
            timestamp: s.timestamp,
            hasImageData: !!s.imageData,
            imageDataSize: s.imageData ? Math.round(s.imageData.length / 1024) + ' KB' : 'N/A',
            annotations: s.annotations ? s.annotations.length : 0,
            hasOriginalCapture: !!(s.originalCaptureWidth && s.originalCaptureHeight),
            coordinateSystem: s.originalCaptureWidth ? 'NEW_SYSTEM' : 'OLD_SYSTEM'
          })));
          
          // Check if screenshots have required properties
          screenshots.forEach((screenshot, index) => {
            const required = ['id', 'imageData', 'title', 'timestamp'];
            const missing = required.filter(prop => !screenshot[prop]);
            
            if (missing.length > 0) {
              this.error(`Screenshot ${index} missing properties:`, missing);
            } else {
              this.log(`✅ Screenshot ${index} has all required properties`);
            }
            
            // Check coordinate system
            if (screenshot.originalCaptureWidth && screenshot.originalCaptureHeight) {
              this.log(`✅ Screenshot ${index} uses NEW coordinate system (${screenshot.originalCaptureWidth}x${screenshot.originalCaptureHeight})`);
            } else {
              this.error(`⚠️ Screenshot ${index} uses OLD coordinate system - may have coordinate issues`);
            }
          });
          
        } else {
          this.log('ℹ️ No screenshots found in storage');
        }
        
        // Check storage quota
        if (chrome.storage.local.getBytesInUse) {
          const bytesInUse = await chrome.storage.local.getBytesInUse();
          const quota = chrome.storage.local.QUOTA_BYTES || 10485760;
          const usagePercent = Math.round((bytesInUse / quota) * 100);
          
          this.log(`💾 Storage usage: ${Math.round(bytesInUse/1024)} KB / ${Math.round(quota/1024)} KB (${usagePercent}%)`);
          
          if (usagePercent > 90) {
            this.error('⚠️ Storage quota nearly full - may cause save issues');
          }
        }
        
      } else {
        this.error('❌ Chrome storage not available for testing');
      }
      
    } catch (error) {
      this.error('Storage check failed:', error);
    }
  }
  
  async simulateScreenshotCapture() {
    this.log('🧪 Simulating screenshot capture...');
    
    try {
      // Create a test screenshot object with NEW coordinate system
      const testScreenshot = {
        id: Date.now().toString(),
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 transparent PNG
        originalCaptureWidth: 1920,  // NEW coordinate system
        originalCaptureHeight: 1080, // NEW coordinate system  
        storageWidth: 1400,          // Compressed dimensions
        storageHeight: 900,          // Compressed dimensions
        displayWidth: 1920,          // Same as original for coordinate reference
        displayHeight: 1080,         // Same as original for coordinate reference
        url: 'test://debug-simulation.com',
        title: 'Debug Test Screenshot - ' + new Date().toLocaleTimeString(),
        timestamp: new Date().toISOString(),
        captureDate: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        }),
        captureTime: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
        }),
        captureTimestamp: Date.now(),
        annotations: []
      };
      
      this.log('Test screenshot object:', testScreenshot);
      
      // Save to storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const existing = await chrome.storage.local.get('screenshots');
        const screenshots = existing.screenshots || [];
        screenshots.push(testScreenshot);
        await chrome.storage.local.set({ screenshots: screenshots });
        
        this.log('✅ Test screenshot saved to storage');
        
        // Try to trigger UI update if ScreenshotAnnotator exists
        if (window.screenshotAnnotator && typeof window.screenshotAnnotator.loadScreenshots === 'function') {
          await window.screenshotAnnotator.loadScreenshots();
          window.screenshotAnnotator.updateUI();
          this.log('✅ Triggered loadScreenshots and UI update');
        } else {
          this.error('❌ ScreenshotAnnotator instance not found or methods missing');
          this.log('Available on window:', Object.keys(window).filter(key => key.includes('screenshot')));
        }
        
      } else {
        this.error('❌ Cannot simulate - Chrome storage not available');
      }
      
    } catch (error) {
      this.error('Simulation failed:', error);
    }
  }
  
  diagnoseUIUpdate() {
    this.log('🔍 Diagnosing UI update issues...');
    
    // Check if screenshotAnnotator exists
    if (window.screenshotAnnotator) {
      this.log('✅ ScreenshotAnnotator instance found');
      this.log('Instance properties:', {
        screenshotsLength: window.screenshotAnnotator.screenshots ? window.screenshotAnnotator.screenshots.length : 'undefined',
        selectedScreenshot: !!window.screenshotAnnotator.selectedScreenshot,
        memoryUsage: window.screenshotAnnotator.memoryUsage
      });
    } else {
      this.error('❌ ScreenshotAnnotator instance not found on window');
    }
    
    // Check if screenshotGrid element exists and inspect its content
    const listElement = document.getElementById('screenshotGrid');
    if (listElement) {
      this.log('✅ screenshotGrid element found');
      this.log('Current innerHTML length:', listElement.innerHTML.length);
      this.log('Current innerHTML preview:', listElement.innerHTML.substring(0, 300) + '...');
      
      // Check for empty state
      if (listElement.innerHTML.includes('empty-state')) {
        this.log('ℹ️ UI showing empty state - no screenshots rendered');
      }
      
      // Check for screenshot items
      const screenshotItems = listElement.querySelectorAll('.screenshot-item');
      this.log(`Found ${screenshotItems.length} screenshot items in DOM`);
      
      if (screenshotItems.length > 0) {
        screenshotItems.forEach((item, index) => {
          const img = item.querySelector('img');
          const title = item.querySelector('.screenshot-title');
          this.log(`Screenshot item ${index}:`, {
            hasImage: !!img,
            imageSource: img ? img.src.substring(0, 50) + '...' : 'none',
            hasTitle: !!title,
            titleText: title ? title.textContent : 'none'
          });
        });
      }
      
    } else {
      this.error('❌ screenshotGrid element not found');
    }
    
    // Check memory usage display
    const memoryElement = document.getElementById('memoryUsage');
    const countElement = document.getElementById('screenshotCount');
    
    if (memoryElement) {
      this.log('Memory usage display:', memoryElement.textContent);
    } else {
      this.error('❌ memoryUsage element not found');
    }
    
    if (countElement) {
      this.log('Screenshot count display:', countElement.textContent);
    } else {
      this.error('❌ screenshotCount element not found');
    }
  }
  
  async runFullDiagnostic() {
    this.log('🔍 === RUNNING FULL DIAGNOSTIC ===');
    
    // Wait a bit for any pending operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.checkEnvironment();
    await this.checkStorage();
    this.checkDOM();
    this.diagnoseUIUpdate();
    
    this.log('🔍 === DIAGNOSTIC COMPLETE ===');
  }
}

// Auto-start debugging when script loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.popupDebugger = new PopupDebugger();
    
    // Add debugging methods to window for manual testing
    window.debugExtension = {
      checkStorage: () => window.popupDebugger.checkStorage(),
      simulateCapture: () => window.popupDebugger.simulateScreenshotCapture(),
      diagnoseUI: () => window.popupDebugger.diagnoseUIUpdate(),
      runFullDiagnostic: () => window.popupDebugger.runFullDiagnostic(),
      clearStorage: async () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.clear();
          console.log('🧹 Storage cleared');
          if (window.screenshotAnnotator) {
            await window.screenshotAnnotator.loadScreenshots();
            window.screenshotAnnotator.updateUI();
          }
        }
      },
      forceUIUpdate: async () => {
        if (window.screenshotAnnotator) {
          await window.screenshotAnnotator.loadScreenshots();
          window.screenshotAnnotator.updateUI();
          console.log('🔄 Forced UI update');
        } else {
          console.error('❌ ScreenshotAnnotator not available');
        }
      }
    };
    
    console.log('🧪 Debug methods available:');
    console.log('  - window.debugExtension.checkStorage()');
    console.log('  - window.debugExtension.simulateCapture()');
    console.log('  - window.debugExtension.diagnoseUI()');
    console.log('  - window.debugExtension.runFullDiagnostic()');
    console.log('  - window.debugExtension.clearStorage()');
    console.log('  - window.debugExtension.forceUIUpdate()');
  });
} else {
  console.log('🔍 Popup debugger loaded (DOM not ready)');
}