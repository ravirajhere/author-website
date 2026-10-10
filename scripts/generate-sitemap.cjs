/* ═══════════════════════════════════════════════════════════════════
   SITEMAP GENERATOR
   Reads:  dist/ (built files), data/*.json
   Writes: dist/sitemap.xml
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'data');

const config = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'config.json'), 'utf8'));

const SITE_URL = config.site.url.replace(/\/$/, '');
const today = new Date().toISOString().split('T')[0];

/* ─── PAGES ─── */
const pages = [
    { path: '/',           priority: 1.0, changefreq: 'weekly'  },
    { path: '/book',       priority: 0.9, changefreq: 'weekly'  },
    { path: '/journal',    priority: 0.8, changefreq: 'weekly'  },
    { path: '/now',        priority: 0.6, changefreq: 'weekly'  },
    { path: '/about',      priority: 0.7, changefreq: 'monthly' },
];

/* ─── BUILD XML ─── */
const urls = pages.map(p => `
    <url>
        <loc>${SITE_URL}${p.path}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority.toFixed(1)}</priority>
    </url>`).join('');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

/* ─── WRITE ─── */
if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/ not found. Run `npm run build` first.');
    process.exit(1);
}

fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml.trim(), 'utf8');
console.log('  ✓ sitemap.xml');