/* ========================================
   Report Generator — App Logic
   File uploads, PDF generation, UI state
   ======================================== */

// ─── State ──────────────────────────────
const state = {
    codeFiles: [],      // { name, content, extension }
    screenshots: [],    // { name, dataUrl, file }
};

// ─── DOM Elements ───────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
    // Form fields
    reportTitle:  $('#reportTitle'),
    studentName:  $('#studentName'),
    studentId:    $('#studentId'),
    className:    $('#className'),
    teacherName:  $('#teacherName'),
    reportDate:   $('#reportDate'),

    // Drop zones
    codeDropZone:       $('#codeDropZone'),
    codeFileInput:      $('#codeFileInput'),
    codeFileList:       $('#codeFileList'),
    screenshotDropZone: $('#screenshotDropZone'),
    screenshotFileInput:$('#screenshotFileInput'),
    screenshotGrid:     $('#screenshotGrid'),

    // Generate
    btnGenerate:        $('#btnGenerate'),
    summaryCodeCount:   $('#summaryCodeCount'),
    summaryScreenshotCount: $('#summaryScreenshotCount'),
    summaryStatus:      $('#summaryStatus'),
    progressContainer:  $('#progressContainer'),
    progressBar:        $('#progressBar'),
    progressText:       $('#progressText'),

    // Steps
    steps: $$('.steps-indicator .step'),
    stepLines: $$('.steps-indicator .step-line'),
};

// ─── Init ───────────────────────────────
function init() {
    // Set default date to today
    els.reportDate.value = new Date().toISOString().split('T')[0];

    // Setup drag & drop for code
    setupDropZone(els.codeDropZone, els.codeFileInput, handleCodeFiles);
    // Setup drag & drop for screenshots
    setupDropZone(els.screenshotDropZone, els.screenshotFileInput, handleScreenshotFiles);

    // Generate button
    els.btnGenerate.addEventListener('click', generatePDF);

    // Form change listeners for step indicator
    [els.reportTitle, els.studentName, els.studentId, els.className, els.teacherName, els.reportDate]
        .forEach(input => input.addEventListener('input', updateSteps));

    updateSummary();
    updateSteps();
}

// ─── Drop Zone Setup ────────────────────
function setupDropZone(dropZone, fileInput, handler) {
    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        handler(Array.from(e.target.files));
        fileInput.value = '';
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        handler(files);
    });
}

// ─── Code File Handling ─────────────────
function handleCodeFiles(files) {
    files.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        reader.onload = (e) => {
            state.codeFiles.push({
                name: file.name,
                content: e.target.result,
                extension: ext,
                size: file.size,
            });
            renderCodeFileList();
            updateSummary();
            updateSteps();
            showToast(`Added ${file.name}`, 'success');
        };
        reader.readAsText(file);
    });
}

function renderCodeFileList() {
    els.codeFileList.innerHTML = state.codeFiles.map((file, idx) => `
        <div class="file-item" data-index="${idx}">
            <div class="file-item-icon ${getLangClass(file.extension)}">${file.extension}</div>
            <div class="file-item-info">
                <div class="file-item-name">${escapeHtml(file.name)}</div>
                <div class="file-item-size">${formatSize(file.size)}</div>
            </div>
            <button class="file-item-remove" onclick="removeCodeFile(${idx})" title="Remove file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeCodeFile(idx) {
    const name = state.codeFiles[idx].name;
    state.codeFiles.splice(idx, 1);
    renderCodeFileList();
    updateSummary();
    updateSteps();
    showToast(`Removed ${name}`, 'info');
}

// ─── Screenshot Handling ────────────────
function handleScreenshotFiles(files) {
    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showToast(`${file.name} is not an image`, 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            state.screenshots.push({
                name: file.name,
                dataUrl: e.target.result,
                file: file,
            });
            renderScreenshotGrid();
            updateSummary();
            updateSteps();
            showToast(`Added screenshot: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
    });
}

