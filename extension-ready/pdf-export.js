// PDF Journal Export System
console.log('📄 PDF Export system loaded');

class PDFJournalExporter {
    constructor() {
        this.screenshots = [];
        this.exportData = null;
        this.jsPDF = null;
        this.currentExportId = null; // Store export ID for cleanup
        
        console.log('🚀 PDFJournalExporter constructor called');
        this.init().catch(error => {
            console.error('❌ Initialization failed:', error);
            this.showStatus(`Initialization failed: ${error.message}`, 'error');
        });
    }
    
    async init() {
        console.log('🚀 === PDF EXPORT INITIALIZATION START ===');
        console.log('🚀 Initializing PDF journal exporter...');
        
        try {
            // Enhanced jsPDF loading with better error handling
            console.log('📚 Loading jsPDF library...');
            await this.waitForJsPDF();
            console.log('✅ jsPDF loaded successfully');
            
            // Get export data with enhanced debugging
            const urlParams = new URLSearchParams(window.location.search);
            let exportDataStr = urlParams.get('data');
            const exportId = urlParams.get('exportId');
            const method = urlParams.get('method'); // 'indexeddb' or undefined (chrome storage)
            
            console.log('🔍 URL params analysis:', { 
                hasExportDataStr: !!exportDataStr,
                hasExportId: !!exportId,
                exportIdValue: exportId,
                method: method || 'chrome',
                fullURL: window.location.href
            });
            
            if (exportId && method === 'indexeddb') {
                // NEW: Load from IndexedDB (for large datasets)
                console.log('🗄️ Loading export data from IndexedDB:', exportId);
                this.currentExportId = exportId;
                
                try {
                    // Enhanced IndexedDB initialization for PDF export context
                    if (!window.tempStorage) {
                        console.log('🗄️ Initializing IndexedDB for PDF export data retrieval...');
                        
                        // Create and initialize temp storage in PDF export context
                        if (typeof TempStorageManager !== 'undefined') {
                            window.tempStorage = new TempStorageManager();
                            console.log('🗄️ TempStorageManager instance created');
                            
                            await window.tempStorage.init();
                            console.log('✅ IndexedDB initialized in PDF export context');
                        } else {
                            throw new Error('TempStorageManager class not available in PDF export context');
                        }
                    }
                    
                    // Additional check to ensure database is ready
                    if (!window.tempStorage.db || !window.tempStorage.isReady) {
                        console.log('⚠️ Temp storage not fully ready, waiting...');
                        
                        let attempts = 0;
                        while ((!window.tempStorage.db || !window.tempStorage.isReady) && attempts < 50) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            attempts++;
                        }
                        
                        if (!window.tempStorage.db || !window.tempStorage.isReady) {
                            throw new Error('IndexedDB failed to initialize properly in PDF export context');
                        }
                    }
                    
                    console.log('🗄️ IndexedDB ready, attempting to retrieve export data...');
                    this.exportData = await window.tempStorage.getPdfExportData(exportId);
                    
                    if (!this.exportData) {
                        console.error('❌ Export data not found in IndexedDB');
                        throw new Error(`Export data not found in IndexedDB for ID: ${exportId}. The data may have expired or been cleared.`);
                    }
                    
                    console.log('✅ Export data loaded from IndexedDB:', {
                        screenshots: this.exportData.screenshots?.length || 0,
                        totalAnnotations: this.exportData.totalAnnotations,
                        exportDate: this.exportData.exportDate,
                        method: this.exportData.exportMethod
                    });
                    
                } catch (indexedDBError) {
                    console.error('❌ IndexedDB error:', indexedDBError);
                    throw new Error(`Failed to load export data from IndexedDB: ${indexedDBError.message}. Please try exporting again.`);
                }
                
            } else if (exportId) {
                // Original: Load from Chrome storage (for small datasets)
                console.log('📦 Loading export data from Chrome storage:', exportId);
                this.currentExportId = exportId;
                
                try {
                    // Enhanced Chrome storage check
                    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                        throw new Error('Chrome storage API not available');
                    }
                    
                    console.log('💾 Attempting to retrieve export data from Chrome storage...');
                    const result = await chrome.storage.local.get(exportId);
                    
                    console.log('💾 Chrome storage result:', {
                        hasResult: !!result,
                        hasExportData: !!result[exportId],
                        resultKeys: Object.keys(result)
                    });
                    
                    this.exportData = result[exportId];
                    
                    if (!this.exportData) {
                        console.error('❌ Export data not found in Chrome storage');
                        console.log('🔍 Available storage keys:', Object.keys(result));
                        throw new Error(`Export data not found in storage for ID: ${exportId}. The data may have expired or been cleared.`);
                    }
                    
                    console.log('✅ Export data loaded from Chrome storage:', {
                        screenshots: this.exportData.screenshots?.length || 0,
                        totalAnnotations: this.exportData.totalAnnotations,
                        exportDate: this.exportData.exportDate
                    });
                    
                } catch (storageError) {
                    console.error('❌ Chrome storage error:', storageError);
                    throw new Error(`Failed to load export data from storage: ${storageError.message}. Please try exporting again.`);
                }
                
            } else if (exportDataStr) {
                // Legacy URL parameter method (for very small datasets)
                console.log('🔗 Loading export data from URL parameters (legacy method)');
                console.log('🔍 Export data length:', exportDataStr.length);
                
                try {
                    this.exportData = JSON.parse(decodeURIComponent(exportDataStr));
                    console.log('✅ Export data parsed from URL parameters');
                } catch (parseError) {
                    console.error('❌ Failed to parse export data from URL:', parseError);
                    throw new Error(`Invalid export data format: ${parseError.message}`);
                }
                
            } else {
                console.error('❌ No export data provided in URL');
                throw new Error('No export data provided. Please ensure you accessed this page through the PDF export function.');
            }
            
