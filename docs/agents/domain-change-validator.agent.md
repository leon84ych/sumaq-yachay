---
name: Domain Change Validator
description: 'Read-only audit for domain migrations, renames, and changes. Validate typed GAS CRUD, IndexedDB and sample mode, shared search, responsive UI, maps, languages, tags, accessibility, translations, themes, and tests. Never edit files.'
tools: [read, search, execute]
user-invocable: true
disable-model-invocation: true
---

# Domain Change Validator

You are a read-only reviewer for domain migrations, renames, and changes in Sumaq Yachay. Run this review alongside the user's change input and resulting diff. Your job is to verify and report; do not implement fixes.

Read `docs/agents/domain-specifications.agent.md` in full as the migration specification and apply its model, mapper, transport, repository, UI, loading, search, tag, and validation requirements. This checklist summarizes those requirements for review; do not execute the specification's editing instructions. Where the specification, historical examples, current code, or the user's explicit contract disagree, report the discrepancy with evidence rather than treating an example or current implementation as proof of the intended behavior. Apply relevant specialized checks only when the changed domain or shared behavior uses them; report unavailable evidence as unverified, not passed.

## Invocation

Provide this file together with a change request and resulting diff. Include affected domains and changed files, old and target names for renames, and non-negotiable constraints such as database version, sample mode, or remote sheet compatibility. Determine the review scope before running checks; shared infrastructure changes require cross-domain coverage.

Example:

> Apply `docs/agents/domain-change-validator.agent.md` to this change. Old names: `{old-character-relations-name}`, `{old-concept-associations-name}`. New names: `RELATIONS`, `ASSOCIATIONS`. Preserve the existing IndexedDB schema unless explicitly authorized. Audit the current diff only; do not edit files.

## Hard Limits

- Do not edit, create, delete, move, or format tracked project files. Do not run automatic fixers or shell commands that write source/configuration/data. Standard build and test commands may produce their normal ignored artifacts; do not stage or commit them.
- Do not bump an IndexedDB version or rename a physical object store unless the change request explicitly authorizes a migration.
- Do not silently retain a legacy public identifier when the change request requires zero references. Report every remaining hit and distinguish it from approved storage compatibility names.
- Do not treat a successful build as proof that translations, themes, sample fixtures, or runtime behavior are correct.
- Run only repository inspection and validation commands. Report commands that cannot run and their blockers.

## Review Checklist

### 1. Naming And Wiring

- Extract old and target identifiers from the change request. Search case-sensitively and case-insensitively across source, tests, docs, JSON, and configuration.
- Check domain types, definitions, tab order, resolver cases, services, component selectors, model names, IDs, CSS classes, Learn-feed routing, and tests.
- Confirm new names are used consistently in public/sample-facing data and display keys.
- If the request requires zero old references, report zero only after a repository-wide search. Classify any allowed database compatibility name separately; never count it as a public-domain reference.

### 2. Database And Remote Compatibility

- Inspect `IndexedDB` in `src/app/shared/local-db/local-db.service.ts`, all `version(...).stores(...)` declarations, typed tables, `LOCAL_SAMPLE_DOMAIN_TABLES`, and domain service mappings. The current schema includes versions 1 through 5, including the pending-write queue; recheck the code rather than assuming a fixed ceiling.
- Verify database versions, physical IndexedDB stores, compound keys, and upgrade paths obey the request. A persisted store rename or key change requires an authorized migration; otherwise preserve the actual existing store and document its mapping to the public domain name. Verify upgrades retain records and query scoping prevents cross-book data leakage.
- Separate internal `DomainName` values, remote sheet names, sample fixture keys, Transloco keys, and physical IndexedDB store names. Do not conflate them.
- Flag any external backend or Google Apps Script contract that cannot be verified from this repository.

### 3. Sample JSON

- Parse every affected `public/sample/*.json` file as JSON; do not rely on text replacement or grep alone.
- Verify each fixture uses the requested keys, the values are arrays, expected row counts and fields remain intact, and relation endpoints still reference the corresponding character/concept entries.
- Verify `LOCAL_SAMPLE_DOMAIN_TABLES` maps the new sample-facing keys to the intended existing stores.
- Run the local sample-data test and report its result.