function renderScreenshotGrid() {
    els.screenshotGrid.innerHTML = state.screenshots.map((ss, idx) => `
        <div class="screenshot-card" data-index="${idx}">
            <img src="${ss.dataUrl}" alt="${escapeHtml(ss.name)}">
            <div class="screenshot-overlay">
                <span class="screenshot-name">${escapeHtml(ss.name)}</span>
                <button class="screenshot-remove" onclick="removeScreenshot(${idx})" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function removeScreenshot(idx) {
    const name = state.screenshots[idx].name;
    state.screenshots.splice(idx, 1);
    renderScreenshotGrid();
    updateSummary();
    updateSteps();
    showToast(`Removed ${name}`, 'info');
}

// ─── Summary & Steps ────────────────────
function updateSummary() {
    els.summaryCodeCount.textContent = state.codeFiles.length;
    els.summaryScreenshotCount.textContent = state.screenshots.length;
}

function updateSteps() {
    const steps = Array.from(els.steps);
    const lines = Array.from(els.stepLines);

    // Step 1: Details filled?
    const detailsFilled = els.studentName.value.trim() && els.studentId.value.trim() && els.className.value.trim();
    // Step 2: Code uploaded?
    const hasCode = state.codeFiles.length > 0;
    // Step 3: Screenshots uploaded?
    const hasScreenshots = state.screenshots.length > 0;

    // Reset
    steps.forEach(s => { s.classList.remove('active', 'completed'); });
    lines.forEach(l => l.classList.remove('active'));

    // Determine active/completed state
    if (!detailsFilled) {
        steps[0].classList.add('active');
    } else {
        steps[0].classList.add('completed');
        lines[0].classList.add('active');

        if (!hasCode) {
            steps[1].classList.add('active');
        } else {
            steps[1].classList.add('completed');
            lines[1].classList.add('active');

            if (!hasScreenshots) {
                steps[2].classList.add('active');
            } else {
                steps[2].classList.add('completed');
                lines[2].classList.add('active');
                steps[3].classList.add('active');
            }
        }
    }

    // Update status badge
    if (detailsFilled && hasCode) {
        els.summaryStatus.textContent = 'Ready';
        els.summaryStatus.style.background = 'rgba(52, 211, 153, 0.12)';
        els.summaryStatus.style.color = '#34d399';
    } else {
        els.summaryStatus.textContent = 'Incomplete';
        els.summaryStatus.style.background = 'rgba(251, 191, 36, 0.12)';
        els.summaryStatus.style.color = '#fbbf24';
    }
}

// ─── PDF Generation ─────────────────────
async function generatePDF() {
    // Validation
    const title = els.reportTitle.value.trim() || 'Project Report';
    const name = els.studentName.value.trim();
    const id = els.studentId.value.trim();
    const cls = els.className.value.trim();
    const teacher = els.teacherName.value.trim();
    const date = els.reportDate.value;

    if (!name) { showToast('Please enter your name', 'error'); els.studentName.focus(); return; }
    if (!id) { showToast('Please enter your student ID', 'error'); els.studentId.focus(); return; }
    if (!cls) { showToast('Please enter your class/course', 'error'); els.className.focus(); return; }
    if (state.codeFiles.length === 0) { showToast('Please upload at least one source code file', 'error'); return; }

    // Disable button, show progress
    els.btnGenerate.disabled = true;
    els.progressContainer.style.display = 'block';
    setProgress(5, 'Initializing...');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentW = pageW - margin * 2;

        // ─── COVER PAGE (Google Docs style) ─────
        setProgress(10, 'Creating cover page...');

        // Clean white background — no decorative bars
        // Title — large, centered, black
        doc.setFont('times', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(0, 0, 0);
        const titleLines = doc.splitTextToSize(title, contentW);
        let titleY = pageH * 0.30;
        doc.text(titleLines, pageW / 2, titleY, { align: 'center' });
        titleY += titleLines.length * 11;

        // Thin horizontal rule under title
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.line(pageW / 2 - 40, titleY + 6, pageW / 2 + 40, titleY + 6);

        // Course/Class — centered beneath rule
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text(cls, pageW / 2, titleY + 20, { align: 'center' });

        // Info block — centered, academic style
        const infoStartY = titleY + 46;
        const infoPairs = [
            ['Student Name', name],
            ['Student ID', id],
        ];
        if (teacher) infoPairs.push(['Instructor', teacher]);
        if (date) infoPairs.push(['Date', formatDate(date)]);

        doc.setFontSize(12);
        infoPairs.forEach(([label, value], i) => {
            const y = infoStartY + i * 10;
            doc.setFont('times', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`${label}:`, pageW / 2 - 5, y, { align: 'right' });
            doc.setFont('times', 'normal');
            doc.setTextColor(33, 33, 33);
            doc.text(`  ${value}`, pageW / 2 - 5, y);
        });

        // ─── SOURCE CODE PAGES ─────────────
        const totalSteps = state.codeFiles.length + state.screenshots.length;
        let currentStep = 0;

        for (let i = 0; i < state.codeFiles.length; i++) {
            const file = state.codeFiles[i];
            currentStep++;
            const pct = 15 + (currentStep / totalSteps) * 65;
            setProgress(pct, `Rendering ${file.name}...`);

            doc.addPage();
            let y = margin;

            // Section heading on first code page (Google Docs "Heading 1" style)
            if (i === 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(20);
                doc.setTextColor(0, 0, 0);
                doc.text('Source Code', margin, y + 6);
                y += 14;
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageW - margin, y);
                y += 10;
            }

            // File name — bold, left-aligned, like a Google Docs "Heading 2"
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(file.name, margin, y + 3);
            y += 10;

            // Light gray background for code block
            const codeLines = file.content.split('\n');
            const lineHeight = 3.8;
            const codeStartY = y;

            // Code content — monospace, dark text on white
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(33, 33, 33);

            for (let ln = 0; ln < codeLines.length; ln++) {
                if (y + lineHeight > pageH - margin - 8) {
                    // Page number footer
                    addPageNumber(doc, pageW, pageH);
                    doc.addPage();
                    y = margin;

                    // Continuation label
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(10);
                    doc.setTextColor(120, 120, 120);
                    doc.text(`${file.name} (continued)`, margin, y + 3);
                    y += 10;
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(33, 33, 33);
                }

                // Line number — light gray
                const lineNum = String(ln + 1).padStart(4, ' ');
                doc.setTextColor(170, 170, 170);
                doc.text(lineNum, margin, y);

                // Code text
                doc.setTextColor(33, 33, 33);
                let lineText = codeLines[ln].replace(/\t/g, '    ');
                const maxChars = 95;
                if (lineText.length > maxChars) {
                    lineText = lineText.substring(0, maxChars) + ' ...';
                }
                doc.text(lineText, margin + 14, y);
                y += lineHeight;
            }

            // Bottom separator between files
            y += 4;
            if (i < state.codeFiles.length - 1 && y < pageH - margin - 10) {
                doc.setDrawColor(210, 210, 210);
                doc.setLineWidth(0.2);
                doc.line(margin, y, pageW - margin, y);
            }

            addPageNumber(doc, pageW, pageH);
            await sleep(30);
        }

        // ─── SCREENSHOT PAGES ──────────────
        if (state.screenshots.length > 0) {
            doc.addPage();
            let y = margin;

            // Section heading — Google Docs "Heading 1" style
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(0, 0, 0);
            doc.text('Output Screenshots', margin, y + 6);
            y += 14;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 10;

            for (let i = 0; i < state.screenshots.length; i++) {
                const ss = state.screenshots[i];
                currentStep++;
                const pct = 15 + (currentStep / totalSteps) * 65;
                setProgress(pct, `Embedding ${ss.name}...`);

                // Get image dimensions
                const imgDims = await getImageDimensions(ss.dataUrl);
                const aspectRatio = imgDims.width / imgDims.height;

                // Calculate fit dimensions
                let imgW = contentW;
                let imgH = imgW / aspectRatio;

                // Max image height: 55% of usable page
                const maxImgH = (pageH - margin * 2) * 0.55;
                if (imgH > maxImgH) {
                    imgH = maxImgH;
                    imgW = imgH * aspectRatio;
                }

                // Check if we need a new page
                const neededH = imgH + 22;
                if (y + neededH > pageH - margin) {
                    addPageNumber(doc, pageW, pageH);
                    doc.addPage();
                    y = margin;
                }

                // Caption — italic, centered below image (Google Docs style)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(33, 33, 33);
                doc.text(`Figure ${i + 1}: ${ss.name}`, margin, y + 4);
                y += 10;

                // Image — centered, subtle border
                const imgX = margin + (contentW - imgW) / 2;
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.2);
                doc.rect(imgX - 0.5, y - 0.5, imgW + 1, imgH + 1);

                try {
                    doc.addImage(ss.dataUrl, 'JPEG', imgX, y, imgW, imgH);
                } catch (e) {
                    try {
                        doc.addImage(ss.dataUrl, 'PNG', imgX, y, imgW, imgH);
                    } catch (e2) {
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(10);
                        doc.setTextColor(180, 50, 50);
                        doc.text(`[Could not embed image: ${ss.name}]`, margin, y + 10);
                    }
                }
                y += imgH + 16;

                await sleep(30);
            }
            addPageNumber(doc, pageW, pageH);
        }

        // ─── SAVE PDF ──────────────────────
        setProgress(95, 'Finalizing PDF...');
        await sleep(200);

        const fileName = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_${id}.pdf`;
        doc.save(fileName);

        setProgress(100, 'Done!');
        showToast('PDF generated successfully! 🎉', 'success');

        // Reset progress after a moment
        setTimeout(() => {
            els.progressContainer.style.display = 'none';
            els.btnGenerate.disabled = false;
            setProgress(0, '');
        }, 2000);

    } catch (err) {
        console.error('PDF generation error:', err);
        showToast(`Error: ${err.message}`, 'error');
        els.progressContainer.style.display = 'none';
        els.btnGenerate.disabled = false;
    }
}

