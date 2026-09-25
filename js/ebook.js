/* ==========================================================================
   RAVI RAJ SINGH — EBOOK GENERATOR
   Version: 6.0 — Vintage old book + Footnotes + Multi-page (client-side)
   Companion: book.html · book.js · book.css · print.css
   ========================================================================== */

// ============================================================
// CONFIGURATION
// ============================================================
const EBOOK_CONFIG = {
    author: 'Ravi Raj Singh',
    title: 'A Boy Who Never Thought',
    subtitle: 'Safar Se Safar Tak',
    subtitleHindi: 'गुंजते सन्नाटे',
    birthYear: 2008,
    birthplace: 'Begusarai, Bihar',
    currentYear: new Date().getFullYear(),
    images: {
        cover: 'assets/images/bookcover.jpg',
        backCover: 'assets/images/backcover.jpg',
        author: 'assets/images/casual.jpg',
        signature: 'assets/images/signature.jpg'
    },
    qr: {
        url: 'https://ravirajhere.vercel.app',
        size: 120
    },
    pdf: {
        scale: 2,
        quality: 0.85,
        format: 'a4',
        margin: 15,
        batchSize: 2,
        /* Usable content area inside page (mm) */
        usableWidthMm: 180,
        /* Total page height 297mm - margin 15*2 = 267mm */
        /* Minus running header + top/bottom padding ~24mm */
        /* = 243mm usable content height */
        usableHeightMm: 243
    }
};

// ============================================================
// STYLE CONSTANTS
// ============================================================
const S = {
    serifHead: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
    serifBody: "'Lora', 'Georgia', 'Times New Roman', serif",
    ink:       '#1F1A14',
    soft:      '#3D3428',
    muted:     '#6F6558',
    gold:      '#8B6F3F',
    line:      '#E0D5C0',
    paper:     '#FBF8F1'
};

const FLEURON = '❦';

// ============================================================
// 1. PROGRESS PILL
// ============================================================
function showPdfProgress(percent, label) {
    const pill = document.getElementById('pdfProgressPill');
    const text = document.getElementById('pdfPillText');
    const pct  = document.getElementById('pdfPillPercent');
    const fill = document.getElementById('pdfPillFill');

    if (!pill) return;
    pill.classList.add('active');

    const p = Math.max(0, Math.min(100, Math.round(percent)));
    if (text && label) text.textContent = label;
    if (pct)  pct.textContent = p + '%';
    if (fill) fill.style.width = p + '%';
}

function hidePdfProgress() {
    const pill = document.getElementById('pdfProgressPill');
    if (pill) pill.classList.remove('active');

    setTimeout(function () {
        const pct  = document.getElementById('pdfPillPercent');
        const fill = document.getElementById('pdfPillFill');
        const text = document.getElementById('pdfPillText');
        if (pct)  pct.textContent = '0%';
        if (fill) fill.style.width = '0%';
        if (text) text.textContent = 'Generating PDF';
    }, 400);
}

window.showPdfProgress = showPdfProgress;
window.hidePdfProgress = hidePdfProgress;

// ============================================================
// 2. TOAST
// ============================================================
function showToast(message, type) {
    try {
        if (type === 'error') console.error('[ebook]', message);
        else console.log('[ebook]', message);
    } catch (e) {}

    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = [
            'position:fixed',
            'left:50%',
            'bottom:32px',
            'transform:translateX(-50%) translateY(16px)',
            'background:#1F1A14',
            'color:#FBF8F1',
            'padding:12px 20px',
            'border-radius:2px',
            'font-family:Inter,system-ui,sans-serif',
            'font-size:13px',
            'letter-spacing:0.02em',
            'box-shadow:0 8px 24px rgba(0,0,0,0.18)',
            'opacity:0',
            'pointer-events:none',
            'transition:opacity .25s ease, transform .25s ease',
            'z-index:9999'
        ].join(';');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(16px)';
    }, 2800);
}

window.showToast = showToast;

// ============================================================
// 3. PRELOAD UTILITIES
// ============================================================
function preloadImage(src) {
    return new Promise(function (resolve) {
        if (!src) return resolve(false);
        const img = new Image();
        img.onload  = function () { resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = src;
    });
}

async function waitForFonts() {
    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
        await new Promise(function (r) { setTimeout(r, 200); });
    } catch (e) {}
}

async function preloadAllImages() {
    const srcs = [
        EBOOK_CONFIG.images.cover,
        EBOOK_CONFIG.images.backCover,
        EBOOK_CONFIG.images.author,
        EBOOK_CONFIG.images.signature
    ];

    document.querySelectorAll('.chapter-photo img').forEach(function (img) {
        if (img.src) srcs.push(img.src);
    });

    await Promise.all(srcs.map(preloadImage));
}

// ============================================================
// 4. RESOURCE VALIDATOR
// ============================================================
class ResourceValidator {
    static validateImage(src) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload  = function () { resolve(src); };
            img.onerror = function () {
                const canvas = document.createElement('canvas');
                canvas.width  = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#F5F0E5';
                ctx.fillRect(0, 0, 400, 400);
                ctx.fillStyle = '#8B6F3F';
                ctx.font = '60px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📷', 200, 200);
                ctx.fillStyle = '#6F6558';
                ctx.font = '16px Arial';
                ctx.fillText('Image not found', 200, 280);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = src;
        });
    }

    static async validateAll() {
        const results = {};
        const entries = Object.entries(EBOOK_CONFIG.images);
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i][0];
            const src = entries[i][1];
            results[key] = await this.validateImage(src);
        }
        return results;
    }
}

// ============================================================
// 5. LIBRARY LOADER
// ============================================================
class LibraryLoader {
    static loadScript(src, retries) {
        retries = retries || 3;
        return new Promise(function (resolve, reject) {
            (function attempt(n) {
                const script = document.createElement('script');
                script.src = src;
                script.onload  = function () { resolve(true); };
                script.onerror = function () {
                    if (n >= retries) reject(new Error('Failed to load ' + src));
                    else setTimeout(function () { attempt(n + 1); }, 800 * n);
                };
                document.head.appendChild(script);
            })(1);
        });
    }

