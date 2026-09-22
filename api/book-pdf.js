import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { put, head } from '@vercel/blob';

const CACHE_VERSION = 'v1';

export default async function handler(req, res) {
  const startTime = Date.now();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lang = 'en' } = req.body || {};

  if (lang !== 'en' && lang !== 'hi') {
    return res.status(400).json({ error: 'Invalid lang. Use "en" or "hi".' });
  }

  const cacheKey = `pdf/book-${lang}-${CACHE_VERSION}.pdf`;

  console.log('[book-pdf] START — lang:', lang);

  try {
    const existing = await head(cacheKey);
    if (existing) {
      return res.status(200).json({
        url: existing.url,
        lang,
        cached: true
      });
    }
  } catch (err) {
    // Not cached
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(90000);
    page.setDefaultNavigationTimeout(90000);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const targetUrl = `${baseUrl}/print.html?lang=${lang}`;

    console.log('[book-pdf] Loading:', targetUrl);

    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 90000,
    });

    await page.waitForFunction(
      () => {
        const root = document.getElementById('book-root');
        return root && !root.hidden && root.classList.contains('ready');
      },
      { timeout: 90000, polling: 500 }
    );

    await page.evaluateHandle('document.fonts.ready');
    await new Promise((r) => setTimeout(r, 1000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    await browser.close();
    browser = null;

    const blob = await put(cacheKey, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return res.status(200).json({
      url: blob.url,
      lang,
      cached: false
    });

  } catch (error) {
    console.error('[book-pdf] Error:', error.message);

    if (browser) {
      try { await browser.close(); } catch (e) {}
    }

    return res.status(500).json({
      error: 'Book PDF generation failed',
      details: error.message
    });
  }
}
