# Catalog Detail Feature — Implementation Plan & Roadmap

> **Status: Planned (Not Started).** This document defines the component naming, folder structure, data model, and phased roadmap for the screen that displays a **single Catalog entry** — its long-form description plus its per-sheet Domain Data views (`Words`, `Concepts`, `Relations`, etc.).

---

## 1. Problem Statement

The [Catalog](./CatalogFeatureImplemenationPlan.md) feature lists/manages registry entries (`subject`, `topic`, `name`, `author`, `description`, `source`, `active`). Selecting one entry should open a **detail workspace** for that specific study topic, composed of:

1. An **Overview** section — the entry's long-form description (richer than the short `description` field shown on the card).
2. One tab/section **per Domain Data Sheet tab** that belongs to that entry (e.g. `Words`, `Concepts`, `Relations`), each rendered with the view component appropriate for that sheet's **name** — consistent with the sheet-name-driven dispatch already defined in [ARCHITECTURE.md](./ARCHITECTURE.md#4-presentation-layer-angular-frontend) and [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#1a-domain-data-sheets-google-sheet-tabs).

---

## 2. Naming Decision

| Concern | Chosen Name | Rationale |
| :--- | :--- | :--- |
| **Feature folder** | `features/catalog-detail/` | Sibling to `features/catalog/`, keeps the "list" and "detail" concerns separate and independently lazy-loadable. |
| **Smart container component** | `CatalogDetailComponent` (selector `app-catalog-detail`) | Matches the existing `Catalog`/`CatalogCard`/`CatalogFilter` naming convention — prefixed with `Catalog`, suffixed with its role. |
| **Route** | `/catalog/:id` | Nested under the existing `catalog` path; keeps the URL hierarchy intuitive (`/catalog` = list, `/catalog/:id` = detail). |
| **Per-sheet view components** | `<Name>ViewComponent` (e.g. `DefinitionsViewComponent`, `RelationsGraphViewComponent`) | Reuses the exact component names already defined in [LEARNING_COMPONENTS_SPEC.md](./LEARNING_COMPONENTS_SPEC.md) — no new naming scheme is introduced for the views themselves. |
| **Dispatcher** | `SheetViewResolverComponent` / `sheet-view.registry.ts` | Resolves a Domain Data Sheet's **tab name** to the matching `*ViewComponent`, mirroring the "Dynamic Component Dispatcher" already described in `ARCHITECTURE.md`. |

### Why a separate feature instead of a `catalog/pages/detail` sub-folder?
The detail screen depends on a new domain (`DomainSheet`/`DomainRow` models, a new API surface, and up to 7 view components) that is unrelated to Catalog CRUD. Keeping it as its own feature avoids bloating `features/catalog` and matches Angular's standalone lazy-loading model (`loadComponent` per route).

---

## 3. Folder Structure

```text
src/app/features/
├── catalog/                              # EXISTING — list & manage Catalog entries
│   └── ...
│
├── catalog-detail/                       # NEW — detail workspace for one Catalog entry
│   ├── catalog-detail/                   # Smart container (routed page)
│   │   ├── catalog-detail.ts
│   │   ├── catalog-detail.html
│   │   └── catalog-detail.css
│   ├── components/
│   │   ├── catalog-overview/             # Long-description "Overview" panel
│   │   │   ├── catalog-overview.component.ts
│   │   │   ├── catalog-overview.component.html
│   │   │   └── catalog-overview.component.css
│   │   ├── catalog-sheet-tabs/           # Tab strip built dynamically from sheet names
│   │   │   ├── catalog-sheet-tabs.component.ts
│   │   │   ├── catalog-sheet-tabs.component.html
│   │   │   └── catalog-sheet-tabs.component.css
│   │   └── sheet-view-resolver/          # Dynamic outlet: picks the *ViewComponent for the active tab
│   │       └── sheet-view-resolver.component.ts
│   ├── models/
│   │   ├── domain-sheet.model.ts         # DomainSheet, DomainRow contracts
│   │   └── sheet-view.registry.ts        # Map<NormalizedSheetName, ComponentType>
│   └── services/
│       ├── domain-data-api.service.ts    # HTTP GET for one entry's Domain Data Sheets
│       └── domain-data.service.ts        # Signals state + Dexie cache per entry
│
└── learning-views/                       # NEW — shared, reusable per-sheet view components
    ├── definitions-view/
    ├── process-sequence-view/
    ├── timeline-view/
    ├── relations-graph-view/
    ├── mind-map-view/
    ├── quote-gallery-view/
    └── comparison-matrix-view/
```

