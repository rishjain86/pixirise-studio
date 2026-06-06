// DOM Elements
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const queueCount = document.getElementById('queueCount');
const qualitySlider = document.getElementById('imageQuality');
const qualityValue = document.getElementById('qualityValue');
const processBtn = document.getElementById('processBtn');

// Variables
let selectedFiles = [];

// Update Quality Slider Value
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value + '%';
});

// Handle File Selection
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    selectedFiles = [...selectedFiles, ...files];
    updateQueue();
}

// Update UI Queue
function updateQueue() {
    queueCount.textContent = selectedFiles.length;
    previewGrid.innerHTML = ''; // Clear existing previews

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'thumb-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="preview">
                <span>${file.name}</span>
            `;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Process and Download Zip
processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        alert("Please select some images first!");
        return;
    }

    processBtn.textContent = "Processing...";
    processBtn.disabled = true;

    const targetWidth = parseInt(document.getElementById('targetWidth').value);
    const targetHeight = parseInt(document.getElementById('targetHeight').value);
    const exportFormat = document.getElementById('exportFormat').value;
    const quality = parseInt(qualitySlider.value) / 100;

    const zip = new JSZip();
    const folder = zip.folder("PixiRise_Processed");

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const processedBlob = await processImage(file, targetWidth, targetHeight, exportFormat, quality);
        
        // Generate new filename based on format
        const extension = exportFormat.split('/')[1] === 'jpeg' ? 'jpg' : exportFormat.split('/')[1];
        const newName = `processed_${i + 1}.${extension}`;
        
        folder.file(newName, processedBlob);
    }

    // Generate and download ZIP
    zip.generateAsync({ type: "blob" }).then((content) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "PixiRise_Batch.zip";
        link.click();

        processBtn.textContent = "Process & Download .Zip";
        processBtn.disabled = false;
        
        // Clear queue after successful download
        selectedFiles = [];
        updateQueue();
    });
});

// Image Processing Function using HTML5 Canvas
function processImage(file, width, height, format, quality) {
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

            // Draw with white background (useful if converting transparent PNG to JPEG)
            if (format === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
            }

            // Draw and resize image
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, format, quality);
        };

        reader.readAsDataURL(file);
    });
}
