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
    
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.exportPdfJournal();
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
      
      // Check storage quota before saving
      const storageInfo = await this.checkStorageQuota();
      console.log('📊 Storage info:', storageInfo);
      
      if (storageInfo.quotaExceeded) {
        console.log('⚠️ Storage quota exceeded, cleaning up old screenshots...');
        await this.cleanupOldScreenshots();
      }
      
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
      
      if (error.message && error.message.includes('quota')) {
        console.log('🧹 Quota exceeded, attempting cleanup...');
        await this.cleanupOldScreenshots();
        
        // Try saving again with fewer screenshots
        try {
          await chrome.storage.local.set({ screenshots: this.screenshots });
          this.showStatus('Screenshots saved after cleanup', 'success');
        } catch (retryError) {
          this.showStatus('Storage quota exceeded. Please clear some screenshots.', 'error');
        }
      } else {
        this.showStatus('Error saving screenshots', 'error');
      }
    }
  }
  
  async checkStorageQuota() {
    try {
      if (chrome.storage.local.getBytesInUse) {
        const bytesInUse = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
        
        return {
          bytesInUse,
          quota,
          available: quota - bytesInUse,
          quotaExceeded: bytesInUse > quota * 0.9, // Warn at 90%
          usagePercent: Math.round((bytesInUse / quota) * 100)
        };
      }
    } catch (error) {
      console.error('Error checking storage quota:', error);
    }
    
    return { quotaExceeded: false, usagePercent: 0 };
  }
  
  async cleanupOldScreenshots() {
    try {
      console.log('🧹 Cleaning up old screenshots...');
      
      if (this.screenshots.length <= 5) {
        console.log('ℹ️ Only 5 or fewer screenshots, no cleanup needed');
        return;
      }
      
      // Sort by timestamp and keep only the most recent 10
      this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const removedCount = this.screenshots.length - 10;
      this.screenshots = this.screenshots.slice(0, 10);
      
      console.log(`✅ Removed ${removedCount} old screenshots, kept ${this.screenshots.length} recent ones`);
      
      // Update selected screenshot if it was removed
      if (this.selectedScreenshot && !this.screenshots.find(s => s.id === this.selectedScreenshot.id)) {
        this.selectedScreenshot = this.screenshots[0] || null;
      }
      
    } catch (error) {
      console.error('Error during cleanup:', error);
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
  
  async compressImageData(imageData, quality = 0.85) {
    try {
      console.log('🗜️ Optimizing image data...');
      console.log('📊 Original size:', this.formatMemorySize(imageData.length));
      
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Less aggressive compression - maintain better quality
          const maxWidth = 1600;  // Increased from 1200
          const maxHeight = 1200; // Increased from 800
          
          let { width, height } = img;
          
          // Only resize if significantly larger
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw with better quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Higher quality compression
          const optimizedData = canvas.toDataURL('image/jpeg', quality);
          
          console.log('✅ Optimized size:', this.formatMemorySize(optimizedData.length));
          console.log('📉 Size reduction:', Math.round((1 - optimizedData.length / imageData.length) * 100) + '%');
          
          resolve(optimizedData);
        };
        
        img.src = imageData;
      });
      
    } catch (error) {
      console.error('❌ Image optimization failed:', error);
      console.log('⚠️ Using original image data');
      return imageData; // Fallback to original
    }
  }

  async createAnnotatedImageForPDF(screenshot) {
    try {
      console.log('🎨 Creating annotated image for PDF...');
      
      if (!screenshot.annotations || screenshot.annotations.length === 0) {
        console.log('ℹ️ No annotations to render');
        return screenshot.imageData;
      }

      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Use original image dimensions for PDF (high quality)
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the original image
          ctx.drawImage(img, 0, 0);
          
          // Configure text rendering
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = 'bold 16px Arial, sans-serif';
          
          // Render each annotation
          screenshot.annotations.forEach((annotation, index) => {
            const x = annotation.x * (img.width / screenshot.displayWidth);
            const y = annotation.y * (img.height / screenshot.displayHeight);
            const textX = (annotation.textX || annotation.x + 60) * (img.width / screenshot.displayWidth);
            const textY = (annotation.textY || annotation.y - 30) * (img.height / screenshot.displayHeight);
            
            // Draw pinpoint circle
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw number badge
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((index + 1).toString(), x, y);
            
            // Draw connecting line
            const distance = Math.sqrt((textX - x) ** 2 + (textY - y) ** 2);
            if (distance > 30) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(textX, textY);
              ctx.strokeStyle = '#ff4444';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw text background
            ctx.font = 'bold 14px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const textMetrics = ctx.measureText(annotation.text);
            const textWidth = textMetrics.width + 16;
            const textHeight = 24;
            
            // Background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(textX - 8, textY - 4, textWidth, textHeight);
            
            // Border
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - 8, textY - 4, textWidth, textHeight);
            
            // Text
            ctx.fillStyle = '#333333';
            ctx.fillText(annotation.text, textX, textY);
          });
          
          // Return high-quality annotated image
          const annotatedImage = canvas.toDataURL('image/png', 1.0);
          console.log('✅ Annotated image created for PDF');
          resolve(annotatedImage);
        };
        
        img.src = screenshot.imageData;
      });
      
    } catch (error) {
      console.error('❌ Error creating annotated image:', error);
      return screenshot.imageData; // Fallback to original
    }
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
        // Create screenshot object with detailed timestamp
        const now = new Date();
        
        // 🔧 COMPRESS IMAGE DATA TO PREVENT QUOTA EXCEEDED
        const compressedImageData = await this.compressImageData(response.imageData);
        
        const screenshot = {
          id: Date.now().toString(),
          imageData: compressedImageData,
          originalWidth: 1920,
          originalHeight: 1080,
          displayWidth: Math.round(1920 * 0.9), // 90% sizing
          displayHeight: Math.round(1080 * 0.9),
          url: tab.url,
          title: tab.title,
          timestamp: now.toISOString(),
          // Enhanced timestamp information for PDF journal
          captureDate: now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          captureTime: now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
          }),
          captureTimestamp: now.getTime(),
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
      
      // 🚀 NEW UNIVERSAL APPROACH - NO RESTRICTIONS!
      // Instead of injecting into the current page, we'll open annotation in a new context
      console.log('🌐 Opening universal annotation interface...');
      
      // Create annotation URL with screenshot data
      const annotationUrl = chrome.runtime.getURL('annotation.html') + 
        '?screenshot=' + encodeURIComponent(JSON.stringify(this.selectedScreenshot));
      
      // Open in new window for unrestricted annotation
      chrome.windows.create({
        url: annotationUrl,
        type: 'popup',
        width: Math.min(1200, screen.width * 0.9),
        height: Math.min(800, screen.height * 0.9),
        focused: true
      });
      
      console.log('✅ Universal annotation interface opened');
      this.showStatus('🎯 Annotation window opened - works on ANY page!', 'success');
      
      // Close popup after successful annotation start
      setTimeout(() => {
        window.close();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Annotation error details:', error);
      this.showStatus(`Annotation failed: ${error.message}`, 'error');
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
        document.getElementById('exportPdfBtn').disabled = true;
        
        this.showStatus('All screenshots cleared!', 'success');
        console.log('Screenshots cleared successfully');
        
      } catch (error) {
        console.error('Clear error:', error);
        this.showStatus('Failed to clear screenshots', 'error');
      }
    }
  }
  
  async exportPdfJournal() {
    if (this.screenshots.length === 0) {
      this.showStatus('No screenshots to export', 'info');
      return;
    }
    
    try {
      console.log('🔄 Starting PDF journal export...');
      this.showStatus('Generating PDF journal...', 'info');
      
      // Create PDF export window with all screenshots
      const exportData = {
        screenshots: this.screenshots,
        exportDate: new Date().toISOString(),
        totalScreenshots: this.screenshots.length,
        totalAnnotations: this.screenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0)
      };
      
      console.log('📊 Export data prepared:', {
        screenshots: exportData.screenshots.length,
        totalAnnotations: exportData.totalAnnotations,
        dataSize: JSON.stringify(exportData).length
      });
      
      // Store data in chrome storage temporarily for large datasets
      const exportId = 'pdf_export_' + Date.now();
      await chrome.storage.local.set({ [exportId]: exportData });
      
      const exportUrl = chrome.runtime.getURL('pdf-export.html') + 
        '?exportId=' + encodeURIComponent(exportId);
      
      console.log('🔗 Export URL created:', exportUrl);
      
      // Also create debug URL for troubleshooting
      const debugUrl = chrome.runtime.getURL('debug-export.html') + 
        '?exportId=' + encodeURIComponent(exportId);
      
      console.log('🔍 Debug URL created:', debugUrl);
      
      // Open PDF export in new window
      const windowInfo = await chrome.windows.create({
        url: exportUrl,
        type: 'popup',
        width: 1200,
        height: 800,
        focused: true
      });
      
      console.log('🪟 Export window created:', windowInfo.id);
      
      // If export window fails, offer debug option
      setTimeout(async () => {
        try {
          const window = await chrome.windows.get(windowInfo.id);
          if (!window) {
            // Window was closed or failed to load, open debug page
            chrome.windows.create({
              url: debugUrl,
              type: 'popup',
              width: 800,
              height: 600,
              focused: true
            });
          }
        } catch (error) {
          console.log('ℹ️ Opening debug page due to potential issue');
          chrome.windows.create({
            url: debugUrl,
            type: 'popup',
            width: 800,
            height: 600,
            focused: true
          });
        }
      }, 3000);
      
      this.showStatus('📄 PDF journal export opened in new window', 'success');
      console.log('✅ PDF export window opened successfully');
      
      // Clean up stored data after a delay
      setTimeout(async () => {
        try {
          await chrome.storage.local.remove(exportId);
          console.log('🧹 Cleaned up temporary export data');
        } catch (error) {
          console.warn('⚠️ Failed to clean up export data:', error);
        }
      }, 300000); // 5 minutes
      
    } catch (error) {
      console.error('❌ PDF export error:', error);
      this.showStatus(`Failed to export PDF journal: ${error.message}`, 'error');
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
      
      // Disable PDF export when no screenshots
      const exportBtn = document.getElementById('exportPdfBtn');
      if (exportBtn) {
        exportBtn.disabled = true;
      }
    } else {
      console.log(`📋 Rendering ${this.screenshots.length} screenshots`);
      let html = '';
      this.screenshots.forEach((screenshot, index) => {
        const isSelected = this.selectedScreenshot && this.selectedScreenshot.id === screenshot.id;
        const date = new Date(screenshot.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        console.log(`  📸 Screenshot ${index + 1}: ${screenshot.title} (${date}) - ${screenshot.annotations ? screenshot.annotations.length : 0} annotations`);
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
              <div class="timestamp-info">
                <span class="capture-date">📅 ${screenshot.captureDate || new Date(screenshot.timestamp).toLocaleDateString()}</span>
                <span class="capture-time">🕐 ${screenshot.captureTime || new Date(screenshot.timestamp).toLocaleTimeString()}</span>
              </div>
              <div class="technical-info">
                <span>${screenshot.displayWidth}×${screenshot.displayHeight}</span>
                <span class="annotation-count">${screenshot.annotations ? screenshot.annotations.length : 0} annotations</span>
              </div>
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
      
      // Enable PDF export when screenshots are available
      const exportBtn = document.getElementById('exportPdfBtn');
      if (exportBtn) {
        exportBtn.disabled = false;
      }
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