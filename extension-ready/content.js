// Content script for Snap Journal
// This script provides fallback functionality for regular websites

(function() {
    'use strict';
    
    console.log('[Snap Journal] 🚀 Content script loaded on:', window.location.href);
    
    // Check if content script should run
    if (window.snapJournalContentLoaded) {
        console.log('[Snap Journal] ⚠️ Content script already loaded, skipping');
        return;
    }
    window.snapJournalContentLoaded = true;
    
    // Content script configuration
    const config = {
        name: 'Snap Journal',
        version: '2.0.1',
        debug: false
    };
    
    // Page information
    const pageInfo = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        loadTime: new Date().toISOString()
    };
    
    console.log('[Snap Journal] 📄 Page info:', pageInfo);
    
    // Message listener for communication with background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Snap Journal] 📨 Content script received message:', message);
        
        switch (message.action) {
            case 'getPageInfo':
                sendResponse({
                    success: true,
                    pageInfo: pageInfo,
                    config: config
                });
                break;
                
            case 'prepareCapture':
                preparePageForCapture()
                    .then(result => sendResponse({ success: true, result }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep channel open for async response
                
            case 'highlightElement':
                if (message.selector) {
                    highlightElement(message.selector);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'No selector provided' });
                }
                break;
                
            case 'ping':
                sendResponse({ 
                    success: true, 
                    message: 'Content script is active',
                    timestamp: new Date().toISOString()
                });
                break;
                
            default:
                console.log('[Snap Journal] ⚠️ Unknown message action:', message.action);
                sendResponse({ success: false, error: 'Unknown action' });
        }
    });
    
    // Prepare page for screenshot capture
    async function preparePageForCapture() {
        console.log('[Snap Journal] 📸 Preparing page for capture...');
        
        try {
            // Wait for page to be fully loaded
            await waitForPageLoad();
            
            // Scroll to top for consistent captures
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            
            // Hide any overlay elements that might interfere
            hideTemporaryOverlays();
            
            // Ensure all images are loaded
            await waitForImages();
            
            console.log('[Snap Journal] ✅ Page prepared for capture');
            
            return {
                prepared: true,
                scrollPosition: { x: window.scrollX, y: window.scrollY },
                pageSize: { width: document.body.scrollWidth, height: document.body.scrollHeight },
                viewportSize: { width: window.innerWidth, height: window.innerHeight }
            };
            
        } catch (error) {
            console.error('[Snap Journal] ❌ Failed to prepare page for capture:', error);
            throw error;
        }
    }
    
    // Wait for page to be fully loaded
    function waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
            }
        });
    }
    
    // Wait for all images to load
    function waitForImages() {
        return new Promise((resolve) => {
            const images = document.querySelectorAll('img');
            let loadedCount = 0;
            const totalImages = images.length;
            
            if (totalImages === 0) {
                resolve();
                return;
            }
            
            const checkComplete = () => {
                loadedCount++;
                if (loadedCount >= totalImages) {
                    resolve();
                }
            };
            
            images.forEach(img => {
                if (img.complete) {
                    checkComplete();
                } else {
                    img.addEventListener('load', checkComplete, { once: true });
                    img.addEventListener('error', checkComplete, { once: true });
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
        });
    }
    
    // Hide temporary overlays that might interfere with screenshots
    function hideTemporaryOverlays() {
        const selectors = [
            '.tooltip',
            '.popover',
            '.dropdown-menu',
            '[data-toggle="tooltip"]',
            '.hover-overlay'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.style.display !== 'none') {
                    el.style.visibility = 'hidden';
                    // Restore after a short delay
                    setTimeout(() => {
                        el.style.visibility = '';
                    }, 2000);
                }
            });
        });
    }
    
    // Highlight specific element (for debugging/testing)
    function highlightElement(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
                const originalStyle = element.style.cssText;
                
                // Add highlight
                element.style.outline = '3px solid #ff0000';
                element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    element.style.cssText = originalStyle;
                }, 3000);
            });
            
            console.log('[Snap Journal] ✅ Highlighted elements:', elements.length);
            
        } catch (error) {
            console.error('[Snap Journal] ❌ Failed to highlight element:', error);
        }
    }
    
    // Monitor page changes
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('[Snap Journal] 🔄 Page navigation detected:', currentUrl);
            
            // Update page info
            pageInfo.url = currentUrl;
            pageInfo.title = document.title;
            pageInfo.loadTime = new Date().toISOString();
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Page visibility change handler
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('[Snap Journal] 👁️ Page became visible');
        } else {
            console.log('[Snap Journal] 🙈 Page became hidden');
        }
    });
    
    // Keyboard shortcuts (optional)
    document.addEventListener('keydown', (event) => {
        // Ctrl+Shift+S for quick screenshot (optional feature)
        if (event.ctrlKey && event.shiftKey && event.key === 'S') {
            event.preventDefault();
            console.log('[Snap Journal] ⌨️ Keyboard shortcut triggered');
            
            // Send message to background script
            chrome.runtime.sendMessage({
                action: 'quickCapture',
                source: 'keyboard-shortcut',
                pageInfo: pageInfo
            });
        }
    });
    
    // Error handling
    window.addEventListener('error', (event) => {
        console.warn('[Snap Journal] ⚠️ Page error detected:', event.error);
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        console.log('[Snap Journal] 👋 Content script unloading');
        observer.disconnect();
    });
    
    // Make some functions available globally for debugging
    if (config.debug) {
        window.snapJournal = {
            config,
            pageInfo,
            preparePageForCapture,
            highlightElement,
            version: config.version
        };
    }
    
    console.log('[Snap Journal] ✅ Content script initialized successfully');
    
})();