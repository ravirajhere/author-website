/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — PRINT SCRIPT v6.2
   Only pagination. No reveal logic. Content is visible from HTML.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    console.warn('[print] v6.2 starting');

    var FIRST_CHAPTER_PAGE = 10;
    var PAGE_WIDTH_MM = 210;
    var PAGE_MARGIN_MM = 20;
    var MM_TO_PX = 3.7795;
    var CONTENT_WIDTH_MM = PAGE_WIDTH_MM - (PAGE_MARGIN_MM * 2);
    var USABLE_CONTENT_PX = Math.round(180 * MM_TO_PX);

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function processFootnotes(bodyEl) {
        var clone = bodyEl.cloneNode(true);
        var footnotes = Array.prototype.slice.call(clone.querySelectorAll('.footnote'));
        var notes = [];

        footnotes.forEach(function (fn) {
            var text = fn.getAttribute('data-note') || '';
            var original = fn.textContent.trim();

            if (!text) {
                if (fn.parentNode) {
                    fn.parentNode.replaceChild(document.createTextNode(original), fn);
                }
                return;
            }

            var num = notes.length + 1;
            var marker = document.createElement('sup');
            marker.className = 'footnote-marker';
            marker.textContent = num;

            var textNode = document.createTextNode(original);
            if (fn.parentNode) {
                fn.parentNode.replaceChild(textNode, fn);
                if (textNode.parentNode) {
                    textNode.parentNode.insertBefore(marker, textNode.nextSibling);
                }
            }

            notes.push({ num: num, text: text });
        });

        return { cleanBody: clone, notes: notes };
    }

    function buildNotes(notes) {
        if (!notes.length) return null;
        var section = document.createElement('section');
        section.className = 'chapter-notes';
        section.innerHTML = '<p class="chapter-notes-heading">Notes</p>';

        var ol = document.createElement('ol');
        ol.className = 'chapter-notes-list';

        notes.forEach(function (n) {
            var li = document.createElement('li');
            var numSpan = document.createElement('span');
            numSpan.className = 'chapter-notes-num';
            numSpan.textContent = n.num;
            var textSpan = document.createElement('span');
            textSpan.className = 'chapter-notes-text';
            textSpan.textContent = n.text;
            li.appendChild(numSpan);
            li.appendChild(textSpan);
            ol.appendChild(li);
        });

        section.appendChild(ol);
        return section;
    }

    function measureBlocks(blocks) {
        var measure = document.createElement('div');
        measure.style.cssText = 'position:absolute;left:-99999px;top:0;width:' +
            CONTENT_WIDTH_MM +
            'mm;font-family:Lora,Georgia,serif;font-size:11pt;line-height:1.75;padding:0;margin:0;box-sizing:border-box;';
        document.body.appendChild(measure);

        var result = blocks.map(function (b) {
            var clone = b.cloneNode(true);
            measure.innerHTML = '';
            measure.appendChild(clone);
            return { node: b, heightPx: clone.offsetHeight };
        });

        document.body.removeChild(measure);
        return result;
    }

    function paginate(measured) {
        var chunks = [];
        var current = [];
        var height = 0;

        for (var i = 0; i < measured.length; i++) {
            var item = measured[i];
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

    function buildChapterPages(original, index, startPage) {
        var numEl = original.querySelector('.chapter-num');
        var titleEl = original.querySelector('.chapter-title');
        var yearEl = original.querySelector('.chapter-year');
        var bodyEl = original.querySelector('.chapter-body');

        var numText = numEl ? numEl.textContent.trim() : ('Chapter ' + (index + 1));
        var titleText = titleEl ? titleEl.textContent.trim() : '';
        var yearText = yearEl ? yearEl.textContent.trim() : '';

        if (!bodyEl) return [];

        var processed = processFootnotes(bodyEl);
        var cleanBody = processed.cleanBody;
        var notes = processed.notes;

        var blocks = Array.prototype.slice.call(cleanBody.children);
        var measured = measureBlocks(blocks);

        var notesSection = buildNotes(notes);
        if (notesSection) {
            var m = document.createElement('div');
            m.style.cssText = 'position:absolute;left:-99999px;top:0;width:' +
                CONTENT_WIDTH_MM + 'mm;font-family:Lora,Georgia,serif;font-size:11pt;line-height:1.75;';
            document.body.appendChild(m);
            m.appendChild(notesSection.cloneNode(true));
            measured.push({ node: notesSection, heightPx: m.firstChild.offsetHeight });
            document.body.removeChild(m);
        }

        var pages = paginate(measured);
        var result = [];

        for (var p = 0; p < pages.length; p++) {
            var isFirst = p === 0;
            var page = document.createElement('section');
            page.className = 'chapter';
            page.id = 'pdf-chapter-' + (index + 1) + (isFirst ? '' : '-p' + (startPage + p));

            var runningHeader = document.createElement('div');
            runningHeader.className = 'chapter-running-header';
            runningHeader.innerHTML = '<span>' + escapeHtml(titleText) + '</span><span>' + escapeHtml(yearText) + '</span>';
            page.appendChild(runningHeader);

            if (isFirst) {
                var head = document.createElement('div');
                head.className = 'chapter-header';
                head.innerHTML =
                    '<p class="chapter-number">' + escapeHtml(numText) + '</p>' +
                    '<h2 class="chapter-title">' + escapeHtml(titleText) + '</h2>' +
                    (yearText ? '<p class="chapter-year">' + escapeHtml(yearText) + '</p>' : '') +
                    '<div class="rule-ornamented" aria-hidden="true"></div>';
                page.appendChild(head);
            }

            var body = document.createElement('div');
            body.className = isFirst ? 'chapter-body' : 'chapter-body chapter-body-continued';
            pages[p].forEach(function (b) {
                body.appendChild(b.cloneNode(true));
            });
            page.appendChild(body);

            var pn = document.createElement('div');
            pn.className = 'chapter-page-number';
            pn.textContent = String(startPage + p);
            page.appendChild(pn);

            result.push(page);
        }

        return result;
    }

    function buildToc(chapters, startPages) {
        var list = document.getElementById('toc-list');
        if (!list) return;
        list.innerHTML = '';

        for (var i = 0; i < chapters.length; i++) {
            var title = chapters[i].querySelector('.chapter-title');
            var year = chapters[i].querySelector('.chapter-year');
            var titleText = title ? title.textContent.trim() : ('Chapter ' + (i + 1));
            var yearText = year ? year.textContent.trim() : '';

            var li = document.createElement('li');
            li.innerHTML =
                '<span class="toc-num">Chapter ' + (i + 1) + '</span>' +
                '<span class="toc-title">' + escapeHtml(titleText) + '</span>' +
                (yearText ? '<span class="toc-year">' + escapeHtml(yearText) + '</span>' : '') +
                '<span class="toc-page-num">' + startPages[i] + '</span>';
            list.appendChild(li);
        }
    }

    function run() {
        try {
            var container = document.getElementById('book-content');
            if (!container) {
                console.warn('[print] #book-content missing');
                document.body.classList.add('paginated');
                return;
            }

            var chapters = Array.prototype.slice.call(container.querySelectorAll('article.chapter'));
            console.warn('[print] found ' + chapters.length + ' chapters');

            if (chapters.length === 0) {
                document.body.classList.add('paginated');
                return;
            }

            chapters.forEach(function (c) { c.remove(); });

            var startPages = {};
            var currentPage = FIRST_CHAPTER_PAGE;

            for (var i = 0; i < chapters.length; i++) {
                startPages[i] = currentPage;
                var pages = buildChapterPages(chapters[i], i, currentPage);
                pages.forEach(function (p) { container.appendChild(p); });
                currentPage += pages.length;
            }

            buildToc(chapters, startPages);

            console.warn('[print] pagination complete');
            document.body.classList.add('paginated');
        } catch (err) {
            console.error('[print] error:', err.message);
            document.body.classList.add('paginated');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    /* Safety: mark paginated no matter what after 6s */
    setTimeout(function () {
        if (!document.body.classList.contains('paginated')) {
            console.warn('[print] safety timeout — marking paginated');
            document.body.classList.add('paginated');
        }
    }, 6000);

})();