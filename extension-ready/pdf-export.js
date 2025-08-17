class PDFJournalExporter {
    constructor() {
        this.tempStorage = null;
        this.isInitialized = false;
        this.exportData = null;
        
        console.log('[Snap Journal PDF] 🚀 Initializing PDF Exporter v2.0.1');
    }

    async init() {
        try {
            console.log('[Snap Journal PDF] 🔧 Initializing PDF exporter...');
            
            // Initialize storage
            this.tempStorage = new TempStorageManager();
            await this.tempStorage.init();
            
            // Load export data
            await this.loadExportData();
            
            // Initialize UI
            this.initializeUI();
            
            this.isInitialized = true;
            console.log('[Snap Journal PDF] ✅ PDF exporter initialized successfully');
            
        } catch (error) {
            console.error('[Snap Journal PDF] ❌ Failed to initialize PDF exporter:', error);
            this.showStatus('error', 'Failed to initialize PDF export system');
        }
    }

    async loadExportData() {
        try {
            // Check for export ID in URL
            const urlParams = new URLSearchParams(window.location.search);
            const exportId = urlParams.get('exportId');
            
            if (exportId) {
                console.log('[Snap Journal PDF] 📥 Loading export data from IndexedDB:', exportId);
                this.exportData = await this.tempStorage.getPdfExportData(exportId);
                
                if (!this.exportData || !this.exportData.screenshots) {
                    throw new Error('Invalid export data structure');
                }
                
                console.log('[Snap Journal PDF] ✅ Loaded export data:', this.exportData.screenshots.length, 'screenshots');
                
            } else {
                // Fallback to Chrome storage for smaller datasets
                console.log('[Snap Journal PDF] 📥 Loading export data from Chrome storage...');
                const result = await chrome.storage.local.get(['pdfExportData']);
                
                if (!result.pdfExportData) {
                    throw new Error('No export data found');
                }
                
                this.exportData = result.pdfExportData;
                console.log('[Snap Journal PDF] ✅ Loaded export data from Chrome storage');
            }
            
        } catch (error) {
            console.error('[Snap Journal PDF] ❌ Failed to load export data:', error);
            throw error;
        }
    }

    initializeUI() {
        try {
            // Display export information
            this.displayExportInfo();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show preview
            this.showPreview();
            
            console.log('[Snap Journal PDF] ✅ UI initialized');
            
        } catch (error) {
            console.error('[Snap Journal PDF] ❌ Failed to initialize UI:', error);
        }
    }

    setupEventListeners() {
        const generateBtn = document.getElementById('generatePdfBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const previewBtn = document.getElementById('previewBtn');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePDF());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => window.close());
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.togglePreview());
        }
    }

    displayExportInfo() {
        const exportInfoElement = document.getElementById('exportInfo');
        if (!exportInfoElement || !this.exportData) return;
        
        const totalAnnotations = this.exportData.screenshots.reduce((total, screenshot) => {
            return total + (screenshot.annotations ? screenshot.annotations.length : 0);
        }, 0);
        
        exportInfoElement.innerHTML = `
            <div class="export-stats">
                <div class="stat-item">
                    <span class="stat-label">Screenshots:</span>
                    <span class="stat-value">${this.exportData.screenshots.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Annotations:</span>
                    <span class="stat-value">${totalAnnotations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Export Date:</span>
                    <span class="stat-value">${new Date(this.exportData.exportDate).toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Storage Method:</span>
                    <span class="stat-value">${this.exportData.exportMethod || 'Chrome Storage'}</span>
                </div>
            </div>
        `;
    }

    showPreview() {
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer || !this.exportData) return;
        
        previewContainer.innerHTML = '';
        
        // Show first few screenshots as preview
        const previewCount = Math.min(3, this.exportData.screenshots.length);
        
        for (let i = 0; i < previewCount; i++) {
            const screenshot = this.exportData.screenshots[i];
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            previewItem.innerHTML = `
                <div class="preview-thumbnail">
                    <img src="${screenshot.imageData}" alt="Screenshot ${i + 1}" loading="lazy">
                </div>
                <div class="preview-info">
                    <div class="preview-title">${screenshot.title || 'Untitled'}</div>
                    <div class="preview-timestamp">${new Date(screenshot.timestamp).toLocaleString()}</div>
                    <div class="preview-annotations">${screenshot.annotations ? screenshot.annotations.length : 0} annotations</div>
                </div>
            `;
            
            previewContainer.appendChild(previewItem);
        }
        
        if (this.exportData.screenshots.length > previewCount) {
            const moreInfo = document.createElement('div');
            moreInfo.className = 'preview-more';
            moreInfo.textContent = `... and ${this.exportData.screenshots.length - previewCount} more screenshots`;
            previewContainer.appendChild(moreInfo);
        }
    }

    togglePreview() {
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer) return;
        
        if (previewContainer.style.display === 'none') {
            previewContainer.style.display = 'block';
            this.showPreview();
        } else {
            previewContainer.style.display = 'none';
        }
    }

    async generatePDF() {
        try {
            console.log('[Snap Journal PDF] 📄 Starting PDF generation...');
            this.showStatus('info', 'Generating PDF...');
            this.showLoading(true);
            
            if (!this.exportData || !this.exportData.screenshots) {
                throw new Error('No screenshot data available for export');
            }
            
            const screenshots = this.exportData.screenshots;
            console.log('[Snap Journal PDF] 📊 Processing', screenshots.length, 'screenshots');
            
            // Create new jsPDF instance
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // PDF dimensions
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = pageHeight - (margin * 2);
            
            console.log('[Snap Journal PDF] 📏 PDF dimensions:', { pageWidth, pageHeight, contentWidth, contentHeight });
            
            // Add title page
            this.addTitlePage(pdf, pageWidth, pageHeight, margin);
            
            // Process each screenshot
            for (let i = 0; i < screenshots.length; i++) {
                const screenshot = screenshots[i];
                
                console.log('[Snap Journal PDF] 🖼️ Processing screenshot', i + 1, 'of', screenshots.length);
                this.updateProgress(((i + 1) / screenshots.length) * 100);
                
                // Add new page for each screenshot
                pdf.addPage();
                
                await this.addScreenshotPage(pdf, screenshot, i + 1, pageWidth, pageHeight, margin, contentWidth, contentHeight);
                
                // Add small delay to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `snap-journal-${timestamp}.pdf`;
            
            console.log('[Snap Journal PDF] 💾 Saving PDF:', filename);
            this.showStatus('success', 'PDF generated successfully!');
            
            // Save the PDF
            pdf.save(filename);
            
            // Clean up export data if from IndexedDB
            const urlParams = new URLSearchParams(window.location.search);
            const exportId = urlParams.get('exportId');
            if (exportId) {
                await this.tempStorage.deletePdfExportData(exportId);
                console.log('[Snap Journal PDF] 🧹 Cleaned up export data');
            }
            
            // Notify completion
            chrome.runtime.sendMessage({
                action: 'pdfExportCompleted',
                success: true,
                filename: filename,
                screenshotCount: screenshots.length
            });
            
            console.log('[Snap Journal PDF] ✅ PDF export completed successfully');
            
        } catch (error) {
            console.error('[Snap Journal PDF] ❌ PDF generation failed:', error);
            this.showStatus('error', `PDF generation failed: ${error.message}`);
            
            chrome.runtime.sendMessage({
                action: 'pdfExportCompleted',
                success: false,
                error: error.message
            });
            
        } finally {
            this.showLoading(false);
        }
    }

    addTitlePage(pdf, pageWidth, pageHeight, margin) {
        const centerX = pageWidth / 2;
        const startY = 40;
        
        // Title
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SNAP JOURNAL', centerX, startY, { align: 'center' });
        
        // Subtitle
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Medical Grade Screenshot Documentation', centerX, startY + 15, { align: 'center' });
        
        // Export information
        pdf.setFontSize(12);
        const exportDate = new Date().toLocaleString();
        const screenshotCount = this.exportData.screenshots.length;
        const totalAnnotations = this.exportData.screenshots.reduce((total, s) => total + (s.annotations?.length || 0), 0);
        
        const infoY = startY + 40;
        pdf.text(`Export Date: ${exportDate}`, centerX, infoY, { align: 'center' });
        pdf.text(`Screenshots: ${screenshotCount}`, centerX, infoY + 8, { align: 'center' });
        pdf.text(`Total Annotations: ${totalAnnotations}`, centerX, infoY + 16, { align: 'center' });
        
        // Copyright notice
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`${this.metadata.copyright}`, centerX, pageHeight - 20, { align: 'center' });
        pdf.text('Generated by Snap Journal - Medical Grade Screenshot Annotation', centerX, pageHeight - 12, { align: 'center' });
    }

    async addScreenshotPage(pdf, screenshot, pageNumber, pageWidth, pageHeight, margin, contentWidth, contentHeight) {
        try {
            // Add timestamp header with enhanced formatting
            const timestamp = new Date(screenshot.timestamp);
            const formattedDate = timestamp.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const formattedTime = timestamp.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: true 
            });
            
            // Header with timestamp
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            const headerText = `📸 Captured: ${formattedDate} at ${formattedTime}`;
            pdf.text(headerText, pageWidth / 2, margin + 8, { align: 'center' });
            
            // Add horizontal spacing (10mm from header)
            const imageStartY = margin + 18;
            
            // Convert image to fit within content area
            const img = new Image();
            img.src = screenshot.imageData;
            
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
            
            // Calculate image dimensions to fit within content area
            const imgAspectRatio = img.naturalWidth / img.naturalHeight;
            let imgWidth = contentWidth;
            let imgHeight = imgWidth / imgAspectRatio;
            
            // If image is too tall, scale by height instead
            const maxImageHeight = contentHeight - 28; // Account for header and spacing
            if (imgHeight > maxImageHeight) {
                imgHeight = maxImageHeight;
                imgWidth = imgHeight * imgAspectRatio;
            }
            
            // Center the image horizontally
            const imgX = (pageWidth - imgWidth) / 2;
            const imgY = imageStartY;
            
            // Add image to PDF
            pdf.addImage(screenshot.imageData, 'PNG', imgX, imgY, imgWidth, imgHeight, '', 'FAST');
            
            // Add page number at bottom
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            
            console.log('[Snap Journal PDF] ✅ Added screenshot page:', pageNumber);
            
        } catch (error) {
            console.error('[Snap Journal PDF] ❌ Failed to add screenshot page:', error);
            throw error;
        }
    }

    updateProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}%`;
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loadingIndicator');
        const generateBtn = document.getElementById('generatePdfBtn');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        
        if (generateBtn) {
            generateBtn.disabled = show;
            generateBtn.textContent = show ? 'Generating...' : '📄 Generate PDF Journal';
        }
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;
        
        statusElement.className = `status-message ${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    updateUIElements() {
        // Ensure all UI elements are properly initialized
        const elements = [
            'exportInfo', 'previewContainer', 'generatePdfBtn', 
            'cancelBtn', 'statusMessage', 'loadingIndicator'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn('[Snap Journal PDF] ⚠️ Missing UI element:', elementId);
            }
        });
    }
}

// Global instance
let pdfExporter;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        pdfExporter = new PDFJournalExporter();
        await pdfExporter.init();
    } catch (error) {
        console.error('[Snap Journal PDF] ❌ Failed to initialize PDF exporter:', error);
    }
});

// Make available globally for debugging
window.pdfExporter = pdfExporter;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFJournalExporter;
}