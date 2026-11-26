# Domain Migration Specification Agent

## Purpose

Use this specification when migrating a legacy domain under `src/app/features/domain/` to the
typed GAS-backed architecture under `src/app/features/domain/`.

The reference implementation is the INDEX domain:

- Target feature: `src/app/features/domain/index/`
- Legacy feature: `src/app/features/domain/domain-index/`
- Shared GAS infrastructure: `src/app/core/infrastructure/gas/`
- Shared domain contract: `src/app/features/domain/shared/model/domain-shared-model.ts`
- Shared IndexedDB service: `src/app/shared/local-db/local-db.service.ts`

The goal is not to copy INDEX literally. The goal is to preserve each domain's business fields
while adopting the same typed transport, persistence, CRUD, search, permission, and UI patterns.

## Target Architecture

Each migrated domain should have these layers:

```text
component
	-> domain data service
		-> domain repository
			-> GAS repository
				-> GAS domain API
					-> Google Apps Script
```

Persistence is handled by the domain repository through `LocalDBService`/Dexie. The component
owns presentation state with signals, while the repository owns synchronization state and
request mapping.

### Target files

For a domain named `CONCEPTS`, use the INDEX layout as a template:

```text
src/app/features/domain/concepts/
├── components/
│   ├── concepts-entry-card/
│   └── concepts-entry-form/
├── concepts/
│   ├── concepts.component.ts
│   ├── concepts.component.html
│   ├── concepts.component.css
│   └── concepts.component.spec.ts
├── model/
│   ├── concepts-model.ts
│   └── concepts-gas.mapper.ts
└── services/
		├── concepts-gas-repository.ts
		├── concepts-repository.ts
		├── concepts-query.service.ts
		└── concepts.service.ts
```

Names may follow the domain's established convention, but responsibilities should remain
separate.

## Model Contract

All migrated records extend `Domain`:

```typescript
export interface Domain extends Record<string, unknown> {
  id: string;
  bookId: string;
  bookRow: number;
  tags: string[];
  contributor: string;
  syncStatus: SyncStatus;
  itemRow: number;
}
```

The row fields have different meanings and must not be conflated:

- `bookRow`: the row of the owning book in the master book/catalog sheet. This is the first
  row identifier required by domain-level GAS operations.
- `itemRow`: the item's row in the domain sheet/source data. This is sent to `DELETE_ROW`
  and is retained on the domain record.
- `id`: the stable domain item identifier. It is sent separately when the backend contract
  requires it and must not be silently replaced with either row number.

Every raw model returned by GAS must declare the fields that the mapper needs, including
`bookRow` when the response contains it. If GAS does not return `bookRow`, the repository must
populate it from the `bookRow` argument used for the fetch before persisting the record.

Example domain model:

```typescript
export interface ConceptRaw {
  id: string;
  bookId: string;
  bookRow: number;
  itemRow: number;
  term: string;
  definition: string;
  tags: string;
  syncStatus: string;
  contributor: string;
}

export interface ConceptRecord extends Domain {
  term: string;
  definition: string;
}
```

Do not introduce a second domain-wide record type with a different meaning for `itemRow`.

## Mapper Rules

Each domain needs a mapper implementing `GASMapperInterface`:

```typescript
export interface GASMapperInterface<TRecord, TRaw, TRowValues> {
  toRecord(raw: TRaw): TRecord;
  toRaw(record: TRecord): TRaw;
  toRowValues(record: TRecord): TRowValues;
}
```

Required behavior:

1. `toRecord()` converts GAS values into application values.
2. `toRecord()` converts serialized tags into `string[]`.
3. `toRecord()` converts raw sync status through `parseSyncStatus()`.
4. `toRaw()` serializes tags with the shared tag mapper and preserves `bookRow`, `itemRow`,
   `bookId`, `id`, contributor, and sync status. For update requests, the transport mapper
   must expose `itemId` in the row object as the stable item identifier.
