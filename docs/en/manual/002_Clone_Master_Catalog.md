# Clone Master Catalog

A master catalog is a Google spreadsheet that lists learning sources. **Clone Master Catalog**
creates a copy in your own Drive and loads your catalog from it. The original shared spreadsheet
is only the source; there is no option to use it as your live shared catalog.

## Before you begin

- Obtain the source's Google Sheets sharing link and confirm that the application can read it.
- Configure the Google Apps Script backend and sign in with the required permissions.
- Turn off **Local Sample Data**. Cloning is a remote operation and is unavailable in sample mode.
- Start with an empty catalog. The clone action is shown only when the catalog list is empty; it is not a way to merge another master catalog into an existing one.

## Clone the catalog

1. Open **Catalog** and select **Clone Master Catalog**.
2. Paste the Google Sheets URL into the spreadsheet link field. For example:

   ```text
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

3. Read the message explaining that the catalog is about to be cloned into your own Drive and that the original is used only as the source.
4. Select **Clone Master Catalog** to confirm. No mode, checkbox, or option selection is required.
5. Wait for the response. A Google Apps Script request can take up to **one minute (60 seconds)**. The dialog prevents repeat submissions and dismissal while cloning.
6. On success, the application refreshes your catalog from the backend and closes the dialog.

You can cancel before submitting. Sharing a URL does not itself grant access to the source;
check its sharing permissions with the owner if the application cannot read it.

## After cloning

Review the catalog list, then open a source to inspect its learning material. Use **Sync Remote (GET)**
to refresh data when needed. Cloning the master catalog does not guarantee access to every source
linked inside it, and does not automatically make every domain's content available locally.

## If cloning fails

Check the URL, sign-in status, source permissions, connection, and configured web app address.
The error remains in the dialog so you can review it before retrying.

If the request times out, check your Drive and use **Sync Remote (GET)** before submitting another
clone. A browser timeout does not prove that the server-side script stopped; it may already have
created the copy. Do not repeatedly submit the same clone while the original request is pending.