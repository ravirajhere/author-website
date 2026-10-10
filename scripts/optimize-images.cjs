/* ═══════════════════════════════════════════════════════════════════
   IMAGE OPTIMIZER
   Converts JPG/PNG → WebP + responsive variants
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets/images');

const WIDTHS = [400, 800, 1200];
const SKIP_DIRS = ['icons', 'archive'];

async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.includes(entry.name)) continue;
            await walk(full);
        } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
            await optimize(full);
        }
    }
}

async function optimize(file) {
    const ext = path.extname(file);
    const base = file.slice(0, -ext.length);

    /* Skip if WebP already exists and is newer */
    const webp = `${base}.webp`;
    try {
        const [srcStat, webpStat] = await Promise.all([
            fs.promises.stat(file),
            fs.promises.stat(webp),
        ]);
        if (webpStat.mtimeMs > srcStat.mtimeMs) return;
    } catch (e) { /* webp doesn't exist yet */ }

    /* Full-size WebP */
    await sharp(file).webp({ quality: 82 }).toFile(webp);

    /* Responsive variants */
    for (const w of WIDTHS) {
        const out = `${base}-${w}w.webp`;
        await sharp(file).resize({ width: w }).webp({ quality: 80 }).toFile(out);
    }

    console.log(`  ✓ ${path.relative(ROOT, file)}`);
}

(async () => {
    console.log('\n🖼  Optimizing images…\n');
    if (!fs.existsSync(IMAGES_DIR)) {
        console.log('  · No assets/images/ found');
        return;
    }
    await walk(IMAGES_DIR);
    console.log('\n✓ Done.\n');
})();