5. `toRowValues()` may remain for sheet-column operations, but the shared repository request
   path uses `toRaw()` to build object-shaped `rows` payloads. Do not create a per-domain
   `rowValueKeys` list solely to reconstruct the same object.

The GAS create/update row object must be derived from the typed raw definition. The transport
API must not silently remove or rewrite `id`, `bookId`, `bookRow`, or `itemRow`. A create request
may contain an ID when the caller provides one, or omit it when GAS is responsible for generating
one. Updates must preserve the existing record identity and include `itemId` explicitly.

## GAS API Contract

The shared `GASDomainAPI` owns HTTP details:

- Web App URL resolution
- authentication token lookup
- `fetch()` and CORS-safe content type
- HTTP error handling
- response status validation
- role capture
- request action names

Do not put `fetch()` calls in domain components or feature services.

### Read

Use the paginated endpoint through the abstract repository:

```text
GET_PAGINATED_ROWS
bookRow=<owning book row>
sheetName=<domain name>
page=<page number>
pageSize=<page size>
idToken=<token when available>
```

The abstract repository continues requesting pages until the requested total is reached or an
empty page is returned. The concrete repository maps raw results before persistence.

### Create

New records use `CREATE_ROW`:

```json
{
  "action": "CREATE_ROW",
  "id": "book-id",
  "row": 2,
  "sheetName": "CONCEPTS",
  "rows": [
    {
      "term": "...",
      "definition": "...",
      "tags": "#tag-one|#tag-two",
      "itemRow": 0,
      "contributor": "",
      "syncStatus": "pending"
    }
  ],
  "idToken": "..."
}
```

Here top-level `row` is the owning book row. The row object's `itemRow` is the item row when it is
known. The mapper controls whether `id` and `bookId` are present in the row object; the API must
not strip them with a generic helper.

The backend-created ID must be read from the response. The repository replaces a temporary ID
with the returned ID before writing the synced record to IndexedDB.

### Update

Edits use `UPDATE_ROW`, never `CREATE_ROW`. The identifying and row-location fields must be
inside each object in `rows`; do not rely on a separate `rowId` field:

```json
{
  "action": "UPDATE_ROW",
  "id": "book-id",
  "row": 2,
  "sheetName": "CONCEPTS",
  "rows": [
    {
      "bookRow": 2,
      "itemRow": 15,
      "itemId": "existing-item-id",
      "term": "updated",
      "tags": "#one|#two",
      "syncStatus": "pending"
    }
  ],
  "idToken": "..."
}
```

The top-level `row` remains the owning book row for routing compatibility. The row object must
also carry `bookRow`, `itemRow`, and `itemId`, because the update handler uses the complete item
identity and location from `rows`. For the QUOTES example, the row object is shaped like this:

```json
{
  "bookRow": 3,
  "itemRow": 3,
  "itemId": "QUOTES_3",
  "quote": "El hombre es una cuerda tendida entre la bestia y el Superhombre, una cuerda sobre un abismo.",
  "analysis": "El ser humano no es un fin en sí mismo, sino una fase de transición peligrosa y dinámica hacia una evolución espiritual superior.",
  "book": "Zaratustra",
  "author": "Friedrich Nietzsche",
  "page": "15",
  "tags": "#leon",
  "syncStatus": "pending",
  "contributor": "leon84ych@gmail.com",
  "feed": 5
}
```

Every future domain must include the same three transport fields in its update row object:
`bookRow`, `itemRow`, and `itemId`. Domain-specific fields follow those identifiers. The mapper
must serialize tags and preserve contributor, sync status, and any domain-specific values.

### Delete

Deletion must carry both row numbers:

```json
{
  "action": "DELETE_ROW",
  "idToken": "...",
  "bookId": "book-id",
  "row": 2,
  "sheetName": "INDEX",
  "itemId": "existing-item-id",
  "itemRow": 15
}
```

For the reference implementation, the call is conceptually:

```typescript
api.deleteDomainItem(record.bookRow, record.bookId, domainName, record.id, record.itemRow);
```

Never use `record.itemRow` as the first argument when the backend distinguishes the owning book
row from the item row.

