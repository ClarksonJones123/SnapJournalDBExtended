// PDF Export Initialization Script
console.log('🔍 PDF Export page loaded');
console.log('🔍 jsPDF available:', typeof window.jsPDF !== 'undefined');
console.log('🔍 URL params:', window.location.search);

// Show loading message immediately
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 DOM loaded');
    const status = document.getElementById('status');
    if (status) {
        status.textContent = 'Loading PDF export system...';
        status.className = 'status info';
        status.style.display = 'block';
    }
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