    static async loadAll() {
        const libs = [
            { test: function () { return typeof html2canvas !== 'undefined'; },
              src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' },
            { test: function () { return typeof window.jspdf !== 'undefined' || typeof jspdf !== 'undefined'; },
              src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' },
            { test: function () { return typeof QRCode !== 'undefined'; },
              src: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js' }
        ];

        for (let i = 0; i < libs.length; i++) {
            if (!libs[i].test()) {
                await this.loadScript(libs[i].src, 3);
            }
        }
        return true;
    }
}

// ============================================================
// 6. QR GENERATOR
// ============================================================
class QRGenerator {
    static generate(data, size) {
        size = size || 120;
        return new Promise(function (resolve) {
            try {
                const container = document.createElement('div');
                container.style.cssText = 'width:' + size + 'px;height:' + size + 'px;position:absolute;left:-9999px;top:-9999px;';
                document.body.appendChild(container);

                new QRCode(container, {
                    text: data,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });

                let attempts = 0;
                const check = setInterval(function () {
                    attempts++;
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        clearInterval(check);
                        const dataUrl = canvas.toDataURL('image/png');
                        if (container.parentNode) document.body.removeChild(container);
                        resolve(dataUrl);
                    } else if (attempts >= 12) {
                        clearInterval(check);
                        if (container.parentNode) document.body.removeChild(container);
                        resolve(null);
                    }
                }, 100);
            } catch (e) {
                resolve(null);
            }
        });
    }
}

// ============================================================
// 7. PAGE HELPERS
// ============================================================
function makePage(extra) {
    const div = document.createElement('div');
    div.style.cssText = [
        'padding:60px 55px 55px 55px',
        'background:' + S.paper,
        'display:flex',
        'flex-direction:column',
        'justify-content:center',
        'min-height:100%',
        'box-sizing:border-box',
        'position:relative',
        'font-family:' + S.serifBody
    ].join(';') + (extra || '');
    return div;
}

function runningHeader(leftText, rightText) {
    return '<div class="pdf-running-header">' +
        '<span>' + leftText + '</span>' +
        '<span>' + rightText + '</span>' +
    '</div>';
}

function goldRule(width, centered) {
    width = width || 50;
    const align = centered ? 'margin:0 auto 24px auto;' : 'margin:0 0 24px 0;';
    return '<div style="width:' + width + 'px;height:1px;background:' + S.gold + ';' + align + '"></div>';
}

function ornamentedRule() {
    return '<div style="width:80px;height:1px;background:' + S.gold + ';margin:0 auto 24px;position:relative;">' +
        '<span style="position:absolute;top:-8px;left:-18px;font-size:10px;color:' + S.gold + ';font-family:' + S.serifHead + ';">' + FLEURON + '</span>' +
        '<span style="position:absolute;top:-8px;right:-18px;font-size:10px;color:' + S.gold + ';font-family:' + S.serifHead + ';">' + FLEURON + '</span>' +
    '</div>';
}

function fleuron(centered) {
    const align = centered ? 'text-align:center;' : 'text-align:left;';
    return '<div style="' + align + 'font-family:' + S.serifHead + ';font-size:18px;color:' + S.gold + ';letter-spacing:1em;padding-left:1em;margin:20px 0;">' + FLEURON + '</div>';
}

function para(text, opts) {
    opts = opts || {};
    const indent = opts.indent ? 'text-indent:1.5em;' : '';
    const size = opts.size || '12.5px';
    const align = opts.align || 'justify';
    return '<p style="font-family:' + S.serifBody + ';' +
        'font-size:' + size + ';' +
        'line-height:1.75;' +
        'color:' + S.ink + ';' +
        'text-align:' + align + ';' +
        indent +
        'margin:0 0 12px 0;">' + text + '</p>';
}

function signature(author) {
    return '<div style="width:50px;height:1px;background:' + S.gold + ';margin:24px 0;"></div>' +
        '<p style="font-family:' + S.serifHead + ';font-size:15px;color:' + S.gold + ';margin:0;">— ' + author + '</p>';
}

// ============================================================
// 8. PDF STYLE INJECTOR
// Injects a <style> tag with all styles needed for PDF rendering
// This replaces the old inline-style approach
// ============================================================
function getPdfStyles() {
    return `
        .pdf-page {
            padding: 60px 55px 55px 55px;
            background: ${S.paper};
            box-sizing: border-box;
            position: relative;
            font-family: ${S.serifBody};
            color: ${S.ink};
        }

        .pdf-page-body {
            display: flex;
            flex-direction: column;
        }

        .pdf-running-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-family: ${S.serifBody};
            font-style: italic;
            font-size: 9px;
            color: ${S.muted};
            letter-spacing: 0.15em;
            text-transform: uppercase;
            padding-bottom: 6px;
            border-bottom: 1px solid #EDE5D5;
            margin-bottom: 24px;
        }

        .pdf-chapter-head {
            text-align: center;
            margin-bottom: 32px;
        }

        .pdf-chapter-num {
            font-family: ${S.serifBody};
            font-size: 10px;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: ${S.muted};
            margin: 0 0 12px;
        }

        .pdf-chapter-title {
            font-family: ${S.serifHead};
            font-size: 22px;
            font-weight: 700;
            color: ${S.ink};
            line-height: 1.25;
            letter-spacing: 0.02em;
            margin: 0 0 8px;
        }

        .pdf-chapter-year {
            font-family: ${S.serifBody};
            font-style: italic;
            font-size: 11px;
            color: ${S.muted};
            margin: 0 0 20px;
        }

        .pdf-chapter-body p {
            font-family: ${S.serifBody};
            font-size: 12.5px;
            line-height: 1.75;
            color: ${S.ink};
            text-align: justify;
            text-justify: inter-word;
            hyphens: auto;
            -webkit-hyphens: auto;
            margin: 0;
            text-indent: 1.5em;
            letter-spacing: 0.005em;
        }

        .pdf-chapter-body p:first-of-type {
            font-size: 13px;
            line-height: 1.85;
            color: ${S.soft};
            text-indent: 0;
            margin-bottom: 6px;
        }

        .pdf-chapter-body p:first-of-type::first-letter {
            font-family: ${S.serifHead};
            font-size: 3.4em;
            font-weight: 700;
            float: left;
            line-height: 0.85;
            margin: 0.08em 0.08em 0 0;
            color: ${S.gold};
            text-indent: 0;
        }

        .pdf-chapter-body strong {
            color: ${S.ink};
            font-weight: 700;
        }

        .pdf-chapter-body em {
            color: ${S.soft};
            font-style: italic;
        }

        .pdf-chapter-body .pull-quote {
            border: none;
            padding: 16px 0;
            margin: 24px 0;
            text-align: center;
            text-indent: 0;
        }

        .pdf-chapter-body .pull-quote p {
            font-family: ${S.serifHead};
            font-size: 13px;
            font-style: italic;
            color: ${S.ink};
            line-height: 1.6;
            text-align: center;
            text-indent: 0;
            margin: 0 0 6px;
            hyphens: none;
        }

        .pdf-chapter-body .pull-quote footer {
            font-family: ${S.serifBody};
            font-style: italic;
            font-size: 9px;
            color: ${S.gold};
            letter-spacing: 0.15em;
            text-transform: uppercase;
            text-align: center;
        }

        .pdf-chapter-body .pull-quote::before,
        .pdf-chapter-body .pull-quote::after {
            content: '${FLEURON}';
            display: block;
            font-family: ${S.serifHead};
            font-size: 12px;
            color: ${S.gold};
            letter-spacing: 0.4em;
            padding-left: 0.4em;
            margin: 8px 0;
        }

        .pdf-chapter-body .chapter-photo {
            margin: 22px auto;
            text-align: center;
            max-width: 380px;
            text-indent: 0;
        }

        .pdf-chapter-body .chapter-photo img {
            width: 100%;
            height: auto;
            border: 1px solid ${S.line};
        }

        .pdf-chapter-body .chapter-photo figcaption {
            font-family: ${S.serifBody};
            font-style: italic;
            font-size: 10px;
            color: ${S.muted};
            letter-spacing: 0.08em;
            margin-top: 10px;
            text-align: center;
            text-indent: 0;
        }

        .pdf-chapter-body .footnote-marker {
            font-family: ${S.serifHead};
            font-size: 0.65em;
            color: ${S.gold};
            vertical-align: super;
            line-height: 0;
            margin-left: 1px;
            font-weight: 600;
        }

        .pdf-chapter-notes {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid ${S.line};
        }

        .pdf-chapter-notes-heading {
            font-family: ${S.serifHead};
            font-style: italic;
            font-size: 10px;
            color: ${S.gold};
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin: 0 0 12px;
            text-align: center;
        }

        .pdf-chapter-notes-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .pdf-chapter-notes-list li {
            display: flex;
            gap: 8px;
            font-family: ${S.serifBody};
            font-size: 9.5px;
            line-height: 1.5;
            color: ${S.soft};
            margin-bottom: 6px;
            text-align: left;
            text-indent: 0;
        }

        .pdf-chapter-notes-num {
            flex-shrink: 0;
            font-family: ${S.serifHead};
            font-size: 0.85em;
            color: ${S.gold};
            font-weight: 600;
            vertical-align: super;
        }

        .pdf-chapter-notes-text {
            flex: 1;
        }

        .pdf-chapter-page-number {
            position: absolute;
            bottom: 24px;
            left: 0;
            right: 0;
            text-align: center;
            font-family: ${S.serifHead};
            font-style: italic;
            font-size: 10px;
            color: ${S.muted};
            letter-spacing: 0.15em;
        }

        .pdf-placeholder {
            font-family: ${S.serifHead};
            font-style: italic;
            font-size: 14px;
            color: ${S.muted};
            text-align: center;
            padding: 60px 0;
            letter-spacing: 0.02em;
            line-height: 1.7;
            text-indent: 0;
        }

        .pdf-placeholder::before {
            content: '${FLEURON}';
            display: block;
            font-size: 14px;
            color: ${S.gold};
            margin-bottom: 24px;
            letter-spacing: 0.5em;
            padding-left: 0.5em;
        }
    `;
}

let __pdfStyleInjected = false;
function injectPdfStyles() {
    if (__pdfStyleInjected) return;
    const style = document.createElement('style');
    style.setAttribute('data-pdf-styles', 'true');
    style.textContent = getPdfStyles();
    document.head.appendChild(style);
    __pdfStyleInjected = true;
}

// ============================================================
// 9. FOOTNOTE PROCESSING
// ============================================================
function processFootnotes(bodyEl) {
    const clone = bodyEl.cloneNode(true);
    const footnotes = Array.prototype.slice.call(clone.querySelectorAll('.footnote'));
    const notesList = [];

    footnotes.forEach(function (fn) {
        const noteText = fn.getAttribute('data-note') || '';
        const originalText = fn.textContent.trim();

        if (!noteText) {
            /* Just strip class if no note */
            const textNode = document.createTextNode(originalText);
            if (fn.parentNode) {
                fn.parentNode.insertBefore(textNode, fn);
                fn.parentNode.removeChild(fn);
            }
            return;
        }

        const num = notesList.length + 1;

        const marker = document.createElement('sup');
        marker.className = 'footnote-marker';
        marker.textContent = num;

        const textNode = document.createTextNode(originalText);
        if (fn.parentNode) {
            fn.parentNode.insertBefore(textNode, fn);
            fn.parentNode.insertBefore(marker, fn);
            fn.parentNode.removeChild(fn);
        }

        notesList.push({
            num: num,
            text: noteText
        });
    });

    return { cleanBody: clone, notesList: notesList };
}

function buildChapterEndNotesHTML(notesList) {
    if (!notesList || notesList.length === 0) return '';

    let items = '';
    notesList.forEach(function (note) {
        items +=
            '<li>' +
                '<span class="pdf-chapter-notes-num">' + note.num + '</span>' +
                '<span class="pdf-chapter-notes-text">' + note.text + '</span>' +
            '</li>';
    });

    return '<section class="pdf-chapter-notes">' +
        '<p class="pdf-chapter-notes-heading">Notes</p>' +
        '<ol class="pdf-chapter-notes-list">' + items + '</ol>' +
    '</section>';
}

// ============================================================
// 10. MAIN EBOOK GENERATOR
// ============================================================
class EbookGenerator {
    constructor() {
        this.pdf = null;
        this.pages = [];
        this.currentPage = 0;
        this.totalPages = 0;
        this.isGenerating = false;
        this.cancelled = false;
        this.resources = null;
        this.chapterStartPages = {};
    }

    async generate(lang, langLabel) {
        if (this.isGenerating) return;

        this.isGenerating = true;
        this.cancelled = false;
        this.currentPage = 0;
        this.chapterStartPages = {};

        const report = function (p, m) { showPdfProgress(p, m || 'Generating PDF'); };

        report(0, 'Preparing…');

        try {
            report(3, 'Loading fonts…');
            await waitForFonts();

            report(5, 'Loading images…');
            await preloadAllImages();

            this.resources = await ResourceValidator.validateAll();
            await LibraryLoader.loadAll();

            /* Inject PDF styles once */
            injectPdfStyles();

            report(10, 'Building pages…');

            const content = this.getContent(lang);
            if (!content) throw new Error('Content not found. Is book.html open?');

            this.pages = await this.buildPages(content);
            this.totalPages = this.pages.length;

            report(45, 'Rendering PDF…');

            await this.generatePDF(langLabel, report);

            report(100, 'Saving…');

            const filename = 'A_Boy_Who_Never_Thought_' + langLabel + '.pdf';
            this.pdf.save(filename);

            showToast(langLabel + ' edition downloaded.');
        } catch (error) {
            console.error('Ebook generation failed:', error);
            showToast('Failed: ' + error.message, 'error');
            throw error;
        } finally {
            this.isGenerating = false;
            setTimeout(hidePdfProgress, 800);
            this.cleanup();
        }
    }

    getContent(lang) {
        const wrapper = document.querySelector('.reading-main');
        if (!wrapper) return null;

        const clone = wrapper.cloneNode(true);

        const currentId = lang === 'hi' ? 'chaptersHi' : 'chaptersEn';
        const otherId   = lang === 'hi' ? 'chaptersEn' : 'chaptersHi';

        const current = clone.querySelector('#' + currentId);
        const other   = clone.querySelector('#' + otherId);

        if (other) other.remove();
        if (!current) return null;

        current.hidden = false;

        const chapters = Array.prototype.slice.call(
            current.querySelectorAll('article.chapter')
        );

        chapters.forEach(function (ch) {
            ch.hidden = false;
            ch.style.display = 'block';
        });

        return { wrapper: clone, chapters: chapters };
    }

    async buildPages(content) {
        const pages = [];
        const images = this.resources;
        const qrDataUrl = await QRGenerator.generate(
            EBOOK_CONFIG.qr.url,
            EBOOK_CONFIG.qr.size
        );

        const add = function (fn) { pages.push(fn()); };

        /* ---- FRONT MATTER (9 pages) ---- */
        add(() => this.pageCover(images.cover));
        add(() => this.pageHalfTitle());
        add(() => this.pageFrontispiece(images.author));
        add(() => this.pageTitle());
        add(() => this.pageCopyright());
        add(() => this.pageDedication());
        add(() => this.pageAuthorsNote());

        const chapterStartPage = 10;
        const tocPage = this.pageTOC(content.chapters, chapterStartPage);

        add(() => tocPage);
        add(() => this.pageHowToRead());

        /* ---- CHAPTERS (may produce multiple pages each) ---- */
        const frontMatterCount = pages.length;
        let runningPageNum = frontMatterCount + 1;

        for (let i = 0; i < content.chapters.length; i++) {
            if (this.cancelled) break;

            const chapterPages = await this.pageChapter(
                content.chapters[i],
                i,
                runningPageNum
            );

            this.chapterStartPages[i] = runningPageNum;

            chapterPages.forEach(function (p) { pages.push(p); });
            runningPageNum += chapterPages.length;
        }

        /* Re-generate TOC with actual chapter page numbers */
        const realTOC = this.pageTOC(content.chapters, null, this.chapterStartPages);
        pages[7] = realTOC;

        /* ---- BACK MATTER (5 pages) ---- */
        add(() => this.pageStoryBehind());
        add(() => this.pageAboutAuthor(images.author, qrDataUrl));
        add(() => this.pageColophon());
        add(() => this.pageBlank());
        add(() => this.pageBackCover(images.backCover));

        return pages;
    }

    /* ---------- FRONT MATTER PAGES ---------- */

    pageCover(coverImage) {
        const div = document.createElement('div');
        div.style.cssText = 'padding:0;margin:0;background:' + S.paper + ';width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
        div.innerHTML = '<img src="' + coverImage + '" alt="Book Cover" style="width:100%;height:100%;object-fit:contain;">';
        return div;
    }

    pageBackCover(backCoverImage) {
        const div = document.createElement('div');
        div.style.cssText = 'padding:0;margin:0;background:' + S.paper + ';width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
        div.innerHTML = '<img src="' + backCoverImage + '" alt="Back Cover" style="width:100%;height:100%;object-fit:contain;">';
        return div;
    }

    pageHalfTitle() {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<div style="max-width:500px;margin:0 auto;width:100%;">' +
                '<h1 style="font-family:' + S.serifHead + ';font-size:28px;font-weight:700;color:' + S.ink + ';letter-spacing:0.08em;line-height:1.3;margin:0;">' +
                    EBOOK_CONFIG.title +
                '</h1>' +
            '</div>';
        return div;
    }

    pageFrontispiece(authorImage) {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<div style="max-width:400px;margin:0 auto;width:100%;">' +
                '<div style="width:100%;max-width:320px;margin:0 auto;border:1px solid ' + S.line + ';padding:8px;background:#FFFFFF;">' +
                    '<img src="' + authorImage + '" alt="' + EBOOK_CONFIG.author + '" style="width:100%;height:auto;display:block;">' +
                '</div>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:10px;color:' + S.muted + ';letter-spacing:0.12em;margin:20px 0 0 0;">' +
                    EBOOK_CONFIG.author +
                '</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:10px;color:' + S.muted + ';letter-spacing:0.12em;margin:4px 0 0 0;">' +
                    'Patna, India · ' + EBOOK_CONFIG.currentYear +
                '</p>' +
            '</div>';
        return div;
    }

    pageTitle() {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<div style="max-width:520px;margin:0 auto;width:100%;">' +
                '<div style="width:60px;height:1px;background:' + S.gold + ';margin:0 auto 32px auto;position:relative;">' +
                    '<span style="position:absolute;top:-8px;left:-18px;font-size:10px;color:' + S.gold + ';">' + FLEURON + '</span>' +
                    '<span style="position:absolute;top:-8px;right:-18px;font-size:10px;color:' + S.gold + ';">' + FLEURON + '</span>' +
                '</div>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;letter-spacing:0.15em;color:' + S.muted + ';margin:0 0 16px 0;">A Book by</p>' +
                '<h1 style="font-family:' + S.serifHead + ';font-size:36px;font-weight:700;color:' + S.ink + ';letter-spacing:0.03em;line-height:1.2;margin:0 0 20px 0;">' +
                    EBOOK_CONFIG.title +
                '</h1>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:15px;color:' + S.soft + ';margin:0 0 6px 0;">' +
                    EBOOK_CONFIG.subtitle +
                '</p>' +
                '<p style="font-family:' + S.serifBody + ';font-size:13px;color:' + S.muted + ';margin:0 0 40px 0;">' +
                    EBOOK_CONFIG.subtitleHindi +
                '</p>' +
                '<div style="width:60px;height:1px;background:' + S.gold + ';margin:0 auto 32px auto;position:relative;">' +
                    '<span style="position:absolute;top:-8px;left:-18px;font-size:10px;color:' + S.gold + ';">' + FLEURON + '</span>' +
                    '<span style="position:absolute;top:-8px;right:-18px;font-size:10px;color:' + S.gold + ';">' + FLEURON + '</span>' +
                '</div>' +
                '<p style="font-family:' + S.serifHead + ';font-size:20px;font-weight:600;color:' + S.ink + ';letter-spacing:0.06em;margin:0 0 6px 0;">' +
                    EBOOK_CONFIG.author +
                '</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;color:' + S.muted + ';letter-spacing:0.1em;margin:0;">' +
                    'Patna, India · ' + EBOOK_CONFIG.currentYear +
                '</p>' +
            '</div>';
        return div;
    }

    pageCopyright() {
        const div = makePage();
        div.innerHTML =
            '<div style="max-width:440px;margin:0 auto;width:100%;">' +
                '<p style="font-family:' + S.serifHead + ';font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:' + S.muted + ';margin:0 0 20px 0;">Copyright</p>' +
                para('© 2024 ' + EBOOK_CONFIG.author + '. All rights reserved.', { align: 'left' }) +
                para('No part of this book may be reproduced or transmitted in any form without prior written permission from the author.', { align: 'left' }) +
                para('This book is not for sale. For personal reading only.', { align: 'left' }) +
                para('First written in 2024. Ongoing.', { align: 'left' }) +
                '<div style="width:50px;height:1px;background:' + S.gold + ';margin:24px 0;"></div>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;color:' + S.muted + ';margin:0;line-height:1.8;">' +
                    EBOOK_CONFIG.author + '<br>' +
                    'Patna, India<br>' +
                    'raviraj2k09@gmail.com' +
                '</p>' +
            '</div>';
        return div;
    }

    pageDedication() {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<div style="max-width:480px;margin:0 auto;width:100%;">' +
                fleuron(true) +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:16px;color:' + S.soft + ';line-height:2;margin:0 0 6px 0;">To my parents, who gave me the courage to dream.</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:16px;color:' + S.soft + ';line-height:2;margin:0 0 6px 0;">To my sisters, who taught me patience.</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:16px;color:' + S.soft + ';line-height:2;margin:0;">To the friends who stayed.</p>' +
                fleuron(true) +
                '<p style="font-family:' + S.serifHead + ';font-size:14px;color:' + S.gold + ';margin:16px 0 0 0;">— ' + EBOOK_CONFIG.author + '</p>' +
            '</div>';
        return div;
    }

    pageAuthorsNote() {
        const div = makePage();
        div.innerHTML =
            runningHeader(EBOOK_CONFIG.author, "Author's Note") +
            '<div style="max-width:520px;margin:60px auto 0;width:100%;">' +
                '<h2 style="font-family:' + S.serifHead + ';font-size:24px;font-weight:700;color:' + S.ink + ';letter-spacing:0.02em;text-align:center;margin:0 0 20px 0;">' +
                    "Author's Note" +
                '</h2>' +
                ornamentedRule() +
                para('This book is not fiction. Every name, every date, every memory is real. I wrote it for my parents, my sisters, and for the boy I used to be.', { indent: true }) +
                para('Some memories are painful. Some are joyful. All of them are mine.', { indent: true }) +
                para('I have tried to be honest. I have tried to remember things exactly as they happened — though memory, like everything, fades with time.', { indent: true }) +
                para('If you find yourself in these pages, know that you mattered. You still do.', { indent: true }) +
                signature(EBOOK_CONFIG.author) +
            '</div>';
        return div;
    }

    pageTOC(chapters, startPage, chapterStartPages) {
        const div = makePage();
        let rows = '';
        const basePageNum = startPage || 10;

        chapters.forEach(function (ch, i) {
            const titleEl = ch.querySelector('.chapter-title');
            const yearEl  = ch.querySelector('.chapter-year');

            const title = titleEl ? titleEl.textContent.trim() : 'Chapter ' + (i + 1);
            const year  = yearEl ? yearEl.textContent.trim() : '';

            const label = 'Chapter ' + (i + 1);
            const pg = chapterStartPages
                ? (chapterStartPages[i] || basePageNum + i)
                : basePageNum + i;

            rows +=
                '<div style="display:flex;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px dotted #E0D5C0;">' +
                    '<div style="flex-shrink:0;font-family:' + S.serifBody + ';font-style:italic;font-size:10px;letter-spacing:0.08em;color:' + S.gold + ';width:80px;">' + label + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="font-family:' + S.serifBody + ';font-size:14px;color:' + S.ink + ';">' + title + '</div>' +
                        (year ? '<div style="font-family:' + S.serifBody + ';font-style:italic;font-size:10px;color:' + S.muted + ';margin-top:1px;">' + year + '</div>' : '') +
                    '</div>' +
                    '<div style="flex-shrink:0;font-family:' + S.serifBody + ';font-size:13px;color:' + S.soft + ';">' + pg + '</div>' +
                '</div>';
        });

        div.innerHTML =
            runningHeader(EBOOK_CONFIG.author, 'Contents') +
            '<div style="max-width:560px;margin:60px auto 0;width:100%;">' +
                '<h2 style="font-family:' + S.serifHead + ';font-size:26px;font-weight:700;color:' + S.ink + ';letter-spacing:0.04em;text-align:center;margin:0 0 8px 0;">' +
                    'Table of Contents' +
                '</h2>' +
                ornamentedRule() +
                rows +
            '</div>';
        return div;
    }

    pageHowToRead() {
        const div = makePage();
        div.innerHTML =
            runningHeader(EBOOK_CONFIG.author, 'How to Read') +
            '<div style="max-width:520px;margin:60px auto 0;width:100%;">' +
                '<h2 style="font-family:' + S.serifHead + ';font-size:24px;font-weight:700;color:' + S.ink + ';letter-spacing:0.02em;text-align:center;margin:0 0 20px 0;">' +
                    'How to Read This Book' +
                '</h2>' +
                ornamentedRule() +
                para('This is a memoir — a true story of a boy growing up in Begusarai, Bihar. It covers the years 2008 to 2026, across eighteen chapters.', { indent: true }) +
                para('You can read it in order, or begin anywhere. Each chapter is a self-contained memory. The Hinglish edition is available alongside the English.', { indent: true }) +
                para('The story continues. It is still being written.', { indent: true }) +
                fleuron(true) +
                '<p style="font-family:' + S.serifHead + ';font-style:italic;font-size:14px;color:' + S.gold + ';text-align:center;line-height:1.8;margin:20px 0 0 0;">' +
                    'Begin anywhere. Read slowly.<br>This story belongs to you now.' +
                '</p>' +
            '</div>';
        return div;
    }

    /* ---------- CHAPTERS (multi-page) ---------- */

    async pageChapter(chapterEl, index, startPageNum) {
        const allPages = [];

        const numEl   = chapterEl.querySelector('.chapter-num');
        const titleEl = chapterEl.querySelector('.chapter-title');
        const yearEl  = chapterEl.querySelector('.chapter-year');

        const numText   = numEl ? numEl.textContent.trim() : 'Chapter ' + (index + 1);
        const titleText = titleEl ? titleEl.textContent.trim() : '';
        const yearText  = yearEl ? yearEl.textContent.trim() : '';

        const bodyEl = chapterEl.querySelector('.chapter-body');
        if (!bodyEl) {
            return [this._buildChapterEmptyPage(numText, titleText, yearText, index, startPageNum, titleText)];
        }

        /* Process footnotes */
        const processed = processFootnotes(bodyEl);
        const cleanBody = processed.cleanBody;
        const notesList = processed.notesList;

        /* Collect blocks */
        const blocks = Array.prototype.slice.call(cleanBody.children);

        /* Measure */
        const measured = await this._measureBlocks(blocks);

        /* Add notes as final block */
        if (notesList && notesList.length > 0) {
            const notesHeight = await this._measureNotes(notesList);
            const notesWrap = document.createElement('div');
            notesWrap.innerHTML = buildChapterEndNotesHTML(notesList);
            const notesNode = notesWrap.firstChild;
            measured.push({
                node: notesNode,
                heightMm: notesHeight
            });
        }

        /* Paginate */
        const pageChunks = this._paginateBlocks(measured);

        /* Build each page */
        for (let p = 0; p < pageChunks.length; p++) {
            const isFirstPage = (p === 0);
            const pageEl = this._buildChapterPage({
                numText: isFirstPage ? numText : '',
                titleText: isFirstPage ? titleText : '',
                yearText: isFirstPage ? yearText : '',
                titleText_header: titleText,
                blocks: pageChunks[p],
                isFirstPage: isFirstPage,
                pageNum: startPageNum + p
            });
            allPages.push(pageEl);
        }

        return allPages;
    }

    async _measureBlocks(blocks) {
        const measureDiv = document.createElement('div');
        measureDiv.className = 'pdf-chapter-body';
        measureDiv.style.cssText = [
            'position:absolute',
            'left:-99999px',
            'top:0',
            'width:' + EBOOK_CONFIG.pdf.usableWidthMm + 'mm',
            'background:' + S.paper,
            'box-sizing:border-box',
            'font-family:' + S.serifBody,
            'padding:0',
            'margin:0'
        ].join(';');
        document.body.appendChild(measureDiv);

        const measured = [];
        const pxPerMm = 3.7795;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const clone = block.cloneNode(true);
            measureDiv.innerHTML = '';
            measureDiv.appendChild(clone);

            /* Wait for images */
            const imgs = Array.prototype.slice.call(clone.querySelectorAll('img'));
            await Promise.all(imgs.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (resolve) {
                    img.onload = img.onerror = function () { resolve(); };
                });
            }));