`learning-views/*` are extracted as a **shared** feature (not nested inside `catalog-detail`) because the same 7 components are also reused directly by the [Interactive Quiz Components](./QUIZ_COMPONENTS_SPEC.md) (`FlashcardQuizView` reads from `DefinitionsView` data, `ConceptMatchQuizView` reads from `RelationsGraphView`/`DefinitionsView` data, etc.).

---

## 4. Sheet-Name → Component Mapping

There is still no `Type` column. The Angular dispatcher normalizes the Domain Data Sheet's **tab name** (trim, lowercase, singular/plural tolerant) and looks it up in `sheet-view.registry.ts`:

| Normalized Tab Name | Resolved Component | Data Shape |
| :--- | :--- | :--- |
| `words`, `definitions`, `glossary` | `DefinitionsViewComponent` | `DefinitionEntity[]` |
| `concepts` | `DefinitionsViewComponent` (easy-read column mode) | `DefinitionEntity[]` |
| `relations` | `RelationsGraphViewComponent` | `RelationEntity[]` |
| `timelines`, `timeline` | `TimelineViewComponent` | `TimelineEntity[]` |
| `excerpts`, `quotes` | `QuoteGalleryViewComponent` | `QuoteEntity[]` |
| `scenarios`, `comparisons` | `ComparisonMatrixViewComponent` | `ComparisonEntity[]` |
| `process`, `processsequence` | `ProcessSequenceViewComponent` | `ProcessStepEntity[]` |
| `mindmap`, `mindmaps` | `MindMapViewComponent` | `MindMapEntity[]` |
| *(unrecognized name)* | `UnsupportedSheetViewComponent` (fallback message) | raw rows table |

Unknown tab names never crash the UI — they fall back to a generic read-only table view, so a user can add new tabs in Google Sheets without breaking the app.

---

## 5. Data Model

```typescript
// models/domain-sheet.model.ts
export interface DomainSheet {
  name: string;              // Raw tab name as returned by Apps Script (e.g. "Concepts")
  rows: Record<string, unknown>[]; // Row objects keyed by column header
}

export interface GetDomainSheetsResponse {
  status: 'success' | 'error';
  catalogId: string;
  sheets: DomainSheet[];      // One entry per tab found for this catalog item
  message?: string;
}
```

