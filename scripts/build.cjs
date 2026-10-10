/* ═══════════════════════════════════════════════════════════════════
   THE UNFINISHED STORY — BUILD ENGINE v2.1
   Renders: index · book · journal · now · about
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const markdownItFootnote = require('markdown-it-footnote');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR      = path.join(ROOT, 'data');
const CONTENT_DIR   = path.join(ROOT, 'content');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const PARTIALS_DIR  = path.join(TEMPLATES_DIR, 'partials');
const DIST_DIR      = path.join(ROOT, 'dist');
const STATIC_DIRS   = ['css', 'js', 'images', 'assets'];

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
    .use(markdownItFootnote);

md.renderer.rules.footnote_ref = (tokens, idx) => {
    const id = (Number(tokens[idx].meta.id) + 1).toString();
    return `<sup class="fn-ref" id="fnref-${id}"><a href="#fn-${id}">${id}</a></sup>`;
};
md.renderer.rules.footnote_block_open = () =>
    '<section class="chapter-notes">\n<p class="chapter-notes-heading">Notes</p>\n<ol class="chapter-notes-list">\n';
md.renderer.rules.footnote_block_close = () => '</ol>\n</section>\n';
md.renderer.rules.footnote_open = (tokens, idx) => {
    const id = (Number(tokens[idx].meta.id) + 1).toString();
    return `<li id="fn-${id}" class="chapter-notes-item"><span class="chapter-notes-num">${id}</span><span class="chapter-notes-text">`;
};
md.renderer.rules.footnote_close = () => '</span></li>\n';
md.renderer.rules.footnote_anchor = (tokens, idx) => {
    const id = (Number(tokens[idx].meta.id) + 1).toString();
    return ` <a href="#fnref-${id}" class="chapter-notes-back">↩</a>`;
};

const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const readFile = f => fs.readFileSync(f, 'utf8');
const exists = f => fs.existsSync(f);

function writeFile(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
}

function copyDir(src, dest) {
    if (!exists(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, e.name);
        const d = path.join(dest, e.name);
        e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
    }
}

const escapeHtml = str => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function render(template, vars) {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
        const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), vars);
        return val !== undefined && val !== null ? String(val) : '';
    });
}

function renderConditional(template, flags) {
    return template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, body) => flags[k] ? body : '');
}

/* ─── LOAD ─── */
const config = readJSON(path.join(DATA_DIR, 'config.json'));
const chaptersData = readJSON(path.join(DATA_DIR, 'chapters.json'));
const journalData = readJSON(path.join(DATA_DIR, 'journal.json'));
const quotesData = readJSON(path.join(DATA_DIR, 'quotes.json'));

const HEAD = readFile(path.join(PARTIALS_DIR, 'head.html'));
const NAV = readFile(path.join(PARTIALS_DIR, 'nav.html'));
const FOOTER = readFile(path.join(PARTIALS_DIR, 'footer.html'));
const LAYOUT = readFile(path.join(TEMPLATES_DIR, 'layout.html'));
const BOOK_TMPL = readFile(path.join(TEMPLATES_DIR, 'book.html'));
const JOURNAL_TMPL = readFile(path.join(TEMPLATES_DIR, 'journal.html'));
const NOW_TMPL = readFile(path.join(TEMPLATES_DIR, 'now.html'));
const ABOUT_TMPL = readFile(path.join(TEMPLATES_DIR, 'about.html'));

const YEAR = new Date().getFullYear();
const TOTAL_CHAPTERS = config.book.chaptersPlanned;

const SHARED = {
    site: config.site,
    author: config.author,
    book: config.book,
    social: config.social,
    brand: config.brand,
    year: YEAR,
};