            await new Promise(function (r) { requestAnimationFrame(r); });

            const heightPx = clone.offsetHeight;
            measured.push({
                node: block,
                heightMm: heightPx / pxPerMm
            });
        }

        document.body.removeChild(measureDiv);
        return measured;
    }

    async _measureNotes(notesList) {
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = [
            'position:absolute',
            'left:-99999px',
            'top:0',
            'width:' + EBOOK_CONFIG.pdf.usableWidthMm + 'mm',
            'background:' + S.paper,
            'box-sizing:border-box',
            'font-family:' + S.serifBody,
            'padding:0',
            'margin:0'
        ].join(';');
        measureDiv.innerHTML = buildChapterEndNotesHTML(notesList);
        document.body.appendChild(measureDiv);

        await new Promise(function (r) { requestAnimationFrame(r); });

        const heightPx = measureDiv.offsetHeight;
        document.body.removeChild(measureDiv);

        return heightPx / 3.7795;
    }

    _paginateBlocks(measured) {
        const usableHeightMm = EBOOK_CONFIG.pdf.usableHeightMm;
        const chunks = [];
        let currentChunk = [];
        let currentHeight = 0;

        for (let i = 0; i < measured.length; i++) {
            const item = measured[i];
            const blockHeight = item.heightMm;

            if (blockHeight > usableHeightMm) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentHeight = 0;
                }
                chunks.push([item.node]);
                continue;
            }

            if (currentHeight + blockHeight > usableHeightMm && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentHeight = 0;
            }

            currentChunk.push(item.node);
            currentHeight += blockHeight;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        if (chunks.length === 0) {
            chunks.push([]);
        }

        return chunks;
    }

    _buildChapterPage(opts) {
        const div = document.createElement('div');
        div.className = 'pdf-page';
        div.style.cssText = [
            'padding:60px 55px 60px 55px',
            'background:' + S.paper,
            'box-sizing:border-box',
            'position:relative',
            'font-family:' + S.serifBody,
            'min-height:100%'
        ].join(';');

        /* Running header */
        const header = document.createElement('div');
        header.innerHTML = runningHeader(EBOOK_CONFIG.author, opts.titleText_header || '');
        div.appendChild(header);

        /* Chapter header (first page only) */
        if (opts.isFirstPage) {
            const headerHTML =
                '<div class="pdf-chapter-head">' +
                    '<p class="pdf-chapter-num">' + opts.numText + '</p>' +
                    '<h2 class="pdf-chapter-title">' + opts.titleText + '</h2>' +
                    (opts.yearText ? '<p class="pdf-chapter-year">' + opts.yearText + '</p>' : '') +
                    ornamentedRule() +
                '</div>';

            const headerWrap = document.createElement('div');
            headerWrap.innerHTML = headerHTML;
            div.appendChild(headerWrap);
        }

        /* Body */
        const bodyWrap = document.createElement('div');
        bodyWrap.className = 'pdf-chapter-body';
        opts.blocks.forEach(function (block) {
            bodyWrap.appendChild(block.cloneNode(true));
        });
        div.appendChild(bodyWrap);

        /* Page number */
        const pageNum = document.createElement('div');
        pageNum.className = 'pdf-chapter-page-number';
        pageNum.textContent = String(opts.pageNum);
        div.appendChild(pageNum);

        return div;
    }

    _buildChapterEmptyPage(numText, titleText, yearText, index, startPageNum, headerTitle) {
        const div = document.createElement('div');
        div.className = 'pdf-page';
        div.style.cssText = [
            'padding:60px 55px 60px 55px',
            'background:' + S.paper,
            'box-sizing:border-box',
            'position:relative',
            'font-family:' + S.serifBody,
            'min-height:100%'
        ].join(';');

        const header = document.createElement('div');
        header.innerHTML = runningHeader(EBOOK_CONFIG.author, headerTitle || '');
        div.appendChild(header);

        const headerHTML =
            '<div class="pdf-chapter-head">' +
                '<p class="pdf-chapter-num">' + numText + '</p>' +
                '<h2 class="pdf-chapter-title">' + titleText + '</h2>' +
                (yearText ? '<p class="pdf-chapter-year">' + yearText + '</p>' : '') +
                ornamentedRule() +
            '</div>';

        const headerWrap = document.createElement('div');
        headerWrap.innerHTML = headerHTML;
        div.appendChild(headerWrap);

        const pageNum = document.createElement('div');
        pageNum.className = 'pdf-chapter-page-number';
        pageNum.textContent = String(startPageNum);
        div.appendChild(pageNum);

        return div;
    }

    /* ---------- BACK MATTER ---------- */

    pageStoryBehind() {
        const div = makePage();
        div.innerHTML =
            runningHeader(EBOOK_CONFIG.author, 'The Story Behind') +
            '<div style="max-width:520px;margin:60px auto 0;width:100%;">' +
                '<h2 style="font-family:' + S.serifHead + ';font-size:24px;font-weight:700;color:' + S.ink + ';letter-spacing:0.02em;text-align:center;margin:0 0 20px 0;">' +
                    'The Story Behind the Story' +
                '</h2>' +
                ornamentedRule() +
                para("I didn't plan to write a book. I started writing — one memory at a time. One evening. One cup of chai.", { indent: true }) +
                para('It began as a diary. Then it became a way to understand myself.', { indent: true }) +
                para('I wrote about my childhood because I wanted to remember it. I wrote about my struggles because I wanted to survive them. And I wrote about my dreams because I still believe in them.', { indent: true }) +
                para('This book is not the end. It is the beginning of a longer conversation — with myself, and with you.', { indent: true }) +
                signature(EBOOK_CONFIG.author) +
            '</div>';
        return div;
    }

    pageAboutAuthor(authorImage, qrDataUrl) {
        const div = makePage();
        div.style.textAlign = 'center';

        const qrHTML = qrDataUrl ? (
            '<div style="margin:24px auto 0 auto;">' +
                '<img src="' + qrDataUrl + '" alt="QR Code" style="width:110px;height:110px;display:block;margin:0 auto;border:1px solid ' + S.gold + ';padding:8px;background:#FFFFFF;">' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:9px;color:' + S.muted + ';margin-top:10px;letter-spacing:0.15em;">Scan to visit</p>' +
            '</div>'
        ) : '';

        div.innerHTML =
            runningHeader(EBOOK_CONFIG.author, 'About the Author') +
            '<div style="max-width:520px;margin:60px auto 0;width:100%;">' +
                '<h2 style="font-family:' + S.serifHead + ';font-size:24px;font-weight:700;color:' + S.ink + ';letter-spacing:0.02em;text-align:center;margin:0 0 20px 0;">' +
                    'About the Author' +
                '</h2>' +
                ornamentedRule() +
                '<div style="width:120px;height:120px;border-radius:50%;border:2px solid ' + S.gold + ';margin:0 auto 20px;overflow:hidden;">' +
                    '<img src="' + authorImage + '" alt="' + EBOOK_CONFIG.author + '" style="width:100%;height:100%;object-fit:cover;">' +
                '</div>' +
                '<p style="font-family:' + S.serifHead + ';font-size:20px;font-weight:700;color:' + S.ink + ';margin:0 0 4px 0;">' + EBOOK_CONFIG.author + '</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:10px;color:' + S.gold + ';letter-spacing:0.2em;text-transform:uppercase;margin:0 0 26px 0;">Author</p>' +
                '<div style="text-align:left;">' +
                    para('Ravi Raj Singh is a writer based in Patna, India. He has kept a personal diary since childhood, and began writing online around 2023–24.', { indent: true }) +
                    para('<em>"A Boy Who Never Thought"</em> is his first book. It grew out of that habit. The book is written in both English and Hinglish, and remains in progress.', { indent: true }) +
                    para('His writing focuses on ordinary lives, small moments, and the quiet ways a person grows.', { indent: true }) +
                '</div>' +
                qrHTML +
            '</div>';
        return div;
    }

    pageColophon() {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<div style="max-width:440px;margin:0 auto;width:100%;">' +
                fleuron(true) +
                '<p style="font-family:' + S.serifBody + ';font-size:13px;color:' + S.soft + ';line-height:2;margin:0;">Written in Patna, India</p>' +
                '<p style="font-family:' + S.serifBody + ';font-size:13px;color:' + S.soft + ';line-height:2;margin:0 0 24px 0;">' + EBOOK_CONFIG.currentYear + '</p>' +
                fleuron(true) +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;color:' + S.muted + ';line-height:1.9;margin:0;">Set in Playfair Display &amp; Lora</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;color:' + S.muted + ';line-height:1.9;margin:0;">Typeset by hand</p>' +
                '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:11px;color:' + S.muted + ';line-height:1.9;margin:0;">No frameworks</p>' +
            '</div>';
        return div;
    }

    pageBlank() {
        const div = makePage();
        div.style.textAlign = 'center';
        div.innerHTML =
            '<p style="font-family:' + S.serifBody + ';font-style:italic;font-size:10px;color:#B0A896;letter-spacing:0.1em;margin:0;">This page is intentionally left blank.</p>';
        return div;
    }

    /* ---------- PDF RENDERING ---------- */
    async generatePDF(langLabel, report) {
        const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFCtor) throw new Error('jsPDF not available');

        const config = EBOOK_CONFIG.pdf;

        this.pdf = new jsPDFCtor({
            unit: 'mm',
            format: config.format,
            orientation: 'portrait',
            compress: true
        });

        this.pdf.setProperties({
            title: EBOOK_CONFIG.title,
            author: EBOOK_CONFIG.author,
            subject: 'Autobiography',
            keywords: 'autobiography, memoir, Bihar, India',
            creator: EBOOK_CONFIG.author
        });

        const pageWidth  = 210;
        const pageHeight = 297;
        const margin = config.margin;
        const contentWidth  = pageWidth  - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);

        const pxPerMm = 3.7795;
        const contentWidthPx  = Math.round(contentWidth  * pxPerMm);
        const contentHeightPx = Math.round(contentHeight * pxPerMm);

        let isFirstPage = true;
        const batchSize = config.batchSize || 2;

        for (let i = 0; i < this.pages.length; i += batchSize) {
            if (this.cancelled) break;

            const batch = this.pages.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map((page) => this.renderPage(
                    page,
                    contentWidth, contentHeight,
                    contentWidthPx, contentHeightPx
                ))
            );

            results.forEach((dataUrl) => {
                if (!dataUrl) return;
                if (!isFirstPage) this.pdf.addPage();
                isFirstPage = false;
                this.pdf.addImage(
                    dataUrl, 'JPEG',
                    margin, margin,
                    contentWidth, contentHeight,
                    undefined, 'FAST'
                );
            });

            const pct = Math.min(100, Math.round(((i + batch.length) / this.pages.length) * 100));
            const visual = Math.max(45, 45 + Math.round((pct / 100) * 55));
            report(visual, 'Rendering PDF…');

            await new Promise((r) => setTimeout(r, 60));
        }
    }

    async renderPage(element, widthMm, heightMm, widthPx, heightPx) {
        let container = null;
        try {
            container = document.createElement('div');
            container.style.cssText = [
                'position:absolute',
                'left:-9999px',
                'top:0',
                'width:' + widthPx + 'px',
                'height:' + heightPx + 'px',
                'background:' + S.paper,
                'overflow:hidden',
                'box-sizing:border-box',
                'padding:0',
                'margin:0'
            ].join(';');

            const clone = element.cloneNode(true);
            clone.style.width = '100%';
            clone.style.height = '100%';
            clone.style.background = S.paper;
            clone.style.boxSizing = 'border-box';

            container.appendChild(clone);
            document.body.appendChild(container);

            const imgs = Array.prototype.slice.call(container.querySelectorAll('img'));
            await Promise.all(imgs.map(function (img) {
                if (img.complete) return Promise.resolve();
                return new Promise(function (resolve) {
                    img.onload = img.onerror = function () { resolve(); };
                });
            }));

            await new Promise((r) => setTimeout(r, 80));

            const canvas = await html2canvas(container, {
                scale: EBOOK_CONFIG.pdf.scale,
                useCORS: true,
                backgroundColor: S.paper,
                logging: false,
                width: widthPx,
                height: heightPx,
                windowWidth: widthPx,
                windowHeight: heightPx,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0
            });

            if (container.parentNode) container.parentNode.removeChild(container);
            container = null;

            if (canvas) {
                return canvas.toDataURL('image/jpeg', EBOOK_CONFIG.pdf.quality);
            }
            return null;
        } catch (error) {
            console.error('Page render failed:', error);
            if (container && container.parentNode) container.parentNode.removeChild(container);
            return null;
        }
    }

    cleanup() {
        document.querySelectorAll('div[style*="left: -9999px"], div[style*="left:-9999px"], div[style*="left: -99999px"], div[style*="left:-99999px"]').forEach(function (el) {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        this.pages = [];
        this.pdf = null;
        this.chapterStartPages = {};
    }

    cancel() {
        this.cancelled = true;
        this.isGenerating = false;
        hidePdfProgress();
        this.cleanup();
    }
}

// ============================================================
// 11. PUBLIC API
// ============================================================
const ebookGenerator = new EbookGenerator();

window.downloadEnglishEbook = async function () {
    await ebookGenerator.generate('en', 'English');
};

window.downloadHinglishEbook = async function () {
    await ebookGenerator.generate('hi', 'Hinglish');
};

window.cancelEbookGeneration = function () {
    ebookGenerator.cancel();
};

// ============================================================
// 12. KEYBOARD SHORTCUT
// ============================================================
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ebookGenerator && ebookGenerator.isGenerating) {
        ebookGenerator.cancel();
    }
});

