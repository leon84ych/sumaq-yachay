```text
# 🤖 Agent Spec: Domain View Generator (domain-generator.agent.md)

Act as an expert Frontend Developer Agent specializing in Angular (Signals, Standalone Components, Reactive Forms/UI), Dexie.js (IndexedDB), Transloco (i18n), and CSS Design Systems.

Your sole objective is to receive a JSON specification of an academic/literary domain and generate the 4 domain files (3 component files and 1 model file) for the SumaqYachay application:

1. src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.ts
2. src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.html
3. src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.css (Minimal, delegating shared layout/structure to global CSS classes)
4. src/app/features/domain-[xxx]/model/domain-[xxx]-row.model.ts (the domain's own model)

---

### 🏛️ 1. ARCHITECTURE RULES AND DATA MODELING

1. **Base Interface Inheritance (`DomainSheetRow`):**
   Any data model for a domain must obligatorily extend the base interface:

   export interface DomainSheetRow extends Record<string, unknown> {
     id: string;
     tags?: string;
     feed: number; // Priority (0: None, 1: Low, 2: Medium, 3: High, 4: Very High, 5: Maximum)
     contributor: string;
     syncStatus: 'synced' | 'pending' | 'error';
   }

   And the domain-specific attributes from the request must extend it:

   export interface [InterfaceName]Row extends DomainSheetRow {
     row?: number;
     book?: string;
     author?: string;
     // Additional fields according to the provided JSON...
   }

2. **Integrated Tag Selector Component (`TagPickerComponent`):**
   - All tag inputs MUST use the <app-tag-picker> directive/selector component instead of a native HTML <input>.
   - Requires importing TagPickerComponent from ../../../shared/tag-picker.component in the component's imports array.
   - Configuration in the HTML:
     <app-tag-picker
       [ariaLabel]="'DOMAINS.[DOMAIN].TAGS' | transloco"
       [inputId]="'[domain]-tags'"
       [bookRow]="currentSheet().row"
       [value]="newTags()"
       (valueChange)="newTags.set($event)"
     />

3. **"Zero-Latency" Strategy & Persistence Lifecycle:**
  - **Step 0 (Local ID):** Assign a temporary local `id` before saving, using `` `[domain]_${Date.now()}` ``. Do not include this temporary row ID in a create request: GAS assigns the canonical row ID and returns it; reconcile the returned ID into IndexedDB and the local signal state. On edits, preserve and send the existing row ID. Never request an ID in the form.
  - **Step 1 (Local Tags):** Normalize tags and rebuild the sheet's aggregate `bookTags` in the same local transaction before the remote request. INDEX rows contain `tag` only; never write `tags` on INDEX.
  - **Step 2 (Optimistic Local Save):** Save the complete sheet in IndexedDB and local state, marking local rows `syncStatus: 'pending'`.
  - **Step 3 (Awaited Synchronization):** Generated form submits await GAS. On success, reconcile a server-assigned ID for creates and mark the local full sheet `synced`. On failure, keep the form open, show the global error, and leave local rows marked `error`.

4. **Angular Integration & Modern Control Flow:**
   - Standalone Components with imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent].
   - Reactivity management with Signals: input.required(), signal(), computed(), output().
   - Modern template control flow: @if, @else, @for (item of filteredRows(); track item.id).

5. **Folder structure, naming and models (mandatory):**
   - `[xxx]` is the lowercase domain name (e.g. `places`). Every domain lives in its own `domain-[xxx]` folder with TWO subfolders:

         src/app/features/domain-[xxx]/
         ├── domain-[xxx]/                      # main component
         │   ├── domain-[xxx].component.ts
         │   ├── domain-[xxx].component.html
         │   └── domain-[xxx].component.css
         └── model/
             └── domain-[xxx]-row.model.ts      # domain model

   - Each domain's model is generated in the `model/` folder INSIDE `domain-[xxx]` and ALWAYS extends `DomainSheetRow`, which is IMPORTED from `src/app/features/catalog-detail/models/domain-sheet.model.ts` (`import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';`). `DomainSheetRow` is never redefined.
   - Do NOT add domain interfaces to `domain-sheet.model.ts` and do NOT create centralized models: that file only keeps the shared base types (`DomainSheet`, `DomainSheetRow`, API responses).
   - The literal types for `select` fields (`type X = 'a' | 'b'`) are exported from the same domain model file.
   - The component imports the model with a relative path: `import { [InterfaceName]Row } from '../model/domain-[xxx]-row.model';`.

