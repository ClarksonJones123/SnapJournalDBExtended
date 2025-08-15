// Emergency Storage Cleanup Script
// Run this in browser console on the extension popup to immediately free space

async function emergencyStorageCleanup() {
    console.log('🚨 Starting emergency storage cleanup...');
    
    try {
        // Get current storage usage
        const bytesInUse = await chrome.storage.local.getBytesInUse();
        console.log('📊 Current storage usage:', Math.round(bytesInUse / 1024 / 1024 * 100) / 100, 'MB');
        
        // Get all screenshots
        const result = await chrome.storage.local.get('screenshots');
        const screenshots = result.screenshots || [];
        console.log('📸 Found screenshots:', screenshots.length);
        
        if (screenshots.length === 0) {
            console.log('ℹ️ No screenshots to clean up');
            return;
        }
        
        // Keep only the 3 most recent screenshots
        screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const kept = screenshots.slice(0, 3);
        const removed = screenshots.length - kept.length;
        
        // Save reduced set
        await chrome.storage.local.set({ screenshots: kept });
        
        // Check new usage
        const newBytesInUse = await chrome.storage.local.getBytesInUse();
        const freed = bytesInUse - newBytesInUse;
        
        console.log('✅ Cleanup complete!');
        console.log('📉 Removed screenshots:', removed);
        console.log('📋 Kept screenshots:', kept.length);
        console.log('💾 Storage freed:', Math.round(freed / 1024 / 1024 * 100) / 100, 'MB');
        console.log('📊 New storage usage:', Math.round(newBytesInUse / 1024 / 1024 * 100) / 100, 'MB');
        
        alert(`✅ Emergency cleanup complete!\n\nRemoved: ${removed} screenshots\nFreed: ${Math.round(freed / 1024 / 1024 * 100) / 100} MB\nNew usage: ${Math.round(newBytesInUse / 1024 / 1024 * 100) / 100} MB`);
        
        // Refresh the popup UI
        if (window.screenshotAnnotator) {
            window.screenshotAnnotator.loadScreenshots().then(() => {
                window.screenshotAnnotator.updateUI();
            });
        }
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        alert('❌ Cleanup failed: ' + error.message);
    }
}

async function checkStorageStatus() {
    try {
        const bytesInUse = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB
        const usagePercent = Math.round((bytesInUse / quota) * 100);
        
        console.log('📊 Storage Status:');
        console.log('   Used:', Math.round(bytesInUse / 1024 / 1024 * 100) / 100, 'MB');
        console.log('   Quota:', Math.round(quota / 1024 / 1024), 'MB');
        console.log('   Usage:', usagePercent + '%');
        console.log('   Available:', Math.round((quota - bytesInUse) / 1024 / 1024 * 100) / 100, 'MB');
        
        const result = await chrome.storage.local.get('screenshots');
        const screenshots = result.screenshots || [];
        console.log('📸 Screenshots stored:', screenshots.length);
        
        if (screenshots.length > 0) {
            const avgSize = bytesInUse / screenshots.length;
            console.log('📏 Average screenshot size:', Math.round(avgSize / 1024), 'KB');
        }
        
        return { bytesInUse, quota, usagePercent, screenshotCount: screenshots.length };
        
    } catch (error) {
        console.error('❌ Status check failed:', error);
        return null;
    }
}

// Auto-run status check
console.log('🔧 Emergency Storage Tools Loaded');
console.log('📋 Available commands:');
console.log('   emergencyStorageCleanup() - Free up storage space immediately');
console.log('   checkStorageStatus() - Check current storage usage');
console.log('');
checkStorageStatus();