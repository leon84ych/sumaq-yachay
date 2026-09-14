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
* **Dynamic Component Dispatcher:** Resolves visual layouts dynamically based on the **Domain Data Sheet's name** (e.g. a `Concepts` tab renders `ConceptsViewComponent`, a `Relations` tab renders `RelationsGraphComponent`), rather than an explicit type field.
* **Settings & Onboarding:** Manages Web App URL configurations, manual trigger re-syncs, and storage status metrics.

---

## Data Flow & Synchronization Strategy

1. **App Initialization:** The Angular client boots up and queries IndexedDB directly. Rendered components display the most recent cached dataset instantly.
2. **Sync Trigger:** An automated background request or manual user action fires an `HTTP GET` to the configured Google Apps Script Web App URL.
3. **Payload Ingestion:** The client receives normalized JSON objects from Google Apps Script.
4. **Atomic Update:** A Dexie read-write transaction overwrites or merges local IndexedDB records.
5. **Reactive UI Refresh:** Observable/Signal streams notify visual components of store changes, triggering instant UI updates without manual reloads.

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
* **Endpoint Protection:** The Apps Script Web App URL functions as a secret token. While deployed as "Anyone", access requires possession of the unique URL string.
* **SheetID Isolation:** The Domain Data Spreadsheet ID is resolved internally by Apps Script (from its own reserved config row) and is never sent to, stored by, or accepted from the Angular client. This prevents an attacker from guessing or substituting another user's Sheet ID to read foreign data.

---

## Technology Stack

* **Frontend Framework:** Angular (Latest Stable Version)
* **Local Persistence:** IndexedDB + Dexie.js
* **Backend Platform:** Google Apps Script (JavaScript ES6+)
* **Data Provider:** Google Sheets
* **Build & Deployment:** Node.js, npm, GitHub Pages / Vercel