## Repository Responsibilities

### GAS repository

The concrete `*GASRepository` supplies the domain name, typed API, and mapper. It may override
operations whose domain needs special identifiers, especially delete operations requiring both
`bookRow` and `itemRow`.

The abstract repository should provide the common read/create/update behavior. It must not infer
domain column order from a hand-maintained key list when `toRaw()` already defines the shape.

### Local repository

The feature repository is responsible for IndexedDB synchronization:

- `getDomain()` maps GAS raw records, populates `bookRow` from the fetch argument when needed,
  and bulk-persists records.
- `addDomainItem()` writes a pending record first, sends `CREATE_ROW`, replaces a temporary ID
  with the returned GAS ID, and stores the synced record.
- `updateDomainItem()` writes pending state, sends `UPDATE_ROW`, stores the synced result, and
  marks the local record as error if the request fails.
- `deleteDomainItem()` sends `DELETE_ROW` first, then deletes the local record only after GAS
  succeeds.

Use Dexie transactions for bulk writes and related multi-step persistence. Never remove a local
record before a remote delete succeeds unless the feature explicitly implements rollback.

### Query service

The query service reads records by a stable indexed field such as `bookId`. It should return
typed domain records and should not perform HTTP requests or mutate the UI.

## Component Responsibilities

The migrated component should follow the signal-based INDEX pattern:

- `rows` is the unfiltered local source signal.
- `filteredRows` is a `computed()` signal based on `rows` and the shared search query.
- hierarchy/grouping is another `computed()` derived from `filteredRows`.
- form fields use signals.
- `input()` and `output()` replace decorator-based inputs and outputs.
- the component calls the feature service, not `fetch()` or Dexie directly.
- the UI updates its local rows only after a successful repository operation.
- failed operations display an error and retain the form/local state needed for retry.

### Required-field warnings

- Mark every required form field with an accessible `*` beside the field label. Do not mark
  optional fields with `*`.
- Keep required-field messages hidden until the user submits an invalid form attempt.
- Use a `submitted` signal to distinguish untouched fields from an actual save attempt.
- Set `submitted` to `true` before validation and clear it when the form is reset or opened for
  edit/create state is intentionally restarted.
- Display only messages for fields that fail validation. Subtheme and other optional fields
  must not show an error before or after submission.
- The Save/Update button should remain clickable so the user can trigger validation. Do not
  disable Save solely because the form is incomplete unless there is a separate, explicit
  submission guard. Required text should be included through the shared field-name/required
  translation keys.

### Global loading during save

- Use `GlobalLoadingService.begin()` before a create or update repository operation starts.
- End the operation with `GlobalLoadingService.end(operation)` in `finally`, including success
  and failure paths.
- Add an `isSaving` signal and guard create/update methods against duplicate submissions.
- Disable Save/Update and Cancel while `isSaving` is true only if the form implementation
  requires preventing repeat actions; never rely on disabling alone to prevent duplicate calls.
- Render the loading indicator as a native modal `<dialog>` at the application root. Its
  `showModal()` call must place it in the browser top layer, above native form dialogs.
- Implement the loading dialog with `aria-live`, `aria-atomic`, `aria-busy`, and a cancellation
  handler that prevents Escape or another close action while saving.
- Do not use ordinary `position: fixed` stacking or `z-index` alone for this purpose: native
  `<dialog>` elements in the top layer can cover fixed DOM overlays.
- Close or reset the form only after a successful save. On failure, retain the form values and
  allow retry while `isSaving` is false.

For edit mode, branch on the presence of the original ID:

```typescript
const saved = this.editingId()
  ? await this.domainService.updateDomainItem(record)
  : await this.domainService.addDomainItem(record);
```

For delete mode:

1. Ask for confirmation.
2. Find the complete record, including `bookRow`, `itemRow`, `bookId`, and `id`.
3. Call the service with that record.
4. Remove it from the rows signal only after success.

Do not reconstruct a delete request from only an ID.