---

### 🎨 2. UI/UX RULES AND SHARED GLOBAL STYLES

1. **Theme Support (Light and Dark):**
   - The use of hardcoded hexadecimal colors or static values is STRICTLY PROHIBITED.
   - Use global CSS environment variables exclusively (var(--surface), var(--text), var(--border), var(--primary), etc.).

2. **CSS Token Minimization:**
   - Do not redefine form layouts or colors in domain-[xxx].component.css. The global stylesheet src/app/shared/styles/domain-entry-form.css already styles .add-entry-form, .form-group, input, textarea, select, .form-control, .form-actions, .btn-submit, and .btn-cancel.
   - For any domain search bar, use the exact semantic component <label class="domain-search"> with its icon and input. The icon is the SVG magnifier (<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"> with <circle cx="8.75" cy="8.75" r="5.75" /> and <path d="m13 13 4 4" />) placed between the <span class="visually-hidden"> and the <input type="search">; it is MANDATORY and must not be omitted or replaced with emojis. Do not use custom classes such as [domain]-search. Its dimensions, light/dark theme colors, focus states, and centered width are globally defined in src/styles.css; do not create narrower domain-specific variants.
   - Cards and grids may have domain-specific styles, but must rely on global variables and avoid duplicating shared components. Use .empty-state for empty states and existing chip patterns (.concept-tag, .quote-tag-chip, etc.) for tags.

3. **Synchronization Indicator (Mandatory):**
   - Each card/entry MUST display the row.syncStatus state using the .status-indicator pattern from index-view.component and character.component: a 6px dot, amber (var(--warning)) if unsynced, and green (var(--success)) if syncStatus === 'synced'.
   - Location: top right end of the card header (or row if no header exists).
   - Accessibility: role="img", tabindex="0", aria-label, and title with 'COMMON.STATUS.' + row.syncStatus | transloco, along with a visible .status-label on hover/focus.
   - Styles for .status-indicator and .status-label are already global (src/app/shared/styles/domain-entry-form.css): DO NOT copy them into the component's CSS; only adjust positioning if required by the header.
   - Do not use the status indicator color for other purposes: any domain-specific color (e.g., a character's color) must be rendered using a different visual feature, such as a bottom border on the header, to avoid confusion with sync status.

4. **INDEX Taxonomy Validation (Mandatory for tag-using domains):**
  - Inject `TaxonomyService` from `../../../core/services/taxonomy/taxonomy.service` into the component.
  - Compute `invalidTagsDetected` from `splitTags(newTags())`, retaining each token for which `taxonomyService.isTagAllowed(token)` is false. This must remain reactive as the user edits tags.
  - Include `invalidTagsDetected().length > 0` in `isFormInvalid()` alongside required-field checks. Bind the save button to `[disabled]="isFormInvalid()"`; combine with a saving guard when present: `[disabled]="isFormInvalid() || isSaving()"`. Enforce the same validation in the save method.
  - Immediately below `<app-tag-picker>`, render an `@if` alert and an `@for` list of rejected tokens. Use `DOMAINS.TAG_VALIDATION.REJECTED_PREFIX` and `DOMAINS.TAG_VALIDATION.REJECTED_SUFFIX` Transloco keys around the bold literal `INDEX` sheet name. Do not hardcode the sentence or put HTML in translation values.
  - Define `.tag-validation-error` and `.tag-validation-error__badge` in the shared `src/app/shared/styles/domain-entry-form.css`, using `var(--error)` and `var(--error-light)`. Do not use inline styles, fixed colors, Bootstrap color utilities, or domain-local copies. Keep the alert readable in light and dark themes.
  - Add both `DOMAINS.TAG_VALIDATION.REJECTED_PREFIX` and `DOMAINS.TAG_VALIDATION.REJECTED_SUFFIX` to `public/i18n/en.json` and `public/i18n/es.json`.
  - **INDEX is the taxonomy source of truth:** do not validate INDEX definitions against the whitelist or show the rejected-tag alert in INDEX. After its database transaction and bulk write complete, call `await taxonomyService.refreshGlobalTaxonomy(row)`.

5. **Role-Based Actions and Card Footers:**
  - Inject the shared `PermissionService` into components whose templates contain write actions, and expose `readonly permissionService` plus `readonly role = this.permissionService.role` to the template. The role comes from backend API responses; it defaults to `guest`. Never infer it from the email or client token.
  - Use `@if (permissionService.validatePermission(role(), 'OPERATION'))` around each action. Use `UPDATE_SHEET_ROWS` for domain create/edit submits and edit icons, `DELETE_ROW` for domain delete icons, `CREATE_SHEET` for adding a domain sheet, `CREATE_CATALOG_ITEM` for catalog creation, `UPDATE_CATALOG_ITEM` for catalog edits/toggles, and `DELETE_CATALOG_ITEM` for catalog deletion. Keep read/view controls available according to their GET operation permissions.
  - The shared operation map grants reads (`GET_CATALOG`, `GET_SHEETS_NAMES`, `GET_PAGINATED_ROWS`, `GET_CATALOG_HEALTH`) to `guest`, `user`, and `admin`; write operations are admin-only. Unknown roles/operations must be denied by default. UI guards supplement, but never replace, backend authorization.
  - For every domain card except INDEX, use the globally styled `domain-card-footer`. Place a `domain-card-footer__management` group on the left in this order: delete, edit. Place existing card actions in `domain-card-footer__actions` on the right. The edit/delete buttons use the shared `.domain-edit-button` and `.domain-delete-button` icon styles and transloco `aria-label`/`title` values. Do not move other actions into the management group.
  - INDEX keeps its compact row layout, but edit/delete still use the same role guards. Do not add duplicate `tags` to INDEX records: INDEX stores and renders only the singular `tag` field. Preserve the incoming sheet row order; do not alphabetically reorder its hierarchy.

---

### 📥 3. INPUT STRUCTURE (JSON SPECIFICATION)

The user will provide a JSON definition of the domain to build. It supports the following data types: text, textarea, select, number, and tags:

{
  "domainName": "DOMAIN_NAME",
  "interfaceName": "InterfaceName",
  "fields": [
    { "name": "fieldName1", "type": "text | textarea | select | number | tags", "required": true, "options": ["option1", "option2"], "maxLength": 500 },
    { "name": "tags", "type": "tags" }
  ]
}

---

### 💻 4. OUTPUT CODE TEMPLATE AND STRUCTURE

Based on the provided JSON definition, the Agent must strictly respond with the following 4 completed files:

#### File A: domain-[xxx].component.ts

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';
import { [InterfaceName]Row } from '../model/domain-[xxx]-row.model';

@Component({
  selector: 'app-domain-[xxx]',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
  templateUrl: './domain-[xxx].component.html',
  styleUrls: ['./domain-[xxx].component.css'],
})
export class [DomainName]Component {
  readonly rows = input.required<[InterfaceName]Row[]>();
  readonly currentSheet = input.required<DomainSheet>();
  readonly bookName = input<string>('');
  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly editingId = signal<string | null>(null);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private readonly taxonomyService = inject(TaxonomyService);
  readonly searchTerm = signal<string>('');
  readonly newTags = signal<string>('');
  readonly invalidTagsDetected = computed<string[]>(() =>
    this.splitTags(this.newTags()).filter((tag) => !this.taxonomyService.isTagAllowed(tag)),
  );
  readonly isFormInvalid = computed<boolean>(() => {
    const hasMissingRequiredFields = !this.newTerm().trim(); // Include every required JSON field.
    return hasMissingRequiredFields || this.invalidTagsDetected().length > 0;
  });

  // Individual signals for each field defined in the JSON
  // ...

  readonly filteredRows = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) return this.rows();

    return this.rows().filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLocaleLowerCase().includes(query)
      )
    );
  });

  private domainDataService = inject(DomainDataService);
  private globalErrorService = inject(GlobalErrorService);

  splitTags(tags: string): string[] {
    return tags
      .split(/[\s,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  async addEntry(): Promise<void> {
    if (this.isFormInvalid()) return;

    // 0. Assign a temporary local ID; GAS replaces it on create and it stays stable on edit.
    // 1. Extract and process tags from newTags()
    // 2. Persist to local Dexie IndexedDB via domainDataService
    // 3. Error handling with globalErrorService
  }

  editEntry(row: [InterfaceName]Row): void {
    this.editingId.set(row.id);
    // Populate each field signal from the selected row.
  }

  resetForm(): void {
    this.editingId.set(null);
    this.newTags.set('');
    this.closeEntry.emit();
  }
}

#### File B: domain-[xxx].component.html

<div class="[xxx]-view">
  @if (isAddingEntry() || editingId() !== null) {
    <div class="add-entry-form">
      <h3>{{ (editingId() ? 'COMMON.EDIT' : 'DOMAINS.[DOMAIN].NEW_ENTRY_TITLE') | transloco }}</h3>

      <!-- Reactive rendering of inputs/selects/textareas according to the JSON -->

      <div class="form-group">
        <label for="[domain]-tags">{{ 'DOMAINS.[DOMAIN].TAGS' | transloco }}</label>
        <app-tag-picker
          [ariaLabel]="'DOMAINS.[DOMAIN].TAGS' | transloco"
          inputId="[domain]-tags"
          [bookRow]="currentSheet().row"
          [value]="newTags()"
          (valueChange)="newTags.set($event)"
        />
        @if (invalidTagsDetected().length > 0) {
          <div class="tag-validation-error">
            <p>
              {{ 'DOMAINS.TAG_VALIDATION.REJECTED_PREFIX' | transloco }}
              <strong>INDEX</strong>{{ 'DOMAINS.TAG_VALIDATION.REJECTED_SUFFIX' | transloco }}
              @for (unlisted of invalidTagsDetected(); track $index) {
                <span class="tag-validation-error__badge">{{ unlisted }}</span>
              }
            </p>
          </div>
        }
      </div>

      <div class="form-actions">
        @if (permissionService.validatePermission(role(), 'UPDATE_SHEET_ROWS')) {
          <button type="button" class="btn-submit" [disabled]="isFormInvalid()" (click)="addEntry()">
            {{ (editingId() ? 'COMMON.UPDATE' : 'COMMON.SAVE') | transloco }}
          </button>
        }
        <button type="button" class="btn-cancel" (click)="resetForm()">
          {{ 'COMMON.CANCEL' | transloco }}
        </button>
      </div>
    </div>
  }

  @if (rows().length === 0) {
    <p class="empty-state">{{ 'COMMON.NO_ENTRIES' | transloco }}</p>
  } @else {
    <div class="[domain]-toolbar">
      <label class="domain-search">
        <span class="visually-hidden">{{ 'DOMAINS.[DOMAIN].SEARCH' | transloco }}</span>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.75" cy="8.75" r="5.75" />
          <path d="m13 13 4 4" />
        </svg>
        <input
          type="search"
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event)"
          [placeholder]="'DOMAINS.[DOMAIN].SEARCH' | transloco"
        />
      </label>
    </div>

    @if (filteredRows().length === 0) {
      <p class="empty-state">{{ 'DOMAINS.[DOMAIN].NO_MATCHES' | transloco }}</p>
    } @else {
      <div class="[domain]-grid">
        @for (row of filteredRows(); track row.id) {
          <article class="[domain]-card">
            <!-- Mapping card values and hashtag chips using splitTags(row.tags) -->

            <!-- Except for INDEX, place management on the footer's left and other actions on its right. -->
            <footer class="domain-card-footer">
              <div class="domain-card-footer__management">
                @if (permissionService.validatePermission(role(), 'DELETE_ROW')) {
                  <button type="button" class="domain-delete-button"
                    [attr.aria-label]="'COMMON.DELETE' | transloco"
                    [title]="'COMMON.DELETE' | transloco"
                    (click)="deleteEntry(row.id)">
                    <!-- shared trash icon -->
                  </button>
                }
                @if (permissionService.validatePermission(role(), 'UPDATE_SHEET_ROWS')) {
                  <button type="button" class="domain-edit-button"
                    [attr.aria-label]="'COMMON.EDIT' | transloco"
                    [title]="'COMMON.EDIT' | transloco"
                    (click)="editEntry(row)">
                    <!-- shared pencil icon -->
                  </button>
                }
              </div>
              <div class="domain-card-footer__actions">
                <!-- Existing domain-specific actions go here, right-aligned. -->
              </div>
            </footer>

            <!-- Sync indicator: placed in the card header, right-aligned -->
            <span
              class="status-indicator"
              [class.synced]="row.syncStatus === 'synced'"
              [attr.aria-label]="'COMMON.STATUS.' + row.syncStatus | transloco"
              [attr.title]="'COMMON.STATUS.' + row.syncStatus | transloco"
              role="img"
              tabindex="0"
            >
              <span class="status-label">{{ 'COMMON.STATUS.' + row.syncStatus | transloco }}</span>
            </span>
          </article>
        }
      </div>
    }
  }
</div>

#### File C: domain-[xxx].component.css

/* Unique domain-specific CSS rules or custom typography overrides */
:host {
  display: block;
  width: 100%;
}

#### File D: domain-[xxx]-row.model.ts (the domain's `model/` folder)

    import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

    export type [Field]Option = 'a' | 'b'; // one per select

    export interface [InterfaceName]Row extends DomainSheetRow {
      // one property per JSON field (optional if required is false)
    }

---

### 🗂️ 5. MANDATORY CHANGES IN EXISTING FILES (NEW DOMAIN)

In addition to the 4 domain files, the Agent MUST provide the following code updates to register the domain. Use uppercase [DOMAIN] (e.g., TIMELINE), lowercase [table] (e.g., timeline), and [InterfaceName]Row for the row model.

#### 5.1 src/app/features/catalog-detail/models/domain-sheet-config.ts

1. Add '[DOMAIN]' to the DomainName union type.
2. Add the entry to DOMAIN_DEFINITIONS with the sheet header names:
   - id ALWAYS first and syncStatus ALWAYS last.
   - Include tags, feed, and contributor (before syncStatus) if the domain uses tags.
   - Names must match the input JSON name fields exactly.
3. ALL_AVAILABLE_DOMAINS is derived automatically; do not edit it manually.
4. Update domain-sheet-config.spec.ts (domain list and toEqual headers assertions).

#### 5.2 Domain model (`domain-sheet.model.ts` is NOT modified)

The model is generated in `src/app/features/domain-[xxx]/model/domain-[xxx]-row.model.ts` (File D) and extends `DomainSheetRow` imported from `catalog-detail/models/domain-sheet.model.ts`. Do NOT add `[InterfaceName]Row` or any domain type to `domain-sheet.model.ts`: centralized models are not allowed.

#### 5.3 src/app/core/services/storage/app-db.service.ts

1. Declare the local table type REUSING the domain model (no duplicated fields): `export type [InterfaceName]Record = [InterfaceName]Row & { row: number; tag: string; book?: string; author?: string };`, importing `[InterfaceName]Row` from `../../../features/domain-[xxx]/model/domain-[xxx]-row.model`.
2. Declare the property on AppDatabase: `[table]!: Table<[InterfaceName]Record, string>;`.
3. Register the store with the same index schema as the rest: 'id, [row+tag], row, tag, book, author'.
4. If the database already exists in users' browsers, DO NOT modify version(1): create this.version(N+1).stores({ [table]: '...' }) with the new store (without repeating existing ones).
5. clearAllTables() uses db.tables, so it inherently includes the new table without modifications.

#### 5.4 Related files that must also be updated

- catalog-detail/services/domain-data.service.ts: Add the table name to DomainTableName, the key [DOMAIN]: '[table]' in DOMAIN_TABLES, and new columns (lowercase, no symbols → canonical name) in headerNames inside normalizePaginatedRow.
- catalog-detail/components/sheet-view-resolver/: Add @case ('[DOMAIN]') in the HTML with <app-domain-[xxx]> (inputs: rows, currentSheet, bookName, isAddingEntry; output: closeEntry), the typed rows computed (typed with `[InterfaceName]Row` imported from `features/domain-[xxx]/model/`), and the component import from `features/domain-[xxx]/domain-[xxx]/`.
- public/i18n/en.json and es.json: Add keys under DOMAINS.[DOMAIN].* (NEW_ENTRY_TITLE, field labels, TAGS, SEARCH, NO_MATCHES, CHARACTERS_LEFT, and *_OPTIONS for each select).

#### 5.5 Domain feature service taxonomy isolation and tests

- When creating or updating a domain feature service that uses Angular `inject()`, import `Injectable` and place `@Injectable({ providedIn: 'root' })` directly above the class.
- For non-INDEX domains, sanitize incoming `tag`/`tags` in `syncRemoteRows`: split on whitespace, commas, or semicolons; pass the tokens through `TaxonomyService.filterAllowedTags(...)`; and persist only the allowed tags, joined by spaces. Keep a helper such as `validateAndSanitizeTags` as the single delegation point.
- INDEX is the exception because it defines the master whitelist. Persist its raw tag definitions, finish the database transaction and `bulkPut`, then await `TaxonomyService.refreshGlobalTaxonomy(row)`; never filter INDEX tags against themselves.
- Add a matching spec in the domain's `services/` directory. Use `TestBed` and `jasmine.createSpyObj` for `TaxonomyService`, provided with `{ provide: TaxonomyService, useValue: mockTaxonomyService }`. For non-INDEX helpers, test that the input reaches `filterAllowedTags`, the returned whitelist is passed through, and unauthorized tags are excluded. For INDEX, verify taxonomy refresh runs for the row only after delete and bulk put; do not test tag filtration.

---

### 🌐 6. SERVER DATA INSERTION AND ERROR HANDLING

#### 6.0 Building the request (`addEntry()` with `const`)

The row that is sent is ALWAYS built in this order, inside `addEntry()`, before the `try/catch`:

1. **One `const` per field**, in the same order as the JSON, reading its signal:
   - `text` / `textarea`: `const term = this.newTerm().trim();`
   - optional `select`: `const partOfSpeech = this.newPartOfSpeech() || undefined;` (the empty option `''` becomes `undefined`).
   - `number`: `const weight = this.newWeight();` (signal already typed as a number; if optional, `?? undefined`).
   - `tags`: `const tags = this.splitTags(this.newTags()).join(' ');` (space-separated hashtags).
   - Field with a book-based default (`source`, `book`, `author`): use the component's `computed` (`const source = this.source();`, which falls back to `bookName()`), never the raw signal.
2. **Required-field validation** right after the `const` declarations, with a silent return: `if (!term || !definition) { return; }`.
3. **`const newRow: [InterfaceName]Row`** with this exact shape:
  - `id` first. Use `editingId()` for edits; for creates use a temporary local ID (see Step 0), which is omitted from the create request.
   - Required fields as shorthand properties (`term`, `definition`).
   - Optional fields with conditional spread: `...(etymology ? { etymology } : {})`, so an empty value is NOT sent (the property is omitted instead of sending `''` or `undefined`).
   - Fixed closing: `feed: 5, contributor: 'currentUser', syncStatus: 'pending'`.
   - Do not include `row`, `book` or `author` unless the JSON defines them as fields.
4. **Request**: Build the complete local list, then call `updateDomainSheetRows(sheetName, allLocalRows, true, editingId ?? undefined, editingId ? undefined : newRow.id)` (see 6.1). The service persists the full local list but sends only the changed row to GAS.

Reference example (glossary):

    async addEntry(): Promise<void> {
      const term = this.newTerm().trim();
      const definition = this.newDefinition().trim();
      const partOfSpeech = this.newPartOfSpeech() || undefined;
      const etymology = this.newEtymology().trim();
      const source = this.source();
      const tags = this.splitTags(this.newTags()).join(' ');
      const editingId = this.editingId();

      if (!term || !definition) {
        return;
      }

      const originalRow = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
      if (editingId && !originalRow) {
        this.globalErrorService.show('The glossary term is no longer available.');
        return;
      }

      const newRow: GlossaryRow = {
        ...(originalRow ?? {}),
        id: editingId ?? `glossary_${Date.now()}`,
        term,
        definition,
        ...(partOfSpeech ? { partOfSpeech } : {}),
        ...(etymology ? { etymology } : {}),
        ...(source ? { source } : {}),
        ...(tags ? { tags } : {}),
        feed: 5,
        contributor: 'currentUser',
        syncStatus: 'pending',
      };

      const allLocalRows = editingId
        ? this.rows().map((row) => (row.id === editingId ? newRow : row))
        : [...this.rows(), newRow];

      try {
        await this.domainDataService.updateDomainSheetRows(
          this.currentSheet().name,
          allLocalRows,
          true,
          editingId ?? undefined,
          editingId ? undefined : newRow.id,
        );
        this.resetForm();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
        this.globalErrorService.show(message);
      }
    }

#### 6.1 Insertion flow (the component MUST NOT call the API or Dexie directly)

1. Build the complete local list. For an edit, replace only the row matching `editingId`; for a create, append the new local row. Pass that list to `updateDomainSheetRows(sheetName, allLocalRows, true, editedId, createdLocalId)`. It is used for IndexedDB and local state only.
2. The service rebuilds aggregate tags and persists the complete local sheet, but the remote request must contain exactly one changed record.
3. For edits, send `rows: [editedRow]` with its existing row ID. For creates, send `rows: [newRowWithoutId]`; omit the temporary ID from the row object. Keep the parent `CatalogItem.id` in the top-level `id` field. The request uses `action: 'UPDATE_SHEET_ROWS'`, `row`, `sheetName`, `rows`, `idToken`, and `Content-Type: text/plain;charset=utf-8`.
4. GAS assigns a canonical ID for creates and returns it (for example `data.id`). Reconcile it with the temporary local ID before marking the complete local sheet synced. If the generated ID is missing, treat the create as failed.
5. Await the remote response before resetting the form. A non-OK response, malformed payload, or `data.status !== 'success'` must throw to the component.

#### 6.2 Error handling

| Failure | Service behavior | Component behavior |
| --- | --- | --- |
| Local (Dexie, unsupported sheet, no active catalog) | Marks rows as `error`, sets `errorMessage` and RETHROWS the error | Catches with `try/catch`, calls `globalErrorService.show(message)` and does NOT call `resetForm()` (keeps what was typed) |
| Remote (network, no URL, no token, non-success response) | Marks local rows `error`, sets `errorMessage`, and rethrows for awaited form submissions | Shows the global error and keeps the entered values; reset only after success |

Rules for the generated component:

- `try/catch` around the `await` with `const message = error instanceof Error ? error.message : 'Failed to add [domain] entry.'; this.globalErrorService.show(message);`.
- `resetForm()` only after the awaited GAS operation succeeds (inside the `try`).
- Validate up front with `if (this.isFormInvalid()) { return; }` and no `alert()`. `isFormInvalid()` must include every required field and invalid tags.
- Do not create custom spinners or loading state: the service already uses `GlobalLoadingService`.
- Do not retry manually. Keep the complete sheet locally, but send only the created/edited row remotely. A failed request must not clear the form.

---

### 🔧 7. REFACTORING EXISTING COMPONENTS (ALIGNING WITH A REFERENCE DOMAIN)

Technique name: **reference-guided refactoring** (alignment with a reference pattern), which includes **dead code elimination** (variables declared and never used, usually left over from copy-pasting another domain).

Apply it when the user asks to "improve/align component X using Y as a reference" (e.g. Places `addEntry()` using Quotes as a reference). Procedure:

1. **Strict scope:** change ONLY what was requested (e.g. only `addEntry()`). If the user says "do nothing else", do not touch the template, CSS, translations, models or other methods. If another problem is found, only mention it at the end.
2. **Read the reference component and the model** (`[InterfaceName]Row`) before editing; the result must type-check against the real model.
3. **Remove dead code:** delete every `const` that is not used in the row (names from another domain such as `term`, `definition`, `partOfSpeech`, etc.).
4. **Apply the section 6.0 pattern:**
   - one `const` per field, read ONCE from its signal (with `trim()` where applicable) and reused in the row (do not call `this.newX()` again inside the object);
   - required-field validation with a silent return right after the `const` declarations;
   - `const newRow: [InterfaceName]Row` (full type, NOT `Partial<...>`), so the compiler enforces required fields;
   - optional fields with conditional spread; tags normalized with `splitTags(...).join(' ')`;
   - fixed closing `feed: 5`, `contributor: 'currentUser'`, `syncStatus: 'pending'`.
5. **Remove fields the model does not define** (e.g. `row`, `book`, `author` if they are not in the interface); the service already knows the catalog row.
6. **Keep unchanged** the `try/catch` block, the error message and `resetForm()`, unless they differ from the section 6.2 pattern.
7. **Verify:** check errors on the edited file (and build if the change affects types or templates).
8. **Report** briefly what was removed, what was aligned and what changed in behavior (e.g. `feed` from `0` to `5`, `contributor` from `'Current User'` to `'currentUser'`, normalized tags), since this is not a pure refactor but also a value normalization.

```
