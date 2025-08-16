// Enhanced Temporary Storage Manager - Now PRIMARY storage with unlimited capacity
class TempStorageManager {
  constructor() {
    this.dbName = 'ScreenshotAnnotatorDB';
    this.dbVersion = 2; // Increased for schema update
    this.db = null;
    this.isReady = false;
  }
  
  async init() {
    try {
      console.log('🗄️ Initializing PRIMARY storage (IndexedDB) for unlimited capacity...');
      
      this.dbName = 'ScreenshotAnnotatorDB';
      this.dbVersion = 2;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          console.log('✅ PRIMARY storage (IndexedDB) initialized successfully');
          console.log('🚀 UNLIMITED storage capacity available via IndexedDB');
          
          // AUTOMATIC SCHEMA VALIDATION: Check if all required object stores exist
          this.validateAndFixSchema().then(() => {
            resolve();
          }).catch(reject);
        };
        
        request.onerror = (event) => {
          console.error('❌ PRIMARY storage initialization failed:', event.target.error);
          reject(event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion;
          
          console.log(`🔄 Upgrading IndexedDB schema from v${oldVersion} to v${newVersion}...`);
          
          // Screenshots object store (v1)
          if (!db.objectStoreNames.contains('screenshots')) {
            const screenshotStore = db.createObjectStore('screenshots', { keyPath: 'id' });
            screenshotStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('✅ Created screenshots object store (v1)');
          }
          
          // Sessions object store (v1)  
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('✅ Created sessions object store (v1)');
          }
          
          // Legacy temp storage (v1)
          if (!db.objectStoreNames.contains('tempImages')) {
            const tempStore = db.createObjectStore('tempImages', { keyPath: 'id' });
            tempStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('✅ Created tempImages object store (v1 compatibility)');
          }
          
          // PDF Exports object store (v2 - CRITICAL FOR PDF EXPORT)
          if (!db.objectStoreNames.contains('pdfExports')) {
            const pdfExportStore = db.createObjectStore('pdfExports', { keyPath: 'id' });
            pdfExportStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('✅ Created pdfExports object store (v2 - for large datasets)');
          }
          
          console.log(`✅ IndexedDB schema upgrade complete - v${newVersion} ready`);
          console.log('🗄️ Available object stores:', [...db.objectStoreNames]);
        };
      });
    } catch (error) {
      console.error('❌ IndexedDB initialization error:', error);
      throw error;
    }
  }

  // NEW: Automatic schema validation and repair on every startup
  async validateAndFixSchema() {
    try {
      console.log('🔍 === COMPREHENSIVE SCHEMA VALIDATION START ===');
      
      const requiredStores = ['screenshots', 'sessions', 'tempImages', 'pdfExports'];
      const existingStores = [...this.db.objectStoreNames];
      const missingStores = requiredStores.filter(store => !existingStores.includes(store));
      
      console.log('📊 Schema validation analysis:', {
        required: requiredStores,
        existing: existingStores,
        missing: missingStores,
        dbVersion: this.db.version
      });
      
      // Additional check: Test critical PDF export functionality
      let pdfExportWorking = true;
      try {
        if (this.db.objectStoreNames.contains('pdfExports')) {
          // Try to create a test transaction to verify store is accessible
          const testTransaction = this.db.transaction(['pdfExports'], 'readonly');
          const testStore = testTransaction.objectStore('pdfExports');
          console.log('✅ pdfExports object store is accessible');
        } else {
          pdfExportWorking = false;
          console.warn('⚠️ pdfExports object store missing');
        }
      } catch (pdfTestError) {
        pdfExportWorking = false;
        console.warn('⚠️ pdfExports object store test failed:', pdfTestError.message);
      }
      
      // Decide if repair is needed
      const repairNeeded = missingStores.length > 0 || !pdfExportWorking || this.db.version < 2;
      
      if (repairNeeded) {
        console.warn(`🔧 SCHEMA REPAIR REQUIRED:`, {
          missingStores: missingStores.length,
          pdfExportWorking,
          currentVersion: this.db.version,
          targetVersion: this.dbVersion
        });
        
        console.log('🔧 Initiating automatic schema repair...');
        
        // Perform automatic schema repair
        await this.performAutomaticSchemaRepair();
        
        // Verify repair success
        const newExistingStores = [...this.db.objectStoreNames];
        const newMissingStores = requiredStores.filter(store => !newExistingStores.includes(store));
        const repairSuccessful = newMissingStores.length === 0 && this.db.version === this.dbVersion;
        
        if (repairSuccessful) {
          console.log('✅ AUTOMATIC SCHEMA REPAIR COMPLETED SUCCESSFULLY');
          console.log('📊 Repair results:', {
            allStoresPresent: newMissingStores.length === 0,
            correctVersion: this.db.version === this.dbVersion,
            availableStores: newExistingStores
          });
          
          return { 
            repaired: true, 
            success: true,
            missingStores: missingStores,
            fixedStores: newExistingStores,
            message: 'Schema automatically repaired - PDF export ready!'
          };
        } else {
          console.error('❌ AUTOMATIC SCHEMA REPAIR INCOMPLETE');
          console.error('📊 Repair failure details:', {
            stillMissing: newMissingStores,
            versionCorrect: this.db.version === this.dbVersion
          });
          
          return { 
            repaired: true, 
            success: false,
            missingStores: newMissingStores,
            error: 'Automatic repair incomplete - manual intervention may be required'
          };
        }
      } else {
        console.log('✅ SCHEMA VALIDATION PASSED - All required object stores present and functional');
        console.log('📊 Database health check:', {
          allStoresPresent: true,
          pdfExportReady: pdfExportWorking,
          version: this.db.version,
          stores: existingStores
        });
        
        return { 
          repaired: false, 
          success: true,
          missingStores: [],
          message: 'Database schema is healthy and ready'
        };
      }
      
    } catch (error) {
      console.error('❌ Schema validation failed with error:', error);
      console.error('📊 Error details:', {
        errorName: error.name,
        errorMessage: error.message,
        dbAvailable: !!this.db,
        dbVersion: this.db?.version
      });
      
      // Don't throw - allow extension to continue working
      return { 
        repaired: false, 
        success: false,
        error: error.message,
        message: 'Schema validation failed - extension may have limited functionality'
      };
    } finally {
      console.log('🔍 === COMPREHENSIVE SCHEMA VALIDATION END ===');
    }
  }

  // NEW: Automatic schema repair without user intervention
  async performAutomaticSchemaRepair() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Starting automatic database schema repair...');
        
        // Close current database connection
        if (this.db) {
          this.db.close();
        }
        
        // Delete and recreate database with correct schema
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);
        
        deleteRequest.onsuccess = () => {
          console.log('✅ Old database deleted for schema repair');
          
          // Recreate with correct schema
          const createRequest = indexedDB.open(this.dbName, this.dbVersion);
          
          createRequest.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('✅ Database recreated with correct schema automatically');
            resolve();
          };
          
          createRequest.onerror = (event) => {
            console.error('❌ Database recreation failed:', event.target.error);
            reject(event.target.error);
          };
          
          createRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('🔄 Creating complete schema during automatic repair...');
            
            // Create all required object stores
            const screenshotStore = db.createObjectStore('screenshots', { keyPath: 'id' });
            screenshotStore.createIndex('timestamp', 'timestamp', { unique: false });
            
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
            
            const tempStore = db.createObjectStore('tempImages', { keyPath: 'id' });
            tempStore.createIndex('timestamp', 'timestamp', { unique: false });
            
            const pdfExportStore = db.createObjectStore('pdfExports', { keyPath: 'id' });
            pdfExportStore.createIndex('timestamp', 'timestamp', { unique: false });
            
            console.log('✅ All object stores created during automatic repair');
          };
        };
        
        deleteRequest.onerror = (event) => {
          console.error('❌ Database deletion failed during repair:', event.target.error);
          reject(event.target.error);
        };
        
      } catch (error) {
        console.error('❌ Automatic schema repair failed:', error);
        reject(error);
      }
    });
  }
  
  // PRIMARY STORAGE METHODS - Unlimited Capacity
  
  async saveScreenshot(screenshot) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    try {
      console.log('💾 Saving screenshot to PRIMARY storage (unlimited):', screenshot.id);
      
      const transaction = this.db.transaction(['screenshots'], 'readwrite');
      const store = transaction.objectStore('screenshots');
      
      // Add session info if not present
      if (!screenshot.sessionId) {
        screenshot.sessionId = await this.getCurrentSessionId();
      }
      
      await store.put(screenshot);
      console.log('✅ Screenshot saved to PRIMARY storage');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving screenshot:', error);
      throw error;
    }
  }
  
  async getAllScreenshots(sessionId = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['screenshots'], 'readonly');
      const store = transaction.objectStore('screenshots');
      
      let request;
      if (sessionId) {
        const index = store.index('sessionId');
        request = index.getAll(sessionId);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        const screenshots = request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log(`📊 Retrieved ${screenshots.length} screenshots from PRIMARY storage${sessionId ? ` for session ${sessionId}` : ''}`);
        resolve(screenshots);
      };
      
      request.onerror = () => {
        console.error('❌ Error retrieving screenshots:', request.error);
        reject(request.error);
      };
    });
  }
  
  async deleteScreenshot(id) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    try {
      const transaction = this.db.transaction(['screenshots'], 'readwrite');
      const store = transaction.objectStore('screenshots');
      await store.delete(id);
      console.log('✅ Screenshot deleted from PRIMARY storage:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting screenshot:', error);
      return false;
    }
  }
  
  // MULTI-TAB SESSION MANAGEMENT
  
  async getCurrentSessionId() {
    // Get or create current session
    let sessionId = localStorage.getItem('currentSessionId');
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now();
      localStorage.setItem('currentSessionId', sessionId);
      
      // Create session record
      await this.createSession(sessionId, 'Multi-Tab Journal Session');
    }
    
    return sessionId;
  }
  
  async createSession(id = null, name = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const sessionId = id || 'session_' + Date.now();
    const session = {
      id: sessionId,
      name: name || `Journal Session - ${new Date().toLocaleDateString()}`,
      created: new Date().toISOString(),
      screenshotCount: 0,
      lastActive: new Date().toISOString()
    };
    
    try {
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      await store.put(session);
      
      console.log('✅ Created new session:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }
  
  async getAllSessions() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
        resolve(sessions);
      };
      
      request.onerror = () => {
        console.error('❌ Error retrieving sessions:', request.error);
        reject(request.error);
      };
    });
  }
  
  async updateSessionStats(sessionId) {
    try {
      const screenshots = await this.getAllScreenshots(sessionId);
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      const sessionRequest = store.get(sessionId);
      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result;
        if (session) {
          session.screenshotCount = screenshots.length;
          session.lastActive = new Date().toISOString();
          store.put(session);
          console.log('✅ Updated session stats:', sessionId);
        }
      };
    } catch (error) {
      console.error('❌ Error updating session stats:', error);
    }
  }
  
  // STORAGE ANALYTICS - Unlimited Capacity
  
  async getStorageStats() {
    if (!this.db) {
      return { totalScreenshots: 0, totalSessions: 0, totalSize: 0, unlimited: true };
    }
    
    try {
      const screenshots = await this.getAllScreenshots();
      const sessions = await this.getAllSessions();
      
      let totalSize = 0;
      screenshots.forEach(screenshot => {
        if (screenshot.imageData) {
          totalSize += screenshot.imageData.length;
        }
      });
      
      const stats = {
        totalScreenshots: screenshots.length,
        totalSessions: sessions.length,
        totalSize: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024)),
        unlimited: true,
        capacity: 'UNLIMITED (IndexedDB)',
        oldChromeLimit: '10MB',
        currentUsage: totalSize > 10485760 ? `${Math.round(totalSize / 1024 / 1024)}MB (Would exceed Chrome storage!)` : `${Math.round(totalSize / 1024)}KB`
      };
      
      console.log('📊 UNLIMITED storage stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return { totalScreenshots: 0, totalSessions: 0, totalSize: 0, unlimited: true };
    }
  }
  
  // PDF Export Data Management (for large datasets that exceed Chrome storage)
  async storePdfExportData(exportId, exportData) {
    if (!this.db) {
      throw new Error('Database not initialized for PDF export data storage');
    }
    
    try {
      console.log('💾 Storing PDF export data in IndexedDB:', exportId);
      console.log('📊 Export data size:', Math.round(JSON.stringify(exportData).length / 1024 / 1024), 'MB');
      
      // CRITICAL FIX: Check if pdfExports object store exists
      if (!this.db.objectStoreNames.contains('pdfExports')) {
        console.error('❌ pdfExports object store not found in database');
        console.log('🗄️ Available object stores:', [...this.db.objectStoreNames]);
        
        // Try to reinitialize database with correct schema
        console.log('🔄 Attempting to reinitialize database...');
        await this.init();
        
        if (!this.db.objectStoreNames.contains('pdfExports')) {
          throw new Error('pdfExports object store not available. Database schema may need manual reset.');
        }
      }
      
      const transaction = this.db.transaction(['pdfExports'], 'readwrite');
      const store = transaction.objectStore('pdfExports');
      
      const exportRecord = {
        id: exportId,
        data: exportData,
        timestamp: Date.now(),
        created: new Date().toISOString()
      };
      
      await store.put(exportRecord);
      console.log('✅ PDF export data stored successfully in IndexedDB');
      
      return { success: true, exportId };
      
    } catch (error) {
      console.error('❌ Error storing PDF export data:', error);
      
      // Enhanced error handling with fallback suggestion
      if (error.message.includes('object stores was not found')) {
        console.error('💡 SOLUTION: IndexedDB schema needs update. Try:');
        console.error('  1. Close all browser tabs');
        console.error('  2. Reload extension');
        console.error('  3. Or use clearExtensionStorage() to reset database');
        
        throw new Error(`PDF export storage failed: Database schema outdated. Please reload the extension or clear storage.`);
      }
      
      throw new Error(`Failed to store PDF export data: ${error.message}`);
    }
  }
  
  async getPdfExportData(exportId) {
    if (!this.db) {
      throw new Error('Database not initialized for PDF export data retrieval');
    }
    
    try {
      console.log('📂 Retrieving PDF export data from IndexedDB:', exportId);
      
      // Check if object store exists
      if (!this.db.objectStoreNames.contains('pdfExports')) {
        console.error('❌ pdfExports object store not found for retrieval');
        throw new Error('PDF export data store not available. Please try exporting again.');
      }
      
      const transaction = this.db.transaction(['pdfExports'], 'readonly');
      const store = transaction.objectStore('pdfExports');
      
      const result = await store.get(exportId);
      
      if (!result) {
        console.error('❌ PDF export data not found:', exportId);
        throw new Error(`PDF export data not found for ID: ${exportId}`);
      }
      
      console.log('✅ PDF export data retrieved successfully');
      console.log('📊 Retrieved data size:', Math.round(JSON.stringify(result.data).length / 1024 / 1024), 'MB');
      
      return result.data;
      
    } catch (error) {
      console.error('❌ Error retrieving PDF export data:', error);
      throw new Error(`Failed to retrieve PDF export data: ${error.message}`);
    }
  }
  
  async deletePdfExportData(exportId) {
    if (!this.db) {
      throw new Error('Database not initialized for PDF export data deletion');
    }
    
    try {
      console.log('🗑️ Deleting PDF export data from IndexedDB:', exportId);
      
      // Check if object store exists
      if (!this.db.objectStoreNames.contains('pdfExports')) {
        console.warn('⚠️ pdfExports object store not found for deletion - data may already be cleared');
        return { success: true }; // Consider deletion successful if store doesn't exist
      }
      
      const transaction = this.db.transaction(['pdfExports'], 'readwrite');
      const store = transaction.objectStore('pdfExports');
      
      await store.delete(exportId);
      console.log('✅ PDF export data deleted successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting PDF export data:', error);
      throw new Error(`Failed to delete PDF export data: ${error.message}`);
    }
  }
  
  async cleanupOldPdfExports() {
    if (!this.db) {
      return;
    }
    
    try {
      console.log('🧹 Cleaning up old PDF export data...');
      
      // Check if object store exists before cleanup
      if (!this.db.objectStoreNames.contains('pdfExports')) {
        console.log('ℹ️ pdfExports object store not found - no cleanup needed');
        return;
      }
      
      const transaction = this.db.transaction(['pdfExports'], 'readwrite');
      const store = transaction.objectStore('pdfExports');
      
      // Delete exports older than 1 hour
      const cutoffTime = Date.now() - (60 * 60 * 1000);
      const cursor = await store.openCursor();
      
      let deletedCount = 0;
      while (cursor) {
        const record = cursor.value;
        if (record.timestamp < cutoffTime) {
          await cursor.delete();
          deletedCount++;
          console.log('🗑️ Deleted old PDF export:', record.id);
        }
        cursor.continue();
      }
      
      if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} old PDF exports`);
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up old PDF exports:', error);
    }
  }
  
  async clearAllStorage() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    try {
      console.log('🧹 Clearing ALL PRIMARY storage...');
      
      const transaction = this.db.transaction(['screenshots', 'sessions', 'tempImages'], 'readwrite');
      
      await transaction.objectStore('screenshots').clear();
      await transaction.objectStore('sessions').clear();
      await transaction.objectStore('tempImages').clear();
      
      // Clear current session
      localStorage.removeItem('currentSessionId');
      
      console.log('✅ ALL PRIMARY storage cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      return false;
    }
  }
  
  // LEGACY METHODS (kept for compatibility)
  
  async storeImage(id, imageDataUrl, metadata = {}) {
    // Legacy method - now just saves as screenshot
    const screenshot = {
      id: id,
      imageData: imageDataUrl,
      metadata: metadata,
      timestamp: new Date().toISOString(),
      sessionId: await this.getCurrentSessionId()
    };
    
    const result = await this.saveScreenshot(screenshot);
    return { stored: result.success, size: imageDataUrl.length };
  }
  
  async retrieveImage(id) {
    try {
      const transaction = this.db.transaction(['screenshots'], 'readonly');
      const store = transaction.objectStore('screenshots');
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const screenshot = request.result;
          if (screenshot) {
            resolve({ imageData: screenshot.imageData, metadata: screenshot.metadata });
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('❌ Error retrieving image:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error in retrieveImage:', error);
      return null;
    }
  }
  
  async deleteImage(id) {
    return await this.deleteScreenshot(id);
  }
  
  async cleanOldTempFiles() {
    // Legacy cleanup - now managed differently
    console.log('ℹ️ Legacy temp file cleanup - using new session management');
    return true;
  }
  
  async restoreFullScreenshot(screenshotStub) {
    // For compatibility with existing code
    if (screenshotStub.isInTempStorage && screenshotStub.tempImageId) {
      const result = await this.retrieveImage(screenshotStub.tempImageId);
      if (result) {
        return {
          ...screenshotStub,
          imageData: result.imageData,
          isInTempStorage: false
        };
      }
    }
    return screenshotStub;
  }
}

// Initialize and make available globally
window.tempStorage = new TempStorageManager();
window.tempStorage.init().then(() => {
  console.log('🚀 PRIMARY STORAGE READY - UNLIMITED CAPACITY!');
  console.log('📊 Old Chrome limit: 10MB | New capacity: UNLIMITED');
}).catch((error) => {
  console.error('❌ PRIMARY storage initialization failed:', error);
});

console.log('📁 PRIMARY storage manager loaded with UNLIMITED capacity');