class ScreenshotAnnotator {
  constructor() {
    this.screenshots = [];
    this.selectedScreenshot = null;
    this.memoryUsage = 0;
    this.isInitialized = false;
    
    // Initialize temporary storage
    this.tempStorage = null;
    this.init();
  }
  
  async init() {
    console.log('🚀 Initializing ScreenshotAnnotator...');
    
    try {
      // Initialize temporary storage first
      await this.initTempStorage();
      
      // CRITICAL FIX: Load existing screenshots BEFORE running cleanup
      console.log('📱 Loading existing screenshots BEFORE cleanup...');
      await this.loadScreenshots();
      
      // Only run cleanup AFTER screenshots are loaded
      console.log('🧹 Running automatic storage cleanup AFTER loading screenshots...');
      await this.automaticStorageCleanup();
      
      // Setup event handlers
      this.setupEventListeners();
      this.setupStorageListener();
      
      // Update UI
      this.updateUI();
      
      // Schedule periodic cleanup
      this.schedulePeriodicCleanup();
      
      // Setup storage quota monitoring
      this.setupStorageQuotaMonitoring();
      
      console.log('✅ ScreenshotAnnotator initialized successfully');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ ScreenshotAnnotator initialization failed:', error);
      this.showStatus('Extension initialization failed. Please reload.', 'error');
    }
  }
  
  async initTempStorage() {
    try {
      console.log('📁 Initializing temporary storage system...');
      
      // Wait for temp storage to be available
      const maxWait = 10000;
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
  
  setupStorageListener() {
    try {
      if (chrome && chrome.storage && chrome.storage.onChanged) {
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
    } catch (error) {
      console.log('Storage listener not available (expected outside extension context)');
    }
  }
  
  setupEventListeners() {
    try {
      const captureBtn = document.getElementById('captureBtn');
      const annotateBtn = document.getElementById('annotateBtn');
      const exportPdfBtn = document.getElementById('exportPdfBtn');
      const clearBtn = document.getElementById('clearBtn');
      const sessionMenuBtn = document.getElementById('sessionMenuBtn');
      const closeSessionModal = document.getElementById('closeSessionModal');
      const newSessionBtn = document.getElementById('newSessionBtn');
      const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
      
      if (captureBtn) {
        captureBtn.addEventListener('click', () => this.captureScreenshot());
      }
      
      if (annotateBtn) {
        annotateBtn.addEventListener('click', () => this.startAnnotation());
      }
      
      if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => this.exportPdfJournal());
      }
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearAllScreenshots());
      }
      
      // Multi-tab session management
      if (sessionMenuBtn) {
        sessionMenuBtn.addEventListener('click', () => this.showSessionModal());
      }
      
      if (closeSessionModal) {
        closeSessionModal.addEventListener('click', () => this.hideSessionModal());
      }
      
      if (newSessionBtn) {
        newSessionBtn.addEventListener('click', () => this.createNewSession());
      }
      
      if (refreshSessionsBtn) {
        refreshSessionsBtn.addEventListener('click', () => this.refreshSessionsList());
      }
      
      console.log('Event listeners setup complete');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }
  
  async loadScreenshots() {
    try {
      console.log('📱 Loading screenshots from PRIMARY STORAGE (unlimited)...');
      
      if (!this.tempStorage || !this.tempStorage.isReady) {
        console.log('⚠️ PRIMARY storage not ready, waiting...');
        
        // Wait for storage to initialize
        let attempts = 0;
        while ((!this.tempStorage || !this.tempStorage.isReady) && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!this.tempStorage || !this.tempStorage.isReady) {
          console.error('❌ PRIMARY storage failed to initialize');
          this.screenshots = [];
          return;
        }
      }
      
      // Load from PRIMARY storage (IndexedDB - unlimited capacity)
      const currentSessionId = await this.tempStorage.getCurrentSessionId();
      this.currentSessionId = currentSessionId;
      
      const screenshots = await this.tempStorage.getAllScreenshots(currentSessionId);
      this.screenshots = screenshots || [];
      
      console.log(`📊 Loaded ${this.screenshots.length} screenshots from PRIMARY storage`);
      console.log('🏷️ Current session:', currentSessionId);
      
      // Update session info in UI
      await this.updateSessionInfo();
      
      // Update session stats
      await this.tempStorage.updateSessionStats(currentSessionId);
      
      // Show capacity info
      const stats = await this.tempStorage.getStorageStats();
      console.log('💾 Storage capacity:', stats.capacity);
      console.log('📊 Current usage:', stats.currentUsage);
      
      if (stats.totalSizeMB > 100) {
        console.log(`🎉 Using ${stats.totalSizeMB}MB - Would have exceeded Chrome's 10MB limit by ${stats.totalSizeMB - 10}MB!`);
      }
      
      this.calculateMemoryUsage();
      
    } catch (error) {
      console.error('❌ Error loading screenshots from PRIMARY storage:', error);
      this.screenshots = [];
    }
  }
  
