# Backend Architecture Specification: Authenticated Auto-Provisioning Model

This document details the backend architecture, sequence flows, component responsibilities, and validation milestones for the `sumaq-yachay` proxy layer.

> **Update:** The original **Template Copy Model** (manual "Make a Copy" of a Google Sheet template + per-user Apps Script deployment, `Who has access: Anyone`) has been replaced by an **Authenticated Auto-Provisioning Model**. Users now sign in with **Google Identity Services (GIS)** in the Angular client; every `GET`/`POST` call carries the user's Google ID token, which Apps Script verifies to resolve the caller's identity. On first use, Apps Script **automatically creates** the Master Index Spreadsheet for that identity (and, per catalog item, the linked Domain Data Spreadsheet) if it doesn't already exist — no manual template copying is required anymore. See [🔐 Authentication & Auto-Provisioning](#-authentication--auto-provisioning) below.

---

## 🏗️ Architecture & Component Responsibilities

```
+-----------------------------------------------------------------------------------+
|                               USER'S GOOGLE DRIVE                                 |
|                                                                                   |
|  +---------------------------+                +--------------------------------+  |
|  |    Master Index Sheet     |                |      Domain Data Sheets        |  |
|  |  (Catalog of Data Sources)|                |  (Words, Concepts, Relations)  |  |
|  +-------------+-------------+                +---------------+----------------+  |
|                | Read Catalog                                 | Read Rows         |
|                +----------------------+-----------------------+                   |
|                                       |                                           |
|                                       v                                           |
|                   +---------------------------------------+                       |
|                   |  Google Apps Script (GAS) Web App     |                       |
|                   |  - Execution Context: User Account    |                       |
|                   |  - Access Level: Anyone               |                       |
|                   |  - Output: JSON (ContentService)      |                       |
|                   +-------------------+-------------------+                       |
+---------------------------------------|-------------------------------------------+
                                        |
                                        | HTTPS GET (JSON)
                                        v
+-----------------------------------------------------------------------------------+
|                                 ANGULAR CLIENT                                    |
|                                                                                   |
|                   +---------------------------------------+                       |
|                   |     Settings & Configuration View     |                       |
|                   |  (Stores Web App Endpoint URL)        |                       |
|                   +-------------------+-------------------+                       |
|                                       |                                           |
|                                       v                                           |
|                   +---------------------------------------+                       |
|                   |           DataSyncService             |                       |
|                   |  (HTTP Client, Schema Normalizer)     |                       |
|                   +-------------------+-------------------+                       |
|                                       |                                           |
|                                       v                                           |
|                   +---------------------------------------+                       |
|                   |        IndexedDB (Dexie.js)           |                       |
|                   |  (Local Persistence & Atomic Writes)  |                       |
|                   +---------------------------------------+                       |
+-----------------------------------------------------------------------------------+
```

### Component Breakdown

#### 1. Master Index Sheet (Google Sheet)
* **Responsibility:** Serves as the central inventory/registry for all Catalog entries owned by the user.
* **Schema Layout:**
  * `SheetID` (First element/column of the Master Index. The unique Google Sheet ID of the linked Domain Data Spreadsheet. **Updatable only directly within the Google account/Sheet** — never through the Catalog UI or API.)
  * `ID` (Unique identifier)
  * `Subject` (Entity schema subject)
  * `Topic` (Entity schema topic)
  * `Name` (Human-readable title)
  * `Author` (Entity schema author)
  * `Description` (Optional context)
  * `Source` (Optional source URL/reference)
  * `Active` (`TRUE` | `FALSE`)
  * `UpdatedAt` (ISO-8601 timestamp)
* **SheetID Handling:** `SheetID` is read by Apps Script alone. It is never returned in GET responses, never accepted in POST payloads, and has no corresponding field on `CatalogItem` — it cannot be listed, created, updated, or deleted from the app.

#### 1a. Domain Data Sheets (Google Sheet Tabs)
* **Responsibility:** Each tab in the linked Domain Data Spreadsheet (e.g. `Words`, `Concepts`, `Relations`) holds one domain's rows.
* **Name-Driven Rendering:** There is no `Type` column. The Apps Script proxy reports each sheet's **tab name** back to the client, and the Angular dispatcher selects the matching view component (`Concepts` → column-based easy-read view, `Relations` → graph view, etc.) based on that name.