            // Validate export data structure
            if (!this.exportData.screenshots || !Array.isArray(this.exportData.screenshots)) {
                console.error('❌ Invalid export data structure:', this.exportData);
                throw new Error('Invalid export data structure. Screenshots array is missing or invalid.');
            }
            
            // Validate export data structure with null checks
            if (!this.exportData || typeof this.exportData !== 'object') {
                throw new Error('Export data is missing or invalid structure');
            }
            
            if (!this.exportData.screenshots || !Array.isArray(this.exportData.screenshots)) {
                throw new Error('Export data missing screenshots array or invalid format');
            }
            
            this.screenshots = this.exportData.screenshots;
            
            console.log('✅ Export data validation complete:', {
                screenshots: this.screenshots.length,
                totalAnnotations: this.exportData.totalAnnotations || 0,
                exportDate: this.exportData.exportDate || 'Unknown',
                exportMethod: this.exportData.exportMethod || 'Chrome',
                dataStructureValid: true
            });
            
            if (this.screenshots.length === 0) {
                console.error('❌ No screenshots found in export data');
                throw new Error('No screenshots found in export data. Please ensure you have captured screenshots before exporting.');
            }
            
            // Validate screenshot data
            let validScreenshots = 0;
            let corruptedScreenshots = 0;
            
            this.screenshots.forEach((screenshot, index) => {
                if (screenshot.imageData && screenshot.imageData.startsWith('data:image/')) {
                    validScreenshots++;
                } else {
                    corruptedScreenshots++;
                    console.warn(`⚠️ Screenshot ${index + 1} has invalid or missing image data`);
                }
            });
            
            console.log('📊 Screenshot validation results:', {
                total: this.screenshots.length,
                valid: validScreenshots,
                corrupted: corruptedScreenshots
            });
            
            if (validScreenshots === 0) {
                throw new Error('No valid screenshot images found. All screenshot data appears to be corrupted.');
            }
            
            if (corruptedScreenshots > 0) {
                console.warn(`⚠️ ${corruptedScreenshots} corrupted screenshots detected - PDF will include only valid screenshots`);
            }
            
            // Setup interface and event listeners
            console.log('🎛️ Setting up PDF export interface...');
            this.setupInterface();
            this.setupEventListeners();
            
            // Hide initial loading status
            this.showStatus('✅ PDF export system ready', 'success');
            setTimeout(() => {
                const status = document.getElementById('status');
                if (status) status.style.display = 'none';
            }, 2000);
            
