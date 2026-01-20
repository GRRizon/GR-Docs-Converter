lucide.createIcons();

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileList = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');

let uploadedFiles = [];

// Drag & Drop Logic
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    uploadedFiles = [...uploadedFiles, ...Array.from(files)];
    renderFileList();
}

function renderFileList() {
    if (uploadedFiles.length > 0) {
        filePreviewContainer.classList.remove('hidden');
        fileList.innerHTML = uploadedFiles.map((file, index) => `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-3">
                    <i data-lucide="image" class="text-blue-500 w-5 h-5"></i>
                    <span class="text-sm font-medium text-slate-700 truncate max-w-[200px]">${file.name}</span>
                    <span class="text-xs text-slate-400">(${(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button onclick="removeFile(${index})" class="text-red-400 hover:text-red-600 transition-colors">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `).join('');
        lucide.createIcons();
    } else {
        filePreviewContainer.classList.add('hidden');
    }
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderFileList();
}

// --- CONVERSION LOGIC ---

convertBtn.addEventListener('click', async () => {
    const format = document.getElementById('formatSelect').value;
    if (uploadedFiles.length === 0) return;

    convertBtn.innerText = "Processing...";
    convertBtn.disabled = true;

    if (format === 'pdf') {
        await generatePDF();
    } else {
        await convertImages(format);
    }

    convertBtn.innerText = "Convert & Download";
    convertBtn.disabled = false;
});

// A: Image Converter (Individual Files)
async function convertImages(format) {
    const canvas = document.getElementById('conversionCanvas');
    const ctx = canvas.getContext('2d');

    for (const file of uploadedFiles) {
        if (!file.type.startsWith('image/')) continue;

        const img = await loadImage(file);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
        downloadLink(dataUrl, file.name, format);
    }
}

// B: PDF Generator (All in One)
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        if (!file.type.startsWith('image/')) continue;

        const img = await loadImage(file);
        const imgProps = doc.getImageProperties(img);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) doc.addPage();
        doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
    doc.save("GR_Converted_Docs.pdf");
}

// Helper: Load file into Image Object
function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Helper: Download Trigger
function downloadLink(url, originalName, ext) {
    const name = originalName.split('.')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_GR.${ext}`;
    a.click();
}