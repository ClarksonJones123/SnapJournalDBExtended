// Enhanced Temporary Storage Manager - Now PRIMARY storage with unlimited capacity
class TempStorageManager {
  constructor() {
    this.dbName = 'ScreenshotAnnotatorDB';
    this.dbVersion = 2; // Increased for schema update
    this.db = null;
    this.isReady = false;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      console.log('🗄️ Initializing PRIMARY storage (IndexedDB unlimited capacity)...');
      
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ PRIMARY storage initialized with unlimited capacity');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 Upgrading database schema...');
        
        // Create screenshots store (main storage)
        if (!db.objectStoreNames.contains('screenshots')) {
          const screenshotStore = db.createObjectStore('screenshots', { keyPath: 'id' });
          screenshotStore.createIndex('timestamp', 'timestamp', { unique: false });
          screenshotStore.createIndex('sessionId', 'sessionId', { unique: false });
          screenshotStore.createIndex('tabUrl', 'tabUrl', { unique: false });
          console.log('✅ Created screenshots store with multi-tab indexes');
        }
        
        // Create sessions store (for multi-tab collections)
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('created', 'created', { unique: false });
          sessionStore.createIndex('name', 'name', { unique: false });
          console.log('✅ Created sessions store for multi-tab journals');
        }
        
        // Legacy temp storage (keep for compatibility)
        if (!db.objectStoreNames.contains('tempImages')) {
          const tempStore = db.createObjectStore('tempImages', { keyPath: 'id' });
          tempStore.createIndex('created', 'created', { unique: false });
        }
      };
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
  
  async clearAll() {
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