// ============================================================
// 13. PROGRESS PILL — auto-inject
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('pdfProgressPill')) {
        const pill = document.createElement('div');
        pill.id = 'pdfProgressPill';
        pill.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'right:24px',
            'background:#1F1A14',
            'color:#FBF8F1',
            'padding:14px 18px',
            'border-radius:2px',
            'min-width:220px',
            'font-family:Inter,system-ui,sans-serif',
            'font-size:12px',
            'letter-spacing:0.02em',
            'box-shadow:0 8px 24px rgba(0,0,0,0.2)',
            'opacity:0',
            'transform:translateY(12px)',
            'transition:opacity .3s ease, transform .3s ease',
            'z-index:9998',
            'pointer-events:none'
        ].join(';');
        pill.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span id="pdfPillText" style="font-weight:500;">Generating PDF</span>' +
                '<span id="pdfPillPercent" style="color:#8B6F3F;font-weight:600;">0%</span>' +
            '</div>' +
            '<div style="width:100%;height:2px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;">' +
                '<div id="pdfPillFill" style="width:0%;height:100%;background:#8B6F3F;transition:width .25s ease;"></div>' +
            '</div>';
        document.body.appendChild(pill);

        const style = document.createElement('style');
        style.textContent = '#pdfProgressPill.active{opacity:1 !important;transform:translateY(0) !important;}';
        document.head.appendChild(style);
    }
});

// ============================================================
console.log('✅ ebook.js v6.0 loaded — vintage old book + footnotes + multi-page');
