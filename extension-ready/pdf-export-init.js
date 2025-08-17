/*
 * ==================================================================================
 * SNAP JOURNAL - Medical Grade Screenshot Annotation Extension
 * ==================================================================================
 * 
 * pdf-export-init.js - PDF Export Window Initialization Script
 * 
 * Copyright (C) 2025 Snap Journal Development Team
 * All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * NOTICE: This software and its source code are proprietary products of 
 * Snap Journal Development Team and are protected by copyright law and 
 * international treaties. Unauthorized reproduction or distribution of this 
 * program, or any portion of it, may result in severe civil and criminal 
 * penalties, and will be prosecuted to the maximum extent possible under law.
 * 
 * RESTRICTIONS:
 * - No part of this source code may be reproduced, distributed, or transmitted
 *   in any form or by any means, including photocopying, recording, or other
 *   electronic or mechanical methods, without the prior written permission
 *   of the copyright owner.
 * - Reverse engineering, decompilation, or disassembly is strictly prohibited.
 * - This software is licensed, not sold.
 * 
 * For licensing inquiries, contact: [your-email@domain.com]
 * 
 * Version: 2.0.1
 * Build Date: January 2025
 * ==================================================================================
 */

// PDF Export Initialization Script
// This script handles the initialization of the PDF export window
// It's loaded separately to comply with Content Security Policy requirements

(function() {
    'use strict';
    
    console.log('[Snap Journal PDF Init] 🚀 PDF export initialization script loading...');
    console.log('[Snap Journal PDF Init] © 2025 Snap Journal Development Team - All Rights Reserved');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePdfExport);
    } else {
        initializePdfExport();
    }
    
    async function initializePdfExport() {
        try {
            console.log('[Snap Journal PDF Init] 🔧 Initializing PDF export window...');
            
            // Check if required scripts are loaded
            if (typeof TempStorageManager === 'undefined') {
                console.error('[Snap Journal PDF Init] ❌ TempStorageManager not loaded');
                displayError('Storage system not available. Please try again.');
                return;
            }
            
            if (typeof window.jspdf === 'undefined') {
                console.error('[Snap Journal PDF Init] ❌ jsPDF library not loaded');
                displayError('PDF generation library not available. Please try again.');
                return;
            }
            
            // Initialize temp storage
            const tempStorage = new TempStorageManager();
            await tempStorage.init();
            
            console.log('[Snap Journal PDF Init] ✅ Storage initialized');
            
            // Set up basic UI state
            updateInitialUI();
            
            // Add copyright notice to footer
            addCopyrightNotice();
            
            console.log('[Snap Journal PDF Init] ✅ PDF export window initialized successfully');
            
        } catch (error) {
            console.error('[Snap Journal PDF Init] ❌ Initialization failed:', error);
            displayError('Failed to initialize PDF export. Please try again.');
        }
    }
    
    function updateInitialUI() {
        // Show loading state initially
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.className = 'status-message info';
            statusElement.textContent = 'Initializing PDF export...';
            statusElement.style.display = 'block';
        }
        
        // Disable generate button until data is loaded
        const generateBtn = document.getElementById('generatePdfBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Loading...';
        }
        
        // Set window title
        document.title = 'Snap Journal - PDF Export';
    }
    
    function displayError(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.className = 'status-message error';
            statusElement.textContent = message;
            statusElement.style.display = 'block';
        }
        
        const generateBtn = document.getElementById('generatePdfBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Error - Cannot Generate PDF';
        }
    }
    
    function addCopyrightNotice() {
        // Add copyright notice to the page footer if not already present
        let footerElement = document.querySelector('.pdf-footer');
        
        if (!footerElement) {
            footerElement = document.createElement('div');
            footerElement.className = 'pdf-footer';
            footerElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                color: #666;
                background: rgba(255, 255, 255, 0.9);
                padding: 5px;
                border-top: 1px solid #ddd;
            `;
            document.body.appendChild(footerElement);
        }
        
        footerElement.innerHTML = `
            <div>© 2025 Snap Journal Development Team - All Rights Reserved</div>
            <div>Medical Grade Screenshot Annotation v2.0.1</div>
        `;
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', function() {
        console.log('[Snap Journal PDF Init] 👋 PDF export window closing');
    });
    
    // Handle errors
    window.addEventListener('error', function(event) {
        console.error('[Snap Journal PDF Init] ❌ Window error:', event.error);
        displayError('An error occurred. Please try refreshing the page.');
    });
    
    // Make initialization function available globally if needed
    window.snapJournalPdfInit = {
        version: '2.0.1',
        copyright: '© 2025 Snap Journal Development Team',
        initialized: true
    };
    
})();