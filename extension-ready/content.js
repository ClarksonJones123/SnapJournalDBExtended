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
    status.textContent = '🎯 Click anywhere on the image to add an annotation';
    
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
          status.textContent = '🎯 Click anywhere on the image to add an annotation';
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
      
      console.log(`📍 Image clicked at (${x}, ${y})`);
      
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
      
      // Create annotation immediately
      const annotation = {
        id: Date.now().toString(),
        text: annotationText.trim(),
        x: x,
        y: y,
        pointer_x: x,
        pointer_y: y,
        timestamp: new Date().toISOString()
      };
      
      console.log('🎯 Creating annotation object:', annotation);
      
      await this.addAnnotation(annotation);
      
      // Reset pending text and update status
      this.pendingAnnotationText = null;
      speechBtn.textContent = '🎤 Voice';
      speechBtn.style.background = '#ff5722';
      status.textContent = '✅ Annotation added! Click again to add more or close when done';
      
      console.log('✅ Seamless annotation added:', annotation.text);
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
    console.log(`🔧 Creating marker ${index + 1} with text: "${annotation.text}"`);
    
    // Create main annotation container
    const annotationGroup = document.createElement('div');
    annotationGroup.className = 'annotation-group';
    annotationGroup.style.cssText = `
      position: absolute;
      z-index: 10000;
      user-select: none;
      pointer-events: auto;
    `;
    
    // Position the group
    annotationGroup.style.left = annotation.x + 'px';
    annotationGroup.style.top = annotation.y + 'px';
    
    // Create the numbered marker (pin/dot)
    const marker = document.createElement('div');
    marker.className = 'annotation-marker';
    marker.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      background: #ff4444;
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      transform: translate(-12px, -12px);
      transition: all 0.2s ease;
    `;
    marker.textContent = (index + 1).toString();
    
    // Create the text label - ALWAYS VISIBLE
    const textLabel = document.createElement('div');
    textLabel.className = 'annotation-text';
    textLabel.style.cssText = `
      position: absolute;
      left: 20px;
      top: -8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      pointer-events: none;
    `;
    
    // Add arrow pointing to marker
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-right: 6px solid rgba(0, 0, 0, 0.8);
    `;
    textLabel.appendChild(arrow);
    
    // Set the text content
    textLabel.firstChild ? 
      textLabel.insertBefore(document.createTextNode(annotation.text || 'No text'), textLabel.firstChild) :
      textLabel.appendChild(document.createTextNode(annotation.text || 'No text'));
    
    // Assemble the annotation
    annotationGroup.appendChild(marker);
    annotationGroup.appendChild(textLabel);
    
    // Enhanced hover effects
    marker.addEventListener('mouseenter', () => {
      marker.style.background = '#ff6666';
      marker.style.transform = 'translate(-12px, -12px) scale(1.1)';
      textLabel.style.background = 'rgba(0, 0, 0, 0.95)';
      textLabel.style.transform = 'scale(1.05)';
    });
    
    marker.addEventListener('mouseleave', () => {
      marker.style.background = '#ff4444';
      marker.style.transform = 'translate(-12px, -12px) scale(1)';
      textLabel.style.background = 'rgba(0, 0, 0, 0.8)';
      textLabel.style.transform = 'scale(1)';
    });
    
    // Click to edit annotation
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      const newText = prompt('Edit annotation:', annotation.text);
      if (newText !== null && newText.trim() !== annotation.text) {
        annotation.text = newText.trim() || 'No text';
        textLabel.childNodes[0].textContent = annotation.text;
        this.saveAnnotationUpdate();
        console.log(`✏️ Updated annotation ${index + 1} to: "${annotation.text}"`);
      }
    });
    
    container.appendChild(annotationGroup);
    console.log(`✅ Added annotation ${index + 1} at (${annotation.x}, ${annotation.y}) with visible text: "${annotation.text}"`);
  }
  
  async addAnnotation(annotation) {
    try {
      this.annotations.push(annotation);
      
      // Create visual marker for the new annotation
      const imageContainer = this.overlay.querySelector('div:nth-child(2)'); // Image container
      const img = imageContainer.querySelector('img');
      this.createAnnotationMarker(imageContainer, img, annotation, this.annotations.length - 1);
      
      // Update storage
      const result = await chrome.storage.local.get('screenshots');
      const screenshots = result.screenshots || [];
      const index = screenshots.findIndex(s => s.id === this.screenshot.id);
      
      if (index !== -1) {
        screenshots[index].annotations = this.annotations;
        await chrome.storage.local.set({ screenshots: screenshots });
        console.log('Annotation saved:', annotation.text);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
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