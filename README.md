<!-- ═══════════════════════════════════════════════════════════════════
     THE UNFINISHED STORY
     The autobiography of Ravi Raj Singh — a living document
     ═══════════════════════════════════════════════════════════════════ -->

<div align="center">

# 📖 The Unfinished Story

### The autobiography of **Ravi Raj Singh**

*An 18-chapter bilingual memoir — English & Hinglish — from 2008 to 2026*

[![Live](https://img.shields.io/badge/🌐_Live-ravirajhere--author.vercel.app-1F1A14?style=for-the-badge)](https://ravirajhere-author.vercel.app)
[![License: MIT](https://img.shields.io/badge/Code-MIT-yellow?style=for-the-badge)](LICENSE)
[![Content](https://img.shields.io/badge/Content-©_Author-8B6F3F?style=for-the-badge)](https://ravirajhere-author.vercel.app/about)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://ravirajhere-author.vercel.app)
[![Built with Vanilla JS](https://img.shields.io/badge/Built_with-Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://ravirajhere-author.vercel.app)

**[🌐 Live Site](https://ravirajhere-author.vercel.app)** ·
**[📖 Read the Book](https://ravirajhere-author.vercel.app/book)** ·
**[📔 Journal](https://ravirajhere-author.vercel.app/journal)** ·
**[🕐 Now](https://ravirajhere-author.vercel.app/now)**

</div>

---

## 📖 Table of Contents

<details open>
<summary>Expand / collapse</summary>

- [What is this?](#-what-is-this)
- [Why this exists](#-why-this-exists)
- [The Book](#-the-book)
- [The Journal](#-the-journal)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Project Structure](#-project-structure)
- [Data Model](#-data-model)
- [How to Add Content](#-how-to-add-content)
- [Theming](#-theming)
- [PDF Pipeline](#-pdf-pipeline)
- [SEO & Rich Results](#-seo--rich-results)
- [Automation](#️-automation)
- [Quick Start](#-quick-start)
- [Technical Stack](#-technical-stack)
- [License](#-license)
- [Contact](#-contact)

</details>

---

## 📖 What is this?

**The Unfinished Story** is the personal website and digital archive of the autobiography of **Ravi Raj Singh** — a writer based in Patna, India.

The book — *"A Boy Who Never Thought"* (*Safar Se Safar Tak*, *गुंजते सन्नाटे*) — is an 18-chapter bilingual memoir covering **2008 to 2026**. It is **still being written.**

But this site is not just the book. It is the book **and** the journal **and** the raw material of a life in progress.

> *The book is the spine. The journal is the pulse.*

**Live site:** [ravirajhere-author.vercel.app](https://ravirajhere-author.vercel.app)

---

## 💡 Why this exists

Most personal websites are portfolios. Most blogs are content feeds. Most "about me" pages are résumés.

This is different. This is a **living document of a life** — updated weekly, expanded monthly, and left deliberately unfinished.

The book provides structure. The journal provides honesty. Together they create something rare: **an autobiography that grows in public.**

---

## 📚 The Book

**"A Boy Who Never Thought"** — *Safar Se Safar Tak* — *गुंजते सन्नाटे*

| | |
|---|---|
| **Chapters Written** | 11 of 18 |
| **Period Covered** | 2008 – 2019 |
| **Period Full** | 2008 – 2026 |
| **Languages** | English & Hinglish |
| **Status** | In progress |
| **Started** | 2024 |

Four eras:

1. **Childhood** (2008–2012) — Birth, loss, a changing home
2. **School Years** (2013–2019) — First steps, friendships, dreaming
3. **Searching** (2020–2023) — The locked years, online classrooms, return
4. **Becoming** (2024–2026) — Writing begins, a story takes shape

Read free: [ravirajhere-author.vercel.app/book](https://ravirajhere-author.vercel.app/book)

---

## 📔 The Journal

Weekly entries, grouped by quarter, written since March 2026. Raw, unfiltered, dated. Sometimes about the book. Sometimes about a cup of chai. Always real.

Read: [ravirajhere-author.vercel.app/journal](https://ravirajhere-author.vercel.app/journal)

---

## 📸 Screenshots

<div align="center">

### 🏠 Homepage
<img src="docs/screenshots/home.png" alt="Homepage" width="800"/>

### 📖 Book Reader
<img src="docs/screenshots/book.png" alt="Book reader" width="800"/>

### 📔 Journal
<img src="docs/screenshots/journal.png" alt="Journal" width="800"/>

### 📄 PDF Export (A4)
<img src="docs/screenshots/pdf.png" alt="Book PDF" width="800"/>

### 📱 Mobile + Dark Mode
<img src="docs/screenshots/mobile-dark.png" alt="Mobile view" width="300"/>

</div>

> **Note:** Screenshots coming soon. See `docs/screenshots/`.

---

## ✨ Features

### 📚 Content
- **11 chapters** written, **7 planned** — bilingual (EN + HI)
- **Weekly journal** — quarterly archive with mood tracking
- **Now page** — what the author is doing *right now*
- **Reading progress** — saved across sessions
- **Keyboard navigation** — ← / → to move between chapters
- **Footnote system** — hover on desktop, bottom-sheet on mobile

### 🎨 Design
- **Two-file theming** — `theme.css` (tokens) + `style.css` (components)
- **5-color override** — change 5 lines to completely restyle the site
- **4 built-in presets** — light, dark, sepia, contrast
- **Editorial layout** — typography-first, drop caps, ornamented rules, justified text with hyphenation
- **Reduced motion** support

### 🔍 SEO & Discoverability
- **Complete Schema.org** — Book, Person, WebSite, Article, BreadcrumbList
- **Auto-generated sitemaps** — checked against filesystem
- **Pre-rendered HTML** — full content without JS dependency
- **Canonical URLs** per page
- **Open Graph + Twitter Cards**
- **hreflang ready** — `en-IN`, `hi-IN`

### ⚡ Performance
- **Zero runtime dependencies** — pure HTML, CSS, vanilla JavaScript
- **Sub-second load** — no frameworks, no bundlers
- **PWA installable** — works offline
- **LCP optimized** — preloaded fonts and hero
- **Pre-rendered static site**

### 📄 Manifesto / PDF
- **A4 print-ready** — auto-generated via Puppeteer
- **Bilingual** — English + Hinglish PDFs
- **Auto-committed** via GitHub Actions

---

## 🏗️ Architecture

```
                ┌────────────────────────────────────────┐
                │          data/*.json                   │
                │  Single source of truth for content    │
                │  config · chapters · journal · quotes  │
                └────────────────┬───────────────────────┘
                                 │
                ┌────────────────┼───────────────────────┐
                │                │                       │
                ▼                ▼                       ▼
          ┌─────────┐      ┌─────────┐           ┌──────────┐
          │ Website │      │ Sitemap │           │   PDF    │
          │ (build) │      │Generator│           │(Puppeteer│
          │         │      │  .cjs   │           │  +sharp) │
          └────┬────┘      └────┬────┘           └─────┬────┘
               │                │                      │
               └────────────────┼──────────────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │  scripts/build.cjs       │
                   │  (Pre-renders everything)│
                   └────────────┬─────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │      dist/ (static)      │
                   └────────────┬─────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │  GitHub Actions + Vercel │
                   │  (manual deploy)         │
                   └──────────────────────────┘
```

**Golden rule:** Content grows in `data/` and `content/`. Templates never change.

---

## 📂 Project Structure

```
autobiography/
│
├── .github/workflows/
│   ├── build.yml                    # Site build
│   ├── generate-pdf.yml             # PDF regeneration
│   └── optimize-images.yml          # WebP + AVIF
│
├── data/                            # ⭐ Single source of truth
│   ├── config.json                  # Site + author + book + current
│   ├── chapters.json                # 18 chapters metadata
│   ├── journal.json                 # Quarterly journal index
│   └── quotes.json                  # Rotating homepage quotes
│
├── content/                         # ⭐ Just text, no markup
│   ├── chapters/
│   │   ├── 01-the-beginning.en.md
│   │   ├── 01-the-beginning.hi.md
│   │   └── ...
│   └── journal/
│       └── 2026-Q2.md
│
├── templates/                       # ⭐ Build-time templates
│   ├── layout.html
│   ├── book.html
│   ├── journal.html
│   ├── now.html
│   ├── about.html
│   ├── print.html
│   └── partials/
│       ├── head.html
│       ├── nav.html
│       └── footer.html
│
├── scripts/
│   ├── build.cjs                    # Main engine
│   ├── build-watch.cjs              # Dev mode
│   ├── generate-sitemap.cjs
│   ├── generate-pdf.cjs
│   ├── optimize-images.cjs
│   └── rename-images.sh
│
├── css/
│   ├── theme.css                    # ⚙️ Design tokens
│   ├── style.css                    # Components
│   └── print.css                    # A4 print styles
│
├── js/
│   ├── core.js
│   ├── book.js
│   └── print.js
│
├── images/                          # Source images
├── assets/
│   ├── favicon.png
│   ├── icons/                       # PWA icons
│   └── pdfs/                        # Auto-generated
│
├── dist/                            # Build output (gitignored)
├── docs/screenshots/
├── README.md
├── LICENSE
├── package.json
└── vercel.json
```

---

## 📚 Data Model

**4 data files, one source of truth each:**

### `data/config.json`
Site config — master key. Change `site.title` → 30+ files auto-update.

### `data/chapters.json`
18 chapters metadata + 4 eras. Includes epigraph, reading time, status.

### `data/journal.json`
Quarterly journal index. Each quarter linked to `content/journal/{id}.md`.

### `data/quotes.json`
Rotating quotes for homepage. From book + journal + external.

---

## 📝 How to Add Content

### ➕ Add a new chapter

1. Add entry to `data/chapters.json` (number, slug, title, year, epigraph)
2. Create `content/chapters/{NN}-{slug}.en.md`
3. Create `content/chapters/{NN}-{slug}.hi.md`
4. Commit

**Build will:**
- Render chapter page in `/book`
- Update TOC
- Update sitemap
- Update prev/next links

**Time:** 15 minutes. **Files:** 3.

### ➕ Add a journal entry

1. Open `content/journal/2026-Q2.md`
2. Add this week's entry (heading + 150 words)
3. Update `data/journal.json` entryCount
4. Commit

**Time:** 15 minutes. **Files:** 2.

### ➕ Update "Now"

1. Open `data/config.json`
2. Change `current.mood`, `current.reading`, `current.workingOn`
3. Commit

**Time:** 2 minutes. **Files:** 1.

### 🎨 Change the entire theme

1. Open `data/config.json`
2. Change the 5 brand colors
3. Rebuild

**Time:** 5 minutes. **Files:** 1.

---

## 🎨 Theming

Entire visual identity in `css/theme.css`:

```css
:root {
    --c-primary: #1F1A14;   /* ink — main text */
    --c-base:    #FBF8F1;   /* paper — background */
    --c-surface: #F5F0E5;   /* cards */
    --c-accent:  #8B6F3F;   /* gold — links */
    --c-warn:    #A64B2A;   /* ember */
}
```

Everything else derives automatically via `color-mix()`.

**Presets:** `<html data-theme="dark">` — dark, sepia, contrast, indigo.

**Rule:** Never hardcode values in `style.css`. Always use tokens.

---

## 📄 PDF Pipeline

PDFs are generated server-side via GitHub Actions + Puppeteer.

**How it works:**
1. Push changes to `content/chapters/**` or `print.html`
2. GitHub Actions triggers `generate-pdf.yml`
3. Puppeteer renders `/print` (pre-built HTML with all chapters)
4. PDFs saved to `assets/pdfs/`
5. Auto-committed back to repo

**Download:** `/book` pe sidebar mein EN + HI buttons.

**Manual trigger:** GitHub Actions tab → "Generate Book PDFs" → "Run workflow"

---

## 🔍 SEO & Rich Results

Every page carries complete `<head>`:

| Element | Status |
|---|---|
| Primary SEO | ✅ Unique per page |
| Canonical URL | ✅ Absolute, clean |
| Open Graph | ✅ Full set |
| Twitter Cards | ✅ summary_large_image |
| hreflang | ✅ en-IN + x-default |
| JSON-LD @graph | ✅ Pre-rendered |

**Schema per page:**
- Homepage: `WebSite + Person + Book`
- Book: `Book + Person`
- Journal: `Blog + ItemList[BlogPosting]`

---

## ⚙️ Automation

**Three workflows:**

### 1. `build.yml` — Fast (~30 sec)
Triggers on `data/**`, `content/**`, `templates/**` changes. Validates + builds + uploads artifact.

### 2. `generate-pdf.yml` — Slow (~2 min)
Triggers on chapter or print template changes. Renders PDFs, commits them back.

### 3. `optimize-images.yml` — Slow but rare (~3 min)
Triggers on `assets/images/**` changes. Generates WebP + responsive variants.

**Vercel deploy:**
- **Manual only** (`deploymentEnabled: false`)
- Run `npm run deploy` (or use Vercel dashboard) → `vercel --prod`
- Daily limit: 100/day (safe buffer)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- Git >= 2.x

### Installation

```bash
git clone https://github.com/ravirajhere/autobiography.git
cd autobiography
npm install
npm run build
npm run serve
```

Open [http://localhost:5000](http://localhost:5000).

### Available Commands

| Command | What it does |
|---|---|
| `npm run build` | Full build (site + sitemap) |
| `npm run dev` | Watch mode (rebuilds on change) |
| `npm run serve` | Build + serve `dist/` locally |
| `npm run sitemap` | Regenerate sitemap only |
| `npm run generate-pdf` | Regenerate PDFs |
| `npm run optimize-images` | WebP + responsive variants |
| `npm run rename-images` | One-time image rename |

---

## 🧱 Technical Stack

| Layer | Technology |
|---|---|
| **Markup** | HTML5 (pre-rendered) |
| **Styling** | CSS3 with custom properties |
| **Scripting** | Vanilla JavaScript (no framework) |
| **Build** | Node.js + `markdown-it` |
| **PDF** | Puppeteer + A4 print CSS |
| **Images** | sharp (WebP + responsive) |
| **Hosting** | Vercel |
| **Fonts** | Google Fonts (Playfair Display, Lora, Inter) |
| **PWA** | Service Worker + Manifest |
| **Automation** | GitHub Actions (3 workflows) |

**Runtime dependencies:** 0 (all assets self-hosted)
**Build-time dependencies:** 5 (`markdown-it`, `markdown-it-footnote`, `puppeteer`, `sharp`, `serve`)

---

## 📜 License

**📖 Content** — © Ravi Raj Singh. All rights reserved.
**💻 Code** — Released under the **MIT License**. Free to use, modify, adapt.

---

## 📧 Contact

- **Email:** [raviraj2k09@gmail.com](mailto:raviraj2k09@gmail.com)
- **GitHub:** [@ravirajhere](https://github.com/ravirajhere)
- **LinkedIn:** [Ravirajhere](https://linkedin.com/in/Ravirajhere)
- **Location:** Patna, India

---

<div align="center">

### 📖 A story still being written.

**[⭐ Star this repo](https://github.com/ravirajhere/autobiography)** ·
**[🌐 Read the book](https://ravirajhere-author.vercel.app/book)** ·
**[📧 Write to the author](mailto:raviraj2k09@gmail.com)**

*Written by hand. No frameworks.*

---

[⬆ Back to Top](#-the-unfinished-story)

</div>