#### 2. Google Apps Script Proxy (`doGet(e)` / `doPost(e)`)
* **Responsibility:** Verifies the caller's Google ID token (`idToken` request parameter), resolves the Master Index Spreadsheet **for that authenticated identity** — creating it automatically on first use if none exists — reads the reserved Domain Data Spreadsheet ID from it (never from request parameters), opens the spreadsheet(s) via `SpreadsheetApp.openById()` **within the script's own execution context**, and serves/persists rows over `HTTP GET`/`POST`.
* **Security & Execution Boundary:** Requests without a valid, unexpired `idToken` are rejected with an error response before any Sheets access occurs. The Domain Data Spreadsheet ID is resolved entirely server-side and is **never accepted as an input parameter nor included in the JSON output**, preventing callers from supplying or discovering arbitrary Sheet IDs.
* **Auto-Provisioning:** `CREATE_CATALOG_ITEM` no longer assumes a pre-existing Domain Data Spreadsheet — if the entry's linked file doesn't exist yet, GAS creates it as part of the same request and stores the initial row(s).

#### 3. Angular Sync Engine (`DataSyncService`)
* **Responsibility:** Manages the endpoint lifecycle, attaches the signed-in user's ID token to every request, issues CORS-compliant `HTTP GET`/`POST` calls (with a user-configurable timeout, see [Configuration & Deployment Guidelines](#%EF%B8%8F-configuration--deployment-guidelines)), normalizes raw GAS payloads, and performs atomic local upserts/clears in IndexedDB.

#### 4. Local Persistence (`IndexedDB` via `Dexie.js`)
* **Responsibility:** Acts as the primary data store for the UI. Provides zero-latency reads via reactive queries (`liveQuery`).

---

## 🔐 Authentication & Auto-Provisioning

### Sign-In Flow (Google Identity Services)
* The Angular `LoginComponent`/`GoogleAuthService` render the standard **Google Sign-In** button (GIS client library) and receive a signed **ID token (JWT)** on successful login.
* The token (and the decoded `name`/`email`/`picture` for the UI) is cached in `localStorage` (`g_id_token`) so the session survives page reloads; `GoogleAuthService.logout()` clears it.
* `CatalogService`/`CatalogApiService` refuse to call the Web App at all when no token is present (`CATALOG.ERRORS.authRequired`), so unauthenticated GET/POST calls never leave the browser.

