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
        console.log('🚀 Initializing PDF journal exporter...');
        
        try {
            // Wait for jsPDF to load
            await this.waitForJsPDF();
            console.log('✅ jsPDF loaded successfully');
            
            // Get export data from URL parameters or chrome storage
            const urlParams = new URLSearchParams(window.location.search);
            let exportDataStr = urlParams.get('data');
            const exportId = urlParams.get('exportId');
            
            console.log('🔍 URL params found:', !!exportDataStr || !!exportId);
            
            if (exportId) {
                // Load from chrome storage (for large datasets)
                console.log('📦 Loading export data from storage:', exportId);
                const result = await chrome.storage.local.get(exportId);
                this.exportData = result[exportId];
                
                if (!this.exportData) {
                    throw new Error('Export data not found in storage. Please try exporting again.');
                }
            } else if (exportDataStr) {
                // Load from URL parameters (legacy method)
                console.log('🔗 Loading export data from URL parameters');
                console.log('🔍 Export data length:', exportDataStr.length);
                this.exportData = JSON.parse(decodeURIComponent(exportDataStr));
            } else {
                throw new Error('No export data provided. Please try exporting again.');
            }
            
            this.screenshots = this.exportData.screenshots || [];
            
            console.log('✅ Export data loaded:', {
                screenshots: this.screenshots.length,
                totalAnnotations: this.exportData.totalAnnotations,
                exportDate: this.exportData.exportDate
            });
            
            if (this.screenshots.length === 0) {
                throw new Error('No screenshots found in export data');
            }
            
            this.setupInterface();
            this.setupEventListeners();
            
            // Hide initial loading status
            this.showStatus('✅ PDF export system ready', 'success');
            setTimeout(() => {
                const status = document.getElementById('status');
                if (status) status.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
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
        // Update export information
        document.getElementById('totalScreenshots').textContent = this.screenshots.length;
        document.getElementById('totalAnnotations').textContent = this.exportData.totalAnnotations || 0;
        document.getElementById('exportDate').textContent = new Date().toLocaleDateString();
        
        // Calculate journal size estimate
        const sizeEstimate = this.screenshots.length * 0.5; // Rough estimate in MB
        document.getElementById('journalSize').textContent = `~${sizeEstimate.toFixed(1)} MB`;
        
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
            
            // Create PDF document
            const jsPDF = this.jsPDF;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // PDF dimensions (A4)
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            
            // Add title page
            this.addTitlePage(pdf, pageWidth, pageHeight, margin);
            
            // Process each screenshot
            for (let i = 0; i < this.screenshots.length; i++) {
                const screenshot = this.screenshots[i];
                console.log(`📸 Processing screenshot ${i + 1}/${this.screenshots.length}`);
                
                if (i > 0) {
                    pdf.addPage();
                }
                
                await this.addScreenshotPage(pdf, screenshot, i + 1, pageWidth, pageHeight, margin, contentWidth);
                
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
    
    async addScreenshotPage(pdf, screenshot, pageNumber, pageWidth, pageHeight, margin, contentWidth) {
        const yOffset = margin;
        let currentY = yOffset;
        
        // Page header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Screenshot ${pageNumber}`, margin, currentY);
        
        // Screenshot info
        currentY += 15;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const captureDate = screenshot.captureDate || new Date(screenshot.timestamp).toLocaleDateString();
        const captureTime = screenshot.captureTime || new Date(screenshot.timestamp).toLocaleTimeString();
        
        pdf.text(`Title: ${screenshot.title}`, margin, currentY);
        currentY += 8;
        pdf.text(`Captured: ${captureDate} at ${captureTime}`, margin, currentY);
        currentY += 8;
        pdf.text(`Dimensions: ${screenshot.displayWidth}×${screenshot.displayHeight}`, margin, currentY);
        currentY += 8;
        pdf.text(`Annotations: ${screenshot.annotations?.length || 0}`, margin, currentY);
        currentY += 15;
        
        // Add screenshot image (now with annotations burned in!)
        try {
            const imageData = screenshot.imageData;
            if (imageData) {
                // Calculate image dimensions to fit page better - larger since we have annotated images
                const maxImageWidth = contentWidth;
                const maxImageHeight = 200; // Increased from 180 to show high-quality images better
                
                // Add image to PDF (now includes annotations!)
                pdf.addImage(imageData, 'PNG', margin, currentY, maxImageWidth, maxImageHeight);
                currentY += maxImageHeight + 15;
                
                console.log(`📄 Added high-quality annotated image for screenshot ${pageNumber}`);
                console.log(`🖼️ Image dimensions in PDF: ${maxImageWidth}x${maxImageHeight}mm`);
            }
        } catch (error) {
            console.error('Error adding image to PDF:', error);
            pdf.text('❌ Image could not be added', margin, currentY);
            currentY += 10;
        }
        
        // Add annotations
        if (screenshot.annotations && screenshot.annotations.length > 0) {
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Annotations:', margin, currentY);
            currentY += 10;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            screenshot.annotations.forEach((annotation, index) => {
                const annotationText = `${index + 1}. ${annotation.text}`;
                const position = `(${Math.round(annotation.x)}, ${Math.round(annotation.y)})`;
                
                // Check if we need a new page
                if (currentY > pageHeight - 50) {
                    pdf.addPage();
                    currentY = margin;
                    pdf.setFontSize(12);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`Screenshot ${pageNumber} - Annotations (continued)`, margin, currentY);
                    currentY += 15;
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                }
                
                pdf.text(`${annotationText} ${position}`, margin, currentY);
                currentY += 8;
            });
        }
        
        // Page footer
        pdf.setFontSize(8);
        pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    }
    
    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const screenshotPreview = document.getElementById('screenshotPreview');
        
        if (previewSection.style.display === 'none') {
            // Show preview
            previewSection.style.display = 'block';
            document.getElementById('previewBtn').textContent = '🙈 Hide Preview';
            
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
            document.getElementById('previewBtn').textContent = '👁️ Preview Journal';
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const controls = document.querySelector('.controls');
        
        if (show) {
            loading.style.display = 'block';
            controls.style.display = 'none';
        } else {
            loading.style.display = 'none';
            controls.style.display = 'block';
        }
    }
    
    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${percentage}%`;
    }
    
    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFJournalExporter();
});