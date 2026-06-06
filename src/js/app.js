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

// DOM Elements - OCR
const startOcrBtn = document.getElementById('startOcrBtn');
const ocrResultText = document.getElementById('ocrResultText');
const ocrLanguage = document.getElementById('ocrLanguage');

// Variables
let selectedFiles = [];

// ==========================================
// 1. DYNAMIC UI SETUP (Zip Toggle Option)
// ==========================================
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
        menuItems.forEach(i => i.classList.remove('active'));
        panels.forEach(p => p.style.display = 'none');
        
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';
        workspaceTitle.textContent = item.textContent + ' Workspace';

        if(targetId === 'panel-ocr') {
            processBtn.style.display = 'none';
            zipToggleDiv.style.display = 'none';
        } else {
            processBtn.style.display = 'block';
            updateQueue(); 
        }
    });
});

// ==========================================
// 3. FILE HANDLING & DRAG-DROP
// ==========================================
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value + '%';
});

fileInput.addEventListener('change', handleFileSelect);

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

    const isOcrTab = document.getElementById('panel-ocr').style.display === 'block';

    if (!isOcrTab) {
        if (selectedFiles.length === 0) {
            processBtn.textContent = "Process Images";
            zipToggleDiv.style.display = 'none';
        } else if (selectedFiles.length === 1) {
            processBtn.textContent = "Process & Download Image";
            zipToggleDiv.style.display = 'none';
        } else {
            processBtn.textContent = "Process " + selectedFiles.length + " Images";
            zipToggleDiv.style.display = 'flex';
        }
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

    // Settings Data
    const targetWidth = parseInt(document.getElementById('targetWidth').value) || 1000;
    const targetHeight = parseInt(document.getElementById('targetHeight').value) || 1000;
    const autoTrim = document.getElementById('autoTrimCheckbox').checked;
    
    const bgColor = document.getElementById('bgColorPicker').value;
    const padding = parseInt(document.getElementById('canvasPadding').value) || 0;
    
    // Shadow Data
    const shadowSettings = {
        enabled: document.getElementById('enableShadowCheckbox').checked,
        color: document.getElementById('shadowColorPicker').value,
        blur: parseInt(document.getElementById('shadowBlur').value) || 0,
        offsetX: parseInt(document.getElementById('shadowOffsetX').value) || 0,
        offsetY: parseInt(document.getElementById('shadowOffsetY').value) || 0
    };

    const wmText = document.getElementById('watermarkText').value;
    const wmPosition = document.getElementById('watermarkPosition').value;
    const wmOpacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;
    
    const exportFormat = document.getElementById('exportFormat').value;
    const quality = parseInt(qualitySlider.value) / 100;

    const isSingle = selectedFiles.length === 1;
    const useZip = !isSingle && zipToggle.checked;

    let zip, folder;
    if (useZip) {
        zip = new JSZip();
        folder = zip.folder("PixiRise_Processed");
    }

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        const originalName = file.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        const extension = exportFormat.split('/')[1] === 'jpeg' ? 'jpg' : exportFormat.split('/')[1];
        const newFileName = `${baseName}.${extension}`;

        const processedBlob = await processImageOnCanvas(
            file, targetWidth, targetHeight, autoTrim, 
            bgColor, padding, shadowSettings, 
            wmText, wmPosition, wmOpacity, 
            exportFormat, quality
        );
        
        if (useZip) {
            folder.file(newFileName, processedBlob);
        } else {
            triggerDirectDownload(processedBlob, newFileName);
        }
    }

    if (useZip) {
        const content = await zip.generateAsync({ type: "blob" });
        triggerDirectDownload(content, "PixiRise_Batch.zip");
    }

    processBtn.textContent = "Process Images";
    processBtn.disabled = false;
    selectedFiles = [];
    updateQueue();
});

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
// 5. CANVAS, AUTO-TRIM & SHADOW ENGINE
// ==========================================
function getTrimBounds(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;

    let top = 0, bottom = img.height, left = 0, right = img.width;
    const isContent = (r, g, b, a) => a > 10 && (r < 250 || g < 250 || b < 250);

    for (let y = 0; y < img.height; y++) {
        let hasContent = false;
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            if (isContent(data[i], data[i+1], data[i+2], data[i+3])) { hasContent = true; break; }
        }
        if (hasContent) { top = y; break; }
    }
    for (let y = img.height - 1; y >= 0; y--) {
        let hasContent = false;
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            if (isContent(data[i], data[i+1], data[i+2], data[i+3])) { hasContent = true; break; }
        }
        if (hasContent) { bottom = y; break; }
    }
    for (let x = 0; x < img.width; x++) {
        let hasContent = false;
        for (let y = 0; y < img.height; y++) {
            const i = (y * img.width + x) * 4;
            if (isContent(data[i], data[i+1], data[i+2], data[i+3])) { hasContent = true; break; }
        }
        if (hasContent) { left = x; break; }
    }
    for (let x = img.width - 1; x >= 0; x--) {
        let hasContent = false;
        for (let y = 0; y < img.height; y++) {
            const i = (y * img.width + x) * 4;
            if (isContent(data[i], data[i+1], data[i+2], data[i+3])) { hasContent = true; break; }
        }
        if (hasContent) { right = x; break; }
    }

    if (bottom < top || right < left) return { x: 0, y: 0, w: img.width, h: img.height };
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function processImageOnCanvas(file, width, height, autoTrim, bgColor, padding, shadow, wmText, wmPosition, wmOpacity, format, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => img.src = e.target.result;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // 1. Draw Background First (without shadow)
            if (format === 'image/jpeg' || format === 'image/webp' || bgColor !== '#ffffff') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, height);
            }

            // 2. Trim Logic
            let crop = { x: 0, y: 0, w: img.width, h: img.height };
            if (autoTrim) {
                crop = getTrimBounds(img);
            }

            // 3. Scaling & Centering
            const usableWidth = width - (padding * 2);
            const usableHeight = height - (padding * 2);
            const scale = Math.min(usableWidth / crop.w, usableHeight / crop.h);
            const drawWidth = crop.w * scale;
            const drawHeight = crop.h * scale;
            const finalX = (width - drawWidth) / 2;
            const finalY = (height - drawHeight) / 2;

            // 4. Apply Product Drop Shadow
            if (shadow.enabled) {
                ctx.shadowColor = shadow.color;
                ctx.shadowBlur = shadow.blur;
                ctx.shadowOffsetX = shadow.offsetX;
                ctx.shadowOffsetY = shadow.offsetY;
            }

            // 5. Draw Processed Image
            ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, finalX, finalY, drawWidth, drawHeight);

            // 6. Reset Shadow so it doesn't affect Watermark
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 7. Apply Watermark
            if (wmText.trim() !== '') {
                ctx.globalAlpha = wmOpacity;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
                ctx.font = `bold ${Math.floor(height * 0.05)}px Arial`; 
                const textWidth = ctx.measureText(wmText).width;
                const textHeight = Math.floor(height * 0.05);
                const wmPadding = 20;

                let wx, wy;
                switch(wmPosition) {
                    case 'top-left': wx = wmPadding; wy = wmPadding + textHeight; break;
                    case 'top-right': wx = width - textWidth - wmPadding; wy = wmPadding + textHeight; break;
                    case 'bottom-left': wx = wmPadding; wy = height - wmPadding; break;
                    case 'center': wx = (width - textWidth) / 2; wy = (height + textHeight) / 2; break;
                    case 'bottom-right': default: wx = width - textWidth - wmPadding; wy = height - wmPadding; break;
                }

                ctx.shadowColor = "rgba(0,0,0,0.8)"; // Independent watermark shadow
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillText(wmText, wx, wy);
                
                ctx.shadowColor = "transparent";
                ctx.globalAlpha = 1.0;
            }

            // 8. Export Data
            canvas.toBlob((blob) => resolve(blob), format, quality);
        };

        reader.readAsDataURL(file);
    });
}

// ==========================================
// 6. OCR ENGINE (TESSERACT.JS)
// ==========================================
startOcrBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert("Please select an image first to run OCR!");
        return;
    }

    const fileToRead = selectedFiles[0]; 
    const lang = ocrLanguage.value;

    startOcrBtn.textContent = "Analyzing Image (This may take a minute)...";
    startOcrBtn.disabled = true;
    ocrResultText.value = "Initializing Tesseract engine...";

    try {
        const worker = await Tesseract.createWorker(lang);
        ocrResultText.value = "Recognizing text...";
        const { data: { text } } = await worker.recognize(fileToRead);
        
        ocrResultText.value = text || "No text found in this image.";
        await worker.terminate();
    } catch (error) {
        console.error("OCR Error:", error);
        ocrResultText.value = "An error occurred during text extraction.";
    }

    startOcrBtn.textContent = "Run OCR on Selected Image";
    startOcrBtn.disabled = false;
});
