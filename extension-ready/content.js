// Content script for annotation overlay
console.log('Screenshot Annotator content script loaded');

// Add connection test listener
chrome.runtime.onConnect.addListener((port) => {
  console.log('Content script: Connection established', port.name);
});

// Test message to confirm content script is active
chrome.runtime.sendMessage({action: 'contentScriptReady'}, (response) => {
  if (chrome.runtime.lastError) {
    console.log('Content script: No background script response (normal on load)');
  } else {
    console.log('Content script: Background communication confirmed');
  }
});

class AnnotationOverlay {
  constructor() {
    this.isActive = false;
    this.screenshot = null;
    this.annotations = [];
    this.overlay = null;
    this.isAddingAnnotation = false;
    this.pendingAnnotation = null;
    this.pendingAnnotationText = null; // NEW: Track speech-to-text result
    
    this.setupMessageListener();
  }
  
  setupMessageListener() {
    console.log('🎯 Content script setting up message listener...');
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🔔 Content script received message:', message.action, message);
      
      if (message.action === 'ping') {
        console.log('🏓 Content script ping received');
        sendResponse({ success: true, message: 'Content script is ready' });
        return true;
      }
      
      if (message.action === 'startAnnotation') {
        console.log('🚀 Starting annotation with screenshot:', message.screenshot?.id);
        try {
          this.startAnnotationMode(message.screenshot);
          console.log('✅ Annotation mode started successfully');
          sendResponse({ success: true, message: 'Annotation mode activated' });
        } catch (error) {
          console.error('❌ Error starting annotation:', error);
          sendResponse({ success: false, error: error.message });
        }
      } else if (message.action !== 'ping') {
        console.log('⚠️ Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
      }
      return true;
    });
    
