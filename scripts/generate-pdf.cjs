/* ═══════════════════════════════════════════════════════════════════
   PDF GENERATOR
   Uses Puppeteer to render /print and capture as A4 PDF
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PDFS_DIR = path.join(ROOT, 'assets/pdfs');

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

const LANGS = [
    { code: 'en', out: 'a-boy-who-never-thought-en.pdf' },
    { code: 'hi', out: 'a-boy-who-never-thought-hi.pdf' },
];

async function waitForServer(url, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 300));
    }
    throw new Error(`Server not ready: ${url}`);
}

async function main() {
    console.log('\n📄 Generating PDFs…\n');

    if (!fs.existsSync(DIST_DIR)) {
        throw new Error('dist/ not found. Run `npm run build` first.');
    }
    fs.mkdirSync(PDFS_DIR, { recursive: true });

    /* Start static server */
    const server = require('child_process').spawn(
        'npx', ['--yes', 'serve', '-s', 'dist', '-l', String(PORT)],
        { cwd: ROOT, stdio: 'ignore', shell: true }
    );

    try {
        await waitForServer(`${BASE_URL}/print`);

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        for (const lang of LANGS) {
            const url = `${BASE_URL}/print?lang=${lang.code}`;
            console.log(`  → ${url}`);

            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

            /* Wait for book-root to be visible */
            await page.waitForFunction(
                () => {
                    const r = document.getElementById('book-root');
                    return r && !r.hidden;
                },
                { timeout: 30000 }
            );

            await new Promise(r => setTimeout(r, 800));

            const out = path.join(PDFS_DIR, lang.out);
            await page.pdf({
                path: out,
                format: 'A4',
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                preferCSSPageSize: true,
            });

            const size = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
            console.log(`  ✓ ${lang.out} (${size} MB)`);

            await page.close();
        }

        await browser.close();
    } finally {
        server.kill();
    }

    console.log('\n✓ PDFs ready.\n');
}

main().catch(err => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
});