  async saveScreenshots() {
    try {
      console.log('💾 === SAVE SCREENSHOTS START (PRIMARY STORAGE) ===');
      console.log('💾 Screenshots to save:', this.screenshots.length);
      console.log('💾 Screenshot IDs:', this.screenshots.map(s => s.id));
      
      if (!this.tempStorage || !this.tempStorage.isReady) {
        console.error('❌ PRIMARY storage not available');
        throw new Error('Primary storage not initialized');
      }
      
      console.log('💾 Saving to PRIMARY STORAGE (IndexedDB unlimited)...');
      
      // Save each screenshot to IndexedDB
      for (let i = 0; i < this.screenshots.length; i++) {
        const screenshot = this.screenshots[i];
        
        try {
          console.log(`💾 Saving screenshot ${i + 1}/${this.screenshots.length}: ${screenshot.id}`);
          await this.tempStorage.saveScreenshot(screenshot);
        } catch (saveError) {
          console.error(`❌ Failed to save screenshot ${i + 1}:`, saveError);
          // Continue with other screenshots
        }
      }
      
      console.log(`✅ Successfully saved ${this.screenshots.length} screenshots to PRIMARY storage`);
      console.log('💾 === SAVE SCREENSHOTS END ===');
      
    } catch (error) {
      console.error('❌ Error saving screenshots to PRIMARY storage:', error);
      console.error('❌ Save error stack:', error.stack);
    }
  }
  
  async forceTemporaryStorageMigration() {
    if (!this.tempStorage) {
      console.warn('⚠️ Cannot migrate to temporary storage - not available');
      return;
    }
    
    try {
      console.log('📁 Migrating large images to temporary storage...');
      
      for (let i = 0; i < this.screenshots.length; i++) {
        const screenshot = this.screenshots[i];
        
        if (screenshot.imageData && !screenshot.isInTempStorage) {
          const imageSize = screenshot.imageData.length;
          
          // Migrate images larger than 1MB
          if (imageSize > 1048576) {
            try {
              const tempId = 'temp_' + screenshot.id + '_' + Date.now();
              const storeResult = await this.tempStorage.storeImage(tempId, screenshot.imageData, {
                screenshotId: screenshot.id,
                migrationDate: new Date().toISOString()
              });
              
              if (storeResult.stored) {
                // Mark as in temporary storage and remove image data
                screenshot.isInTempStorage = true;
                screenshot.tempImageId = tempId;
                delete screenshot.imageData;
                
                console.log(`📁 Migrated screenshot ${i + 1} to temporary storage (${imageSize} bytes)`);
              }
            } catch (error) {
              console.error(`❌ Failed to migrate screenshot ${i + 1}:`, error);
            }
          }
        }
      }
      
      console.log('✅ Temporary storage migration completed');
    } catch (error) {
      console.error('❌ Error during temporary storage migration:', error);
    }
  }
  
