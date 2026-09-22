/**
 * LA MAJESTE GROUP (MEK) — lead handler
 *
 * Writes every website enquiry into a Google Sheet (which opens in Excel)
 * and emails you a copy the moment it arrives.
 *
 * This runs inside your own Google account. There is no third-party form
 * service involved, no monthly fee and no submission limit.
 *
 * Setup instructions are in SETUP.md next to this file.
 */

// ---- EDIT THESE TWO LINES ----
const NOTIFY = 'lmindustrieswork@gmail.com';   // who gets the email. Comma-separate for several.
const TAB    = 'Leads';             // sheet tab name. Created automatically.
// ------------------------------

const HEADERS = ['Received', 'Name', 'Mobile', 'Email', 'Interest', 'Form', 'Page'];

/** TEMPORARY DIAGNOSTIC BUILD. Logs a timestamp at every step so the
 *  Executions panel (Apps Script editor -> Executions, click the run,
 *  expand the log) shows exactly which step is actually slow, instead of
 *  guessing. Once the real bottleneck is known, this gets replaced with
 *  a real fix targeted at that step. */
function doPost(e) {
  const t0 = Date.now();
  function mark(label) { console.log(label + ': +' + (Date.now() - t0) + 'ms'); }

  const lock = LockService.getScriptLock();

  try {
    mark('start');
    // Two people submitting at the same instant would otherwise overwrite a row
    lock.waitLock(20000);
    mark('lock acquired');

    const p = (e && e.parameter) ? e.parameter : {};

    const phone = normalisePhone(p.phone);

    const row = [
      new Date(),
      clean(p.name),
      phone,
      clean(p.email),
      clean(p.interest),
      clean(p.source),
      clean(p.page)
    ];

    const tab = sheet();
    mark('sheet() returned');
    // A leading apostrophe forces Sheets to store this as literal text,
    // otherwise "+91 ..." gets parsed as the start of a formula (#ERROR!).
    tab.appendRow(row);
    mark('row appended');
    tab.getRange(tab.getLastRow(), 3).setValue(phone ? "'" + phone : '');
    mark('phone cell formatted');

    notify(row);
    mark('notify() returned (email sent)');

    const result = reply({ ok: true });
    mark('reply object built, about to return');
    return result;

  } catch (err) {
    // Logged under Executions in the Apps Script editor
    console.error(err);
    return reply({ ok: false, error: String(err) });

  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
    mark('lock released, function ending');
  }
}

/** Lets you open the web app URL in a browser to check it is deployed. */
function doGet() {
  return reply({ ok: true, message: 'Lead handler is running. Submissions must be POSTed.' });
}

function sheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let tab = book.getSheetByName(TAB);

  if (!tab) {
    tab = book.insertSheet(TAB);
  }

  if (tab.getLastRow() === 0) {
    tab.appendRow(HEADERS);
    tab.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    tab.setFrozenRows(1);
    tab.setColumnWidth(1, 150);
    tab.setColumnWidth(5, 240);
    tab.setColumnWidth(7, 260);
  }

  // Column C (Mobile) starts with "+", which Sheets otherwise tries to
  // read as a formula. Plain-text format stops that permanently.
  tab.getRange('C:C').setNumberFormat('@');

  return tab;
}

function notify(row) {
  if (!NOTIFY || NOTIFY === 'you@example.com') return;

  const name     = row[1];
  const phone    = row[2];
  const email    = row[3];
  const interest = row[4];
  const form     = row[5];

  const body =
    'A new enquiry just came in from the website.\n\n' +
    'Name      : ' + name + '\n' +
    'Mobile    : ' + phone + '\n' +
    'Email     : ' + email + '\n' +
    'Interest  : ' + interest + '\n' +
    'Form      : ' + form + '\n' +
    'Page      : ' + row[6] + '\n\n' +
    'Call back: tel:' + phone + '\n' +
    'WhatsApp : https://wa.me/' + phone.replace(/[^0-9]/g, '') + '\n\n' +
    'Full list: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();

  const emailStart = Date.now();
  MailApp.sendEmail({
    to: NOTIFY,
    subject: 'New enquiry — ' + name + ' — ' + interest,
    body: body,
    replyTo: email || undefined
  });
  console.log('MailApp.sendEmail took: ' + (Date.now() - emailStart) + 'ms');
}

/** Indian mobiles arrive in several shapes. Store one consistent format. */
function normalisePhone(value) {
  let digits = String(value || '').replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
  if (digits.length === 11 && digits.indexOf('0') === 0)  digits = digits.slice(1);
  return digits ? '+91 ' + digits : '';
}

function clean(value) {
  return String(value == null ? '' : value).trim().slice(0, 500);
}

function reply(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
