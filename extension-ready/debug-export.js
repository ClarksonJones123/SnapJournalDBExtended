// Debug Export JavaScript
let consoleOutput = [];

// Override console.log to capture output
const originalLog = console.log;
console.log = function(...args) {
    originalLog.apply(console, args);
    consoleOutput.push(args.join(' '));
    updateConsoleDisplay();
};

function updateConsoleDisplay() {
    document.getElementById('consoleOutput').textContent = consoleOutput.slice(-10).join('\n');
}

function checkEnvironment() {
    console.log('🔍 Checking environment...');
    
    // Check Chrome APIs
    if (typeof chrome !== 'undefined' && chrome.storage) {
        document.getElementById('chromeApis').innerHTML = '✅ Available';
        document.getElementById('extensionContext').innerHTML = '✅ Extension context';
    }
    
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const paramsList = Array.from(params.entries()).map(([k,v]) => `${k}=${v.length > 50 ? v.substring(0,50) + '...' : v}`);
    document.getElementById('urlParams').textContent = paramsList.length ? paramsList.join(', ') : 'None';
    
    // Check jsPDF
    setTimeout(() => {
        if (window.jsPDF) {
            document.getElementById('jsPdfStatus').innerHTML = '✅ Loaded';
            document.getElementById('jsPdfVersion').textContent = window.jsPDF.version || 'Available';
        } else {
            document.getElementById('jsPdfStatus').innerHTML = '❌ Not found';
        }
    }, 1000);
}

function testJsPDF() {
    console.log('🧪 Testing jsPDF...');
    try {
        if (!window.jsPDF) {
            throw new Error('jsPDF not loaded');
        }
        
        const { jsPDF } = window.jsPDF;
        const pdf = new jsPDF();
        pdf.text('Test PDF', 20, 20);
        console.log('✅ jsPDF test successful');
        alert('✅ jsPDF is working! Check console for details.');
    } catch (error) {
        console.error('❌ jsPDF test failed:', error);
        alert('❌ jsPDF test failed: ' + error.message);
    }
}

function loadExportData() {
    console.log('📦 Testing export data loading...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const exportDataStr = urlParams.get('data');
    const exportId = urlParams.get('exportId');
    
    if (exportId && typeof chrome !== 'undefined') {
        console.log('🔗 Loading from storage:', exportId);
        chrome.storage.local.get(exportId).then(result => {
            const data = result[exportId];
            if (data) {
                document.getElementById('dataFound').innerHTML = '✅ Found in storage';
                document.getElementById('screenshotCount').textContent = data.screenshots?.length || 0;
                console.log('✅ Data loaded from storage:', data.screenshots?.length || 0, 'screenshots');
            } else {
                document.getElementById('dataFound').innerHTML = '❌ Not found in storage';
                console.log('❌ No data found in storage for ID:', exportId);
            }
        }).catch(error => {
            console.error('❌ Storage error:', error);
        });
    } else if (exportDataStr) {
        console.log('🔗 Loading from URL params');
        try {
            const data = JSON.parse(decodeURIComponent(exportDataStr));
            document.getElementById('dataFound').innerHTML = '✅ Found in URL';
            document.getElementById('screenshotCount').textContent = data.screenshots?.length || 0;
            console.log('✅ Data loaded from URL:', data.screenshots?.length || 0, 'screenshots');
        } catch (error) {
            document.getElementById('dataFound').innerHTML = '❌ Parse error';
            console.error('❌ Parse error:', error);
        }
    } else {
        document.getElementById('dataFound').innerHTML = '❌ No data found';
        console.log('❌ No export data found in URL or storage');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Debug page initialized');
    checkEnvironment();
});