* **No `sheetId` anywhere in this model** — consistent with the [SheetID Security Model](./BACKEND_ARCHITECTURE.md#-sheetid-security-model). The client only ever knows the Catalog entry's own `id` (from `CatalogItem`); Apps Script resolves the Domain Data Spreadsheet ID internally and returns rows grouped by **tab name**.
* Local cache: a single Dexie table `domainSheets` keyed by `[catalogId+name]`, storing the same shape as `DomainSheet`, refreshed on `syncFromRemote()`-style pulls scoped to one `catalogId`.

```typescript
// app-db.service.ts (addition)
this.version(2).stores({
  catalogs: 'id, subject, topic, name, author, description, source, active, syncStatus, updatedAt',
  domainSheets: '[catalogId+name], catalogId, name',
});
```

---

## 6. API Surface

```typescript
// services/domain-data-api.service.ts
getDomainSheets(catalogId: string): Observable<GetDomainSheetsResponse> {
  const webAppUrl = this.config.getWebAppUrl();
  const endpoint = `${webAppUrl}?action=GET_DOMAIN_SHEETS&catalogId=${encodeURIComponent(catalogId)}`;
  return from(fetch(endpoint).then((r) => r.json()));
}
```

* Apps Script's `doGet(e)` branches on `action=GET_DOMAIN_SHEETS`, looks up the row for `catalogId` in the Master Index (never trusting a client-supplied Sheet ID), opens the linked Domain Data Spreadsheet via its internally-resolved `SheetID`, and returns every tab's rows grouped by tab name.
* If the Catalog entry has no linked Domain Data Spreadsheet yet, respond with `sheets: []` and `status: 'success'` so the UI shows an empty state rather than an error.

---

## 7. Component Responsibilities

### 7.1 `CatalogDetailComponent` (Smart Container, routed at `/catalog/:id`)
* Reads `:id` from the route, loads the matching `CatalogItem` from local Catalog state (no extra fetch needed — already synced).
* Triggers `DomainDataService.loadForCatalog(id)` (cache-first, then background refresh).
* Renders `CatalogOverviewComponent` + `CatalogSheetTabsComponent` + `SheetViewResolverComponent`.

### 7.2 `CatalogOverviewComponent`
* Displays `name`, `subject`, `topic`, `author`, `source`, and the long-form `description` field.
* Read-only in v1; an "Edit" action can reuse the existing `CatalogFormModalComponent`.

### 7.3 `CatalogSheetTabsComponent`
* Renders one tab button per `DomainSheet.name` returned for the entry (plus an always-present "Overview" tab).
* Emits `selectTab(name)`; no business logic.

### 7.4 `SheetViewResolverComponent`
* Given the active tab name and its `DomainSheet.rows`, normalizes the name and instantiates the matching `*ViewComponent` (via the registry map), passing `rows` as an input.
* Renders `UnsupportedSheetViewComponent` for unmapped names.

---

## 8. Roadmap

### Phase A — Routing & Static Overview — ⬜ Not Started
* **Tasks:**
  1. Add `catalog/:id` route (`loadComponent` → `CatalogDetailComponent`).
  2. Make `CatalogCardComponent` navigate to `/catalog/:id` on click (non-toggle/edit/delete areas).
  3. Build `CatalogOverviewComponent` showing full entry metadata + description.
* **Milestone A:** Clicking a Catalog card opens a detail page showing the entry's full description.

### Phase B — Domain Data Fetch & Caching — ⬜ Not Started
* **Tasks:**
  1. Define `DomainSheet`/`GetDomainSheetsResponse` models.
  2. Add `domainSheets` Dexie table (schema version bump).
  3. Implement `DomainDataApiService.getDomainSheets()` and `DomainDataService` (signals + cache-first load + background refresh).
  4. Extend the Apps Script `doGet(e)` handler with `action=GET_DOMAIN_SHEETS` (internal-only `SheetID` resolution per [SheetID Security Model](./BACKEND_ARCHITECTURE.md#-sheetid-security-model)).
* **Milestone B:** Given a Catalog entry with a linked Domain Data Spreadsheet, the app fetches and caches its tabs' rows offline.

### Phase C — Sheet Tabs & Dynamic View Dispatch — ⬜ Not Started
* **Tasks:**
  1. Build `CatalogSheetTabsComponent` (dynamic tab strip from fetched sheet names).
  2. Build `sheet-view.registry.ts` + `SheetViewResolverComponent`.
  3. Build `UnsupportedSheetViewComponent` fallback (raw table renderer).
* **Milestone C:** Selecting a tab renders *some* view for every returned sheet, even unmapped ones.

### Phase D — Individual View Components — ⬜ Not Started
*(Tracks 1:1 with [LEARNING_COMPONENTS_SPEC.md](./LEARNING_COMPONENTS_SPEC.md); reuse if already built by other roadmap phases.)*
* **Tasks:**
  1. `DefinitionsViewComponent` (`Words` / `Definitions` / `Concepts`).
  2. `RelationsGraphViewComponent` (`Relations`).
  3. `TimelineViewComponent` (`Timelines`).
  4. `QuoteGalleryViewComponent` (`Excerpts` / `Quotes`).
  5. `ComparisonMatrixViewComponent` (`Scenarios` / `Comparisons`).
  6. `ProcessSequenceViewComponent`, `MindMapViewComponent` (lower priority — less common tab names).
* **Milestone D:** All documented sheet-name mappings render a purpose-built view instead of the raw-table fallback.

### Phase E — Polish — ⬜ Not Started
* **Tasks:**
  1. Loading/empty/error states per tab.
  2. Deep-linkable active tab (`/catalog/:id?tab=Relations`).
  3. Edit entry from the detail page (reuse `CatalogFormModalComponent`).
* **Milestone E:** Detail workspace feels first-class: shareable URLs, resilient empty states, in-place editing.

---

## 9. Implementation Checklist

| Step | Task | Phase |
| :--- | :--- | :--- |
| 1 | Add `catalog/:id` route + card navigation | A |
| 2 | Build `CatalogOverviewComponent` | A |
| 3 | Define `DomainSheet` models + Dexie schema bump | B |
| 4 | Implement `DomainDataApiService` + `DomainDataService` | B |
| 5 | Extend Apps Script `doGet` with `GET_DOMAIN_SHEETS` | B |
| 6 | Build `CatalogSheetTabsComponent` | C |
| 7 | Build `sheet-view.registry.ts` + `SheetViewResolverComponent` + fallback view | C |
| 8 | Build the 7 `learning-views/*` components | D |
| 9 | Loading/empty/error states, deep-linkable tabs, inline edit | E |
