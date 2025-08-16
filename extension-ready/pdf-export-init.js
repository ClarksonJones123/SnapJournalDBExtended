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
        if (typeof initializePdfExportPage === 'function') {
            console.log('🎨 Initializing PDF export page...');
            await initializePdfExportPage();
            console.log('✅ PDF export page initialized successfully');
        } else {
            console.warn('⚠️ PDF export page function not available yet');
            
            // Retry after a short delay if functions aren't loaded yet
            setTimeout(async () => {
                if (typeof initializePdfExportPage === 'function') {
                    console.log('🔄 Retrying PDF export page initialization...');
                    await initializePdfExportPage();
                    console.log('✅ PDF export page initialized on retry');
                } else {
                    console.error('❌ PDF export functions still not available');
                }
            }, 1000);
        }
        
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