    console.log('✅ Content script message listener setup complete');
  }
  
  startAnnotationMode(screenshot) {
    console.log('Starting annotation mode for screenshot:', screenshot.id);
    this.screenshot = screenshot;
    this.annotations = screenshot.annotations || [];
    this.isActive = true;
    
    this.createOverlay();
  }
  
  createOverlay() {
    // Remove existing overlay
    if (this.overlay) {
      this.overlay.remove();
    }
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create streamlined controls - much simpler
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      align-items: center;
      background: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    `;
    
    // Status/instruction
    const status = document.createElement('div');
    status.id = 'annotation-status';
    status.style.cssText = `
      font-size: 14px;
      color: #333;
      font-weight: 500;
    `;
    status.textContent = '🎯 Click on image for precise pinpoint annotation (text will be repositionable)';
    
    // Speech toggle button (always visible)
    const speechBtn = document.createElement('button');
    speechBtn.textContent = '🎤 Voice';
    speechBtn.title = 'Toggle speech input';
    speechBtn.style.cssText = `
      padding: 8px 16px;
      background: #ff5722;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    controls.appendChild(status);
    controls.appendChild(speechBtn);
    controls.appendChild(closeBtn);
    
    // Add debug info (temporary)
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = `
      font-size: 10px;
      color: #666;
      margin-left: 10px;
    `;
    debugInfo.textContent = `Annotations: ${this.annotations.length}`;
    controls.appendChild(debugInfo);
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      position: relative;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      max-width: 90vw;
      max-height: 70vh;
      overflow: auto;
    `;
    
    // Create image
    const img = document.createElement('img');
    img.src = this.screenshot.imageData;
    img.style.cssText = `
      max-width: 100%;
      height: auto;
      display: block;
      cursor: crosshair;
      border: 1px solid #ddd;
    `;
    
    imageContainer.appendChild(img);
    
    // Add existing annotations display
    this.renderExistingAnnotations(imageContainer, img);
    
    this.overlay.appendChild(controls);
    this.overlay.appendChild(imageContainer);
    document.body.appendChild(this.overlay);
    
    // 🚀 NEW SEAMLESS INTERACTION LOGIC
    let recognition = null;
    let isListening = false;
    let speechMode = false;
    
    // Speech recognition setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        isListening = true;
        speechBtn.textContent = '🔴 Listening...';
        speechBtn.style.background = '#f44336';
        status.textContent = '🎤 Listening... Speak your annotation, then click on the image';
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.pendingAnnotationText = transcript;
        status.textContent = `💬 "${transcript}" - Now click on the image to place it`;
        speechBtn.textContent = '✅ Voice Captured';
        speechBtn.style.background = '#4caf50';
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        speechBtn.textContent = '🎤 Voice';
        speechBtn.style.background = '#ff5722';
        
        switch(event.error) {
          case 'audio-capture':
            status.textContent = '❌ Microphone access denied. Click to try again or just click on image to type.';
            break;
          case 'not-allowed':
            status.textContent = '❌ Microphone permission denied. Just click on image to type annotation.';
            break;
          case 'no-speech':
            status.textContent = '❌ No speech detected. Click voice button to try again or click image to type.';
            break;
          default:
            status.textContent = `❌ Speech error. Click voice button to try again or click image to type.`;
        }
      };
      
      recognition.onend = () => {
        isListening = false;
        if (!this.pendingAnnotationText) {
          speechBtn.textContent = '🎤 Voice';
          speechBtn.style.background = '#ff5722';
          status.textContent = '🎯 Click on image for precise pinpoint annotation (text will be repositionable)';
        }
      };
    } else {
      speechBtn.disabled = true;
      speechBtn.title = 'Speech recognition not supported';
      speechBtn.style.opacity = '0.5';
    }
    
    // Speech button handler
    speechBtn.addEventListener('click', () => {
      if (!recognition) {
        alert('Speech recognition is not supported in this browser');
        return;
      }
      
      if (isListening) {
        recognition.stop();
      } else {
        this.pendingAnnotationText = null;
        try {
          recognition.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          status.textContent = '❌ Could not start speech recognition. Please check microphone permissions.';
        }
      }
    });
    
    // 🎯 SEAMLESS CLICK-TO-ANNOTATE
    img.addEventListener('click', async (e) => {
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      console.log(`📍 Image clicked at (${x}, ${y}) for precise pinpoint`);
      
      let annotationText = this.pendingAnnotationText;
      console.log('🔍 Pending annotation text:', annotationText);
      
      // If no speech text captured, prompt for text input
      if (!annotationText) {
        console.log('📝 No pending text, prompting user...');
        annotationText = prompt('Enter annotation text:');
        console.log('📝 User entered:', annotationText);
        
        if (!annotationText || !annotationText.trim()) {
          console.log('❌ User cancelled or entered empty text');
          return; // User cancelled or entered empty text
        }
      }
      
      // Calculate initial text position (offset from pinpoint to avoid overlap)
      // Smart positioning: try different positions to avoid image edges
      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;
      
      let textX, textY;
      
      // Try to position text to the right and up
      if (x + 100 < imgWidth) {
        textX = x + 80; // To the right
      } else {
        textX = x - 80; // To the left if not enough space
      }
      
      if (y > 50) {
        textY = y - 40; // Above
      } else {
        textY = y + 40; // Below if not enough space
      }
      
      // Create annotation object with both pinpoint and text positions
      const annotation = {
        id: Date.now().toString(),
        text: annotationText.trim(),
        x: x,        // Precise pinpoint location
        y: y,        // Precise pinpoint location
        textX: textX, // Text label position (draggable)
        textY: textY, // Text label position (draggable)
        pointer_x: x, // Legacy compatibility
        pointer_y: y, // Legacy compatibility
        timestamp: new Date().toISOString()
      };
      
      console.log('🎯 Creating advanced annotation object:', annotation);
      
      await this.addAnnotation(annotation);
      
      // Reset pending text and update status
      this.pendingAnnotationText = null;
      speechBtn.textContent = '🎤 Voice';
      speechBtn.style.background = '#ff5722';
      status.textContent = '✅ Annotation added! Drag text to reposition, drag red dot for precise pointing. Click again to add more.';
      
      console.log('✅ Advanced annotation added with draggable components');
    });
    
    closeBtn.addEventListener('click', () => {
      this.cleanup();
    });
    
    console.log('🚀 Seamless annotation overlay created - ready for immediate clicking');
  }
  
  renderExistingAnnotations(container, img) {
    console.log('Rendering existing annotations:', this.annotations.length);
    
    // Remove existing annotation markers
    container.querySelectorAll('.annotation-marker').forEach(marker => marker.remove());
    
    // Add annotation markers for each existing annotation
    this.annotations.forEach((annotation, index) => {
      this.createAnnotationMarker(container, img, annotation, index);
    });
  }
  
  createAnnotationMarker(container, img, annotation, index) {
    console.log(`🔧 Creating advanced annotation ${index + 1} with text: "${annotation.text}"`);
    
    // Create main annotation container for the entire annotation system
    const annotationSystem = document.createElement('div');
    annotationSystem.className = 'annotation-system';
    annotationSystem.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;
    
    // Create the precise pinpoint marker (where user clicked)
    const pinpoint = document.createElement('div');
    pinpoint.className = 'annotation-pinpoint';
    pinpoint.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: #ff4444;
      border: 2px solid white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      pointer-events: auto;
      cursor: crosshair;
      z-index: 10002;
    `;
    pinpoint.style.left = annotation.x + 'px';
    pinpoint.style.top = annotation.y + 'px';
    
    // Calculate initial text position (offset from pinpoint to avoid overlap)
    const textX = annotation.textX || (annotation.x + 60);
    const textY = annotation.textY || (annotation.y - 30);
    
    // Create the draggable text label
    const textLabel = document.createElement('div');
    textLabel.className = 'annotation-text-label';
    textLabel.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      max-width: 200px;
      min-width: 80px;
      word-wrap: break-word;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.3);
      pointer-events: auto;
      cursor: move;
      user-select: none;
      z-index: 10003;
      transform: translate(-50%, -50%);
    `;
    textLabel.style.left = textX + 'px';
    textLabel.style.top = textY + 'px';
    
    // Add numbered badge to text label
    const numberBadge = document.createElement('div');
    numberBadge.style.cssText = `
      position: absolute;
      top: -8px;
      left: -8px;
      width: 20px;
      height: 20px;
      background: #ff4444;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    numberBadge.textContent = (index + 1).toString();
    textLabel.appendChild(numberBadge);
    
    // Add text content
    const textContent = document.createElement('div');
    textContent.style.cssText = `margin-top: 4px;`;
    textContent.textContent = annotation.text || 'No text';
    textLabel.appendChild(textContent);
    
    // Create the connecting arrow (SVG for precise rotation)
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.className = 'annotation-arrow';
    arrow.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10001;
    `;
    
    const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    
    // Configure arrow appearance
    arrowLine.setAttribute('stroke', '#ff4444');
    arrowLine.setAttribute('stroke-width', '2');
    arrowLine.setAttribute('stroke-dasharray', '3,3');
    
    arrowHead.setAttribute('fill', '#ff4444');
    arrowHead.setAttribute('stroke', 'white');
    arrowHead.setAttribute('stroke-width', '1');
    
    arrow.appendChild(arrowLine);
    arrow.appendChild(arrowHead);
    
    // Function to update arrow position and rotation
    const updateArrow = () => {
      const pinX = annotation.x;
      const pinY = annotation.y;
      const labelX = parseFloat(textLabel.style.left);
      const labelY = parseFloat(textLabel.style.top);
      
      // Calculate arrow vector
      const dx = labelX - pinX;
      const dy = labelY - pinY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 20) { // Only show arrow if text is far enough
        // Line from pinpoint to text label edge
        const angle = Math.atan2(dy, dx);
        const labelRadius = 25; // Approximate label radius for edge calculation
        const endX = labelX - Math.cos(angle) * labelRadius;
        const endY = labelY - Math.sin(angle) * labelRadius;
        
        arrowLine.setAttribute('x1', pinX);
        arrowLine.setAttribute('y1', pinY);
        arrowLine.setAttribute('x2', endX);
        arrowLine.setAttribute('y2', endY);
        
        // Arrow head pointing toward text
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
    };
    
    // Make text label draggable
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    textLabel.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      
      const rect = container.getBoundingClientRect();
      const labelX = parseFloat(textLabel.style.left);
      const labelY = parseFloat(textLabel.style.top);
      
      dragOffset.x = e.clientX - rect.left - labelX;
      dragOffset.y = e.clientY - rect.top - labelY;
      
      textLabel.style.cursor = 'grabbing';
      textLabel.style.transform = 'translate(-50%, -50%) scale(1.05)';
      
      console.log(`🖱️ Started dragging annotation ${index + 1}`);
    });
    
    const handleMouseMove = (e) => {
      if (isDragging) {
        const rect = container.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;
        
        // Keep text within container bounds
        const maxX = container.offsetWidth - 20;
        const maxY = container.offsetHeight - 20;
        
        const clampedX = Math.max(20, Math.min(maxX, newX));
        const clampedY = Math.max(20, Math.min(maxY, newY));
        
        textLabel.style.left = clampedX + 'px';
        textLabel.style.top = clampedY + 'px';
        
        // Update stored position
        annotation.textX = clampedX;
        annotation.textY = clampedY;
        
        updateArrow();
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        textLabel.style.cursor = 'move';
        textLabel.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // Save updated position
        this.saveAnnotationsToStorage();
        
        console.log(`📍 Moved annotation ${index + 1} to (${annotation.textX}, ${annotation.textY})`);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Click to edit text
    textContent.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const newText = prompt('Edit annotation:', annotation.text);
      if (newText !== null && newText.trim() !== annotation.text) {
        annotation.text = newText.trim() || 'No text';
        textContent.textContent = annotation.text;
        this.saveAnnotationsToStorage();
        console.log(`✏️ Updated annotation ${index + 1} to: "${annotation.text}"`);
      }
    });
    
    // Make pinpoint draggable for precise positioning
    let isPinDragging = false;
    
    pinpoint.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isPinDragging = true;
      pinpoint.style.transform = 'translate(-50%, -50%) scale(1.5)';
      console.log(`🎯 Started moving pinpoint ${index + 1}`);
    });
    
    const handlePinMouseMove = (e) => {
      if (isPinDragging) {
        const rect = container.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;
        
        pinpoint.style.left = newX + 'px';
        pinpoint.style.top = newY + 'px';
        
        annotation.x = newX;
        annotation.y = newY;
        
        updateArrow();
      }
    };
    
    const handlePinMouseUp = () => {
      if (isPinDragging) {
        isPinDragging = false;
        pinpoint.style.transform = 'translate(-50%, -50%) scale(1)';
        this.saveAnnotationsToStorage();
        console.log(`🎯 Moved pinpoint ${index + 1} to (${annotation.x}, ${annotation.y})`);
      }
    };
    
    document.addEventListener('mousemove', handlePinMouseMove);
    document.addEventListener('mouseup', handlePinMouseUp);
    
    // Assemble the annotation system
    annotationSystem.appendChild(arrow);
    annotationSystem.appendChild(pinpoint);
    annotationSystem.appendChild(textLabel);
    
    container.appendChild(annotationSystem);
    
    // Initial arrow update
    updateArrow();
    
    console.log(`✅ Added advanced annotation ${index + 1} with draggable text and precise pinpoint`);
  }
  
  async addAnnotation(annotation) {
    try {
      this.annotations.push(annotation);
      
      // Create visual marker for the new annotation
      const imageContainer = this.overlay.querySelector('div:nth-child(2)'); // Image container
      const img = imageContainer.querySelector('img');
      this.createAnnotationMarker(imageContainer, img, annotation, this.annotations.length - 1);
      
      await this.saveAnnotationsToStorage();
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
  }
  
  async saveAnnotationsToStorage() {
    try {
      // Update storage
      const result = await chrome.storage.local.get('screenshots');
      const screenshots = result.screenshots || [];
      const index = screenshots.findIndex(s => s.id === this.screenshot.id);
      
      if (index !== -1) {
        screenshots[index].annotations = this.annotations;
        await chrome.storage.local.set({ screenshots: screenshots });
        console.log('Annotations saved to storage');
      }
    } catch (error) {
      console.error('Error saving annotations to storage:', error);
    }
  }
  
  async saveAnnotationUpdate() {
    await this.saveAnnotationsToStorage();
  }
  
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.isActive = false;
    this.isAddingAnnotation = false;
    console.log('Annotation mode closed');
  }
}

// Initialize content script
if (!window.screenshotAnnotator) {
  window.screenshotAnnotator = new AnnotationOverlay();
}