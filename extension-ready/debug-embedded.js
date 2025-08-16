// EMBEDDED DEBUG SYSTEM - PERSISTENT ACROSS ALL OPERATIONS
let debugOutput = [];
let debugVisible = true;
let debugInitialized = false;
const STORAGE_KEY = 'annotator_debug_history';
const MAX_HISTORY_ENTRIES = 200; // Increased for better continuity

// Immediately load debug history before any other operations
function initializeDebugSystem() {
    if (debugInitialized) return; // Prevent multiple initializations
    debugInitialized = true;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const history = JSON.parse(stored);
            const timeSinceLastEntry = Date.now() - history.timestamp;
            
            // Keep debug history for 4 hours (much longer)
            if (timeSinceLastEntry < 14400000) {
                debugOutput = [...(history.entries || [])];
                console.log('🔄 Debug history restored:', debugOutput.length, 'entries');
                return true;
            }
        }
    } catch (error) {
        console.warn('Debug history load failed:', error);
    }
    
    // Only start fresh if no valid history found
    debugOutput = [];
    return false;
}

// Initialize immediately
initializeDebugSystem();

function debugLog(message, data = null) {
    if (!debugInitialized) initializeDebugSystem();
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    if (data) {
        debugOutput.push(`${logEntry}\n  Data: ${JSON.stringify(data, null, 2)}`);
    } else {
        debugOutput.push(logEntry);
    }
    
    // Persist immediately on every log
    saveDebugHistory();
    updateDebugDisplay();
}