/* ─── PAGE WRAPPER ─── */
function buildPage(opts) {
    const pageVars = {
        ...opts.page,
        lang: opts.page.lang || 'en',
        robots: opts.page.robots || 'index, follow',
        ogType: opts.page.ogType || 'website',
        ogImage: opts.page.ogImage || 'og-default.jpg',
        scripts: opts.page.scripts || '',
        totalChapters: TOTAL_CHAPTERS,
    };

    const navFlags = {
        isHome: pageVars.type === 'home',
        isBook: pageVars.type === 'book',
        isJournal: pageVars.type === 'journal',
        isNow: pageVars.type === 'now',
        isAbout: pageVars.type === 'about',
    };

    const navHtml = renderConditional(render(NAV, { ...SHARED, page: pageVars }), navFlags);
    const headHtml = render(HEAD, { ...SHARED, page: pageVars });
    const footerHtml = render(FOOTER, SHARED);

    const content = render(opts.template, {
        ...SHARED,
        page: pageVars,
        content: opts.content || '',
        toc: opts.toc || '',
        chaptersEn: opts.chaptersEn || '',
        chaptersHi: opts.chaptersHi || '',
        journalContent: opts.journalContent || '',
        nowContent: opts.nowContent || '',
        aboutContent: opts.aboutContent || '',
        about: opts.about || {},
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

/* ─── CHAPTERS ─── */
function loadChapterContent(n, lang) {
    const ch = chaptersData.chapters.find(c => c.number === n);
    if (!ch) return null;
    const pad = String(n).padStart(2, '0');
    const file = path.join(CONTENT_DIR, 'chapters', `${pad}-${ch.slug}.${lang}.md`);
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

    const suffix = lang === 'hi' ? '-hi' : '';
    const prev = chaptersData.chapters.find(c => c.number === chapter.number - 1);
    const next = chaptersData.chapters.find(c => c.number === chapter.number + 1);

    const valid = c => c && (c.status === 'published' || c.status === 'draft');

    const prevLink = valid(prev)
        ? `<a href="#chapter-${prev.number}${suffix}" class="nav-btn nav-prev" data-chapter="${prev.number}">← ${escapeHtml(lang === 'hi' ? prev.titleHi : prev.title)}</a>`
        : `<span class="nav-btn nav-prev is-disabled">← Previous</span>`;

    const nextLink = valid(next)
        ? `<a href="#chapter-${next.number}${suffix}" class="nav-btn nav-next" data-chapter="${next.number}">${escapeHtml(lang === 'hi' ? next.titleHi : next.title)} →</a>`
        : `<span class="nav-btn nav-next is-disabled">Next →</span>`;

    return `
<article class="chapter${isDraft ? ' chapter-draft' : ''}" data-chapter="${chapter.number}" id="chapter-${chapter.number}${suffix}">
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
        <span class="nav-position">Chapter ${chapter.number} of ${TOTAL_CHAPTERS}</span>
        ${nextLink}
    </nav>
</article>`;
}

function buildToc() {
    const visible = chaptersData.chapters.filter(c => c.status === 'published' || c.status === 'draft');
    const items = visible.map(c => {
        const draft = c.status === 'draft' ? ' <span class="toc-draft">·</span>' : '';
        return `<li>
            <a href="#chapter-${c.number}" data-chapter="${c.number}">
                <span class="toc-num">${String(c.number).padStart(2, '0')}</span>
                <span class="toc-title">${escapeHtml(c.title)}${draft}</span>
                <span class="toc-year">${escapeHtml(c.year)}</span>
            </a>
        </li>`;
    }).join('');
    return `<ol class="toc-list">${items}</ol>`;
}

/* ─── BUILD BOOK ─── */
function buildBookPage() {
    const visible = chaptersData.chapters.filter(c => c.status === 'published' || c.status === 'draft');
    const chaptersEn = visible.map(c => renderChapterPartial(c, 'en')).join('\n');
    const chaptersHi = visible.map(c => renderChapterPartial(c, 'hi')).join('\n');

    const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: config.book.title,
        alternateName: config.book.subtitle,
        author: { '@type': 'Person', name: config.author.name },
        inLanguage: ['en', 'hi'],
        numberOfPages: visible.length,
        genre: config.book.genre,
        url: `${config.site.url}/book`,
    });

    const html = buildPage({
        page: {
            type: 'book',
            path: '/book',
            title: config.book.title,
            description: `${config.book.title} — ${visible.length} chapters written so far, in English and Hinglish. An autobiography in progress by ${config.author.name}.`,
            ogImage: config.book.covers.front,
            scripts: '<script src="/js/book.js" defer></script>',
            schema,
        },
        template: BOOK_TMPL,
        toc: buildToc(),
        chaptersEn,
        chaptersHi,
    });

    writeFile(path.join(DIST_DIR, 'book.html'), html);
    console.log('  ✓ /book');
}

/* ─── BUILD HOME ─── */
function buildHomePage() {
    const visible = chaptersData.chapters.filter(c => c.status === 'published' || c.status === 'draft');
    const chapterCount = visible.length;
    const randomQuote = quotesData.quotes[Math.floor(Math.random() * quotesData.quotes.length)];

    const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.site.title,
        url: config.site.url,
        author: { '@type': 'Person', name: config.author.name },
    });

    const content = `
<section class="hero">
    <div class="hero-grid">
        <div class="hero-content">
            <p class="hero-eyebrow">Author · ${escapeHtml(config.author.location)}</p>
            <h1 class="hero-title">${escapeHtml(config.author.name)}</h1>
            <p class="hero-book-title"><em>"${escapeHtml(config.book.title)}"</em></p>
            <p class="hero-tagline">${escapeHtml(config.book.subtitle)} — <span class="devanagari">${escapeHtml(config.book.titleHi)}</span></p>
            <p class="hero-lede">${escapeHtml(config.site.description)}</p>

            <div class="hero-actions">
                <a href="/book" class="btn btn-primary btn-lg">Start reading →</a>
                <a href="/about" class="btn btn-quiet btn-lg">About the author</a>
            </div>

            <dl class="hero-meta">
                <div><dt>Written</dt><dd>${chapterCount} chapters</dd></div>
                <div><dt>Languages</dt><dd>English &amp; Hinglish</dd></div>
                <div><dt>Status</dt><dd>${escapeHtml(config.book.status)}</dd></div>
            </dl>
        </div>
        <aside class="hero-visual">
            <div class="book-cover-frame">
                <img src="/assets/images/${escapeHtml(config.book.covers.front)}" alt="Cover of ${escapeHtml(config.book.title)}" class="book-cover" width="480" height="720" loading="eager" />
            </div>
        </aside>
    </div>
</section>

<section class="section">
    <blockquote class="pull-quote">
        <p>"${escapeHtml(randomQuote.text)}"</p>
        <footer>— ${escapeHtml(randomQuote.source)}</footer>
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
            schema,
        },
        template: content,
    });

    writeFile(path.join(DIST_DIR, 'index.html'), html);
    console.log('  ✓ /');
}

/* ─── BUILD JOURNAL ─── */
function buildJournalPage() {
    const quarters = journalData.quarters || [];

    let journalContent = '';

    for (const q of quarters) {
        const file = path.join(CONTENT_DIR, 'journal', `${q.id}.md`);
        let bodyHtml = '';

        if (exists(file)) {
            const raw = readFile(file);
            bodyHtml = md.render(raw);
        } else {
            bodyHtml = '<p class="placeholder-text">This quarter is being written.</p>';
        }

        journalContent += `