## Search and Tags

Use `matchesStudySearch()` and the shared `StudySearchService` query signal. Searchable fields
should include the domain's meaningful text fields, contributor, book name/author where the UI
has them, and the spread tag values (`...row.tags`). Do not maintain a second ad-hoc parser.

Tag search must work in both forms:

- `#memory`: exact normalized tag filtering through `matchesStudySearch()`.
- `memory`: ordinary text search over the same normalized tag values included in the fields
  array.

Passing tags only through the matcher `tags` argument is insufficient for unprefixed tag
searches.

Tags have two representations:

- UI/domain model: `string[]`
- GAS/raw model: pipe-delimited string, for example `#one|#two`

Use the shared tag mapper utilities. Do not call `.split('|')` or `.join('|')` in components.

## Legacy-to-Target Comparison

### Legacy `domain-index`

The legacy feature:

- receives `rows` and `currentSheet` as component inputs;
- uses `DomainIndexComponent` with `IndexRow`/`IndexDto` types;
- delegates writes to the broad `DomainDataService.updateDomainSheetRows()` method;
- delegates deletes to `DomainDataService.deleteDomainRow()`;
- persists through `AppDbService.db.indexTopics`;
- uses `DomainIndexService` as a `DomainFeatureHandler` for local loading and bulk sync;
- normalizes tags and refreshes taxonomy after bulk persistence;
- sends generic object rows through the older domain-data API;
- updates the whole local row collection during edit/create operations.

### GAS-backed `domain/index`

The target feature:

- loads its own records through `IndexDataService` and `IndexRepository`;
- uses typed `IndexRaw`, `IndexRecord`, and `IndexGASMapper` contracts;
- uses `GASDomainRepositoryAbstract` and `GASDomainAPI` for shared transport behavior;
- persists in the dedicated Dexie `indexes` table;
- tracks pending, synced, and error states in the repository;
- performs create, update, and delete operations per record;
- derives filtering and hierarchy from signals;
- keeps the component independent of the broad legacy `DomainDataService`.

### Behavior to preserve during migration

- confirmation before delete;
- permission checks for create/edit/delete actions;
- tag normalization and serialization;
- contributor preservation or server assignment;
- optimistic/pending local state with error recovery;
- taxonomy refresh if the domain participates in taxonomy suggestions;
- immediate UI consistency after successful CRUD;
- stable IDs and row metadata across reloads.

## Migration Procedure

For each remaining legacy domain:

1. Identify the legacy row model, sheet name, headers, tags, contributor, and special fields.
2. Define `*Raw` with the exact GAS response shape, including `bookId`, `bookRow`, `itemRow`, and
   `id` semantics.
3. Define `*Record extends Domain` with typed business fields.
4. Implement `*GASMapper` and tests for raw-to-record, record-to-raw, tags, and status.
5. Add a typed `*GASRepository` extending `GASDomainRepositoryAbstract`.
6. Add a feature repository that reads/writes the correct Dexie table and handles pending/error
   synchronization.
7. Add a query service for local records scoped to the owning book.
8. Add a feature service exposing `getRecords`, `addDomainItem`, `updateDomainItem`, and
   `deleteDomainItem`.
9. Implement the standalone component with signal state, computed filtering, hierarchy/list
   rendering, and permission-aware actions.
10. Migrate the form and card to typed `input()`/`output()` contracts.
11. Register the domain in the detail view and route/feature wiring as required.
12. Remove the legacy handler path only after the new path is used by the UI and tested.

## Validation Checklist

Before considering a domain migrated, verify all of the following:

### Types and mapping

- `npm run build` passes.
- Raw and domain models distinguish `bookRow` and `itemRow`.
- `toRecord()` and `toRaw()` round-trip tags and sync status correctly.
- No `any` is added for request payloads.
- No per-domain `rowValueKeys` list is needed to reconstruct the raw object.

### GAS requests

