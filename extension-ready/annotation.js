// Universal Annotation Interface - Works on ANY page!
console.log('🌐 Universal annotation interface loaded');

class UniversalAnnotator {
    constructor() {
        this.screenshot = null;
        this.annotations = [];
        this.pendingAnnotationText = null;
        this.recognition = null;
        this.isListening = false;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing universal annotator...');
        
        // Get screenshot data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const screenshotData = urlParams.get('screenshot');
        
        if (!screenshotData) {
            this.showError('No screenshot data provided');
            return;
        }
        
        try {
            this.screenshot = JSON.parse(decodeURIComponent(screenshotData));
            this.annotations = this.screenshot.annotations || [];
            console.log('✅ Screenshot data loaded:', this.screenshot.id);
            
            await this.setupInterface();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing annotator:', error);
            this.showError('Failed to load screenshot data');
        }
    }
    
    async setupInterface() {
        const imageContainer = document.getElementById('imageContainer');
        const loading = document.getElementById('loading');
        
        // Create image element
        const img = document.createElement('img');
        img.className = 'screenshot-image';
        img.src = this.screenshot.imageData;
        img.alt = 'Screenshot for annotation';
        
        // Add annotation count badge
        const countBadge = document.createElement('div');
        countBadge.className = 'annotation-count';
        countBadge.textContent = this.annotations.length;
        imageContainer.appendChild(countBadge);
        
        img.onload = () => {
            loading.remove();
            imageContainer.appendChild(img);
            
            // Render existing annotations
            this.renderExistingAnnotations(imageContainer, img);
            
            // Setup click handler for new annotations
            this.setupImageClickHandler(img, imageContainer);
            
            console.log('✅ Image loaded and annotation interface ready');
        };
        
        img.onerror = () => {
            this.showError('Failed to load screenshot image');
        };
        
        // Update window title
        document.title = `Annotating: ${this.screenshot.title}`;
    }
    
