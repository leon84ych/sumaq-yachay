# Domain Migration Specification Agent

## Purpose

Use this specification when creating, migrating, or changing domains under
`src/app/features/domain/`. Inspect current code and the user's requirements before changing it.

The reference implementation is the INDEX domain:

- Target feature: `src/app/features/domain/index/`
- Shared GAS infrastructure: `src/app/core/infrastructure/gas/`
- Shared domain contract: `src/app/features/domain/shared/model/domain-shared-model.ts`
- Shared IndexedDB service: `src/app/shared/local-db/local-db.service.ts`
- Shared write worker and registry: `src/app/features/domain/shared/domain-repository/`
- Book and book detail: `src/app/features/catalog/book/` and `src/app/features/catalog/book-detail/`

The goal is not to copy INDEX literally. The goal is to preserve each domain's business fields
while adopting the same typed transport, persistence, CRUD, search, permission, and UI patterns.

## Target Architecture

Each migrated domain should have these layers:

```text
component -> local write service/worker -> IndexedDB pending write queue
                                       -> GAS repository -> GAS domain API -> Apps Script
          -> domain data/query service -> local repository / IndexedDB
```

Components own presentation state with signals. `DomainWriteSyncWorker` owns durable remote
writes; INDEX and PASSAGES use their dedicated services, while
`AllDomainWriteSyncService` and `DomainWriteView` cover the other registered domains.
Feature repositories handle reads and remote refresh; GAS repositories and mappers handle
transport. Start workers independently of a mounted domain view so queued writes can resume.

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

Current naming includes `features/domain/events/events/` and `EventRecord` in
`events/model/event-model.ts`; book and book-detail live under `features/catalog/`. Domain
component, card, form, and quiz selectors do not use the former `-1` suffix. Keep imports,
resolver cases, templates, fixtures, and tests consistent when adding or renaming a domain.

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

For new domain entries, including AI-generated questions, use
`createDomainId(bookId, domain)` from the shared model. The format is
`bookId_DOMAIN_timestamp`, with the actual `DomainName` (for example `BOOK_EVENTS` or
`GLOSARY`) and a millisecond timestamp. The helper is monotonic within one application
instance; timestamp-only IDs are not guaranteed unique across tabs, restarts, or devices.
Edits retain the existing ID, including legacy IDs; do not migrate existing records implicitly.
Send the ID in the create row. The user states that the backend preserves it; the client still
uses the ID returned by GAS and handles a different returned ID through durable aliases. Verify
the deployed backend separately rather than treating mocks as proof.

Non-INDEX feed records use optional `Feed` fields; `QuestionRecord` extends `Learnable` and
INDEX extends `Domain`. Preserve optional scheduling/review metadata when refreshing or syncing.

Every raw model returned by GAS must declare the fields that the mapper needs, including
`bookRow` when the response contains it. If GAS does not return `bookRow`, the repository must
populate it from the `bookRow` argument used for the fetch before persisting the record.

Example domain model (the feed fields are optional):

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

