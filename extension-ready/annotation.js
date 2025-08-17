class AnnotationSystem {
    constructor() {
        this.screenshot = null;
        this.annotations = [];
        this.annotationCounter = 0;
        this.isLoading = true;
        this.tempStorage = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('[Snap Journal] 🚀 Initializing annotation system...');
            
            // Initialize storage
            this.tempStorage = new TempStorageManager();
            await this.tempStorage.init();
            
            // Load screenshot data
            await this.loadScreenshotData();
            
            // Initialize UI
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isLoading = false;
            console.log('[Snap Journal] ✅ Annotation system initialized');
            
        } catch (error) {
            console.error('[Snap Journal] ❌ Failed to initialize annotation system:', error);
            this.showError('Failed to initialize annotation system');
        }
    }

    async loadScreenshotData() {
        try {
            // Try to get from Chrome storage first
            const result = await chrome.storage.local.get(['currentScreenshot']);
            
            if (result.currentScreenshot) {
                this.screenshot = result.currentScreenshot;
                this.annotations = this.screenshot.annotations || [];
                this.annotationCounter = this.annotations.length;
            } else {
                throw new Error('No screenshot data found');
            }
            
        } catch (error) {
            console.error('[Snap Journal] ❌ Failed to load screenshot data:', error);
            throw error;
        }
    }

    initializeUI() {
        // Display the screenshot
        this.displayScreenshot();
        
        // Initialize annotation controls  
        this.initializeControls();
        
        // Display existing annotations
        this.displayExistingAnnotations();
        
        console.log('[Snap Journal] ✅ UI initialized');
    }

    displayScreenshot() {
        const imageContainer = document.getElementById('imageContainer');
        const img = document.getElementById('screenshotImage');
        
        if (!img || !this.screenshot) return;
        
        img.src = this.screenshot.imageData;
        img.onload = () => {
            // Update screenshot dimensions
            this.screenshot.displayWidth = img.naturalWidth;
            this.screenshot.displayHeight = img.naturalHeight;
            
            // Update container size
            imageContainer.style.width = img.offsetWidth + 'px';
            imageContainer.style.height = img.offsetHeight + 'px';
            
            console.log('[Snap Journal] 📏 Image loaded:', {
                width: img.offsetWidth,
                height: img.offsetHeight,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight
            });
        };
    }

    initializeControls() {
        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAnnotations());
        }

        // Clear all button
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllAnnotations());
        }

        // Close button
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => window.close());
        }
    }

    setupEventListeners() {
        const imageContainer = document.getElementById('imageContainer');
        const img = document.getElementById('screenshotImage');
        
        if (!img || !imageContainer) return;
        
        // Click to add annotation
        img.addEventListener('click', (e) => this.handleImageClick(e));
        
        // Prevent context menu
        img.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle drag events for annotations
        imageContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        imageContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        imageContainer.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        console.log('[Snap Journal] ✅ Event listeners set up');
    }

    handleImageClick(e) {
        if (this.isLoading) return;
        
        // Get click coordinates relative to image
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate relative coordinates (0-1)
        const relativeX = x / e.target.offsetWidth;
        const relativeY = y / e.target.offsetHeight;
        
        console.log('[Snap Journal] 📍 Image clicked at:', { x, y, relativeX, relativeY });
        
        // Add annotation
        this.addAnnotation(x, y, relativeX, relativeY);
    }

    addAnnotation(x, y, relativeX, relativeY) {
        this.annotationCounter++;
        
        const annotation = {
            id: `annotation_${Date.now()}_${this.annotationCounter}`,
            x: x,
            y: y,
            relativeX: relativeX,
            relativeY: relativeY,
            text: `Annotation ${this.annotationCounter}`,
            timestamp: new Date().toISOString(),
            markerVisible: true,
            textVisible: true
        };
        
        this.annotations.push(annotation);
        this.renderAnnotation(annotation);
        
        // Focus on text input for immediate editing
        setTimeout(() => {
            const textElement = document.getElementById(`text_${annotation.id}`);
            if (textElement) {
                textElement.focus();
                textElement.select();
            }
        }, 100);
        
        console.log('[Snap Journal] ✅ Added annotation:', annotation);
    }

    renderAnnotation(annotation) {
        const imageContainer = document.getElementById('imageContainer');
        if (!imageContainer) return;
        
        // Create marker element
        const marker = document.createElement('div');
        marker.id = `marker_${annotation.id}`;
        marker.className = 'annotation-marker';
        marker.style.left = (annotation.x - 8) + 'px';
        marker.style.top = (annotation.y - 8) + 'px';
        marker.setAttribute('data-annotation-id', annotation.id);
        
        // Create text element
        const textElement = document.createElement('div');
        textElement.id = `text_${annotation.id}`;
        textElement.className = 'annotation-text';
        textElement.contentEditable = true;
        textElement.textContent = annotation.text;
        textElement.setAttribute('data-annotation-id', annotation.id);
        
        // Position text element
        const textX = Math.max(0, Math.min(annotation.x + 20, imageContainer.offsetWidth - 200));
        const textY = Math.max(0, annotation.y - 10);
        textElement.style.left = textX + 'px';
        textElement.style.top = textY + 'px';
        
        // Create arrow SVG
        const arrow = this.createArrow(annotation.id, annotation.x, annotation.y, textX + 10, textY + 10);
        
        // Add event listeners
        this.addAnnotationEventListeners(marker, textElement, annotation);
        
        // Add to container
        imageContainer.appendChild(marker);
        imageContainer.appendChild(textElement);
        imageContainer.appendChild(arrow);
        
        // Update arrow position
        this.updateArrow(annotation.id);
    }

    createArrow(annotationId, startX, startY, endX, endY) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = `arrow_${annotationId}`;
        svg.setAttribute('class', 'annotation-arrow');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '9';
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#ff0000');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.9');
        
        svg.appendChild(line);
        return svg;
    }

    updateArrow(annotationId) {
        const marker = document.getElementById(`marker_${annotationId}`);
        const textElement = document.getElementById(`text_${annotationId}`);
        const arrow = document.getElementById(`arrow_${annotationId}`);
        
        if (!marker || !textElement || !arrow) return;
        
        const markerRect = marker.getBoundingClientRect();
        const textRect = textElement.getBoundingClientRect();
        const containerRect = document.getElementById('imageContainer').getBoundingClientRect();
        
        // Calculate positions relative to container
        const startX = markerRect.left - containerRect.left + 8;
        const startY = markerRect.top - containerRect.top + 8;
        const endX = textRect.left - containerRect.left + 10;
        const endY = textRect.top - containerRect.top + 10;
        
        // Calculate distance
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        
        // Hide arrow if text is too close to marker
        if (distance < 30) {
            arrow.style.display = 'none';
            return;
        } else {
            arrow.style.display = 'block';
        }
        
        // Update SVG size and position
        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const maxX = Math.max(startX, endX);
        const maxY = Math.max(startY, endY);
        
        arrow.style.left = minX + 'px';
        arrow.style.top = minY + 'px';
        arrow.setAttribute('width', (maxX - minX + 10));
        arrow.setAttribute('height', (maxY - minY + 10));
        
        // Update line coordinates
        const line = arrow.querySelector('line');
        line.setAttribute('x1', startX - minX);
        line.setAttribute('y1', startY - minY);
        line.setAttribute('x2', endX - minX);
        line.setAttribute('y2', endY - minY);
    }

    addAnnotationEventListeners(marker, textElement, annotation) {
        // Text editing
        textElement.addEventListener('input', () => {
            annotation.text = textElement.textContent;
        });
        
        textElement.addEventListener('blur', () => {
            this.saveAnnotations();
        });
        
        // Double-click to edit
        textElement.addEventListener('dblclick', () => {
            textElement.focus();
            document.execCommand('selectAll');
        });
        
        // Make elements draggable
        this.makeDraggable(marker, annotation, 'marker');
        this.makeDraggable(textElement, annotation, 'text');
        
        // Delete on right-click
        marker.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.deleteAnnotation(annotation.id);
        });
        
        textElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.deleteAnnotation(annotation.id);
        });
    }

    makeDraggable(element, annotation, type) {
        let isDragging = false;
        let startX, startY, startElementX, startElementY;
        
        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startElementX = parseInt(element.style.left);
            startElementY = parseInt(element.style.top);
            
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = startElementX + deltaX;
            const newY = startElementY + deltaY;
            
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            
            // Update annotation coordinates
            if (type === 'marker') {
                annotation.x = newX + 8;
                annotation.y = newY + 8;
                
                // Update relative coordinates
                const img = document.getElementById('screenshotImage');
                if (img) {
                    annotation.relativeX = annotation.x / img.offsetWidth;
                    annotation.relativeY = annotation.y / img.offsetHeight;
                }
            }
            
            // Update arrow
            this.updateArrow(annotation.id);
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
                this.saveAnnotations();
            }
        });
        
        element.style.cursor = 'grab';
    }

    deleteAnnotation(annotationId) {
        const confirmed = confirm('Delete this annotation?');
        if (!confirmed) return;
        
        // Remove from annotations array
        this.annotations = this.annotations.filter(a => a.id !== annotationId);
        
        // Remove elements from DOM
        const marker = document.getElementById(`marker_${annotationId}`);
        const textElement = document.getElementById(`text_${annotationId}`);
        const arrow = document.getElementById(`arrow_${annotationId}`);
        
        if (marker) marker.remove();
        if (textElement) textElement.remove();
        if (arrow) arrow.remove();
        
        this.saveAnnotations();
        console.log('[Snap Journal] 🗑️ Deleted annotation:', annotationId);
    }

    displayExistingAnnotations() {
        if (!this.annotations || this.annotations.length === 0) return;
        
        this.annotations.forEach(annotation => {
            // Recalculate absolute positions from relative coordinates
            const img = document.getElementById('screenshotImage');
            if (img && annotation.relativeX !== undefined && annotation.relativeY !== undefined) {
                annotation.x = annotation.relativeX * img.offsetWidth;
                annotation.y = annotation.relativeY * img.offsetHeight;
            }
            
            this.renderAnnotation(annotation);
        });
        
        console.log('[Snap Journal] ✅ Displayed existing annotations:', this.annotations.length);
    }

    clearAllAnnotations() {
        const confirmed = confirm('Clear all annotations? This cannot be undone.');
        if (!confirmed) return;
        
        // Remove all annotation elements
        const imageContainer = document.getElementById('imageContainer');
        const markers = imageContainer.querySelectorAll('.annotation-marker');
        const texts = imageContainer.querySelectorAll('.annotation-text');
        const arrows = imageContainer.querySelectorAll('.annotation-arrow');
        
        markers.forEach(m => m.remove());
        texts.forEach(t => t.remove());
        arrows.forEach(a => a.remove());
        
        // Clear annotations array
        this.annotations = [];
        this.annotationCounter = 0;
        
        this.saveAnnotations();
        console.log('[Snap Journal] 🧹 Cleared all annotations');
    }

    async saveAnnotations() {
        try {
            if (!this.screenshot) return;
            
            // Update screenshot with current annotations
            this.screenshot.annotations = this.annotations;
            this.screenshot.lastModified = new Date().toISOString();
            
            // Save to storage
            await this.tempStorage.saveScreenshot(this.screenshot);
            
            // Update status
            this.showStatus('Annotations saved', 'success');
            
            console.log('[Snap Journal] 💾 Annotations saved:', this.annotations.length);
            
        } catch (error) {
            console.error('[Snap Journal] ❌ Failed to save annotations:', error);
            this.showStatus('Failed to save annotations', 'error');
        }
    }

    // Drag and drop handlers
    handleMouseDown(e) {
        // Handled by individual element event listeners
    }

    handleMouseMove(e) {
        // Handled by document-level mousemove listener
    }

    handleMouseUp(e) {
        // Handled by document-level mouseup listener
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }

    showError(message) {
        this.showStatus(message, 'error');
        console.error('[Snap Journal] ❌', message);
    }
}

// Initialize annotation system
let annotationSystem;

document.addEventListener('DOMContentLoaded', () => {
    annotationSystem = new AnnotationSystem();
});

// Make available globally for debugging
window.annotationSystem = annotationSystem;

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (annotationSystem && annotationSystem.annotations.length > 0) {
        annotationSystem.saveAnnotations();
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnnotationSystem;
}