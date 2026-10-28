# Configuration

Open **Settings** in the top navigation to configure your workspace.

## Appearance and language

- **Theme:** choose Light or Dark. The application and manual update together.
- **Text Size:** decrease or increase the reading size.
- **Language:** select English or Spanish. The manual switches to the matching translation of the current topic when available.

These preferences are saved in this browser.

## Connect your backend

1. Locate **Google Apps Script Web App URL** in Settings.
2. Enter the deployed web app address supplied by your administrator. It normally has this form:

   ```text
   https://script.google.com/macros/s/DEPLOYMENT_ID/exec
   ```

3. Select **Save Changes**.
4. Return to Catalog and use **Sync Remote (GET)** to retrieve remote data when available to your role.

The saved URL takes priority over the application's default backend. Use a deployed web app URL, not a Google Sheets sharing URL. Sign in when an operation requires authentication.

Google Apps Script requests have a **one-minute (60-second)** timeout. Allow the request to finish,
especially when using **Clone Master Catalog**; do not repeatedly submit while it is pending.

## Try local sample data

Enable **Local Sample Data** and confirm the warning. Sample data and edits are stored on this device; requests are not sent to the application server while this mode is enabled. Turn it off when you want to use remote data again.

## Clear local data

**Delete all local data** removes the local browser database after confirmation. Server data is not changed. Preserve any local-only work before deleting, and refresh the page before syncing again.

## Connection problems

Check your connection, the deployed web app URL, your sign-in status, and access permissions. If you expect remote data, make sure Local Sample Data is disabled.