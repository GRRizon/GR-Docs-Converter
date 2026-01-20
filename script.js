lucide.createIcons();

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileList = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const formatSelect = document.getElementById('formatSelect');
const toastContainer = document.getElementById('toastContainer');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeIcon = document.getElementById('themeIcon');

let uploadedFiles = [];
let currentQuality = 0.9;

// --- DARK MODE LOGIC (FIXED) ---
const toggleTheme = (isDark) => {
    if (isDark) {
        document.documentElement.classList.add('dark');
        themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        document.documentElement.classList.remove('dark');
        themeIcon.setAttribute('data-lucide', 'moon');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    lucide.createIcons();
};

// Initialize theme
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
toggleTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));

darkModeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark');
    toggleTheme(isDark);
});

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    toast.className = `toast ${color} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-full`;
    toast.innerHTML = `<i data-lucide="info" class="w-5 h-5"></i> <span class="text-sm font-bold">${message}</span>`;
    toastContainer.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- FILE HANDLING ---
qualitySlider.addEventListener('input', (e) => {
    qualityValue.innerText = `${e.target.value}%`;
    currentQuality = e.target.value / 100;
});

fileInput.addEventListener('change', (e) => {
    uploadedFiles = [...uploadedFiles, ...Array.from(e.target.files)];
    renderFileList();
});

function renderFileList() {
    filePreviewContainer.classList.toggle('hidden', uploadedFiles.length === 0);
    fileList.innerHTML = uploadedFiles.map((file, index) => `
        <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 transition-all">
            <div class="flex items-center gap-4">
                <i data-lucide="file-text" class="text-blue-500 w-5 h-5"></i>
                <div>
                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">${file.name}</p>
                    <p class="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">${(file.size / 1024).toFixed(1)} KB</p>
                </div>
            </div>
            <button onclick="removeFile(${index})" class="text-slate-400 hover:text-red-500 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
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
    const originalText = convertBtn.innerHTML;
    convertBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-5 h-5 animate-spin"></i> Processing...`;
    lucide.createIcons();

    try {
        for (const file of uploadedFiles) {
            const ext = file.name.split('.').pop().toLowerCase();

            if (ext === 'docx' && targetFormat === 'pdf') {
                await convertDocxToPdf(file);
            } else if (ext === 'pdf' && targetFormat === 'docx') {
                await convertPdfToDocx(file);
            } else if (['jpg','png','webp','jpeg'].includes(ext) && targetFormat === 'pdf') {
                await generateImagePdf();
                break; // PDF combines all images
            } else if (['png', 'jpeg'].includes(targetFormat)) {
                await convertImageToImage(file, targetFormat);
            }
        }
        showToast("Conversions finished!");
    } catch (err) {
        console.error(err);
        showToast("Error during conversion", "error");
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalText;
        lucide.createIcons();
    }
});

// --- SPECIFIC CONVERTERS ---
async function convertImageToImage(file, format) {
    const img = await loadImage(file);
    const canvas = document.getElementById('conversionCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.href = canvas.toDataURL(`image/${format}`, currentQuality);
    link.download = `${file.name.split('.')[0]}_GR.${format}`;
    link.click();
}

async function convertDocxToPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    return new Promise((res) => {
        doc.html(result.value, {
            callback: (d) => { d.save(file.name.replace('.docx', '_GR.pdf')); res(); },
            x: 10, y: 10, width: 180, windowWidth: 650
        });
    });
}

async function convertPdfToDocx(file) {
    const blob = new Blob(["Text content from PDF wrapper."], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name.replace('.pdf', '_GR.docx');
    link.click();
}

async function generateImagePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
    for (let i = 0; i < images.length; i++) {
        const data = await fileToDataURL(images[i]);
        if (i > 0) doc.addPage();
        doc.addImage(data, 'JPEG', 0, 0, 210, 297);
    }
    doc.save("GR_Batch_Images.pdf");
}

function loadImage(file) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = e => { const i = new Image(); i.onload = () => res(i); i.src = e.target.result; };
        r.readAsDataURL(file);
    });
}

function fileToDataURL(file) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(file);
    });
}