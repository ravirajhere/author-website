/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — BUILD ENGINE
   Version: 2.0
   Reads:  data/*.json, content/**/*.md, templates/*.html
   Writes: dist/ (fully static site)
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const markdownItFootnote = require('markdown-it-footnote');

/* ─────────────────────────────────────────────────────────────────
   1. PATHS
   ───────────────────────────────────────────────────────────────── */
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR      = path.join(ROOT, 'data');
const CONTENT_DIR   = path.join(ROOT, 'content');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const PARTIALS_DIR  = path.join(TEMPLATES_DIR, 'partials');
const DIST_DIR      = path.join(ROOT, 'dist');
const STATIC_DIRS   = ['css', 'js', 'images', 'assets'];

/* ─────────────────────────────────────────────────────────────────
   2. MARKDOWN
   ───────────────────────────────────────────────────────────────── */
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
}).use(markdownItFootnote);

md.renderer.rules.footnote_ref = function (tokens, idx) {
    const id = Number(tokens[idx].meta.id + 1).toString();
    return `<sup class="fn-ref" id="fnref-${id}"><a href="#fn-${id}">${id}</a></sup>`;
};

md.renderer.rules.footnote_block_open = () =>
    '<section class="chapter-notes">\n<p class="chapter-notes-heading">Notes</p>\n<ol class="chapter-notes-list">\n';

md.renderer.rules.footnote_block_close = () => '</ol>\n</section>\n';

md.renderer.rules.footnote_open = function (tokens, idx) {
    const id = Number(tokens[idx].meta.id + 1).toString();
    return `<li id="fn-${id}" class="chapter-notes-item"><span class="chapter-notes-num">${id}</span><span class="chapter-notes-text">`;
};

md.renderer.rules.footnote_close = () => '</span></li>\n';

md.renderer.rules.footnote_anchor = function (tokens, idx) {
    const id = Number(tokens[idx].meta.id + 1).toString();
    return ` <a href="#fnref-${id}" class="chapter-notes-back" aria-label="Back to text">↩</a>`;
};

/* ─────────────────────────────────────────────────────────────────
   3. HELPERS
   ───────────────────────────────────────────────────────────────── */
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readFile = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

function writeFile(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
}

function copyDir(src, dest) {
    if (!exists(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* {{placeholder}} renderer — simple, safe */
function render(template, vars) {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
        const value = key.split('.').reduce(
            (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
            vars
        );
        return value !== undefined && value !== null ? String(value) : '';
    });
}

/* {{#flag}}...{{/flag}} — conditional sections */
function renderConditional(template, flags) {
    return template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, key, body) => {
        return flags[key] ? body : '';
    });
}

/* ─────────────────────────────────────────────────────────────────
   4. LOAD DATA
   ───────────────────────────────────────────────────────────────── */
const config      = readJSON(path.join(DATA_DIR, 'config.json'));
const chaptersData = readJSON(path.join(DATA_DIR, 'chapters.json'));
const journalData = readJSON(path.join(DATA_DIR, 'journal.json'));
const quotesData  = readJSON(path.join(DATA_DIR, 'quotes.json'));

const HEAD       = readFile(path.join(PARTIALS_DIR, 'head.html'));
const NAV        = readFile(path.join(PARTIALS_DIR, 'nav.html'));
const FOOTER     = readFile(path.join(PARTIALS_DIR, 'footer.html'));
const LAYOUT     = readFile(path.join(TEMPLATES_DIR, 'layout.html'));
const BOOK_TMPL  = readFile(path.join(TEMPLATES_DIR, 'book.html'));

const YEAR = new Date().getFullYear();

/* ─────────────────────────────────────────────────────────────────
   5. SHARED VARIABLES
   ───────────────────────────────────────────────────────────────── */
const SHARED = {
    site: config.site,
    author: config.author,
    book: config.book,
    social: config.social,
    brand: config.brand,
    year: YEAR,
};

/* ─────────────────────────────────────────────────────────────────
   6. PAGE WRAPPER
   ───────────────────────────────────────────────────────────────── */
