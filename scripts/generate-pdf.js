/* ==========================================================================
   PDF GENERATOR SCRIPT — GitHub Actions runner ke liye
   Uses Puppeteer + print.html to generate server-side PDFs
   Output: assets/pdfs/A_Boy_Who_Never_Thought_{English,Hinglish}.pdf
   ========================================================================== */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/* Config */
const LANGS = [
    { code: 'en', label: 'English', filename: 'A_Boy_Who_Never_Thought_English.pdf' },
    { code: 'hi', label: 'Hinglish', filename: 'A_Boy_Who_Never_Thought_Hinglish.pdf' }
];

const BASE_URL = process.env.PRINT_URL || 'http://localhost:8080';

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'pdfs');

async function generatePDF(browser, lang) {
    const page = await browser.newPage();

    /* Set viewport to A4 at 96 DPI */
    await page.setViewport({
        width: 794,   /* 210mm at 96dpi */
        height: 1123, /* 297mm at 96dpi */
        deviceScaleFactor: 2
    });

    const url = `${BASE_URL}/print.html?lang=${lang.code}`;
    console.log(`[pdf] Opening ${url}`);

    await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 90000
    });

    /* Wait for print.js to finish building the book */
    console.log(`[pdf] Waiting for book to be ready...`);
    await page.waitForFunction(
        () => document.body.classList.contains('print-ready'),
        { timeout: 90000 }
    );

    /* Small delay for fonts/images to settle */
    await new Promise(r => setTimeout(r, 1500));

    /* Generate PDF */
    const outputPath = path.join(OUTPUT_DIR, lang.filename);
    console.log(`[pdf] Generating ${outputPath}`);

    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true
    });

    await page.close();

    const stats = fs.statSync(outputPath);
    console.log(`[pdf] ✅ ${lang.filename} — ${(stats.size / 1024).toFixed(1)} KB`);
}

(async () => {
    /* Ensure output dir exists */
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('[pdf] Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none'
        ]
    });

    try {
        for (const lang of LANGS) {
            await generatePDF(browser, lang);
        }
        console.log('[pdf] ✅ All PDFs generated successfully');
    } catch (err) {
        console.error('[pdf] ❌ Error:', err.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
