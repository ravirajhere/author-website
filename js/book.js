/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — BOOK READER
   Sidebar · Lang switch · Chapter nav · Progress
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const $ = (s, c) => (c || document).querySelector(s);
    const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

    const TOTAL_CHAPTERS = parseInt($('[data-total-chapters]')?.dataset.totalChapters || '18', 10);

    const state = {
        lang: 'en',
        chapter: '1'
    };

    /* ─── ELEMENTS ─── */
    const sidebar = $('#sidebar');
    const sidebarOverlay = $('#sidebarOverlay');
    const sidebarClose = $('#sidebarClose');
    const menuBtn = $('#menuBtn');
    const tocLinks = $$('#toc a[data-chapter]');
    const langBtns = $$('.lang-btn');
    const progressFill = $('#progressFill');
    const progressPercent = $('#progressPercent');
    const progressBar = $('.progress-bar');
    const chaptersEn = $('#chaptersEn');
    const chaptersHi = $('#chaptersHi');

    const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

    /* ─── SIDEBAR DRAWER (mobile) ─── */
    function openSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebarOverlay.hidden = false;
        void sidebar.offsetHeight;
        sidebar.dataset.open = 'true';
        sidebarOverlay.dataset.open = 'true';
        menuBtn?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.dataset.open = 'false';
        sidebarOverlay.dataset.open = 'false';
        menuBtn?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (sidebar.dataset.open !== 'true') sidebarOverlay.hidden = true;
        }, 500);
    }

    menuBtn?.addEventListener('click', () => {
        const open = sidebar?.dataset.open === 'true';
        open ? closeSidebar() : openSidebar();
    });
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    /* ─── LANG SWITCH ─── */
    function setLang(lang) {
        if (lang !== 'en' && lang !== 'hi') return;
        if (state.lang === lang) return;
        state.lang = lang;

        langBtns.forEach(b => {
            const active = b.dataset.lang === lang;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        if (chaptersEn) chaptersEn.hidden = (lang !== 'en');
        if (chaptersHi) chaptersHi.hidden = (lang !== 'hi');

        applyChapterVisibility(state.chapter);

        try { localStorage.setItem('book-lang', lang); } catch (e) {}
    }

    langBtns.forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

    /* ─── CHAPTER VISIBILITY ─── */
    function applyChapterVisibility(id) {
        const container = state.lang === 'hi' ? chaptersHi : chaptersEn;
        if (!container) return;
        const chapters = $$('.chapter', container);
        chapters.forEach(ch => {
            ch.hidden = ch.dataset.chapter !== String(id);
        });
    }

    /* ─── NAVIGATE TO CHAPTER ─── */
    function goToChapter(id) {
        const n = parseInt(id, 10);
        if (isNaN(n) || n < 1 || n > TOTAL_CHAPTERS) return;

        state.chapter = String(id);
        applyChapterVisibility(id);

        tocLinks.forEach(l => {
            const active = l.dataset.chapter === String(id);
            l.classList.toggle('is-active', active);
            if (active) l.setAttribute('aria-current', 'true');
            else l.removeAttribute('aria-current');
        });

        updateProgress(id);

        const newHash = `#chapter-${id}${state.lang === 'hi' ? '-hi' : ''}`;
        try { history.replaceState(null, '', newHash); } catch (e) {}

        try { localStorage.setItem('book-chapter', id); } catch (e) {}

        if (isMobile() && sidebar?.dataset.open === 'true') closeSidebar();

        /* Scroll to chapter heading */
        const container = state.lang === 'hi' ? chaptersHi : chaptersEn;
        const el = container?.querySelector(`.chapter[data-chapter="${id}"]`);
        if (el) {
            const headerOffset = 80;
            const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }

    tocLinks.forEach(l => {
        l.addEventListener('click', e => {
            e.preventDefault();
            goToChapter(l.dataset.chapter);
        });
    });

    /* ─── PREV / NEXT (event delegation) ─── */
    document.addEventListener('click', e => {
        const btn = e.target.closest('.nav-btn');
        if (!btn || btn.classList.contains('is-disabled')) return;
        const href = btn.getAttribute('href');
        if (!href) return;
        const m = href.match(/#chapter-(\d+)/);
        if (m) {
            e.preventDefault();
            goToChapter(m[1]);
        }
    });

    /* ─── KEYBOARD NAV ─── */
    document.addEventListener('keydown', e => {
        const tag = (document.activeElement?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (isMobile() && sidebar?.dataset.open === 'true') return;

        const cur = parseInt(state.chapter, 10);
        if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
            const next = Math.min(TOTAL_CHAPTERS, cur + 1);
            if (next !== cur) { e.preventDefault(); goToChapter(String(next)); }
        } else if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
            const prev = Math.max(1, cur - 1);
            if (prev !== cur) { e.preventDefault(); goToChapter(String(prev)); }
        }
    });

    /* ─── PROGRESS ─── */
    function updateProgress(id) {
        const n = parseInt(id, 10);
        if (isNaN(n)) return;
        const pct = Math.round((n / TOTAL_CHAPTERS) * 100);
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressPercent) progressPercent.textContent = pct + '%';
        if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
    }

    /* ─── RESTORE STATE ─── */
    function restore() {
        let lang = null;
        try { lang = localStorage.getItem('book-lang'); } catch (e) {}
        if (lang === 'en' || lang === 'hi') state.lang = lang;
        else state.lang = 'en';

        let chapter = '1';
        const hashMatch = (location.hash || '').match(/#chapter-(\d+)/);
        if (hashMatch) chapter = hashMatch[1];
        else {
            try {
                const saved = localStorage.getItem('book-chapter');
                if (saved && /^\d+$/.test(saved)) chapter = saved;
            } catch (e) {}
        }

        /* Apply without early-return */
        const initialLang = state.lang;
        state.lang = null;
        setLang(initialLang);

        state.chapter = chapter;
        applyChapterVisibility(chapter);
        tocLinks.forEach(l => {
            const active = l.dataset.chapter === chapter;
            l.classList.toggle('is-active', active);
        });
        updateProgress(chapter);
    }

    /* ─── INIT ─── */
    function init() {
        if (!chaptersEn && !chaptersHi) return;
        restore();

        /* Total chapters from DOM */
        const el = chaptersEn || chaptersHi;
        if (el) {
            const allChapters = $$('.chapter', el);
            if (allChapters.length > 0) {
                const maxN = Math.max(...allChapters.map(c => parseInt(c.dataset.chapter, 10)));
                const posEls = $$('.nav-position');
                posEls.forEach(p => {
                    if (p.dataset.template) p.textContent = p.dataset.template.replace('{n}', state.chapter).replace('{total}', TOTAL_CHAPTERS);
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();