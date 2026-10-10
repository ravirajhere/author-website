/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — PRINT SCRIPT v6.0
   Chapters pre-rendered at build time. Only pagination here.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    console.log('[print] v6.0 starting');

    /* ─── CONFIG ─── */
    const FIRST_CHAPTER_PAGE = 10;

    const PAGE_WIDTH_MM = 210;
    const PAGE_MARGIN_MM = 20;
    const MM_TO_PX = 3.7795;
    const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - (PAGE_MARGIN_MM * 2);
    const USABLE_CONTENT_PX = Math.round(180 * MM_TO_PX);

    /* ─── REVEAL ─── */
    function revealBook() {
        const loading = document.getElementById('loading');
        const root = document.getElementById('book-root');
        if (loading) {
            loading.hidden = true;
            loading.style.display = 'none';
        }
        if (root) {
            root.hidden = false;
            root.style.display = '';
            root.classList.add('ready');
        }
        console.log('[print] revealed');
    }

    /* ─── FOOTNOTES ─── */
    function processFootnotes(bodyEl) {
        const clone = bodyEl.cloneNode(true);
        const footnotes = Array.from(clone.querySelectorAll('.footnote'));
        const notes = [];

        footnotes.forEach(fn => {
            const text = fn.getAttribute('data-note') || '';
            const original = fn.textContent.trim();

            if (!text) {
                fn.parentNode?.replaceChild(document.createTextNode(original), fn);
                return;
            }

            const num = notes.length + 1;
            const marker = document.createElement('sup');
            marker.className = 'footnote-marker';
            marker.textContent = num;

            const textNode = document.createTextNode(original);
            fn.parentNode?.replaceChild(textNode, fn);
            textNode.parentNode?.insertBefore(marker, textNode.nextSibling);

            notes.push({ num, text });
        });

        return { cleanBody: clone, notes };
    }

    /* ─── NOTES SECTION ─── */
    function buildNotes(notes) {
        if (!notes.length) return null;
        const section = document.createElement('section');
        section.className = 'chapter-notes';
        section.innerHTML = '<p class="chapter-notes-heading">Notes</p>';

        const ol = document.createElement('ol');
        ol.className = 'chapter-notes-list';

        notes.forEach(n => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="chapter-notes-num">${n.num}</span><span class="chapter-notes-text">${n.text}</span>`;
            ol.appendChild(li);
        });

        section.appendChild(ol);
        return section;
    }

    /* ─── MEASURE & PAGINATE ─── */
    function measureBlocks(blocks) {
        const measure = document.createElement('div');
        measure.style.cssText = `position:absolute;left:-99999px;top:0;width:${CONTENT_WIDTH_MM}mm;font-family:'Lora',Georgia,serif;font-size:11pt;line-height:1.75;padding:0;margin:0;box-sizing:border-box;`;
        document.body.appendChild(measure);

        const result = blocks.map(b => {
            const clone = b.cloneNode(true);
            measure.innerHTML = '';
            measure.appendChild(clone);
            return { node: b, heightPx: clone.offsetHeight };
        });

        document.body.removeChild(measure);
        return result;
    }

    function paginate(measured) {
        const chunks = [];
        let current = [];
        let height = 0;

        for (const item of measured) {
            if (item.heightPx > USABLE_CONTENT_PX) {
                if (current.length) { chunks.push(current); current = []; height = 0; }
                chunks.push([item.node]);
                continue;
            }
            if (height + item.heightPx > USABLE_CONTENT_PX && current.length) {
                chunks.push(current);
                current = [];
                height = 0;
            }
            current.push(item.node);
            height += item.heightPx;
        }
        if (current.length) chunks.push(current);
        if (!chunks.length) chunks.push([]);
        return chunks;
    }

    /* ─── BUILD CHAPTER PAGES ─── */
    function buildChapterPages(original, index, startPage) {
        const numEl = original.querySelector('.chapter-num');
        const titleEl = original.querySelector('.chapter-title');
        const yearEl = original.querySelector('.chapter-year');
        const bodyEl = original.querySelector('.chapter-body');

        const numText = numEl?.textContent.trim() || `Chapter ${index + 1}`;
        const titleText = titleEl?.textContent.trim() || '';
        const yearText = yearEl?.textContent.trim() || '';

        if (!bodyEl) return [];

        const { cleanBody, notes } = processFootnotes(bodyEl);
        const blocks = Array.from(cleanBody.children);
        const measured = measureBlocks(blocks);

        const notesSection = buildNotes(notes);
        if (notesSection) {
            const m = document.createElement('div');
            m.style.cssText = `position:absolute;left:-99999px;top:0;width:${CONTENT_WIDTH_MM}mm;font-family:'Lora',Georgia,serif;font-size:11pt;line-height:1.75;`;
            document.body.appendChild(m);
            m.appendChild(notesSection.cloneNode(true));
            measured.push({ node: notesSection, heightPx: m.firstChild.offsetHeight });
            document.body.removeChild(m);
        }

        const pages = paginate(measured);
        const result = [];

        pages.forEach((chunk, p) => {
            const isFirst = p === 0;
            const page = document.createElement('section');
            page.className = 'chapter';
            page.id = `pdf-chapter-${index + 1}${isFirst ? '' : `-p${startPage + p}`}`;

            page.innerHTML = `
                <div class="chapter-running-header">
                    <span>${escapeHtml(titleText)}</span>
                    <span>${escapeHtml(yearText)}</span>
                </div>
            `;

            if (isFirst) {
                const head = document.createElement('div');
                head.className = 'chapter-header';
                head.innerHTML = `
                    <p class="chapter-number">${escapeHtml(numText)}</p>
                    <h2 class="chapter-title">${escapeHtml(titleText)}</h2>
                    ${yearText ? `<p class="chapter-year">${escapeHtml(yearText)}</p>` : ''}
                    <div class="rule-ornamented"></div>
                `;
                page.appendChild(head);
            }

            const body = document.createElement('div');
            body.className = isFirst ? 'chapter-body' : 'chapter-body chapter-body-continued';
            chunk.forEach(b => body.appendChild(b.cloneNode(true)));
            page.appendChild(body);

            const pn = document.createElement('div');
            pn.className = 'chapter-page-number';
            pn.textContent = String(startPage + p);
            page.appendChild(pn);

            result.push(page);
        });

        return result;
    }

    /* ─── TOC ─── */
    function buildToc(chapters, startPages) {
        const list = document.getElementById('toc-list');
        if (!list) return;
        list.innerHTML = '';
        chapters.forEach((ch, i) => {
            const title = ch.querySelector('.chapter-title')?.textContent.trim() || `Chapter ${i + 1}`;
            const year = ch.querySelector('.chapter-year')?.textContent.trim() || '';
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="toc-num">Chapter ${i + 1}</span>
                <span class="toc-title">${escapeHtml(title)}</span>
                ${year ? `<span class="toc-year">${escapeHtml(year)}</span>` : ''}
                <span class="toc-page-num">${startPages[i]}</span>
            `;
            list.appendChild(li);
        });
    }

    /* ─── ESCAPE ─── */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ─── MAIN ─── */
    function run() {
        try {
            const container = document.getElementById('book-content');
            if (!container) throw new Error('#book-content missing');

            const chapters = Array.from(container.querySelectorAll('article.chapter'));

            /* Remove originals, we'll rebuild */
            chapters.forEach(c => c.remove());

            const startPages = {};
            let currentPage = FIRST_CHAPTER_PAGE;

            chapters.forEach((ch, i) => {
                startPages[i] = currentPage;
                const pages = buildChapterPages(ch, i, currentPage);
                pages.forEach(p => container.appendChild(p));
                currentPage += pages.length;
            });

            buildToc(chapters, startPages);

            setTimeout(revealBook, 400);
        } catch (err) {
            console.error('[print] FATAL', err);
            document.getElementById('loading').innerHTML =
                `<p style="color:#B91C1C;font-family:system-ui;">Error: ${err.message}</p>`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    /* Safety net */
    setTimeout(() => {
        const root = document.getElementById('book-root');
        if (root?.hidden) revealBook();
    }, 12000);

})();