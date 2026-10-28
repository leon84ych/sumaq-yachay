# Add Catalog Entry

A catalog entry describes a book or another learning source. **Register Source** offers two methods:
**New data source**, which creates an entry from fields you fill in, and **URL**, which clones an existing Google Sheet.

## Clone an existing sheet from a URL

1. Open **Catalog** and select **Register Source**.
2. Select **URL** as the registration method. Only the Google Sheet URL field is shown; no ID, name, author, or other catalog fields are required.
3. Paste the Google Sheets URL, for example `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
4. Read the notice that an existing sheet will be cloned and added as a source to your catalog. The original is used only as the source.
5. Select **Clone Sheet** and wait for the response. The request can take up to one minute; the dialog blocks repeated submissions and dismissal while it is pending.
6. On success, the application refreshes the catalog and closes the dialog. The cloned source is added alongside your existing entries.

URL cloning requires sign-in, administrator permissions, a configured backend, and access to the
source sheet. It is not available in **Local Sample Data** mode. Unlike cloning an entire master
catalog, adding one source does not require an empty catalog.

If cloning fails, the dialog remains open with the error and your URL. If the sheet was cloned
but the catalog could not be refreshed, close the dialog and use **Sync Remote (GET)** before
attempting another clone. After a timeout, check whether the copy already exists before retrying.

## Create a new data source

1. Open **Catalog** and select **Register Source**.
2. Keep **New data source** selected.
3. Provide a unique **Catalog ID** and a **Catalog Name**. Both are required and allow up to 100 characters.
4. Fill in **Subject**, **Topic**, and **Author**; these fields are required.
5. Add an optional description or source reference.
6. Set the **Active** checkbox as appropriate.
7. Submit the form using **Register Source**.

The create action requires the appropriate permissions. If it is unavailable, check your sign-in status and role, or use Local Sample Data to experiment locally.

## Entry with a link

In **New data source** mode, put a reference address in the optional **Source** field. This can
describe a PDF, website, video, or other material. A source reference does not clone a sheet or
grant access to another person's content. Use **URL** mode when you actually want to clone a Google Sheet.

To clone an entire master catalog from a shared source, use **Clone Master Catalog** instead. This action is available when your catalog is empty.

## User-defined entry

Leave **Source** empty and describe your own material using the required fields and description. You can organize a personal study subject without an external reference URL.

## Review and edit

Find the entry using search or the catalog filters. Open it to inspect its content, or use **Edit**
to update its details. Editing keeps the existing fields-only form; URL cloning is a registration
method, not an edit operation. The ID cannot be changed while editing an existing entry.

Check the synchronization status after saving. In Local Sample Data mode, changes remain on this device and are not sent to the server.