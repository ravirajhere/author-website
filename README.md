# Author Website — Ravi Raj Singh

Personal author website and book reader for **Ravi Raj Singh** — writer from Patna, India.

Live: [ravirajhere-author.vercel.app](https://ravirajhere-author.vercel.app)

---

## About

The author website for **"A Boy Who Never Thought"** — an 11-chapter bilingual memoir covering 2008 to 2019. Built with hand-written HTML, CSS, and JavaScript, plus a serverless backend for newsletter signups and book PDF generation.

**Companion projects:**
- [Portfolio](https://github.com/ravirajhere/portfolio) — frontend developer portfolio
- [Snake Game](https://github.com/ravirajhere/snake-game) — Nokia Snake, hand-written
- [CLI Portfolio](https://github.com/ravirajhere/cli-portfolio) — `npx ravirajhere`

---

## Pages

| Page | Purpose |
|------|---------|
| [index.html](index.html) | Redirect to `author.html` |
| [author.html](author.html) | Author home — hero, about, book synopsis, newsletter, contact |
| [book.html](book.html) | Book reader — 11 chapters, English + Hinglish |
| [print.html](print.html) | Print route for PDF generation (`noindex`) |
| [404.html](404.html) | Custom 404 page |

---

## About the Book

**"A Boy Who Never Thought"** — Safar Se Safar Tak.

An 18-year journey from 2008 to 2026. Written in both **English** and **Hinglish**. Currently 11 chapters — the story continues.

Read free: [book.html](book.html)

---

## Tech Stack

### Frontend

- **HTML5** — hand-written, semantic
- **CSS3** — custom properties, no frameworks
- **JavaScript** — vanilla, no dependencies
- **No build step** — every line written by hand

### Backend (Serverless)

- **Vercel Functions** — 2 API endpoints
- **Resend** — welcome email delivery
- **Supabase** — Postgres database (newsletter subscribers)
- **Vercel Blob** — file storage (book PDF cache)
- **Puppeteer + Chromium** — server-side PDF generation (in progress)

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscribe` | POST | Newsletter signup — Supabase + welcome email via Resend |
| `/api/book-pdf` | POST | Book PDF generation — Chromium (work in progress) |

---

## Features

### For Readers

- **Bilingual book reader** — English + Hinglish toggle
- **Reading progress** — saved across sessions (localStorage)
- **PDF export** — client-side (`ebook.js`) with server-side fallback
- **Newsletter** — subscribe for book updates
- **Chapter navigation** — sidebar TOC, keyboard arrows

### Infrastructure

- **Custom 404** — playful error page (cream + gold theme)
- **SEO** — canonical tags, OG tags, Twitter cards, Schema.org JSON-LD (Person + Book), sitemap.xml, robots.txt
- **Analytics** — Vercel Web Analytics (privacy-friendly, no cookies)
- **Accessibility** — skip links, focus states, ARIA labels, reduced-motion
- **Security** — server-side keys, rate limiting, honeypot, CORS headers
- **Social** — custom OG image (`og-cover.jpg`, 1200×630)

---

## Folder Structure

    /
    ├── index.html              # Redirect to author.html
    ├── author.html             # Author home
    ├── book.html               # Book reader (11 chapters, EN + HI)
    ├── print.html              # Print route for PDF (noindex)
    ├── 404.html                # Custom 404
    ├── sitemap.xml             # SEO sitemap
    ├── robots.txt              # Crawler rules
    ├── package.json            # Backend dependencies
    ├── vercel.json             # Function config
    ├── api/                    # Serverless functions
    │   ├── subscribe.js
    │   └── book-pdf.js
    ├── css/
    │   ├── author.css
    │   ├── book.css
    │   ├── print.css
    │   └── 404.css
    ├── js/
    │   ├── author.js
    │   ├── book.js
    │   ├── ebook.js            # Client-side PDF fallback
    │   └── print.js
    └── assets/
        ├── favicon.png
        └── images/
            ├── bookcover.jpg
            ├── backcover.jpg
            ├── casual.jpg
            ├── signature.jpg
            ├── child.jpg
            ├── 2010s.jpg
            ├── bday-12.jpg
            └── og-cover.jpg    # Social share image (1200×630)

---

## Local Development

### Frontend only

No build step. Open any HTML file in a browser.

For best results, run a local server:

    python -m http.server 8000

Then open: http://localhost:8000

### With backend (API routes)

Backend functions need Vercel environment. Install dependencies first:

    npm install

Then run:

    vercel dev

Required environment variables:

    RESEND_API_KEY=re_xxxxx
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_ANON_KEY=sb_publishable_xxxxx
    BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
    AWS_LAMBDA_JS_RUNTIME=nodejs22.x

---

## Deploy

Hosted on **Vercel**. Push to `main` branch — site updates automatically.

    git add .
    git commit -m "Update"
    git push origin main

Vercel auto-detects `api/` folder and deploys serverless functions.

---

## Environment Variables

Set in Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Email delivery (newsletter welcome) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage access |
| `AWS_LAMBDA_JS_RUNTIME` | Chromium runtime compatibility |

---

## Database Schema

**Supabase** — `subscribers` table (shared with portfolio):

    create table subscribers (
      id bigserial primary key,
      email text not null unique,
      source text default 'author',
      created_at timestamptz default now()
    );

Row Level Security enabled:
- Anonymous insert allowed (subscribe form)
- Anonymous reads blocked (privacy)

**Vercel Blob** — `ravirajhere-pdfs` store (shared with portfolio):

    pdf/
    ├── book-en-v1.pdf
    ├── book-hi-v1.pdf
    └── resume-v3.pdf

---

## Cross-linking

**This project links to:**
- Portfolio: [ravirajhere.vercel.app](https://ravirajhere.vercel.app)
- Contact form: [ravirajhere.vercel.app/contact.html?from=author](https://ravirajhere.vercel.app/contact.html?from=author)

**Portfolio links to this project:**
- Author page: [ravirajhere-author.vercel.app](https://ravirajhere-author.vercel.app)
- Book reader: [ravirajhere-author.vercel.app/book.html](https://ravirajhere-author.vercel.app/book.html)

---

## Contact

- **Email:** raviraj2k09@gmail.com
- **GitHub:** [@ravirajhere](https://github.com/ravirajhere)
- **LinkedIn:** [Ravirajhere](https://linkedin.com/in/Ravirajhere)

Or use the [contact form](https://ravirajhere.vercel.app/contact.html?from=author).

---

## License

Content © 2026 Ravi Raj Singh. All rights reserved.

Code is open for reference and learning.

---

**Made With ❤️ & Curiosity**
