// PDF Export Initialization Script - CSP Compliant
console.log('🔍 PDF Export page loaded');
console.log('🔍 jsPDF available:', typeof window.jsPDF !== 'undefined');
console.log('🔍 URL params:', window.location.search);

// Initialize temp storage and PDF export system
async function initializePdfExportSystem() {
    try {
        console.log('🗄️ Initializing temp storage for PDF export...');
        
        // Initialize temp storage if available
        if (typeof TempStorageManager !== 'undefined') {
            window.tempStorage = new TempStorageManager();
            await window.tempStorage.init();
            console.log('✅ Temp storage initialized for PDF export');
        } else {
            console.warn('⚠️ TempStorageManager not available');
        }
        
        // Initialize PDF export page functionality
        // Note: PDF export is initialized via DOMContentLoaded in pdf-export.js
        // No need to call a separate initialization function
        console.log('🎨 PDF export system ready - PDFJournalExporter will initialize automatically');
        
    } catch (error) {
        console.error('❌ Failed to initialize PDF export system:', error);
        const status = document.getElementById('status');
        if (status) {
            status.textContent = `Initialization failed: ${error.message}`;
            status.className = 'status error';
            status.style.display = 'block';
        }
    }
}

// Show loading message immediately
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 DOM loaded');
    const status = document.getElementById('status');
    if (status) {
        status.textContent = 'Loading PDF export system...';
        status.className = 'status info';
        status.style.display = 'block';
    }
    
    // Initialize the PDF export system
    await initializePdfExportSystem();
});

// Error handling for script loading
window.addEventListener('error', (e) => {
    console.error('🔴 Page error:', e.error);
    const status = document.getElementById('status');
    if (status) {
        status.textContent = `Error loading: ${e.error?.message || 'Unknown error'}`;
        status.className = 'status error';
        status.style.display = 'block';
    }
});