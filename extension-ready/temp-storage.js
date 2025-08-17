/*
 * ==================================================================================
 * SNAP JOURNAL - Medical Grade Screenshot Annotation Extension
 * ==================================================================================
 * 
 * temp-storage.js - Unlimited IndexedDB Storage Manager
 * 
 * Copyright (C) 2025 Snap Journal Development Team
 * All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * NOTICE: This software and its source code are proprietary products of 
 * Snap Journal Development Team and are protected by copyright law and 
 * international treaties. Unauthorized reproduction or distribution of this 
 * program, or any portion of it, may result in severe civil and criminal 
 * penalties, and will be prosecuted to the maximum extent possible under law.
 * 
 * RESTRICTIONS:
 * - No part of this source code may be reproduced, distributed, or transmitted
 *   in any form or by any means, including photocopying, recording, or other
 *   electronic or mechanical methods, without the prior written permission
 *   of the copyright owner.
 * - Reverse engineering, decompilation, or disassembly is strictly prohibited.
 * - This software is licensed, not sold.
 * 
 * For licensing inquiries, contact: [your-email@domain.com]
 * 
 * Version: 2.0.1
 * Build Date: January 2025
 * ==================================================================================
 */

class TempStorageManager {
    constructor() {
        this.dbName = 'SnapJournalDB';
        this.dbVersion = 2;
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
        
        // Copyright and licensing information
        this.metadata = {
            name: 'Snap Journal Storage Manager',
            version: '2.0.1',
            copyright: '© 2025 Snap Journal Development Team',
            license: 'Proprietary - All Rights Reserved'
        };
        
        console.log(`[Snap Journal Storage] 🚀 Initializing ${this.metadata.name} v${this.metadata.version}`);
        console.log(`[Snap Journal Storage] © ${this.metadata.copyright}`);
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initDatabase();
        return this.initPromise;
    }

