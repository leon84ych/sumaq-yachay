# Catalog Feature Implementation Plan — sumaq-yachay

> **Status: Implemented.** The Catalog feature is functional end-to-end (Angular UI, Dexie.js offline storage, and Google Apps Script GET/POST sync).

This document defines the structural architecture, component hierarchy, state management, offline-first storage, and API integration specifications (**GET** and **POST**) exclusively for the **Catalog (Master Index)** feature.

---

## 1. Domain Scope & Responsibility

The **Catalog** corresponds to the **Master Index Sheet** in the Google Sheets CMS. It acts as the central registry of all study entries directly — each row is a self-contained entry (no linked/child spreadsheet reference).

### Primary Responsibilities
- **Read & Render (GET):** Display registered catalog entries with filtering by `subject`, free-text search (name/subject/description), and Active-only toggle.
- **Register & Mutate (POST):** Add a new catalog entry or update an existing one in the Master Index Sheet, persisting changes optimistically to IndexedDB (Dexie.js).
- **Manage Sync Lifecycle:** Track sync status per catalog entry (`synced`, `pending`, `error`).

### Out of Scope: Domain Data Spreadsheet ID
The Master Index Sheet's first row is a **reserved config cell** holding the linked Domain Data Spreadsheet ID. This ID:
- Is edited **only directly in Google Sheets**, by design, for security reasons.
- Is **never** listed, created, updated, or deleted through the Catalog UI/API — no `sheetId` field exists on `CatalogItem`.
- Is resolved server-side by Apps Script only (see [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-sheetid-security-model)) and never appears in any GET/POST payload.

---

## 2. Directory & Component Structure

```text
src/app/
├── core/
│   ├── services/
│   │   ├── config.service.ts              # Manages GAS Web App URL
│   │   └── storage/
│   │       └── app-db.service.ts          # Dexie.js IndexedDB schema & tables
├── features/
│   └── catalog/
│       ├── models/
│       │   ├── catalog-item.model.ts      # Domain interfaces & Enums
│       │   └── catalog-api.model.ts       # API request/response contracts
│       ├── services/
│       │   ├── catalog-api.service.ts     # HTTP client for GAS (GET & POST)
│       │   └── catalog.service.ts         # Signals-based State & Sync Engine
│       ├── components/
│       │   ├── catalog-card/              # Presentational card for a single source
│       │   │   ├── catalog-card.component.ts
│       │   │   ├── catalog-card.component.html
│       │   │   └── catalog-card.component.css
│       │   ├── catalog-filter/            # Search & Category pill filters
│       │   │   ├── catalog-filter.component.ts
│       │   │   ├── catalog-filter.component.html
│       │   │   └── catalog-filter.component.css
│       │   ├── catalog-form-modal/        # Reactive Form modal for Add / Edit
│       │   │   ├── catalog-form-modal.component.ts
│       │   │   ├── catalog-form-modal.component.html
│       │   │   └── catalog-form-modal.component.css
│       │   └── catalog-sync-badge/        # Visual indicator of sync state
│       │       ├── catalog-sync-badge.component.ts
│       │       ├── catalog-sync-badge.component.html
│       │       └── catalog-sync-badge.component.css
│       ├── catalog.component.ts           # Smart container component
│       ├── catalog.component.html
│       └── catalog.component.css
```

---

## 3. Data Models & API Contracts

### 3.1 Domain Model (`catalog-item.model.ts`)

> The Catalog no longer references an external Google Sheet ID or URL per entry. Each entry is a self-describing record with `subject`, `topic`, `name`, and `author` metadata.

```typescript
export type SyncState = 'synced' | 'pending' | 'error';

export interface CatalogItem {
  id: string;               // Unique ID
  subject: string;          // Entity schema subject
  topic: string;            // Entity schema topic
  name: string;             // Human-readable title
  author: string;           // Entity schema author
  description?: string;     // Optional context
  source?: string;          // Optional source URL
  active: boolean;          // Active flag in Master Index
  updatedAt: string;        // ISO-8601 timestamp
  syncStatus?: SyncState;   // Local sync tracking flag
}
```

