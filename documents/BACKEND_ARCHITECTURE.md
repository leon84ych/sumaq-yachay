# Backend Architecture Specification: Template Copy Model ("Execute as: Me")

This document details the backend architecture, sequence flows, component responsibilities, and validation milestones for the `sumaq-yachay` proxy layer using the **Template Copy Model**.

Under this model, each user maintains an isolated instance of the Google Apps Script (GAS) Web App deployed under their own Google account (`Execute as: Me`, `Who has access: Anyone`).

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
* **Responsibility:** Serves as the central inventory/registry for all spreadsheet data sources owned by the user.
* **Schema Layout:**
  * `Type` (`words` | `concepts` | `relations`)
  * `SheetID` (The unique Google Sheet ID string or full URL)
  * `Name` (Human-readable label for UI navigation)
  * `Active` (`TRUE` | `FALSE`)

#### 2. Google Apps Script Proxy (`doGet(e)`)
* **Responsibility:** Parses the Master Index Sheet, opens registered data sheets dynamically via `SpreadsheetApp.openById()`, converts tabular rows into structured JSON arrays, and serves them over `HTTP GET`.
* **Security & Execution Boundary:** Runs under the user's quota (`Execute as: Me`). Access is open (`Anyone`), which avoids interactive OAuth browser prompts for simple `HTTP GET` calls.

#### 3. Angular Sync Engine (`DataSyncService`)
* **Responsibility:** Manages the endpoint lifecycle, issues CORS-compliant `HTTP GET` requests, normalizes raw GAS payloads, and performs atomic local upserts/clears in IndexedDB.

#### 4. Local Persistence (`IndexedDB` via `Dexie.js`)
* **Responsibility:** Acts as the primary data store for the UI. Provides zero-latency reads via reactive queries (`liveQuery`).

---

## 🔄 User Interaction & Setup Flow

```
[ User ]               [ Angular Client ]          [ Google Drive Template ]       [ Deployed Web App ]
   |                           |                              |                            |
   |-- 1. Open App ----------->|                              |                            |
   |   (Prompt for Web App URL)|                              |                            |
   |                           |                              |                            |
   |-- 2. Click Template Link ------------------------------->|                            |
   |                                                          |-- 3. Make a Copy --------->| (Instance Created)
   |                                                          |                            |
   |-- 4. Open Apps Script Editor -------------------------------------------------------->|
   |-- 5. Deploy as Web App ("Execute as: Me", "Anyone") --------------------------------->|
   |                                                                                       |
   |<-- 6. Copy Web App URL ---------------------------------------------------------------+
   |                           |                                                           |
   |-- 7. Paste URL into App ->|                                                           |
   |                           |-- 8. Test Connection (HTTP GET) ------------------------->|
   |                           |<-- 9. Returns Catalog & Data JSON ------------------------|
   |                           |                                                           |
   |                           |-- 10. Persist URL & Write Data to IndexedDB ------------->|
   |<-- 11. Sync Complete -----|                                                           |
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
    |                          |  HTTP GET (webAppUrl)          |                           |
    |                          |------------------------------->|                           |
    |                          |                                |  Read Master Index Sheet  |
    |                          |                                |-------------------------->|
    |                          |                                |<--------------------------|
    |                          |                                |  Return Catalog Rows      |
    |                          |                                |                           |
    |                          |                                |  Loop Active Sheet IDs    |
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

---

## 🧪 Key Aspects to Validate Prototype

To verify that the proxy layer and client integration function reliably, run the following validation checks:

* **Redirect Handling Check:** Ensure Angular successfully follows GAS `302 HTTP` redirects during `GET` requests without CORS blocking.
* **Schema Parsing Resilience:** Verify that GAS correctly parses empty rows, numeric strings, and multi-line definitions without breaking the JSON output structure.
* **Cold Start & Latency Thresholds:** Measure the first-request execution latency (GAS cold starts can take 2–4 seconds). Confirm the UI shows appropriate loading indicators.
* **Atomic IndexedDB Transactions:** Confirm that local records in Dexie.js are updated cleanly without duplicating entries or leaving orphaned data if a sync drops mid-way.
* **Offline Fallback Validation:** Disconnect network access after initial sync and confirm the Angular app boots and reads seamlessly from IndexedDB.

---

## 🏁 Backend Implementation Milestones

| Milestone | Deliverable | Success Criteria |
| :--- | :--- | :--- |
| **M-1: Master Template** | Google Sheet + Base Script | A copyable Google Sheet template with Master Index and pre-configured Apps Script code. |
| **M-2: Endpoint Verification** | Deployed Web App | Endpoint returns valid JSON over `HTTP GET` when opened directly in a browser or cURL. |
| **M-3: Client Connection** | Angular Sync Integration | Angular saves the Web App URL, executes fetching, and outputs payload data to console. |
| **M-4: Persistence Hook** | Dexie.js Atomic Pipeline | Data returned from Web App successfully writes into IndexedDB tables and loads offline. |