    async _initDatabase() {
        try {
            console.log('[Snap Journal Storage] 🔧 Opening IndexedDB...');
            
            // First, validate and fix schema if needed
            await this.validateAndFixSchema();
            
            this.db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to open database:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ Database opened successfully');
                    resolve(request.result);
                };
                
                request.onupgradeneeded = (event) => {
                    console.log('[Snap Journal Storage] 🔄 Upgrading database schema...');
                    const db = event.target.result;
                    this._createObjectStores(db);
                };
            });
            
            this.isReady = true;
            console.log('[Snap Journal Storage] ✅ Storage manager initialized');
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Database initialization failed:', error);
            
            // Attempt automatic repair
            console.log('[Snap Journal Storage] 🔧 Attempting automatic schema repair...');
            const repairResult = await this.performAutomaticSchemaRepair();
            
            if (repairResult.success) {
                console.log('[Snap Journal Storage] ✅ Database automatically repaired - retrying initialization...');
                return this._initDatabase();
            } else {
                throw new Error('Database initialization failed and repair unsuccessful');
            }
        }
    }

    _createObjectStores(db) {
        try {
            // Screenshots object store
            if (!db.objectStoreNames.contains('screenshots')) {
                const screenshotsStore = db.createObjectStore('screenshots', { keyPath: 'id' });
                screenshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
                screenshotsStore.createIndex('url', 'url', { unique: false });
                console.log('[Snap Journal Storage] ✅ Created screenshots object store');
            }
            
            // Sessions object store
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
                sessionsStore.createIndex('date', 'date', { unique: false });
                console.log('[Snap Journal Storage] ✅ Created sessions object store');
            }
            
            // Temporary images object store
            if (!db.objectStoreNames.contains('tempImages')) {
                const tempStore = db.createObjectStore('tempImages', { keyPath: 'id' });
                tempStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('[Snap Journal Storage] ✅ Created tempImages object store');
            }
            
            // PDF exports object store for large datasets
            if (!db.objectStoreNames.contains('pdfExports')) {
                const pdfStore = db.createObjectStore('pdfExports', { keyPath: 'exportId' });
                pdfStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('[Snap Journal Storage] ✅ Created pdfExports object store');
            }
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Failed to create object stores:', error);
            throw error;
        }
    }

    async validateAndFixSchema() {
        try {
            console.log('[Snap Journal Storage] 🔍 Validating database schema...');
            
            // Open database to check current schema
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const requiredStores = ['screenshots', 'sessions', 'tempImages', 'pdfExports'];
            const existingStores = Array.from(db.objectStoreNames);
            const missingStores = requiredStores.filter(store => !existingStores.includes(store));
            
            db.close();
            
            if (missingStores.length > 0) {
                console.log('[Snap Journal Storage] 🔧 Missing object stores detected:', missingStores);
                return await this.performAutomaticSchemaRepair();
            } else {
                console.log('[Snap Journal Storage] ✅ Database schema is valid');
                return { success: true, repaired: false, message: 'Schema is valid' };
            }
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Schema validation failed:', error);
            return await this.performAutomaticSchemaRepair();
        }
    }

    async performAutomaticSchemaRepair() {
        try {
            console.log('[Snap Journal Storage] 🛠️ Performing automatic schema repair...');
            
            // Delete existing database to force recreation
            await new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(this.dbName);
                deleteRequest.onsuccess = () => {
                    console.log('[Snap Journal Storage] 🗑️ Old database deleted');
                    resolve();
                };
                deleteRequest.onerror = () => reject(deleteRequest.error);
            });
            
            // Create new database with correct schema
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    this._createObjectStores(db);
                };
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            db.close();
            
            console.log('[Snap Journal Storage] ✅ Database schema repaired successfully');
            
            return {
                success: true,
                repaired: true,
                missingStores: ['screenshots', 'sessions', 'tempImages', 'pdfExports'],
                fixedStores: ['screenshots', 'sessions', 'tempImages', 'pdfExports'],
                message: 'Schema automatically repaired - PDF export ready!'
            };
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Automatic schema repair failed:', error);
            return {
                success: false,
                repaired: false,
                error: error.message,
                message: 'Automatic repair failed'
            };
        }
    }

    async saveScreenshot(screenshot) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['screenshots'], 'readwrite');
                const store = transaction.objectStore('screenshots');
                
                const request = store.put(screenshot);
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ Screenshot saved:', screenshot.id);
                    resolve({ success: true });
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to save screenshot:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Save screenshot error:', error);
            throw error;
        }
    }

    async getAllScreenshots(sessionId = null) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['screenshots'], 'readonly');
                const store = transaction.objectStore('screenshots');
                
                const request = store.getAll();
                
                request.onsuccess = () => {
                    let screenshots = request.result;
                    
                    // Filter by session if specified
                    if (sessionId) {
                        screenshots = screenshots.filter(s => s.sessionId === sessionId);
                    }
                    
                    // Sort by timestamp (newest first)
                    screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    console.log('[Snap Journal Storage] ✅ Retrieved screenshots:', screenshots.length);
                    resolve(screenshots);
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to get screenshots:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Get screenshots error:', error);
            throw error;
        }
    }

    async deleteScreenshot(screenshotId) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['screenshots'], 'readwrite');
                const store = transaction.objectStore('screenshots');
                
                const request = store.delete(screenshotId);
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ Screenshot deleted:', screenshotId);
                    resolve({ success: true });
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to delete screenshot:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Delete screenshot error:', error);
            throw error;
        }
    }

    async clearAllScreenshots() {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['screenshots'], 'readwrite');
                const store = transaction.objectStore('screenshots');
                
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ All screenshots cleared');
                    resolve({ success: true });
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to clear screenshots:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Clear screenshots error:', error);
            throw error;
        }
    }

    async storePdfExportData(exportId, exportData) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            const data = {
                exportId: exportId,
                ...exportData,
                timestamp: new Date().toISOString()
            };
            
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['pdfExports'], 'readwrite');
                const store = transaction.objectStore('pdfExports');
                
                const request = store.put(data);
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ PDF export data stored:', exportId);
                    resolve({ success: true, exportId: exportId });
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to store PDF export data:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Store PDF export data error:', error);
            throw error;
        }
    }

    async getPdfExportData(exportId) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['pdfExports'], 'readonly');
                const store = transaction.objectStore('pdfExports');
                
                const request = store.get(exportId);
                
                request.onsuccess = () => {
                    const data = request.result;
                    
                    if (!data) {
                        reject(new Error(`PDF export data not found: ${exportId}`));
                        return;
                    }
                    
                    // Validate data structure
                    if (!data.screenshots || !Array.isArray(data.screenshots)) {
                        console.error('[Snap Journal Storage] ❌ Invalid PDF export data structure:', data);
                        reject(new Error('Invalid PDF export data structure'));
                        return;
                    }
                    
                    console.log('[Snap Journal Storage] ✅ PDF export data retrieved:', exportId, data.screenshots.length, 'screenshots');
                    resolve(data);
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to get PDF export data:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Get PDF export data error:', error);
            throw error;
        }
    }

    async deletePdfExportData(exportId) {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['pdfExports'], 'readwrite');
                const store = transaction.objectStore('pdfExports');
                
                const request = store.delete(exportId);
                
                request.onsuccess = () => {
                    console.log('[Snap Journal Storage] ✅ PDF export data deleted:', exportId);
                    resolve({ success: true });
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to delete PDF export data:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Delete PDF export data error:', error);
            throw error;
        }
    }

    async getStorageStats() {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            const screenshots = await this.getAllScreenshots();
            const totalSize = screenshots.reduce((size, screenshot) => {
                return size + (screenshot.imageData ? screenshot.imageData.length : 0);
            }, 0);
            
            const totalSizeMB = Math.round(totalSize / 1024 / 1024);
            
            const stats = {
                totalScreenshots: screenshots.length,
                totalSessions: 0, // Could be implemented later
                totalSize: totalSize,
                totalSizeMB: totalSizeMB,
                unlimited: true,
                capacity: 'UNLIMITED (IndexedDB)',
                currentUsage: totalSizeMB > 10 ? 
                    `${totalSizeMB}MB (Would exceed Chrome storage!)` : 
                    `${totalSizeMB}MB`,
                storageMethod: 'IndexedDB',
                copyright: this.metadata.copyright
            };
            
            console.log('[Snap Journal Storage] 📊 Storage stats:', stats);
            return stats;
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Get storage stats error:', error);
            throw error;
        }
    }

    async cleanupOldPdfExports() {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            
            return await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['pdfExports'], 'readwrite');
                const store = transaction.objectStore('pdfExports');
                const index = store.index('timestamp');
                
                const range = IDBKeyRange.upperBound(new Date(cutoffTime).toISOString());
                const request = index.openCursor(range);
                
                let deletedCount = 0;
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        console.log('[Snap Journal Storage] 🧹 Cleaned up old PDF exports:', deletedCount);
                        resolve({ success: true, deletedCount });
                    }
                };
                
                request.onerror = () => {
                    console.error('[Snap Journal Storage] ❌ Failed to cleanup old PDF exports:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Cleanup error:', error);
            throw error;
        }
    }

    // Utility method for debugging
    async getAllData() {
        if (!this.isReady) {
            await this.init();
        }
        
        try {
            const screenshots = await this.getAllScreenshots();
            const stats = await this.getStorageStats();
            
            return {
                metadata: this.metadata,
                screenshots: screenshots,
                stats: stats,
                dbInfo: {
                    name: this.dbName,
                    version: this.dbVersion,
                    ready: this.isReady
                }
            };
            
        } catch (error) {
            console.error('[Snap Journal Storage] ❌ Get all data error:', error);
            throw error;
        }
    }
}

// Make available globally
window.TempStorageManager = TempStorageManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TempStorageManager;
}