    setupEventListeners() {
        const voiceBtn = document.getElementById('voiceBtn');
        const closeBtn = document.getElementById('closeBtn');
        
        // Voice recognition setup
        this.setupSpeechRecognition(voiceBtn);
        
        // Close button
        closeBtn.addEventListener('click', () => {
            window.close();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.close();
            }
        });
    }
    
    setupSpeechRecognition(voiceBtn) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                voiceBtn.textContent = '🔴 Listening...';
                voiceBtn.className = 'btn-voice listening';
                this.updateStatus('🎤 Listening... Speak your annotation, then click on the image');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.pendingAnnotationText = transcript;
                voiceBtn.textContent = '✅ Voice Captured';
                voiceBtn.className = 'btn-voice captured';
                this.updateStatus(`💬 "${transcript}" - Now click on the image to place it`);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                voiceBtn.textContent = '🎤 Voice';
                voiceBtn.className = 'btn-voice';
                
                switch(event.error) {
                    case 'audio-capture':
                        this.updateStatus('❌ Microphone access denied. Click to try again or just click on image to type.');
                        break;
                    case 'not-allowed':
                        this.updateStatus('❌ Microphone permission denied. Just click on image to type annotation.');
                        break;
                    case 'no-speech':
                        this.updateStatus('❌ No speech detected. Click voice button to try again or click image to type.');
                        break;
                    default:
                        this.updateStatus(`❌ Speech error. Click voice button to try again or click image to type.`);
                }
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                if (!this.pendingAnnotationText) {
                    voiceBtn.textContent = '🎤 Voice';
                    voiceBtn.className = 'btn-voice';
                    this.updateStatus('🎯 Click on image for precise pinpoint annotation (text will be repositionable)');
                }
            };
            
            voiceBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.recognition.stop();
                } else {
                    this.pendingAnnotationText = null;
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.error('Error starting speech recognition:', error);
                        this.updateStatus('❌ Could not start speech recognition. Please check microphone permissions.');
                    }
                }
            });
            
        } else {
            voiceBtn.disabled = true;
            voiceBtn.style.opacity = '0.5';
            voiceBtn.title = 'Speech recognition not supported in this browser';
        }
    }
    
    setupImageClickHandler(img, container) {
        img.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎯 === SIMPLIFIED COORDINATE SYSTEM START ===');
            
            const rect = img.getBoundingClientRect();
            
            // Get click position relative to the displayed image
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            console.log('🖱️ Raw click coordinates:', { clickX, clickY });
            console.log('📐 Image display info:', {
                displaySize: `${img.offsetWidth}x${img.offsetHeight}`,
                naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
                boundingRect: rect
            });
            
            let annotationText = this.pendingAnnotationText;
            console.log('🔍 Pending annotation text:', annotationText);
            
            // If no speech text captured, prompt for text input
            if (!annotationText) {
                console.log('📝 No pending text, prompting user...');
                annotationText = prompt('Enter annotation text:');
                console.log('📝 User entered:', annotationText);
                
                if (!annotationText || !annotationText.trim()) {
                    console.log('❌ User cancelled or entered empty text');
                    return;
                }
            }
            
            // SIMPLIFIED: Store coordinates directly relative to the displayed image
            // We'll scale them when needed for storage/PDF, but keep display coordinates as primary
            const annotation = {
                id: Date.now().toString(),
                text: annotationText.trim(),
                // Store display coordinates directly
                x: clickX,
                y: clickY,
                textX: clickX + 60,  // Default text offset
                textY: clickY - 30,  // Default text offset
                timestamp: new Date().toISOString(),
                // Enhanced debug information
                debug: {
                    clickEvent: {
                        clientX: e.clientX,
                        clientY: e.clientY,
                        rectLeft: rect.left,
                        rectTop: rect.top,
                        clickRelativeToImage: { x: clickX, y: clickY }
                    },
                    imageInfo: {
                        displaySize: `${img.offsetWidth}x${img.offsetHeight}`,
                        naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
                        coordinates: 'DISPLAY_RELATIVE'
                    },
                    timestamp: new Date().toISOString()
                }
            };
            
            console.log('🎯 SIMPLIFIED ANNOTATION CREATED:', annotation);
            console.log('🎯 === SIMPLIFIED COORDINATE SYSTEM END ===');
            
            await this.addAnnotation(annotation, container, img);
            
            // Reset pending text
            this.pendingAnnotationText = null;
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.textContent = '🎤 Voice';
            voiceBtn.className = 'btn-voice';
            
            this.updateStatus('✅ Annotation added! Drag text to reposition, drag red dot for precise pointing. Click again to add more.');
        });
    }
    
    async addAnnotation(annotation, container, img) {
        this.annotations.push(annotation);
        this.createAnnotationMarker(container, img, annotation, this.annotations.length - 1);
        
        // Update annotation count
        const countBadge = container.querySelector('.annotation-count');
        if (countBadge) {
            countBadge.textContent = this.annotations.length;
        }
        
        // Save to storage
        await this.saveAnnotationsToStorage();
    }
    
    createAnnotationMarker(container, img, annotation, index) {
        console.log(`🔧 Creating annotation ${index + 1} with text: "${annotation.text}"`);
        console.log('🔍 SIMPLIFIED MARKER CREATION:', {
            displayCoords: `(${annotation.x}, ${annotation.y})`,
            textPos: `(${annotation.textX}, ${annotation.textY})`,
            coordinateSystem: 'DISPLAY_RELATIVE'
        });
        
        // COORDINATE PRECISION FIX: Account for CSS transform: translate(-50%, -50%)
        // The CSS centers elements on their coordinates, so we use coordinates directly
        const displayX = annotation.x;
        const displayY = annotation.y;
        const displayTextX = annotation.textX || (annotation.x + 60);
        const displayTextY = annotation.textY || (annotation.y - 30);
        
        console.log('🔧 PRECISE coordinates (accounting for CSS centering):', {
            pinpoint: `(${displayX.toFixed(1)}, ${displayY.toFixed(1)}) - CSS will center this`,
            textLabel: `(${displayTextX.toFixed(1)}, ${displayTextY.toFixed(1)}) - CSS will center this`
        });
        
        // Create annotation system container
        const annotationSystem = document.createElement('div');
        annotationSystem.className = 'annotation-system';
        
        // Create pinpoint using DISPLAY coordinates
        const pinpoint = document.createElement('div');
        pinpoint.className = 'annotation-pinpoint';
        pinpoint.style.left = displayX + 'px';
        pinpoint.style.top = displayY + 'px';
        
        // Create text label using DISPLAY coordinates
        const textLabel = document.createElement('div');
        textLabel.className = 'annotation-text-label';
        textLabel.style.left = displayTextX + 'px';
        textLabel.style.top = displayTextY + 'px';
        
        // Text content only (no number badge)
        const textContent = document.createElement('div');
        textContent.className = 'annotation-text-content';
        textContent.textContent = annotation.text || 'No text';
        textLabel.appendChild(textContent);
        
        // Create SVG arrow
        const arrow = this.createArrow();
        
        // Function to update arrow
        const updateArrow = () => {
            const pinX = annotation.x;
            const pinY = annotation.y;
            const labelX = parseFloat(textLabel.style.left);
            const labelY = parseFloat(textLabel.style.top);
            
            this.updateArrowPosition(arrow, pinX, pinY, labelX, labelY);
        };
        
        // Make text label draggable
        this.makeDraggable(textLabel, annotation, updateArrow, 'text');
        
        // Make pinpoint draggable
        this.makeDraggable(pinpoint, annotation, updateArrow, 'pin');
        
        // Double-click to edit text
        textContent.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const newText = prompt('Edit annotation:', annotation.text);
            if (newText !== null && newText.trim() !== annotation.text) {
                annotation.text = newText.trim() || 'No text';
                textContent.textContent = annotation.text;
                this.saveAnnotationsToStorage();
            }
        });
        
        // Assemble annotation system
        annotationSystem.appendChild(arrow);
        annotationSystem.appendChild(pinpoint);
        annotationSystem.appendChild(textLabel);
        
        container.appendChild(annotationSystem);
        
        // Initial arrow update
        updateArrow();
        
        console.log(`✅ Added annotation ${index + 1}`);
    }
    
    createArrow() {
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('class', 'annotation-arrow');
        arrow.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1001;
        `;
        
        const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        arrowLine.setAttribute('stroke', '#ff4444');
        arrowLine.setAttribute('stroke-width', '2');
        arrowLine.setAttribute('stroke-dasharray', '3,3');
        
        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrowHead.setAttribute('fill', '#ff4444');
        arrowHead.setAttribute('stroke', 'white');
        arrowHead.setAttribute('stroke-width', '1');
        
        arrow.appendChild(arrowLine);
        arrow.appendChild(arrowHead);
        
        return arrow;
    }
    
    updateArrowPosition(arrow, pinX, pinY, labelX, labelY) {
        const dx = labelX - pinX;
        const dy = labelY - pinY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const arrowLine = arrow.querySelector('line');
        const arrowHead = arrow.querySelector('polygon');
        
        if (length > 20) {
            const angle = Math.atan2(dy, dx);
            const labelRadius = 25;
            const endX = labelX - Math.cos(angle) * labelRadius;
            const endY = labelY - Math.sin(angle) * labelRadius;
            
            arrowLine.setAttribute('x1', pinX);
            arrowLine.setAttribute('y1', pinY);
            arrowLine.setAttribute('x2', endX);
            arrowLine.setAttribute('y2', endY);
            
            const headSize = 8;
            const headAngle = angle + Math.PI;
            const head1X = endX + Math.cos(headAngle + 0.5) * headSize;
            const head1Y = endY + Math.sin(headAngle + 0.5) * headSize;
            const head2X = endX + Math.cos(headAngle - 0.5) * headSize;
            const head2Y = endY + Math.sin(headAngle - 0.5) * headSize;
            
            arrowHead.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
            arrow.style.display = 'block';
        } else {
            arrow.style.display = 'none';
        }
    }
    
    makeDraggable(element, annotation, updateCallback, type) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            
            const rect = element.parentElement.getBoundingClientRect();
            const elementX = parseFloat(element.style.left);
            const elementY = parseFloat(element.style.top);
            
            dragOffset.x = e.clientX - rect.left - elementX;
            dragOffset.y = e.clientY - rect.top - elementY;
            
            element.style.cursor = 'grabbing';
            if (type === 'text') {
                element.style.transform = 'translate(-50%, -50%) scale(1.05)';
            } else {
                element.style.transform = 'translate(-50%, -50%) scale(1.5)';
            }
        });
        
        const handleMouseMove = (e) => {
            if (isDragging) {
                const rect = element.parentElement.getBoundingClientRect();
                const newX = e.clientX - rect.left - dragOffset.x;
                const newY = e.clientY - rect.top - dragOffset.y;
                
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
                
                // SIMPLIFIED: Update coordinates directly (display coordinates)
                if (type === 'text') {
                    annotation.textX = newX;
                    annotation.textY = newY;
                    
                    console.log('📝 Text dragged to:', { x: newX.toFixed(1), y: newY.toFixed(1) });
                } else {
                    annotation.x = newX;
                    annotation.y = newY;
                    
                    console.log('🔴 Red dot dragged to:', { x: newX.toFixed(1), y: newY.toFixed(1) });
                }
                
                updateCallback();
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = type === 'text' ? 'move' : 'crosshair';
                element.style.transform = 'translate(-50%, -50%) scale(1)';
                
                console.log(`✅ ${type === 'text' ? 'Text' : 'Red dot'} final position:`, {
                    x: (type === 'text' ? annotation.textX : annotation.x).toFixed(1),
                    y: (type === 'text' ? annotation.textY : annotation.y).toFixed(1)
                });
                
                this.saveAnnotationsToStorage();
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    renderExistingAnnotations(container, img) {
        console.log('Rendering existing annotations:', this.annotations.length);
        
        this.annotations.forEach((annotation, index) => {
            this.createAnnotationMarker(container, img, annotation, index);
        });
    }
    
    async saveAnnotationsToStorage() {
        try {
            console.log('💾 === SAVING ANNOTATIONS TO STORAGE (SIMPLIFIED) ===');
            
            // Get current image for scale calculations
            const img = document.querySelector('.screenshot-image');
            
            // Convert display coordinates to storage coordinates for consistency
            // We need to scale to original capture dimensions for storage
            const displayToStorageScaleX = this.screenshot.originalCaptureWidth / img.offsetWidth;
            const displayToStorageScaleY = this.screenshot.originalCaptureHeight / img.offsetHeight;
            
            console.log('📐 SIMPLIFIED SAVE COORDINATE CONVERSION:', {
                imgDisplaySize: `${img.offsetWidth}x${img.offsetHeight}`,
                originalCaptureSize: `${this.screenshot.originalCaptureWidth}x${this.screenshot.originalCaptureHeight}`,
                conversionScale: `${displayToStorageScaleX.toFixed(3)}x, ${displayToStorageScaleY.toFixed(3)}`
            });
            
            // Convert all annotation coordinates from display to storage coordinates
            const annotationsForStorage = this.annotations.map((annotation, index) => {
                const storageX = annotation.x * displayToStorageScaleX;
                const storageY = annotation.y * displayToStorageScaleY;
                const storageTextX = annotation.textX * displayToStorageScaleX;
                const storageTextY = annotation.textY * displayToStorageScaleY;
                
                console.log(`📍 Annotation ${index + 1} save conversion:`, {
                    displayCoords: `(${annotation.x.toFixed(1)}, ${annotation.y.toFixed(1)})`,
                    storageCoords: `(${storageX.toFixed(1)}, ${storageY.toFixed(1)})`
                });
                
                return {
                    ...annotation,
                    x: storageX,
                    y: storageY,
                    textX: storageTextX,
                    textY: storageTextY
                };
            });
            
            // Update the screenshot object with converted coordinates
            this.screenshot.annotations = annotationsForStorage;
            
            console.log('💾 ANNOTATIONS CONVERTED FOR STORAGE:', annotationsForStorage);
            
            // Save to Chrome storage
            const result = await chrome.storage.local.get('screenshots');
            const screenshots = result.screenshots || [];
            const index = screenshots.findIndex(s => s.id === this.screenshot.id);
            
            if (index !== -1) {
                screenshots[index].annotations = annotationsForStorage;
                await chrome.storage.local.set({ screenshots: screenshots });
                console.log('✅ Annotations saved to storage successfully');
                console.log('💾 === SAVE COMPLETE ===');
            }
        } catch (error) {
            console.error('❌ Error saving annotations:', error);
        }
    }
    
    updateStatus(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
        }
    }
    
    showError(message) {
        const imageContainer = document.getElementById('imageContainer');
        imageContainer.innerHTML = `<div class="error">❌ ${message}</div>`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new UniversalAnnotator();
});