function buildPage(opts) {
    const pageVars = {
        ...opts.page,
        lang: opts.page.lang || 'en',
        robots: opts.page.robots || 'index, follow',
        ogType: opts.page.ogType || 'website',
        ogImage: opts.page.ogImage || 'og-default.jpg',
        scripts: opts.page.scripts || '',
    };

    const navFlags = {
        isHome: opts.page.type === 'home',
        isBook: opts.page.type === 'book',
        isJournal: opts.page.type === 'journal',
        isNow: opts.page.type === 'now',
        isAbout: opts.page.type === 'about',
    };

    const navHtml = renderConditional(render(NAV, {
        ...SHARED,
        page: pageVars,
    }), navFlags);

    const headHtml = render(HEAD, {
        ...SHARED,
        page: pageVars,
    });

    const footerHtml = render(FOOTER, {
        ...SHARED,
    });

    const content = render(opts.template || '{{content}}', {
        ...SHARED,
        page: pageVars,
        content: opts.content || '',
        toc: opts.toc || '',
        chaptersEn: opts.chaptersEn || '',
        chaptersHi: opts.chaptersHi || '',
    });

    return render(LAYOUT, {
        ...SHARED,
        page: pageVars,
        head: headHtml,
        nav: navHtml,
        footer: footerHtml,
        content: content,
    });
}

/* ─────────────────────────────────────────────────────────────────
   7. CHAPTER PARTIALS
   ───────────────────────────────────────────────────────────────── */
function loadChapterContent(number, lang) {
    const chapter = chaptersData.chapters.find(c => c.number === number);
    if (!chapter) return null;

    const pad = String(number).padStart(2, '0');
    const file = path.join(CONTENT_DIR, 'chapters', `${pad}-${chapter.slug}.${lang}.md`);

    return exists(file) ? readFile(file) : null;
}

function renderChapterPartial(chapter, lang) {
    const content = loadChapterContent(chapter.number, lang);
    const isDraft = chapter.status === 'draft';

    const bodyHtml = content
        ? md.render(content)
        : `<p class="placeholder-text">${lang === 'hi' ? 'यह अध्याय लिखा जा रहा है।' : 'This chapter is being written.'}</p>`;

    const epigraphHtml = chapter.epigraph
        ? `<blockquote class="chapter-epigraph">
             <p>"${escapeHtml(chapter.epigraph.text)}"</p>
             <footer>— ${escapeHtml(chapter.epigraph.attribution)}</footer>
           </blockquote>`
        : '';

    const sufix = lang === 'hi' ? '-hi' : '';
    const prev = chaptersData.chapters.find(c => c.number === chapter.number - 1);
    const next = chaptersData.chapters.find(c => c.number === chapter.number + 1);

    const prevLink = prev && (prev.status === 'published' || prev.status === 'draft')
        ? `<a href="#chapter-${prev.number}${sufix}" class="nav-btn nav-prev" data-chapter="${prev.number}">← Previous</a>`
        : `<span class="nav-btn nav-prev is-disabled">← Previous</span>`;

    const nextLink = next && (next.status === 'published' || next.status === 'draft')
        ? `<a href="#chapter-${next.number}${sufix}" class="nav-btn nav-next" data-chapter="${next.number}">Next →</a>`
        : `<span class="nav-btn nav-next is-disabled">Next →</span>`;

    return `
<article class="chapter${isDraft ? ' chapter-draft' : ''}" data-chapter="${chapter.number}" id="chapter-${chapter.number}${sufix}">
    <div class="chapter-running-header" aria-hidden="true">
        <span>${escapeHtml(chapter.title)}</span>
        <span>${escapeHtml(chapter.year)}</span>
    </div>

    <header class="chapter-head">
        <p class="chapter-num">Chapter ${chapter.number}</p>
        <h2 class="chapter-title">${escapeHtml(lang === 'hi' ? chapter.titleHi : chapter.title)}</h2>
        <p class="chapter-year">${escapeHtml(chapter.year)}</p>
        <div class="chapter-rule" aria-hidden="true"></div>
    </header>

    ${epigraphHtml}

    <div class="chapter-body">
        ${bodyHtml}
    </div>

    <nav class="chapter-nav">
        ${prevLink}
        <span class="nav-position">Chapter ${chapter.number} of ${config.book.chaptersPlanned}</span>
        ${nextLink}
    </nav>
</article>`;
}

/* ─────────────────────────────────────────────────────────────────
   8. BUILD TOC
   ───────────────────────────────────────────────────────────────── */
function buildToc() {
    const visible = chaptersData.chapters.filter(
        c => c.status === 'published' || c.status === 'draft'
    );

    const items = visible.map(c => {
        const draftBadge = c.status === 'draft' ? ' <span class="toc-draft">·</span>' : '';
        return `<li>
            <a href="#chapter-${c.number}" data-chapter="${c.number}">
                <span class="toc-num">${String(c.number).padStart(2, '0')}</span>
                <span class="toc-title">${escapeHtml(c.title)}${draftBadge}</span>
                <span class="toc-year">${escapeHtml(c.year)}</span>
            </a>
        </li>`;
    }).join('');

    return `<ol class="toc-list">${items}</ol>`;
}

/* ─────────────────────────────────────────────────────────────────
   9. BUILD BOOK PAGE
   ───────────────────────────────────────────────────────────────── */