  async restoreImageForElement(screenshotId, imgElement) {
    if (!this.tempStorage) return;
    
    try {
      const screenshot = this.screenshots.find(s => s.id === screenshotId);
      if (screenshot && screenshot.isInTempStorage && screenshot.tempImageId) {
        console.log('📁 Restoring image from temporary storage for element:', screenshotId);
        
        const restoredScreenshot = await this.tempStorage.restoreFullScreenshot(screenshot);
        
        if (restoredScreenshot && restoredScreenshot.imageData) {
          imgElement.src = restoredScreenshot.imageData;
          
          // Update the screenshot in our array
          const index = this.screenshots.findIndex(s => s.id === screenshotId);
          if (index !== -1) {
            this.screenshots[index] = restoredScreenshot;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring image for element:', error);
    }
  }
  
  async aggressiveStorageCleanup() {
    try {
      console.log('🧹 Running aggressive storage cleanup...');
      
      // Remove old screenshots (keep only 5 most recent)
      if (this.screenshots.length > 5) {
        this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const removedCount = this.screenshots.length - 5;
        this.screenshots = this.screenshots.slice(0, 5);
        console.log(`🗑️ Removed ${removedCount} old screenshots`);
      }
      
      // Migrate remaining large images to temp storage
      if (this.tempStorage) {
        for (const screenshot of this.screenshots) {
          if (screenshot.imageData && !screenshot.isInTempStorage) {
            const imageSize = screenshot.imageData.length;
            if (imageSize > 512000) { // 512KB threshold
              try {
                const tempId = 'temp_' + screenshot.id + '_' + Date.now();
                const storeResult = await this.tempStorage.storeImage(tempId, screenshot.imageData);
                
                if (storeResult.stored) {
                  screenshot.isInTempStorage = true;
                  screenshot.tempImageId = tempId;
                  delete screenshot.imageData;
                  console.log(`📁 Migrated large image to temporary storage`);
                }
              } catch (error) {
                console.error('Error migrating during aggressive cleanup:', error);
              }
            }
          }
        }
      }
      
      // Clean temporary storage
      if (this.tempStorage) {
        await this.tempStorage.cleanOldTempFiles();
      }
      
      // Save cleaned up screenshots
      await this.saveScreenshots();
      
      // Update memory usage
      this.calculateMemoryUsage();
      
      console.log('✅ Aggressive cleanup completed');
      
    } catch (error) {
      console.error('Error during aggressive cleanup:', error);
    }
  }
  
  async cleanupUnselectedScreenshots(selectedId) {
    try {
      console.log('🧹 Cleaning up unselected screenshots for journal...');
      
      // Don't remove screenshots, just migrate large ones to temp storage
      for (const screenshot of this.screenshots) {
        if (screenshot.id !== selectedId && screenshot.imageData && !screenshot.isInTempStorage) {
          const imageSize = screenshot.imageData.length;
          
          if (imageSize > 1048576 && this.tempStorage) { // 1MB threshold
            try {
              const tempId = 'temp_' + screenshot.id + '_' + Date.now();
              const storeResult = await this.tempStorage.storeImage(tempId, screenshot.imageData);
              
              if (storeResult.stored) {
                screenshot.isInTempStorage = true;
                screenshot.tempImageId = tempId;
                delete screenshot.imageData;
                console.log(`📁 Migrated unselected screenshot to temporary storage`);
              }
            } catch (error) {
              console.error('Error migrating unselected screenshot:', error);
            }
          }
        }
      }
      
      await this.saveScreenshots();
      console.log('✅ Cleanup of unselected screenshots completed');
      
    } catch (error) {
      console.error('Error cleaning up unselected screenshots:', error);
    }
  }
  
  async manualStorageClear() {
    try {
      console.log('🧹 Manual storage clear initiated...');
      
      if (confirm('This will clear ALL screenshots and data. Are you sure?')) {
        // Clear Chrome storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.clear();
        }
        
        // Clear temporary storage
        if (this.tempStorage) {
          await this.tempStorage.clearAll();
        }
        
        // Clear local data
        this.screenshots = [];
        this.selectedScreenshot = null;
        this.memoryUsage = 0;
        
        // Update UI
        this.updateUI();
        
        this.showStatus('All data cleared successfully', 'success');
        console.log('✅ Manual storage clear completed');
      }
    } catch (error) {
      console.error('Error during manual storage clear:', error);
      this.showStatus('Error clearing storage', 'error');
    }
  }
  
  async automaticStorageCleanup() {
    try {
      console.log('🧹 === AUTOMATIC STORAGE CLEANUP START ===');
      
      if (!this.tempStorage) {
        console.log('⚠️ PRIMARY storage not available, skipping cleanup');
        return;
      }
      
      // Get current session screenshots
      const currentSessionId = await this.tempStorage.getCurrentSessionId();
      this.screenshots = await this.tempStorage.getAllScreenshots(currentSessionId);
      
      console.log(`📊 Found ${this.screenshots.length} screenshots in current session`);
      
      // Remove corrupted screenshots (those without imageData)
      const originalCount = this.screenshots.length;
      const validScreenshots = [];
      
      for (const screenshot of this.screenshots) {
        if (screenshot.imageData) {
          validScreenshots.push(screenshot);
        } else {
          console.log('🗑️ Removing corrupted screenshot:', screenshot.id);
          // Delete from IndexedDB
          await this.tempStorage.deleteScreenshot(screenshot.id);
        }
      }
      
      this.screenshots = validScreenshots;
      const removedCorrupted = originalCount - this.screenshots.length;
      if (removedCorrupted > 0) {
        console.log(`🗑️ Removed ${removedCorrupted} corrupted screenshots`);
      }
      
      // If we have too many screenshots in current session, clean up old ones
      if (this.screenshots.length > 20) {
        console.log('📊 Too many screenshots in session, cleaning up old ones...');
        
        // Sort by timestamp (newest first)
        this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const toKeep = this.screenshots.slice(0, 20);
        const toRemove = this.screenshots.slice(20);
        
        // Remove old screenshots from IndexedDB
        for (const screenshot of toRemove) {
          try {
            await this.tempStorage.deleteScreenshot(screenshot.id);
          } catch (error) {
            console.error('Error deleting old screenshot:', error);
          }
        }
        
        this.screenshots = toKeep;
        console.log(`🗑️ Removed ${toRemove.length} old screenshots, kept ${toKeep.length}`);
      }
      
      // Update session stats
      await this.tempStorage.updateSessionStats(currentSessionId);
      
      // Update memory usage calculation
      this.calculateMemoryUsage();
      
      console.log('✅ Automatic cleanup completed successfully');
      console.log('🧹 === AUTOMATIC STORAGE CLEANUP END ===');
      
    } catch (error) {
      console.error('❌ Error during automatic storage cleanup:', error);
    }
  }
  
  // Simplified cleanup - just remove old screenshots
  schedulePeriodicCleanup() {
    // Run cleanup every 10 minutes (less frequent since IndexedDB has high capacity)
    setInterval(async () => {
      console.log('⏰ Running scheduled periodic cleanup...');
      await this.automaticStorageCleanup();
    }, 10 * 60 * 1000); // 10 minutes
    
    console.log('✅ Periodic cleanup scheduled (every 10 minutes)');
  }
  
  // === MULTI-TAB SESSION MANAGEMENT ===
  
  async updateSessionInfo() {
    try {
      if (!this.tempStorage) return;
      
      const sessions = await this.tempStorage.getAllSessions();
      const currentSession = sessions.find(s => s.id === this.currentSessionId);
      
      if (currentSession) {
        this.currentSessionName = currentSession.name;
        
        // Update UI
        const sessionNameElement = document.getElementById('currentSessionName');
        if (sessionNameElement) {
          sessionNameElement.textContent = currentSession.name;
        }
        
        console.log('📁 Session info updated:', currentSession.name);
      }
    } catch (error) {
      console.error('❌ Error updating session info:', error);
    }
  }
  
  async showSessionModal() {
    const modal = document.getElementById('sessionModal');
    if (modal) {
      modal.classList.remove('hidden');
      await this.refreshSessionsList();
    }
  }
  
  hideSessionModal() {
    const modal = document.getElementById('sessionModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  async refreshSessionsList() {
    try {
      if (!this.tempStorage) {
        console.error('❌ PRIMARY storage not available');
        return;
      }
      
      const sessionsList = document.getElementById('sessionsList');
      if (!sessionsList) return;
      
      sessionsList.innerHTML = '<div class="loading-sessions">Loading sessions...</div>';
      
      const sessions = await this.tempStorage.getAllSessions();
      console.log(`📁 Found ${sessions.length} sessions`);
      
      if (sessions.length === 0) {
        sessionsList.innerHTML = '<div class="loading-sessions">No sessions found.</div>';
        return;
      }
      
      let html = '';
      for (const session of sessions) {
        const isCurrent = session.id === this.currentSessionId;
        const lastActive = new Date(session.lastActive).toLocaleDateString();
        
        html += `
          <div class="session-item ${isCurrent ? 'current' : ''}" data-session-id="${session.id}">
            <div class="session-name">${session.name} ${isCurrent ? '(Current)' : ''}</div>
            <div class="session-stats">
              <span>📸 ${session.screenshotCount} screenshots</span>
              <span>📅 ${lastActive}</span>
            </div>
          </div>`;
      }
      
      sessionsList.innerHTML = html;
      
      // Add click handlers
      const sessionItems = sessionsList.querySelectorAll('.session-item');
      sessionItems.forEach(item => {
        item.addEventListener('click', () => {
          const sessionId = item.dataset.sessionId;
          this.switchToSession(sessionId);
        });
      });
      
    } catch (error) {
      console.error('❌ Error refreshing sessions list:', error);
    }
  }
  
  async createNewSession() {
    try {
      if (!this.tempStorage) {
        console.error('❌ PRIMARY storage not available');
        return;
      }
      
      const sessionName = prompt('Enter session name:');
      if (!sessionName || sessionName.trim() === '') {
        return;
      }
      
      console.log('🆕 Creating new session:', sessionName);
      
      const newSessionId = await this.tempStorage.createSession(null, sessionName.trim());
      
      // Switch to the new session
      localStorage.setItem('currentSessionId', newSessionId);
      this.currentSessionId = newSessionId;
      
      // Reload screenshots for new session
      await this.loadScreenshots();
      this.updateUI();
      
      // Refresh the sessions list
      await this.refreshSessionsList();
      
      this.showStatus(`Created new session: ${sessionName}`, 'success');
      console.log('✅ New session created and activated');
      
    } catch (error) {
      console.error('❌ Error creating new session:', error);
      this.showStatus('Failed to create new session', 'error');
    }
  }
  
  async switchToSession(sessionId) {
    try {
      if (!this.tempStorage || sessionId === this.currentSessionId) {
        return;
      }
      
      console.log('🔄 Switching to session:', sessionId);
      
      // Update current session
      localStorage.setItem('currentSessionId', sessionId);
      this.currentSessionId = sessionId;
      
      // Load screenshots for the selected session
      await this.loadScreenshots();
      this.updateUI();
      
      // Update session info
      await this.updateSessionInfo();
      
      // Close modal
      this.hideSessionModal();
      
      this.showStatus(`Switched to session: ${this.currentSessionName}`, 'success');
      console.log('✅ Session switched successfully');
      
    } catch (error) {
      console.error('❌ Error switching session:', error);
      this.showStatus('Failed to switch session', 'error');
    }
  }
  
  calculateMemoryUsage() {
    this.memoryUsage = 0;
    this.screenshots.forEach(screenshot => {
      if (screenshot.imageData) {
        this.memoryUsage += screenshot.imageData.length * 0.75;
      }
      if (screenshot.annotations) {
        screenshot.annotations.forEach(annotation => {
          this.memoryUsage += JSON.stringify(annotation).length;
        });
      }
    });
    console.log('Memory usage calculated:', this.formatMemorySize(this.memoryUsage));
  }
  
  formatMemorySize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
  
  async getImageDimensions(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for dimension calculation'));
      };
      img.src = imageData;
    });
  }
  