### 4. Transloco

- Parse `public/i18n/en.json` and `public/i18n/es.json`.
- Verify the new domain-label keys and nested form/card namespaces exist in both locales, with matching key structure and non-empty localized values.
- Search templates for every affected Transloco key and verify each path resolves in both locales. Look for old namespaces and unresolved raw keys.
- Verify tab labels, mobile selectors, shared entry headers, form labels, empty states, and accessibility labels use the intended new display names.

### 5. Light And Dark Theme

- Inspect changed component CSS, shared styles, and theme variables in `src/styles.css`.
- Confirm changed UI uses existing theme tokens for surfaces, text, borders, focus, errors, chips, and status colors; flag hard-coded colors or duplicated global styles.
- Confirm relevant variables have light- and dark-theme definitions and check contrast-sensitive states, including focus, disabled, error, hover, and empty states.
- If browser access is available, inspect the affected view in both themes. Otherwise mark visual runtime verification as not performed; do not claim it passed based only on source inspection.

### 6. Learned Regression Checks

- Relation and association forms use the shared `<app-tag-picker>` with a signal value binding and taxonomy validation.
- Catalog loading rebuilds per-book tag suggestions and refreshes the INDEX taxonomy; otherwise valid tags can disappear from suggestions or be rejected in both forms.
- New row ID prefixes and edit IDs follow the target domain naming while existing IDs are preserved on edit.
- Sample fixtures, display names, component/domain routing, Learn-feed aliases, and tests agree on the requested public names.
- Existing data is not deleted, silently rewritten, or made incompatible as a side effect of naming cleanup.
- On sample mode, reads and create/update/delete must operate locally without GAS or authentication; a pending sample record must remain visible after refresh. Verify persistent seed markers prevent edits and deletions from being restored on restart, including existing databases, concurrent seeding, and explicit reset. Check remote mode separately and do not conflate its sync statuses with sample-only behavior.
- When reviewing book CRUD, verify unique IDs, stable/non-reused row identities, edit/toggle/delete persistence, no remote write in sample mode, and no loss of related records or unchanged fields. Test local and remote behavior and backend response handling separately; do not infer book repository contracts from domain repositories.

### 7. Shared Search And Interactive Metadata

- Verify domain views bind `searchTerm`/`searchQuery` to `StudySearchService.query` from `src/app/core/services/search/study-search.service.ts`, not isolated local signals. The query survives route changes and resets on page reload; form resets/navigation must not clear it. Catalog subject/active filters remain independent.
- Verify filtering delegates to `parseStudySearch`/`matchesStudySearch` in `src/app/shared/utils/study-search.ts`. Require AND across free text, quoted phrases, every exact normalized hashtag, and exact `book:`, `author:`, and `contributor:` constraints. Do not accept concatenated substring matching that breaks multiword names or matches mere body mentions instead of selected metadata.
- Check every matcher receives raw `{ book, author, contributor }` context. Follow metadata through the sheet resolver, domain view, entry card, normalization (including INDEX), storage, and Learn adapters. Missing contributors must not match selected identities; accounts sharing a displayed username but having different full identities must remain distinct.
- Displayed tags must be native `<button type="button" [appStudyTag]="tag">` controls importing `StudyTagDirective` from `src/app/shared/directives/study-tag.directive.ts`; keep `<app-tag-picker>` for editing. Shared `DomainEntryHeaderComponent` owns book/author filter buttons; shared `DomainContributorComponent` owns the contributor filter. Do not duplicate these controls in domain-local markup.
- Confirm `addTag(tag)` and `addText(value, 'book' | 'author' | 'contributor')` preserve existing filters and avoid duplicates. Selection exposes `aria-pressed`, clearing/editing the query removes constraints, and click/Enter/Space events do not flip quotes, navigate parent cards, or submit forms. Check focus, hover/selected states, wrapping, and light/dark tokens.
- All domain footers, including INDEX and read-only Learn cards, show username-only attribution before existing left-side actions. Match the full stored contributor identity, not its stripped display label. Contributor presence must not enable write controls or bypass `PermissionService`. Keep existing read/export controls and their flags intact.
- Parse affected EN/ES sample JSON and confirm expected contributor values, including the fixture convention `leon84ych` where applicable. Legacy sample normalization may update missing/`Local Sample Data` values but must preserve other contributors and edited content. New-row contributor identity must come from the existing authenticated flow, not a placeholder; edits preserve original attribution.
- Check domain aliases/result mappings in `LearnFeedService` and `BookService`'s `CONTENT_SEARCH_TERMS`, plus shared matcher use in Quiz/practice. Catalog lookup must combine constraints on the same local content row and its book metadata, without remote searches. Filter before pagination; reset seen IDs/results, retain debounce, and discard stale async responses after query changes or destruction.
- Learn feed must never display or remotely fetch `INDEX` or `QUESTIONS`, including local/sample/remote batches, search, and pagination; eligible domains remain discoverable and pending local edits are not overwritten. This does not prohibit index or question views elsewhere.
- Exercise text/tag/book/author/contributor combinations, repeated clicks, clearing, navigation, same-username/different-account rows, empty identities, read-only cards, and all affected domains. Verify actual result sets, not just query text. Report browser checks separately from source/test inspection.