function buildBookPage() {
    const visible = chaptersData.chapters.filter(
        c => c.status === 'published' || c.status === 'draft'
    );

    const chaptersEn = visible.map(c => renderChapterPartial(c, 'en')).join('\n');
    const chaptersHi = visible.map(c => renderChapterPartial(c, 'hi')).join('\n');

    const chapterCount = visible.length;
    const description = `${config.book.title} — ${chapterCount} chapters written so far, in English and Hinglish. An autobiography in progress by ${config.author.name}.`;

    const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: config.book.title,
        alternateName: config.book.subtitle,
        author: { '@type': 'Person', name: config.author.name },
        inLanguage: ['en', 'hi'],
        numberOfPages: chapterCount,
        genre: config.book.genre,
        url: `${config.site.url}/book`,
    });

    const html = buildPage({
        page: {
            type: 'book',
            path: '/book',
            title: config.book.title,
            description: description,
            ogImage: config.book.covers.front,
            scripts: '',
        },
        template: BOOK_TMPL,
        toc: buildToc(),
        chaptersEn: chaptersEn,
        chaptersHi: chaptersHi,
    });

    writeFile(path.join(DIST_DIR, 'book.html'), html);
    console.log('  ✓ /book');
}

/* ─────────────────────────────────────────────────────────────────
   10. BUILD HOMEPAGE
   ───────────────────────────────────────────────────────────────── */
function buildHomePage() {
    const randomQuote = quotesData.quotes[0];
    const chapterCount = chaptersData.chapters.filter(
        c => c.status === 'published' || c.status === 'draft'
    ).length;

    const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.site.title,
        url: config.site.url,
        author: { '@type': 'Person', name: config.author.name },
    });

    const homeContent = `
<section class="hero">
    <div class="hero-grid">
        <div class="hero-content">
            <p class="hero-eyebrow">Author · {{author.location}}</p>
            <h1 class="hero-title">{{author.name}}</h1>
            <p class="hero-book-title"><em>"{{book.title}}"</em></p>
            <p class="hero-tagline">{{book.subtitle}} — <span class="devanagari">{{book.titleHi}}</span></p>
            <p class="hero-lede">{{site.description}}</p>

            <div class="hero-actions">
                <a href="/book" class="btn btn-primary btn-lg">Start reading →</a>
                <a href="/about" class="btn btn-quiet btn-lg">About the author</a>
            </div>

            <dl class="hero-meta">
                <div><dt>Written</dt><dd>${chapterCount} chapters</dd></div>
                <div><dt>Languages</dt><dd>English &amp; Hinglish</dd></div>
                <div><dt>Status</dt><dd>{{book.status}}</dd></div>
            </dl>
        </div>
        <aside class="hero-visual">
            <div class="book-cover-frame">
                <img src="/assets/images/{{book.covers.front}}" alt="Cover of {{book.title}}" class="book-cover" width="480" height="720" loading="eager" />
            </div>
        </aside>
    </div>
</section>

<section class="section section-quote">
    <blockquote class="pull-quote">
        <p>"${escapeHtml(randomQuote.text)}"</p>
        <footer><cite>— ${escapeHtml(randomQuote.source)}</cite></footer>
    </blockquote>
</section>
`;

    const html = buildPage({
        page: {
            type: 'home',
            path: '/',
            title: 'Home',
            description: config.site.description,
            ogImage: 'og-default.jpg',
        },
        content: homeContent,
    });

    writeFile(path.join(DIST_DIR, 'index.html'), html);
    console.log('  ✓ /');
}

/* ─────────────────────────────────────────────────────────────────
   11. MAIN BUILD
   ───────────────────────────────────────────────────────────────── */
function build() {
    console.log('\n📖 Building: The Unfinished Story\n');

    if (exists(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    console.log('→ Copying static assets…');
    for (const dir of STATIC_DIRS) {
        const src = path.join(ROOT, dir);
        if (exists(src)) {
            copyDir(src, path.join(DIST_DIR, dir));
            console.log(`  ✓ ${dir}/`);
        }
    }

    for (const file of ['robots.txt', 'manifest.json', 'sw.js', 'offline.html']) {
        const src = path.join(ROOT, file);
        if (exists(src)) {
            fs.copyFileSync(src, path.join(DIST_DIR, file));
            console.log(`  ✓ ${file}`);
        }
    }

    console.log('\n→ Building pages…');
    buildHomePage();
    buildBookPage();

    console.log('\n✓ Build complete.\n');
    console.log(`  Output: ${DIST_DIR}\n`);
}

try {
    build();
} catch (err) {
    console.error('\n❌ Build failed:\n');
    console.error(err);
    process.exit(1);
}