<section class="journal-quarter">
    <header class="journal-quarter-head">
        <p class="journal-quarter-label">${escapeHtml(q.label)}</p>
        <h2 class="journal-quarter-title">${escapeHtml(q.theme || 'Untitled')}</h2>
        <p class="journal-quarter-meta">${escapeHtml(q.location || config.author.location)} · ${q.entryCount || 0} entries</p>
    </header>
    <div class="journal-body">
        ${bodyHtml}
    </div>
</section>`;
    }

    if (!journalContent) {
        journalContent = '<p class="placeholder-text">The journal will begin shortly.</p>';
    }

    const html = buildPage({
        page: {
            type: 'journal',
            path: '/journal',
            title: 'Journal',
            description: `Weekly entries from the life of ${config.author.name}. Raw, dated, alive.`,
        },
        template: JOURNAL_TMPL,
        journalContent,
    });

    writeFile(path.join(DIST_DIR, 'journal.html'), html);
    console.log('  ✓ /journal');
}

/* ─── BUILD NOW ─── */
function buildNowPage() {
    const c = config.current;

    const nowContent = `
<dl class="now-details">
    <div><dt>Location</dt><dd>${escapeHtml(c.location)}</dd></div>
    <div><dt>Mood</dt><dd>${escapeHtml(c.mood || '—')}</dd></div>
    <div><dt>Reading</dt><dd>${escapeHtml(c.reading || '—')}</dd></div>
    <div><dt>Working on</dt><dd>${escapeHtml(c.workingOn || '—')}</dd></div>
    <div><dt>Last updated</dt><dd>${escapeHtml(c.lastUpdated)}</dd></div>
</dl>
`;

    const html = buildPage({
        page: {
            type: 'now',
            path: '/now',
            title: 'Now',
            description: `What ${config.author.name} is doing right now.`,
        },
        template: NOW_TMPL,
        nowContent,
    });

    writeFile(path.join(DIST_DIR, 'now.html'), html);
    console.log('  ✓ /now');
}

/* ─── BUILD ABOUT ─── */
function buildAboutPage() {
    const aboutContent = `
<p>${escapeHtml(config.author.bio)}</p>
<p>He was born in ${escapeHtml(config.author.birthplace)} in ${config.author.birthYear}, and grew up in a divided house, between two schools, and across long seasons of waiting. He began writing his autobiography in ${config.book.startedYear}, at the age of sixteen, in the winter after his tenth-grade examinations.</p>
<p>He lives in ${escapeHtml(config.author.location)}. He reads too slowly, writes too little, and is currently working on <em>${escapeHtml(config.current.workingOn || 'the next chapter')}</em>.</p>
<p>For readers, publishers, or anyone who wants to talk about the book, write to him at <a href="mailto:${escapeHtml(config.author.email)}">${escapeHtml(config.author.email)}</a>.</p>
`;

    const html = buildPage({
        page: {
            type: 'about',
            path: '/about',
            title: 'About',
            description: `About ${config.author.name}, author of ${config.book.title}.`,
        },
        template: ABOUT_TMPL,
        aboutContent,
        about: {
            lede: `Writer based in ${config.author.location}. Author of "${config.book.title}".`,
        },
    });

    writeFile(path.join(DIST_DIR, 'about.html'), html);
    console.log('  ✓ /about');
}

/* ─── MAIN BUILD ─── */
function build() {
    console.log('\n📖 Building: The Unfinished Story\n');

    if (exists(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
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
    buildJournalPage();
    buildNowPage();
    buildAboutPage();

    console.log('\n✓ Build complete.\n');
    console.log(`  Output: ${DIST_DIR}\n`);
}

try {
    build();
} catch (err) {
    console.error('\n❌ Build failed:\n', err);
    process.exit(1);
}