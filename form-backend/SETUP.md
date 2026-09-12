# Getting leads into email and a spreadsheet

About ten minutes, once. No paid service, no submission limit, and the data
sits in your own Google account.

When someone submits the form, two things happen: a row is added to a Google
Sheet, and you get an email with the details and a click-to-call link.

---

## 1. Make the spreadsheet

1. Go to **sheets.new** (signed in to the Google account that should own the leads)
2. Name it something like `La Majeste — Website Leads`

You don't need to add any columns. The script creates them.

## 2. Add the script

1. In that sheet: **Extensions → Apps Script**
2. Delete whatever is in the editor
3. Open `Code.gs` from this folder, copy everything, paste it in
4. Near the top, change this line to your real address:

   ```js
   const NOTIFY = 'you@example.com';
   ```

   For more than one recipient, separate with commas:
   `'sales@yourcompany.com, you@gmail.com'`

5. Click the save icon

## 3. Deploy it

1. **Deploy → New deployment**
2. Click the gear next to "Select type" and choose **Web app**
3. Set:
   - **Description**: anything, e.g. `lead handler`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. Click **Deploy**

**"Who has access: Anyone" is required.** Visitors to your site aren't signed in
to Google. It doesn't expose your spreadsheet — only this one script can be
called, and all it does is add a row.

## 4. Approve the permissions

Google will ask you to authorise. You'll see a warning screen because the script
isn't verified by Google — that's expected for your own scripts.

Click **Advanced**, then **Go to (your project name) (unsafe)**, then **Allow**.

It's asking for permission to edit this spreadsheet and send email as you. That's
exactly what it does.

## 5. Copy the URL into the site

After deploying you get a **Web app URL** ending in `/exec`. Copy it.

Open `js/main.js` and paste it here:

```js
const CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfy..../exec',
  ...
```

Save. Done.

## 6. Test it

1. Open `index.html`, fill in the form, submit
2. You should see the green confirmation
3. Check the spreadsheet — a new row
4. Check your inbox — an email

---

## If something doesn't work

**No row and no email.** Open the Apps Script editor and click **Executions** in
the left sidebar. Failed runs show the error there.

**Row appears but no email.** Check the `NOTIFY` address, and look in spam.
Gmail allows roughly 100 emails a day from Apps Script, which is well above
normal lead volume but worth knowing.

**Nothing happens at all.** Confirm the URL in `main.js` ends in `/exec`, not
`/dev`. The `/dev` URL only works while you're signed in, which is exactly the
trap that makes it look fine in testing and fail for real visitors.

**You changed the script and it still behaves the old way.** Apps Script serves
the last *deployed* version, not the last saved one. Go to
**Deploy → Manage deployments**, click the pencil, set Version to **New version**,
and Deploy again.

---

## Getting the leads into Excel

The Google Sheet **is** your live database. To work with it in Excel:

**File → Download → Microsoft Excel (.xlsx)**

Or, if you'd rather Excel stay current automatically:
**File → Share → Publish to web → Comma-separated values**, then in Excel use
**Data → From Web** with that link.

For day-to-day use, the Sheet on your phone is usually faster than either.
