/* ==========================================================================
   RAVI RAJ SINGH — PRINT SCRIPT
   Version: 5.1 — Vintage old book + Footnotes + Multi-page + Dynamic sizing
   Companion: print.html · print.css · book.html
   ========================================================================== */

(function () {
    'use strict';

    console.log('[print] v5.1 starting');

    /* ======================================================================
       1. CONFIG
       ====================================================================== */
    var LANG = 'en';
    try {
        var params = new URLSearchParams(window.location.search);
        var l = params.get('lang');
        if (l === 'hi') LANG = 'hi';
    } catch (e) {}

    /* Set HTML lang attribute */
    try {
        document.documentElement.lang = LANG === 'hi' ? 'hi' : 'en';
    } catch (e) {}

    var CHAPTERS_ID = LANG === 'hi' ? 'chaptersHi' : 'chaptersEn';
    var FIRST_CHAPTER_PAGE = 10;
    var TOTAL_CHAPTERS = 18;

    /* Page geometry — derived from print.css values */
    var PAGE_WIDTH_MM = 210;
    var PAGE_HEIGHT_MM = 297;
    var PAGE_MARGIN_MM = 20;
    var RUNNING_HEADER_MM = 14;
    var MM_TO_PX = 3.7795;

    /* Usable content width inside .chapter (after padding) */
    var CONTENT_WIDTH_MM = PAGE_WIDTH_MM - (PAGE_MARGIN_MM * 2);
    var CONTENT_WIDTH_PX = Math.round(CONTENT_WIDTH_MM * MM_TO_PX);

    /* Usable content height per page (for measurement) */
    /* .chapter height = 297mm, padding top/bottom = 40mm, running header ~14mm */
    /* Total usable = 297 - 40 - 14 = 243mm */
    var USABLE_CONTENT_PX = Math.round(243 * MM_TO_PX);

    /* ======================================================================
       2. IMMEDIATE UI FEEDBACK
       ====================================================================== */
    function setStatus(msg) {
        var loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = '<p style="font-family:system-ui;color:#6F6558;font-size:13px;">' + msg + '</p>';
        }
        console.log('[print] status:', msg);
    }

    function revealBook(err) {
        console.log('[print] REVEAL called, error:', err);

        var loadingEl = document.getElementById('loading');
        var rootEl = document.getElementById('book-root');

        if (loadingEl) {
            loadingEl.hidden = true;
            loadingEl.style.display = 'none';
        }
        if (rootEl) {
            rootEl.hidden = false;
            rootEl.style.display = '';
            rootEl.classList.add('ready');
        }
        document.body.classList.add('print-ready');

        console.log('[print] REVEAL done');
    }

    function showFatalError(msg) {
        var loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML =
                '<div style="max-width:500px;margin:40px auto;padding:20px;font-family:system-ui;">' +
                    '<h2 style="color:#B91C1C;font-size:16px;margin:0 0 8px;">Error</h2>' +
                    '<pre style="background:#F5F0E5;padding:12px;border-radius:4px;font-size:11px;white-space:pre-wrap;word-break:break-word;">' +
                        String(msg).replace(/</g, '&lt;') +
                    '</pre>' +
                '</div>';
        }
    }

    /* ======================================================================
       3. FETCH WITH TIMEOUT
       ====================================================================== */
    function fetchTimeout(url, ms) {
        return new Promise(function (resolve, reject) {
            var controller = new AbortController();
            var timer = setTimeout(function () {
                controller.abort();
                reject(new Error('Timeout: ' + url));
            }, ms);

            fetch(url, { signal: controller.signal, cache: 'no-store' })
                .then(function (res) {
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch(function (err) {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    /* ======================================================================
       4. FETCH book.html
       ====================================================================== */
    function fetchBook() {
        var urls = ['/book.html', '/book', 'book.html'];
        var errors = [];

        function tryNext(i) {
            if (i >= urls.length) {
                return Promise.reject(new Error('All URLs failed:\n' + errors.join('\n')));
            }

            var url = urls[i];
            setStatus('Loading ' + url + '…');

            return fetchTimeout(url, 10000)
                .then(function (res) {
                    if (!res.ok) {
                        errors.push(url + ' → HTTP ' + res.status);
                        return tryNext(i + 1);
                    }
                    return res.text();
                })
                .then(function (text) {
                    if (!text || text.length < 500) {
                        errors.push(url + ' → too short');
                        return tryNext(i + 1);
                    }
                    if (text.indexOf('chaptersEn') === -1 && text.indexOf('chaptersHi') === -1) {
                        errors.push(url + ' → no chapters marker');
                        return tryNext(i + 1);
                    }
                    console.log('[print] fetched', url, text.length, 'chars');
                    return text;
                })
                .catch(function (err) {
                    errors.push(url + ' → ' + err.message);
                    return tryNext(i + 1);
                });
        }

        return tryNext(0);
    }

    /* ======================================================================
       5. EXTRACT CHAPTERS
       ====================================================================== */
    function extractChapters(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var container = doc.querySelector('#' + CHAPTERS_ID);

        if (!container) {
            throw new Error('#' + CHAPTERS_ID + ' not found');
        }

        var chapters = Array.prototype.slice.call(
            container.querySelectorAll('article.chapter')
        );

        if (chapters.length === 0) {
            throw new Error('No chapters in #' + CHAPTERS_ID);
        }

        console.log('[print] extracted', chapters.length, 'chapters');
        return chapters;
    }

    /* ======================================================================
       6. ESCAPE HTML
       ====================================================================== */
    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ======================================================================
       7. FOOTNOTE PROCESSING
       Extracts footnotes from a chapter body, replaces <span class="footnote">
       with superscript markers, returns { cleanBody, notesList }
       ====================================================================== */
    function processFootnotes(bodyEl) {
        var clone = bodyEl.cloneNode(true);
        var footnotes = Array.prototype.slice.call(clone.querySelectorAll('.footnote'));
        var notesList = [];

        footnotes.forEach(function (fn) {
            var noteText = fn.getAttribute('data-note') || '';
            var originalText = fn.textContent.trim();

            /* No note — unwrap the span into plain text */
            if (!noteText) {
                if (fn.parentNode) {
                    var plainText = document.createTextNode(originalText);
                    fn.parentNode.replaceChild(plainText, fn);
                }
                return;
            }

            var num = notesList.length + 1;

            /* Build superscript marker */
            var marker = document.createElement('sup');
            marker.className = 'footnote-marker';
            marker.textContent = num;
            marker.setAttribute('aria-label', 'Footnote ' + num);

            /* Replace footnote span with plain text + marker */
            var textNode = document.createTextNode(originalText);
            if (fn.parentNode) {
                fn.parentNode.replaceChild(textNode, fn);
                /* Insert marker AFTER text node */
                if (textNode.parentNode) {
                    textNode.parentNode.insertBefore(marker, textNode.nextSibling);
                }
            }

            /* Store note */
            notesList.push({
                num: num,
                text: noteText
            });
        });

        return { cleanBody: clone, notesList: notesList };
    }

    /* ======================================================================
       8. BUILD CHAPTER-END NOTES
       ====================================================================== */
    function buildChapterEndNotes(notesList) {
        if (!notesList || notesList.length === 0) return null;

        var section = document.createElement('section');
        section.className = 'chapter-notes';

        var heading = document.createElement('p');
        heading.className = 'chapter-notes-heading';
        heading.textContent = 'Notes';
        section.appendChild(heading);

        var list = document.createElement('ol');
        list.className = 'chapter-notes-list';

        notesList.forEach(function (note) {
            var li = document.createElement('li');

            var numSpan = document.createElement('span');
            numSpan.className = 'chapter-notes-num';
            numSpan.textContent = note.num;

            var textSpan = document.createElement('span');
            textSpan.className = 'chapter-notes-text';
            textSpan.textContent = note.text;

            li.appendChild(numSpan);
            li.appendChild(textSpan);
            list.appendChild(li);
        });

        section.appendChild(list);
        return section;
    }

    /* ======================================================================
       9. MEASURE BLOCKS (for pagination)
       ====================================================================== */
    function measureBlocks(blocks) {
        var measureDiv = document.createElement('div');
        measureDiv.style.cssText = [
            'position:absolute',
            'left:-99999px',
            'top:0',
            'width:' + CONTENT_WIDTH_MM + 'mm',
            'background:#FBF8F1',
            'box-sizing:border-box',
            'font-family:\'Lora\', Georgia, serif',
            'font-size:11pt',
            'line-height:1.75',
            'padding:0',
            'margin:0'
        ].join(';');
        document.body.appendChild(measureDiv);

        var measured = [];

        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            var clone = block.cloneNode(true);
            measureDiv.innerHTML = '';
            measureDiv.appendChild(clone);

            var heightPx = clone.offsetHeight;
            measured.push({
                node: block,
                heightPx: heightPx
            });
        }

        document.body.removeChild(measureDiv);
        return measured;
    }

    /* ======================================================================
       10. PAGINATE BLOCKS
       ====================================================================== */
    function paginateBlocks(measured) {
        var chunks = [];
        var currentChunk = [];
        var currentHeight = 0;

        for (var i = 0; i < measured.length; i++) {
            var item = measured[i];
            var blockHeight = item.heightPx;

            /* If single block taller than a page — put it alone */
            if (blockHeight > USABLE_CONTENT_PX) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentHeight = 0;
                }
                chunks.push([item.node]);
                continue;
            }

            /* If adding this block exceeds page height — start new page */
            if (currentHeight + blockHeight > USABLE_CONTENT_PX && currentChunk.length > 0) {
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

    /* ======================================================================
       11. BUILD CHAPTER PAGES (multi-page)
       ====================================================================== */
    function buildChapterPages(original, index, startPageNum) {
        var allPages = [];

        var numEl = original.querySelector('.chapter-num');
        var titleEl = original.querySelector('.chapter-title');
        var yearEl = original.querySelector('.chapter-year');

        var numText = numEl ? numEl.textContent.trim() : 'Chapter ' + (index + 1);
        var titleText = titleEl ? titleEl.textContent.trim() : '';
        var yearText = yearEl ? yearEl.textContent.trim() : '';

        var bodyEl = original.querySelector('.chapter-body');

        if (!bodyEl) {
            var emptyPage = buildEmptyChapterPage({
                numText: numText,
                titleText: titleText,
                yearText: yearText,
                index: index,
                startPageNum: startPageNum
            });
            return [emptyPage];
        }

        var processed = processFootnotes(bodyEl);
        var cleanBody = processed.cleanBody;
        var notesList = processed.notesList;

        var blocks = Array.prototype.slice.call(cleanBody.children);

        var measured = measureBlocks(blocks);

        var notesSection = buildChapterEndNotes(notesList);
        if (notesSection) {
            var notesHeight = 0;
            var measureDiv = document.createElement('div');
            measureDiv.style.cssText = 'position:absolute;left:-99999px;top:0;width:' + CONTENT_WIDTH_MM + 'mm;background:#FBF8F1;box-sizing:border-box;font-family:\'Lora\',Georgia,serif;font-size:11pt;line-height:1.75;padding:0;margin:0;';
            document.body.appendChild(measureDiv);
            measureDiv.appendChild(notesSection.cloneNode(true));
            notesHeight = measureDiv.firstChild.offsetHeight;
            document.body.removeChild(measureDiv);

            measured.push({
                node: notesSection,
                heightPx: notesHeight,
                isNotes: true
            });
        }

        var pageChunks = paginateBlocks(measured);

        for (var p = 0; p < pageChunks.length; p++) {
            var isFirstPage = (p === 0);
            var page = buildChapterPage({
                numText: isFirstPage ? numText : '',
                titleText: isFirstPage ? titleText : '',
                yearText: isFirstPage ? yearText : '',
                displayNum: isFirstPage ? ((index === 10) ? '—' : String(index + 1)) : '',
                titleTextHeader: titleText,
                blocks: pageChunks[p],
                isFirstPage: isFirstPage,
                index: index,
                pageNum: startPageNum + p
            });
            allPages.push(page);
        }

        return allPages;
    }

    function buildChapterPage(opts) {
        var page = document.createElement('section');
        page.className = 'chapter';
        page.id = 'pdf-chapter-' + (opts.index + 1) + (opts.isFirstPage ? '' : '-p' + opts.pageNum);

        /* Running header */
        var runningHeader = document.createElement('div');
        runningHeader.className = 'chapter-running-header';
        runningHeader.innerHTML = '<span>Ravi Raj Singh</span><span>' + esc(opts.titleTextHeader) + '</span>';
        page.appendChild(runningHeader);

        /* Chapter header (only first page) — centered, no circle */
        if (opts.isFirstPage) {
            var headerBlock = document.createElement('div');
            headerBlock.className = 'chapter-header';
            headerBlock.innerHTML =
                '<p class="chapter-number">' + esc(opts.numText) + '</p>' +
                '<h2 class="chapter-title">' + esc(opts.titleText) + '</h2>' +
                (opts.yearText ? '<p class="chapter-year">' + esc(opts.yearText) + '</p>' : '') +
                '<div class="rule-ornamented" aria-hidden="true"></div>';
            page.appendChild(headerBlock);
        }

        /* Body */
        var bodyWrapper = document.createElement('div');
        bodyWrapper.className = 'chapter-body';
        for (var i = 0; i < opts.blocks.length; i++) {
            bodyWrapper.appendChild(opts.blocks[i].cloneNode(true));
        }
        page.appendChild(bodyWrapper);

        /* Page number */
        var pageNum = document.createElement('div');
        pageNum.className = 'chapter-page-number';
        pageNum.textContent = String(opts.pageNum);
        page.appendChild(pageNum);

        return page;
    }

    function buildEmptyChapterPage(opts) {
        var page = document.createElement('section');
        page.className = 'chapter';
        page.id = 'pdf-chapter-' + (opts.index + 1);

        var runningHeader = document.createElement('div');
        runningHeader.className = 'chapter-running-header';
        runningHeader.innerHTML = '<span>Ravi Raj Singh</span><span>' + esc(opts.titleText) + '</span>';
        page.appendChild(runningHeader);

        var headerBlock = document.createElement('div');
        headerBlock.className = 'chapter-header';
        headerBlock.innerHTML =
            '<p class="chapter-number">' + esc(opts.numText) + '</p>' +
            '<h2 class="chapter-title">' + esc(opts.titleText) + '</h2>' +
            (opts.yearText ? '<p class="chapter-year">' + esc(opts.yearText) + '</p>' : '') +
            '<div class="rule-ornamented" aria-hidden="true"></div>';
        page.appendChild(headerBlock);

        var pageNum = document.createElement('div');
        pageNum.className = 'chapter-page-number';
        pageNum.textContent = String(opts.startPageNum);
        page.appendChild(pageNum);

        return page;
    }

    /* ======================================================================
       12. BUILD TOC
       ====================================================================== */
    function buildTOC(chapters, chapterStartPages) {
        var tocList = document.getElementById('toc-list');
        if (!tocList) return;

        tocList.innerHTML = '';

        for (var i = 0; i < chapters.length; i++) {
            var chapterEl = chapters[i];
            var titleEl = chapterEl.querySelector('.chapter-title');
            var yearEl = chapterEl.querySelector('.chapter-year');

            var title = titleEl ? titleEl.textContent.trim() : 'Chapter ' + (i + 1);
            var year = yearEl ? yearEl.textContent.trim() : '';
            var label = 'Chapter ' + (i + 1);
            var pageNum = chapterStartPages ? (chapterStartPages[i] || FIRST_CHAPTER_PAGE + i) : (FIRST_CHAPTER_PAGE + i);

            var li = document.createElement('li');
            li.innerHTML =
                '<span class="toc-num">' + esc(label) + '</span>' +
                '<span class="toc-title">' + esc(title) + '</span>' +
                (year ? '<span class="toc-year">' + esc(year) + '</span>' : '') +
                '<span class="toc-page-num">' + pageNum + '</span>';
            tocList.appendChild(li);
        }

        console.log('[print] TOC built');
    }

    /* ======================================================================
       13. MAIN
       ====================================================================== */
    function run() {
        console.log('[print] run() called, lang:', LANG);

        setStatus('Loading book…');

        fetchBook()
            .then(function (html) {
                setStatus('Parsing…');
                var chapters = extractChapters(html);

                setStatus('Building pages…');
                var contentContainer = document.getElementById('book-content');
                if (!contentContainer) {
                    throw new Error('#book-content not found');
                }

                contentContainer.innerHTML = '';

                var startPageNum = FIRST_CHAPTER_PAGE;

                var chapterStartPages = {};
                var currentPageNum = startPageNum;

                for (var i = 0; i < chapters.length; i++) {
                    var chapterPages = buildChapterPages(chapters[i], i, currentPageNum);
                    chapterStartPages[i] = currentPageNum;

                    for (var j = 0; j < chapterPages.length; j++) {
                        contentContainer.appendChild(chapterPages[j]);
                    }
                    currentPageNum += chapterPages.length;
                }

                setStatus('Building TOC…');
                buildTOC(chapters, chapterStartPages);

                console.log('[print] all pages built');

                setTimeout(function () {
                    revealBook(null);
                }, 500);
            })
            .catch(function (err) {
                console.error('[print] FATAL:', err);
                showFatalError(err.message || 'Unknown error');
            });
    }

    /* ======================================================================
       14. INIT
       ====================================================================== */
    function init() {
        console.log('[print] init, readyState:', document.readyState);
        try {
            run();
        } catch (e) {
            console.error('[print] init threw:', e);
            showFatalError(e.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* Final safety net: after 15 seconds, force reveal */
    setTimeout(function () {
        var rootEl = document.getElementById('book-root');
        if (rootEl && rootEl.hidden) {
            console.warn('[print] 15s timeout — forcing reveal');
            revealBook('timeout');
        }
    }, 15000);

})();
