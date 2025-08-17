/*
 * ==================================================================================
 * SNAP JOURNAL - Medical Grade Screenshot Annotation Extension
 * ==================================================================================
 * 
 * debug-embedded.js - Persistent Debug Logging System
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

// Enhanced Debug Logging System with Persistent Storage
// This system maintains debug logs across browser sessions

(function() {
    'use strict';
    
    // Debug system configuration
    const DEBUG_CONFIG = {
        name: 'Snap Journal Debug System',
        version: '2.0.1',
        copyright: '© 2025 Snap Journal Development Team',
        maxLogEntries: 1000,
        storageKey: 'snapJournalDebugLogs',
        enabled: true
    };
    
    console.log(`[${DEBUG_CONFIG.name}] 🚀 Initializing v${DEBUG_CONFIG.version}`);
    console.log(`[${DEBUG_CONFIG.name}] ${DEBUG_CONFIG.copyright}`);
    
    let debugLogs = [];
    let sessionId = 'session_' + Date.now();
    
    // Initialize debug system
    init();
    
    function init() {
        try {
            // Load existing logs from localStorage
            loadPersistedLogs();
            
            // Set up global debug functions
            setupGlobalFunctions();
            
            // Log system initialization
            debugLog('🚀 Debug system initialized', {
                sessionId: sessionId,
                version: DEBUG_CONFIG.version,
                timestamp: new Date().toISOString()
            });
            
            console.log(`[${DEBUG_CONFIG.name}] ✅ Debug system ready`);
            
        } catch (error) {
            console.error(`[${DEBUG_CONFIG.name}] ❌ Initialization failed:`, error);
        }
    }
    
    function loadPersistedLogs() {
        try {
            const storedLogs = localStorage.getItem(DEBUG_CONFIG.storageKey);
            if (storedLogs) {
                debugLogs = JSON.parse(storedLogs);
                console.log(`[${DEBUG_CONFIG.name}] 📥 Loaded ${debugLogs.length} persisted log entries`);
            }
        } catch (error) {
            console.warn(`[${DEBUG_CONFIG.name}] ⚠️ Failed to load persisted logs:`, error);
            debugLogs = [];
        }
    }
    
    function persistLogs() {
        try {
            // Keep only the most recent entries
            if (debugLogs.length > DEBUG_CONFIG.maxLogEntries) {
                debugLogs = debugLogs.slice(-DEBUG_CONFIG.maxLogEntries);
            }
            
            localStorage.setItem(DEBUG_CONFIG.storageKey, JSON.stringify(debugLogs));
            
        } catch (error) {
            console.warn(`[${DEBUG_CONFIG.name}] ⚠️ Failed to persist logs:`, error);
        }
    }
    
    function debugLog(message, data = null) {
        if (!DEBUG_CONFIG.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            sessionId: sessionId,
            type: 'log',
            message: message,
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
        };
        
        // Add to logs array
        debugLogs.push(logEntry);
        
        // Console output
        const consoleMessage = `[Snap Journal Debug] ${message}`;
        if (data) {
            console.log(consoleMessage, data);
        } else {
            console.log(consoleMessage);
        }
        
        // Persist to localStorage
        persistLogs();
    }
    
    function debugError(message, error = null) {
        if (!DEBUG_CONFIG.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            sessionId: sessionId,
            type: 'error',
            message: message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        // Add to logs array
        debugLogs.push(logEntry);
        
        // Console output
        const consoleMessage = `[Snap Journal Debug] ❌ ${message}`;
        if (error) {
            console.error(consoleMessage, error);
        } else {
            console.error(consoleMessage);
        }
        
        // Persist to localStorage
        persistLogs();
    }
    
    function debugWarn(message, data = null) {
        if (!DEBUG_CONFIG.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            sessionId: sessionId,
            type: 'warning',
            message: message,
            data: data,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        // Add to logs array
        debugLogs.push(logEntry);
        
        // Console output
        const consoleMessage = `[Snap Journal Debug] ⚠️ ${message}`;
        if (data) {
            console.warn(consoleMessage, data);
        } else {
            console.warn(consoleMessage);
        }
        
        // Persist to localStorage
        persistLogs();
    }
    
    function getDebugLogs(filterOptions = {}) {
        let filteredLogs = [...debugLogs];
        
        // Filter by session
        if (filterOptions.sessionId) {
            filteredLogs = filteredLogs.filter(log => log.sessionId === filterOptions.sessionId);
        }
        
        // Filter by type
        if (filterOptions.type) {
            filteredLogs = filteredLogs.filter(log => log.type === filterOptions.type);
        }
        
        // Filter by time range
        if (filterOptions.since) {
            const sinceDate = new Date(filterOptions.since);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
        }
        
        // Limit results
        if (filterOptions.limit) {
            filteredLogs = filteredLogs.slice(-filterOptions.limit);
        }
        
        return filteredLogs;
    }
    
    function clearDebugLogs() {
        debugLogs = [];
        localStorage.removeItem(DEBUG_CONFIG.storageKey);
        console.log(`[${DEBUG_CONFIG.name}] 🧹 Debug logs cleared`);
    }
    
    function exportDebugLogs() {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: DEBUG_CONFIG.version,
                copyright: DEBUG_CONFIG.copyright,
                totalLogs: debugLogs.length
            },
            logs: debugLogs
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snap-journal-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        debugLog('📤 Debug logs exported', { logCount: debugLogs.length });
    }
    
    function getDebugStats() {
        const now = new Date();
        const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
        const lastHour = new Date(now - 60 * 60 * 1000);
        
        const stats = {
            total: debugLogs.length,
            currentSession: debugLogs.filter(log => log.sessionId === sessionId).length,
            last24Hours: debugLogs.filter(log => new Date(log.timestamp) >= last24Hours).length,
            lastHour: debugLogs.filter(log => new Date(log.timestamp) >= lastHour).length,
            byType: {
                log: debugLogs.filter(log => log.type === 'log').length,
                error: debugLogs.filter(log => log.type === 'error').length,
                warning: debugLogs.filter(log => log.type === 'warning').length
            },
            oldestEntry: debugLogs.length > 0 ? debugLogs[0].timestamp : null,
            newestEntry: debugLogs.length > 0 ? debugLogs[debugLogs.length - 1].timestamp : null,
            sessionId: sessionId,
            version: DEBUG_CONFIG.version,
            copyright: DEBUG_CONFIG.copyright
        };
        
        return stats;
    }
    
    function setupGlobalFunctions() {
        // Make debug functions available globally
        window.debugLog = debugLog;
        window.debugError = debugError;
        window.debugWarn = debugWarn;
        window.getDebugLogs = getDebugLogs;
        window.clearDebugLogs = clearDebugLogs;
        window.exportDebugLogs = exportDebugLogs;
        window.getDebugStats = getDebugStats;
        
        // Debug system info
        window.snapJournalDebug = {
            version: DEBUG_CONFIG.version,
            copyright: DEBUG_CONFIG.copyright,
            sessionId: sessionId,
            enabled: DEBUG_CONFIG.enabled,
            stats: getDebugStats
        };
        
        console.log(`[${DEBUG_CONFIG.name}] ✅ Global debug functions available:`, [
            'debugLog(message, data)',
            'debugError(message, error)',
            'debugWarn(message, data)',
            'getDebugLogs(filterOptions)',
            'clearDebugLogs()',
            'exportDebugLogs()',
            'getDebugStats()'
        ]);
    }
    
    // Monitor for errors and log them automatically
    window.addEventListener('error', function(event) {
        debugError('Uncaught error detected', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
    });
    
    // Monitor for unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        debugError('Unhandled promise rejection', {
            reason: event.reason,
            promise: event.promise
        });
    });
    
    // Log page lifecycle events
    document.addEventListener('DOMContentLoaded', function() {
        debugLog('📄 DOM content loaded');
    });
    
    window.addEventListener('load', function() {
        debugLog('🚀 Page fully loaded');
    });
    
    window.addEventListener('beforeunload', function() {
        debugLog('👋 Page unloading');
    });
    
    document.addEventListener('visibilitychange', function() {
        debugLog(`👁️ Page visibility changed: ${document.visibilityState}`);
    });
    
    // Periodic cleanup of old logs
    setInterval(() => {
        if (debugLogs.length > DEBUG_CONFIG.maxLogEntries * 1.2) {
            debugLogs = debugLogs.slice(-DEBUG_CONFIG.maxLogEntries);
            persistLogs();
            debugLog('🧹 Debug logs automatically trimmed', { 
                newCount: debugLogs.length 
            });
        }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Initial status log
    debugLog('✅ Debug system fully operational', {
        maxLogEntries: DEBUG_CONFIG.maxLogEntries,
        currentLogCount: debugLogs.length,
        storageKey: DEBUG_CONFIG.storageKey
    });
    
})();