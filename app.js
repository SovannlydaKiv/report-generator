/* ========================================
   Report Generator — App Logic
   Exercise-based layout, VS Code syntax
   highlighting in PDF, logo support
   ======================================== */

// ─── State ──────────────────────────────
const state = {
    logo: null,        // { name, dataUrl }
    exercises: [],     // { name, content, extension, size, screenshots: [{name, dataUrl}] }
};

// ─── DOM Elements ───────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
    reportTitle:  $('#reportTitle'),
    studentName:  $('#studentName'),
    studentId:    $('#studentId'),
    className:    $('#className'),
    teacherName:  $('#teacherName'),
    reportDate:   $('#reportDate'),

    logoUploadZone:  $('#logoUploadZone'),
    logoFileInput:   $('#logoFileInput'),
    logoUploadContent: $('#logoUploadContent'),
    logoPreview:     $('#logoPreview'),
    logoRemoveBtn:   $('#logoRemoveBtn'),

    codeDropZone:    $('#codeDropZone'),
    codeFileInput:   $('#codeFileInput'),
    exerciseList:    $('#exerciseList'),

    btnGenerate:         $('#btnGenerate'),
    summaryExerciseCount:    $('#summaryExerciseCount'),
    summaryScreenshotCount:  $('#summaryScreenshotCount'),
    summaryStatus:       $('#summaryStatus'),
    progressContainer:   $('#progressContainer'),
    progressBar:         $('#progressBar'),
    progressText:        $('#progressText'),

    steps:     $$('.steps-indicator .step'),
    stepLines: $$('.steps-indicator .step-line'),
};

// ─── Init ───────────────────────────────
function init() {
    els.reportDate.value = new Date().toISOString().split('T')[0];

    // Logo upload
    els.logoUploadZone.addEventListener('click', (e) => {
        if (e.target.closest('.logo-remove-btn')) return;
        els.logoFileInput.click();
    });
    els.logoFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleLogoUpload(e.target.files[0]);
        e.target.value = '';
    });
    els.logoRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeLogo();
    });

    // Code file upload
    setupDropZone(els.codeDropZone, els.codeFileInput, handleCodeFiles);

    // Generate button
    els.btnGenerate.addEventListener('click', generatePDF);

    // Form listeners
    [els.reportTitle, els.studentName, els.studentId, els.className, els.teacherName, els.reportDate]
        .forEach(input => input.addEventListener('input', updateSteps));

    updateSummary();
    updateSteps();
}

// ─── Logo Handling ──────────────────────
function handleLogoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        state.logo = { name: file.name, dataUrl: e.target.result };
        els.logoUploadContent.style.display = 'none';
        els.logoPreview.src = e.target.result;
        els.logoPreview.style.display = 'block';
        els.logoRemoveBtn.style.display = 'flex';
        showToast('Logo uploaded', 'success');
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    state.logo = null;
    els.logoUploadContent.style.display = 'flex';
    els.logoPreview.style.display = 'none';
    els.logoRemoveBtn.style.display = 'none';
    showToast('Logo removed', 'info');
}

// ─── Drop Zone Setup ────────────────────
function setupDropZone(dropZone, fileInput, handler) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        handler(Array.from(e.target.files));
        fileInput.value = '';
    });

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
        handler(Array.from(e.dataTransfer.files));
    });
}

// ─── Code File Handling ─────────────────
function handleCodeFiles(files) {
    files.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        reader.onload = (e) => {
            state.exercises.push({
                name: file.name,
                content: e.target.result,
                extension: ext,
                size: file.size,
                screenshots: [],
            });
            renderExercises();
            updateSummary();
            updateSteps();
            showToast(`Added ${file.name}`, 'success');
        };
        reader.readAsText(file);
    });
}