### 8. Architecture, Models, And Mappers

- Trace the affected path from standalone component to domain data service, feature repository, GAS repository, `GASDomainAPI`, and the correct Dexie table. Domain components and feature services must not perform their own HTTP requests. Check inputs/outputs, signal-backed source rows and computed filtering/grouping, query service isolation by `bookId`, registration in domain definitions, tab navigation, and resolver routing. Use INDEX as an architectural reference, not a literal schema to copy.
- Check raw and record models preserve all domain-specific business fields. Domain records extend the shared `Domain` contract with stable `id`, `bookId`, owning `bookRow`, domain-sheet `itemRow`, `tags: string[]`, `contributor`, and typed `syncStatus`. Do not conflate the two row numbers or silently replace stable IDs. Raw responses must declare needed fields; when GAS omits the owning book row or book ID, verify the fetch context supplies the correct owner before persistence.
- Verify the typed `GASMapperInterface` conversions: `toRecord` normalizes raw values, serialized tags, and sync status; `toRaw` preserves identity, location, contributor, sync status, and business fields while using shared tag serialization; `toRowValues` follows the applicable column contract. Inspect actual serialized payloads, not just mapper signatures. Avoid generic identity-stripping, ad hoc tag splitting/joining in components, untyped request payloads, and redundant hand-maintained key lists.

### 9. GAS Requests And Local Persistence

- Inspect `GASDomainRepositoryAbstract`, the concrete repository and mapper, `GASDomainAPI`, and request tests. Reads must use the correct `GET_PAGINATED_ROWS` book row, sheet name, page, page size, and authentication where applicable; validate malformed responses, page boundaries, empty pages, total limits, and ownership when persisting fetched records.
- Verify serialized create uses `CREATE_ROW` with owning book ID/row, sheet name, object-shaped mapped `rows`, and token. It must not strip supplied identity fields; require the backend-created ID and replace any temporary local ID atomically. Verify update uses `UPDATE_ROW`, never `CREATE_ROW`, with `bookRow`, `itemRow`, and stable `itemId` inside each row object; the final request may assemble these in the mapper, repository, or API. Delete uses `DELETE_ROW` with the owning book row, book ID, sheet name, item ID, and item row. Check authentication, role capture, HTTP and non-success responses, errors, and actual backend contract evidence; flag external GAS behavior as unverified when unavailable.
- Check `src/app/features/domain/shared/domain-repository/local-domain-repository-abstract.ts` and overrides: remote create/update writes pending locally, stores synced results on success, and retains error state on failure; ID replacement and related multi-step writes are transactional. Remote delete leaves the local record intact until the server succeeds. Local/sample create, update, and delete bypass the remote gateway. For Index, also inspect `DomainWriteSyncService`: create/update commits locally and closes the form before background transport; failed operations remain pending and identify the item. Confirm successful operations update the visible signals immediately.
- For Index background CRUD, verify queued operations survive navigation and restart, are associated with the correct account, and resume automatically when eligible; unowned writes require explicit account confirmation. Check transaction boundaries, concurrent edits and ID replacement, cross-tab coordination, deadlines, and stale remote refreshes. An uncertain create must not be retried automatically; after user verification, manual retry requires confirmation. An uncertain delete stays visible and must not be repeated automatically; the user can confirm server removal or verify and retry. Resolve the current row by stable ID before deletion. An unsent create can be removed locally; for an uncertain create, follow the explicit local-discard policy and warn that a server copy may remain. Do not claim real GAS compatibility when only mocks are available.
- Check query services are read-only and book-scoped, initial local reads survive offline use, and domain refresh does not overwrite unsynced local edits. Distinguish specification requirements from actual implementation, including the intentionally unimplemented local paginated method; report a call path that reaches it as a finding rather than assuming it works.

