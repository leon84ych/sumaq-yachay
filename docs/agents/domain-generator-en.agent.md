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
   - **Step 0 (ID Generation):** Assign the new row's `id` on the client, BEFORE any persistence, using the format `` `[domain]_${Date.now()}` `` (`[domain]` lowercase and singular, e.g. `glossary_1760000000000`). The `id` must be unique within the sheet, is never recalculated or changed on retries or when syncing (it is the row key in IndexedDB and when merging with the server), and MUST NOT be requested in the form. Do not use `crypto.randomUUID()` or counters.
   - **Step 1 (Local Tags):** Upon saving a new entry, extract and normalize hashtags (#tag) from the tags string and call TagService.upsertBookTags(...) BEFORE sending the remote request.
   - **Step 2 (Optimistic Local Save):** Save or update the entry in the local IndexedDB database (AppDatabase) assigning syncStatus: 'pending'.
   - **Step 3 (Asynchronous Synchronization):** Trigger the backend call (Google Apps Script) in the background. Upon successful confirmation, update the local record to syncStatus: 'synced'.

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

  readonly searchTerm = signal<string>('');
  readonly newTags = signal<string>('');

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
    // 0. Generate the id: `[domain]_${Date.now()}` (assigned once when the row is created)
    // 1. Extract and process tags from newTags()
    // 2. Persist to local Dexie IndexedDB via domainDataService
    // 3. Error handling with globalErrorService
  }

  resetForm(): void {
    this.newTags.set('');
    this.closeEntry.emit();
  }
}

#### File B: domain-[xxx].component.html

<div class="[xxx]-view">
  @if (isAddingEntry()) {
    <div class="add-entry-form">
      <h3>{{ 'DOMAINS.[DOMAIN].NEW_ENTRY_TITLE' | transloco }}</h3>

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
      </div>

      <div class="form-actions">
        <button type="button" class="btn-submit" (click)="addEntry()">
          {{ 'COMMON.SAVE' | transloco }}
        </button>
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
   - `id` first (`` `[domain]_${Date.now()}` ``, see Step 0).
   - Required fields as shorthand properties (`term`, `definition`).
   - Optional fields with conditional spread: `...(etymology ? { etymology } : {})`, so an empty value is NOT sent (the property is omitted instead of sending `''` or `undefined`).
   - Fixed closing: `feed: 5, contributor: 'currentUser', syncStatus: 'pending'`.
   - Do not include `row`, `book` or `author` unless the JSON defines them as fields.
4. **Request**: `await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [...this.rows(), newRow]);` (see 6.1).

Reference example (glossary):

    async addEntry(): Promise<void> {
      const term = this.newTerm().trim();
      const definition = this.newDefinition().trim();
      const partOfSpeech = this.newPartOfSpeech() || undefined;
      const etymology = this.newEtymology().trim();
      const source = this.source();
      const tags = this.splitTags(this.newTags()).join(' ');

      if (!term || !definition) {
        return;
      }

      const newRow: GlossaryRow = {
        id: `glossary_${Date.now()}`,
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

      try {
        await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
          ...this.rows(),
          newRow,
        ]);
        this.resetForm();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
        this.globalErrorService.show(message);
      }
    }

#### 6.1 Insertion flow (the component MUST NOT call the API or Dexie directly)

1. `addEntry()` validates required fields, builds the new `row` (with `id`, `feed: 5`, `contributor: 'currentUser'`, `syncStatus: 'pending'`) and delegates EVERYTHING to the service:

       await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
         ...this.rows(),
         newRow,
       ]);

   The COMPLETE list (existing rows + the new one) is always sent, never only the new row.
2. `DomainDataService.updateDomainSheetRows` runs, in order: (a) normalizes tags and calls `upsertBookTags`; (b) forces `syncStatus: 'pending'` and saves to Dexie in an `rw` transaction; (c) updates the in-memory state; (d) fires `void syncRemoteUpdate(...)` in the background without blocking the UI.
3. `syncRemoteUpdate` calls `DomainDataApiService.updateRows(row, sheetName, rows)`: a `fetch` POST to the Google Apps Script Web App URL with `Content-Type: text/plain;charset=utf-8` (avoids the CORS preflight; do NOT add other headers) and JSON body `{ action: 'UPDATE_SHEET_ROWS', row, sheetName, rows, idToken }`. Requires the configured URL and the Google `idToken`.
4. On success, the service marks all rows as `syncStatus: 'synced'` in Dexie and in state, so the sync indicator turns green. A non-OK HTTP response or `data.status === 'error'` is treated as a remote failure.

#### 6.2 Error handling

| Failure | Service behavior | Component behavior |
| --- | --- | --- |
| Local (Dexie, unsupported sheet, no active catalog) | Marks rows as `error`, sets `errorMessage` and RETHROWS the error | Catches with `try/catch`, calls `globalErrorService.show(message)` and does NOT call `resetForm()` (keeps what was typed) |
| Remote (network, no URL, no token, `status: 'error'`) | Does NOT throw: `console.warn`; rows stay `pending` and local data remains available | Nothing to do: no blocking error and no rollback; the amber indicator reflects the state |

Rules for the generated component:

- `try/catch` around the `await` with `const message = error instanceof Error ? error.message : 'Failed to add [domain] entry.'; this.globalErrorService.show(message);`.
- `resetForm()` only after a successful local save (inside the `try`).
- Validate up front with a silent return (`if (!field) { return; }`) and no `alert()`.
- Do not create custom spinners or loading state: the service already uses `GlobalLoadingService`.
- Do not retry or rethrow manually: a `pending` row is resent on the next save, because the full list is always sent.

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
