# Catalog Feature Implementation Plan — sumaq-yachay

This document defines the structural architecture, component hierarchy, state management, offline-first storage, and API integration specifications (**GET** and **POST**) exclusively for the **Catalog (Master Index)** feature.

---

## 1. Domain Scope & Responsibility

The **Catalog** corresponds to the **Master Index Sheet** in the Google Sheets CMS. It acts as the central registry of all active study datasets and data sources.

### Primary Responsibilities
- **Read & Render (GET):** Display registered data sources (Entities, Relations, Excerpts, Timelines, Scenarios) with filtering by Category (`Technical`, `Philosophy`, `Fiction`), Type, and Status (`Active` / `Inactive`).
- **Register & Mutate (POST):** Add a new spreadsheet reference or update an existing entry in the Master Index Sheet, persisting changes optimistically to IndexedDB (Dexie.js).
- **Manage Sync Lifecycle:** Track sync status per catalog entry (`synced`, `pending`, `error`).

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

```typescript
export type CatalogCategory = 'Technical' | 'Philosophy' | 'Fiction';

export type CatalogType = 
  | 'entities'
  | 'relations'
  | 'excerpts'
  | 'timelines'
  | 'scenarios';

export type SyncState = 'synced' | 'pending' | 'error';

export interface CatalogItem {
  id: string;               // Unique UUID or SheetID
  sheetId: string;          // Google Sheet ID or URL
  name: string;             // Human-readable title
  category: CatalogCategory;// Technical | Philosophy | Fiction
  type: CatalogType;        // Entity schema type
  active: boolean;          // Active flag in Master Index
  description?: string;     // Optional context
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
  sheetName: 'MasterIndex';
  id: string;
  rowValues: [
    string,   // [0] ID / UUID
    string,   // [1] SheetID
    string,   // [2] Name
    string,   // [3] Category
    string,   // [4] Type
    boolean,  // [5] Active (TRUE / FALSE)
    string    // [6] UpdatedAt ISO String
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
// catalog-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { CatalogPostPayload, CatalogPostResponse, GetCatalogResponse } from '../models/catalog-api.model';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  /**
   * HTTP GET: Fetches catalog entries from the Master Index Sheet
   */
  getCatalog(): Observable<GetCatalogResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    const endpoint = `${webAppUrl}?action=GET_CATALOG`;
    return this.http.get<GetCatalogResponse>(endpoint);
  }

  /**
   * HTTP POST: Creates or updates an entry in the Master Index Sheet
   * Uses text/plain to prevent CORS preflight OPTIONS request on Apps Script.
   */
  saveCatalogItem(payload: CatalogPostPayload): Observable<CatalogPostResponse> {
    const webAppUrl = this.config.getWebAppUrl();
    return this.http.post<CatalogPostResponse>(
      webAppUrl,
      JSON.stringify(payload),
      {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      }
    );
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
      catalogs: 'id, sheetId, category, type, active, syncStatus'
    });
  }
}
```

### 5.2 Reactive State via Angular Signals (`CatalogService`)

- **Signal State Properties**:
  - `items = signal<CatalogItem[]>([])`
  - `selectedCategory = signal<CatalogCategory | 'ALL'>('ALL')`
  - `searchQuery = signal<string>('')`
  - `isLoading = signal<boolean>(false)`
  - `filteredItems = computed(...)` (Derives active category & search query filters)

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
- Category Pills: `All`, `Technical`, `Philosophy`, `Fiction`.
- Search Input: Real-time search query filtering.
- Active Only Toggle: Switch between showing all or only active data sheets.

### 6.3 `CatalogCardComponent` (Dumb / Presentational)
- Displays individual catalog items.
- Badges: `Category`, `Type`, `Active` status toggle.
- Sync state icon: Synced (green check), Pending (yellow pulse), Error (red alert).
- Emits events: `onToggleActive(item)`, `onEdit(item)`, `onDelete(item)`.

### 6.4 `CatalogFormModalComponent` (Form Management)
- Built with Angular Reactive Forms (`FormBuilder`, `Validators`).
- **Fields**:
  - `name`: Required, max 100 characters.
  - `sheetId`: Required (supports extracting Sheet ID from full Google Sheet URL).
  - `category`: Select dropdown (`Technical`, `Philosophy`, `Fiction`).
  - `type`: Select dropdown (`entities`, `relations`, `excerpts`, `timelines`, `scenarios`).
  - `active`: Boolean checkbox (default: `true`).
- **Validation**: Regex validator for Google Sheet ID / URL structure.

---

## 7. Step-by-Step Implementation Checklist

| Step | Milestone Task | Focus Area |
| :--- | :--- | :--- |
| **1** | Create Data Models (`catalog-item.model.ts`, `catalog-api.model.ts`) | Type definitions & DTOs |
| **2** | Add `catalogs` table to Dexie.js (`app-db.service.ts`) | Offline IndexedDB persistence |
| **3** | Implement `CatalogApiService` (`GET` and `POST`) | Angular `HttpClient` & Apps Script CORS handling |
| **4** | Build `CatalogService` state store | Signals, computed queries, and optimistic write pipeline |
| **5** | Implement Presentational Components | `CatalogCard`, `CatalogFilter`, `CatalogSyncBadge` |
| **6** | Build `CatalogFormModalComponent` | Reactive forms & Google Sheet URL parser |
| **7** | Integrate Smart `CatalogComponent` & Route | Connect components to `app.routes.ts` |
| **8** | Unit & Integration Testing | Test offline fallback, search filter, and mock HTTP responses |
