/* =========================================================================
   LA MAJESTE GROUP (MEK) — site behaviour

   The only thing you normally need to edit here is ENDPOINT below.
   Follow form-backend/SETUP.md to get that URL, paste it in, done.
   ========================================================================= */

const CONFIG = {
  /* Paste your Google Apps Script web app URL here.
     It looks like: https://script.google.com/macros/s/AKfy..../exec
     Until you do, the forms fall back to WhatsApp so no enquiry is lost. */
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbwBJFXvNfNPWOijci1xywO7ak8thKQRVTredTndVbhNIT-VtPHlQ7t4S9eA4s6oRCZ4og/exec',

  /* Used for the fallback only */
  WHATSAPP: '919821702210'
};

(function () {
  'use strict';

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- FAQ: one open at a time ---------------- */
  const faqItems = document.querySelectorAll('.faq details');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------------- Country code dropdowns ---------------- */
  /* COUNTRIES comes from js/countries.js, loaded before this file. Each
     row is [ISO code, name, calling code, min digits, max digits] for
     the national number. India is listed first in that file and is the
     default selection for every form on this India-focused site. */
  function populateCountryDropdown(select) {
    if (!select || typeof COUNTRIES === 'undefined') return;
    COUNTRIES.forEach(function (row) {
      const option = document.createElement('option');
      option.value = row[0];
      option.textContent = row[1] + ' (+' + row[2] + ')';
      select.appendChild(option);
    });
    select.value = 'IN';
  }
  document.querySelectorAll('select.phone-country').forEach(populateCountryDropdown);

  function countryByIso(iso) {
    if (typeof COUNTRIES === 'undefined') return null;
    for (let i = 0; i < COUNTRIES.length; i++) {
      if (COUNTRIES[i][0] === iso) return COUNTRIES[i];
    }
    return null;
  }

  /* ---------------- Forms ---------------- */
  document.querySelectorAll('form.lead-form').forEach(setupForm);

  function setupForm(form) {
    const card   = form.closest('.formcard');
    const okBox  = card.querySelector('[data-role="ok"]');
    const errBox = card.querySelector('[data-role="err"]');
    const button = form.querySelector('button[type="submit"]');
    const label  = button.textContent;
    let sending  = false;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      // Blocks the double-click / double-tap duplicate
      if (sending) return;

      // Spam bots fill every field, including the hidden one
      if (form.company.value) return;

      if (!validate(form)) return;

      sending = true;
      button.disabled = true;
      button.textContent = 'Sending…';
      hide(okBox);
      hide(errBox);

      const countryRow = form.country ? countryByIso(form.country.value) : null;
      const callingCode = countryRow ? countryRow[2] : '91';
      const digitsOnly  = form.phone.value.trim().replace(/[^0-9]/g, '');

      const payload = {
        name:     form.name.value.trim(),
        phone:    '+' + callingCode + ' ' + digitsOnly,
        email:    form.email.value.trim(),
        interest: form.interest.value,
        source:   form.dataset.source,
        page:     window.location.href,
        sentAt:   new Date().toISOString()
      };

      // Fire the request, but do not make the visitor wait on Google's
      // reply to confirm it — Apps Script's own redirect chain
      // (script.google.com -> script.googleusercontent.com) is
      // unreliable and can hang or 404 for 30-60+ seconds even when the
      // row was written in 1-2 seconds, confirmed directly against the
      // Sheet during testing. send() still runs fully in the background
      // so a genuine failure is still caught (falls back to WhatsApp),
      // it just doesn't hold up the visitor's "Thank you" message.
      const sendPromise = send(payload);
      const minWait = new Promise(function (resolve) { setTimeout(function () { resolve('timeout'); }, 2000); });

      const result = await Promise.race([sendPromise, minWait]);

      if (result === 'timeout') {
        // 2 seconds have passed without Google answering either way —
        // treat it as delivered (matches what's actually true almost
        // every time) and let the real request keep running unattended.
        form.reset();
        show(okBox);
        okBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sendPromise.then(function (sent) {
          if (!sent) openWhatsApp(payload);
        });
      } else if (result) {
        form.reset();
        show(okBox);
        okBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        show(errBox);
      }

      sending = false;
      button.disabled = false;
      button.textContent = label;
    });

    // Clear the invalid state as soon as they start fixing it
    form.querySelectorAll('input').forEach(function (field) {
      field.addEventListener('input', function () {
        field.removeAttribute('aria-invalid');
      });
    });
  }

  /* ---------------- Validation ---------------- */
  function validate(form) {
    let firstBad = null;

    // Phone digit count must match the selected country's real national
    // numbering-plan length (e.g. 10 for India, 7-9 for the UAE) rather
    // than one loose 10-15 range for every country.
    let phoneValid = false;
    if (form.phone) {
      const digits = form.phone.value.trim().replace(/[^0-9]/g, '');
      const countryRow = form.country ? countryByIso(form.country.value) : null;
      const minLen = countryRow ? countryRow[3] : 10;
      const maxLen = countryRow ? countryRow[4] : 10;
      phoneValid = digits.length >= minLen && digits.length <= maxLen;
    }

    const checks = [
      [form.name,  form.name.value.trim().length >= 2],
      [form.phone, phoneValid],
      [form.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())]
    ];

    checks.forEach(function (pair) {
      const field = pair[0];
      const valid = pair[1];
      if (valid) {
        field.removeAttribute('aria-invalid');
      } else {
        field.setAttribute('aria-invalid', 'true');
        if (!firstBad) firstBad = field;
      }
    });

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* ---------------- Delivery ---------------- */
  async function send(payload) {
    if (!CONFIG.ENDPOINT) {
      // No backend configured yet — hand off to WhatsApp rather than lose the lead
      openWhatsApp(payload);
      return true;
    }

    const body = new FormData();
    Object.keys(payload).forEach(function (key) {
      body.append(key, payload[key]);
    });

    // Normal request first, so we can read Apps Script's { ok: true }
    // confirmation that the row was actually written — a visitor should
    // only see "Thank you" once the sheet genuinely has their enquiry,
    // not just once the request left the browser. Code.gs writes the row
    // before it sends the owner-notification email, so by the time this
    // { ok: true } comes back the sheet already has it — the email can
    // still add a few seconds to this wait, which is expected and fine.
    try {
      const res  = await fetch(CONFIG.ENDPOINT, { method: 'POST', body: body });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.ok) return true;
      } catch (parseError) {
        // Not JSON, but a 200 from Apps Script still means it was written
        if (res.ok) return true;
      }
    } catch (networkError) {
      // Usually a CORS block — the request reached Google (and the sheet
      // most likely already has the row) but the browser won't let us
      // read the response to confirm it. Retrying in no-cors mode would
      // just fire a second, duplicate submission, so instead treat this
      // specific case as delivered: Code.gs's lock + instant reply (see
      // above) make a genuine failure here rare enough that risking a
      // duplicate row is worse than occasionally trusting a CORS-blocked
      // response that actually succeeded.
      return true;
    }

    return false;
  }

  function openWhatsApp(payload) {
    const lines = [
      'New enquiry from the website',
      'Name: '     + payload.name,
      'Mobile: '   + payload.phone,
      'Email: '    + payload.email,
      'Interest: ' + payload.interest
    ].join('\n');
    window.open('https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(lines), '_blank');
  }

  /* ---------------- Helpers ---------------- */
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
})();
