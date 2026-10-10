/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — CORE
   Nav · Mobile menu · Theme toggle · Year
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const $ = (s, c) => (c || document).querySelector(s);
    const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

    /* ─── YEAR ─── */
    const yearEls = $$('[data-year]');
    yearEls.forEach(el => el.textContent = new Date().getFullYear());

    /* ─── HEADER SCROLL STATE ─── */
    const header = $('#siteHeader');
    if (header) {
        let ticking = false;
        const update = () => {
            header.classList.toggle('is-scrolled', window.scrollY > 8);
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        update();
    }

    /* ─── MOBILE MENU ─── */
    const menuBtn = $('#menuBtn');
    const mobileNav = $('#mobileNav');
    const mobileOverlay = $('#mobileOverlay');
    const mobileClose = $('#mobileNavClose');

    function openMenu() {
        if (!mobileNav || !mobileOverlay) return;
        mobileNav.hidden = false;
        mobileOverlay.hidden = false;
        void mobileNav.offsetHeight;
        mobileNav.dataset.open = 'true';
        mobileOverlay.dataset.open = 'true';
        menuBtn?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        if (!mobileNav || !mobileOverlay) return;
        mobileNav.dataset.open = 'false';
        mobileOverlay.dataset.open = 'false';
        menuBtn?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        setTimeout(() => {
            mobileNav.hidden = true;
            mobileOverlay.hidden = true;
        }, 500);
    }

    menuBtn?.addEventListener('click', () => {
        const isOpen = mobileNav?.dataset.open === 'true';
        isOpen ? closeMenu() : openMenu();
    });
    mobileClose?.addEventListener('click', closeMenu);
    mobileOverlay?.addEventListener('click', closeMenu);
    $$('#mobileNav a').forEach(a => a.addEventListener('click', () => setTimeout(closeMenu, 60)));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mobileNav?.dataset.open === 'true') closeMenu();
    });

    /* ─── THEME TOGGLE (localStorage) ─── */
    const savedTheme = (() => {
        try { return localStorage.getItem('theme'); } catch { return null; }
    })();
    if (savedTheme) {
        document.documentElement.dataset.theme = savedTheme;
    }

    /* ─── EXTERNAL LINK SECURITY ─── */
    $$('a[target="_blank"]').forEach(a => {
        const rel = a.getAttribute('rel') || '';
        if (!rel.includes('noopener')) {
            a.setAttribute('rel', (rel + ' noopener noreferrer').trim());
        }
    });

    /* ─── SERVICE WORKER (PWA) ─── */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
})();