export interface ConceptRecord extends Feed {
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
   `bookId`, `id`, contributor, and sync status. Update transport must include `itemId` in
   the row object; the shared API may add it from the stable record ID.
5. `toRowValues()` may remain for sheet-column operations, but the shared repository request
   path uses `toRaw()` to build object-shaped `rows` payloads. Do not create a per-domain
   `rowValueKeys` list solely to reconstruct the same object.

The GAS create/update row object must be derived from the typed raw definition. The transport
API must not silently remove or rewrite `id`, `bookId`, `bookRow`, or `itemRow`. New domain
creates supply the shared generated ID. Updates preserve existing identity and include `itemId`
explicitly.

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
      "id": "book-id_CONCEPTS_1800000000000",
      "bookId": "book-id",
      "bookRow": 2,
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
known. The typed mapper must preserve the supplied identity; the API must not strip it.
The response ID is required and remains authoritative in the current client. If it differs,
the worker atomically replaces the local key and records an alias; linked records must resolve
that alias before sending. Do not silently substitute a client ID for a different server ID.

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
  "bookRow": 2,
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

### Local persistence and background writes

- For normal domain forms, create/update commits the local record and durable
  `pendingDomainWrites` entry atomically, then closes/resets the form without waiting for GAS.
  INDEX and PASSAGES have dedicated workers; the registry covers CONCEPTS, QUOTES, CHARACTER,
  PLACES, BOOK_EVENTS, RELATIONS, ASSOCIATIONS, GLOSARY, and QUESTIONS, including generated
  question creates. Use the existing worker/view APIs rather than a foreground repository write.
- Preserve ownership, revision, review metadata, aliases, and pending operations across edits,
  navigation, reload, offline periods, and startup recovery. Resume when online and authorized;
  enforce account matching and explicit confirmation for unowned writes. Coordinate tabs with
  the existing locks/leases and honor timeouts.
- A confirmed delete of a synced item stays visible as pending until remote success; disable its
  edit/delete actions. An unsent create can be removed locally. For an uncertain create/deletion,
  follow existing warning, verification, and explicit retry/confirmation flows; do not
  automatically repeat a potentially completed non-idempotent request.
- Queue linked records until their referenced records are synchronized: RELATIONS references
  CHARACTER, ASSOCIATIONS references CONCEPTS, BOOK_EVENTS references CHARACTER/PLACES, and
  QUESTIONS can reference a recognized source domain. Resolve stored aliases before sending;
  missing references remain queued with a surfaced message. Related form selections must follow
  ID changes. Test ordering and ensure no pending linked ID is sent prematurely.
- `getDomain()` maps raw records, fills missing ownership context, and persists the correct table.
  Snapshot before a remote fetch and merge transactionally so pending/error entries, local changes
  and deletions during the fetch, and local feed/review metadata are not overwritten or restored.
- Sample mode performs local CRUD without GAS or authentication. Keep its persistence and seed
  behavior distinct from the remote queue, including pending records that remain visible on reload.

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
- the component uses the feature/query service and shared write worker/view, not `fetch()` or
  ad-hoc Dexie writes.
- the UI reflects the successful local commit immediately and observes later synchronization.
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

### Save and loading behavior

- Guard duplicate submissions with `isSaving` or the domain's equivalent for the local commit.
- Close/reset only after the local transaction succeeds; on local failure retain form values and
  surface the error. A later network failure leaves the entry visible and retryable; it must not
  reopen the form or block the whole application with a global loading screen.
- Global loading remains appropriate for explicitly foreground operations, not background domain
  synchronization. When used, balance `begin()`/`end()` in `finally` and preserve the accessible
  root native-dialog/top-layer behavior.

For delete mode:

1. Ask for confirmation.
2. Find the complete record, including `bookRow`, `itemRow`, `bookId`, and `id`.
3. Call the service with that record.
4. Reflect the worker result: remove an unsent local create or keep a remote delete visible as
   pending until success/explicit confirmation.

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

## Shared Footer, Image Export, And Card Spacing

- Use `DomainEntryFooterComponent` in domain cards, Learn cards, and question practice where
  applicable. Its left side orders permitted delete, edit, then contributor attribution. Keep
  `PermissionService` and read-only flags authoritative; suppress edit/delete during pending
  deletion. Contributor filtering uses the full identity even when its label is shortened.
- Feed review controls appear on the right, immediately before image export. After a successful
  clock/forgotten or checkmark/recalled click, disable both controls and highlight only the
  selected action until the item leaves the UI. During a failed write, surface the error and do
  not mark the action successful. Preserve keyboard, translated names, `aria-pressed`, and light/
  dark states.
- Reuse `DomainEntryExportService` and the footer's shared branded JPEG template rather than
  implementing per-domain exports. Export data carries domain, ID, title/body, source, tags,
  optional note and accent; preserve light/dark output, URL, shared busy state, and error
  notification. INDEX omits export; Quotes uses the shared export, not duplicate quote/analysis
  download buttons. Respect existing visibility/read-only flags for each context.
- Align content, tags and footer using `--domain-entry-section-gap` from `src/styles.css`;
  Places and Passages are the spacing reference. Quotes retains its distinct flip-card layout.
  The Passage read action stays on the right of its tags row. Check layouts on narrow screens.
- Catalog book cards are separate from domain footers: keep their edit/delete controls on the
  left and active toggle on the right.

## Learn Feed And Scheduling

- Learn excludes INDEX and QUESTIONS. Load further distinct entries automatically as the user
  scrolls using the existing observer/sentinel; preserve loading, retry-on-error, empty,
  filtered-empty, and end-of-feed messages. Reset seen IDs on a new search and ignore stale
  requests; never add a normal manual Load More action.
- `selectLearnFeedBatch` prioritizes entries due by `lastSeen` and `interval`, while filling
  remaining slots with not-yet-due entries when needed; it does not enforce a strict due-only
  filter. Preserve per-domain diversity and exclusion of already-shown IDs.
- `markAsShown` persists `lastSeen` and initializes/normalizes optional intervals to powers of two.
  Minimum is one day; `ConfigService` defaults the configurable maximum to 256 days and accepts
  positive power-of-two settings. If a valid interval is due and no review occurred since the
  previous display, double it up to that configured maximum. Forgotten halves the interval to
  the minimum; recalled doubles it to the maximum; record the appropriate count and `lastReview`.
  Preserve scheduling fields during remote refresh and concurrent background writes.
- Cover first display, missing/invalid values, due and not-due prioritization, elapsed time,
  review versus no interaction, caps, failed local writes, repeated scrolling, and end-of-feed.

## Legacy-to-Target Comparison

Historical migration context only: inspect the workspace before assuming a legacy feature or
handler still exists. Do not recreate removed paths.

The current GAS-backed `domain/index`:

- loads its own records through `IndexDataService` and `IndexRepository`;
- uses typed `IndexRaw`, `IndexRecord`, and `IndexGASMapper` contracts;
- uses `GASDomainRepositoryAbstract` and `GASDomainAPI` for shared transport behavior;
- persists in the dedicated Dexie `indexes` table;
- tracks durable pending writes through its background worker;
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

For each new or migrated domain:

1. Identify the existing or required row model, sheet name, headers, tags, contributor, and
   special fields.
2. Define `*Raw` with the exact GAS response shape, including `bookId`, `bookRow`, `itemRow`, and
   `id` semantics.
3. Define `*Record extends Domain` with typed business fields.
4. Implement `*GASMapper` and tests for raw-to-record, record-to-raw, tags, and status.
5. Add a typed `*GASRepository` extending `GASDomainRepositoryAbstract`.
6. Add a feature repository that reads/merges the correct Dexie table and register durable
   background writes with the shared worker infrastructure.
7. Add a query service for local records scoped to the owning book.
8. Add the necessary feature/query service and shared local-first write integration.
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
- Delete sends `bookRow: record.bookRow`, `itemRow: record.itemRow`, and `itemId: record.id`.
- Authentication and non-success responses are surfaced as errors.

### Persistence

- Remote reads are persisted to the correct Dexie table.
- New records use the shared ID format; edits preserve existing IDs; server-returned ID changes
  are handled atomically with durable aliases and linked-reference resolution.
- Creates and updates are committed locally with the queue before background transport; pending
  writes survive navigation/restart and show item-specific status and retry controls.
- Pending deletions remain visible until remote success; unsent creates can be removed locally.
- Offline, account mismatch, uncertain requests, dependencies, and failed writes retain safe,
  visible recovery paths. Remote refresh preserves pending and concurrently modified records.

### UI behavior

- Search updates without reloading the component.
- Tag searches match both `#tag` and unprefixed `tag` queries.
- Empty and filtered-empty states are distinct and accessible.
- New and edited records appear after the local commit, without waiting for remote completion.
- Pending remote deletions stay visible until success; local unsent creates can disappear.
- Form state resets only after the local commit succeeds.
- Required fields show `*` before submission and translated validation messages only after
  an invalid save attempt.
- Background create/update does not trigger a global loading screen. Foreground operations
  retain accessible native-dialog loading behavior where appropriate.
- Duplicate submissions are prevented while saving.
- Permission checks remain in the template and are backed by the permission service.
- Shared footer ordering, review selection, image export, section spacing and Quotes exception
  work in domain, Learn and question-practice contexts.
- Learn auto-loads distinct entries on scroll and preserves due-priority/review scheduling.

### Tests

Add focused tests for:

- mapper conversions;
- query scoping by `bookId`;
- `CREATE_ROW`, `UPDATE_ROW`, and `DELETE_ROW` payload shapes;
- `bookRow` versus `itemRow` handling;
- local-first queue persistence, restart, retry, uncertainty, linked dependencies and refresh races;
- generated IDs, edit identity, serialized create payload, and server response/alias handling;
- shared footer, permission gating, review interaction, export and spacing where affected;
- Learn scrolling, due priority, optional scheduling values and review caps where affected;
- component filtering and successful CRUD signal updates.

## Common Failure Modes

- **Fields shift or identity disappears in the payload:** the mapper and API disagree about the
  row object. Derive rows from `toRaw()` and never add a generic helper that strips `id` or
  `bookId`; test the serialized body for create and update.
- **Delete targets the wrong book:** `record.itemRow` was used as the top-level book row. Use
  `record.bookRow` for `bookRow` and `record.itemRow` for `itemRow`.
- **Edits create duplicates:** the component still calls `addDomainItem()` while editing.
  Branch on the original ID and send `UPDATE_ROW`.
- **Updates cannot identify the item:** `itemId`, `bookRow`, or `itemRow` was sent only at the
  top level or omitted from `rows`. Include all three fields in every update row object.
- **Rows disappear after refresh:** the remote result was not written to the correct Dexie
  table, or records were saved without `bookId`.
- **Search appears broken:** filtered rows were stored in a writable signal and never derived
  from the query signal. Use `computed()`.
- **Background saves block the screen:** the form waits for GAS or starts global loading instead
  of closing after its local queue transaction. Use the existing background worker.
- **Foreground loading stays behind a form:** a fixed `<div>` cannot outrank a native `<dialog>`.
  Use the existing native loading dialog and close it in the loading-service lifecycle.
- **Required warnings appear immediately:** field messages were rendered without a submitted
  attempt state. Show asterisks unconditionally and errors only after `submitted` becomes true.
- **Duplicate saves occur:** no local in-progress guard exists. Use `isSaving` or the domain's
  equivalent without blocking the application during background transport.
- **Linked writes use stale IDs:** a dependent write was sent before its parent synchronized or
  an alias was ignored. Keep it queued and resolve persisted aliases before sending.
- **Unsynced data disappears after refresh:** merge remote data against a pre-fetch snapshot and
  preserve pending, changed, and deleted-during-fetch records.
- **Tags are unreadable:** UI arrays were sent directly to GAS or raw strings were rendered
  directly. Convert at the mapper boundary.
- **Delete fails after reload:** `bookRow` was only assigned in the component. Persist it on the
  record when fetched and when saved.
- **Abstract fallback is called unexpectedly:** a domain with special row semantics did not
  override the concrete repository operation. Add the override rather than weakening the
  shared contract.

## Agent Operating Rules

When asked to change a domain:

1. Read the affected domain and shared integration end to end before editing.
2. Use `domain/index` as the architectural reference, not as a blind copy.
3. Confirm the GAS backend field names and action names from existing API code or tests.
4. Preserve user changes in dirty files.
5. Make the smallest coherent migration slice: model/mapper, transport, repository, service,
   component, tests.
6. After the first edit, run the narrowest relevant test or build before expanding the change.
7. Inspect the generated request payload for all three CRUD actions.
8. Finish with `npm run build` and report any pre-existing warnings separately.