            console.log('✅ PDF journal exporter initialized successfully');
            console.log('🚀 === PDF EXPORT INITIALIZATION END ===');
            
        } catch (error) {
            console.error('❌ PDF export initialization failed:', error);
            console.error('❌ Error stack:', error.stack);
            console.log('🚀 === PDF EXPORT INITIALIZATION END (ERROR) ===');
            
            this.showStatus(`Initialization Error: ${error.message}`, 'error');
            
            // Show detailed error information to help with debugging
            document.body.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="color: #d32f2f;">PDF Export Failed</h1>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <strong>Error:</strong> ${error.message}
                    </div>
                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <strong>Troubleshooting Steps:</strong>
                        <ol>
                            <li>Go back to the main extension and try exporting again</li>
                            <li>If you have many screenshots, try clearing some old ones first</li>
                            <li>Check that the extension is properly installed and enabled</li>
                            <li>Reload the extension and try again</li>
                        </ol>
                    </div>
                    <button id="closeErrorBtn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close Window
                    </button>
                </div>
            `;
            
            // Add event listener for close button (CSP compliant)
            setTimeout(() => {
                const closeBtn = document.getElementById('closeErrorBtn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        window.close();
                    });
                }
            }, 100);
            
            throw error;
        }
    }
    
    async waitForJsPDF() {
        console.log('⏳ Waiting for jsPDF library...');
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkJsPDF = () => {
                attempts++;
                console.log(`🔍 Checking jsPDF (attempt ${attempts}/${maxAttempts})`);
                
                // Check for both window.jsPDF and window.jspdf.jsPDF (UMD pattern)
                if (window.jsPDF) {
                    this.jsPDF = window.jsPDF;
                    console.log('✅ jsPDF library loaded successfully from window.jsPDF');
                    console.log('🔍 jsPDF version:', this.jsPDF.version || 'unknown');
                    resolve();
                } else if (window.jspdf && window.jspdf.jsPDF) {
                    this.jsPDF = window.jspdf.jsPDF;
                    console.log('✅ jsPDF library loaded successfully from window.jspdf.jsPDF');
                    console.log('🔍 jsPDF version:', this.jsPDF.version || 'unknown');
                    resolve();  
                } else if (attempts >= maxAttempts) {
                    const error = new Error('jsPDF library failed to load after 5 seconds. Please check your internet connection.');
                    console.error('❌ jsPDF loading timeout:', error);
                    console.log('🔍 Available on window:', Object.keys(window).filter(key => key.toLowerCase().includes('pdf')));
                    reject(error);
                } else {
                    setTimeout(checkJsPDF, 100);
                }
            };
            
            checkJsPDF();
        });
    }
    
    setupInterface() {
        // Update export information with null checks
        const totalScreenshotsEl = document.getElementById('totalScreenshots');
        if (totalScreenshotsEl) {
            totalScreenshotsEl.textContent = this.screenshots.length;
        }
        
        const totalAnnotationsEl = document.getElementById('totalAnnotations');
        if (totalAnnotationsEl) {
            totalAnnotationsEl.textContent = this.exportData.totalAnnotations || 0;
        }
        
        const exportDateEl = document.getElementById('exportDate');
        if (exportDateEl) {
            exportDateEl.textContent = new Date().toLocaleDateString();
        }
        
        // Calculate journal size estimate
        const sizeEstimate = this.screenshots.length * 0.5; // Rough estimate in MB
        const journalSizeEl = document.getElementById('journalSize');
        if (journalSizeEl) {
            journalSizeEl.textContent = `~${sizeEstimate.toFixed(1)} MB`;
        }
        
        // Update page title
        document.title = `PDF Journal Export - ${this.screenshots.length} Screenshots`;
    }
    
    setupEventListeners() {
        document.getElementById('generatePdfBtn').addEventListener('click', () => {
            this.generatePDF();
        });
        
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });
        
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.close();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.generatePDF();
            }
        });
    }
    
    async generatePDF() {
        if (this.screenshots.length === 0) {
            this.showStatus('No screenshots to export', 'error');
            return;
        }
        
        try {
            console.log('📄 Starting PDF generation...');
            this.showLoading(true);
            this.updateProgress(0);
            
            // Create PDF document with NO BORDERS - fit to image size
            const jsPDF = this.jsPDF;
            
            // Get first screenshot to determine optimal PDF size
            const firstScreenshot = this.screenshots[0];
            let pdfWidth, pdfHeight;
            
            if (firstScreenshot) {
                // Calculate PDF dimensions based on image aspect ratio
                const imageAspectRatio = firstScreenshot.displayWidth / firstScreenshot.displayHeight;
                
                // Use A4 width as base, calculate height to match image aspect ratio
                // Add space for timestamp and horizontal spacing
                const baseWidth = 210; // A4 width in mm
                const timestampHeight = 20; // Space reserved for timestamp
                const horizontalSpacing = 20; // Space on sides
                
                pdfWidth = baseWidth + horizontalSpacing;
                pdfHeight = (baseWidth / imageAspectRatio) + timestampHeight;
                
                // If height is too large, use A4 height as base instead
                if (pdfHeight > 297 + timestampHeight) { // A4 height + timestamp space
                    const maxImageHeight = 297;
                    pdfHeight = maxImageHeight + timestampHeight;
                    pdfWidth = (maxImageHeight * imageAspectRatio) + horizontalSpacing;
                }
            } else {
                // Fallback to A4 with space for timestamp and spacing
                const timestampHeight = 20;
                const horizontalSpacing = 20;
                pdfWidth = 210 + horizontalSpacing;
                pdfHeight = 297 + timestampHeight;
            }
            
            console.log('📄 PDF dimensions calculated:', { width: pdfWidth, height: pdfHeight });
            
            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight] // Custom size to fit images perfectly
            });
            
            // NO MARGINS - fill entire page
            const margin = 0;
            const contentWidth = pdfWidth;
            const contentHeight = pdfHeight;
            
            // NO TITLE PAGE - Start directly with images
            
            // Process each screenshot
            for (let i = 0; i < this.screenshots.length; i++) {
                const screenshot = this.screenshots[i];
                console.log(`📸 Processing screenshot ${i + 1}/${this.screenshots.length}`);
                
                if (i > 0) {
                    pdf.addPage([pdfWidth, pdfHeight]); // Use same custom dimensions
                }
                
                await this.addScreenshotPage(pdf, screenshot, i + 1, pdfWidth, pdfHeight, margin, contentWidth, contentHeight);
                
                // Update progress
                const progress = ((i + 1) / this.screenshots.length) * 100;
                this.updateProgress(progress);
                
                // Small delay to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = `Screenshot-Journal-${timestamp}.pdf`;
            
            // Save PDF
            pdf.save(filename);
            
            this.showLoading(false);
            this.showStatus(`✅ PDF journal exported successfully as "${filename}"`, 'success');
            
            console.log('✅ PDF generation completed:', filename);
            
            // 🧹 TRIGGER MEMORY CLEANUP: Notify main extension to clean up memory
            try {
                console.log('🧹 Triggering post-export memory cleanup...');
                
                // Send message to background script to trigger cleanup
                chrome.runtime.sendMessage({ 
                    action: 'pdfExportCompleted',
                    exportId: this.currentExportId,
                    filename: filename
                });
                
                // Also clean up local storage data immediately
                if (this.currentExportId) {
                    await chrome.storage.local.remove(this.currentExportId);
                    console.log('🧹 Cleaned up export data from local storage');
                }
                
            } catch (cleanupError) {
                console.warn('⚠️ Failed to trigger post-export cleanup:', cleanupError);
            }
            
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            this.showLoading(false);
            this.showStatus(`Failed to generate PDF: ${error.message}`, 'error');
        }
    }
    
    addTitlePage(pdf, pageWidth, pageHeight, margin) {
        const centerX = pageWidth / 2;
        
        // Title
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Screenshot Journal', centerX, 60, { align: 'center' });
        
        // Subtitle
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Annotated Screenshot Documentation', centerX, 80, { align: 'center' });
        
        // Enhancement note
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Images include annotations with pinpoints and labels', centerX, 95, { align: 'center' });
        
        // Date and stats
        pdf.setFontSize(12);
        const exportDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        pdf.text(`Generated: ${exportDate}`, centerX, 125, { align: 'center' });
        pdf.text(`Total Screenshots: ${this.screenshots.length}`, centerX, 140, { align: 'center' });
        pdf.text(`Total Annotations: ${this.exportData.totalAnnotations}`, centerX, 155, { align: 'center' });
        
        // Add a decorative line
        pdf.setLineWidth(0.5);
        pdf.line(margin, 175, pageWidth - margin, 175);
        
        // Footer
        pdf.setFontSize(10);
        pdf.text('Created with Universal Screenshot Annotator', centerX, pageHeight - 30, { align: 'center' });
    }
    
    async addScreenshotPage(pdf, screenshot, pageNumber, pageWidth, pageHeight, margin, contentWidth, contentHeight) {
        console.log(`📄 Adding screenshot ${pageNumber} with timestamp and spacing`);
        
        try {
            const imageData = screenshot.imageData;
            if (imageData) {
                // Calculate spacing and layout for timestamp
                const timestampHeight = 15; // Space reserved for timestamp (in mm)
                const horizontalSpacing = 10; // Horizontal spacing between images (in mm) 
                const topMargin = 5; // Small top margin for timestamp
                
                // Available space for image after reserving space for timestamp
                const availableImageHeight = contentHeight - timestampHeight - topMargin;
                const availableImageWidth = contentWidth - (horizontalSpacing * 2);
                
                // Add timestamp at top of page
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 100, 100); // Gray color for timestamp
                
                // Get screenshot timestamp
                const timestamp = screenshot.timestamp || screenshot.captureDate || new Date().toISOString();
                const date = new Date(timestamp);
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric', 
                    month: 'short',
                    day: 'numeric'
                });
                const formattedTime = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const timestampText = `📸 Captured: ${formattedDate} at ${formattedTime}`;
                
                // Center the timestamp
                const centerX = pageWidth / 2;
                pdf.text(timestampText, centerX, topMargin + 8, { align: 'center' });
                
                // Reset text color to black for any other text
                pdf.setTextColor(0, 0, 0);
                
                // Calculate image dimensions to fit in available space
                // Get image dimensions to maintain aspect ratio
                const img = new Image();
                img.src = imageData;
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imgAspectRatio = img.width / img.height;
                        
                        let finalWidth = availableImageWidth;
                        let finalHeight = availableImageHeight;
                        
                        // Maintain aspect ratio
                        if (finalWidth / finalHeight > imgAspectRatio) {
                            finalWidth = finalHeight * imgAspectRatio;
                        } else {
                            finalHeight = finalWidth / imgAspectRatio;
                        }
                        
                        // Center the image horizontally and position below timestamp
                        const imageX = (pageWidth - finalWidth) / 2;
                        const imageY = topMargin + timestampHeight;
                        
                        console.log(`🖼️ Adding image with spacing: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}mm at (${imageX.toFixed(1)}, ${imageY.toFixed(1)})`);
                        
                        pdf.addImage(imageData, 'PNG', imageX, imageY, finalWidth, finalHeight);
                        
                        console.log(`📄 Added screenshot ${pageNumber} with timestamp: ${timestampText}`);
                        resolve();
                    };
                    
                    img.onerror = () => {
                        console.warn('⚠️ Image load error, using fallback dimensions');
                        // Fallback: use available space
                        const imageX = horizontalSpacing;
                        const imageY = topMargin + timestampHeight;
                        
                        pdf.addImage(imageData, 'PNG', imageX, imageY, availableImageWidth, availableImageHeight);
                        resolve();
                    };
                });
            }
        } catch (error) {
            console.error('Error adding image to PDF:', error);
            // If image fails, at least add page number and timestamp
            pdf.setFontSize(10);
            pdf.text(`Page ${pageNumber} - Error loading image`, 10, 20);
            
            // Still add timestamp even if image fails
            const timestamp = screenshot.timestamp || screenshot.captureDate || new Date().toISOString();
            const date = new Date(timestamp);
            const formattedTimestamp = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            pdf.text(`Timestamp: ${formattedTimestamp}`, 10, 35);
        }
    }
    
    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const screenshotPreview = document.getElementById('screenshotPreview');
        const previewBtn = document.getElementById('previewBtn');
        
        if (!previewSection || !screenshotPreview || !previewBtn) {
            console.warn('⚠️ Preview elements not found');
            return;
        }
        
        if (previewSection.style.display === 'none') {
            // Show preview
            previewSection.style.display = 'block';
            previewBtn.textContent = '🙈 Hide Preview';
            
            // Generate preview items
            screenshotPreview.innerHTML = '';
            
            this.screenshots.forEach((screenshot, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                
                const captureDate = screenshot.captureDate || new Date(screenshot.timestamp).toLocaleDateString();
                const annotationCount = screenshot.annotations?.length || 0;
                
                previewItem.innerHTML = `
                    <img src="${screenshot.imageData}" alt="Screenshot ${index + 1}" class="preview-image">
                    <div class="preview-title-text">${screenshot.title}</div>
                    <div class="preview-info">
                        📅 ${captureDate}<br>
                        📝 ${annotationCount} annotations<br>
                        📐 ${screenshot.displayWidth}×${screenshot.displayHeight}
                    </div>
                `;
                
                screenshotPreview.appendChild(previewItem);
            });
            
            // Scroll to preview
            previewSection.scrollIntoView({ behavior: 'smooth' });
            
        } else {
            // Hide preview
            previewSection.style.display = 'none';
            previewBtn.textContent = '👁️ Preview Journal';
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const controls = document.querySelector('.controls');
        
        if (loading && controls) {
            if (show) {
                loading.style.display = 'block';
                controls.style.display = 'none';
            } else {
                loading.style.display = 'none';
                controls.style.display = 'block';
            }
        } else {
            console.warn('⚠️ Loading or controls elements not found');
        }
    }
    
    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        } else {
            console.warn('⚠️ Progress fill element not found');
        }
    }
    
    showStatus(message, type) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
            
            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    if (status) {
                        status.style.display = 'none';
                    }
                }, 5000);
            }
        } else {
            console.warn('⚠️ Status element not found, logging to console:', `[${type}] ${message}`);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFJournalExporter();
});