// ─── Exercise Rendering ─────────────────
function renderExercises() {
    els.exerciseList.innerHTML = state.exercises.map((ex, idx) => `
        <div class="exercise-card" data-index="${idx}">
            <div class="exercise-header">
                <div class="file-item-icon ${getLangClass(ex.extension)}">${ex.extension}</div>
                <div class="exercise-info">
                    <div class="exercise-name">${escapeHtml(ex.name)}</div>
                    <div class="exercise-size">${formatSize(ex.size)}</div>
                </div>
                <button class="exercise-remove" onclick="removeExercise(${idx})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="exercise-screenshots">
                <div class="exercise-screenshots-label">Output Screenshots</div>
                <div class="mini-drop-zone" data-exercise="${idx}" onclick="triggerScreenshotInput(${idx})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Click or drag screenshots for this exercise</span>
                </div>
                <input type="file" class="exercise-ss-input" data-exercise="${idx}" multiple accept="image/*" hidden onchange="handleExerciseScreenshots(${idx}, this)">
                <div class="exercise-screenshot-grid" id="ssGrid-${idx}">
                    ${ex.screenshots.map((ss, ssIdx) => `
                        <div class="exercise-screenshot-card">
                            <img src="${ss.dataUrl}" alt="${escapeHtml(ss.name)}">
                            <div class="ss-overlay">
                                <button class="ss-remove" onclick="removeExerciseScreenshot(${idx}, ${ssIdx})" title="Remove">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    // Setup drag-and-drop for each mini drop zone
    document.querySelectorAll('.mini-drop-zone').forEach(zone => {
        const idx = parseInt(zone.dataset.exercise);

        ['dragenter', 'dragover'].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.borderColor = 'var(--accent-primary)';
                zone.style.background = 'rgba(99, 143, 255, 0.08)';
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            zone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.borderColor = '';
                zone.style.background = '';
            });
        });

        zone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            addScreenshotsToExercise(idx, files);
        });
    });
}

function triggerScreenshotInput(idx) {
    const input = document.querySelector(`.exercise-ss-input[data-exercise="${idx}"]`);
    if (input) input.click();
}

function handleExerciseScreenshots(idx, input) {
    const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
    addScreenshotsToExercise(idx, files);
    input.value = '';
}

function addScreenshotsToExercise(idx, files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.exercises[idx].screenshots.push({
                name: file.name,
                dataUrl: e.target.result,
            });
            renderExercises();
            updateSummary();
            updateSteps();
            showToast(`Added screenshot to ${state.exercises[idx].name}`, 'success');
        };
        reader.readAsDataURL(file);
    });
}

function removeExercise(idx) {
    const name = state.exercises[idx].name;
    state.exercises.splice(idx, 1);
    renderExercises();
    updateSummary();
    updateSteps();
    showToast(`Removed ${name}`, 'info');
}

function removeExerciseScreenshot(exIdx, ssIdx) {
    state.exercises[exIdx].screenshots.splice(ssIdx, 1);
    renderExercises();
    updateSummary();
    updateSteps();
    showToast('Screenshot removed', 'info');
}

// ─── Summary & Steps ────────────────────
function updateSummary() {
    els.summaryExerciseCount.textContent = state.exercises.length;
    const totalSS = state.exercises.reduce((sum, ex) => sum + ex.screenshots.length, 0);
    els.summaryScreenshotCount.textContent = totalSS;
}

function updateSteps() {
    const steps = Array.from(els.steps);
    const lines = Array.from(els.stepLines);

    const detailsFilled = els.studentName.value.trim() && els.studentId.value.trim() && els.className.value.trim();
    const hasExercises = state.exercises.length > 0;

    steps.forEach(s => s.classList.remove('active', 'completed'));
    lines.forEach(l => l.classList.remove('active'));

    if (!detailsFilled) {
        steps[0].classList.add('active');
    } else {
        steps[0].classList.add('completed');
        lines[0].classList.add('active');
        if (!hasExercises) {
            steps[1].classList.add('active');
        } else {
            steps[1].classList.add('completed');
            lines[1].classList.add('active');
            steps[2].classList.add('active');
        }
    }

    if (detailsFilled && hasExercises) {
        els.summaryStatus.textContent = 'Ready';
        els.summaryStatus.style.background = 'rgba(52, 211, 153, 0.12)';
        els.summaryStatus.style.color = '#34d399';
    } else {
        els.summaryStatus.textContent = 'Incomplete';
        els.summaryStatus.style.background = 'rgba(251, 191, 36, 0.12)';
        els.summaryStatus.style.color = '#fbbf24';
    }
}

// ═══════════════════════════════════════════
//  VS Code Light Theme — Syntax Tokenizer
// ═══════════════════════════════════════════

const SYNTAX_COLORS = {
    keyword:      [0, 0, 255],       // blue
    type:         [38, 127, 153],     // teal
    string:       [163, 21, 21],      // dark red
    comment:      [0, 128, 0],        // green
    preprocessor: [175, 0, 219],      // purple
    number:       [9, 134, 88],       // dark green
    default:      [0, 0, 0],          // black
};

