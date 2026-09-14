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

#### 2. Google Apps Script Proxy (`doGet(e)`)
* **Responsibility:** Parses the Master Index Sheet to read the reserved Domain Data Spreadsheet ID (never from request parameters), opens it via `SpreadsheetApp.openById()` **within the script's own execution context**, iterates its tabs, converts each tab's rows into structured JSON keyed by **sheet/tab name**, and serves them over `HTTP GET`.
* **Security & Execution Boundary:** Runs under the user's quota (`Execute as: Me`). Access is open (`Anyone`), which avoids interactive OAuth browser prompts for simple `HTTP GET` calls. The Domain Data Spreadsheet ID is resolved entirely server-side and is **never accepted as an input parameter nor included in the JSON output**, preventing callers from supplying or discovering arbitrary Sheet IDs.

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

---

## 🔒 SheetID Security Model

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
