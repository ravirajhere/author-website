/* ═══════════════════════════════════════════════════════════════════
   PDF GENERATOR — v2.0
   Waits for body.paginated class (set by print.js)
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PDFS_DIR = path.join(ROOT, 'assets/pdfs');

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

const LANGS = [
    { code: 'en', out: 'a-boy-who-never-thought-en.pdf' },
    { code: 'hi', out: 'a-boy-who-never-thought-hi.pdf' },
];

async function waitForServer(url, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 400));
    }
    throw new Error(`Server not ready: ${url}`);
}

async function main() {
    console.log('\n📄 Generating PDFs…\n');

    if (!fs.existsSync(DIST_DIR)) throw new Error('dist/ not found');
    const printFile = path.join(DIST_DIR, 'print.html');
    if (!fs.existsSync(printFile)) throw new Error('dist/print.html not found');

    fs.mkdirSync(PDFS_DIR, { recursive: true });

    console.log(`→ Starting server on port ${PORT}…`);
    const server = spawn(
        'npx',
        ['--yes', 'serve', '-s', 'dist', '-l', String(PORT)],
        { cwd: ROOT, stdio: 'ignore', shell: true }
    );

    const cleanup = () => { try { server.kill('SIGTERM'); } catch (e) {} };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(1); });

    try {
        await waitForServer(`${BASE_URL}/print.html`);
        console.log('  ✓ Server ready\n');

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--font-render-hinting=none',
            ],
        });

        for (const lang of LANGS) {
            const url = `${BASE_URL}/print.html?lang=${lang.code}`;
            console.log(`→ Rendering ${url}`);

            const page = await browser.newPage();

            page.on('console', msg => {
                const type = msg.type();
                if (type === 'error' || type === 'warning') {
                    console.log(`  [browser:${type}] ${msg.text()}`);
                }
            });
            page.on('pageerror', err => {
                console.log(`  [browser:exception] ${err.message}`);
            });

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                /* Wait for pagination to complete */
                try {
                    await page.waitForFunction(
                        () => document.body.classList.contains('paginated'),
                        { timeout: 20000, polling: 300 }
                    );
                    console.log('  ✓ Pagination complete');
                } catch (e) {
                    console.log('  ⚠ Pagination timeout — printing anyway');
                }

                /* Buffer for fonts */
                await new Promise(r => setTimeout(r, 1500));

                const out = path.join(PDFS_DIR, lang.out);
                await page.pdf({
                    path: out,
                    format: 'A4',
                    printBackground: true,
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    preferCSSPageSize: true,
                });

                const size = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
                console.log(`  ✓ ${lang.out} (${size} MB)\n`);
            } catch (err) {
                const shot = path.join(PDFS_DIR, `_debug-${lang.code}.png`);
                try {
                    await page.screenshot({ path: shot, fullPage: true });
                    console.log(`  ⚠ Screenshot: ${shot}`);
                } catch (e) {}
                throw err;
            } finally {
                await page.close();
            }
        }

        await browser.close();
    } finally {
        cleanup();
    }

    console.log('✓ PDFs ready.\n');
}

main().catch(err => {
    console.error('\n❌ Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
});