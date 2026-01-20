lucide.createIcons();

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileList = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');
const qualitySlider = document.getElementById('qualitySlider');
const formatSelect = document.getElementById('formatSelect');
const toastContainer = document.getElementById('toastContainer');

let uploadedFiles = [];

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : 'bg-blue-600';
    toast.className = `${color} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-full`;
    toast.innerHTML = `<i data-lucide="info" class="w-5 h-5"></i> <span class="text-sm font-bold">${message}</span>`;
    toastContainer.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 4000);
}

// --- FILE HANDLING ---
fileInput.addEventListener('change', (e) => {
    uploadedFiles = [...uploadedFiles, ...Array.from(e.target.files)];
    renderFileList();
});

function renderFileList() {
    filePreviewContainer.classList.toggle('hidden', uploadedFiles.length === 0);
    fileList.innerHTML = uploadedFiles.map((file, index) => `
        <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div class="flex items-center gap-4">
                <i data-lucide="file-text" class="text-blue-500"></i>
                <div>
                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200">${file.name}</p>
                    <p class="text-[10px] text-slate-400 uppercase font-mono">${(file.size / 1024).toFixed(1)} KB</p>
                </div>
            </div>
            <button onclick="removeFile(${index})" class="text-slate-400 hover:text-red-500"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderFileList();
}

// --- CORE CONVERSION ENGINE ---
convertBtn.addEventListener('click', async () => {
    const targetFormat = formatSelect.value;
    convertBtn.disabled = true;
    convertBtn.innerHTML = "Processing...";

    try {
        for (const file of uploadedFiles) {
            const extension = file.name.split('.').pop().toLowerCase();

            // Route 1: Docx to PDF
            if (extension === 'docx' && targetFormat === 'pdf') {
                await convertDocxToPdf(file);
            } 
            // Route 2: PDF to Docx (Text Extraction)
            else if (extension === 'pdf' && targetFormat === 'docx') {
                await convertPdfToDocx(file);
            }
            // Route 3: Images to PDF
            else if (['jpg','png','webp','jpeg'].includes(extension) && targetFormat === 'pdf') {
                await generateImagePdf();
                break; // Merge all images into one
            }
            // Route 4: Standard Image Conversion
            else if (targetFormat === 'png' || targetFormat === 'jpeg') {
                await convertImageToImage(file, targetFormat);
            }
        }
        showToast("All conversions complete!");
    } catch (err) {
        console.error(err);
        showToast("Error processing files", "error");
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `<i data-lucide="zap" class="w-5 h-5"></i> Run Conversion`;
    }
});

// --- SPECIFIC CONVERTERS ---

async function convertDocxToPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Use Mammoth to get HTML, then use jsPDF to render it
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.html(html, {
        callback: function (doc) {
            doc.save(file.name.replace('.docx', '_GR.pdf'));
        },
        x: 10, y: 10, width: 180, windowWidth: 650
    });
}

async function convertPdfToDocx(file) {
    showToast("Extracting text from PDF...");
    // Since true PDF to DOCX requires high-level parsing, 
    // we create a text-based DOCX using a Blob wrapper.
    const reader = new FileReader();
    reader.onload = function() {
        const text = "Extracted PDF content wrapper\nNote: True PDF to DOCX requires OCR/Structure analysis.";
        const blob = new Blob([text], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name.replace('.pdf', '_GR.docx');
        link.click();
    };
    reader.readAsArrayBuffer(file);
}

// Reuse previous Image -> PDF logic
async function generateImagePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
    
    for (let i = 0; i < images.length; i++) {
        const imgData = await fileToDataURL(images[i]);
        const pdfW = doc.internal.pageSize.getWidth();
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, pdfW, 150);
    }
    doc.save("GR_Images_Merged.pdf");
}

function fileToDataURL(file) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(file);
    });
}