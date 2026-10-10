/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — SERVICE WORKER
   Offline-first caching for reading experience
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'v1.0.0';
const CACHE_NAME = `unfinished-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
    '/',
    '/book',
    '/journal',
    '/now',
    '/about',
    '/offline.html',
    '/css/theme.css',
    '/css/style.css',
    '/js/core.js',
    '/js/book.js',
    '/manifest.json',
    '/assets/favicon.png',
];

/* ─── INSTALL ─── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

/* ─── ACTIVATE ─── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith('unfinished-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

/* ─── FETCH ─── */
self.addEventListener('fetch', event => {
    const { request } = event;

    /* Skip non-GET */
    if (request.method !== 'GET') return;

    /* Skip external (fonts, etc.) */
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    /* Network-first for HTML, cache-first for assets */
    const isHTML = request.headers.get('accept')?.includes('text/html');

    if (isHTML) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, copy));
                    return res;
                })
                .catch(() => caches.match(request).then(r => r || caches.match(OFFLINE_URL)))
        );
        return;
    }

    /* Cache-first for assets */
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, copy));
                }
                return res;
            }).catch(() => caches.match(OFFLINE_URL));
        })
    );
});