function debugError(message, error = null) {
    if (!debugInitialized) initializeDebugSystem();
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ❌ ${message}`;
    if (error) {
        debugOutput.push(`${logEntry}\n  Error: ${error.toString()}`);
    } else {
        debugOutput.push(logEntry);
    }
    
    // Persist immediately on every log
    saveDebugHistory();
    updateDebugDisplay();
}

function saveDebugHistory() {
    try {
        // Keep only the last MAX_HISTORY_ENTRIES to prevent storage bloat
        const recentHistory = debugOutput.slice(-MAX_HISTORY_ENTRIES);
        const historyData = {
            timestamp: Date.now(),
            entries: recentHistory,
            sessionStart: new Date().toISOString(),
            continuityMarker: `Session_${Date.now()}`
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
    } catch (error) {
        console.warn('Failed to save debug history:', error);
    }
}

function loadDebugHistory() {
    // This is now handled by initializeDebugSystem()
    return debugOutput.length > 0;
}

function updateDebugDisplay() {
    const debugDiv = document.getElementById('debugOutput');
    if (debugDiv) {
        debugDiv.innerHTML = debugOutput.slice(-20).join('\n').replace(/\n/g, '<br>');
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }
}

// AUTO-RUN DIAGNOSTICS
document.addEventListener('DOMContentLoaded', () => {
    // Always initialize debug system first
    const hasHistory = initializeDebugSystem();
    
    if (hasHistory) {
        debugLog(`🔄 Debug session resumed - ${debugOutput.length} entries maintained`);
    } else {
        debugLog('🔍 Starting new debug session...');
    }
    
    // Log current operation
    debugLog(`📱 Popup activity at ${new Date().toLocaleString()}`);
    debugLog('🔄 Debug continuity SHOULD persist across captures and annotations');
    
    // Check environment (but don't spam if already logged)
    const lastEntry = debugOutput[debugOutput.length - 2]; // Check second to last entry
    if (!lastEntry || !lastEntry.includes('Chrome APIs available')) {
        debugLog('Checking Chrome APIs...');
        if (typeof chrome !== 'undefined') {
            debugLog('✅ Chrome APIs available');
            if (chrome.storage) debugLog('✅ Chrome storage available');
            if (chrome.runtime) debugLog('✅ Chrome runtime available');
            if (chrome.tabs) debugLog('✅ Chrome tabs available');
        } else {
            debugError('❌ Chrome APIs not available');
        }
    }
    
    // Expose global debug functions for manual testing
    window.debugLog = debugLog;
    window.debugError = debugError;
    window.clearDebugHistory = () => {
        localStorage.removeItem(STORAGE_KEY);
        debugOutput = [];
        debugLog('🧹 Debug history manually cleared');
    };
    
    debugLog('✅ Persistent debug system loaded - use window.debugLog() or window.debugError() for manual testing');
    
    // Check DOM elements
    debugLog('Checking DOM elements...');
    const requiredElements = ['captureBtn', 'annotateBtn', 'screenshotsList'];
    let foundElements = 0;
    requiredElements.forEach(id => {
        if (document.getElementById(id)) {
            foundElements++;
        } else {
            debugError(`Missing element: ${id}`);
        }
    });
    debugLog(`✅ Found ${foundElements}/${requiredElements.length} required elements`);
    
    // Test background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        debugLog('Testing background script communication...');
        chrome.runtime.sendMessage({action: 'ping'}, (response) => {
            if (chrome.runtime.lastError) {
                debugError('Background script error', chrome.runtime.lastError);
            } else if (response) {
                debugLog('✅ Background script responding', response);
            } else {
                debugError('Background script not responding');
            }
        });
    }
    
    // Check storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        debugLog('Checking storage contents...');
        chrome.storage.local.get('screenshots', (result) => {
            const screenshots = result.screenshots || [];
            debugLog(`📊 Found ${screenshots.length} screenshots in storage`);
            
            if (screenshots.length > 0) {
                screenshots.forEach((s, i) => {
                    debugLog(`Screenshot ${i}: ${s.title || 'No title'}`, {
                        id: s.id,
                        hasImageData: !!s.imageData,
                        imageDataSize: s.imageData ? Math.round(s.imageData.length/1024) + 'KB' : 'N/A',
                        timestamp: s.timestamp
                    });
                });
            }
        });
        
        // Check storage quota
        if (chrome.storage.local.getBytesInUse) {
            chrome.storage.local.getBytesInUse((bytes) => {
                const quota = chrome.storage.local.QUOTA_BYTES || 10485760;
                debugLog(`💾 Storage: ${Math.round(bytes/1024)}KB / ${Math.round(quota/1024)}KB (${Math.round(bytes/quota*100)}%)`);
            });
        }
    }
    
    // Check ScreenshotAnnotator instance
    setTimeout(() => {
        if (window.screenshotAnnotator) {
            debugLog('✅ ScreenshotAnnotator instance found', {
                screenshots: window.screenshotAnnotator.screenshots?.length || 0,
                initialized: window.screenshotAnnotator.isInitialized || false
            });
        } else {
            debugError('❌ ScreenshotAnnotator instance not found');
        }
        
        debugLog('🏁 Diagnostics complete - ready for copy/paste');
    }, 2000);
    
    // Setup debug controls
    const copyBtn = document.getElementById('copyDebugBtn');
    const toggleBtn = document.getElementById('toggleDebugBtn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const debugText = debugOutput.join('\n');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(debugText).then(() => {
                    debugLog('📋 Debug info copied to clipboard!');
                }).catch(() => {
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = debugText;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    debugLog('📋 Debug info selected - press Ctrl+C to copy');
                });
            }
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const debugSection = document.getElementById('debugSection');
            if (debugSection) {
                debugVisible = !debugVisible;
                debugSection.style.display = debugVisible ? 'block' : 'none';
                toggleBtn.textContent = debugVisible ? '👁️ Hide Debug' : '👁️ Show Debug';
            }
        });
    }
});

// Intercept console.log to capture all output
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
    debugLog(`LOG: ${args.join(' ')}`);
    originalLog.apply(console, args);
};

console.error = function(...args) {
    debugError(`ERROR: ${args.join(' ')}`);
    originalError.apply(console, args);
};