### Request-Level Verification
* Every `GET` appends `idToken=<token>` to the query string; every `POST` payload includes an `idToken` field.
* `doGet(e)`/`doPost(e)` verify the token server-side (e.g. via Google's tokeninfo endpoint or a JWT verification library) before touching `SpreadsheetApp`, extracting the caller's Google account identity (email) from the verified claims.
* An invalid, expired, or missing token short-circuits the request with an error response — no Sheets access is attempted.

### Auto-Provisioning (Create-on-First-Use)
* **Master Index:** On the first `GET_CATALOG` call for a given identity, if no Master Index Spreadsheet is associated with that user yet, GAS creates one automatically (with the standard Catalog columns) instead of requiring the user to manually copy a template sheet.
* **Domain Data Spreadsheet:** When a user creates their **first Catalog item** (`CREATE_CATALOG_ITEM`), and the entry's linked Domain Data Spreadsheet doesn't exist, GAS creates that file as part of the same request and writes the initial data — subsequent items reuse the same file (see [SheetID Security Model](#-sheetid-security-model), which still applies unchanged: the resulting Spreadsheet ID never leaves the server).
* **Rationale:** Removes the manual "Make a Copy" + "Deploy Web App yourself" onboarding steps for individual users; identity and file lifecycle are now both handled by the authenticated backend.

---

## 🔄 User Interaction & Setup Flow

```
[ User ]               [ Angular Client ]          [ Google Identity Services ]     [ Deployed Web App (GAS) ]
   |                           |                              |                            |
   |-- 1. Open App ----------->|                              |                            |
   |-- 2. Click Sign in with Google ------------------------->|                            |
   |<-- 3. ID Token (JWT) --------------------------------------|                            |
   |                           |-- 4. GET_CATALOG?idToken=... ---------------------------->|
   |                           |                              |    5. Verify idToken       |
   |                           |                              |    6. Master Index exists? |
   |                           |                              |       No -> Auto-Create    |
   |                           |<-- 7. Returns Catalog & Data JSON -------------------------|
   |                           |                                                           |
   |                           |-- 8. Persist Data to IndexedDB -------------------------->|
   |<-- 9. Sync Complete ------|                                                           |
```

---

## 📐 Sequence Diagram: Data Synchronization Flow

```
+--------+            +------------------+          +-----------------------+          +------------------+
| User   |            | Angular Client   |          | Google Apps Script    |          | Google Sheets    |
| (UI)   |            | (DataSyncService)|          | Web App Endpoint      |          | (SpreadsheetApp) |
+---+----+            +--------+---------+          +-----------+-----------+          +--------+---------+
    |                          |                                |                           |
    |  Trigger Manual Sync     |                                |                           |
    |------------------------->|                                |                           |
    |                          |  HTTP GET (webAppUrl?idToken=..)|                          |
    |                          |------------------------------->|                           |
    |                          |                                |  Verify idToken           |
    |                          |                                |  Read Master Index Sheet  |
    |                          |                                |  (auto-create if missing) |
    |                          |                                |-------------------------->|
    |                          |                                |<--------------------------|
    |                          |                                |  Return Catalog Rows +    |
    |                          |                                |  SheetID (first element)  |
    |                          |                                |  (ID stays server-side)   |
    |                          |                                |                           |
    |                          |                                |  Loop Domain Sheets by    |
    |                          |                                |  Tab Name (ID never sent) |
    |                          |                                |-------------------------->|
    |                          |                                |<--------------------------|
    |                          |                                |  Return Tabular Rows      |
    |                          |                                |                           |
    |                          |                                |  Format JSON & Wrap in    |
    |                          |                                |  ContentService           |
    |                          |  HTTP 200 OK (JSON Payload)    |                           |
    |                          |<-------------------------------|                           |
    |                          |                                                            |
    |                          |  Atomic Write Transaction                                  |
    |                          |-----------------+                                          |
    |                          |                 | (IndexedDB / Dexie.js)                   |
    |                          |<----------------+                                          |
    |                          |                                                            |
    |  Update Sync Status UI   |                                                            |
    |<-------------------------|                                                            |
```

---

## ⚙️ Configuration & Deployment Guidelines

### Google Apps Script Deployment Specs
1. Open the copied Google Sheet and click **Extensions > Apps Script**.
2. Click **Deploy > New deployment**.
3. Select type: **Web app**.
4. Configure setting fields exactly as follows:
   * **Description:** `sumaq-yachay API backend v1`
   * **Execute as:** `Me (user@gmail.com)`
   * **Who has access:** `Anyone`
5. Click **Deploy**, authorize initial permissions, and copy the **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`).
6. In the Angular app's Settings drawer, paste the Web App URL, choose a **GAS request timeout** (30s / 1m / 3m / 6m — accommodates cold starts and auto-provisioning's first-run spreadsheet creation, which is slower than a normal read), and sign in with **Google Sign-In** before syncing.
7. Register the app's OAuth **Client ID** (Google Cloud Console > Credentials) and configure it in `LoginComponent`/`GoogleAuthService` so the GIS button can issue ID tokens for this origin.

---

## � Troubleshooting: "CORS" Errors on `fetch()`

A browser message like `No 'Access-Control-Allow-Origin' header is present` almost always means the request **never reached a successful `doGet`/`doPost` execution** — Apps Script only attaches CORS headers to a normal `200` response. Common root causes, in order of likelihood:

* **Stale Deployment:** Editing the script does **not** update the live `/exec` URL. After code changes, use **Deploy > Manage deployments > Edit (pencil) > New version**, otherwise the old code (missing newer `action` handlers like `GET_SHEETS_NAMES`) keeps running and returns a 404/error page with no CORS headers.
* **Wrong/Truncated URL:** The saved Web App URL must end in `/exec` with no trailing slash (a trailing slash produces `.../exec/?action=...`, which Apps Script 404s on). `ConfigService.setWebAppUrl()` now strips trailing slashes automatically.
* **Access Level Changed:** Confirm **Who has access** is still `Anyone` on the active deployment — if it was narrowed, unauthenticated `GET` requests fail before any JSON/CORS headers are produced.
* **Unhandled `action` Parameter:** If `doGet(e)` doesn't branch on the `action` query param the client sent (`GET_CATALOG`, `GET_SHEETS_NAMES`, etc.), Apps Script's default error output also lacks CORS headers.
* **Local Network/VPN Blocking:** A corporate VPN, proxy, or DNS filter can block or intercept `script.google.com`/`script.googleusercontent.com` outright, producing the same "no CORS header" symptom even though the deployment itself is fine (verify by testing from another network/device, or temporarily disabling the VPN).
* **Missing/Expired ID Token:** If the user isn't signed in (or the Google ID token expired), the client now aborts before calling GAS (`CATALOG.ERRORS.authRequired`) — sign in again via the top-bar Google button to refresh the token.

The Angular client already treats any such fetch failure as `errorMessage: 'CATALOG.ERRORS.syncFailed'` (see `CatalogService.syncFromRemote()`) rather than surfacing the raw, untranslated browser message.

---

## �🔒 SheetID Security Model

* **Single Source of Truth:** The Domain Data Spreadsheet ID is the first element of the Master Index Sheet, editable exclusively by the user directly within their Google account/Sheet.
* **No Client Exposure:** The Catalog GET/POST payloads never include the Spreadsheet ID. The Angular client cannot read, create, update, or delete it.
* **Server-Side Resolution Only:** `doGet(e)` reads the ID internally via `SpreadsheetApp` and immediately uses it to open the Domain Data Spreadsheet; it is never echoed back in the response or accepted as a request parameter.
* **Rationale:** Prevents a malicious caller from supplying an arbitrary Sheet ID (ID-guessing / enumeration) to read another user's spreadsheet through the shared Web App endpoint.

---

## 🧪 Key Aspects to Validate Prototype

To verify that the proxy layer and client integration function reliably, run the following validation checks:

* **Redirect Handling Check:** Ensure Angular successfully follows GAS `302 HTTP` redirects during `GET` requests without CORS blocking.
* **Schema Parsing Resilience:** Verify that GAS correctly parses empty rows, numeric strings, and multi-line definitions without breaking the JSON output structure.
* **Cold Start & Latency Thresholds:** Measure the first-request execution latency (GAS cold starts can take 2–4 seconds). Confirm the UI shows appropriate loading indicators.
* **Atomic IndexedDB Transactions:** Confirm that local records in Dexie.js are updated cleanly without duplicating entries or leaving orphaned data if a sync drops mid-way.
* **Offline Fallback Validation:** Disconnect network access after initial sync and confirm the Angular app boots and reads seamlessly from IndexedDB.
* **SheetID Non-Disclosure Check:** Inspect the JSON response payload and confirm the Domain Data Spreadsheet ID never appears in it, and confirm the endpoint ignores/rejects any client-supplied `sheetId` parameter.

---

## 🏁 Backend Implementation Milestones

| Milestone | Deliverable | Success Criteria | Status |
| :--- | :--- | :--- | :--- |
| **M-1: Master Template** | Google Sheet + Base Script | A copyable Google Sheet template with Master Index and pre-configured Apps Script code. | ✅ Done |
| **M-2: Endpoint Verification** | Deployed Web App | Endpoint returns valid JSON over `HTTP GET` when opened directly in a browser or cURL. | ✅ Done |
| **M-3: Client Connection** | Angular Sync Integration | Angular saves the Web App URL, executes fetching, and outputs payload data to console. | ✅ Done (Catalog feature) |
| **M-4: Persistence Hook** | Dexie.js Atomic Pipeline | Data returned from Web App successfully writes into IndexedDB tables and loads offline. | ✅ Done (Catalog feature) |
| **M-5: SheetID Isolation** | `doGet(e)` reads `SheetID` server-side only | Response payload never includes `SheetID`; client cannot read/write it. | ✅ Done |
| **M-6: Domain Data Sheet Dispatch** | Name-driven tab parsing (`Words`, `Concepts`, `Relations`, ...) | Apps Script returns rows keyed by tab name; Angular renders the matching view component per name. | ⬜ Pending |
| **M-7: Google Sign-In** | `GoogleAuthService` + `LoginComponent` (GIS) | User can sign in/out with a Google account; ID token is attached to every GET/POST; unauthenticated calls are blocked client-side. | ✅ Done |
| **M-8: Auto-Provisioning** | Create-on-first-use for Master Index & Domain Data files | First `GET_CATALOG`/`CREATE_CATALOG_ITEM` for a new identity/entry auto-creates the backing spreadsheet without manual template copying. | ✅ Done |
| **M-9: Configurable Timeout** | `ConfigService` GAS timeout (30s/1m/3m/6m) | Slow auto-provisioning calls (first-time file creation) don't prematurely fall back to sample data; user can tune the timeout. | ✅ Done |