const KEYWORDS = new Set([
    'if','else','for','while','do','switch','case','break','continue','return',
    'struct','class','public','private','protected','virtual','override',
    'const','static','new','delete','nullptr','NULL','true','false','this',
    'using','namespace','template','typename','enum','typedef','sizeof',
    'throw','try','catch','inline','extern','default','goto','volatile',
    'explicit','friend','operator','mutable','register','final','noexcept',
    // Python
    'def','import','from','as','with','lambda','yield','pass','raise',
    'in','not','and','or','is','None','True','False','elif','except','finally',
    'global','nonlocal','assert','del','print',
    // Java / JS
    'function','var','let','const','async','await','extends','implements',
    'interface','abstract','super','instanceof','typeof','void',
    'package','throws','synchronized','native','transient',
]);

const TYPES = new Set([
    'int','char','float','double','void','bool','long','short','unsigned',
    'signed','string','auto','size_t','wchar_t','uint8_t','uint16_t',
    'uint32_t','uint64_t','int8_t','int16_t','int32_t','int64_t',
    'vector','map','set','list','queue','stack','pair','array','deque',
    'unordered_map','unordered_set','Node','cout','cin','cerr','endl',
    'printf','scanf','FILE','String','Integer','Boolean','Object',
    'ArrayList','HashMap','LinkedList','Scanner',
    'std','main',
]);

function getWordType(word) {
    if (KEYWORDS.has(word)) return 'keyword';
    if (TYPES.has(word)) return 'type';
    return 'default';
}

