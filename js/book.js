/* ==========================================================================
   RAVI RAJ SINGH — BOOK READER SCRIPT
   Version: 1.4 — Download buttons removed (server-side PDF via GitHub Actions)
   Handles: Header state · Sidebar drawer · Language switch
            Chapter navigation · Reading progress · Hash sync
            Footnotes · Keyboard nav · External links · Console greeting
   No dependencies. No frameworks.
   ========================================================================== */

(function () {
    'use strict';

    /* ======================================================================
       1. HELPERS
       ====================================================================== */
    const $  = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => Array.prototype.slice.call(
        (ctx || document).querySelectorAll(sel)
    );

    const prefersReduced = (function () {
        try {
            return window.matchMedia &&
                   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    })();

    const FOCUSABLE = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function sessionGet(key) {
        try { return sessionStorage.getItem(key); }
        catch (e) { return null; }
    }
    function sessionSet(key, value) {
        try { sessionStorage.setItem(key, value); return true; }
        catch (e) { return false; }
    }

    const TOTAL_CHAPTERS = 18;

    /* ======================================================================
       2. STATE
       ====================================================================== */
    const state = {
        currentLang: 'en',
        currentChapter: '1'
    };

    /* ======================================================================
       3. ELEMENT REFERENCES
       ====================================================================== */
    const header       = $('#siteHeader');
    const sidebar      = $('#sidebar');
    const sidebarOverlay = $('#sidebarOverlay');
    const sidebarClose = $('#sidebarClose');
    const menuBtn      = $('#menuBtn');

    const chaptersEn   = $('#chaptersEn');
    const chaptersHi   = $('#chaptersHi');

    const tocLinks     = $$('#toc a[data-chapter]');
    const langBtns     = $$('.lang-btn');

    const progressFill    = $('#progressFill');
    const progressPercent = $('#progressPercent');
    const progressBar     = $('.progress-bar');

    const yearEl       = $('#year');

    /* ======================================================================
       4. YEAR IN FOOTER (safe — may not exist)
       ====================================================================== */
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    /* ======================================================================
       5. HEADER — subtle shadow on scroll
       ====================================================================== */
    (function initHeader() {
        if (!header) return;

        let ticking = false;

        function update() {
            const scrolled = window.scrollY > 8;
            header.classList.toggle('is-scrolled', scrolled);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        update();
    })();

    /* ======================================================================
       6. FOCUS TRAP (for mobile sidebar)
       ====================================================================== */
    let activeTrap = null;

    function handleTrapKey(e) {
        if (e.key !== 'Tab' || !activeTrap) return;

        const focusables = $$(FOCUSABLE, activeTrap).filter(function (el) {
            return el.offsetParent !== null || el === document.activeElement;
        });
        if (!focusables.length) return;

        const first = focusables[0];
        const last  = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function handleGlobalEscape(e) {
        if (e.key !== 'Escape') return;

        if (isMobile() && sidebar && sidebar.dataset.open === 'true') {
            closeSidebar();
        }

        if (typeof window.closeFootnoteSheet === 'function') {
            window.closeFootnoteSheet();
        }
    }

    function trapFocus(container) {
        releaseFocus();
        activeTrap = container;
        container.addEventListener('keydown', handleTrapKey);
        document.addEventListener('keydown', handleGlobalEscape);
    }

    function releaseFocus() {
        if (activeTrap) {
            activeTrap.removeEventListener('keydown', handleTrapKey);
            activeTrap = null;
        }
        document.removeEventListener('keydown', handleGlobalEscape);
    }

    function isMobile() {
        try {
            return window.matchMedia('(max-width: 860px)').matches;
        } catch (e) {
            return window.innerWidth <= 860;
        }
    }

    /* ======================================================================
       7. SIDEBAR (mobile drawer)
       ====================================================================== */
    let lastFocusedSidebar = null;

    function openSidebar() {
        if (!sidebar || !sidebarOverlay) return;

        lastFocusedSidebar = document.activeElement;

        sidebarOverlay.hidden = false;

        /* Force reflow so transition applies */
        void sidebar.offsetHeight;

        sidebar.dataset.open = 'true';
        sidebarOverlay.dataset.open = 'true';

        document.body.style.overflow = 'hidden';

        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
        sidebar.setAttribute('aria-hidden', 'false');
        sidebarOverlay.setAttribute('aria-hidden', 'false');

        setTimeout(function () {
            const focusable = $('a, button', sidebar);
            if (focusable && typeof focusable.focus === 'function') {
                try { focusable.focus(); } catch (e) {}
            }
        }, 100);

        trapFocus(sidebar);
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay) return;

        sidebar.dataset.open = 'false';
        sidebarOverlay.dataset.open = 'false';

        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'true');
        sidebarOverlay.setAttribute('aria-hidden', 'true');

        document.body.style.overflow = '';

        setTimeout(function () {
            if (sidebar.dataset.open !== 'true') {
                sidebarOverlay.hidden = true;
            }
        }, 500);

        releaseFocus();

        if (lastFocusedSidebar && typeof lastFocusedSidebar.focus === 'function') {
            try { lastFocusedSidebar.focus(); } catch (e) {}
        }
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', function () {
            const isOpen = sidebar && sidebar.dataset.open === 'true';
            if (isOpen) closeSidebar();
            else openSidebar();
        });
    }

    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    /* Auto-close sidebar on desktop resize */
    (function initResizeWatcher() {
        let resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (!isMobile() && sidebar && sidebar.dataset.open === 'true') {
                    closeSidebar();
                }
            }, 150);
        }, { passive: true });
    })();

    /* ======================================================================
       8. LANGUAGE SWITCH
       ====================================================================== */
    function setLang(lang) {
        if (lang !== 'en' && lang !== 'hi') return;
        if (state.currentLang === lang) return;

        state.currentLang = lang;

        /* Update buttons */
        langBtns.forEach(function (btn) {
            const isActive = btn.dataset.lang === lang;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        /* Toggle containers */
        if (chaptersEn) chaptersEn.hidden = (lang !== 'en');
        if (chaptersHi) chaptersHi.hidden = (lang !== 'hi');

        /* Re-apply chapter visibility within new language */
        applyChapterVisibility(state.currentChapter);

        /* Update hash to match new language */
        const newId = 'chapter-' + state.currentChapter + (lang === 'hi' ? '-hi' : '');
        if (history.replaceState) {
            try { history.replaceState(null, '', '#' + newId); } catch (e) {}
        }

        /* Persist */
        try { localStorage.setItem('book-lang', lang); } catch (e) {}

        /* Update progress & TOC active state */
        updateProgress(state.currentChapter);
        highlightToc(state.currentChapter);
    }

    langBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            setLang(btn.dataset.lang);
        });
    });

    /* Restore language from storage */
    (function restoreLang() {
        let saved = null;
        try { saved = localStorage.getItem('book-lang'); } catch (e) {}
        if (saved === 'en' || saved === 'hi') {
            state.currentLang = saved;
        }
        /* Apply initial language without early-return guard */
        const initial = state.currentLang;
        state.currentLang = null;
        setLang(initial);
    })();

    /* ======================================================================
       9. CHAPTER VISIBILITY (hide all except current)
       ====================================================================== */
    function applyChapterVisibility(chapterId) {
        const container = state.currentLang === 'hi' ? chaptersHi : chaptersEn;
        if (!container) return;

        const allChapters = $$('.chapter', container);
        allChapters.forEach(function (ch) {
            const match = ch.dataset.chapter === String(chapterId);
            ch.hidden = !match;
        });
    }

    /* ======================================================================
       10. CHAPTER NAVIGATION
       ====================================================================== */
    function goToChapter(chapterId, opts) {
        opts = opts || {};
        const id = String(chapterId);

        if (!/^\d+$/.test(id)) return;
        const n = parseInt(id, 10);
        if (n < 1 || n > TOTAL_CHAPTERS) return;

        state.currentChapter = id;

        /* If on mobile, close sidebar */
        if (isMobile() && sidebar && sidebar.dataset.open === 'true') {
            closeSidebar();
        }

        /* Set visibility */
        applyChapterVisibility(id);

        /* Update UI */
        highlightToc(id);
        updateProgress(id);

        /* Update hash without triggering scroll jump */
        const newId = 'chapter-' + id + (state.currentLang === 'hi' ? '-hi' : '');
        if (history.replaceState) {
            try { history.replaceState(null, '', '#' + newId); } catch (e) {}
        }

        /* Persist */
        try { localStorage.setItem('book-chapter', id); } catch (e) {}

        /* Scroll to chapter heading (not page top) */
        if (opts.scroll !== false) {
            scrollToChapterHeading(id);
        }
    }

    function scrollToChapterHeading(chapterId) {
        const container = state.currentLang === 'hi' ? chaptersHi : chaptersEn;
        if (!container) {
            window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
            return;
        }

        const chapterEl = container.querySelector('.chapter[data-chapter="' + chapterId + '"]');
        if (!chapterEl) {
            window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
            return;
        }

        /* Scroll to chapter number (top of chapter) */
        const target = chapterEl.querySelector('.chapter-num')
                    || chapterEl.querySelector('.chapter-head')
                    || chapterEl;

        const headerOffset = header ? header.offsetHeight : 0;
        const buffer = 20; /* breathing room below sticky header */

        const rect = target.getBoundingClientRect();
        const currentY = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = Math.max(0, rect.top + currentY - headerOffset - buffer);

        window.scrollTo({
            top: targetY,
            behavior: prefersReduced ? 'auto' : 'smooth'
        });
    }

    function highlightToc(chapterId) {
        tocLinks.forEach(function (link) {
            const match = link.dataset.chapter === String(chapterId);
            link.classList.toggle('is-active', match);
            if (match) {
                link.setAttribute('aria-current', 'true');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    /* --- TOC clicks --- */
    tocLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const id = link.dataset.chapter;
            if (id) goToChapter(id);
        });
    });

    /* --- Prev/Next buttons (event delegation, works across both languages) --- */
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.nav-btn');
        if (!btn) return;
        if (btn.classList.contains('is-disabled')) return;

        const href = btn.getAttribute('href');
        if (href && href.indexOf('#') === 0) {
            e.preventDefault();
            /* Extract chapter number from id */
            const match = href.match(/#chapter-(\d+)/);
            if (match && match[1]) {
                goToChapter(match[1]);
            }
        }
    });

    /* --- Keyboard arrows (left/right) --- */
    document.addEventListener('keydown', function (e) {
        /* Skip if user is typing */
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        /* Skip if sidebar open on mobile */
        if (isMobile() && sidebar && sidebar.dataset.open === 'true') return;

        if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
            const next = Math.min(TOTAL_CHAPTERS, parseInt(state.currentChapter, 10) + 1);
            if (next !== parseInt(state.currentChapter, 10)) {
                e.preventDefault();
                goToChapter(String(next));
            }
        } else if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
            const prev = Math.max(1, parseInt(state.currentChapter, 10) - 1);
            if (prev !== parseInt(state.currentChapter, 10)) {
                e.preventDefault();
                goToChapter(String(prev));
            }
        }
    });

    /* ======================================================================
       11. READING PROGRESS
       ====================================================================== */
    function updateProgress(chapterId) {
        const n = parseInt(chapterId, 10);
        if (isNaN(n) || n < 1 || n > TOTAL_CHAPTERS) return;

        const pct = Math.round((n / TOTAL_CHAPTERS) * 100);

        if (progressFill) {
            progressFill.style.width = pct + '%';
        }
        if (progressPercent) {
            progressPercent.textContent = pct + '%';
        }
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', String(pct));
        }
    }

    /* ======================================================================
       12. RESTORE STATE FROM STORAGE / HASH
       ====================================================================== */
    function restoreChapter() {
        /* Priority 1: hash */
        let chapterId = null;
        const hashMatch = (window.location.hash || '').match(/#chapter-(\d+)/);
        if (hashMatch && hashMatch[1]) {
            chapterId = hashMatch[1];
        }

        /* Priority 2: localStorage */
        if (!chapterId) {
            try {
                const saved = localStorage.getItem('book-chapter');
                if (saved && /^\d+$/.test(saved)) {
                    chapterId = saved;
                }
            } catch (e) {}
        }

        /* Default */
        if (!chapterId) chapterId = '1';

        /* Validate */
        const n = parseInt(chapterId, 10);
        if (isNaN(n) || n < 1 || n > TOTAL_CHAPTERS) {
            chapterId = '1';
        }

        state.currentChapter = chapterId;
        applyChapterVisibility(chapterId);
        highlightToc(chapterId);
        updateProgress(chapterId);
    }

    /* React to browser back/forward */
    window.addEventListener('hashchange', function () {
        const match = (window.location.hash || '').match(/#chapter-(\d+)/);
        if (match && match[1]) {
            const id = match[1];
            if (id !== state.currentChapter) {
                state.currentChapter = id;
                applyChapterVisibility(id);
                highlightToc(id);
                updateProgress(id);
            }
        }
    });

    /* ======================================================================
       13. FOOTNOTES — desktop tooltip + mobile bottom sheet
       ====================================================================== */
    (function initFootnotes() {
        const footnotes = $$('.footnote');
        if (!footnotes.length) return;

        /* Create tooltip (desktop) */
        let tooltip = document.querySelector('.footnote-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'footnote-tooltip';
            tooltip.setAttribute('role', 'tooltip');
            document.body.appendChild(tooltip);
        }

        /* Create sheet (mobile) */
        let sheet = document.querySelector('.footnote-sheet');
        let overlay = document.querySelector('.footnote-sheet-overlay');

        if (!sheet) {
            overlay = document.createElement('div');
            overlay.className = 'footnote-sheet-overlay';
            document.body.appendChild(overlay);

            sheet = document.createElement('div');
            sheet.className = 'footnote-sheet';
            sheet.setAttribute('role', 'dialog');
            sheet.setAttribute('aria-modal', 'true');
            sheet.innerHTML =
                '<div class="footnote-sheet-header">' +
                    '<p class="footnote-sheet-label" id="footnoteSheetLabel"></p>' +
                    '<button type="button" class="footnote-sheet-close" id="footnoteSheetClose" aria-label="Close">✕</button>' +
                '</div>' +
                '<p class="footnote-sheet-text" id="footnoteSheetText"></p>';
            document.body.appendChild(sheet);

            overlay.addEventListener('click', closeFootnoteSheet);
            const closeBtn = sheet.querySelector('#footnoteSheetClose');
            if (closeBtn) closeBtn.addEventListener('click', closeFootnoteSheet);
        }

        function closeFootnoteSheet() {
            if (sheet) sheet.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }

        /* Expose for global escape handler */
        window.closeFootnoteSheet = closeFootnoteSheet;

        function showTooltipAt(el) {
            const note = el.dataset.note;
            if (!note) return;

            tooltip.textContent = note;
            tooltip.classList.add('visible');

            /* Wait for layout before measuring */
            requestAnimationFrame(function () {
                const rect = el.getBoundingClientRect();
                const tr = tooltip.getBoundingClientRect();

                let left = rect.left + (rect.width / 2) - (tr.width / 2);
                let top = rect.top - tr.height - 10;

                if (left < 10) left = 10;
                if (left + tr.width > window.innerWidth - 10) {
                    left = window.innerWidth - tr.width - 10;
                }
                if (top < 10) {
                    top = rect.bottom + 10;
                }

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });
        }

        function hideTooltip() {
            tooltip.classList.remove('visible');
        }

        /* Hover (desktop) */
        document.addEventListener('mouseover', function (e) {
            const el = e.target.closest('.footnote');
            if (!el || isMobile()) return;
            showTooltipAt(el);
        });

        document.addEventListener('mouseout', function (e) {
            const el = e.target.closest('.footnote');
            if (!el || isMobile()) return;
            hideTooltip();
        });

        /* Click / tap */
        document.addEventListener('click', function (e) {
            const el = e.target.closest('.footnote');
            if (!el) return;

            const note = el.dataset.note;
            if (!note) return;

            e.preventDefault();

            if (isMobile()) {
                const label = el.textContent.trim();
                const labelEl = sheet.querySelector('#footnoteSheetLabel');
                const textEl = sheet.querySelector('#footnoteSheetText');
                if (labelEl) labelEl.textContent = label;
                if (textEl) textEl.textContent = note;
                sheet.classList.add('active');
                if (overlay) overlay.classList.add('active');
            } else {
                showTooltipAt(el);
                clearTimeout(window._footnoteTimeout);
                window._footnoteTimeout = setTimeout(hideTooltip, 4000);
            }
        });

        /* Keyboard access */
        footnotes.forEach(function (el) {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const el = document.activeElement;
            if (!el || !el.classList.contains('footnote')) return;
            e.preventDefault();
            el.click();
        });
    })();

    /* ======================================================================
       14. EXTERNAL LINKS SECURITY
       ====================================================================== */
    $$('a[target="_blank"]').forEach(function (link) {
        const rel = link.getAttribute('rel') || '';
        if (rel.indexOf('noopener') === -1) {
            link.setAttribute('rel', (rel + ' noopener noreferrer').trim());
        }
    });

    /* ======================================================================
       15. RUNNING HEADER VERIFICATION
       ====================================================================== */
    (function verifyRunningHeaders() {
        const containers = [chaptersEn, chaptersHi].filter(Boolean);
        let missing = 0;

        containers.forEach(function (container) {
            const chapters = $$('.chapter', container);
            chapters.forEach(function (ch) {
                const rh = ch.querySelector('.chapter-running-header');
                if (!rh) {
                    missing++;
                    console.warn(
                        '[book.js] Missing .chapter-running-header in',
                        'chapter', ch.dataset.chapter,
                        'lang', container.id
                    );
                }
            });
        });

        if (missing === 0) {
            console.log('[book.js] ✅ All chapters have running headers');
        }
    })();

    /* ======================================================================
       16. CONSOLE GREETING (once per session)
       ====================================================================== */
    (function greet() {
        const hasGreeted = sessionGet('rrs-book-greeted');
        if (hasGreeted) return;

        const accent = 'color:#8B6F3F;font-weight:600;';
        const soft   = 'color:#7A7068;';

        try {
            console.log('%c"A Boy Who Never Thought"', 'font-size:14px;font-weight:700;' + accent);
            console.log('%c18 chapters · English & Hinglish', 'font-size:12px;' + soft);
            console.log('%c← → to navigate · Back to author: /author.html', 'font-size:12px;' + soft);

            sessionSet('rrs-book-greeted', '1');
        } catch (e) {}
    })();

    /* ======================================================================
       17. INIT
       ====================================================================== */
    function init() {
        const safe = function (name, fn) {
            try { fn(); }
            catch (e) { console.warn('[book.js] ' + name + ' failed:', e); }
        };

        safe('restoreChapter', restoreChapter);
        safe('highlightToc',  function () { highlightToc(state.currentChapter); });
        safe('updateProgress', function () { updateProgress(state.currentChapter); });

        document.body.classList.add('js-ready');

        try {
            console.log('✅ book.js v1.4 loaded');
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
