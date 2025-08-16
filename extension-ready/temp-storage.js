// 📁 Temporary Storage Manager for Chrome Extension
// Handles large image data using IndexedDB to avoid Chrome storage quota issues

class TempStorageManager {
    constructor() {
        this.dbName = 'ScreenshotAnnotatorTemp';
        this.dbVersion = 1;
        this.db = null;
        this.maxTempFiles = 10; // Maximum temporary files to keep
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🗄️ Initializing temporary storage...');
            
            // Ensure we wait for the database to be ready
            this.db = await this.openDatabase();
            
            if (!this.db) {
                throw new Error('Failed to open IndexedDB database');
            }
            
            console.log('🗄️ Database opened successfully');
            
            // Test database functionality
            await this.testDatabase();
            
            await this.cleanOldTempFiles();
            console.log('✅ Temporary storage initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize temporary storage:', error);
            // Don't throw - allow fallback to Chrome storage
            this.db = null;
        }
    }
    
    // Test database functionality
    async testDatabase() {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            await this.promisifyRequest(store.count());
            console.log('🗄️ Database test successful');
        } catch (error) {
            console.error('❌ Database test failed:', error);
            throw error;
        }
    }
    
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                    imageStore.createIndex('timestamp', 'timestamp');
                    imageStore.createIndex('type', 'type');
                }
                
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
                    metaStore.createIndex('timestamp', 'timestamp');
                }
                
                console.log('🗄️ Database schema created');
            };
        });
    }
    
    // 💾 Store large image data in IndexedDB
    async storeImage(id, imageDataUrl, metadata = {}) {
        try {
            console.log(`🗄️ Storing image ${id} in temporary storage...`);
            
            // Convert data URL to blob for efficient storage
            const blob = await this.dataUrlToBlob(imageDataUrl);
            
            const imageRecord = {
                id: id,
                blob: blob,
                size: blob.size,
                type: blob.type,
                timestamp: Date.now(),
                metadata: metadata
            };
            
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            await this.promisifyRequest(store.put(imageRecord));
            
            console.log(`✅ Image ${id} stored (${this.formatBytes(blob.size)})`);
            
            // Clean up old files if we exceed the limit
            await this.cleanOldTempFiles();
            
            return {
                id: id,
                size: blob.size,
                type: blob.type,
                stored: true
            };
            
        } catch (error) {
            console.error(`❌ Failed to store image ${id}:`, error);
            return { id: id, stored: false, error: error.message };
        }
    }
    
    // 📁 Retrieve image data from IndexedDB
    async retrieveImage(id) {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const result = await this.promisifyRequest(store.get(id));
            
            if (!result) {
                console.warn(`⚠️ Image ${id} not found in temporary storage`);
                return null;
            }
            
            // Convert blob back to data URL
            const dataUrl = await this.blobToDataUrl(result.blob);
            
            console.log(`✅ Retrieved image ${id} (${this.formatBytes(result.size)})`);
            
            return {
                id: id,
                imageData: dataUrl,
                size: result.size,
                type: result.type,
                metadata: result.metadata,
                timestamp: result.timestamp
            };
            
        } catch (error) {
            console.error(`❌ Failed to retrieve image ${id}:`, error);
            return null;
        }
    }
    
    // 🗑️ Delete specific image from temporary storage
    async deleteImage(id) {
        try {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            await this.promisifyRequest(store.delete(id));
            
            console.log(`🗑️ Deleted image ${id} from temporary storage`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to delete image ${id}:`, error);
            return false;
        }
    }
    
    // 📊 Get storage usage statistics
    async getStorageStats() {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();
            const images = await this.promisifyRequest(request);
            
            const stats = {
                totalImages: images.length,
                totalSize: images.reduce((sum, img) => sum + img.size, 0),
                images: images.map(img => ({
                    id: img.id,
                    size: img.size,
                    type: img.type,
                    timestamp: img.timestamp
                }))
            };
            
            console.log('📊 Temporary storage stats:', {
                totalImages: stats.totalImages,
                totalSize: this.formatBytes(stats.totalSize)
            });
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error);
            return { totalImages: 0, totalSize: 0, images: [] };
        }
    }
    
    // 🧹 Clean up old temporary files
    async cleanOldTempFiles() {
        try {
            const stats = await this.getStorageStats();
            
            if (stats.totalImages <= this.maxTempFiles) {
                console.log(`ℹ️ Only ${stats.totalImages} temp files, no cleanup needed`);
                return;
            }
            
            // Sort by timestamp (oldest first)
            const sortedImages = stats.images.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = sortedImages.slice(0, stats.totalImages - this.maxTempFiles);
            
            console.log(`🧹 Cleaning up ${toDelete.length} old temporary files...`);
            
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            for (const image of toDelete) {
                await this.promisifyRequest(store.delete(image.id));
                console.log(`🗑️ Deleted old temp file: ${image.id}`);
            }
            
            console.log(`✅ Cleanup completed. Kept ${this.maxTempFiles} most recent files`);
            
        } catch (error) {
            console.error('❌ Failed to clean old temp files:', error);
        }
    }
    
    // 🗑️ Clear all temporary storage
    async clearAll() {
        try {
            console.log('🧹 Clearing all temporary storage...');
            
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            await this.promisifyRequest(store.clear());
            
            console.log('✅ All temporary storage cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear temporary storage:', error);
            return false;
        }
    }
    
    // 🔄 Utility: Convert data URL to blob
    dataUrlToBlob(dataUrl) {
        return new Promise((resolve) => {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            
            resolve(new Blob([u8arr], { type: mime }));
        });
    }
    
    // 🔄 Utility: Convert blob to data URL
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    // 🔄 Utility: Convert IndexedDB request to promise
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // 🔄 Utility: Format bytes to human readable
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 📁 Create lightweight screenshot record for Chrome storage
    createLightweightScreenshot(screenshot, tempImageId) {
        return {
            ...screenshot,
            imageData: null, // Remove large image data
            tempImageId: tempImageId, // Reference to temporary storage
            isInTempStorage: true,
            originalSize: screenshot.imageData ? screenshot.imageData.length : 0
        };
    }
    
    // 🔄 Restore full screenshot from temporary storage
    async restoreFullScreenshot(lightweightScreenshot) {
        if (!lightweightScreenshot.isInTempStorage || !lightweightScreenshot.tempImageId) {
            return lightweightScreenshot; // Not in temp storage
        }
        
        const imageData = await this.retrieveImage(lightweightScreenshot.tempImageId);
        if (!imageData) {
            console.warn(`⚠️ Could not restore image for screenshot ${lightweightScreenshot.id}`);
            return lightweightScreenshot;
        }
        
        return {
            ...lightweightScreenshot,
            imageData: imageData.imageData,
            isInTempStorage: false,
            tempImageId: null
        };
    }
}

// 🌍 Global instance for use throughout the extension
window.tempStorage = new TempStorageManager();

console.log('📁 Temporary storage manager loaded');