function tokenizeLine(line, inBlockComment) {
    const tokens = [];
    let i = 0;

    while (i < line.length) {
        // Inside block comment
        if (inBlockComment) {
            const endIdx = line.indexOf('*/', i);
            if (endIdx !== -1) {
                tokens.push({ text: line.slice(i, endIdx + 2), type: 'comment' });
                i = endIdx + 2;
                inBlockComment = false;
            } else {
                tokens.push({ text: line.slice(i), type: 'comment' });
                return { tokens, inBlockComment: true };
            }
            continue;
        }

        // Whitespace
        const wsMatch = line.slice(i).match(/^(\s+)/);
        if (wsMatch) {
            tokens.push({ text: wsMatch[1], type: 'default' });
            i += wsMatch[1].length;
            continue;
        }

        // Single-line comment
        if (line[i] === '/' && line[i + 1] === '/') {
            tokens.push({ text: line.slice(i), type: 'comment' });
            return { tokens, inBlockComment };
        }

        // Python/Shell comment
        if (line[i] === '#' && !line.trimStart().match(/^#\s*(include|define|ifdef|ifndef|endif|pragma|undef|error|warning|if|elif|else)/)) {
            tokens.push({ text: line.slice(i), type: 'comment' });
            return { tokens, inBlockComment };
        }

        // Block comment start
        if (line[i] === '/' && line[i + 1] === '*') {
            const endIdx = line.indexOf('*/', i + 2);
            if (endIdx !== -1) {
                tokens.push({ text: line.slice(i, endIdx + 2), type: 'comment' });
                i = endIdx + 2;
            } else {
                tokens.push({ text: line.slice(i), type: 'comment' });
                return { tokens, inBlockComment: true };
            }
            continue;
        }

        // C/C++ preprocessor
        if (i === 0 || line.slice(0, i).trim() === '') {
            const ppMatch = line.slice(i).match(/^(#\s*(?:include|define|ifdef|ifndef|endif|pragma|undef|error|warning|if|elif|else)\b.*)/);
            if (ppMatch) {
                tokens.push({ text: ppMatch[1], type: 'preprocessor' });
                return { tokens, inBlockComment };
            }
        }

        // String literal (double quote)
        if (line[i] === '"') {
            let j = i + 1;
            while (j < line.length && line[j] !== '"') {
                if (line[j] === '\\') j++;
                j++;
            }
            j = Math.min(j + 1, line.length);
            tokens.push({ text: line.slice(i, j), type: 'string' });
            i = j;
            continue;
        }

        // Char literal (single quote)
        if (line[i] === "'") {
            let j = i + 1;
            while (j < line.length && line[j] !== "'") {
                if (line[j] === '\\') j++;
                j++;
            }
            j = Math.min(j + 1, line.length);
            tokens.push({ text: line.slice(i, j), type: 'string' });
            i = j;
            continue;
        }

        // Angle bracket include: <iostream>
        if (line[i] === '<' && tokens.length > 0 && tokens.some(t => t.type === 'preprocessor' && t.text.includes('include'))) {
            const endIdx = line.indexOf('>', i);
            if (endIdx !== -1) {
                tokens.push({ text: line.slice(i, endIdx + 1), type: 'string' });
                i = endIdx + 1;
                continue;
            }
        }

        // Numbers
        const numMatch = line.slice(i).match(/^(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:f|l|u|ll|ull|ULL)?)\b/i);
        if (numMatch) {
            tokens.push({ text: numMatch[1], type: 'number' });
            i += numMatch[1].length;
            continue;
        }

        // Words (identifiers/keywords)
        const wordMatch = line.slice(i).match(/^([a-zA-Z_]\w*)/);
        if (wordMatch) {
            const word = wordMatch[1];
            tokens.push({ text: word, type: getWordType(word) });
            i += word.length;
            continue;
        }

        // Everything else
        tokens.push({ text: line[i], type: 'default' });
        i++;
    }

    return { tokens, inBlockComment };
}

// Render a tokenized line in the PDF
function renderTokenizedLine(doc, tokens, x, y, fontSize) {
    for (const token of tokens) {
        const color = SYNTAX_COLORS[token.type] || SYNTAX_COLORS.default;
        doc.setTextColor(...color);

        // Handle tabs as spaces for width calc
        const text = token.text.replace(/\t/g, '    ');
        doc.text(text, x, y);
        x += doc.getTextWidth(text);
    }
}

// ─── PDF Generation ─────────────────────
async function generatePDF() {
    const title = els.reportTitle.value.trim() || 'Project Report';
    const name = els.studentName.value.trim();
    const id = els.studentId.value.trim();
    const cls = els.className.value.trim();
    const teacher = els.teacherName.value.trim();
    const date = els.reportDate.value;

    if (!name) { showToast('Please enter your name', 'error'); els.studentName.focus(); return; }
    if (!id) { showToast('Please enter your student ID', 'error'); els.studentId.focus(); return; }
    if (!cls) { showToast('Please enter your class/course', 'error'); els.className.focus(); return; }
    if (state.exercises.length === 0) { showToast('Please add at least one exercise', 'error'); return; }

    els.btnGenerate.disabled = true;
    els.progressContainer.style.display = 'block';
    setProgress(5, 'Initializing...');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentW = pageW - margin * 2;

        // ═══ COVER PAGE ═══════════════════
        setProgress(10, 'Creating cover page...');

        // School logo
        let logoEndY = pageH * 0.18;
        if (state.logo) {
            try {
                const logoDims = await getImageDimensions(state.logo.dataUrl);
                const logoAspect = logoDims.width / logoDims.height;
                let logoH = 28;
                let logoW = logoH * logoAspect;
                if (logoW > 60) { logoW = 60; logoH = logoW / logoAspect; }
                const logoX = (pageW - logoW) / 2;
                const logoY = 25;
                doc.addImage(state.logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH);
                logoEndY = logoY + logoH + 15;
            } catch (e) {
                console.warn('Could not embed logo:', e);
            }
        }

        // Title
        doc.setFont('times', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(0, 0, 0);
        const titleLines = doc.splitTextToSize(title, contentW);
        let titleY = Math.max(logoEndY + 20, pageH * 0.30);
        doc.text(titleLines, pageW / 2, titleY, { align: 'center' });
        titleY += titleLines.length * 11;

        // Rule
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.line(pageW / 2 - 40, titleY + 6, pageW / 2 + 40, titleY + 6);

        // Course
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text(cls, pageW / 2, titleY + 20, { align: 'center' });

        // Info block
        const infoStartY = titleY + 46;
        const infoPairs = [['Student Name', name], ['Student ID', id]];
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

        // ═══ EXERCISES ═══════════════════
        for (let exIdx = 0; exIdx < state.exercises.length; exIdx++) {
            const ex = state.exercises[exIdx];
            const pct = 15 + ((exIdx + 1) / state.exercises.length) * 75;
            setProgress(pct, `Rendering ${ex.name}...`);

            doc.addPage();
            let y = margin;

            // Exercise heading
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`Exercise ${exIdx + 1}: ${ex.name}`, margin, y + 5);
            y += 12;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 8;

            // ── Source code with VS Code syntax highlighting ──
            doc.setFont('courier', 'normal');
            const codeFontSize = 8;
            doc.setFontSize(codeFontSize);

            const codeLines = ex.content.split('\n');
            const lineHeight = 3.8;
            let inBlockComment = false;

            for (let ln = 0; ln < codeLines.length; ln++) {
                if (y + lineHeight > pageH - margin - 8) {
                    addPageNumber(doc, pageW, pageH);
                    doc.addPage();
                    y = margin;

                    // Continuation
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(120, 120, 120);
                    doc.text(`${ex.name} (continued)`, margin, y + 3);
                    y += 10;
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(codeFontSize);
                }

                // Line number
                const lineNum = String(ln + 1).padStart(4, ' ');
                doc.setTextColor(170, 170, 170);
                doc.text(lineNum, margin, y);

                // Tokenize and render with syntax colors
                let lineText = codeLines[ln].replace(/\t/g, '    ');
                const maxChars = 95;
                if (lineText.length > maxChars) {
                    lineText = lineText.substring(0, maxChars) + ' ...';
                }

                const result = tokenizeLine(lineText, inBlockComment);
                inBlockComment = result.inBlockComment;

                doc.setFont('courier', 'normal');
                doc.setFontSize(codeFontSize);
                renderTokenizedLine(doc, result.tokens, margin + 14, y, codeFontSize);

                y += lineHeight;
            }

            addPageNumber(doc, pageW, pageH);

            // ── Output screenshots for this exercise ──
            if (ex.screenshots.length > 0) {
                // Add space or new page
                y += 8;

                // "Output" heading
                if (y + 30 > pageH - margin) {
                    addPageNumber(doc, pageW, pageH);
                    doc.addPage();
                    y = margin;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text('Output', margin, y + 4);
                y += 10;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.2);
                doc.line(margin, y, pageW - margin, y);
                y += 8;

                for (let ssIdx = 0; ssIdx < ex.screenshots.length; ssIdx++) {
                    const ss = ex.screenshots[ssIdx];
                    setProgress(pct, `Embedding ${ss.name}...`);

                    const imgDims = await getImageDimensions(ss.dataUrl);
                    const aspectRatio = imgDims.width / imgDims.height;

                    let imgW = contentW;
                    let imgH = imgW / aspectRatio;
                    const maxImgH = (pageH - margin * 2) * 0.55;
                    if (imgH > maxImgH) {
                        imgH = maxImgH;
                        imgW = imgH * aspectRatio;
                    }

                    const neededH = imgH + 22;
                    if (y + neededH > pageH - margin) {
                        addPageNumber(doc, pageW, pageH);
                        doc.addPage();
                        y = margin;
                    }

                    // Caption
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Figure ${ssIdx + 1}: ${ss.name}`, margin, y + 3);
                    y += 8;

                    // Image
                    const imgX = margin + (contentW - imgW) / 2;
                    doc.setDrawColor(220, 220, 220);
                    doc.setLineWidth(0.2);
                    doc.rect(imgX - 0.5, y - 0.5, imgW + 1, imgH + 1);

                    try {
                        doc.addImage(ss.dataUrl, 'JPEG', imgX, y, imgW, imgH);
                    } catch (e) {
                        try { doc.addImage(ss.dataUrl, 'PNG', imgX, y, imgW, imgH); }
                        catch (e2) {
                            doc.setFont('helvetica', 'italic');
                            doc.setFontSize(10);
                            doc.setTextColor(180, 50, 50);
                            doc.text(`[Could not embed: ${ss.name}]`, margin, y + 10);
                        }
                    }
                    y += imgH + 12;

                    await sleep(20);
                }
                addPageNumber(doc, pageW, pageH);
            }

            await sleep(30);
        }

        // ═══ SAVE ═════════════════════════
        setProgress(95, 'Finalizing PDF...');
        await sleep(200);

        const fileName = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_${id}.pdf`;
        doc.save(fileName);

        setProgress(100, 'Done!');
        showToast('PDF generated successfully! 🎉', 'success');

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
        img.onerror = () => resolve({ width: 800, height: 600 });
        img.src = dataUrl;
    });
}

function setProgress(pct, text) {
    const bar = els.progressBar;
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

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── Start ──────────────────────────────
document.addEventListener('DOMContentLoaded', init);
