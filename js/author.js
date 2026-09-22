/* ==========================================================================
   RAVI RAJ SINGH — AUTHOR WEBSITE SCRIPT
   Version: 1.1 (with newsletter)
   Handles: Year · Header scroll state · Mobile menu · Smooth scroll
            External link security · Console greeting · Newsletter form
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

    /* Safe sessionStorage (works in private mode / file://) */
    function sessionGet(key) {
        try { return sessionStorage.getItem(key); }
        catch (e) { return null; }
    }
    function sessionSet(key, value) {
        try { sessionStorage.setItem(key, value); return true; }
        catch (e) { return false; }
    }

    /* ======================================================================
       2. ELEMENT REFERENCES
       ====================================================================== */
    const header        = $('#siteHeader');
    const menuBtn       = $('#menuBtn');
    const mobileNav     = $('#mobileNav');
    const mobileOverlay = $('#mobileOverlay');
    const mobileClose   = $('#mobileNavClose');
    const yearEl        = $('#year');
    const scrollCue     = $('.scroll-cue');

    /* ======================================================================
       3. YEAR IN FOOTER
       ====================================================================== */
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    /* ======================================================================
       4. HEADER — solid on scroll
       ====================================================================== */
    (function initHeader() {
        if (!header) return;

        let ticking = false;

        function update() {
            const scrolled = window.scrollY > 24;
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
       5. FOCUS TRAP (for mobile menu)
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

        if (mobileNav && mobileNav.dataset.open === 'true') {
            closeMenu();
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

    /* ======================================================================
       6. MOBILE MENU
       ====================================================================== */
    let lastFocusedMenu = null;

    function openMenu() {
        if (!mobileNav || !mobileOverlay) return;
        lastFocusedMenu = document.activeElement;

        mobileNav.hidden = false;
        mobileOverlay.hidden = false;

        /* Force reflow so browser computes initial state */
        void mobileNav.offsetHeight;

        mobileNav.dataset.open = 'true';
        mobileOverlay.dataset.open = 'true';

        document.body.style.overflow = 'hidden';
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
        mobileNav.setAttribute('aria-hidden', 'false');
        mobileOverlay.setAttribute('aria-hidden', 'false');

        setTimeout(function () {
            const firstLink = $('a', mobileNav);
            if (firstLink && typeof firstLink.focus === 'function') {
                try { firstLink.focus(); } catch (e) {}
            }
        }, 100);

        trapFocus(mobileNav);
    }

    function closeMenu() {
        if (!mobileNav || !mobileOverlay) return;

        mobileNav.dataset.open = 'false';
        mobileOverlay.dataset.open = 'false';
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
        mobileOverlay.setAttribute('aria-hidden', 'true');

        document.body.style.overflow = '';

        setTimeout(function () {
            mobileNav.hidden = true;
            mobileOverlay.hidden = true;
        }, 500);

        releaseFocus();

        if (lastFocusedMenu && typeof lastFocusedMenu.focus === 'function') {
            try { lastFocusedMenu.focus(); } catch (e) {}
        }
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', function () {
            const isOpen = mobileNav && mobileNav.dataset.open === 'true';
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    if (mobileClose)   mobileClose.addEventListener('click', closeMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMenu);

    $$('#mobileNav a').forEach(function (link) {
        link.addEventListener('click', function () {
            setTimeout(closeMenu, 60);
        });
    });

    /* ======================================================================
       7. SMOOTH SCROLL (anchor links)
       ====================================================================== */
    $$('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            const href = link.getAttribute('href');
            if (!href || href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            const offset = header ? header.offsetHeight + 8 : 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;

            window.scrollTo({
                top: top,
                behavior: prefersReduced ? 'auto' : 'smooth'
            });

            /* Update URL without jumping */
            try { history.replaceState(null, '', href); } catch (err) {}

            /* Move focus for accessibility */
            target.setAttribute('tabindex', '-1');
            try { target.focus({ preventScroll: true }); } catch (err) {}

            target.addEventListener('blur', function onBlur() {
                target.removeAttribute('tabindex');
                target.removeEventListener('blur', onBlur);
            });
        });
    });

    /* ======================================================================
       8. SCROLL CUE FADE
       ====================================================================== */
    (function initScrollCue() {
        if (!scrollCue) return;

        let cueRaf = null;

        function fadeCue() {
            const opacity = Math.max(0, 1 - window.scrollY / 300);
            scrollCue.style.opacity = String(opacity);
            scrollCue.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
        }

        window.addEventListener('scroll', function () {
            if (cueRaf) return;
            cueRaf = window.requestAnimationFrame(function () {
                fadeCue();
                cueRaf = null;
            });
        }, { passive: true });

        fadeCue();
    })();

    /* ======================================================================
       9. EXTERNAL LINKS SECURITY
       ====================================================================== */
    $$('a[target="_blank"]').forEach(function (link) {
        const rel = link.getAttribute('rel') || '';
        if (rel.indexOf('noopener') === -1) {
            link.setAttribute('rel', (rel + ' noopener noreferrer').trim());
        }
    });

    /* ======================================================================
       10. CONSOLE GREETING (once per session)
       ====================================================================== */
    (function greet() {
        const hasGreeted = sessionGet('rrs-author-greeted');
        if (hasGreeted) return;

        const accent = 'color:#8B6F3F;font-weight:600;';
        const soft   = 'color:#7A7068;';

        try {
            console.log('%cRavi Raj Singh — Author', 'font-size:14px;font-weight:700;' + accent);
            console.log('%c"A Boy Who Never Thought" — an 18-year journey.', 'font-size:12px;' + soft);
            console.log('%cRead the book: /book.html', 'font-size:12px;' + soft);
            console.log('%cWritten by hand. No frameworks.', 'font-size:12px;' + accent);

            sessionSet('rrs-author-greeted', '1');
        } catch (e) {}
    })();

    /* ======================================================================
       11. NEWSLETTER FORM
       ====================================================================== */
    (function initNewsletter() {
        const form = document.getElementById('newsletterForm');
        const emailInput = document.getElementById('nl_email');
        const submitBtn = document.getElementById('nlSubmit');
        const statusEl = document.getElementById('nlStatus');
        const honeypot = document.getElementById('nl_website');

        if (!form || !emailInput || !submitBtn || !statusEl) return;

        let statusTimer = null;

        function showStatus(msg, type) {
            if (statusTimer) clearTimeout(statusTimer);
            statusEl.textContent = msg;
            statusEl.className = 'newsletter-status is-visible is-' + type;
            if (type !== 'loading') {
                statusTimer = setTimeout(function () {
                    statusEl.className = 'newsletter-status';
                }, 6000);
            }
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            /* Honeypot */
            if (honeypot && honeypot.value.trim() !== '') {
                return;
            }

            const email = (emailInput.value || '').trim();

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                showStatus('Please enter a valid email.', 'error');
                return;
            }

            showStatus('Subscribing…', 'loading');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing…';

            fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    source: 'author',
                    website: ''
                })
            })
            .then(function (res) {
                return res.json().then(function (data) {
                    return { ok: res.ok, status: res.status, data: data };
                });
            })
            .then(function (result) {
                if (result.ok) {
                    const msg = (result.data && result.data.message) || 'Subscribed. Check your inbox.';
                    showStatus(msg, 'success');
                    form.reset();
                } else {
                    const msg = (result.data && result.data.error) || 'Subscription failed.';
                    showStatus(msg, 'error');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Subscribe';
            })
            .catch(function (err) {
                console.error('[newsletter] Error:', err);
                showStatus('Network error. Try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Subscribe';
            });
        });
    })();

})();