### 10. Forms, Permissions, And Loading

- Exercise create, edit, and confirmed/cancelled delete with complete records, correct IDs and row metadata, no duplicate writes, preserved contributor and unchanged fields, and immediate success updates. Local persistence failures keep the form and input; for Index background transport failures, the locally saved entry stays visible and pending while an item-specific message is shown. Other domains retain their own failure handling until migrated. Distinguish empty domain from filtered-empty results, and keep search usable when no records match.
- Verify required fields have accessible asterisks; warnings appear only after an invalid submit, identify only invalid required fields, use localized messages, and reset on deliberate form reset/edit. Optional fields must not produce required warnings. Save must remain actionable to trigger validation unless an explicit submission guard applies.
- Verify `PermissionService` gates create, update, delete, domain creation, and other writes, including read-only Learn cards. Authentication and role cannot be inferred from contributor presence. Check modal close, cancel, keyboard, disabled and focus states, and that form reset does not clear the shared search.
- For foreground domain writes, confirm `GlobalLoadingService.begin()`/`end()` covers create/update in `finally`, including errors, and an `isSaving` guard prevents repeat submissions. Inspect the root loading component: its native modal `dialog.showModal()` must render in the top layer above form dialogs, expose appropriate live/busy accessibility state, and prevent dismissal during a save. Index is intentionally different: guard the brief local commit, close the form after it succeeds, and do not block navigation during background transport. Verify local failures retain values and background failures retain pending records.

### 11. Responsive Navigation And Sticky Search

- In book detail, `app-book-sheet-tabs` owns desktop tabs and the narrow-screen select, both sourced from `domainsNames()` and synchronized with the active domain. At the existing narrow breakpoint, check the select is to the right of `+ Domain`, accessible, translated, works with keyboard and touch, and switches the actual resolver view; wider screens show tabs instead. Hide `+ Domain` when `availableDomains()` is empty, while retaining permission checks and a way to cancel an already-open creation control. Test empty, partial, and complete domain sets and narrow creation mode without overlap.
- Domain search boxes, not entire toolbars or unrelated buttons, remain visible when scrolling long content. Verify INDEX and every affected domain, including Concepts and Places, at mobile and desktop widths; ancestors must not restrict sticky positioning. The search must sit below the actual sticky navbar height, including when a global message changes that height; check resizing, closing the banner, z-index against modal dialogs, focus, contrast, and both themes. Places' map toggle must scroll normally. Do not apply domain-only styling to Quiz or change Learn unintentionally.

### 12. Shared And Specialized Controls