### 3.2 API Contracts (`catalog-api.model.ts`)

```typescript
// GET Response from GAS
export interface GetCatalogResponse {
  status: 'success' | 'error';
  timestamp: string;
  data: CatalogItem[];
  message?: string;
}

// POST Payload to GAS
export interface CatalogPostPayload {
  action: 'CREATE_CATALOG_ITEM' | 'UPDATE_CATALOG_ITEM';
  id: string;
  rowValues: [
    string,   // [0] ID / UUID
    string,   // [1] Subject
    string,   // [2] Topic
    string,   // [3] Name
    string,   // [4] Author
    string,   // [5] Description
    string,   // [6] Source
    boolean   // [7] Active (TRUE / FALSE)
  ];
}

// POST Response from GAS
export interface CatalogPostResponse {
  status: 'success' | 'error';
  id?: string;
  message?: string;
}
```

---

## 4. API Communication Layer (`CatalogApiService`)

Google Apps Script Web Apps require specific request handling:
- **`GET` requests**: Follow HTTP 302 redirects automatically via browser `fetch` or Angular `HttpClient`.
- **`POST` requests**: Must avoid triggering a CORS preflight (`OPTIONS` request) because Apps Script endpoints do not implement `OPTIONS` handling. Payloads are sent as `text/plain` containing stringified JSON.

### Interaction Flow

```
[ CatalogComponent / CatalogService ]
                 │
                 ├── (1) GET Request ────────► [ CatalogApiService ]
                 │                                   │
                 │                                   ├── HTTP GET (?action=GET_CATALOG)
                 │                                   ▼
                 │                             [ GAS doGet(e) ]
                 │                                   │
                 │◄── (2) Catalog JSON ──────────────┘
                 │
                 ├── (3) POST Mutation ──────► [ CatalogApiService ]
                 │                                   │
                 │                                   ├── HTTP POST (Content-Type: text/plain)
                 │                                   ▼
                 │                             [ GAS doPost(e) ] (with LockService)
                 │                                   │
                 │◄── (4) Status 200 OK ─────────────┘
```

### Service Design Blueprint

```typescript
// catalog-api.service.ts (actual implementation)
import { Injectable, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogPostPayload, GetCatalogResponse } from '../models/catalog-api.model';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private config = inject(ConfigService);

  /**
   * HTTP GET: Fetches catalog entries from the Master Index Sheet via `fetch`
   */
  getCatalog(): Observable<GetCatalogResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    if (!webAppUrl) {
      return throwError(() => new Error('Google Apps Script Web App URL is not configured.'));
    }

    const fetchPromise = fetch(webAppUrl).then((response) => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    });

    return from(fetchPromise).pipe(map((data) => data as GetCatalogResponse));
  }

  /**
   * HTTP POST: Creates or updates an entry in the Master Index Sheet.
   * Uses `mode: 'no-cors'` with `text/plain` to avoid a CORS preflight (`OPTIONS`)
   * request that Apps Script endpoints do not support. The response is opaque,
   * so success is assumed once the request completes without a network error.
   */
  saveCatalogItem(payload: CatalogPostPayload): Observable<any> {
    const webAppUrl = this.config.getWebAppUrl();

    const fetchPromise = fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    }).then(() => ({
      status: 'success',
      message: 'Opaque request completed and data pushed to Google Sheets successfully.',
    }));

    return from(fetchPromise);
  }
}
```

---

## 5. State Management & Offline Cache Strategy

### 5.1 IndexedDB Schema (Dexie.js)

```typescript
// app-db.service.ts
import Dexie, { Table } from 'dexie';
import { CatalogItem } from '../../features/catalog/models/catalog-item.model';

export class AppDatabase extends Dexie {
  catalogs!: Table<CatalogItem, string>;

  constructor() {
    super('SumaqYachayDB');
    this.version(1).stores({
      catalogs: 'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt'
    });
  }
}
```

