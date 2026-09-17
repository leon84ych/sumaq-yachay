# Architecture Overview — sumaq-yachay

`sumaq-yachay` is a lightweight, client-heavy web application designed for personal knowledge management and learning. It leverages **Google Sheets** as a user-friendly, cloud-hosted content management system (CMS), **Google Apps Script** as a serverless API proxy layer, **Angular** for reactive user interfaces, and **IndexedDB** (via **Dexie.js**) for an offline-first, high-performance local data storage layer.

---

## High-Level System Architecture

```
 +-------------------------------------------------------------------+
 |                        GOOGLE ECOSYSTEM                           |
 |                                                                   |
 |  +--------------------+         +------------------------------+  |
 |  | Master Index Sheet |         | Data Sheets                  |  |
 |  | (Catalog / Config) |         | (Words, Concepts, Relations) |  |
 |  +---------+----------+         +--------------+---------------+  |
 |            |                                   |                  |
 |            +-----------------+-----------------+                  |
 |                              |                                    |
 |                              v                                    |
 |               +------------------------------+                    |
 |               |  Google Apps Script Web App  |                    |
 |               |  (GAS Execution Engine)      |                    |
 |               +--------------+---------------+                    |
 +------------------------------|------------------------------------+
                                | JSON over HTTP GET
                                v
 +-------------------------------------------------------------------+
 |                         ANGULAR CLIENT                            |
 |                                                                   |
 |               +------------------------------+                    |
 |               |  Data Sync Service           |                    |
 |               |  (HTTP Client / Normalizer)  |                    |
 |               +--------------+---------------+                    |
 |                              |                                    |
 |               +--------------v---------------+                    |
 |               |    IndexedDB (Dexie.js)      |                    |
 |               |    (Local Cache & Search)    |                    |
 |               +--------------+---------------+                    |
 |                              |                                    |
 |               +--------------v---------------+                    |
 |               |   Reactive UI Components     |                    |
 |               |   (Words, Concepts, Graphs)  |                    |
 |               +------------------------------+                    |
 +-------------------------------------------------------------------+
```

---

## Architectural Layers & Responsibilities

### 1. Data Source Layer (Google Sheets)
* **Master Index Sheet (Catalog):** Serves as the central directory of study entries (`subject`, `topic`, `name`, `author`, `description`, `source`, `active`). A reserved first row holds the linked **Domain Data Spreadsheet ID** — this value is configured manually inside Google Sheets only. It is never surfaced in the Catalog UI and cannot be created, edited, or deleted through the app, for security reasons (see *Security & Privacy Considerations*).
* **Domain Data Sheets:** Individual named tabs (e.g. `Words`, `Concepts`, `Relations`) inside the linked Domain Data Spreadsheet. A sheet is no longer classified by an explicit `Type` column — the **tab/sheet name itself** determines which schema and component renders its rows.
  * **Words & Definitions:** Key-value style tables with word terms, phonetic guides, and definitions.
  * **Concepts & Multiple Definitions:** One-to-many structures linking a single concept to multiple explanatory records.
  * **Concept Relations:** Edge-list tables defining relational structures between nodes/concepts for dynamic rendering.

### 2. Integration / API Layer (Google Apps Script Web App)
* **Serverless Execution:** Runs directly inside the user's Google account context.
* **Identity-Verified Requests:** Every `GET`/`POST` call carries the caller's Google ID token (issued client-side by Google Identity Services). Apps Script verifies the token before touching `SpreadsheetApp`; requests with a missing/invalid token are rejected.
* **Auto-Provisioning:** Resolves the Master Index Spreadsheet **for the verified identity**, creating it automatically on first use. When a user creates their first Catalog item, the linked Domain Data Spreadsheet is likewise created on demand if it doesn't already exist — no manual template copying required.
* **Unified Payload Generation:**
  * Parses the Master Index Sheet.
  * Extracts records from all active linked Google Sheets via `SpreadsheetApp`.
  * Transforms raw tabular rows into clean, strongly typed JSON payloads.
* **CORS & HTTP Endpoint Handling:** Serves payload responses over `HTTP GET` via `ContentService.createTextOutput()` with `MimeType.JSON`.