// ─── PDF Helpers ────────────────────────
function addPageNumber(doc, pageW, pageH) {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text(`Page ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
}

function getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 800, height: 600 }); // fallback
        img.src = dataUrl;
    });
}

function setProgress(pct, text) {
    const bar = els.progressBar;
    bar.style.setProperty('--progress', `${pct}%`);
    bar.setAttribute('style', bar.getAttribute('style') || '');
    // Update ::after width via a style override
    bar.querySelector('style')?.remove();
    const style = document.createElement('style');
    style.textContent = `#progressBar::after { width: ${pct}% !important; }`;
    bar.appendChild(style);
    if (text) els.progressText.textContent = text;
}

// ─── Utility Functions ──────────────────
function getLangClass(ext) {
    const map = {
        c: 'lang-c', h: 'lang-c',
        cpp: 'lang-cpp', hpp: 'lang-cpp', cc: 'lang-cpp',
        py: 'lang-py', python: 'lang-py',
        java: 'lang-java',
        js: 'lang-js', ts: 'lang-js', jsx: 'lang-js', tsx: 'lang-js',
        html: 'lang-html', htm: 'lang-html',
        css: 'lang-css', scss: 'lang-css',
    };
    return map[ext] || 'lang-default';
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Toast Notifications ────────────────
function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── Start ──────────────────────────────
document.addEventListener('DOMContentLoaded', init);
