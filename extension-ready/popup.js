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
      
      // AGGRESSIVE PRE-SAVE CLEANUP
      console.log('🧹 Pre-save cleanup to prevent quota issues...');
      await this.aggressiveStorageCleanup();
      
      // Check storage quota before saving
      const storageInfo = await this.checkStorageQuota();
      console.log('📊 Storage info after cleanup:', storageInfo);
      
      // If still over quota, force more aggressive cleanup
      if (storageInfo.quotaExceeded) {
        console.log('⚠️ Still over quota after cleanup, emergency cleanup...');
        await this.emergencyStorageCleanup();
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
        console.log('🚨 QUOTA EXCEEDED - Emergency cleanup...');
        await this.emergencyStorageCleanup();
        
        // Try saving again with much fewer screenshots
        try {
          await chrome.storage.local.set({ screenshots: this.screenshots });
          this.showStatus('Screenshots saved after emergency cleanup', 'success');
        } catch (retryError) {
          console.error('❌ Even emergency cleanup failed:', retryError);
          this.showStatus('Storage full. Please clear screenshots manually.', 'error');
        }
      } else {
        this.showStatus('Error saving screenshots', 'error');
      }
    }
  }

  async aggressiveStorageCleanup() {
    try {
      console.log('🧹 Aggressive storage cleanup...');
      
      if (this.screenshots.length <= 3) {
        console.log('ℹ️ Only 3 or fewer screenshots, no cleanup needed');
        return;
      }
      
      // Keep only the 5 most recent screenshots
      this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const removedCount = this.screenshots.length - 5;
      this.screenshots = this.screenshots.slice(0, 5);
      
      console.log(`✅ Aggressive cleanup: Removed ${removedCount} screenshots, kept ${this.screenshots.length}`);
      
      // Update selected screenshot if it was removed
      if (this.selectedScreenshot && !this.screenshots.find(s => s.id === this.selectedScreenshot.id)) {
        this.selectedScreenshot = this.screenshots[0] || null;
      }
      
      // Clear any temporary export data
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      for (const key in storage) {
        if (key.startsWith('pdf_export_')) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🧹 Removed ${keysToRemove.length} temporary export files`);
      }
      
    } catch (error) {
      console.error('Error during aggressive cleanup:', error);
    }
  }

  // 🧹 NEW METHOD: Clean up memory from unselected screenshots
  async cleanupUnselectedScreenshots(selectedId) {
    try {
      console.log('🧹 Cleaning up unselected screenshots...');
      
      let cleanedCount = 0;
      const maxUnselectedToKeep = 3; // Keep only 3 unselected screenshots
      
      // Find unselected screenshots (oldest first)
      const unselectedScreenshots = this.screenshots
        .filter(s => s.id !== selectedId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      if (unselectedScreenshots.length > maxUnselectedToKeep) {
        // Remove excess unselected screenshots
        const toRemove = unselectedScreenshots.slice(0, unselectedScreenshots.length - maxUnselectedToKeep);
        
        for (const screenshot of toRemove) {
          console.log(`🧹 Removing unselected screenshot: ${screenshot.title}`);
          
          // Remove from array
          const index = this.screenshots.findIndex(s => s.id === screenshot.id);
          if (index !== -1) {
            this.screenshots.splice(index, 1);
            cleanedCount++;
          }
        }
        
        // Save updated screenshots
        if (cleanedCount > 0) {
          await this.saveScreenshots();
          console.log(`✅ Cleaned up ${cleanedCount} unselected screenshots`);
        }
      }
      
      console.log(`ℹ️ Memory cleanup complete. Kept selected + ${Math.min(maxUnselectedToKeep, unselectedScreenshots.length)} recent unselected screenshots`);
      
    } catch (error) {
      console.error('❌ Error during unselected cleanup:', error);
    }
  }

  async emergencyStorageCleanup() {
    try {
      console.log('🚨 EMERGENCY STORAGE CLEANUP...');
      
      // Keep only the 2 most recent screenshots
      this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const removedCount = this.screenshots.length - 2;
      this.screenshots = this.screenshots.slice(0, 2);
      
      console.log(`🚨 Emergency cleanup: Removed ${removedCount} screenshots, kept ${this.screenshots.length}`);
      
      // Clear ALL other data from storage
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      for (const key in storage) {
        if (key !== 'screenshots') {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🚨 Emergency: Cleared ${keysToRemove.length} storage items`);
      }
      
      // Update selected screenshot
      this.selectedScreenshot = this.screenshots[0] || null;
      
    } catch (error) {
      console.error('Error during emergency cleanup:', error);
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

  async getImageDimensions(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.src = imageData;
    });
  }
  
  async compressImageData(imageData, quality = 1.0) {
    try {
      console.log('🗜️ Processing image (storage-optimized mode)...');
      console.log('📊 Original size:', this.formatMemorySize(imageData.length));
      
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          console.log('🖼️ Original image dimensions:', img.width, 'x', img.height);
          
          // STORAGE-OPTIMIZED: Reduce size while preserving aspect ratio
          let { width, height } = img;
          const originalAspectRatio = width / height;
          
          console.log('📐 Original image:', { width, height, aspectRatio: originalAspectRatio.toFixed(2) });
          
          // Target storage-friendly dimensions - preserve aspect ratio
          const maxWidth = 1400;  // Balanced quality/size
          const maxHeight = 900;  // Balanced quality/size
          
          if (width > maxWidth || height > maxHeight) {
            console.log('📉 Reducing dimensions for storage optimization');
            
            // Calculate scale factors for both dimensions
            const scaleX = maxWidth / width;
            const scaleY = maxHeight / height;
            
            // Use the smaller scale to ensure both dimensions fit within limits
            // This preserves aspect ratio
            const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
            
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            
            const newAspectRatio = width / height;
            console.log('📐 Resized image:', { 
              width, 
              height, 
              aspectRatio: newAspectRatio.toFixed(2),
              aspectRatioPreserved: Math.abs(originalAspectRatio - newAspectRatio) < 0.01
            });
          }
          
          console.log('🎯 Storage-optimized dimensions:', width, 'x', height);
          
          canvas.width = width;
          canvas.height = height;
          
          // Good quality settings (not maximum to save space)
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use JPEG for better compression (75% quality for storage)
          const processedData = canvas.toDataURL('image/jpeg', 0.75);
          
          console.log('✅ Storage-optimized size:', this.formatMemorySize(processedData.length));
          console.log('📊 Size reduction:', Math.round((1 - processedData.length / imageData.length) * 100) + '%');
          
          resolve(processedData);
        };
        
        img.src = imageData;
      });
      
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      console.log('⚠️ Using original image data');
      return imageData; // Fallback to original
    }
  }

  async createAnnotatedImageForPDF(screenshot) {
    try {
      console.log('🎨 Creating annotated image for PDF (100% original quality)...');
      console.log('📊 Screenshot info:', {
        displayWidth: screenshot.displayWidth,
        displayHeight: screenshot.displayHeight,
        annotations: screenshot.annotations?.length || 0
      });
      
      if (!screenshot.annotations || screenshot.annotations.length === 0) {
        console.log('ℹ️ No annotations to render, using original image at 100% quality...');
        // Return original image data unchanged
        return screenshot.imageData;
      }

      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          console.log('🖼️ Original image loaded - dimensions:', img.width, 'x', img.height);
          
          // Use original image dimensions - NO SCALING
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the original image at full quality
          ctx.drawImage(img, 0, 0);
          
          // SIMPLIFIED: Use 1:1 scaling (no scaling needed since we're using original dimensions)
          const scaleX = 1.0;
          const scaleY = 1.0;
          
          console.log('📏 PDF rendering with 1:1 scale (100% original):', { 
            scaleX, 
            scaleY,
            imageSize: `${img.width}x${img.height}`,
            coordinateReference: 'DIRECT_ORIGINAL_COORDINATES'
          });
          
          // Render each annotation with coordinate offset correction
          screenshot.annotations.forEach((annotation, index) => {
            console.log(`🎯 Annotation ${index + 1} - Investigating coordinate offset`);
            
            // COORDINATE OFFSET CORRECTION
            // User reports 0.38 inch offset (lower and right)
            // At typical screen DPI (~96), 0.38 inch ≈ 36 pixels
            // Let's apply a correction factor
            const offsetCorrectionX = -36; // Move left to compensate for rightward shift
            const offsetCorrectionY = -36; // Move up to compensate for downward shift
            
            // Apply correction to coordinates
            const correctedX = annotation.x + offsetCorrectionX;
            const correctedY = annotation.y + offsetCorrectionY;
            
            console.log(`📍 Coordinate correction applied:`, {
              original: `(${annotation.x}, ${annotation.y})`,
              corrected: `(${correctedX}, ${correctedY})`,
              offset: `(${offsetCorrectionX}, ${offsetCorrectionY})`,
              offsetInches: "0.38 inch correction"
            });
            
            // Use corrected coordinates
            const x = correctedX;
            const y = correctedY;
            
            // Handle text positioning with correction
            let textX, textY;
            if (annotation.textX && annotation.textY) {
              textX = annotation.textX + offsetCorrectionX;
              textY = annotation.textY + offsetCorrectionY;
            } else {
              textX = x + 60;
              textY = y - 30;
            }
            
            console.log(`📍 Direct coordinates (1:1):`, { 
              x: Math.round(x), 
              y: Math.round(y), 
              textX: Math.round(textX), 
              textY: Math.round(textY)
            });
            
            // Calculate sizes for original dimensions (reduced by 75%)
            const pinRadius = 4;  // Reduced by 75%: was 15, now ~4
            const lineWidth = 1;  // Reduced: was 4, now 1
            const fontSize = 16;  // Slightly reduced: was 20, now 16
            
            // Draw pinpoint circle (no number badge)
            ctx.beginPath();
            ctx.arc(x, y, pinRadius, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // Draw connecting line
            const distance = Math.sqrt((textX - x) ** 2 + (textY - y) ** 2);
            if (distance > pinRadius * 2) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(textX, textY);
              ctx.strokeStyle = '#ff4444';
              ctx.lineWidth = lineWidth;
              ctx.setLineDash([10, 10]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw text background
            ctx.font = `bold ${Math.round(fontSize)}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const textMetrics = ctx.measureText(annotation.text);
            const textWidth = textMetrics.width + 24;
            const textHeight = fontSize * 1.6;
            
            // Ensure text stays within canvas bounds
            const finalTextX = Math.max(10, Math.min(textX, canvas.width - textWidth - 10));
            const finalTextY = Math.max(10, Math.min(textY, canvas.height - textHeight - 10));
            
            // Background with shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(finalTextX - 8, finalTextY - 4, textWidth, textHeight);
            
            // Main background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(finalTextX - 12, finalTextY - 8, textWidth, textHeight);
            
            // Border
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(finalTextX - 12, finalTextY - 8, textWidth, textHeight);
            
            // Text
            ctx.fillStyle = '#333333';
            ctx.fillText(annotation.text, finalTextX, finalTextY);
          });
          
          // Return original quality annotated image
          const annotatedImage = canvas.toDataURL('image/png', 1.0);
          console.log('✅ Original quality annotated image created (100%)');
          resolve(annotatedImage);
        };
        
        img.src = screenshot.imageData; // Use original image data directly
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
        
        // 🔧 100% ORIGINAL QUALITY - NO COMPRESSION
        const processedImageData = response.imageData; // Keep original image data unchanged
        
        // 🔧 GET ORIGINAL DIMENSIONS (no compression applied)
        const originalDimensions = await this.getImageDimensions(response.imageData);
        console.log('📐 Original capture dimensions (100% quality):', originalDimensions);
        
        // 🔧 SAME DIMENSIONS (no compression applied) 
        const finalDimensions = originalDimensions;
        console.log('📐 Final storage dimensions (100% quality):', finalDimensions);
        
        const screenshot = {
          id: Date.now().toString(),
          imageData: processedImageData, // 100% original quality
          // Store ORIGINAL dimensions as coordinate reference (no compression)
          originalCaptureWidth: originalDimensions.width,   // COORDINATE REFERENCE
          originalCaptureHeight: originalDimensions.height, // COORDINATE REFERENCE
          // Store same dimensions for display/storage info (no compression)
          storageWidth: finalDimensions.width,
          storageHeight: finalDimensions.height,
          // Use ORIGINAL dimensions for annotation coordinate system (no compression)
          displayWidth: originalDimensions.width,   // FOR ANNOTATION SCALING
          displayHeight: originalDimensions.height, // FOR ANNOTATION SCALING
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
        
        console.log('✅ Screenshot object created with 100% ORIGINAL quality:', {
          id: screenshot.id,
          originalCaptureWidth: screenshot.originalCaptureWidth,
          originalCaptureHeight: screenshot.originalCaptureHeight,
          storageWidth: screenshot.storageWidth,
          storageHeight: screenshot.storageHeight, 
          displayWidth: screenshot.displayWidth,    // Same as original capture
          displayHeight: screenshot.displayHeight,  // Same as original capture
          imageDataSize: screenshot.imageData.length,
          title: screenshot.title.substring(0, 50) + '...',
          quality: '100% ORIGINAL - NO COMPRESSION'
        });
        
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
      console.log('🔄 Starting PDF journal export with annotated images...');
      this.showStatus('Generating PDF journal with annotations...', 'info');
      
      // 🧹 CLEAR MEMORY: First, clean up storage before processing
      console.log('🧹 Pre-export storage cleanup...');
      await this.aggressiveStorageCleanup();
      
      // Create annotated versions of all screenshots for PDF
      const annotatedScreenshots = [];
      for (let i = 0; i < this.screenshots.length; i++) {
        const screenshot = this.screenshots[i];
        console.log(`🎨 Processing screenshot ${i + 1}/${this.screenshots.length} for PDF...`);
        
        const annotatedImageData = await this.createAnnotatedImageForPDF(screenshot);
        
        annotatedScreenshots.push({
          ...screenshot,
          imageData: annotatedImageData, // Use annotated version
          originalImageData: screenshot.imageData // Keep original as backup
        });
        
        // Show progress
        this.showStatus(`Processing images for PDF: ${i + 1}/${this.screenshots.length}`, 'info');
        
        // 🧹 CLEAR MEMORY: Clear original image data after processing to free memory
        if (screenshot.imageData && screenshot.imageData !== annotatedImageData) {
          console.log(`🧹 Clearing original image data for screenshot ${i + 1} after processing`);
          screenshot.imageData = null; // Free memory immediately
        }
      }
      
      // Create PDF export window with annotated screenshots
      const exportData = {
        screenshots: annotatedScreenshots,
        exportDate: new Date().toISOString(),
        totalScreenshots: annotatedScreenshots.length,
        totalAnnotations: annotatedScreenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0)
      };
      
      console.log('📊 Export data prepared with annotated images:', {
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
      
      // 🧹 CLEAR MEMORY: Monitor PDF export completion and clean up when done
      this.monitorPdfExportCompletion(exportId, windowInfo.id);
      
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
      
      this.showStatus('📄 PDF journal export opened with annotated images!', 'success');
      console.log('✅ PDF export window opened successfully with annotations');
      
    } catch (error) {
      console.error('❌ PDF export error:', error);
      this.showStatus(`Failed to export PDF journal: ${error.message}`, 'error');
    }
  }

  // 🧹 NEW METHOD: Monitor PDF export completion and clean up memory
  async monitorPdfExportCompletion(exportId, windowId) {
    console.log('👀 Monitoring PDF export completion...');
    
    const checkInterval = setInterval(async () => {
      try {
        // Check if export window still exists
        const window = await chrome.windows.get(windowId);
        
        if (!window) {
          // Window closed - PDF export is done, clean up memory
          console.log('🧹 PDF export completed, cleaning up memory...');
          clearInterval(checkInterval);
          
          // Clean up temporary export data
          try {
            await chrome.storage.local.remove(exportId);
            console.log('🧹 Cleaned up temporary export data');
          } catch (error) {
            console.warn('⚠️ Failed to clean up export data:', error);
          }
          
          // Aggressive memory cleanup after PDF export
          await this.aggressiveStorageCleanup();
          console.log('🧹 Post-export memory cleanup completed');
          
          // Update UI to reflect changes
          this.updateUI();
        }
      } catch (error) {
        // Window doesn't exist anymore, clean up
        console.log('🧹 PDF export window closed, cleaning up...');
        clearInterval(checkInterval);
        
        try {
          await chrome.storage.local.remove(exportId);
          await this.aggressiveStorageCleanup();
          this.updateUI();
        } catch (cleanupError) {
          console.warn('⚠️ Failed cleanup after export:', cleanupError);
        }
      }
    }, 2000); // Check every 2 seconds
    
    // Stop monitoring after 10 minutes max
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('⏰ Stopped monitoring PDF export after 10 minutes');
    }, 600000);
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
      listHtml += `<div style="margin: 2px 0;">📍 ${shortText}</div>`;
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
      // Scale annotation position to thumbnail size (360px max width)
      const thumbnailMaxWidth = 360;
      const scaleX = thumbnailMaxWidth / screenshot.displayWidth;
      const scaleY = scaleX; // Keep aspect ratio
      
      const x = (annotation.x * scaleX) - 6; // -6 to center the 12px indicator
      const y = (annotation.y * scaleY) - 6;
      
      console.log(`🔍 Thumbnail indicator ${index + 1}:`, {
        originalCoords: { x: annotation.x, y: annotation.y },
        thumbnailCoords: { x: Math.round(x + 6), y: Math.round(y + 6) },
        scale: scaleX.toFixed(3)
      });
      
      indicators += `
        <div class="annotation-indicator" 
             style="position: absolute; 
                    left: ${x}px; 
                    top: ${y}px; 
                    width: 8px; 
                    height: 8px; 
                    background: #ff4444; 
                    border: 1px solid white; 
                    border-radius: 50%; 
                    z-index: 10;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);"
             title="${annotation.text}">
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
          
          // 🧹 AUTOMATIC MEMORY CLEARING: When screenshot is selected for journal
          console.log('🧹 Screenshot selected for journal - performing targeted cleanup...');
          this.cleanupUnselectedScreenshots(screenshotId);
          
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