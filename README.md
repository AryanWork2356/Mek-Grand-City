# La Majeste Group (MEK) — landing site

Plain HTML, CSS and JavaScript. No build step, no npm, no framework. Open the
folder in VS Code, edit, save, refresh the browser.

```
index.html            the whole page
css/styles.css        all styling, with the colour and font tokens at the top
js/main.js            form handling and the FAQ
form-backend/         Google Apps Script that receives the leads
assets/img/           your images go here
robots.txt            tells search engines they may index the site
sitemap.xml           lists your pages for Google
```

---

## Running it locally

Double-clicking `index.html` works for a quick look, but forms and some browser
features behave better over a local server.

In VS Code, install the **Live Server** extension, then right-click
`index.html` → **Open with Live Server**. It reloads as you save.

If you have Python: `python -m http.server 8000`, then open
`http://localhost:8000`.

---

## Making changes

### Colours and fonts

Everything is at the top of `css/styles.css`:

```css
:root{
  --marigold : #DFA01C;   /* the gold accent */
  --slate    : #18292F;   /* the dark sections */
  --display  : 'Instrument Serif', ...;
}
```

Change a value there and it updates everywhere. You should rarely need to go
further down the file.

### Text, prices, distances

All in `index.html`, in plain readable HTML between clearly marked section
comments. Search for the text you want to change.

If you update a **price**, change it in three places so they stay consistent:
the pricing table, the FAQ answer, and the structured data block at the bottom
of `index.html`. Google penalises pages whose visible prices disagree with
their structured data.

### Phone number

It appears in several places. Find and replace the current number across
`index.html`, and update `WHATSAPP` in `js/main.js`.

### Adding a section

Copy an existing `<section>` in `index.html`, paste it where you want it, change
the content and the `id`. Add the id to the nav if you want a menu link.

---

## Lead capture

Enquiries go to a Google Sheet and your email. Full instructions in
`form-backend/SETUP.md` — about ten minutes.

Until you set that up, the forms fall back to opening WhatsApp with the
enquiry pre-filled, so nothing is lost while you get it running.

---

## Putting it online

Any static host works. Two good free options:

### Netlify — easiest

1. Sign up at netlify.com
2. Drag this whole folder onto the dashboard
3. It's live in seconds on a `something.netlify.app` address
4. **Domain settings → Add custom domain** when you have one

To update afterwards, drag the folder again, or connect a GitHub repo so it
deploys on every push.

### Cloudflare Pages

Similar, with faster delivery in India. Connect a GitHub repo or upload directly.

### Before you go live

- Domain is `mekgrandcity.com` — already set in `index.html` (canonical, og:url,
  structured data), `robots.txt` and `sitemap.xml`
- Download the images into `assets/img/` and switch the URLs — see
  `assets/img/README.txt`
- Add `favicon.png` and `share.jpg`
- Set up the form backend and test one submission

---

## SEO

Already in place: title and description, canonical URL, WhatsApp and social
preview tags, structured data for both projects and all seven FAQ answers, a
sitemap, semantic headings and image alt text.

After launch:

1. Add the site to **Google Search Console** and submit `sitemap.xml`
2. Check the structured data at **search.google.com/test/rich-results**
3. Create a **Google Business Profile** for the site office — for local property
   searches this does more than anything on the page itself

Realistic expectation: you will not outrank MagicBricks or 99acres for
"flats in Mumbra", and chasing that is not a good use of budget. What you can
own is your own project names — someone who saw your ad and later searches
"Grand Meridian City Mumbra" should find you first. Volume comes from Meta and
Google ads pointed at this page.

---

## Notes on the build

- No framework, so nothing to update and nothing to break in two years
- Loads fast: one CSS file, one small JS file, images lazy-loaded below the fold
- Works down to small phones, which is where most of your traffic will be
- Keyboard navigable with visible focus, and honours reduced-motion settings
- Prices, RERA numbers and possession dates are marketing claims from the
  source material — check them against the MahaRERA filings before publishing
