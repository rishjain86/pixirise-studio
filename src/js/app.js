// ==========================================
// PixiRise Studio - Core JavaScript Engine
// Optimized for PC, Mobile Web, & Capacitor
// ==========================================

// DOM Elements - Sidebar & Workspace
const menuItems = document.querySelectorAll('#sidebarMenu li');
const panels = document.querySelectorAll('.tool-panel');
const workspaceTitle = document.getElementById('workspaceTitle');

// DOM Elements - Upload & Queue
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const queueCount = document.getElementById('queueCount');
const uploadArea = document.getElementById('uploadArea');

// DOM Elements - Settings
const qualitySlider = document.getElementById('imageQuality');
const qualityValue = document.getElementById('qualityValue');
const processBtn = document.getElementById('processBtn');
const settingsPanel = document.querySelector('.settings-panel');

// Variables
let selectedFiles = [];

// ==========================================
// 1. DYNAMIC UI SETUP (Zip Toggle Option)
// ==========================================
// Dynamically adding the ZIP toggle checkbox above the process button
const zipToggleDiv = document.createElement('div');
zipToggleDiv.className = 'setting-group';
zipToggleDiv.style.marginTop = '10px';
zipToggleDiv.innerHTML = `
    <label style="display: flex; align-items: center; cursor: pointer; color: var(--text-main); font-size: 14px; font-weight: 500;">
        <input type="checkbox" id="zipToggle" checked style="margin-right: 10px; width: 18px; height: 18px; accent-color: var(--neon-green);">
        Pack multiple images in .Zip
    </label>
`;
settingsPanel.insertBefore(zipToggleDiv, processBtn);
const zipToggle = document.getElementById('zipToggle');

// ==========================================
// 2. TAB SWITCHING LOGIC
// ==========================================
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all tabs
        menuItems.forEach(i => i.classList.remove('active'));
        panels.forEach(p => p.style.display = 'none');
        
        // Activate clicked tab
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';
        workspaceTitle.textContent = item.textContent + ' Workspace';
    });
});

// ==========================================
// 3. FILE HANDLING & DRAG-DROP
// ==========================================
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value + '%';
});

// Click to select
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop for PC
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--neon-green)';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--border-color)';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
        selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)];
        updateQueue();
    }
});

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    selectedFiles = [...selectedFiles, ...files];
    updateQueue();
}

function updateQueue() {
    queueCount.textContent = selectedFiles.length;
    previewGrid.innerHTML = ''; 

    // Update button text based on count
    if (selectedFiles.length === 0) {
        processBtn.textContent = "Process Images";
        zipToggleDiv.style.display = 'none';
    } else if (selectedFiles.length === 1) {
        processBtn.textContent = "Process & Download Image";
        zipToggleDiv.style.display = 'none'; // Hide zip toggle for single image
    } else {
        processBtn.textContent = "Process " + selectedFiles.length + " Images";
        zipToggleDiv.style.display = 'flex'; // Show zip toggle
    }

    selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'thumb-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="preview">
                <span title="${file.name}">${file.name}</span>
            `;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// ==========================================
// 4. CORE PROCESSING & DOWNLOAD LOGIC
// ==========================================
processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert("Please select some images first!");
        return;
    }

    processBtn.textContent = "Processing...";
    processBtn.disabled = true;

    // Get Resizer Settings
    const targetWidth = parseInt(document.getElementById('targetWidth').value) || 1000;
    const targetHeight = parseInt(document.getElementById('targetHeight').value) || 1000;
    
    // Get Background Settings
    const bgColor = document.getElementById('bgColorPicker').value;
    const padding = parseInt(document.getElementById('canvasPadding').value) || 0;
    
    // Get Watermark Settings
    const wmText = document.getElementById('watermarkText').value;
    const wmPosition = document.getElementById('watermarkPosition').value;
    const wmOpacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;

    // Get Export Settings
    const exportFormat = document.getElementById('exportFormat').value;
    const quality = parseInt(qualitySlider.value) / 100;

    // Decide Download Strategy
    const isSingle = selectedFiles.length === 1;
    const useZip = !isSingle && zipToggle.checked;

    let zip, folder;
    if (useZip) {
        zip = new JSZip();
        folder = zip.folder("PixiRise_Processed");
    }

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Extract ORIGINAL filename without extension
        const originalName = file.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        const extension = exportFormat.split('/')[1] === 'jpeg' ? 'jpg' : exportFormat.split('/')[1];
        const newFileName = `${baseName}.${extension}`; // e.g., product_front.webp

        // Process image via Canvas
        const processedBlob = await processImageOnCanvas(file, targetWidth, targetHeight, bgColor, padding, wmText, wmPosition, wmOpacity, exportFormat, quality);
        
        if (useZip) {
            folder.file(newFileName, processedBlob);
        } else {
            // Download individually
            triggerDirectDownload(processedBlob, newFileName);
        }
    }

    if (useZip) {
        // Generate and download ZIP
        const content = await zip.generateAsync({ type: "blob" });
        triggerDirectDownload(content, "PixiRise_Batch.zip");
    }

    // Reset UI
    processBtn.textContent = "Process Images";
    processBtn.disabled = false;
    selectedFiles = [];
    updateQueue();
});

// Direct Download Helper Function
function triggerDirectDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ==========================================
// 5. CANVAS MANIPULATION ENGINE
// ==========================================
function processImageOnCanvas(file, width, height, bgColor, padding, wmText, wmPosition, wmOpacity, format, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // 1. Draw Background Color
            if (format === 'image/jpeg' || format === 'image/webp') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, height);
            } else if (bgColor !== '#ffffff') {
                // Apply background even for PNG if user picked a color other than default white
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, height);
            }

            // 2. Calculate scaling to fit image inside target canvas with padding
            const usableWidth = width - (padding * 2);
            const usableHeight = height - (padding * 2);
            
            const scale = Math.min(usableWidth / img.width, usableHeight / img.height);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            
            // Center the image
            const x = (width - drawWidth) / 2;
            const y = (height - drawHeight) / 2;

            // Draw Original Image
            ctx.drawImage(img, x, y, drawWidth, drawHeight);

            // 3. Add Smart Watermark (if text is provided)
            if (wmText.trim() !== '') {
                ctx.globalAlpha = wmOpacity;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White text with slight natural transparency
                ctx.font = `bold ${Math.floor(height * 0.05)}px Arial`; // Scale font size based on canvas height
                
                const textMetrics = ctx.measureText(wmText);
                const textWidth = textMetrics.width;
                const textHeight = Math.floor(height * 0.05);
                const wmPadding = 20;

                let wx, wy;
                switch(wmPosition) {
                    case 'top-left':
                        wx = wmPadding; wy = wmPadding + textHeight; break;
                    case 'top-right':
                        wx = width - textWidth - wmPadding; wy = wmPadding + textHeight; break;
                    case 'bottom-left':
                        wx = wmPadding; wy = height - wmPadding; break;
                    case 'center':
                        wx = (width - textWidth) / 2; wy = (height + textHeight) / 2; break;
                    case 'bottom-right':
                    default:
                        wx = width - textWidth - wmPadding; wy = height - wmPadding; break;
                }

                // Draw Text Shadow for better visibility
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.fillText(wmText, wx, wy);
                
                // Reset context properties
                ctx.shadowColor = "transparent";
                ctx.globalAlpha = 1.0;
            }

            // 4. Export to Blob
            canvas.toBlob((blob) => {
                resolve(blob);
            }, format, quality);
        };

        reader.readAsDataURL(file);
    });
}