- Read uses the expected `bookRow` query parameter.
- Create uses `CREATE_ROW`.
- Update uses `UPDATE_ROW`, not `CREATE_ROW`.
- Delete uses `DELETE_ROW`.
- Create/update row identity fields are defined by the mapper and are not stripped by the API.
- Update row objects include `bookRow`, `itemRow`, and `itemId` in addition to domain fields.
- Delete sends `row: bookRow`, `itemRow: record.itemRow`, and `itemId: record.id`.
- Authentication and non-success responses are surfaced as errors.

### Persistence

- Remote reads are persisted to the correct Dexie table.
- New records replace temporary IDs with server IDs.
- Updates replace the existing local record.
- Deletes remove local data only after remote success.
- Failed writes retain an error/pending record suitable for retry.

### UI behavior

- Search updates without reloading the component.
- Tag searches match both `#tag` and unprefixed `tag` queries.
- Empty and filtered-empty states are distinct and accessible.
- New records appear immediately after successful creation.
- Edited records update immediately after successful update.
- Deleted records disappear immediately after successful deletion.
- Form state resets only after success.
- Required fields show `*` before submission and translated validation messages only after
  an invalid save attempt.
- Global loading covers create/update operations and appears in the browser top layer above
  native form dialogs.
- Duplicate submissions are prevented while saving.
- Permission checks remain in the template and are backed by the permission service.

### Tests

Add focused tests for:

- mapper conversions;
- query scoping by `bookId`;
- `CREATE_ROW`, `UPDATE_ROW`, and `DELETE_ROW` payload shapes;
- `bookRow` versus `itemRow` handling;
- IndexedDB pending/synced/error behavior;
- component filtering and successful CRUD signal updates.

## Common Failure Modes

- **Fields shift or identity disappears in the payload:** the mapper and API disagree about the
  row object. Derive rows from `toRaw()` and never add a generic helper that strips `id` or
  `bookId`; test the serialized body for create and update.
- **Delete targets the wrong book:** `record.itemRow` was used as the top-level book row. Use
  `record.bookRow` for `row` and `record.itemRow` for `itemRow`.
- **Edits create duplicates:** the component still calls `addDomainItem()` while editing.
  Branch on the original ID and send `UPDATE_ROW`.
- **Updates cannot identify the item:** `itemId`, `bookRow`, or `itemRow` was sent only at the
  top level or omitted from `rows`. Include all three fields in every update row object.
- **Rows disappear after refresh:** the remote result was not written to the correct Dexie
  table, or records were saved without `bookId`.
- **Search appears broken:** filtered rows were stored in a writable signal and never derived
  from the query signal. Use `computed()`.
- **Loading stays behind the form:** the loader is only a fixed `<div>` and cannot outrank a
  native `<dialog>`. Use a native loading `<dialog>` with `showModal()` and close it in the
  loading service lifecycle.
- **Required warnings appear immediately:** field messages were rendered without a submitted
  attempt state. Show asterisks unconditionally and errors only after `submitted` becomes true.
- **Duplicate saves occur:** no in-progress guard exists. Use `isSaving` plus
  `GlobalLoadingService.begin()/end()` around create/update operations.
- **Tags are unreadable:** UI arrays were sent directly to GAS or raw strings were rendered
  directly. Convert at the mapper boundary.
- **Delete fails after reload:** `bookRow` was only assigned in the component. Persist it on the
  record when fetched and when saved.
- **Abstract fallback is called unexpectedly:** a domain with special row semantics did not
  override the concrete repository operation. Add the override rather than weakening the
  shared contract.

## Agent Operating Rules

When asked to migrate a domain:

1. Read the legacy domain end to end before editing.
2. Use `domain/index` as the architectural reference, not as a blind copy.
3. Confirm the GAS backend field names and action names from existing API code or tests.
4. Preserve user changes in dirty files.
5. Make the smallest coherent migration slice: model/mapper, transport, repository, service,
   component, tests.
6. After the first edit, run the narrowest relevant test or build before expanding the change.
7. Inspect the generated request payload for all three CRUD actions.
8. Finish with `npm run build` and report any pre-existing warnings separately.
