# Write-Back & Bi-Directional Sync Architecture Specification — sumaq-yachay

This specification describes the end-to-end technical architecture, performance thresholds, storage boundaries, and Angular form management strategies for enabling **two-way data synchronization** (reading from and writing back to Google Sheets) within `sumaq-yachay`.

---

## 🏗️ Architecture & Data Flow

```
                             +------------------------+
                             | Dynamic Form Controls  |
                             | (Reactive Forms / Zod) |
                             +-----------+------------+
                                         |
                                         v
                             +------------------------+
                             |   IndexedDB (Dexie)    |
                             | (Optimistic Local UI)  |
                             +-----------+------------+
                                         |
                                         v
                             +------------------------+
                             | Sync Queue / Offline   |
                             | Background Worker      |
                             +-----------+------------+
                                         | (HTTP POST Batch)
                                         v
                             +------------------------+
                             | Google Apps Script     |
                             | Web App (`doPost`)     |
                             +-----------+------------+
                                         | (LockService)
                                         v
                             +------------------------+
                             |     Google Sheet       |
                             |  (Appends / Updates)   |
                             +------------------------+
```

---

## 🔐 Google Apps Script Backend (`doPost`)

To handle write-back safely without concurrency collisions, the deployed Apps Script Web App implements `LockService` to serialize incoming update requests.

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for other processes to finish
  if (!lock.waitLock(10000)) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: 'Server busy, lock timeout' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(payload.sheetName);

    if (!sheet) {
      throw new Error("Target sheet tab not found: " + payload.sheetName);
    }

    if (payload.action === 'CREATE') {
      // Append row to the bottom of the target tab
      sheet.appendRow(payload.rowValues);
    } else if (payload.action === 'UPDATE') {
      // Find row by UUID/ID in Column A and overwrite
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          sheet.getRange(i + 1, 1, 1, payload.rowValues.length).setValues([payload.rowValues]);
          break;
        }
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success', id: payload.id })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

---

## 📝 Angular Form Management & Validation Strategy

Writing structured learning components (like process sequences, timelines, or relation nodes) back to spreadsheets requires strict client-side validation before queuing sync payloads.

### Recommended Stack & Pattern
1. **Typed Reactive Forms (`@angular/forms`):** Strictly typed controls matching IndexedDB/Sheet entities.
2. **Schema Validation (`zod`):** Lightweight schema validation enforcing max character lengths, required fields, and format constraints (e.g., valid URLs or valid Mermaid markup syntax).
3. **Optimistic Updates:** Forms instantly commit edits to IndexedDB, update the UI state, and mark the local record as `syncStatus: 'pending'` until synced with Google Sheets.

### Dynamic Form Component Example (`DefinitionFormComponent`)

```typescript
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { db, DefinitionEntity } from '../db';

@Component({
  selector: 'app-definition-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="definitionForm" (ngSubmit)="onSubmit()" class="form-container">
      <h3>Add New Definition</h3>

      <div class="form-field">
        <label>Term / Concept *</label>
        <input type="text" formControlName="term" placeholder="e.g., Bounded Context" />
      </div>

      <div class="form-field">
        <label>Category *</label>
        <input type="text" formControlName="category" placeholder="e.g., DDD" />
      </div>

      <div class="form-field">
        <label>Short Definition *</label>
        <textarea formControlName="shortDefinition" rows="2"></textarea>
      </div>

      <div class="form-field">
        <label>Source Book *</label>
        <input type="text" formControlName="sourceBook" placeholder="e.g., Domain-Driven Design" />
      </div>

      <div class="form-field">
        <label>Image URL (Optional)</label>
        <input type="url" formControlName="imageUrl" />
      </div>

      <button type="submit" [disabled]="definitionForm.invalid">Save Local & Sync</button>
    </form>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; gap: 1rem; max-width: 500px; }
    .form-field { display: flex; flex-direction: column; gap: 0.25rem; }
    button { align-self: flex-start; padding: 0.5rem 1rem; cursor: pointer; }
  `]
})
export class DefinitionFormComponent {
  private fb = inject(FormBuilder);
  @Output() saved = new EventEmitter<void>();

  definitionForm = this.fb.group({
    term: ['', Validators.required],
    category: ['', Validators.required],
    shortDefinition: ['', [Validators.required, Validators.maxLength(500)]],
    sourceBook: ['', Validators.required],
    imageUrl: ['']
  });

  async onSubmit(): Promise<void> {
    if (definitionForm.valid) {
      const payload: Omit<DefinitionEntity, 'id'> = {
        sheetId: 'default',
        term: this.definitionForm.value.term!,
        category: this.definitionForm.value.category!,
        shortDefinition: this.definitionForm.value.shortDefinition!,
        sourceBook: this.definitionForm.value.sourceBook!,
        imageUrl: this.definitionForm.value.imageUrl || undefined,
        updatedAt: new Date().toISOString()
      };

      // 1. Save to local IndexedDB (Instant UI feedback)
      await db.definitions.add(payload as DefinitionEntity);

      // 2. Trigger Sync Queue Worker (Sends to Apps Script doPost)
      this.saved.emit();
      this.definitionForm.reset();
    }
  }
}
```

---

## ⚡ Performance Boundaries & Quotas Matrix

| Metric / Boundary | Limit / Constraint | Technical Impact & Mitigation |
| :--- | :--- | :--- |
| **Spreadsheet Cell Limit** | **10,000,000 cells** per Google Sheet file | Split large study workspaces across multiple tabs or separate Google Spreadsheets. |
| **GAS Execution Time** | **6 minutes per call** (Consumer) / 15 mins (Workspace) | Batch write ops in arrays (`setValues()`) rather than single-cell operations (`setValue()`). |
| **Payload Size Limit** | **5 MB - 10 MB** max POST body per Apps Script call | Compress payloads, omit raw images, and send max 100 row modifications per HTTP batch POST. |
| **Concurrency / Locking** | **Single-thread serialization** via `LockService` | Apps Script blocks simultaneous writes. Use a retry exponential backoff queue in Angular. |
| **Spreadsheet Write Quota** | **100 read/write requests per 100 seconds** per user | Queue form actions locally in IndexedDB and flush write payloads in single multi-row batches. |
| **IndexedDB Quota** | **~50% of available disk space** (Chrome/Firefox) | Browser-side storage handles tens of thousands of rows locally without issue. |

---

## 🔄 Offline Synchronization Queue Logic

```typescript
export interface SyncQueueItem {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  sheetName: string;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
}
```

### Queue Workflow:
1. **Offline Capture:** When the user submits a form without network access, the change is saved to `SyncQueue` in IndexedDB.
2. **Online Event Listener:** Angular listens to `window.addEventListener('online')`.
3. **Batch Processor:** When online, a sync service pulls pending queue items, sends them as a single array POST to `doPost()`, and updates the IndexedDB local state upon HTTP 200 response.