  // 🎨 CRITICAL MISSING METHOD - RENDERS ANNOTATIONS IN PDF
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
          
          // Use natural image dimensions as the authoritative source
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          console.log('  - Using natural dimensions as coordinate reference:', `${naturalWidth}x${naturalHeight}`);
          
          // Set canvas to natural image size
          canvas.width = naturalWidth;
          canvas.height = naturalHeight;
          
          // Draw the original image at natural size
          ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
          
          console.log('📏 PDF rendering with 1:1 scale (100% original):', { 
            imageSize: `${img.width}x${img.height}`,
            coordinateReference: 'DIRECT_ORIGINAL_COORDINATES'
          });
          
          // Render each annotation
          screenshot.annotations.forEach((annotation, index) => {
            console.log(`🎯 Rendering annotation ${index + 1}: "${annotation.text}"`);
            
            // Use annotation coordinates directly (they're already in the right space)
            const x = Math.round(annotation.x);
            const y = Math.round(annotation.y);
            
            // Handle text positioning
            let textX, textY;
            if (annotation.textX && annotation.textY) {
              textX = Math.round(annotation.textX);
              textY = Math.round(annotation.textY);
            } else {
              textX = x + 60;
              textY = y - 30;
            }
            
            console.log(`📍 PDF annotation coordinates:`, { 
              x, y, textX, textY, text: annotation.text
            });
            
            // Calculate sizes for PDF (larger for visibility)
            const pinRadius = 8;  // Larger for PDF visibility
            const lineWidth = 2;  // Thicker lines
            const fontSize = 18;  // Readable font size
            
            // Draw pinpoint circle (large red dot)
            ctx.beginPath();
            ctx.arc(x, y, pinRadius, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // Draw connecting line to text
            const distance = Math.sqrt((textX - x) ** 2 + (textY - y) ** 2);
            if (distance > pinRadius * 2) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(textX, textY);
              ctx.strokeStyle = '#ff4444';
              ctx.lineWidth = lineWidth;
              ctx.setLineDash([8, 8]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Draw text background
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const textMetrics = ctx.measureText(annotation.text);
            const textWidth = textMetrics.width + 16;
            const textHeight = fontSize * 1.4;
            
            // Ensure text stays within canvas bounds
            const finalTextX = Math.max(8, Math.min(textX, canvas.width - textWidth - 8));
            const finalTextY = Math.max(8, Math.min(textY, canvas.height - textHeight - 8));
            
            // Text shadow/background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(finalTextX - 4, finalTextY - 4, textWidth + 8, textHeight + 8);
            
            // Main text background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(finalTextX - 8, finalTextY - 8, textWidth, textHeight);
            
            // Border around text
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(finalTextX - 8, finalTextY - 8, textWidth, textHeight);
            
            // Draw the text
            ctx.fillStyle = '#333333';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillText(annotation.text, finalTextX, finalTextY);
            
            console.log(`✅ Rendered annotation ${index + 1} at (${x}, ${y})`);
          });
          
          // Return annotated image
          const annotatedImage = canvas.toDataURL('image/png', 1.0);
          console.log('✅ Annotated image created for PDF (100% quality)');
          console.log(`📊 Total annotations rendered: ${screenshot.annotations.length}`);
          resolve(annotatedImage);
        };
        
        img.onerror = () => {
          console.error('❌ Failed to load image for annotation rendering');
          resolve(screenshot.imageData); // Fallback to original
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
      console.log('🔄 Starting screenshot capture...');
      
      // Check if Chrome APIs are available
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) {
        const errorMsg = 'Chrome extension APIs not available. Please install as Chrome extension.';
        console.error('❌', errorMsg);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      console.log('✅ Chrome APIs available');
      
      // Get current tab info
      console.log('🔍 Getting current tab info...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        const errorMsg = 'No active tab found';
        console.error('❌', errorMsg);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      console.log('✅ Current tab found:', {
        title: tab.title,
        url: tab.url,
        id: tab.id
      });
      
      // Capture screenshot via background script
      console.log('📸 Sending capture message to background script...');
      
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
          action: 'captureVisibleTab' 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Runtime error:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            console.log('✅ Background script response received:', {
              success: response?.success,
              hasImageData: !!response?.imageData,
              imageDataSize: response?.imageData?.length,
              error: response?.error
            });
            resolve(response);
          }
        });
      });
      
      console.log('📊 Full capture response:', {
        responseExists: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'none',
        success: response?.success,
        hasImageData: !!response?.imageData,
        hasError: !!response?.error
      });
      
      if (!response) {
        const errorMsg = 'No response from background script';
        console.error('❌', errorMsg);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (response.error) {
        const errorMsg = `Capture failed: ${response.error}`;
        console.error('❌', errorMsg);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (!response.success || !response.imageData) {
        const errorMsg = 'Invalid response from background script';
        console.error('❌', errorMsg, { response });
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      console.log('✅ Screenshot data received successfully');
      console.log('📏 Image data size:', response.imageData.length, 'characters');
      
      // Create screenshot object with detailed timestamp
      const now = new Date();
      
      console.log('📐 Getting image dimensions...');
      
      // Get original dimensions
      const originalDimensions = await this.getImageDimensions(response.imageData);
      console.log('✅ Original capture dimensions (100% quality):', originalDimensions);
      
      const screenshot = {
        id: Date.now().toString(),
        imageData: response.imageData, // 100% original quality
        originalCaptureWidth: originalDimensions.width,
        originalCaptureHeight: originalDimensions.height,
        storageWidth: originalDimensions.width,
        storageHeight: originalDimensions.height,
        displayWidth: originalDimensions.width,
        displayHeight: originalDimensions.height,
        url: tab.url,
        title: tab.title,
        timestamp: now.toISOString(),
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
        annotations: [],
        // Multi-tab session info will be added by tempStorage.saveScreenshot()
        tabId: tab.id,
        tabUrl: tab.url
      };
      
      console.log('✅ Screenshot object created:', {
        id: screenshot.id,
        dimensions: `${screenshot.displayWidth}x${screenshot.displayHeight}`,
        imageDataSize: screenshot.imageData.length,
        title: screenshot.title.substring(0, 50) + '...',
        tabId: screenshot.tabId
      });
      
      console.log('💾 Adding screenshot to array (current count:', this.screenshots.length, ')');
      this.screenshots.push(screenshot);
      
      console.log('💾 Saving screenshots to PRIMARY STORAGE...');
      await this.saveScreenshots();
      
      console.log('🎯 Setting selected screenshot...');
      this.selectedScreenshot = screenshot;
      
      // Enable annotation button
      const annotateBtn = document.getElementById('annotateBtn');
      if (annotateBtn) {
        annotateBtn.disabled = false;
        console.log('✅ Annotation button enabled');
      }
      
      console.log('🔄 Updating UI...');
      this.updateUI();
      
      this.showStatus('Screenshot captured! Starting annotation mode...', 'success');
      console.log('✅ Screenshot capture completed successfully');
      console.log('📊 Total screenshots now:', this.screenshots.length);
      
      // Auto-start annotation mode
      console.log('🎯 Auto-starting annotation mode...');
      setTimeout(() => {
        this.startAnnotation();
      }, 500);
      
    } catch (error) {
      console.error('❌ Capture error details:', error);
      console.error('❌ Error stack:', error.stack);
      this.showStatus(`Failed to capture: ${error.message}`, 'error');
    }
  }
  
  async startAnnotation() {
    console.log('🎯 Starting annotation...');
    
    if (!this.selectedScreenshot) {
      console.error('❌ No screenshot selected');
      this.showStatus('Please select a screenshot first by clicking on one', 'error');
      return;
    }
    
    try {
      console.log('✅ Starting annotation mode for screenshot:', this.selectedScreenshot.id);
      
      // Check if Chrome APIs are available
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime || !chrome.windows) {
        throw new Error('Chrome extension APIs not available for annotation window.');
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('✅ Current tab found:', tab.id, tab.title);
      
      console.log('🌐 Opening universal annotation interface...');
      
      // Create annotation URL with screenshot data
      const annotationUrl = chrome.runtime.getURL('annotation.html') + 
        '?screenshot=' + encodeURIComponent(JSON.stringify(this.selectedScreenshot));
      
      // Open in new window for unrestricted annotation
      const windowInfo = await chrome.windows.create({
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
        if (window.close) {
          window.close();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Annotation error:', error);
      this.showStatus(`Annotation failed: ${error.message}`, 'error');
    }
  }
  
  async exportPdfJournal() {
    if (this.screenshots.length === 0) {
      this.showStatus('No screenshots to export in this session', 'info');
      return;
    }
    
    try {
      console.log('🔄 Starting PDF journal export for session:', this.currentSessionName);
      this.showStatus('Generating PDF journal with annotations...', 'info');
      
      // All screenshots are already in memory since we're using IndexedDB as primary
      const validScreenshots = this.screenshots.filter(s => s.imageData);
      console.log(`📊 Valid screenshots for PDF: ${validScreenshots.length}/${this.screenshots.length}`);
      
      if (validScreenshots.length === 0) {
        console.error('❌ No valid screenshots for PDF export');
        this.showStatus('No images available for PDF export', 'error');
        return;
      }
      
      // Create annotated versions of ALL screenshots for PDF
      const annotatedScreenshots = [];
      console.log(`🎨 Processing ${validScreenshots.length} screenshots for PDF with annotations...`);
      
      for (let i = 0; i < validScreenshots.length; i++) {
        const screenshot = validScreenshots[i];
        console.log(`🎨 Processing screenshot ${i + 1}/${validScreenshots.length}: ${screenshot.title}`);
        
        try {
          // Create annotated version for PDF
          const annotatedImageData = await this.createAnnotatedImageForPDF(screenshot);
          
          annotatedScreenshots.push({
            ...screenshot,
            imageData: annotatedImageData, // Use annotated version for PDF
            originalImageData: screenshot.imageData // Keep original as backup
          });
          
          console.log(`✅ Successfully processed screenshot ${i + 1}: ${screenshot.title} with ${screenshot.annotations?.length || 0} annotations`);
          
          // Show progress
          this.showStatus(`Processing annotations for PDF: ${i + 1}/${validScreenshots.length}`, 'info');
          
        } catch (imageError) {
          console.error(`❌ Error processing screenshot ${i + 1}:`, imageError);
          
          // Add screenshot even if annotation processing fails
          annotatedScreenshots.push({
            ...screenshot,
            imageData: screenshot.imageData, // Use original if annotation fails
            originalImageData: screenshot.imageData
          });
          
          console.log(`⚠️ Added screenshot ${i + 1} without rendered annotations due to error`);
        }
      }
      
      console.log('📊 Final export data summary:', {
        sessionName: this.currentSessionName,
        sessionId: this.currentSessionId,
        totalScreenshotsProcessed: annotatedScreenshots.length,
        originalScreenshotCount: this.screenshots.length,
        totalAnnotations: annotatedScreenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0)
      });
      
      if (annotatedScreenshots.length === 0) {
        console.error('❌ No screenshots were successfully processed for PDF');
        this.showStatus('Failed to process any screenshots for PDF export', 'error');
        return;
      }
      
      // Create PDF export window with annotated screenshots
      const exportData = {
        screenshots: annotatedScreenshots, // Use annotated versions
        sessionName: this.currentSessionName || 'Multi-Tab Journal',
        sessionId: this.currentSessionId,
        exportDate: new Date().toISOString(),
        totalScreenshots: annotatedScreenshots.length,
        totalAnnotations: annotatedScreenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0)
      };
      
      console.log('📊 Export data prepared:', {
        sessionName: exportData.sessionName,
        screenshots: exportData.screenshots.length,
        totalAnnotations: exportData.totalAnnotations
      });
      
      // Check if Chrome APIs are available for window creation
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.windows) {
        throw new Error('Chrome extension APIs not available for PDF export window.');
      }
      
      // Store data in chrome storage temporarily
      const exportId = 'pdf_export_' + Date.now();
      await chrome.storage.local.set({ [exportId]: exportData });
      
      const exportUrl = chrome.runtime.getURL('pdf-export.html') + 
        '?exportId=' + encodeURIComponent(exportId);
      
      console.log('🔗 Export URL created:', exportUrl);
      
      // Open PDF export in new window
      const windowInfo = await chrome.windows.create({
        url: exportUrl,
        type: 'popup',
        width: 1200,
        height: 800,
        focused: true
      });
      
      console.log('🪟 Export window created:', windowInfo.id);
      
      // Monitor PDF export completion
      this.monitorPdfExportCompletion(exportId, windowInfo.id);
      
      this.showStatus(`📄 PDF journal export opened: "${exportData.sessionName}"!`, 'success');
      console.log('✅ PDF export window opened successfully');
      
    } catch (error) {
      console.error('❌ PDF export error:', error);
      this.showStatus(`Failed to export PDF journal: ${error.message}`, 'error');
    }
  }
  
  async monitorPdfExportCompletion(exportId, windowId) {
    console.log('👀 Monitoring PDF export completion...');
    
    const checkInterval = setInterval(async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.windows) {
          const window = await chrome.windows.get(windowId);
          
          if (!window) {
            console.log('🧹 PDF export completed, cleaning up...');
            clearInterval(checkInterval);
            
            // Clean up temporary export data
            try {
              if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.remove(exportId);
                console.log('🧹 Cleaned up temporary export data');
              }
            } catch (error) {
              console.warn('⚠️ Failed to clean up export data:', error);
            }
            
            console.log('🧹 Post-export cleanup completed');
          }
        }
      } catch (error) {
        // Window doesn't exist anymore, clean up
        console.log('🧹 PDF export window closed, cleaning up...');
        clearInterval(checkInterval);
        
        try {
          if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.remove(exportId);
          }
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
  
  async clearAllScreenshots() {
    if (this.screenshots.length === 0) {
      this.showStatus('No screenshots to clear', 'info');
      return;
    }
    
    if (confirm(`Delete all ${this.screenshots.length} screenshots? This will free ${this.formatMemorySize(this.memoryUsage)} of memory.`)) {
      try {
        console.log('Clearing all screenshots from PRIMARY STORAGE...');
        
        // Clear from PRIMARY storage (IndexedDB)
        if (this.tempStorage) {
          await this.tempStorage.clearAll();
          console.log('✅ Cleared all data from PRIMARY storage (IndexedDB)');
        }
        
        // Clear local data
        this.screenshots = [];
        this.selectedScreenshot = null;
        this.memoryUsage = 0;
        
        // Update UI
        const annotateBtn = document.getElementById('annotateBtn');
        const exportBtn = document.getElementById('exportPdfBtn');
        
        if (annotateBtn) annotateBtn.disabled = true;
        if (exportBtn) exportBtn.disabled = true;
        
        this.updateUI();
        
        this.showStatus('All screenshots cleared!', 'success');
        console.log('Screenshots cleared successfully');
        
      } catch (error) {
        console.error('Clear error:', error);
        this.showStatus('Failed to clear screenshots', 'error');
      }
    }
  }
  
  updateUI() {
    console.log('=== UPDATEUI START ===');
    console.log('Updating UI - Screenshots:', this.screenshots.length);
    
    // Update memory info
    const memoryElement = document.getElementById('memoryUsage');
    const countElement = document.getElementById('screenshotCount');
    
    if (memoryElement) {
      memoryElement.textContent = this.formatMemorySize(this.memoryUsage);
      console.log('✅ Updated memory usage:', memoryElement.textContent);
    }
    
    if (countElement) {
      countElement.textContent = this.screenshots.length;
      console.log('✅ Updated screenshot count:', countElement.textContent);
    }
    
    // Update session info
    this.updateSessionInfo();
    
    // Update screenshots list
    const listElement = document.getElementById('screenshotsList');
    if (!listElement) {
      console.error('❌ screenshotsList element not found');
      return;
    }
    
    if (this.screenshots.length === 0) {
      console.log('📋 No screenshots - showing empty state');
      listElement.innerHTML = `
        <div class="empty-state">
          No screenshots in this session yet.<br>
          Click "Capture Current Page" to add screenshots from any tab!<br>
          <small style="color: #999; margin-top: 8px; display: block;">
            💡 Tip: You can capture from different tabs and they'll all be saved in "${this.currentSessionName || 'this session'}"
          </small>
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
        
        // Create annotation indicators for thumbnail
        let indicators = '';
        if (screenshot.annotations && screenshot.annotations.length > 0) {
          screenshot.annotations.forEach((annotation, annotationIndex) => {
            // Scale annotation position to thumbnail size
            const thumbnailMaxWidth = 360;
            const scaleX = thumbnailMaxWidth / screenshot.displayWidth;
            const scaleY = scaleX;
            
            const x = (annotation.x * scaleX) - 6;
            const y = (annotation.y * scaleY) - 6;
            
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
        }
        
        // Create annotation list for thumbnail
        let annotationsList = '';
        if (screenshot.annotations && screenshot.annotations.length > 0) {
          annotationsList = '<div style="margin-top: 8px; font-size: 11px; color: #666;">';
          screenshot.annotations.forEach((annotation, annotationIndex) => {
            const shortText = annotation.text.length > 25 ? 
              annotation.text.substring(0, 25) + '...' : 
              annotation.text;
            annotationsList += `<div style="margin: 2px 0;">📍 ${shortText}</div>`;
          });
          annotationsList += '</div>';
        }
        
        // Show tab info for multi-tab context
        const tabInfo = screenshot.tabUrl ? `
          <div style="font-size: 10px; color: #999; margin-top: 2px;">
            🌐 ${new URL(screenshot.tabUrl).hostname}
          </div>` : '';
        
        html += `
          <div class="screenshot-item ${isSelected ? 'selected' : ''}" data-id="${screenshot.id}">
            <div class="screenshot-preview">
              <div style="position: relative; display: inline-block;">
                <img src="${screenshot.imageData || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'}" 
                     alt="Screenshot preview" 
                     class="screenshot-preview-img"
                     style="width: 100%; max-width: 360px; height: auto; border-radius: 4px; margin-bottom: 8px;"
                     data-screenshot-id="${screenshot.id}"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIExvYWRpbmc8L3RleHQ+PC9zdmc+'">
                ${indicators}
              </div>
              ${annotationsList}
            </div>
            <div class="screenshot-title">${screenshot.title}</div>
            <div class="screenshot-details">
              <div class="timestamp-info">
                <span class="capture-date">📅 ${screenshot.captureDate || new Date(screenshot.timestamp).toLocaleDateString()}</span>
                <span class="capture-time">🕐 ${screenshot.captureTime || new Date(screenshot.timestamp).toLocaleTimeString()}</span>
                ${tabInfo}
              </div>
              <div class="technical-info">
                <span>${screenshot.displayWidth}×${screenshot.displayHeight}</span>
                <span class="annotation-count">${screenshot.annotations ? screenshot.annotations.length : 0} annotations</span>
              </div>
            </div>
          </div>`;
      });
      
      listElement.innerHTML = html;
      
      // Add click handlers
      const screenshotItems = listElement.querySelectorAll('.screenshot-item');
      
      screenshotItems.forEach((item) => {
        item.addEventListener('click', () => {
          const screenshotId = item.dataset.id;
          this.selectedScreenshot = this.screenshots.find(s => s.id === screenshotId);
          console.log('📸 Selected screenshot:', this.selectedScreenshot?.id);
          
          // Enable annotation button
          const annotateBtn = document.getElementById('annotateBtn');
          if (annotateBtn) {
            annotateBtn.disabled = false;
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
    
    console.log('✅ UI update completed');
    console.log('=== UPDATEUI END ===');
  }
  
  showStatus(message, type = 'info') {
    console.log('Status:', type, message);
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
      statusEl.classList.remove('hidden');
      
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  const annotator = new ScreenshotAnnotator();
  window.screenshotAnnotator = annotator;
  
  // Expose manual cleanup methods for console access
  window.clearExtensionStorage = () => {
    annotator.manualStorageClear();
  };
  
  window.extremeCleanup = () => {
    annotator.extremeEmergencyCleanup();
  };
  
  window.fixCorruptedScreenshots = () => {
    annotator.fixCorruptedScreenshots();
  };
  
  console.log('💡 Storage management commands available:');
  console.log('  clearExtensionStorage() - Clear all data');
  console.log('  extremeCleanup() - Keep only 1 screenshot');
  console.log('  fixCorruptedScreenshots() - Remove corrupted screenshots');
});

// Refresh UI when popup becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.screenshotAnnotator && window.screenshotAnnotator.isInitialized) {
    console.log('Popup became visible, refreshing UI...');
    window.screenshotAnnotator.loadScreenshots().then(() => {
      window.screenshotAnnotator.updateUI();
    });
  }
});

// Handle popup focus
window.addEventListener('focus', () => {
  if (window.screenshotAnnotator && window.screenshotAnnotator.isInitialized) {
    console.log('Popup received focus, refreshing UI...');
    window.screenshotAnnotator.loadScreenshots().then(() => {
      window.screenshotAnnotator.updateUI();
    });
  }
});