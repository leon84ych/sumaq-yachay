# Architecture Design Document: Domain Infrastructure & Backend-Agnostic Layer

## 1. Overview & Core Architecture Pattern

This architecture adopts a **Hexagonal Architecture (Ports and Adapters)** combined with the **Strangler Fig Pattern** for progressive, feature-by-feature migration.

### Core Objectives & Design Rationales
* **The Core Problem:** Google Sheets handles data strictly via 2D string-based grids (*Rows*), where collections like tags are stored as pipe-delimited text (e.g., `#one|#two|#three`) because raw JSON or complex JavaScript objects turn into literal strings like `[object Object]` when written to a cell. Conversely, local storage (IndexedDB) and the Angular UI require optimized structures (*Records*), where tags are native arrays (e.g., `["#one", "#two", "#three"]`) to allow fast indexing, local filtering, and cross-domain references.
* **The Solution:** A completely decoupled repository and adapter layer where infrastructure-specific serialization details are isolated from the application domain.

---

## 2. Key Interface Contract: `DomainBackendAdapter`

To ensure that switching from Google Apps Script (GAS) to MongoDB, Spring Boot, or a local File System requires zero changes to the domain logic or UI components, any backend implementation **must** implement the following TypeScript interface contract.

> **Crucial Rule:** This contract exclusively sends and receives `Record` models. The conversion to/from infrastructure-specific formats (like GAS `Row` DTOs with pipe-delimited strings) occurs *strictly* inside the backend adapter implementation.

```typescript
export interface DomainBackendAdapter {
  /**
   * Fetches all domain sheets and records for a specific catalog row.
   * @param row Master catalog row index
   */
  getDomainSheets(row: number): Promise<Record<string, unknown>[]>;

  /**
   * Creates a new dynamic sheet/table for a domain.
   */
  createSheet(
    row: number, 
    sheetName: string, 
    headers: string[]
  ): Promise<{ status: string; message?: string }>;

  /**
   * Creates or updates rows within a specified domain sheet using Record models.
   */
  updateRows(
    row: number, 
    sheetName: string, 
    records: Record<string, unknown>[]
  ): Promise<{ status: string; message?: string; assignedId?: string }>;
}
```

---

## 3. Architecture Diagrams

### A. Incoming Request Flow (Read / GET)
This diagram illustrates how data flows from the UI down to the local database, optionally syncing from the remote backend through the adapter.

```text
 [ Angular UI Component ]
          │
          ▼ (Calls)
   [ DomainService ]  ──(Queries cache first)──> [ Local Dexie DB ]
          │
          ▼ (If online / refresh required)
 [ DomainBackendAdapter ] (Interface Contract)
          │
          ├─────────────────────────┐ (Pluggable Implementation)
          ▼                         ▼
   [ GasBackendAdapter ]    [ MongoBackendAdapter / SpringBootAdapter ]
   - Translates to Row      - Sends native Record / JSON
   - Handles Google Auth    - Talks to external REST/gRPC API
          │
          ▼
 [ Google Apps Script (GAS) ]
```

### B. Outgoing Mutation Flow (Write / POST / Update)
This diagram demonstrates the **Zero-Latency / Optimistic Save** pattern where records are transformed via a domain mapper before hitting the storage layers.

```text
 [ User Input (Form / UI) ]
          │
          ▼
 [ Domain Mapper (index-mapper.service.ts) ]
   - Converts UI payload ──> Internal [Domain]Record (tags as arrays: ["#a", "#b"])
          │
          ▼
 [ Local Dexie DB ] (Saves immediately with syncStatus: 'pending')
          │
          ▼
 [ DomainBackendAdapter ]
   - Maps Record ──> Infrastructure DTO / Row format (tags: "#a|#b")
   - Injects Google Auth Token (idToken)
          │
          ▼
 [ GAS Web App Router (routePost) ]
   - Updates target spreadsheet cells
```

---

## 4. Directory & Package Layout

```text
src/app/
├── core/
│   └── infrastructure/
│       └── gas/                        <-- Pluggable Backend Infra Package
│           ├── gas-backend.adapter.ts  <-- Implements DomainBackendAdapter (handles Rows)
│           └── gas-api.service.ts      <-- Low-level HTTP requests to GAS endpoints
└── features/
    └── catalog-detail/
        └── domains/
            └── domain-index/
                ├── models/
                │   ├── index-record.ts   <-- Internal Record model (tags: string[])
                │   └── index-row.ts      <-- @deprecated Infra DTO model (tags: string)
                ├── services/
                │   ├── index-mapper.service.ts  <-- Bidirectional transformation (Record <-> Row)
                │   └── domain-index.service.ts  <-- Consumes Records & interacts with Dexie
                └── components/           <-- UI components
```

---

## 5. Migration Prompt for Incremental Refactoring

Use the following prompt when refactoring each domain feature using the **Strangler Fig Pattern**:

```text
Act as a Senior Software Architect and Angular Expert. We are progressively refactoring the [DOMAIN_NAME, e.g., index] domain in sumaq-yachay following Hexagonal Architecture and the Strangler Fig Pattern.

RULES & BOUNDARIES:
1. DO NOT delete existing legacy code immediately. Mark deprecated components, services, or models with @deprecated annotations and comments.
2. Maintain all domain logic inside its designated path: src/app/features/catalog-detail/domains/[domain-folder]/

TASKS TO EXECUTE FOR THIS DOMAIN:
1. MODELS (models/):
   - Create [Domain]Record (e.g., IndexRecord) for internal DB/UI use, where tags are string[] arrays.
   - Retain or create [Domain]Row (e.g., IndexRow) for infrastructure transfer, where tags are pipe-delimited strings (e.g., "#tag1|#tag2").

2. MAPPER (services/):
   - Implement [domain]-mapper.service.ts providing bidirectional transformations:
     * toRecord(row: [Domain]Row): [Domain]Record
     * toRow(record: [Domain]Record): [Domain]Row

3. DOMAIN SERVICE (services/):
   - Update/Create [domain].service.ts to exclusively operate on [Domain]Record models.
   - Persist data locally to Dexie IndexedDB flat tables.
   - Use the mapper service when communicating outbound/inbound with the DomainBackendAdapter.

4. INFRASTRUCTURE ADAPTER (src/app/core/infrastructure/gas/):
   - Ensure the GAS backend adapter implements DomainBackendAdapter and properly isolates Row-based string parsing.
```