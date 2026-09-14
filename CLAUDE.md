# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static marketing/landing site for LA MAJESTE GROUP (MEK), advertising two real
estate developments in Mumbra, Thane: **Grand Meridian City** (residential) and
**MEK Grand Central** (commercial). Plain HTML/CSS/JS — no framework, no build
step, no npm. This was deliberately chosen over React/Next.js: the site has a
fixed, small set of pages and no need for templating, a CMS, or dynamic data,
so a build pipeline would add maintenance cost without benefit.

## File layout

```
index.html            the entire page — all sections, marked with comments
css/styles.css         all styling; colour/font tokens live in :root at the top
js/main.js             lead-form submission logic + FAQ accordion behaviour
form-backend/Code.gs    Google Apps Script that receives form submissions
form-backend/SETUP.md   how to deploy Code.gs as a Google Apps Script web app
assets/img/             site images (currently mostly placeholder/hotlinked —
                        see assets/img/README.txt for what's still needed)
robots.txt, sitemap.xml SEO plumbing
```

## Running locally

No build step. Either:
- Open `index.html` directly in a browser, or
- `python -m http.server 8000` from the project root and visit `localhost:8000`
  (forms and some browser features behave better over an actual server)

There is no test suite, linter, or build command — there is nothing to compile.

## Deployment

Static hosting on **Netlify**, connected to the GitHub repo
(`lmindustrieswork-creator/Mek-Grand-City`, branch `main`) for auto-deploy on
push. Build command: none. Publish directory: `.` (repo root).

Custom domain is `mekgrandcity.com`, registered at GoDaddy. DNS: a CNAME on
`www` points at the Netlify site; the bare domain is forwarded (GoDaddy
domain forwarding, not a DNS A-record) to `https://www.mekgrandcity.com`,
which is the actual primary/canonical address with the real SSL certificate.

## Lead capture architecture

Both `<form class="lead-form">` instances (hero + closing section) post via
`fetch()` in `js/main.js` to a Google Apps Script web app URL
(`CONFIG.ENDPOINT`). That script (`form-backend/Code.gs`) appends a row to a
Google Sheet and emails a notification — no third-party form service, no
submission cap. If `CONFIG.ENDPOINT` is empty, or the request fails, the form
falls back to opening a pre-filled WhatsApp chat so no lead is silently lost.

Known Google Sheets quirk already worked around in `Code.gs`: phone numbers
starting with `+` get misread as formulas (`#ERROR!`) unless written with a
leading apostrophe to force plain-text — see the comment above
`tab.getRange(tab.getLastRow(), 3).setValue(...)` in `doPost`.

Redeploying `Code.gs` after an edit requires **Deploy → Manage deployments →
(pencil) → Version: New version → Deploy** in the Apps Script editor — Apps
Script serves whatever was live at the last deploy, not the latest saved code.

## Content consistency rules

- **Phone number** and **WhatsApp number** appear in many places across
  `index.html` (tel: links, wa.me links, JSON-LD `telephone`, FAQ text) and in
  `CONFIG.WHATSAPP` in `js/main.js`. All must match — search-and-replace all
  occurrences together.
- **Prices** appear in three places that must stay consistent: the pricing
  `<table>` for each project, the matching FAQ answer text, and the
  `application/ld+json` structured-data block near the end of `index.html`.
  Google penalises pages whose visible prices disagree with their structured
  data.
- **Domain** (`mekgrandcity.com`) is hardcoded in `index.html` (canonical link,
  `og:url`, `og:image`, JSON-LD `@id`/`url` fields), `robots.txt`, and
  `sitemap.xml` — all must agree if the domain ever changes.
- Colour/font rebrands should only touch the `:root` custom properties at the
  top of `css/styles.css` — the rest of the stylesheet consumes those tokens
  and rarely needs direct edits.
