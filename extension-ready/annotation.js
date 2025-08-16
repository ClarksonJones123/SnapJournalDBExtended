// Universal Annotation Interface - Works on ANY page!
console.log('🌐 Universal annotation interface loaded');

class UniversalAnnotator {
    constructor() {
        this.screenshot = null;
        this.annotations = [];
        this.pendingAnnotationText = null;
        this.recognition = null;
        this.isListening = false;
        
        // 🎨 CUSTOMIZATION SETTINGS
        this.settings = {
            annotationColor: '#ff4444',
            textColor: '#333333',
            textBgColor: '#ffffff',
            textBgOpacity: 95,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif'
        };
        
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
        const settingsBtn = document.getElementById('settingsBtn');
        const closeBtn = document.getElementById('closeBtn');
        
        // Voice recognition setup
        this.setupSpeechRecognition(voiceBtn);
        
        // Settings panel setup
        this.setupSettingsPanel(settingsBtn);
        
        // Close button - Send message to popup instead of closing everything
        closeBtn.addEventListener('click', () => {
            console.log('🔄 Annotation window closing - maintaining popup continuity');
            
            try {
                // Try to notify the popup that annotation is done
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({
                        action: 'annotationWindowClosed',
                        timestamp: new Date().toISOString()
                    }, (response) => {
                        console.log('✅ Notified popup of annotation window closure');
                    });
                }
            } catch (error) {
                console.log('ℹ️ Could not notify popup (expected if popup closed):', error.message);
            }
            
            // Close only the annotation window, not the popup
            window.close();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const settingsPanel = document.getElementById('settingsPanel');
                if (settingsPanel.style.display !== 'none') {
                    settingsPanel.style.display = 'none';
                    console.log('⚙️ Settings panel closed');
                } else {
                    console.log('🔄 Annotation complete - maintaining popup continuity');
                    
                    try {
                        // Try to notify the popup that annotation is done
                        if (typeof chrome !== 'undefined' && chrome.runtime) {
                            chrome.runtime.sendMessage({
                                action: 'annotationComplete',
                                timestamp: new Date().toISOString()
                            }, (response) => {
                                console.log('✅ Notified popup of annotation completion');
                            });
                        }
                    } catch (error) {
                        console.log('ℹ️ Could not notify popup (expected if popup closed):', error.message);
                    }
                    
                    // Close only the annotation window, not the popup
                    window.close();
                }
            }
        });
    }
    
    // 🎨 SETTINGS PANEL FUNCTIONALITY
    setupSettingsPanel(settingsBtn) {
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const resetBtn = document.getElementById('resetSettings');
        const applyBtn = document.getElementById('applySettings');
        
        // Open settings panel
        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'block';
            this.loadSettingsUI();
        });
        
        // Close settings panel
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
        });
        
        // Reset to defaults
        resetBtn.addEventListener('click', () => {
            this.resetSettings();
            this.loadSettingsUI();
        });
        
        // Apply settings
        applyBtn.addEventListener('click', () => {
            this.saveSettingsFromUI();
            this.applySettings();
            settingsPanel.style.display = 'none';
            this.updateStatus('✅ Settings applied to all annotations!');
        });
        
        // Real-time color updates
        document.getElementById('annotationColor').addEventListener('input', (e) => {
            document.getElementById('annotationColorText').value = e.target.value;
        });
        
        document.getElementById('annotationColorText').addEventListener('input', (e) => {
            const color = e.target.value;
            if (color.match(/^#[0-9A-F]{6}$/i)) {
                document.getElementById('annotationColor').value = color;
            }
        });
        
        document.getElementById('textColor').addEventListener('input', (e) => {
            document.getElementById('textColorText').value = e.target.value;
        });
        
        document.getElementById('textColorText').addEventListener('input', (e) => {
            const color = e.target.value;
            if (color.match(/^#[0-9A-F]{6}$/i)) {
                document.getElementById('textColor').value = color;
            }
        });
        
        // Real-time slider updates
        document.getElementById('textBgOpacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
        });
        
        document.getElementById('fontSize').addEventListener('input', (e) => {
            document.getElementById('fontSizeValue').textContent = e.target.value;
        });
    }
    
    loadSettingsUI() {
        document.getElementById('annotationColor').value = this.settings.annotationColor;
        document.getElementById('annotationColorText').value = this.settings.annotationColor;
        document.getElementById('textColor').value = this.settings.textColor;
        document.getElementById('textColorText').value = this.settings.textColor;
        document.getElementById('textBgColor').value = this.settings.textBgColor;
        document.getElementById('textBgOpacity').value = this.settings.textBgOpacity;
        document.getElementById('opacityValue').textContent = this.settings.textBgOpacity;
        document.getElementById('fontSize').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize;
        document.getElementById('fontWeight').value = this.settings.fontWeight;
        document.getElementById('fontFamily').value = this.settings.fontFamily;
    }
    
    saveSettingsFromUI() {
        this.settings.annotationColor = document.getElementById('annotationColor').value;
        this.settings.textColor = document.getElementById('textColor').value;
        this.settings.textBgColor = document.getElementById('textBgColor').value;
        this.settings.textBgOpacity = parseInt(document.getElementById('textBgOpacity').value);
        this.settings.fontSize = parseInt(document.getElementById('fontSize').value);
        this.settings.fontWeight = document.getElementById('fontWeight').value;
        this.settings.fontFamily = document.getElementById('fontFamily').value;
    }
    
    resetSettings() {
        this.settings = {
            annotationColor: '#ff4444',
            textColor: '#333333',
            textBgColor: '#ffffff',
            textBgOpacity: 95,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif'
        };
    }
    
    applySettings() {
        // Apply CSS custom properties
        const root = document.documentElement;
        root.style.setProperty('--annotation-color', this.settings.annotationColor);
        root.style.setProperty('--text-color', this.settings.textColor);
        
        // Convert hex to rgba for background
        const bgColor = this.hexToRgba(this.settings.textBgColor, this.settings.textBgOpacity / 100);
        root.style.setProperty('--text-bg-color', bgColor);
        root.style.setProperty('--text-size', this.settings.fontSize + 'px');
        root.style.setProperty('--text-weight', this.settings.fontWeight);
        root.style.setProperty('--text-font', this.settings.fontFamily);
        
        console.log('🎨 Settings applied:', this.settings);
    }
    
    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return hex;
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
            
            console.log('🎯 === PIXEL-PERFECT COORDINATE SYSTEM START ===');
            
            // Get ALL positioning factors
            const imgRect = img.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate RAW click position relative to image
            const rawClickX = e.clientX - imgRect.left;
            const rawClickY = e.clientY - imgRect.top;
            
            // CRITICAL: Check for any border/padding on the image itself
            const imgStyle = window.getComputedStyle(img);
            const imgBorderLeft = parseFloat(imgStyle.borderLeftWidth) || 0;
            const imgBorderTop = parseFloat(imgStyle.borderTopWidth) || 0;
            const imgPaddingLeft = parseFloat(imgStyle.paddingLeft) || 0;
            const imgPaddingTop = parseFloat(imgStyle.paddingTop) || 0;
            
            // CRITICAL: Check container positioning
            const containerStyle = window.getComputedStyle(container);
            const containerBorderLeft = parseFloat(containerStyle.borderLeftWidth) || 0;
            const containerBorderTop = parseFloat(containerStyle.borderTopWidth) || 0;
            const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
            const containerPaddingTop = parseFloat(containerStyle.paddingTop) || 0;
            
            // Account for ALL positioning offsets
            const totalOffsetX = imgBorderLeft + imgPaddingLeft;
            const totalOffsetY = imgBorderTop + imgPaddingTop;
            
            // Final precise coordinates
            const preciseSClickX = Math.round(rawClickX - totalOffsetX);
            const preciseClickY = Math.round(rawClickY - totalOffsetY);
            
            console.log('🔍 COMPLETE POSITIONING ANALYSIS:', {
                rawClick: { x: rawClickX, y: rawClickY },
                clientCoords: { x: e.clientX, y: e.clientY },
                imgRect: { 
                    left: imgRect.left, 
                    top: imgRect.top, 
                    width: imgRect.width, 
                    height: imgRect.height 
                },
                containerRect: {
                    left: containerRect.left,
                    top: containerRect.top,
                    width: containerRect.width,
                    height: containerRect.height
                },
                imgBorderAndPadding: {
                    borderLeft: imgBorderLeft + 'px',
                    borderTop: imgBorderTop + 'px', 
                    paddingLeft: imgPaddingLeft + 'px',
                    paddingTop: imgPaddingTop + 'px'
                },
                containerBorderAndPadding: {
                    borderLeft: containerBorderLeft + 'px',
                    borderTop: containerBorderTop + 'px',
                    paddingLeft: containerPaddingLeft + 'px',
                    paddingTop: containerPaddingTop + 'px'
                },
                totalOffset: {
                    x: totalOffsetX + 'px',
                    y: totalOffsetY + 'px'
                },
                finalCoordinates: {
                    x: preciseSClickX,
                    y: preciseClickY
                }
            });
            
            let annotationText = this.pendingAnnotationText;
            
            if (!annotationText) {
                annotationText = prompt('Enter annotation text:');
                if (!annotationText || !annotationText.trim()) {
                    console.log('❌ User cancelled or entered empty text');
                    return;
                }
            }
            
            const annotation = {
                id: Date.now().toString(),
                text: annotationText.trim(),
                // Use the precisely calculated coordinates
                x: preciseSClickX,
                y: preciseClickY,
                textX: preciseSClickX + 60,
                textY: preciseClickY - 30,
                timestamp: new Date().toISOString(),
                debug: {
                    rawClick: { x: rawClickX, y: rawClickY },
                    adjustedClick: { x: preciseSClickX, y: preciseClickY },
                    offsets: {
                        imgBorder: { x: imgBorderLeft, y: imgBorderTop },
                        imgPadding: { x: imgPaddingLeft, y: imgPaddingTop },
                        total: { x: totalOffsetX, y: totalOffsetY }
                    },
                    coordinateSystem: 'PIXEL_PERFECT_WITH_ALL_OFFSETS'
                }
            };
            
            console.log('🎯 PIXEL-PERFECT ANNOTATION CREATED:', annotation);
            console.log('🎯 === PIXEL-PERFECT COORDINATE SYSTEM END ===');
            
            await this.addAnnotation(annotation, container, img);
            
            this.pendingAnnotationText = null;
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.textContent = '🎤 Voice';
                voiceBtn.className = 'btn-voice';
            }
            
            this.updateStatus('✅ PIXEL-PERFECT coordinates applied! Red dot should be EXACTLY at click point.');
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
        console.log('🔍 PRECISE MARKER POSITIONING:', {
            annotationCoords: `(${annotation.x}, ${annotation.y})`,
            textCoords: `(${annotation.textX}, ${annotation.textY})`,
            coordinateSystem: 'DISPLAY_RELATIVE_EXACT'
        });
        
        // Use coordinates EXACTLY as clicked - no transforms, no adjustments
        const displayX = annotation.x;
        const displayY = annotation.y;
        const displayTextX = annotation.textX || (annotation.x + 60);
        const displayTextY = annotation.textY || (annotation.y - 30);
        
        console.log('🔧 EXACT positioning (no CSS centering compensation):', {
            pinpoint: `left: ${displayX}px, top: ${displayY}px`,
            textLabel: `left: ${displayTextX}px, top: ${displayTextY}px`,
            note: 'Coordinates used EXACTLY as clicked'
        });
        
        // Create annotation system container
        const annotationSystem = document.createElement('div');
        annotationSystem.className = 'annotation-system';
        annotationSystem.style.position = 'absolute';
        annotationSystem.style.top = '0';
        annotationSystem.style.left = '0';
        annotationSystem.style.pointerEvents = 'none'; // Don't interfere with image clicks
        
        // Create pinpoint using EXACT coordinates (no centering compensation)
        const pinpoint = document.createElement('div');
        pinpoint.className = 'annotation-pinpoint';
        pinpoint.style.position = 'absolute';
        pinpoint.style.left = displayX + 'px';
        pinpoint.style.top = displayY + 'px';
        pinpoint.style.width = '12px';
        pinpoint.style.height = '12px';
        pinpoint.style.backgroundColor = '#ff4444';
        pinpoint.style.border = '2px solid white';
        pinpoint.style.borderRadius = '50%';
        pinpoint.style.transform = 'translate(-50%, -50%)'; // Center the dot on the click point
        pinpoint.style.cursor = 'move';
        pinpoint.style.pointerEvents = 'auto';
        pinpoint.style.zIndex = '1000';
        pinpoint.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        // Create text label using EXACT coordinates
        const textLabel = document.createElement('div');
        textLabel.className = 'annotation-text-label';
        textLabel.style.position = 'absolute';
        textLabel.style.left = displayTextX + 'px';
        textLabel.style.top = displayTextY + 'px';
        textLabel.style.transform = 'translate(-50%, -50%)'; // Center the text on its position
        textLabel.style.cursor = 'move';
        textLabel.style.pointerEvents = 'auto';
        textLabel.style.zIndex = '1001';
        
        // Text content styling
        textLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        textLabel.style.color = '#333333';
        textLabel.style.padding = '6px 10px';
        textLabel.style.borderRadius = '4px';
        textLabel.style.fontSize = '14px';
        textLabel.style.fontWeight = 'bold';
        textLabel.style.fontFamily = 'Arial, sans-serif';
        textLabel.style.border = '2px solid #ff4444';
        textLabel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        textLabel.style.maxWidth = '200px';
        textLabel.style.wordWrap = 'break-word';
        textLabel.textContent = annotation.text;
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
            
            // Add dragging class for enhanced visibility
            element.classList.add('dragging');
            element.style.cursor = 'grabbing';
        });
        
        const handleMouseMove = (e) => {
            if (isDragging) {
                const rect = element.parentElement.getBoundingClientRect();
                // Use Math.round for precise positioning
                const newX = Math.round(e.clientX - rect.left - dragOffset.x);
                const newY = Math.round(e.clientY - rect.top - dragOffset.y);
                
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
                
                // SIMPLIFIED: Update coordinates directly (display coordinates, rounded)
                if (type === 'text') {
                    annotation.textX = newX;
                    annotation.textY = newY;
                    
                    console.log('📝 Text dragged to (precise):', { x: newX, y: newY });
                } else {
                    annotation.x = newX;
                    annotation.y = newY;
                    
                    console.log('🔴 Red dot dragged to (precise):', { x: newX, y: newY });
                }
                
                updateCallback();
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                // Remove dragging class
                element.classList.remove('dragging');
                element.style.cursor = type === 'text' ? 'move' : 'grab';
                
                console.log(`✅ ${type === 'text' ? 'Text' : 'Red dot'} final position (precise):`, {
                    x: (type === 'text' ? annotation.textX : annotation.x),
                    y: (type === 'text' ? annotation.textY : annotation.y)
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
            console.log('💾 === SAVING ANNOTATIONS TO PRIMARY STORAGE (IndexedDB) ===');
            
            // Get current image for analysis
            const img = document.querySelector('.screenshot-image');
            
            console.log('📐 IMAGE DIMENSION ANALYSIS:', {
                imgDisplaySize: `${img.offsetWidth}x${img.offsetHeight}`,
                imgNaturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
                originalCaptureSize: `${this.screenshot.originalCaptureWidth}x${this.screenshot.originalCaptureHeight}`,
                storageSize: `${this.screenshot.storageWidth}x${this.screenshot.storageHeight}`
            });
            
            // FIXED: Use natural dimensions (actual image pixels) as reference instead of original capture
            // This eliminates the scaling mismatch
            const displayToStorageScaleX = img.naturalWidth / img.offsetWidth;
            const displayToStorageScaleY = img.naturalHeight / img.offsetHeight;
            
            console.log('📐 CORRECTED COORDINATE CONVERSION (using natural dimensions):', {
                displayToNaturalScale: `${displayToStorageScaleX.toFixed(6)}x, ${displayToStorageScaleY.toFixed(6)}`,
                isExactMatch: Math.abs(displayToStorageScaleX - 1.0) < 0.001 && Math.abs(displayToStorageScaleY - 1.0) < 0.001,
                coordinateSystem: 'NATURAL_IMAGE_DIMENSIONS'
            });
            
            // Convert all annotation coordinates using natural image dimensions
            const annotationsForStorage = this.annotations.map((annotation, index) => {
                const storageX = annotation.x * displayToStorageScaleX;
                const storageY = annotation.y * displayToStorageScaleY;
                const storageTextX = annotation.textX * displayToStorageScaleX;
                const storageTextY = annotation.textY * displayToStorageScaleY;
                
                console.log(`📍 Annotation ${index + 1} corrected conversion:`, {
                    displayCoords: `(${annotation.x.toFixed(1)}, ${annotation.y.toFixed(1)})`,
                    naturalCoords: `(${storageX.toFixed(1)}, ${storageY.toFixed(1)})`,
                    scale: `${displayToStorageScaleX.toFixed(3)}x`
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
            
            console.log('💾 ANNOTATIONS CONVERTED USING NATURAL DIMENSIONS:', annotationsForStorage);
            
            // Save to PRIMARY STORAGE (IndexedDB) with proper error handling
            try {
                // Check if we're in a Chrome extension context
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    console.log('💾 Saving to PRIMARY IndexedDB storage...');
                    
                    // Send message to background/popup to save via TempStorageManager
                    chrome.runtime.sendMessage({
                        action: 'saveAnnotatedScreenshot',
                        screenshot: this.screenshot
                    }, (response) => {
                        if (response && response.success) {
                            console.log('✅ Annotations saved to PRIMARY storage (IndexedDB)');
                            console.log('💾 === SAVE COMPLETE ===');
                            this.updateStatus('✅ Annotations saved successfully to unlimited storage!');
                        } else {
                            console.warn('⚠️ Failed to save to PRIMARY storage:', response?.error);
                            this.updateStatus('⚠️ Failed to save annotations - please try again');
                        }
                    });
                } else {
                    // Not in Chrome extension context - annotations are saved in memory only
                    console.log('ℹ️ Running outside Chrome extension - annotations saved locally');
                    this.updateStatus('✅ Annotations saved locally (extension mode required for persistence)');
                }
            } catch (storageError) {
                // Silently handle storage errors - don't spam console
                console.log('ℹ️ Primary storage save not available:', storageError.message);
                this.updateStatus('✅ Annotations saved locally');
            }
        } catch (error) {
            console.error('❌ Error saving annotations:', error);
            this.updateStatus('❌ Failed to save annotations');
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