### 3. Storage & Cache Layer (IndexedDB via Dexie.js)
* **Offline-First Storage:** Local persistence in browser storage using `Dexie.js` as an ORM-like wrapper over `IndexedDB`.
* **Zero-Latency Reads:** All UI components fetch data directly from local storage using reactive queries (`liveQuery`), eliminating UI blocking during network requests.
* **Background Synchronization:** Synchronizes with Google Apps Script asynchronously; local stores are updated in atomic transactions upon successful network response.

### 4. Presentation Layer (Angular Frontend)
* **Reactive Core:** Built with Angular signals, reactive components, and standalone design patterns.
* **Authentication:** `LoginComponent` + `GoogleAuthService` render the Google Sign-In button (Google Identity Services), cache the resulting ID token, and expose the signed-in user's profile. Sync/write actions are blocked client-side until the user is signed in.
* **Dynamic Component Dispatcher:** Resolves visual layouts dynamically based on the **Domain Data Sheet's name** (e.g. a `Concepts` tab renders `ConceptsViewComponent`, a `Relations` tab renders `RelationsGraphComponent`), rather than an explicit type field.
* **Settings & Onboarding:** Manages Web App URL configuration, GAS request timeout, sample-data mode, theme/text-size, language, and manual trigger re-syncs from a single top-bar settings drawer.

---

## Data Flow & Synchronization Strategy

1. **App Initialization:** The Angular client boots up and queries IndexedDB directly. Rendered components display the most recent cached dataset instantly.
2. **Sign-In Gate:** The user signs in with Google (GIS). The resulting ID token is required before any sync/write action proceeds; unauthenticated attempts are blocked client-side (`CATALOG.ERRORS.authRequired`).
3. **Sync Trigger:** An automated background request or manual user action fires an `HTTP GET` (with `idToken`) to the configured Google Apps Script Web App URL.
4. **Payload Ingestion:** The client receives normalized JSON objects from Google Apps Script. On first use, Apps Script may have just auto-created the Master Index/Domain Data files for this identity before responding.
5. **Atomic Update:** A Dexie read-write transaction overwrites or merges local IndexedDB records.
6. **Reactive UI Refresh:** Observable/Signal streams notify visual components of store changes, triggering instant UI updates without manual reloads.

---

## Usage Quotas, Rate Limits & Platform Constraints

Because this architecture relies on free-tier consumer Google accounts (`@gmail.com`), execution constraints must be respected:

| Constraint / Metric | Limit / Threshold | Architectural Mitigation |
| :--- | :--- | :--- |
| **GAS Execution Timeout** | 6 minutes per execution | Single fetch operation per sheet; pre-compiled response payloads. |
| **Google Apps Script Fetch Quota** | ~20,000 calls / day | Offline-first architecture limits fetches to app boot or manual user sync. |
| **CORS / HTTP Redirects** | `302 Redirect` on GAS endpoints | Use standard `GET` requests; rely on native browser redirect following. |
| **LocalStorage Storage Limit** | ~5 MB maximum | Abandoned in favor of IndexedDB (>250 MB browser allocation). |
| **Read Latency (GAS Fetch)** | 1.5s – 4.0s average response | Decoupled UI rendering from API response via IndexedDB caching. |

---

## Security & Privacy Considerations

* **Data Ownership:** Content remains entirely within the user's personal Google Drive and local browser storage.
* **Zero Central Backend:** No intermediary backend server stores, tracks, or routes user data.
* **Identity-Verified Endpoint:** Every request must carry a valid Google ID token (from Google Identity Services sign-in); Apps Script verifies it before any Sheets access. This replaces the earlier "secret URL" trust model with per-request identity verification.
* **SheetID Isolation:** The Domain Data Spreadsheet ID is resolved internally by Apps Script (from its own reserved config row) and is never sent to, stored by, or accepted from the Angular client. This prevents an attacker from guessing or substituting another user's Sheet ID to read foreign data.
* **Auto-Provisioning Scope:** Files are only ever created for, and scoped to, the verified identity making the request — auto-provisioning never creates or touches another user's Master Index or Domain Data files.

---

## Technology Stack

* **Frontend Framework:** Angular (Latest Stable Version)
* **Local Persistence:** IndexedDB + Dexie.js
* **Backend Platform:** Google Apps Script (JavaScript ES6+)
* **Data Provider:** Google Sheets
* **Build & Deployment:** Node.js, npm, GitHub Pages / Vercel
