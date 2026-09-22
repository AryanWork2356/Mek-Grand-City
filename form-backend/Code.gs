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

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    // Two people submitting at the same instant would otherwise overwrite a row
    lock.waitLock(20000);

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
    // A leading apostrophe forces Sheets to store this as literal text,
    // otherwise "+91 ..." gets parsed as the start of a formula (#ERROR!).
    tab.appendRow(row);
    tab.getRange(tab.getLastRow(), 3).setValue(phone ? "'" + phone : '');

    // The website waits for this reply before it shows "Thank you" — and
    // a visitor was seeing "Sending…" for 10+ seconds after their row was
    // already in the sheet, because MailApp.sendEmail() used to run
    // (synchronously, taking several seconds) before this function could
    // return. Apps Script has no true fire-and-forget within one
    // execution, so the fix is a real one-off trigger: queueNotification()
    // schedules notify() to run moments from now, in its own separate
    // execution, and this function returns immediately after — the
    // website sees success right after the write that actually matters,
    // and the email still goes out on its own a few seconds later.
    queueNotification(row);

    return reply({ ok: true });

  } catch (err) {
    // Logged under Executions in the Apps Script editor
    console.error(err);
    return reply({ ok: false, error: String(err) });

  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
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

/** Schedules notify(row) to run a few seconds from now, in a separate
 *  execution, so doPost can return to the website immediately instead of
 *  waiting for MailApp.sendEmail() to finish. The row is stashed in
 *  ScriptProperties (keyed by the trigger's own id, so concurrent
 *  submissions never collide) and runNotification below reads it back
 *  when the trigger fires, then deletes both the property and the
 *  trigger — Apps Script does not clean up one-off triggers on its own,
 *  and a leaked trigger would silently stop new ones from being created
 *  after enough submissions pile up. */
function queueNotification(row) {
  const trigger = ScriptApp.newTrigger('runNotification')
    .timeBased()
    .after(1000)
    .create();

  PropertiesService.getScriptProperties()
    .setProperty('notify_' + trigger.getUniqueId(), JSON.stringify(row));
}

/** Fired by the one-off trigger queueNotification() creates. Never called
 *  directly, and never called with no matching trigger left to identify
 *  itself by — Apps Script passes the firing trigger's id in the event
 *  object for time-based triggers. */
function runNotification(e) {
  const props = PropertiesService.getScriptProperties();
  const triggerId = e && e.triggerUid ? String(e.triggerUid) : null;

  try {
    if (triggerId) {
      const stored = props.getProperty('notify_' + triggerId);
      if (stored) notify(JSON.parse(stored));
    }
  } finally {
    if (triggerId) props.deleteProperty('notify_' + triggerId);
    // Remove this one-off trigger so it cannot fire again and so Apps
    // Script's per-project trigger quota does not fill up over time.
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === 'runNotification' &&
          (!triggerId || t.getUniqueId() === triggerId)) {
        ScriptApp.deleteTrigger(t);
      }
    });
  }
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

  MailApp.sendEmail({
    to: NOTIFY,
    subject: 'New enquiry — ' + name + ' — ' + interest,
    body: body,
    replyTo: email || undefined
  });
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
