/* ═══════════════════════════════════════════════════════════════════
   PDF GENERATOR
   Uses Puppeteer to render /print.html and capture as A4 PDF
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

/* ─── WAIT FOR SERVER ─── */
async function waitForServer(url, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 400));
    }
    throw new Error(`Server not ready after ${timeoutMs}ms: ${url}`);
}

/* ─── MAIN ─── */
async function main() {
    console.log('\n📄 Generating PDFs…\n');

    if (!fs.existsSync(DIST_DIR)) {
        throw new Error('dist/ not found. Run `npm run build` first.');
    }

    const printFile = path.join(DIST_DIR, 'print.html');
    if (!fs.existsSync(printFile)) {
        throw new Error('dist/print.html not found. Did buildPrintPage() run?');
    }

    fs.mkdirSync(PDFS_DIR, { recursive: true });

    /* ─── Start static server ─── */
    console.log(`→ Starting server on port ${PORT}…`);
    const { spawn } = require('child_process');
    const server = spawn(
        'npx',
        ['--yes', 'serve', '-s', 'dist', '-l', String(PORT)],
        { cwd: ROOT, stdio: 'ignore', shell: true }
    );

    /* Ensure server killed on exit */
    const cleanup = () => {
        try { server.kill('SIGTERM'); } catch (e) {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(1); });

    try {
        await waitForServer(`${BASE_URL}/print.html`);
        console.log('  ✓ Server ready\n');

        /* ─── Launch browser ─── */
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

            /* Capture browser console for debugging */
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
                await page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: 60000,
                });

                /* Wait for book-root to reveal */
                await page.waitForFunction(
                    () => {
                        const r = document.getElementById('book-root');
                        return r && !r.hidden;
                    },
                    { timeout: 25000, polling: 200 }
                );

                /* Small buffer for fonts/layout */
                await new Promise(r => setTimeout(r, 1000));

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
                /* Capture screenshot for debugging */
                const shotPath = path.join(PDFS_DIR, `_debug-${lang.code}.png`);
                try {
                    await page.screenshot({ path: shotPath, fullPage: true });
                    console.log(`  ⚠ Screenshot saved: ${shotPath}`);
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