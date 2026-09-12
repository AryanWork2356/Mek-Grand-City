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
  WHATSAPP: '919356316014'
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

      const payload = {
        name:     form.name.value.trim(),
        phone:    form.phone.value.trim(),
        email:    form.email.value.trim(),
        interest: form.interest.value,
        source:   form.dataset.source,
        page:     window.location.href,
        sentAt:   new Date().toISOString()
      };

      const sent = await send(payload);

      if (sent) {
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

    const checks = [
      [form.name,  form.name.value.trim().length >= 2],
      [form.phone, /^[0-9+ ]{10,15}$/.test(form.phone.value.trim())],
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

    // Normal request first, so we can read the confirmation
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
      // Usually a CORS block. The request may still have reached Google,
      // but we cannot read the answer, so send it again in a mode that
      // always goes through and treat that as delivered.
      try {
        await fetch(CONFIG.ENDPOINT, { method: 'POST', mode: 'no-cors', body: body });
        return true;
      } catch (finalError) {
        if (window.console) console.error('[lead] delivery failed:', finalError);
        return false;
      }
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