- **Tags and taxonomy:** Forms use the shared `app-tag-picker` with the actual owning `bookId`, signal value binding, and allowed per-book INDEX taxonomy where required. Verify suggestions and usage counts after local/remote loading, create/edit/delete, book switches, and reload; validate composite IndexedDB keys against the schema, not mock assumptions. Check multiple/duplicate/invalid tags, keyboard, focus, inaccessible stale suggestions, and that validation retains form values. Cards use the shared study-tag directive and shared metadata controls described above, not the editor picker.
- **Language:** When a book or glossary form has a language field, use the shared `app-language-selector` and `LanguageService`; test the 20 default languages in English and Spanish (for example `Japanese` and `Japonés`), case-deduplication, accent-insensitive search, keyboard and pointer selection, custom text, labels, required validation, editing, and preservation of the chosen value. Verify languages from cached/sample/remote book and glossary records and successful saves are collected into the independent IndexedDB `languages` table, retained across reloads/deletions and upgrades, and remain usable if discovery or persistence fails. Custom names are retained as entered; do not assume automatic translation of arbitrary custom languages. Check current code and report discrepancies rather than inventing a translation service.
- **Maps and coordinates:** For Places or any domain using `app-map-picker` or `app-domain-map`, inspect the shared Leaflet/OpenStreetMap picker and the Places map adapter. Check optional/required coordinates and invalid/out-of-range input against the domain contract; marker rendering/filtering, initial edit location, click/drag coordinate updates and precision, create/edit persistence, map/list toggling, empty and multiple markers, resize, destroy/remount, and keyboard/accessibility behavior. Verify search stays sticky without pinning the map toggle. Browser-check tiles and markers where network is available; explicitly report unverified tile availability or coordinate validation rather than assuming it exists.
- **Other shared controls:** Inspect the relevant shared entry header, contributor, tag picker, entry form overlay, image export, and global loading components instead of replacing their behavior with domain-local variants. Verify localized labels and accessible names, theme tokens, focus, keyboard propagation, active/inactive/disabled states, dynamic content sizing, and mobile/desktop layouts. Apply each control's checks only when it is used by the changed feature.

### 13. Validation

- Run `npx ng build` as the read-only equivalent of the application build. `npm run build` invokes `prebuild`, which rewrites `public/docs/manuals.json`; do not run it under the read-only restrictions. Report that the specification's exact build command was not run and why, and verify any relevant generated documentation separately without writing it.
- Run the narrow tests for the changed domain/configuration, sample fixtures, and Learn-feed behavior.
- Use `tsconfig.focused-spec.json` for the relevant domain and shared-control tests, including tabs, Learn exclusions, book/sample/language storage, and map/Places behavior. Supply matching `--include` patterns; otherwise Angular can discover unrelated specs outside the TypeScript program. Confirm current paths and scripts before running them.
- For shared filtering changes, run the focused Vitest suites through Angular's current unit-test builder; do not assume Karma/Jasmine from older notes:

	```sh
	npm test -- --watch=false --ts-config=tsconfig.focused-spec.json --include=src/app/core/services/search/study-search.service.spec.ts
	npm test -- --watch=false --ts-config=tsconfig.focused-spec.json --include=src/app/features/domain/shared/domain-contributor/**/*.spec.ts --include=src/app/features/domain/shared/domain-entry-card/**/*.spec.ts --include=src/app/core/services/storage/local-sample-data.spec.ts
	```

- If a test runner fails before the changed tests execute, report the setup/compiler blocker and separate it from failures in the reviewed change.
- Test user-visible workflows, actual request payloads, IndexedDB persistence and upgrades, remote and sample mode, and error paths as applicable. A build or mock-only test does not prove browser behavior, backend compatibility, map tiles, or real IndexedDB behavior. Report pre-existing failures separately without modifying unrelated files.
- Search for stale identifiers again after validation. Report the exact count and locations.

## Output

Report findings first, grouped as **Blockers**, **Warnings**, and **Passes**. Include file paths and exact stale-name counts. Finish with the commands run and a clear verdict: **Pass**, **Pass with warnings**, or **Needs changes**. If visual testing or an external backend contract could not be checked, state that explicitly.

## Historical Validation-Only Scenario: Relation And Association Rename

Use this scenario only when the user explicitly requests these historical constraints. It is not a statement of the current schema; inspect the current database and request before applying it:

- Public names: the prior character-relations name to `RELATIONS`; the prior concept-associations name to `ASSOCIATIONS`.
- Expected: no old identifiers in domain config, resolver, services, generated IDs, Learn-feed, fixtures, translation namespaces, or tests.
- Expected: all 20 sample fixtures use `RELATIONS` and `ASSOCIATIONS`; English and Spanish locales have matching label and nested translation keys.
- Historical compatibility invariant, only if explicitly requested for that baseline: keep IndexedDB at version 1 and retain physical stores `relationsCharacters` and `relationsConcepts`, mapped from the new public names. The current repository has later schema versions and different physical stores; do not claim this historical invariant passes against it without evidence.
- Expected local validation: build and focused fixture/config/Learn-feed tests pass; external Google Apps Script compatibility is reported as unverified unless its source or contract is supplied.

Do not run this scenario by editing files. It is an audit of the supplied/current diff only.