### 5.2 Reactive State via Angular Signals (`CatalogService`)

- **Signal State Properties**:
  - `items = signal<CatalogItem[]>([])`
  - `selectedSubject = signal<string>('ALL')`
  - `searchQuery = signal<string>('')`
  - `showActiveOnly = signal<boolean>(false)`
  - `isLoading = signal<boolean>(false)`
  - `errorMessage = signal<string | null>(null)`
  - `lastSyncedAt = signal<string | null>(null)`
  - `filteredItems = computed(...)` (Derives subject, active-only, and search query filters)
  - `stats = computed(...)` (Total, active, pending-sync counts, and per-subject breakdown)

- **Read Lifecycle**:
  1. Instant read from local IndexedDB table `catalogs`.
  2. Background network trigger to `CatalogApiService.getCatalog()`.
  3. Atomic batch upsert into IndexedDB and Signal update upon successful response.

- **Write Lifecycle (Optimistic)**:
  1. Commit change to IndexedDB with `syncStatus: 'pending'`.
  2. Update in-memory Signals immediately (zero-latency UI response).
  3. Send `CatalogPostPayload` via `CatalogApiService.saveCatalogItem()`.
  4. On response: update record to `syncStatus: 'synced'` (or `'error'` on failure with retry queue).

---

## 6. Component Layout & Responsibilities

### 6.1 `CatalogComponent` (Smart Container)
- Coordinates `CatalogService`.
- Manages visibility and state of `CatalogFormModalComponent`.
- Handles `syncAll()` and `retryFailed()` actions.

### 6.2 `CatalogFilterComponent` (Dumb / Presentational)
- Subject Pills: Dynamically derived from distinct `subject` values across items, plus `All`.
- Search Input: Real-time search query filtering (matches `name`, `subject`, `description`).
- Active Only Toggle: Switch between showing all or only active entries.

### 6.3 `CatalogCardComponent` (Dumb / Presentational)
- Displays individual catalog items.
- Badges: `Subject`, `Topic`, `Author`, `Active` status toggle.
- Sync state icon: Synced (green check), Pending (yellow pulse), Error (red alert).
- Emits events: `onToggleActive(item)`, `onEdit(item)`, `onDelete(item)`.

### 6.4 `CatalogFormModalComponent` (Form Management)
- Built with Angular Reactive Forms (`FormBuilder`, `Validators`).
- **Fields**:
  - `name`: Required, max 100 characters.
  - `subject`: Required.
  - `topic`: Required.
  - `author`: Required.
  - `description`: Optional.
  - `source`: Optional (free-text/URL reference, not a Google Sheet link).
  - `active`: Boolean checkbox (default: `true`).
- No Google Sheet ID / URL field — the Catalog no longer links out to external per-entry spreadsheets.

---

## 7. Step-by-Step Implementation Checklist

| Step | Milestone Task | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **1** | Create Data Models (`catalog-item.model.ts`, `catalog-api.model.ts`) | Type definitions & DTOs | ✅ Done |
| **2** | Add `catalogs` table to Dexie.js (`app-db.service.ts`) | Offline IndexedDB persistence | ✅ Done |
| **3** | Implement `CatalogApiService` (`GET` and `POST`) | `fetch`-based client & Apps Script CORS handling | ✅ Done |
| **4** | Build `CatalogService` state store | Signals, computed queries, and optimistic write pipeline | ✅ Done |
| **5** | Implement Presentational Components | `CatalogCard`, `CatalogFilter`, `CatalogSyncBadge` | ✅ Done |
| **6** | Build `CatalogFormModalComponent` | Reactive forms for subject/topic/name/author/description/source | ✅ Done |
| **7** | Integrate Smart `CatalogComponent` & Route | Connect components to `app.routes.ts` | ✅ Done |
| **8** | Unit & Integration Testing | Test offline fallback, search filter, and mock HTTP responses | ⬜ Pending |
