/*
 * ==================================================================================
 * SNAP JOURNAL - Medical Grade Screenshot Annotation Extension
 * ==================================================================================
 * 
 * popup.js - Main Extension Interface Controller
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

class ScreenshotAnnotator {
    constructor() {
        this.tempStorage = null;
        this.currentSession = null;
        this.isInitialized = false;
        this.debugMode = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            this.debugLog('🚀 Initializing ScreenshotAnnotator...');
            
            // Initialize storage
            this.tempStorage = new TempStorageManager();
            await this.tempStorage.init();
            
            // Initialize UI elements
            this.initializeUI();
            
            // Load existing screenshots
            await this.loadScreenshots();
            
            // Set up automatic cleanup
            this.setupAutomaticCleanup();
            
            this.isInitialized = true;
            this.debugLog('✅ ScreenshotAnnotator initialized successfully');
            
        } catch (error) {
            this.debugError('❌ Failed to initialize ScreenshotAnnotator', error);
            this.showStatus('error', 'Failed to initialize extension. Please try refreshing.');
        }
    }

    initializeUI() {
        // Initialize capture button
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureScreenshot());
        }

        // Initialize PDF export button
        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPdfJournal());
        }

        // Initialize clear all button
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllScreenshots());
        }

        // Initialize debug toggle
        const debugToggle = document.getElementById('debugToggle');
        if (debugToggle) {
            debugToggle.addEventListener('change', (e) => {
                this.debugMode = e.target.checked;
                this.updateDebugPanel();
            });
        }

        this.debugLog('✅ UI elements initialized');
    }

    async captureScreenshot() {
        try {
            this.debugLog('📸 Starting screenshot capture...');
            
            // Show loading state
            this.showStatus('info', 'Capturing screenshot...');
            
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            this.debugLog(`📍 Capturing tab: ${tab.title} (${tab.url})`);

            // Capture screenshot using Chrome API
            const dataUrl = await new Promise((resolve, reject) => {
                chrome.tabs.captureVisibleTab(tab.windowId, {
                    format: 'png',
                    quality: 100
                }, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });

            // Create screenshot object
            const screenshot = {
                id: 'screenshot_' + Date.now(),
                imageData: dataUrl,
                url: tab.url,
                title: tab.title,
                timestamp: new Date().toISOString(),
                annotations: [],
                displayWidth: 0,
                displayHeight: 0
            };

            // Save to storage
            await this.tempStorage.saveScreenshot(screenshot);
            
            this.debugLog('✅ Screenshot saved successfully');
            this.showStatus('success', 'Screenshot captured! Opening annotation window...');

            // Open annotation interface
            await this.openAnnotationInterface(screenshot);
            
            // Refresh the screenshot list
            await this.loadScreenshots();

        } catch (error) {
            this.debugError('❌ Screenshot capture failed', error);
            this.showStatus('error', `Failed to capture screenshot: ${error.message}`);
        }
    }

    async openAnnotationInterface(screenshot) {
        try {
            // Store screenshot data for annotation interface
            await chrome.storage.local.set({
                'currentScreenshot': screenshot,
                'annotationMode': true
            });

            // Open annotation window
            const annotationUrl = chrome.runtime.getURL('annotation.html');
            
            await chrome.windows.create({
                url: annotationUrl,
                type: 'popup',
                width: 1200,
                height: 800,
                focused: true
            });

            this.debugLog('✅ Annotation interface opened');

        } catch (error) {
            this.debugError('❌ Failed to open annotation interface', error);
            throw error;
        }
    }

    async loadScreenshots() {
        try {
            this.debugLog('📥 Loading screenshots...');
            
            const screenshots = await this.tempStorage.getAllScreenshots();
            this.displayScreenshots(screenshots);
            
            // Update storage stats
            await this.updateStorageStats();
            
            this.debugLog(`✅ Loaded ${screenshots.length} screenshots`);

        } catch (error) {
            this.debugError('❌ Failed to load screenshots', error);
            this.showStatus('error', 'Failed to load screenshots');
        }
    }

    displayScreenshots(screenshots) {
        const container = document.getElementById('screenshotGrid');
        if (!container) return;

        container.innerHTML = '';

        if (screenshots.length === 0) {
            container.innerHTML = `
                <div class="no-screenshots">
                    <p>No screenshots yet. Click "📷 Capture Screenshot" to get started!</p>
                </div>
            `;
            return;
        }

        screenshots.forEach(screenshot => {
            const item = this.createScreenshotItem(screenshot);
            container.appendChild(item);
        });
    }

    createScreenshotItem(screenshot) {
        const item = document.createElement('div');
        item.className = 'screenshot-item';
        item.innerHTML = `
            <div class="screenshot-thumbnail">
                <img src="${screenshot.imageData}" alt="Screenshot" loading="lazy">
            </div>
            <div class="screenshot-info">
                <div class="screenshot-title">${this.truncateText(screenshot.title || 'Untitled', 30)}</div>
                <div class="screenshot-timestamp">${this.formatTimestamp(screenshot.timestamp)}</div>
                <div class="screenshot-annotations">${screenshot.annotations?.length || 0} annotations</div>
            </div>
            <div class="screenshot-actions">
                <button class="btn-small btn-annotate" data-id="${screenshot.id}">✏️ Annotate</button>
                <button class="btn-small btn-delete" data-id="${screenshot.id}">🗑️ Delete</button>
            </div>
        `;

        // Add event listeners
        const annotateBtn = item.querySelector('.btn-annotate');
        const deleteBtn = item.querySelector('.btn-delete');

        annotateBtn.addEventListener('click', () => this.openAnnotationInterface(screenshot));
        deleteBtn.addEventListener('click', () => this.deleteScreenshot(screenshot.id));

        return item;
    }

    async deleteScreenshot(screenshotId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this screenshot?');
            if (!confirmed) return;

            await this.tempStorage.deleteScreenshot(screenshotId);
            await this.loadScreenshots();
            
            this.showStatus('success', 'Screenshot deleted');
            this.debugLog(`✅ Screenshot deleted: ${screenshotId}`);

        } catch (error) {
            this.debugError('❌ Failed to delete screenshot', error);
            this.showStatus('error', 'Failed to delete screenshot');
        }
    }

    async clearAllScreenshots() {
        try {
            const confirmed = confirm('Are you sure you want to delete ALL screenshots? This cannot be undone.');
            if (!confirmed) return;

            await this.tempStorage.clearAllScreenshots();
            await this.loadScreenshots();
            
            this.showStatus('success', 'All screenshots cleared');
            this.debugLog('✅ All screenshots cleared');

        } catch (error) {
            this.debugError('❌ Failed to clear screenshots', error);
            this.showStatus('error', 'Failed to clear screenshots');
        }
    }

    async exportPdfJournal() {
        try {
            this.debugLog('📄 Starting PDF export...');
            this.showStatus('info', 'Preparing PDF export...');

            const screenshots = await this.tempStorage.getAllScreenshots();
            
            if (screenshots.length === 0) {
                this.showStatus('warning', 'No screenshots to export');
                return;
            }

            // Determine export method based on data size
            const totalSize = this.calculateDataSize(screenshots);
            const totalSizeMB = Math.round(totalSize / 1024 / 1024);
            
            this.debugLog(`📊 Export data size: ${totalSizeMB}MB`);

            // Use IndexedDB for large datasets or Chrome storage for small ones
            const useIndexedDB = (
                totalSizeMB > 2 || 
                screenshots.length > 3 || 
                totalSize > 2 * 1024 * 1024
            );

            if (useIndexedDB) {
                this.debugLog('📦 Using IndexedDB for large dataset export');
                await this.exportPdfJournalViaIndexedDB(screenshots);
            } else {
                this.debugLog('📦 Using Chrome storage for small dataset export');
                await this.exportPdfJournalViaChrome(screenshots);
            }

        } catch (error) {
            this.debugError('❌ PDF export failed', error);
            this.showStatus('error', `PDF export failed: ${error.message}`);
        }
    }

    async exportPdfJournalViaIndexedDB(screenshots) {
        try {
            // Generate unique export ID
            const exportId = 'pdf_export_' + Date.now();
            
            // Store export data in IndexedDB
            const exportData = {
                screenshots: screenshots,
                totalAnnotations: screenshots.reduce((total, s) => total + (s.annotations?.length || 0), 0),
                exportDate: new Date().toISOString(),
                exportMethod: 'IndexedDB'
            };

            await this.tempStorage.storePdfExportData(exportId, exportData);
            
            this.debugLog(`✅ Export data stored in IndexedDB: ${exportId}`);
            this.showStatus('success', 'Opening PDF export window...');

            // Open PDF export window with export ID
            const exportUrl = chrome.runtime.getURL(`pdf-export.html?exportId=${exportId}`);
            
            await chrome.windows.create({
                url: exportUrl,
                type: 'popup',
                width: 1000,
                height: 700,
                focused: true
            });

        } catch (error) {
            this.debugError('❌ IndexedDB export failed', error);
            throw error;
        }
    }

    async exportPdfJournalViaChrome(screenshots) {
        try {
            // Store in Chrome storage for small datasets
            await chrome.storage.local.set({
                'pdfExportData': {
                    screenshots: screenshots,
                    exportDate: new Date().toISOString(),
                    exportMethod: 'Chrome Storage'
                }
            });

            this.showStatus('success', 'Opening PDF export window...');

            // Open PDF export window
            const exportUrl = chrome.runtime.getURL('pdf-export.html');
            
            await chrome.windows.create({
                url: exportUrl,
                type: 'popup',
                width: 1000,
                height: 700,
                focused: true
            });

        } catch (error) {
            this.debugError('❌ Chrome storage export failed', error);
            throw error;
        }
    }

    calculateDataSize(screenshots) {
        return screenshots.reduce((total, screenshot) => {
            return total + (screenshot.imageData ? screenshot.imageData.length : 0);
        }, 0);
    }

    async updateStorageStats() {
        try {
            const stats = await this.tempStorage.getStorageStats();
            const statsElement = document.getElementById('storageStats');
            
            if (statsElement) {
                statsElement.innerHTML = `
                    <div class="storage-info">
                        <span class="storage-label">Screenshots:</span>
                        <span class="storage-value">${stats.totalScreenshots}</span>
                    </div>
                    <div class="storage-info">
                        <span class="storage-label">Storage:</span>
                        <span class="storage-value">${stats.currentUsage}</span>
                    </div>
                    <div class="storage-info">
                        <span class="storage-label">Capacity:</span>
                        <span class="storage-value">${stats.capacity}</span>
                    </div>
                `;
            }

        } catch (error) {
            this.debugError('❌ Failed to update storage stats', error);
        }
    }

    setupAutomaticCleanup() {
        // Run cleanup every 5 minutes
        setInterval(() => {
            this.automaticStorageCleanup();
        }, 5 * 60 * 1000);

        this.debugLog('✅ Automatic cleanup scheduled');
    }

    async automaticStorageCleanup() {
        try {
            this.debugLog('🧹 Running automatic storage cleanup...');
            
            // Clear image cache
            const images = document.querySelectorAll('img[id^="screenshot-img-"]');
            images.forEach(img => img.remove());
            
            // Run garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            // Optimize memory
            await this.optimizeMemory();
            
            this.debugLog('✅ Automatic cleanup completed');

        } catch (error) {
            this.debugError('❌ Automatic cleanup failed', error);
        }
    }

    async optimizeMemory() {
        try {
            // Clear temporary variables
            if (this.tempVariables) {
                delete this.tempVariables;
            }
            
            // Force garbage collection
            if (performance.memory) {
                const beforeMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                
                // Clear caches
                if (window.gc) window.gc();
                
                setTimeout(() => {
                    const afterMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                    this.debugLog(`💾 Memory optimized: ${beforeMB}MB → ${afterMB}MB`);
                }, 1000);
            }

        } catch (error) {
            this.debugError('❌ Memory optimization failed', error);
        }
    }

    // Utility methods
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleString();
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        statusElement.className = `status-message ${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    updateDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        if (!debugPanel) return;

        if (this.debugMode) {
            debugPanel.style.display = 'block';
            this.displayDebugInfo();
        } else {
            debugPanel.style.display = 'none';
        }
    }

    async displayDebugInfo() {
        try {
            const debugInfo = document.getElementById('debugInfo');
            if (!debugInfo) return;

            const stats = await this.tempStorage.getStorageStats();
            const memoryInfo = performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                allocated: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
            } : 'Not available';

            debugInfo.innerHTML = `
                <div class="debug-section">
                    <h4>Storage Statistics</h4>
                    <pre>${JSON.stringify(stats, null, 2)}</pre>
                </div>
                <div class="debug-section">
                    <h4>Memory Usage</h4>
                    <pre>${JSON.stringify(memoryInfo, null, 2)}</pre>
                </div>
                <div class="debug-section">
                    <h4>Extension Status</h4>
                    <pre>Initialized: ${this.isInitialized}
Debug Mode: ${this.debugMode}
Storage Ready: ${this.tempStorage?.isReady || false}</pre>
                </div>
            `;

        } catch (error) {
            this.debugError('❌ Failed to display debug info', error);
        }
    }

    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[Snap Journal] ${message}`, data || '');
        }
        
        // Store in debug log
        window.debugLog?.(message, data);
    }

    debugError(message, error = null) {
        console.error(`[Snap Journal] ${message}`, error || '');
        
        // Store in debug log
        window.debugError?.(message, error);
    }
}

// Global instance
let screenshotAnnotator;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    screenshotAnnotator = new ScreenshotAnnotator();
});

// Make instance available globally for debugging
window.screenshotAnnotator = screenshotAnnotator;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenshotAnnotator;
}