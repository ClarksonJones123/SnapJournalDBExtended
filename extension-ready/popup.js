class ScreenshotAnnotator {
  constructor() {
    this.screenshots = [];
    this.selectedScreenshot = null;
    this.memoryUsage = 0;
    
    this.init();
  }
  
  async init() {
    console.log('Initializing Screenshot Annotator...');
    await this.loadScreenshots();
    this.setupEventListeners();
    this.setupStorageListener();
    this.updateUI();
  }
  
  setupStorageListener() {
    // Listen for storage changes to refresh UI
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.screenshots) {
          console.log('Storage changed, refreshing UI...');
          this.screenshots = changes.screenshots.newValue || [];
          this.calculateMemoryUsage();
          this.updateUI();
        }
      });
      console.log('Storage listener setup complete');
    }
  }
  
  setupEventListeners() {
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureScreenshot();
    });
    
    document.getElementById('annotateBtn').addEventListener('click', () => {
      this.startAnnotation();
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAllScreenshots();
    });
  }
  
  async loadScreenshots() {
    try {
      const result = await chrome.storage.local.get('screenshots');
      this.screenshots = result.screenshots || [];
      console.log('Loaded screenshots:', this.screenshots.length);
      this.calculateMemoryUsage();
    } catch (error) {
      console.error('Error loading screenshots:', error);
      this.showStatus('Error loading screenshots', 'error');
    }
  }
  
  async saveScreenshots() {
    try {
      console.log('💾 Saving screenshots to storage...');
      await chrome.storage.local.set({ screenshots: this.screenshots });
      console.log('✅ Saved screenshots:', this.screenshots.length);
      
      this.calculateMemoryUsage();
      
      // Force UI update after save
      console.log('🔄 Forcing UI update after save...');
      setTimeout(() => {
        this.updateUI();
      }, 50);
      
      // Additional safety net - update again after short delay
      setTimeout(() => {
        console.log('🔄 Safety net UI update...');
        this.updateUI();
      }, 200);
      
    } catch (error) {
      console.error('Error saving screenshots:', error);
      this.showStatus('Error saving screenshots', 'error');
    }
  }
  
  calculateMemoryUsage() {
    this.memoryUsage = 0;
    this.screenshots.forEach(screenshot => {
      if (screenshot.imageData) {
        this.memoryUsage += screenshot.imageData.length * 0.75;
      }
      screenshot.annotations?.forEach(annotation => {
        this.memoryUsage += JSON.stringify(annotation).length;
      });
    });
    console.log('Memory usage calculated:', this.formatMemorySize(this.memoryUsage));
  }
  
  formatMemorySize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
  
  async captureScreenshot() {
    try {
      this.showStatus('Capturing screenshot...', 'info');
      console.log('Starting screenshot capture...');
      
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab.title, tab.url);
      
      // Capture screenshot via background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'captureVisibleTab' 
      });
      
      console.log('Capture response:', response ? 'Success' : 'Failed');
      
      if (response && response.imageData) {
        // Create screenshot object
        const screenshot = {
          id: Date.now().toString(),
          imageData: response.imageData,
          originalWidth: 1920,
          originalHeight: 1080,
          displayWidth: Math.round(1920 * 0.9), // 90% sizing
          displayHeight: Math.round(1080 * 0.9),
          url: tab.url,
          title: tab.title,
          timestamp: new Date().toISOString(),
          annotations: []
        };
        
        console.log('Created screenshot object:', screenshot.id);
        
        this.screenshots.push(screenshot);
        await this.saveScreenshots();
        
        this.showStatus('Screenshot captured! Starting annotation mode...', 'success');
        this.selectedScreenshot = screenshot;
        
        // Enable annotation button
        document.getElementById('annotateBtn').disabled = false;
        
        console.log('Screenshot capture completed successfully');
        
        // 🚀 AUTO-START ANNOTATION MODE - NEW FEATURE
        console.log('🎯 Auto-starting annotation mode...');
        setTimeout(() => {
          this.startAnnotation();
        }, 500); // Small delay to show success message
        
      } else {
        throw new Error(response?.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Capture error:', error);
      this.showStatus(`Failed to capture: ${error.message}`, 'error');
    }
  }
  
  async startAnnotation() {
    console.log('🎯 ANNOTATION START DEBUG');
    console.log('Selected screenshot:', this.selectedScreenshot);
    console.log('Screenshots available:', this.screenshots.length);
    
    if (!this.selectedScreenshot) {
      console.error('❌ No screenshot selected');
      this.showStatus('Please select a screenshot first by clicking on one', 'error');
      return;
    }
    
    try {
      console.log('✅ Starting annotation mode for screenshot:', this.selectedScreenshot.id);
      console.log('📋 Screenshot details:', {
        id: this.selectedScreenshot.id,
        title: this.selectedScreenshot.title,
        hasImageData: !!this.selectedScreenshot.imageData
      });
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('✅ Current tab found:', tab.id, tab.title);
      
      // Check if content script is ready by sending a test message first
      console.log('🔍 Testing content script connection...');
      
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('✅ Content script is responsive');
      } catch (pingError) {
        console.log('⚠️ Content script not responding, attempting injection...');
        
        // Try to inject content script manually
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          
          console.log('✅ Content script injected manually');
          
          // Wait a moment for script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (injectionError) {
          console.error('❌ Failed to inject content script:', injectionError);
          throw new Error('Cannot inject content script. Try refreshing the page and ensure it\'s not a restricted page (chrome://, file://, etc.)');
        }
      }
      
      console.log('📡 Sending annotation message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'startAnnotation',
        screenshot: this.selectedScreenshot
      });
      
      console.log('✅ Content script response:', response);
      this.showStatus('🎯 Ready to annotate! Click anywhere on the image.', 'success');
      
      // Close popup after successful annotation start
      setTimeout(() => {
        window.close();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Annotation error details:', error);
      
      // Provide detailed error messages and solutions
      if (error.message && error.message.includes('Could not establish connection')) {
        this.showStatus('Content script not loaded. Please refresh the page and try again.', 'error');
      } else if (error.message && error.message.includes('The tab was closed')) {
        this.showStatus('Tab was closed during annotation setup', 'error');
      } else if (error.message && error.message.includes('restricted page')) {
        this.showStatus('Cannot annotate this page type. Try a regular website.', 'error');
      } else if (error.message && error.message.includes('inject content script')) {
        this.showStatus('Cannot access page. Refresh and try again.', 'error');
      } else {
        this.showStatus(`Annotation failed: ${error.message}`, 'error');
      }
    }
  }
  
  async clearAllScreenshots() {
    if (this.screenshots.length === 0) {
      this.showStatus('No screenshots to clear', 'info');
      return;
    }
    
    if (confirm(`Delete all ${this.screenshots.length} screenshots? This will free ${this.formatMemorySize(this.memoryUsage)} of memory.`)) {
      try {
        console.log('Clearing all screenshots...');
        this.screenshots = [];
        await this.saveScreenshots();
        this.selectedScreenshot = null;
        
        document.getElementById('annotateBtn').disabled = true;
        
        this.showStatus('All screenshots cleared!', 'success');
        console.log('Screenshots cleared successfully');
        
      } catch (error) {
        console.error('Clear error:', error);
        this.showStatus('Failed to clear screenshots', 'error');
      }
    }
  }
  
  renderAnnotationsList(screenshot) {
    if (!screenshot.annotations || screenshot.annotations.length === 0) {
      return '';
    }
    
    let listHtml = '<div style="margin-top: 8px; font-size: 11px; color: #666;">';
    screenshot.annotations.forEach((annotation, index) => {
      const shortText = annotation.text.length > 25 ? 
        annotation.text.substring(0, 25) + '...' : 
        annotation.text;
      listHtml += `<div style="margin: 2px 0;">📍 ${index + 1}: ${shortText}</div>`;
    });
    listHtml += '</div>';
    
    return listHtml;
  }
  
  renderAnnotationIndicators(screenshot) {
    if (!screenshot.annotations || screenshot.annotations.length === 0) {
      return '';
    }
    
    let indicators = '';
    screenshot.annotations.forEach((annotation, index) => {
      // Scale annotation position to thumbnail size
      const scaleX = 360 / screenshot.displayWidth; // Max width is 360px
      const scaleY = scaleX; // Keep aspect ratio
      
      const x = annotation.x * scaleX - 6; // -6 to center the 12px indicator
      const y = annotation.y * scaleY - 6;
      
      indicators += `
        <div class="annotation-indicator" 
             style="position: absolute; 
                    left: ${x}px; 
                    top: ${y}px; 
                    width: 12px; 
                    height: 12px; 
                    background: #ff4444; 
                    border: 1px solid white; 
                    border-radius: 50%; 
                    font-size: 8px; 
                    color: white; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-weight: bold;
                    z-index: 10;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);"
             title="${annotation.text}">
          ${index + 1}
        </div>`;
    });
    
    return indicators;
  }
  
  updateUI() {
    console.log('=== UPDATEUI DEBUG START ===');
    console.log('Updating UI - Screenshots:', this.screenshots.length);
    console.log('Screenshots data:', this.screenshots.map(s => ({id: s.id, title: s.title})));
    
    // Update memory info
    const memoryElement = document.getElementById('memoryUsage');
    const countElement = document.getElementById('screenshotCount');
    
    if (memoryElement) {
      memoryElement.textContent = this.formatMemorySize(this.memoryUsage);
      console.log('✅ Updated memory usage:', memoryElement.textContent);
    } else {
      console.error('❌ memoryUsage element not found');
    }
    
    if (countElement) {
      countElement.textContent = this.screenshots.length;
      console.log('✅ Updated screenshot count:', countElement.textContent);
    } else {
      console.error('❌ screenshotCount element not found');
    }
    
    // Update screenshots list
    const listElement = document.getElementById('screenshotsList');
    if (!listElement) {
      console.error('❌ screenshotsList element not found - UI cannot update!');
      return;
    }
    
    console.log('📋 Found screenshotsList element');
    
    if (this.screenshots.length === 0) {
      console.log('📋 No screenshots - showing empty state');
      listElement.innerHTML = `
        <div class="empty-state">
          No screenshots yet.<br>Click "Capture Current Page" to get started.
        </div>`;
    } else {
      console.log(`📋 Rendering ${this.screenshots.length} screenshots`);
      let html = '';
      this.screenshots.forEach((screenshot, index) => {
        const isSelected = this.selectedScreenshot && this.selectedScreenshot.id === screenshot.id;
        const date = new Date(screenshot.timestamp).toLocaleString();
        
        console.log(`  📸 Screenshot ${index + 1}: ${screenshot.title} (selected: ${isSelected})`);
        console.log(`  🖼️ Image data: ${screenshot.imageData ? screenshot.imageData.substring(0, 50) + '...' : 'NO IMAGE DATA'}`);
        console.log(`  📐 Dimensions: ${screenshot.displayWidth}x${screenshot.displayHeight}`);
        
        html += `
          <div class="screenshot-item ${isSelected ? 'selected' : ''}" data-id="${screenshot.id}">
            <div class="screenshot-preview">
              <div style="position: relative; display: inline-block;">
                <img src="${screenshot.imageData}" 
                     alt="Screenshot preview" 
                     style="width: 100%; max-width: 360px; height: auto; border-radius: 4px; margin-bottom: 8px;"
                     onerror="console.error('Failed to load image:', this.src.substring(0, 50) + '...')">
                ${this.renderAnnotationIndicators(screenshot)}
              </div>
              ${this.renderAnnotationsList(screenshot)}
            </div>
            <div class="screenshot-title">${screenshot.title}</div>
            <div class="screenshot-details">
              <span>${date}</span>
              <span>${screenshot.displayWidth}×${screenshot.displayHeight}</span>
              <span class="annotation-count">${screenshot.annotations ? screenshot.annotations.length : 0} annotations</span>
            </div>
          </div>`;
      });
      
      console.log('📋 Setting innerHTML with', html.length, 'characters');
      listElement.innerHTML = html;
      
      // Add click handlers
      const screenshotItems = listElement.querySelectorAll('.screenshot-item');
      console.log('📋 Adding click handlers to', screenshotItems.length, 'items');
      
      screenshotItems.forEach((item, index) => {
        item.addEventListener('click', () => {
          const screenshotId = item.dataset.id;
          this.selectedScreenshot = this.screenshots.find(s => s.id === screenshotId);
          console.log('📸 Selected screenshot:', this.selectedScreenshot?.id);
          
          // Enable annotation button
          const annotateBtn = document.getElementById('annotateBtn');
          if (annotateBtn) {
            annotateBtn.disabled = false;
            console.log('✅ Enabled annotation button');
          }
          
          this.updateUI(); // Refresh to show selection
        });
      });
    }
    
    // Force a DOM refresh
    setTimeout(() => {
      const finalCheck = document.getElementById('screenshotsList');
      if (finalCheck) {
        console.log('🔍 Final DOM check - innerHTML length:', finalCheck.innerHTML.length);
        console.log('🔍 Final DOM check - children count:', finalCheck.children.length);
      }
    }, 100);
    
    console.log('✅ UI update completed successfully');
    console.log('=== UPDATEUI DEBUG END ===');
  }
  
  showStatus(message, type) {
    console.log('Status:', type, message);
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 3000);
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  window.screenshotAnnotator = new ScreenshotAnnotator();
});

// Also refresh UI when popup becomes visible (handles popup lifecycle)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.screenshotAnnotator) {
    console.log('Popup became visible, refreshing UI...');
    window.screenshotAnnotator.loadScreenshots().then(() => {
      window.screenshotAnnotator.updateUI();
    });
  }
});

// Handle popup focus (additional safety net)
window.addEventListener('focus', () => {
  if (window.screenshotAnnotator) {
    console.log('Popup received focus, refreshing UI...');
    window.screenshotAnnotator.loadScreenshots().then(() => {
      window.screenshotAnnotator.updateUI();
    });
  }
});