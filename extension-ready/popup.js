class ScreenshotAnnotator {
  constructor() {
    this.screenshots = [];
    this.selectedScreenshot = null;
    this.memoryUsage = 0;
    this.isInitialized = false;
    
    // 📁 Initialize temporary storage
    this.tempStorage = null;
    this.initTempStorage();
    
    this.init();
  }
  
  async initTempStorage() {
    try {
      console.log('📁 Initializing temporary storage system...');
      
      // Wait longer for temp storage to be available and initialized
      const maxWait = 10000; // 10 seconds
      const startTime = Date.now();
      
      while ((!window.tempStorage || !window.tempStorage.db) && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (window.tempStorage && window.tempStorage.db) {
        this.tempStorage = window.tempStorage;
        console.log('✅ Temporary storage system initialized');
        
        // Test the connection
        try {
          const stats = await this.tempStorage.getStorageStats();
          console.log('📊 Temporary storage ready:', stats);
        } catch (testError) {
          console.warn('⚠️ Temporary storage test failed:', testError);
          this.tempStorage = null;
        }
      } else {
        console.warn('⚠️ Temporary storage not available, using Chrome storage only');
        this.tempStorage = null;
      }
    } catch (error) {
      console.error('❌ Failed to initialize temporary storage:', error);
      this.tempStorage = null;
    }
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
      console.log('📂 Loading screenshots with temporary storage support...');
      
      const result = await chrome.storage.local.get('screenshots');
      this.screenshots = result.screenshots || [];
      
      console.log(`📂 Loaded ${this.screenshots.length} screenshot records from Chrome storage`);
      
      // 📁 Restore images from temporary storage if needed
      if (this.tempStorage && this.screenshots.length > 0) {
        console.log('📁 Checking for images in temporary storage...');
        
        for (let i = 0; i < this.screenshots.length; i++) {
          const screenshot = this.screenshots[i];
          
          if (screenshot.isInTempStorage && screenshot.tempImageId) {
            console.log(`📁 Restoring image for screenshot ${screenshot.id} from temporary storage...`);
            
            try {
              const restoredScreenshot = await this.tempStorage.restoreFullScreenshot(screenshot);
              this.screenshots[i] = restoredScreenshot;
              
              if (restoredScreenshot.imageData) {
                console.log(`✅ Restored image for screenshot ${screenshot.id}`);
              } else {
                console.warn(`⚠️ Failed to restore image for screenshot ${screenshot.id}`);
              }
            } catch (error) {
              console.error(`❌ Error restoring screenshot ${screenshot.id}:`, error);
            }
          }
        }
        
        console.log('📁 Temporary storage restoration completed');
      }
      
      this.calculateMemoryUsage();
      this.updateUI();
      
      // Initialize annotation mode after loading
      if (this.screenshots.length > 0 && !this.selectedScreenshot) {
        this.selectedScreenshot = this.screenshots[0];
        const annotateBtn = document.getElementById('annotateBtn');
        if (annotateBtn) {
          annotateBtn.disabled = false;
        }
      }
      
      console.log(`✅ Screenshot loading completed: ${this.screenshots.length} screenshots available`);
      
    } catch (error) {
      console.error('❌ Error loading screenshots:', error);
      this.screenshots = [];
      this.updateUI();
    }
  }
  
  async saveScreenshots() {
    try {
      console.log('💾 Saving screenshots with temporary storage system...');
      
      // 📁 Use temporary storage if available
      if (this.tempStorage) {
        console.log('📁 Using temporary storage for large images...');
        
        const lightweightScreenshots = [];
        
        for (let i = 0; i < this.screenshots.length; i++) {
          const screenshot = this.screenshots[i];
          
          if (screenshot.imageData && !screenshot.isInTempStorage) {
            // Store large image data in temporary storage
            const tempId = `screenshot_${screenshot.id}_${Date.now()}`;
            const storeResult = await this.tempStorage.storeImage(tempId, screenshot.imageData, {
              screenshotId: screenshot.id,
              title: screenshot.title,
              timestamp: screenshot.timestamp
            });
            
            if (storeResult.stored) {
              // Create lightweight version for Chrome storage
              const lightweightScreenshot = this.tempStorage.createLightweightScreenshot(screenshot, tempId);
              lightweightScreenshots.push(lightweightScreenshot);
              
              console.log(`📁 Moved screenshot ${screenshot.id} to temporary storage (saved ${this.formatMemorySize(storeResult.size)})`);
            } else {
              // Fallback to Chrome storage if temp storage fails
              console.warn(`⚠️ Temp storage failed for ${screenshot.id}, using Chrome storage`);
              lightweightScreenshots.push(screenshot);
            }
          } else {
            // Already in temp storage or no image data
            lightweightScreenshots.push(screenshot);
          }
        }
        
        // Save lightweight versions to Chrome storage
        await chrome.storage.local.set({ screenshots: lightweightScreenshots });
        console.log('✅ Saved lightweight screenshots to Chrome storage');
        
        // Update local array
        this.screenshots = lightweightScreenshots;
        
      } else {
        // Fallback to original Chrome storage method
        console.log('⚠️ Using Chrome storage only (temp storage not available)');
        await chrome.storage.local.set({ screenshots: this.screenshots });
      }
      
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
        console.log('🚨 QUOTA EXCEEDED - Using temporary storage for relief...');
        
        if (this.tempStorage) {
          // Emergency: Move all images to temporary storage
          await this.moveAllImagesToTempStorage();
        } else {
          // Fallback to aggressive cleanup
          await this.emergencyStorageCleanup();
        }
        
        // Try saving again
        try {
          await chrome.storage.local.set({ screenshots: this.screenshots });
          this.showStatus('Screenshots saved using temporary storage', 'success');
        } catch (retryError) {
          console.error('❌ Even temporary storage relief failed:', retryError);
          this.showStatus('Storage full. Please clear screenshots manually.', 'error');
        }
      } else {
        this.showStatus('Error saving screenshots', 'error');
      }
    }
  }
  
  // 📁 Emergency: Move all images to temporary storage
  async moveAllImagesToTempStorage() {
    if (!this.tempStorage) {
      console.warn('⚠️ Temporary storage not available for emergency move');
      return;
    }
    
    try {
      console.log('🚨 Emergency: Moving all images to temporary storage...');
      
      for (let i = 0; i < this.screenshots.length; i++) {
        const screenshot = this.screenshots[i];
        
        if (screenshot.imageData && !screenshot.isInTempStorage) {
          const tempId = `emergency_${screenshot.id}_${Date.now()}`;
          const storeResult = await this.tempStorage.storeImage(tempId, screenshot.imageData);
          
          if (storeResult.stored) {
            // Replace with lightweight version
            this.screenshots[i] = this.tempStorage.createLightweightScreenshot(screenshot, tempId);
            console.log(`📁 Emergency moved screenshot ${screenshot.id} to temp storage`);
          }
        }
      }
      
      console.log('✅ Emergency move to temporary storage completed');
      
    } catch (error) {
      console.error('❌ Emergency move to temporary storage failed:', error);
    }
  }

  // 📁 Restore image for a specific element
  async restoreImageForElement(screenshotId, imgElement) {
    try {
      const screenshot = this.screenshots.find(s => s.id === screenshotId);
      if (!screenshot || !screenshot.isInTempStorage || !this.tempStorage) {
        return;
      }
      
      console.log('📁 Restoring image for element:', screenshotId);
      
      const restoredScreenshot = await this.tempStorage.restoreFullScreenshot(screenshot);
      if (restoredScreenshot && restoredScreenshot.imageData) {
        imgElement.src = restoredScreenshot.imageData;
        
        // Update the screenshot in our array
        const index = this.screenshots.findIndex(s => s.id === screenshotId);
        if (index !== -1) {
          this.screenshots[index] = restoredScreenshot;
        }
        
        console.log('✅ Image restored for element:', screenshotId);
      }
    } catch (error) {
      console.error('❌ Failed to restore image for element:', error);
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

  // 🧹 MANUAL STORAGE CLEAR METHOD - Call from console
  async manualStorageClear() {
    try {
      console.log('🧹 MANUAL STORAGE CLEAR - Removing all data...');
      
      // Clear all screenshots
      this.screenshots = [];
      this.selectedScreenshot = null;
      this.memoryUsage = 0;
      
      // Clear all storage
      await chrome.storage.local.clear();
      console.log('✅ All storage cleared');
      
      // Update UI
      this.updateUI();
      this.showStatus('All storage cleared - ready for PDF export', 'success');
      
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
  }

  // 🚨 EXTREME EMERGENCY - Only when storage is completely full
  async extremeEmergencyCleanup() {
    try {
      console.log('🚨 EXTREME EMERGENCY CLEANUP - Clearing everything...');
      
      // Keep only the 1 most recent screenshot
      this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const removedCount = this.screenshots.length - 1;
      this.screenshots = this.screenshots.slice(0, 1);
      
      console.log(`🚨 Extreme cleanup: Removed ${removedCount} screenshots, kept ${this.screenshots.length}`);
      
      // Clear ALL storage except screenshots
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      for (const key in storage) {
        if (key !== 'screenshots') {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🚨 Extreme: Cleared ${keysToRemove.length} storage items`);
      }
      
      // Update selected screenshot
      this.selectedScreenshot = this.screenshots[0] || null;
      this.memoryUsage = 0;
      
    } catch (error) {
      console.error('Error during extreme cleanup:', error);
    }
  }

  async emergencyStorageCleanup() {
    try {
      console.log('🚨 EMERGENCY STORAGE CLEANUP...');
      
      // Keep only the 3 most recent screenshots (less aggressive)
      this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const removedCount = Math.max(0, this.screenshots.length - 3);
      this.screenshots = this.screenshots.slice(0, 3);
      
      console.log(`🚨 Emergency cleanup: Removed ${removedCount} screenshots, kept ${this.screenshots.length}`);
      
      // Clear temporary data from storage
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      for (const key in storage) {
        if (key.startsWith('pdf_export_') || key.startsWith('temp_')) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🚨 Emergency: Cleared ${keysToRemove.length} temporary storage items`);
      }
      
      // Update selected screenshot if it was removed
      if (this.selectedScreenshot && !this.screenshots.find(s => s.id === this.selectedScreenshot.id)) {
        this.selectedScreenshot = this.screenshots[0] || null;
      }
      
      // Force memory cleanup
      this.memoryUsage = 0;
      this.calculateMemoryUsage();
      
      console.log('🚨 Emergency cleanup completed - kept 3 most recent screenshots');
      
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
  
  // REMOVED: compressImageData method - we use 100% original quality now

  // 🎯 COORDINATE CORRECTION SYSTEM
  getCoordinateCorrection(canvasWidth, canvasHeight) {
    // User reports 0.38 inch offset (lower and right)
    // This method calculates dynamic correction based on image size
    
    const standardDPI = 96; // Standard web DPI
    const targetOffsetInches = 0.38;
    
    // Calculate image dimensions in inches
    const imageWidthInches = canvasWidth / standardDPI;
    const imageHeightInches = canvasHeight / standardDPI;
    
    // Calculate offset as percentage of image size
    const offsetPercentageX = targetOffsetInches / imageWidthInches;
    const offsetPercentageY = targetOffsetInches / imageHeightInches;
    
    // Convert back to pixels with negative values (to move up and left)
    const offsetX = -Math.round(canvasWidth * offsetPercentageX);
    const offsetY = -Math.round(canvasHeight * offsetPercentageY);
    
    console.log('🎯 Coordinate correction calculated:', {
      imageSize: `${canvasWidth}x${canvasHeight}px`,
      imageSizeInches: `${imageWidthInches.toFixed(2)}" x ${imageHeightInches.toFixed(2)}"`,
      offsetPercentage: `${(offsetPercentageX*100).toFixed(2)}% x ${(offsetPercentageY*100).toFixed(2)}%`,
      offsetPixels: `${offsetX}px, ${offsetY}px`,
      targetOffset: `${targetOffsetInches}" correction`
    });
    
    return { x: offsetX, y: offsetY };
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
          console.log('🖼️ PDF Image Analysis for Coordinate Debugging:');
          console.log('  - Canvas dimensions:', `${canvas.width}x${canvas.height}`);
          console.log('  - Img natural dimensions:', `${img.naturalWidth}x${img.naturalHeight}`);
          console.log('  - Screenshot display dimensions:', `${screenshot.displayWidth}x${screenshot.displayHeight}`);
          console.log('  - Screenshot storage dimensions:', `${screenshot.storageWidth}x${screenshot.storageHeight}`);
          
          // FIXED: Use natural image dimensions as the authoritative source
          // This eliminates coordinate mismatches
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          console.log('  - Using natural dimensions as coordinate reference:', `${naturalWidth}x${naturalHeight}`);
          
          // Check if there's any size mismatch
          const dimensionMismatch = 
            naturalWidth !== screenshot.displayWidth || 
            naturalHeight !== screenshot.displayHeight;
          
          console.log('  - Dimension mismatch detected:', dimensionMismatch);
          
          if (dimensionMismatch) {
            console.warn('⚠️ DIMENSION MISMATCH: Using natural dimensions to fix coordinate offset');
            console.warn('  Expected:', `${screenshot.displayWidth}x${screenshot.displayHeight}`);
            console.warn('  Natural:', `${naturalWidth}x${naturalHeight}`);
          }
          
          // Use natural image dimensions for canvas
          canvas.width = naturalWidth;
          canvas.height = naturalHeight;
          
          // Draw the original image at natural size
          ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
          
          // SIMPLIFIED: Use 1:1 scaling (no scaling needed since we're using original dimensions)
          const scaleX = 1.0;
          const scaleY = 1.0;
          
          console.log('📏 PDF rendering with 1:1 scale (100% original):', { 
            scaleX, 
            scaleY,
            imageSize: `${img.width}x${img.height}`,
            coordinateReference: 'DIRECT_ORIGINAL_COORDINATES'
          });
          
          // Get coordinate correction for this image (using natural dimensions)
          const correction = this.getCoordinateCorrection(naturalWidth, naturalHeight);
          
          // Render each annotation with coordinate offset correction
          screenshot.annotations.forEach((annotation, index) => {
            console.log(`🎯 Annotation ${index + 1} - Using natural dimensions for precise coordinates`);
            
            // COORDINATES ARE ALREADY IN NATURAL/STORAGE SPACE - NO ADDITIONAL SCALING NEEDED
            // Just apply the 0.38 inch correction
            const correctedX = annotation.x + correction.x;
            const correctedY = annotation.y + correction.y;
            
            console.log(`📍 Coordinate correction applied (natural dimensions):`, {
              stored: `(${annotation.x}, ${annotation.y})`,
              corrected: `(${correctedX}, ${correctedY})`,
              correction: `(${correction.x}, ${correction.y})`,
              coordinateSpace: 'NATURAL_IMAGE_DIMENSIONS'
            });
            
            // Use corrected coordinates directly
            const x = correctedX;
            const y = correctedY;
            
            // Handle text positioning with correction
            let textX, textY;
            if (annotation.textX && annotation.textY) {
              textX = annotation.textX + correction.x;
              textY = annotation.textY + correction.y;
            } else {
              textX = x + 60;
              textY = y - 30;
            }
            
            console.log(`📍 Final PDF coordinates:`, { 
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
      console.log('📊 Export starting with screenshots:', this.screenshots.length);
      this.showStatus('Generating PDF journal with annotations...', 'info');
      
      // 🧹 MINIMAL CLEANUP: Only clear temporary data, keep all screenshots
      console.log('🧹 Pre-export cleanup of temporary data only...');
      
      // Clear only temporary export data, not screenshots
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
      
      // Force garbage collection by clearing references
      if (window.gc) {
        window.gc();
      }
      
      // Create annotated versions of ALL screenshots for PDF
      const annotatedScreenshots = [];
      console.log(`🎨 Processing ${this.screenshots.length} screenshots for PDF...`);
      
      for (let i = 0; i < this.screenshots.length; i++) {
        const screenshot = this.screenshots[i];
        console.log(`🎨 Processing screenshot ${i + 1}/${this.screenshots.length}: ${screenshot.title}`);
        
        try {
          // Create annotated version without modifying original
          const annotatedImageData = await this.createAnnotatedImageForPDF(screenshot);
          
          annotatedScreenshots.push({
            ...screenshot,
            imageData: annotatedImageData, // Use annotated version
            originalImageData: screenshot.imageData // Keep original as backup
          });
          
          console.log(`✅ Successfully processed screenshot ${i + 1}: ${screenshot.title}`);
          
          // Show progress
          this.showStatus(`Processing images for PDF: ${i + 1}/${this.screenshots.length}`, 'info');
          
        } catch (imageError) {
          console.error(`❌ Error processing screenshot ${i + 1}:`, imageError);
          
          // Add screenshot even if annotation processing fails
          annotatedScreenshots.push({
            ...screenshot,
            imageData: screenshot.imageData, // Use original if annotation fails
            originalImageData: screenshot.imageData
          });
          
          console.log(`⚠️ Added screenshot ${i + 1} without annotations due to error`);
        }
      }
      
      console.log('📊 Final export data summary:', {
        totalScreenshotsProcessed: annotatedScreenshots.length,
        originalScreenshotCount: this.screenshots.length,
        allScreenshotsIncluded: annotatedScreenshots.length === this.screenshots.length
      });
      
      if (annotatedScreenshots.length === 0) {
        console.error('❌ No screenshots were successfully processed for PDF');
        this.showStatus('Failed to process any screenshots for PDF export', 'error');
        return;
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
                     class="screenshot-preview-img"
                     style="width: 100%; max-width: 360px; height: auto; border-radius: 4px; margin-bottom: 8px;"
                     data-screenshot-id="${screenshot.id}">
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
      
      // Add click handlers and image error handlers
      const screenshotItems = listElement.querySelectorAll('.screenshot-item');
      const previewImages = listElement.querySelectorAll('.screenshot-preview-img');
      
      console.log('📋 Adding click handlers to', screenshotItems.length, 'items');
      console.log('📋 Adding error handlers to', previewImages.length, 'images');
      
      // Add image error handlers (CSP compliant)
      previewImages.forEach((img) => {
        img.addEventListener('error', (e) => {
          console.error('Failed to load image:', e.target.src.substring(0, 50) + '...');
          const screenshotId = e.target.dataset.screenshotId;
          console.log('📁 Attempting to restore image from temporary storage for:', screenshotId);
          
          // Try to restore from temporary storage
          this.restoreImageForElement(screenshotId, e.target);
        });
      });
      
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
  const annotator = new ScreenshotAnnotator();
  window.screenshotAnnotator = annotator;
  
  // 🧹 EXPOSE MANUAL CLEAR METHODS FOR CONSOLE ACCESS
  window.clearExtensionStorage = () => {
    annotator.manualStorageClear();
  };
  
  window.extremeCleanup = () => {
    annotator.extremeEmergencyCleanup();
  };
  
  console.log('💡 Storage management commands:');
  console.log('  clearExtensionStorage() - Clear all data');
  console.log('  extremeCleanup() - Keep only 1 screenshot');
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