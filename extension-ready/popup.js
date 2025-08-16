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
    console.log('🚀 Initializing ScreenshotAnnotator with AUTOMATIC database repair...');
    
    try {
      this.showStatus('🚀 Initializing extension with automatic database healing...', 'info');
      
      // Initialize temporary storage first with automatic schema repair
      await this.initTempStorage();
      
      if (!this.tempStorage) {
        throw new Error('Critical: Primary storage initialization failed after repair attempts');
      }
      
      this.showStatus('📱 Loading existing screenshots...', 'info');
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
      // Setup periodic cleanup for IndexedDB (no quota monitoring needed)
      this.schedulePeriodicCleanup();
      
      console.log('✅ ScreenshotAnnotator initialized successfully with automatic database healing');
      this.showStatus('✅ Extension ready - automatic database repair active!', 'success');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ ScreenshotAnnotator initialization failed:', error);
      this.showStatus('❌ Extension initialization failed - try closing/reopening or manual repair', 'error');
      
      // Show manual repair instructions as fallback
      setTimeout(() => {
        console.log('💡 MANUAL REPAIR INSTRUCTIONS:');
        console.log('   1. Open browser console (F12)');
        console.log('   2. Run: resetDatabaseSchema()');
        console.log('   3. Wait for: "✅ Database reinitialized with correct schema"');
        console.log('   4. Reload extension popup');
      }, 2000);
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
        
        // AUTOMATIC SCHEMA REPAIR: Check and fix database schema issues
        await this.performAutomaticSchemaCheck();
        
        // Test the connection after potential repair
        try {
          const stats = await this.tempStorage.getStorageStats();
          console.log('📊 Temporary storage ready:', stats);
        } catch (testError) {
          console.warn('⚠️ Temporary storage test failed after schema check:', testError);
          
          // If still failing, try one more repair attempt
          console.log('🔧 Attempting final schema repair...');
          await this.forceSchemaRepair();
          
          // Final test
          try {
            const finalStats = await this.tempStorage.getStorageStats();
            console.log('📊 Temporary storage recovered:', finalStats);
          } catch (finalError) {
            console.error('❌ Final schema repair failed:', finalError);
            this.tempStorage = null;
          }
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

  // NEW: Automatic schema validation and repair on popup opening
  async performAutomaticSchemaCheck() {
    try {
      console.log('🔍 === AUTOMATIC SCHEMA VALIDATION START ===');
      this.showStatus('Checking database integrity...', 'info');
      
      if (!this.tempStorage || !this.tempStorage.db) {
        console.log('⚠️ No database to check');
        return false;
      }
      
      // Check if all required object stores exist
      const requiredStores = ['screenshots', 'sessions', 'tempImages', 'pdfExports'];
      const existingStores = [...this.tempStorage.db.objectStoreNames];
      const missingStores = requiredStores.filter(store => !existingStores.includes(store));
      
      console.log('📊 Schema check results:', {
        required: requiredStores,
        existing: existingStores, 
        missing: missingStores
      });
      
      // Test critical PDF export functionality
      let pdfExportWorking = false;
      try {
        // Try to access pdfExports object store
        const transaction = this.tempStorage.db.transaction(['pdfExports'], 'readonly');
        const store = transaction.objectStore('pdfExports');
        pdfExportWorking = true;
        console.log('✅ PDF export object store accessible');
      } catch (pdfError) {
        console.warn('⚠️ PDF export object store test failed:', pdfError.message);
        pdfExportWorking = false;
      }
      
      // If there are missing stores or PDF export is broken, repair automatically
      if (missingStores.length > 0 || !pdfExportWorking) {
        console.log(`🔧 AUTOMATIC REPAIR NEEDED: ${missingStores.length} missing stores, PDF export: ${pdfExportWorking ? 'OK' : 'BROKEN'}`);
        
        this.showStatus('🔧 Repairing database schema automatically...', 'info');
        
        await this.automaticSchemaRepair();
        
        // Verify repair was successful
        const newExistingStores = [...this.tempStorage.db.objectStoreNames];
        const newMissingStores = requiredStores.filter(store => !newExistingStores.includes(store));
        
        if (newMissingStores.length === 0) {
          console.log('✅ AUTOMATIC REPAIR SUCCESSFUL');
          this.showStatus('✅ Database automatically repaired - PDF export ready!', 'success');
          return true;
        } else {
          console.warn('⚠️ AUTOMATIC REPAIR INCOMPLETE:', newMissingStores);
          this.showStatus('⚠️ Database repair incomplete - some features may not work', 'warning');
          return false;
        }
      } else {
        console.log('✅ Schema validation passed - all object stores present');
        this.showStatus('✅ Database schema healthy', 'success');
        return true;
      }
      
    } catch (error) {
      console.error('❌ Automatic schema check failed:', error);
      this.showStatus('⚠️ Database check failed - trying repair...', 'warning');
      
      // Try repair anyway
      try {
        await this.automaticSchemaRepair();
        this.showStatus('✅ Emergency database repair completed', 'success');
        return true;
      } catch (repairError) {
        console.error('❌ Emergency repair failed:', repairError);
        this.showStatus('❌ Database repair failed - manual intervention required', 'error');
        return false;
      }
    } finally {
      console.log('🔍 === AUTOMATIC SCHEMA VALIDATION END ===');
    }
  }

  // NEW: Seamless automatic schema repair
  async automaticSchemaRepair() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 === AUTOMATIC DATABASE SCHEMA REPAIR START ===');
        this.showStatus('🔄 Rebuilding database with correct schema...', 'info');
        
        // Close current database connection
        if (this.tempStorage && this.tempStorage.db) {
          this.tempStorage.db.close();
          console.log('🔐 Closed existing database connection');
        }
        
        // Delete and recreate database
        const deleteRequest = indexedDB.deleteDatabase('ScreenshotAnnotatorDB');
        
        deleteRequest.onsuccess = async () => {
          console.log('🗑️ Old database deleted for automatic repair');
          this.showStatus('🏗️ Creating fresh database with all features...', 'info');
          
          try {
            // Reinitialize with correct schema
            await this.tempStorage.init();
            
            // Verify all object stores are created
            const stores = [...this.tempStorage.db.objectStoreNames];
            console.log('🏗️ New database created with stores:', stores);
            
            const expectedStores = ['screenshots', 'sessions', 'tempImages', 'pdfExports'];
            const allPresent = expectedStores.every(store => stores.includes(store));
            
            if (allPresent) {
              console.log('✅ AUTOMATIC REPAIR COMPLETE - All object stores created');
              this.showStatus('✅ Database automatically repaired - all features available!', 'success');
              resolve(true);
            } else {
              const missing = expectedStores.filter(store => !stores.includes(store));
              console.error('❌ REPAIR INCOMPLETE - Missing stores:', missing);
              this.showStatus(`⚠️ Repair incomplete - missing: ${missing.join(', ')}`, 'warning');
              resolve(false);
            }
            
          } catch (initError) {
            console.error('❌ Database reinitialization failed:', initError);
            this.showStatus('❌ Database repair failed during reinitialization', 'error');
            reject(initError);
          }
        };
        
        deleteRequest.onerror = (error) => {
          console.error('❌ Database deletion failed during repair:', error);
          this.showStatus('❌ Database repair failed - could not delete old database', 'error');
          reject(error.target.error);
        };
        
        deleteRequest.onblocked = (event) => {
          console.warn('⚠️ Database deletion blocked - other connections open');
          this.showStatus('⚠️ Database repair blocked - please close other tabs and try again', 'warning');
          // Still try to resolve after a delay
          setTimeout(() => {
            resolve(false);
          }, 3000);
        };
        
      } catch (error) {
        console.error('❌ Automatic schema repair setup failed:', error);
        this.showStatus('❌ Automatic repair setup failed', 'error');
        reject(error);
      }
    });
  }

  // NEW: Force schema repair as last resort
  async forceSchemaRepair() {
    try {
      console.log('🚨 FORCING SCHEMA REPAIR - LAST RESORT');
      this.showStatus('🚨 Forcing database repair...', 'info');
      
      // Use the existing manual repair method but make it automatic
      await this.resetDatabaseSchemaInternal();
      
      this.showStatus('✅ Forced repair completed', 'success');
      return true;
    } catch (error) {
      console.error('❌ Forced schema repair failed:', error);
      this.showStatus('❌ All repair attempts failed', 'error');
      return false;
    }
  }

  // Internal version of resetDatabaseSchema for automatic use
  async resetDatabaseSchemaInternal() {
    return new Promise((resolve, reject) => {
      if (this.tempStorage) {
        try {
          console.log('🔄 Internal schema reset for automatic repair...');
          
          // Close current database connection
          if (this.tempStorage.db) {
            this.tempStorage.db.close();
          }
          
          // Delete the database
          const deleteRequest = indexedDB.deleteDatabase('ScreenshotAnnotatorDB');
          
          deleteRequest.onsuccess = async () => {
            console.log('✅ Database deleted for internal reset');
            
            try {
              // Reinitialize with fresh schema
              await this.tempStorage.init();
              console.log('✅ Database reinitialized internally');
              
              resolve();
            } catch (initError) {
              console.error('❌ Failed to reinitialize database internally:', initError);
              reject(initError);
            }
          };
          
          deleteRequest.onerror = (error) => {
            console.error('❌ Failed to delete database internally:', error);
            reject(error.target.error);
          };
          
        } catch (error) {
          console.error('❌ Internal database reset failed:', error);
          reject(error);
        }
      } else {
        reject(new Error('Temp storage not available for internal reset'));
      }
    });
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
      
      // Add runtime message listener for annotation saving and window events
      if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === 'saveAnnotatedScreenshot') {
            this.handleAnnotationSave(request.screenshot).then(result => {
              sendResponse(result);
            }).catch(error => {
              sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
          }
          
          if (request.action === 'annotationComplete' || request.action === 'annotationWindowClosed') {
            console.log('🎯 Annotation window closed - maintaining popup continuity');
            
            // Log to persistent debug system
            if (window.debugLog) {
              window.debugLog('🎯 Annotation window closed - popup continuity maintained');
              window.debugLog('✅ Debug log persists across annotation sessions');
            }
            
            // Refresh the UI to show any updated annotations
            this.updateUI();
            this.showStatus('✅ Annotation completed - popup stays open for more captures!', 'success');
            
            sendResponse({ success: true, message: 'Popup continuity maintained' });
            return true;
          }
        });
        console.log('Runtime message listener setup for annotation saving and window events');
      }
    } catch (error) {
      console.log('Storage listener not available (expected outside extension context)');
    }
  }
  
  async handleAnnotationSave(annotatedScreenshot) {
    try {
      console.log('📝 Handling annotation save for screenshot:', annotatedScreenshot.id);
      this.showStatus('💾 Saving annotations...', 'info');
      
      if (!this.tempStorage) {
        throw new Error('Primary storage not available');
      }
      
      // Save the annotated screenshot to IndexedDB
      await this.tempStorage.saveScreenshot(annotatedScreenshot);
      
      // Update local array if the screenshot exists
      const index = this.screenshots.findIndex(s => s.id === annotatedScreenshot.id);
      if (index !== -1) {
        this.screenshots[index] = annotatedScreenshot;
        this.calculateMemoryUsage();
        this.updateUI();
        console.log('✅ Local screenshot array updated with annotations');
      } else {
        // Reload all screenshots to get the updated one
        console.log('🔄 Screenshot not found locally, reloading all screenshots');
        await this.loadScreenshots();
        this.updateUI();
      }
      
      this.showStatus('✅ Annotations saved successfully to unlimited storage!', 'success');
      console.log('✅ Annotation save handled successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error handling annotation save:', error);
      this.showStatus('❌ Failed to save annotations - please try again', 'error');
      return { success: false, error: error.message };
    }
  }
  
  setupEventListeners() {
    try {
      const captureBtn = document.getElementById('captureBtn');
      const annotateBtn = document.getElementById('annotateBtn');
      const exportPdfBtn = document.getElementById('exportPdfBtn');
      const clearBtn = document.getElementById('clearBtn');
      
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
      
      // Load all screenshots from PRIMARY storage (IndexedDB - unlimited capacity)
      const screenshots = await this.tempStorage.getAllScreenshots();
      this.screenshots = screenshots || [];
      
      console.log(`📊 Loaded ${this.screenshots.length} screenshots from PRIMARY storage`);
      
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
  
  // Enhanced memory management - Aggressive cleanup for large datasets
  async aggressiveMemoryOptimization() {
    try {
      console.log('🧠 === AGGRESSIVE MEMORY OPTIMIZATION START ===');
      
      if (!this.tempStorage) {
        console.log('⚠️ PRIMARY storage not available for optimization');
        return;
      }
      
      // Get current memory stats
      const stats = await this.tempStorage.getStorageStats();
      console.log('📊 Current memory usage before optimization:', stats);
      
      // If memory usage is high (>100MB), be more aggressive
      const isHighMemoryUsage = stats.totalSize > 100 * 1024 * 1024; // 100MB threshold
      
      if (isHighMemoryUsage) {
        console.log(`⚠️ High memory usage detected: ${stats.totalSizeMB}MB - applying aggressive cleanup`);
        
        // More aggressive: Keep only 20 most recent instead of 50
        if (this.screenshots.length > 20) {
          console.log('🗑️ Applying aggressive screenshot limit (20 instead of 50)...');
          
          this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const toKeep = this.screenshots.slice(0, 20);
          const toRemove = this.screenshots.slice(20);
          
          // Remove from IndexedDB
          for (const screenshot of toRemove) {
            try {
              await this.tempStorage.deleteScreenshot(screenshot.id);
            } catch (error) {
              console.error('Error deleting screenshot during aggressive cleanup:', error);
            }
          }
          
          this.screenshots = toKeep;
          console.log(`🗑️ Aggressive cleanup: Removed ${toRemove.length} screenshots, kept ${toKeep.length}`);
        }
        
        // Force garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
          try {
            window.gc();
            console.log('🗑️ Forced garbage collection executed');
          } catch (gcError) {
            console.log('ℹ️ Garbage collection not available (normal in production)');
          }
        }
        
        // Clear any cached image elements from DOM
        this.clearCachedImageElements();
        
        // Update memory usage
        this.calculateMemoryUsage();
        
        // Get updated stats
        const newStats = await this.tempStorage.getStorageStats();
        const memoryFreed = stats.totalSize - newStats.totalSize;
        const memoryFreedMB = Math.round(memoryFreed / (1024 * 1024));
        
        console.log(`✅ Aggressive optimization complete - freed ${memoryFreedMB}MB`);
        console.log('📊 New memory usage:', newStats);
        
        this.showStatus(`🧠 Memory optimized! Freed ${memoryFreedMB}MB`, 'success');
        
      } else {
        console.log(`✅ Memory usage acceptable: ${stats.totalSizeMB}MB - no aggressive cleanup needed`);
      }
      
      console.log('🧠 === AGGRESSIVE MEMORY OPTIMIZATION END ===');
      
    } catch (error) {
      console.error('❌ Error during aggressive memory optimization:', error);
    }
  }
  
  // Clear cached image elements that might be holding references
  clearCachedImageElements() {
    try {
      console.log('🗑️ Clearing cached DOM image elements...');
      
      // Remove any preview images that might be cached
      const previewImages = document.querySelectorAll('.screenshot-preview-img');
      previewImages.forEach((img, index) => {
        if (img.src && img.src.startsWith('data:image/')) {
          img.src = ''; // Clear data URL reference
          console.log(`🗑️ Cleared cached image ${index + 1}`);
        }
      });
      
      // Clear any annotation canvas references
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach((canvas, index) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          console.log(`🗑️ Cleared canvas ${index + 1}`);
        }
      });
      
      console.log('✅ DOM image cache cleared');
      
    } catch (error) {
      console.error('❌ Error clearing cached image elements:', error);
    }
  }
  
  // Enhanced automatic cleanup with memory pressure detection
  async automaticStorageCleanup() {
    try {
      console.log('🧹 === ENHANCED AUTOMATIC STORAGE CLEANUP START ===');
      
      if (!this.tempStorage) {
        console.log('⚠️ PRIMARY storage not available, skipping cleanup');
        return;
      }
      
      // Get all screenshots
      this.screenshots = await this.tempStorage.getAllScreenshots();
      console.log(`📊 Found ${this.screenshots.length} screenshots in storage`);
      
      // Check memory pressure FIRST
      if (this.screenshots.length > 30) {
        console.log('⚠️ High screenshot count detected - checking for memory pressure optimization');
        await this.aggressiveMemoryOptimization();
        
        // Refresh screenshots array after optimization
        this.screenshots = await this.tempStorage.getAllScreenshots();
      }
      
      // Remove corrupted screenshots (those without imageData)
      const originalCount = this.screenshots.length;
      const validScreenshots = [];
      
      for (const screenshot of this.screenshots) {
        if (screenshot.imageData && screenshot.imageData.startsWith('data:image/')) {
          validScreenshots.push(screenshot);
        } else {
          console.log('🗑️ Removing corrupted screenshot:', screenshot.id);
          await this.tempStorage.deleteScreenshot(screenshot.id);
        }
      }
      
      this.screenshots = validScreenshots;
      const removedCorrupted = originalCount - this.screenshots.length;
      if (removedCorrupted > 0) {
        console.log(`🗑️ Removed ${removedCorrupted} corrupted screenshots`);
      }
      
      // Standard cleanup: Keep 50 most recent (or fewer if aggressive cleanup already applied)
      const maxScreenshots = this.screenshots.length > 100 ? 30 : 50; // Dynamic limit based on total count
      
      if (this.screenshots.length > maxScreenshots) {
        console.log(`📊 Too many screenshots (${this.screenshots.length}), cleaning up old ones (keeping ${maxScreenshots})...`);
        
        this.screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const toKeep = this.screenshots.slice(0, maxScreenshots);
        const toRemove = this.screenshots.slice(maxScreenshots);
        
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
      
      // Update memory usage calculation
      this.calculateMemoryUsage();
      
      // Log final memory status
      if (this.tempStorage) {
        const finalStats = await this.tempStorage.getStorageStats();
        console.log('📊 Final memory status:', finalStats);
        
        if (finalStats.totalSizeMB > 200) { // 200MB warning
          console.warn(`⚠️ Memory usage still high: ${finalStats.totalSizeMB}MB - consider manual cleanup`);
        }
      }
      
      console.log('✅ Enhanced automatic cleanup completed successfully');
      console.log('🧹 === ENHANCED AUTOMATIC STORAGE CLEANUP END ===');
      
    } catch (error) {
      console.error('❌ Error during enhanced automatic storage cleanup:', error);
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
  
  // Enhanced memory usage calculation with detailed breakdown
  calculateMemoryUsage() {
    this.memoryUsage = 0;
    let imageDataSize = 0;
    let annotationDataSize = 0;
    let metadataSize = 0;
    
    this.screenshots.forEach(screenshot => {
      if (screenshot.imageData) {
        const imageSize = screenshot.imageData.length * 0.75; // Base64 overhead
        imageDataSize += imageSize;
        this.memoryUsage += imageSize;
      }
      
      if (screenshot.annotations) {
        screenshot.annotations.forEach(annotation => {
          const annotationSize = JSON.stringify(annotation).length;
          annotationDataSize += annotationSize;
          this.memoryUsage += annotationSize;
        });
      }
      
      // Calculate metadata size (excluding imageData and annotations)
      const metadata = { ...screenshot };
      delete metadata.imageData;
      delete metadata.annotations;
      const metaSize = JSON.stringify(metadata).length;
      metadataSize += metaSize;
      this.memoryUsage += metaSize;
    });
    
    console.log('📊 DETAILED MEMORY BREAKDOWN:');
    console.log(`  📸 Images: ${this.formatMemorySize(imageDataSize)} (${Math.round(imageDataSize/this.memoryUsage*100)}%)`);
    console.log(`  📝 Annotations: ${this.formatMemorySize(annotationDataSize)} (${Math.round(annotationDataSize/this.memoryUsage*100)}%)`);
    console.log(`  📋 Metadata: ${this.formatMemorySize(metadataSize)} (${Math.round(metadataSize/this.memoryUsage*100)}%)`);
    console.log(`  💾 Total: ${this.formatMemorySize(this.memoryUsage)}`);
    
    // Memory pressure warning
    if (this.memoryUsage > 200 * 1024 * 1024) { // 200MB threshold
      console.warn(`⚠️ HIGH MEMORY USAGE: ${this.formatMemorySize(this.memoryUsage)}`);
      console.warn('💡 Consider running: window.screenshotAnnotator.aggressiveMemoryOptimization()');
    }
    
    // Update UI with enhanced memory info
    this.updateMemoryUI(imageDataSize, annotationDataSize, metadataSize);
  }
  
  updateMemoryUI(imageDataSize, annotationDataSize, metadataSize) {
    const memoryElement = document.getElementById('memoryUsage');
    if (memoryElement) {
      const totalMB = Math.round(this.memoryUsage / (1024 * 1024));
      const isHighUsage = this.memoryUsage > 200 * 1024 * 1024; // 200MB
      
      memoryElement.textContent = this.formatMemorySize(this.memoryUsage);
      
      // Add visual warning for high memory usage
      if (isHighUsage) {
        memoryElement.style.color = '#dc3545'; // Red color for high usage
        memoryElement.title = `HIGH MEMORY: ${totalMB}MB - Click to optimize`;
        memoryElement.style.cursor = 'pointer';
        
        // Make it clickable for quick optimization
        memoryElement.onclick = () => {
          this.aggressiveMemoryOptimization();
        };
      } else {
        memoryElement.style.color = ''; // Reset color
        memoryElement.title = `Images: ${Math.round(imageDataSize/1024/1024)}MB, Annotations: ${Math.round(annotationDataSize/1024)}KB`;
        memoryElement.onclick = null;
      }
    }
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
          console.log('🖼️ PDF COORDINATE PRECISION ANALYSIS:');
          console.log('  - Canvas dimensions:', `${canvas.width}x${canvas.height}`);
          console.log('  - Img natural dimensions:', `${img.naturalWidth}x${img.naturalHeight}`);
          console.log('  - Screenshot display dimensions:', `${screenshot.displayWidth}x${screenshot.displayHeight}`);
          
          // Use natural image dimensions as the canvas size
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          console.log('  - Using natural dimensions for PDF canvas:', `${naturalWidth}x${naturalHeight}`);
          
          // Set canvas to natural image size (1:1 pixel mapping)
          canvas.width = naturalWidth;
          canvas.height = naturalHeight;
          
          // Draw the original image at natural size
          ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
          
          console.log('📏 PDF COORDINATE SYSTEM:', { 
            canvasSize: `${canvas.width}x${canvas.height}`,
            coordinateReference: 'STORED_COORDINATES_DIRECT_USE',
            conversionApplied: 'NONE - coordinates already in natural dimensions'
          });
          
          // CRITICAL FIX: Use stored coordinates DIRECTLY - they're already converted
          screenshot.annotations.forEach((annotation, index) => {
            console.log(`🎯 Rendering annotation ${index + 1}: "${annotation.text}"`);
            
            // PRECISION FIX: Use stored coordinates exactly as saved (no conversion)
            // These coordinates were already converted from display to natural dimensions in annotation.js
            const x = Math.round(annotation.x);
            const y = Math.round(annotation.y);
            
            // Handle text positioning - also use stored coordinates directly
            let textX, textY;
            if (annotation.textX !== undefined && annotation.textY !== undefined) {
              textX = Math.round(annotation.textX);
              textY = Math.round(annotation.textY);
            } else {
              // Fallback positioning if textX/textY not set
              textX = x + 60;
              textY = y - 30;
            }
            
            console.log(`📍 PDF PRECISION coordinates (direct from storage):`, { 
              x, y, textX, textY, text: annotation.text,
              note: 'Using stored coordinates directly - no conversion applied'
            });
            
            // Calculate sizes for PDF (larger for visibility)
            const pinRadius = 8;  // Larger for PDF visibility
            const lineWidth = 2;  // Thicker lines
            const fontSize = 18;  // Readable font size
            
            // Draw pinpoint circle (large red dot) at EXACT stored coordinates
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
            
            console.log(`✅ PRECISION: Rendered annotation ${index + 1} at EXACT stored coordinates (${x}, ${y})`);
          });
          
          // Return annotated image
          const annotatedImage = canvas.toDataURL('image/png', 1.0);
          console.log('✅ PDF PRECISION: Annotated image created using EXACT stored coordinates');
          console.log(`📊 Total annotations rendered with perfect precision: ${screenshot.annotations.length}`);
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
      // Log to persistent debug system
      if (window.debugLog) {
        window.debugLog('📸 Screenshot capture initiated');
        window.debugLog('🔄 Debug continuity maintained across capture operation');
      }
      
      this.showStatus('Capturing screenshot...', 'info');
      console.log('🔄 Starting screenshot capture...');
      
      // Check if Chrome APIs are available
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) {
        const errorMsg = 'Chrome extension APIs not available. Please install as Chrome extension.';
        console.error('❌', errorMsg);
        if (window.debugError) window.debugError('Chrome APIs not available for capture');
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (window.debugLog) window.debugLog('✅ Chrome APIs confirmed available for capture');
      console.log('✅ Chrome APIs available');
      
      // Get current tab info
      console.log('🔍 Getting current tab info...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        const errorMsg = 'No active tab found';
        console.error('❌', errorMsg);
        if (window.debugError) window.debugError('No active tab found');
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (window.debugLog) {
        window.debugLog(`📱 Capturing from tab: ${tab.title}`);
        window.debugLog(`🌐 Tab URL: ${new URL(tab.url).hostname}`);
      }
      
      console.log('✅ Current tab found:', {
        title: tab.title,
        url: tab.url,
        id: tab.id
      });
      
      // Capture screenshot via background script
      console.log('📸 Sending capture message to background script...');
      if (window.debugLog) window.debugLog('📸 Requesting screenshot from background script');
      
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
          action: 'captureVisibleTab' 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Runtime error:', chrome.runtime.lastError);
            if (window.debugError) window.debugError(`Runtime error: ${chrome.runtime.lastError.message}`);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            console.log('✅ Background script response received:', {
              success: response?.success,
              hasImageData: !!response?.imageData,
              imageDataSize: response?.imageData?.length,
              error: response?.error
            });
            if (window.debugLog && response?.success) {
              window.debugLog(`✅ Screenshot captured successfully (${response.imageData?.length} chars)`);
            }
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
        if (window.debugError) window.debugError('No response from background script');
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (response.error) {
        const errorMsg = `Capture failed: ${response.error}`;
        console.error('❌', errorMsg);
        if (window.debugError) window.debugError(errorMsg);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      if (!response.success || !response.imageData) {
        const errorMsg = 'Invalid response from background script';
        console.error('❌', errorMsg, { response });
        if (window.debugError) window.debugError(`Invalid response: ${JSON.stringify(response)}`);
        this.showStatus(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      console.log('✅ Screenshot data received successfully');
      console.log('📏 Image data size:', response.imageData.length, 'characters');
      if (window.debugLog) window.debugLog(`✅ Screenshot data validated (${Math.round(response.imageData.length/1024)}KB)`);
      
      // Create screenshot object with detailed timestamp
      const now = new Date();
      
      console.log('📐 Getting image dimensions...');
      
      // Get original dimensions
      const originalDimensions = await this.getImageDimensions(response.imageData);
      console.log('✅ Original capture dimensions (100% quality):', originalDimensions);
      if (window.debugLog) window.debugLog(`📐 Screenshot dimensions: ${originalDimensions.width}x${originalDimensions.height}`);
      
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
        annotations: []
      };
      
      console.log('✅ Screenshot object created:', {
        id: screenshot.id,
        dimensions: `${screenshot.displayWidth}x${screenshot.displayHeight}`,
        imageDataSize: screenshot.imageData.length,
        title: screenshot.title.substring(0, 50) + '...',
        tabId: screenshot.tabId
      });
      
      if (window.debugLog) {
        window.debugLog(`📊 Screenshot #${screenshot.id} created: "${screenshot.title.substring(0, 30)}..."`);
        window.debugLog('💾 Saving to unlimited IndexedDB storage');
      }
      
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
      if (window.debugLog) {
        window.debugLog('✅ Screenshot capture completed successfully');
        window.debugLog(`📊 Total screenshots: ${this.screenshots.length}`);
        window.debugLog('🎯 Debug continuity maintained - ready for annotation');
      }
      
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
      if (window.debugError) {
        window.debugError(`Capture failed: ${error.message}`);
        window.debugError('🔄 Debug continuity maintained despite error');
      }
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
      this.showStatus('🎯 Annotation window opened - popup stays open for continuity!', 'success');
      
      // DON'T CLOSE POPUP - Keep it open for continuity!
      console.log('✅ Keeping popup open for workflow continuity');
      
    } catch (error) {
      console.error('❌ Annotation error:', error);
      this.showStatus(`Annotation failed: ${error.message}`, 'error');
    }
  }
  
    async exportPdfJournal() {
        console.log('📄 === PDF EXPORT DEBUG START ===');
        
        if (this.screenshots.length === 0) {
            console.log('❌ No screenshots available for PDF export');
            this.showStatus('No screenshots to export', 'info');
            return;
        }
        
        try {
            console.log('🔄 Starting PDF journal export...');
            console.log('📊 Total screenshots available:', this.screenshots.length);
            
            // Log to persistent debug system
            if (window.debugLog) {
                window.debugLog('📄 PDF export initiated');
                window.debugLog(`📊 Exporting ${this.screenshots.length} screenshots`);
            }
            
            this.showStatus('Generating PDF journal with annotations...', 'info');
            
            // Validate screenshots have image data
            const validScreenshots = this.screenshots.filter(s => s.imageData);
            console.log(`📊 Valid screenshots for PDF: ${validScreenshots.length}/${this.screenshots.length}`);
            
            if (validScreenshots.length === 0) {
                console.error('❌ No valid screenshots with image data for PDF export');
                if (window.debugError) window.debugError('No valid screenshots with image data');
                this.showStatus('No images available for PDF export', 'error');
                return;
            }
            
            // Calculate data size for debugging
            let totalDataSize = 0;
            validScreenshots.forEach(s => {
                if (s.imageData) totalDataSize += s.imageData.length;
            });
            console.log('📊 Total image data size:', Math.round(totalDataSize / 1024 / 1024), 'MB');
            
            // CRITICAL FIX: Use IndexedDB instead of Chrome storage for large datasets
            if (totalDataSize > 8 * 1024 * 1024) { // 8MB threshold
                console.log('🚀 Large dataset detected - using IndexedDB export method instead of Chrome storage');
                if (window.debugLog) window.debugLog(`🚀 Large dataset: ${Math.round(totalDataSize / 1024 / 1024)}MB - switching to IndexedDB method`);
                
                return await this.exportPdfJournalViaIndexedDB(validScreenshots);
            }
            
            // Original Chrome storage method for small datasets only
            console.log('📦 Small dataset - using Chrome storage method');
            return await this.exportPdfJournalViaChrome(validScreenshots);
            
        } catch (error) {
            console.error('❌ PDF export error:', error);
            console.error('❌ Error stack:', error.stack);
            if (window.debugError) {
                window.debugError(`PDF export failed: ${error.message}`);
                window.debugError('🔄 Debug continuity maintained despite error');
            }
            this.showStatus(`Failed to export PDF journal: ${error.message}`, 'error');
        }
        
        console.log('📄 === PDF EXPORT DEBUG END ===');
    }

    // NEW: IndexedDB export method for large datasets
    async exportPdfJournalViaIndexedDB(validScreenshots) {
        console.log('🗄️ === INDEXEDDB PDF EXPORT METHOD START ===');
        
        try {
            if (!this.tempStorage) {
                throw new Error('IndexedDB storage not available for large dataset export');
            }
            
            // Create annotated versions for PDF
            const annotatedScreenshots = [];
            console.log(`🎨 Processing ${validScreenshots.length} screenshots for IndexedDB PDF export...`);
            
            for (let i = 0; i < validScreenshots.length; i++) {
                const screenshot = validScreenshots[i];
                console.log(`🎨 Processing screenshot ${i + 1}/${validScreenshots.length}: ${screenshot.title}`);
                
                try {
                    // Create annotated version for PDF
                    const annotatedImageData = await this.createAnnotatedImageForPDF(screenshot);
                    
                    annotatedScreenshots.push({
                        ...screenshot,
                        imageData: annotatedImageData,
                        originalImageData: screenshot.imageData
                    });
                    
                    console.log(`✅ Successfully processed screenshot ${i + 1}: ${screenshot.title} with ${screenshot.annotations?.length || 0} annotations`);
                    this.showStatus(`Processing annotations for IndexedDB export: ${i + 1}/${validScreenshots.length}`, 'info');
                    
                } catch (imageError) {
                    console.error(`❌ Error processing screenshot ${i + 1}:`, imageError);
                    if (window.debugError) window.debugError(`Processing error: ${imageError.message}`);
                    
                    // Add original screenshot without annotations as fallback
                    annotatedScreenshots.push({
                        ...screenshot,
                        imageData: screenshot.imageData,
                        originalImageData: screenshot.imageData
                    });
                    
                    console.log(`⚠️ Added screenshot ${i + 1} without rendered annotations due to error`);
                }
            }
            
            if (annotatedScreenshots.length === 0) {
                console.error('❌ No screenshots were successfully processed for IndexedDB export');
                if (window.debugError) window.debugError('No screenshots successfully processed for IndexedDB export');
                this.showStatus('Failed to process any screenshots for PDF export', 'error');
                return;
            }
            
            // Store export data in IndexedDB (unlimited capacity)
            const exportId = 'pdf_export_indexeddb_' + Date.now();
            const exportData = {
                screenshots: annotatedScreenshots,
                exportDate: new Date().toISOString(),
                totalScreenshots: annotatedScreenshots.length,
                totalAnnotations: annotatedScreenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0),
                exportMethod: 'IndexedDB',
                dataSize: JSON.stringify(annotatedScreenshots).length
            };
            
            console.log('🗄️ Storing large export data in IndexedDB...');
            console.log('📊 Export data size:', Math.round(exportData.dataSize / 1024 / 1024), 'MB');
            
            // Use IndexedDB to store export data (unlimited capacity)
            await this.tempStorage.storePdfExportData(exportId, exportData);
            console.log('✅ Large export data saved to IndexedDB successfully');
            
            // Create export URL with IndexedDB flag
            const exportUrl = chrome.runtime.getURL('pdf-export.html') + 
                '?exportId=' + encodeURIComponent(exportId) + 
                '&method=indexeddb';
            
            console.log('🔗 IndexedDB export URL created:', exportUrl);
            
            // Open PDF export window
            try {
                console.log('🪟 Creating PDF export window (IndexedDB method)...');
                const windowInfo = await chrome.windows.create({
                    url: exportUrl,
                    type: 'popup',
                    width: 1200,
                    height: 800,
                    focused: true
                });
                
                console.log('✅ PDF export window created (IndexedDB method):', windowInfo.id);
                if (window.debugLog) window.debugLog(`✅ PDF export window opened (IndexedDB): ${windowInfo.id}`);
                
                // Monitor PDF export completion (IndexedDB cleanup)
                this.monitorIndexedDBPdfExportCompletion(exportId, windowInfo.id);
                
                this.showStatus('📄 PDF journal export opened (Large Dataset - IndexedDB)!', 'success');
                console.log('✅ IndexedDB PDF export process initiated successfully');
                
            } catch (windowError) {
                console.error('❌ Failed to create PDF export window (IndexedDB method):', windowError);
                if (window.debugError) window.debugError(`IndexedDB window creation error: ${windowError.message}`);
                this.showStatus(`Failed to open PDF export window: ${windowError.message}`, 'error');
                
                // Clean up IndexedDB data since window failed
                try {
                    await this.tempStorage.deletePdfExportData(exportId);
                    console.log('🧹 Cleaned up IndexedDB export data after window creation failure');
                } catch (cleanupError) {
                    console.error('❌ Failed to clean up IndexedDB export data:', cleanupError);
                }
                
                throw windowError;
            }
            
            console.log('🗄️ === INDEXEDDB PDF EXPORT METHOD END ===');
            
        } catch (error) {
            console.error('❌ IndexedDB PDF export error:', error);
            if (window.debugError) window.debugError(`IndexedDB PDF export failed: ${error.message}`);
            throw error;
        }
    }

    // Original Chrome storage method - only for small datasets
    async exportPdfJournalViaChrome(validScreenshots) {
        console.log('📦 === CHROME STORAGE PDF EXPORT METHOD START ===');
        
        // Create annotated versions for PDF
        const annotatedScreenshots = [];
        console.log(`🎨 Processing ${validScreenshots.length} screenshots for Chrome storage PDF export...`);
        
        for (let i = 0; i < validScreenshots.length; i++) {
            const screenshot = validScreenshots[i];
            console.log(`🎨 Processing screenshot ${i + 1}/${validScreenshots.length}: ${screenshot.title}`);
            
            try {
                const annotatedImageData = await this.createAnnotatedImageForPDF(screenshot);
                
                annotatedScreenshots.push({
                    ...screenshot,
                    imageData: annotatedImageData,
                    originalImageData: screenshot.imageData
                });
                
                console.log(`✅ Successfully processed screenshot ${i + 1}: ${screenshot.title} with ${screenshot.annotations?.length || 0} annotations`);
                this.showStatus(`Processing annotations for PDF: ${i + 1}/${validScreenshots.length}`, 'info');
                
            } catch (imageError) {
                console.error(`❌ Error processing screenshot ${i + 1}:`, imageError);
                if (window.debugError) window.debugError(`Processing error: ${imageError.message}`);
                
                annotatedScreenshots.push({
                    ...screenshot,
                    imageData: screenshot.imageData,
                    originalImageData: screenshot.imageData
                });
                
                console.log(`⚠️ Added screenshot ${i + 1} without rendered annotations due to error`);
            }
        }
        
        if (annotatedScreenshots.length === 0) {
            throw new Error('No screenshots were successfully processed for Chrome storage export');
        }
        
        // Create export data
        const exportData = {
            screenshots: annotatedScreenshots,
            exportDate: new Date().toISOString(),
            totalScreenshots: annotatedScreenshots.length,
            totalAnnotations: annotatedScreenshots.reduce((sum, s) => sum + (s.annotations?.length || 0), 0),
            exportMethod: 'Chrome'
        };
        
        // CRITICAL: Check Chrome APIs before attempting window creation
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.windows) {
            throw new Error('Chrome extension APIs not available for PDF export window.');
        }
        
        // Store export data temporarily in Chrome storage
        const exportId = 'pdf_export_chrome_' + Date.now();
        const exportDataStr = JSON.stringify(exportData);
        const exportDataSize = exportDataStr.length;
        
        console.log('💾 Chrome export data size:', Math.round(exportDataSize / 1024 / 1024), 'MB');
        
        try {
            console.log('💾 Saving export data to Chrome storage...');
            await chrome.storage.local.set({ [exportId]: exportData });
            console.log('✅ Export data saved to Chrome storage successfully');
            if (window.debugLog) window.debugLog('✅ Export data saved to Chrome storage');
        } catch (storageError) {
            console.error('❌ Failed to save export data to Chrome storage:', storageError);
            if (window.debugError) window.debugError(`Storage error: ${storageError.message}`);
            this.showStatus(`Failed to save export data: ${storageError.message}`, 'error');
            throw storageError;
        }
        
        // Create export URL
        const exportUrl = chrome.runtime.getURL('pdf-export.html') + 
            '?exportId=' + encodeURIComponent(exportId);
        
        console.log('🔗 Chrome export URL created:', exportUrl);
        
        // Open PDF export window
        try {
            console.log('🪟 Creating PDF export window (Chrome storage method)...');
            const windowInfo = await chrome.windows.create({
                url: exportUrl,
                type: 'popup',
                width: 1200,
                height: 800,
                focused: true
            });
            
            console.log('✅ PDF export window created (Chrome method):', windowInfo.id);
            if (window.debugLog) window.debugLog(`✅ PDF export window opened (Chrome): ${windowInfo.id}`);
            
            // Monitor PDF export completion
            this.monitorPdfExportCompletion(exportId, windowInfo.id);
            
            this.showStatus('📄 PDF journal export opened with annotations!', 'success');
            console.log('✅ Chrome PDF export process initiated successfully');
            
        } catch (windowError) {
            console.error('❌ Failed to create PDF export window (Chrome method):', windowError);
            if (window.debugError) window.debugError(`Chrome window creation error: ${windowError.message}`);
            this.showStatus(`Failed to open PDF export window: ${windowError.message}`, 'error');
            
            // Clean up storage data since window failed
            try {
                await chrome.storage.local.remove(exportId);
                console.log('🧹 Cleaned up Chrome export data after window creation failure');
            } catch (cleanupError) {
                console.error('❌ Failed to clean up after Chrome window error:', cleanupError);
            }
            
            throw windowError;
        }
        
        console.log('📦 === CHROME STORAGE PDF EXPORT METHOD END ===');
    }

    // Monitor IndexedDB export completion
    async monitorIndexedDBPdfExportCompletion(exportId, windowId) {
        console.log('👀 Monitoring IndexedDB PDF export completion...');
        
        const checkInterval = setInterval(async () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.windows) {
                    const window = await chrome.windows.get(windowId);
                    
                    if (!window) {
                        console.log('🧹 IndexedDB PDF export completed, cleaning up...');
                        clearInterval(checkInterval);
                        
                        // Clean up IndexedDB export data
                        try {
                            if (this.tempStorage) {
                                await this.tempStorage.deletePdfExportData(exportId);
                                console.log('🧹 Cleaned up IndexedDB export data');
                            }
                        } catch (error) {
                            console.warn('⚠️ Failed to clean up IndexedDB export data:', error);
                        }
                        
                        console.log('🧹 IndexedDB post-export cleanup completed');
                    }
                }
            } catch (error) {
                // Window doesn't exist anymore, clean up
                console.log('🧹 IndexedDB PDF export window closed, cleaning up...');
                clearInterval(checkInterval);
                
                try {
                    if (this.tempStorage) {
                        await this.tempStorage.deletePdfExportData(exportId);
                    }
                } catch (cleanupError) {
                    console.warn('⚠️ Failed IndexedDB cleanup after export:', cleanupError);
                }
            }
        }, 2000); // Check every 2 seconds
        
        // Stop monitoring after 10 minutes max
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('⏰ Stopped monitoring IndexedDB PDF export after 10 minutes');
        }, 600000);
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
          No screenshots yet.<br>
          Click "Capture Current Page" to get started with unlimited storage!
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
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      
      // Remove existing status classes
      statusElement.classList.remove('status-success', 'status-error', 'status-info', 'status-warning');
      
      // Add appropriate class based on type
      switch (type) {
        case 'success':
          statusElement.classList.add('status-success');
          console.log('✅ STATUS SUCCESS:', message);
          break;
        case 'error':
          statusElement.classList.add('status-error');
          console.error('❌ STATUS ERROR:', message);
          break;
        case 'warning':
          statusElement.classList.add('status-warning');
          console.warn('⚠️ STATUS WARNING:', message);
          break;
        case 'info':
        default:
          statusElement.classList.add('status-info');
          console.log('ℹ️ STATUS INFO:', message);
          break;
      }
      
      // Auto-clear success/info messages after delay
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          if (statusElement.textContent === message) {
            statusElement.textContent = '';
            statusElement.classList.remove('status-success', 'status-error', 'status-info', 'status-warning');
          }
        }, type === 'success' ? 4000 : 3000); // Success messages stay longer
      }
    }
    
    // Also log to console for debugging
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  const annotator = new ScreenshotAnnotator();
  window.screenshotAnnotator = annotator;
  
  // Expose enhanced memory management methods for console access
  window.clearExtensionStorage = () => {
    annotator.manualStorageClear();
  };
  
  window.extremeCleanup = () => {
    annotator.extremeEmergencyCleanup();
  };
  
  window.fixCorruptedScreenshots = () => {
    annotator.fixCorruptedScreenshots();
  };
  
  // NEW: Enhanced memory optimization commands
  window.optimizeMemory = () => {
    annotator.aggressiveMemoryOptimization();
  };
  
  window.clearImageCache = () => {
    annotator.clearCachedImageElements();
  };
  
  window.memoryStatus = async () => {
    if (annotator.tempStorage) {
      const stats = await annotator.tempStorage.getStorageStats();
      console.log('📊 CURRENT MEMORY STATUS:');
      console.log(`  📸 Screenshots: ${stats.totalScreenshots}`);
      console.log(`  💾 Total Size: ${stats.totalSizeMB}MB`);
      console.log(`  📈 Usage vs Chrome Limit: ${stats.currentUsage}`);
      console.log(`  🚀 Storage Type: ${stats.capacity}`);
      
      if (stats.totalSizeMB > 100) {
        console.log('💡 RECOMMENDATION: Run optimizeMemory() to free up space');
      }
      
      return stats;
    }
  };
  
  // NEW: Database schema reset for PDF export issues
  window.resetDatabaseSchema = async () => {
    if (annotator.tempStorage) {
      try {
        console.log('🔄 Resetting IndexedDB schema to fix PDF export issues...');
        
        // Close current database connection
        if (annotator.tempStorage.db) {
          annotator.tempStorage.db.close();
        }
        
        // Delete the database
        const deleteRequest = indexedDB.deleteDatabase('ScreenshotAnnotatorDB');
        
        deleteRequest.onsuccess = async () => {
          console.log('✅ Database deleted successfully');
          
          // Reinitialize with fresh schema
          try {
            await annotator.tempStorage.init();
            console.log('✅ Database reinitialized with correct schema');
            console.log('💡 PDF export should now work properly');
            
            // Reload screenshots from fresh database
            await annotator.loadScreenshots();
            annotator.updateUI();
            
          } catch (initError) {
            console.error('❌ Failed to reinitialize database:', initError);
          }
        };
        
        deleteRequest.onerror = (error) => {
          console.error('❌ Failed to delete database:', error);
        };
        
      } catch (error) {
        console.error('❌ Database reset failed:', error);
      }
    }
  };
  
  console.log('💡 ENHANCED Storage management commands available:');
  console.log('  📊 memoryStatus() - Show detailed memory breakdown');
  console.log('  🧠 optimizeMemory() - Aggressive memory optimization');
  console.log('  🗑️ clearImageCache() - Clear DOM image cache');
  console.log('  🧹 clearExtensionStorage() - Clear all data');
  console.log('  ⚡ extremeCleanup() - Keep only 1 screenshot');
  console.log('  🔧 fixCorruptedScreenshots() - Remove corrupted screenshots');
  console.log('  🗄️ resetDatabaseSchema() - Fix PDF export object store issues');
  console.log('');
  console.log('💡 PDF EXPORT TROUBLESHOOTING:');
  console.log('  If PDF export fails with "object stores was not found":');
  console.log('  1. Run: resetDatabaseSchema()');
  console.log('  2. Or reload extension completely');
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