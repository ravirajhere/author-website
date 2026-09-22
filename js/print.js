/* ==========================================================================
   RAVI RAJ SINGH — PRINT SCRIPT v3
   Clean rewrite · no async traps · reveal always runs
   ========================================================================== */

(function () {
    'use strict';

    console.log('[print] v3 starting');

    // ============================================================
    // 1. CONFIG
    // ============================================================
    var LANG = 'en';
    try {
        var params = new URLSearchParams(window.location.search);
        var l = params.get('lang');
        if (l === 'hi') LANG = 'hi';
    } catch (e) {}

    var CHAPTERS_ID = LANG === 'hi' ? 'chaptersHi' : 'chaptersEn';
    var FIRST_CHAPTER_PAGE = 10;

    // ============================================================
    // 2. IMMEDIATE UI FEEDBACK
    // ============================================================
    function setStatus(msg) {
        var loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = '<p style="font-family:system-ui;color:#7A7068;font-size:13px;">' + msg + '</p>';
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
                    '<pre style="background:#F4F1EA;padding:12px;border-radius:4px;font-size:11px;white-space:pre-wrap;word-break:break-word;">' +
                        String(msg).replace(/</g, '&lt;') +
                    '</pre>' +
                '</div>';
        }
    }

    // ============================================================
    // 3. FETCH WITH TIMEOUT
    // ============================================================
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

    // ============================================================
    // 4. FETCH book.html
    // ============================================================
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

    // ============================================================
    // 5. EXTRACT CHAPTERS
    // ============================================================
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

    // ============================================================
    // 6. ESCAPE HTML
    // ============================================================
    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ============================================================
    // 7. BUILD CHAPTER PAGE
    // ============================================================
    function buildChapterPage(original, index, total) {
        var clone = original.cloneNode(true);

        // Remove interactive elements
        var removeSel = '.chapter-nav, .menu-btn, .back-link, .lang-switch, .chapter-rule';
        var removeEls = clone.querySelectorAll(removeSel);
        for (var r = 0; r < removeEls.length; r++) {
            removeEls[r].parentNode.removeChild(removeEls[r]);
        }

        // Extract metadata
        var numEl = clone.querySelector('.chapter-num');
        var titleEl = clone.querySelector('.chapter-title');
        var yearEl = clone.querySelector('.chapter-year');

        var numText = numEl ? numEl.textContent.trim() : 'Chapter ' + (index + 1);
        var titleText = titleEl ? titleEl.textContent.trim() : '';
        var yearText = yearEl ? yearEl.textContent.trim() : '';

        // Remove original head
        var head = clone.querySelector('.chapter-head');
        if (head && head.parentNode) head.parentNode.removeChild(head);

        // Extract body
        var bodyEl = clone.querySelector('.chapter-body');

        // Build new page
        var page = document.createElement('section');
        page.className = 'chapter';
        page.id = 'pdf-chapter-' + (index + 1);

        var runningHeader = document.createElement('div');
        runningHeader.className = 'chapter-running-header';
        runningHeader.innerHTML = '<span>Ravi Raj Singh</span><span>' + esc(titleText) + '</span>';
        page.appendChild(runningHeader);

        var headerBlock = document.createElement('div');
        headerBlock.className = 'chapter-header';
        var displayNum = (index === 10) ? '—' : String(index + 1);
        headerBlock.innerHTML =
            '<div class="chapter-number-circle"><span>' + displayNum + '</span></div>' +
            '<div class="chapter-header-text">' +
                '<p class="chapter-number">' + esc(numText) + '</p>' +
                '<h2 class="chapter-title">' + esc(titleText) + '</h2>' +
                (yearText ? '<p class="chapter-year">' + esc(yearText) + '</p>' : '') +
            '</div>';
        page.appendChild(headerBlock);

        if (bodyEl) {
            var bodyWrapper = document.createElement('div');
            bodyWrapper.className = 'chapter-body';
            while (bodyEl.firstChild) {
                bodyWrapper.appendChild(bodyEl.firstChild);
            }
            page.appendChild(bodyWrapper);
        }

        var pageNum = document.createElement('div');
        pageNum.className = 'chapter-page-number';
        pageNum.textContent = String(FIRST_CHAPTER_PAGE + index);
        page.appendChild(pageNum);

        return page;
    }

    // ============================================================
    // 8. BUILD TOC
    // ============================================================
    function buildTOC(chapters) {
        var tocList = document.getElementById('toc-list');
        if (!tocList) return;

        tocList.innerHTML = '';

        for (var i = 0; i < chapters.length; i++) {
            var chapterEl = chapters[i];
            var titleEl = chapterEl.querySelector('.chapter-title');
            var yearEl = chapterEl.querySelector('.chapter-year');

            var title = titleEl ? titleEl.textContent.trim() : 'Chapter ' + (i + 1);
            var year = yearEl ? yearEl.textContent.trim() : '';
            var label = (i === 10) ? 'Epilogue' : 'Chapter ' + (i + 1);
            var pageNum = FIRST_CHAPTER_PAGE + i;

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

    // ============================================================
    // 9. MAIN — SIMPLE, NO ASYNC TRAPS
    // ============================================================
    function run() {
        console.log('[print] run() called, lang:', LANG);

        setStatus('Loading book…');

        fetchBook()
            .then(function (html) {
                setStatus('Parsing…');
                var chapters = extractChapters(html);

                setStatus('Building TOC…');
                buildTOC(chapters);

                setStatus('Building pages…');
                var contentContainer = document.getElementById('book-content');
                if (!contentContainer) {
                    throw new Error('#book-content not found');
                }

                contentContainer.innerHTML = '';

                for (var i = 0; i < chapters.length; i++) {
                    var page = buildChapterPage(chapters[i], i, chapters.length);
                    contentContainer.appendChild(page);
                }

                console.log('[print] all pages built');

                // Small delay then reveal
                setTimeout(function () {
                    revealBook(null);
                }, 500);
            })
            .catch(function (err) {
                console.error('[print] FATAL:', err);
                showFatalError(err.message || 'Unknown error');
            });
    }

    // ============================================================
    // 10. INIT — MULTIPLE SAFETY NETS
    // ============================================================
    function init() {
        console.log('[print] init, readyState:', document.readyState);
        try {
            run();
        } catch (e) {
            console.error('[print] init threw:', e);
            showFatalError(e.message);
        }
    }

    // Fire on DOM ready OR immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Final safety net: after 15 seconds, force reveal
    setTimeout(function () {
        var rootEl = document.getElementById('book-root');
        if (rootEl && rootEl.hidden) {
            console.warn('[print] 15s timeout — forcing reveal');
            revealBook('timeout');
        }
    }, 15000);

})();
