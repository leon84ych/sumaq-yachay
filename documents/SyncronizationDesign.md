# Synchronization Design

## 1. Purpose

This document defines a simple synchronization approach for Sumaq Yachay.

The application is designed primarily for a single user who may use one or more devices. Synchronization is useful, but it is not the main feature of the application. The design therefore favors simplicity, offline availability, and visible sync status over complex conflict-resolution mechanisms.

## 2. Architecture

The solution uses:

- Angular for the application UI.
- IndexedDB with Dexie.js for local storage.
- Google Apps Script as the cloud API.
- Google Sheets as the cloud data store.

```text
Angular UI
    |
    v
IndexedDB / Dexie
    |
    +---- Local Sync Queue
    |
    v
Google Apps Script
    |
    v
Google Sheets
```

## 3. Design Principles

1. The application reads data from IndexedDB.
2. The UI remains available while synchronization runs in the background.
3. Local changes are saved immediately.
4. Local changes are placed in a persistent synchronization queue.
5. Cloud changes are downloaded using the latest update date.
6. The most recently updated item wins.
7. Every item displays its synchronization status.
8. The user can manually synchronize an individual item.
9. The user can manually synchronize all pending items.

## 4. Data Model

Each synchronized item should include the following fields:

```typescript
export type SyncStatus =
  | 'synced'
  | 'pending'
  | 'syncing'
  | 'error';

export interface SyncableItem {
  id: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}
```

### Field definitions

- `id`: Stable identifier shared by IndexedDB and Google Sheets.
- `updatedAt`: Date and time of the latest accepted update.
- `syncStatus`: Local status used to display the synchronization badge.

The `syncStatus` field is local application metadata. It does not need to be stored in Google Sheets.

## 5. Global Synchronization Metadata

IndexedDB should store the date of the last successful cloud pull.

```typescript
export interface SyncMetadata {
  key: 'global';
  lastSuccessfulSyncAt?: string;
}
```

Example:

```json
{
  "key": "global",
  "lastSuccessfulSyncAt": "2026-09-16T14:00:00.000Z"
}
```

This date is sent to Google Apps Script when checking for cloud changes.

## 6. Application Startup

When the user opens the application:

```text
1. Open IndexedDB.
2. Load local data.
3. Render the UI immediately.
4. Start synchronization in the background.
5. Request cloud items updated after lastSuccessfulSyncAt.
6. Update the corresponding local items.
7. Save the new lastSuccessfulSyncAt value.
8. Process pending local queue items.
```

The user should not have to wait for cloud synchronization before viewing locally available data.

## 7. Pulling Cloud Changes

The application sends the latest successful synchronization date to Google Apps Script.

Example request:

```json
{
  "action": "GET_CHANGES",
  "updatedAfter": "2026-09-16T14:00:00.000Z"
}
```

Example response:

```json
{
  "status": "success",
  "serverTime": "2026-09-16T14:30:00.000Z",
  "items": [
    {
      "id": "definition-001",
      "term": "Bounded Context",
      "description": "An explicit model boundary.",
      "updatedAt": "2026-09-16T14:18:00.000Z"
    }
  ]
}
```

### Local update rule

For each cloud item:

```text
If the item does not exist locally:
    Insert it into IndexedDB.

If cloud.updatedAt is later than local.updatedAt:
    Replace the local item with the cloud item.

If local.updatedAt is later than cloud.updatedAt:
    Keep the local item and ensure it remains queued.

If both dates are equal:
    No update is required.
```

After successfully applying all returned changes, save `serverTime` as `lastSuccessfulSyncAt`.

Using the server response time avoids relying on the exact moment when the browser sent or received the request.

## 8. Writing Local Changes

When the user creates or modifies an item:

```text
1. Update the item's business fields.
2. Set updatedAt to the current date and time.
3. Set syncStatus to pending.
4. Save the item in IndexedDB.
5. Add or update its entry in the sync queue.
6. Refresh the UI immediately.
7. Attempt background synchronization if online.
```

The item should remain available locally even when the network is unavailable.

## 9. Synchronization Queue

The queue must be stored in IndexedDB so pending changes survive refreshes, browser restarts, and temporary connection failures.

```typescript
export interface SyncQueueItem {
  id?: number;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload?: unknown;
  status: 'pending' | 'syncing' | 'error';
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
}
```

### One queue entry per item

When an item is edited multiple times before synchronization, update its existing queue entry instead of creating multiple update entries.

Example:

```text
First edit  -> Add UPDATE entry
Second edit -> Replace the payload in the same UPDATE entry
Third edit  -> Replace the payload again
```

This keeps the queue small and sends only the latest state of the item.

## 10. Processing the Queue

For each pending queue item:

```text
1. Set the queue entry to syncing.
2. Set the item's syncStatus to syncing.
3. Send the latest item data to Google Apps Script.
4. Wait for the cloud response.
```

### Successful update

```text
1. Use the server-generated updatedAt returned by Google Apps Script.
2. Update the local item's updatedAt.
3. Set the item's syncStatus to synced.
4. Remove the queue entry.
```

### Failed update

```text
1. Set the queue entry to error.
2. Increase retryCount.
3. Store a short error message.
4. Set the item's syncStatus to error.
5. Keep the queue entry for a later retry.
```

## 11. Server Update Date

Google Apps Script should generate the final `updatedAt` value when it accepts an update.

Example successful response:

```json
{
  "status": "success",
  "id": "definition-001",
  "updatedAt": "2026-09-16T14:35:00.000Z"
}
```

The Angular application should replace its temporary local date with the server date returned in the response.

This reduces differences caused by device clocks.

## 12. Latest Update Wins

This design uses a simple latest-update-wins rule.

```text
Cloud date later than local date -> Cloud wins
Local date later than cloud date -> Local wins and is uploaded
Dates are equal                  -> No action
```

This is acceptable because:

- The application is intended for one user.
- Simultaneous editing of the same item on multiple devices is expected to be uncommon.
- Synchronization is a supporting feature rather than the main application feature.

The design does not include versions, device identifiers, merge dialogs, or automatic field-level merging.

## 13. Synchronization Badge

Every item should display a badge representing its local synchronization status.

| Status | Suggested label | Meaning |
|---|---|---|
| `synced` | Synced | The item was successfully saved to the cloud. |
| `pending` | Pending | The item is saved locally and waiting to be uploaded. |
| `syncing` | Syncing | The item is currently being uploaded. |
| `error` | Sync failed | The last upload attempt failed. |

Example UI:

```text
Bounded Context                       [Synced]
Dependency Injection                  [Pending]
Domain Event                          [Syncing]
Aggregate Root                        [Sync failed]
```

### Badge interaction

The badge should be clickable.

- Clicking **Pending** attempts to synchronize that item.
- Clicking **Sync failed** retries that item.
- Clicking **Synced** may show the last successful synchronization date.
- Clicking **Syncing** should not start a second request.

The item-level synchronization action should process only the selected queue entry.

## 14. Global Synchronization Action

The application should also provide a global **Sync all** action.

It should:

```text
1. Pull recent cloud changes.
2. Process all pending and failed queue items.
3. Refresh the global sync summary.
```

Suggested global states:

```text
All changes synced
3 changes pending
Synchronizing
Some changes could not be synced
Offline
```

## 15. Automatic Sync Triggers

Run synchronization when:

- The application starts and the browser is online.
- The browser changes from offline to online.
- The user saves an item while online.
- The user clicks an item's sync badge.
- The user clicks **Sync all**.

An optional periodic sync can run while the application is open, but it is not required for the first implementation.

## 16. Preventing Duplicate Requests

Only one synchronization process should run at a time.

```typescript
private syncInProgress = false;

async synchronize(): Promise<void> {
  if (this.syncInProgress) {
    return;
  }

  this.syncInProgress = true;

  try {
    await this.pullCloudChanges();
    await this.processQueue();
  } finally {
    this.syncInProgress = false;
  }
}
```

An individual item should not be synchronized again while its status is `syncing`.

## 17. Deletions

For the first implementation, use soft deletion.

Add an optional field:

```typescript
deletedAt?: string;
```

When the user deletes an item:

```text
1. Set deletedAt locally.
2. Set updatedAt locally.
3. Set syncStatus to pending.
4. Add a delete operation to the queue.
5. Hide the item from normal UI lists.
```

Google Sheets should retain the row with `deletedAt` populated. This allows deletion to reach another device during a later background pull.

Permanent cleanup can be handled manually or added later.

## 18. Suggested Dexie Schema

```typescript
this.version(2).stores({
  catalogs: 'id, updatedAt, syncStatus, deletedAt',
  definitions: 'id, updatedAt, syncStatus, deletedAt',
  relations: 'id, updatedAt, syncStatus, deletedAt',
  timelines: 'id, updatedAt, syncStatus, deletedAt',
  syncQueue: '++id, &[entityType+entityId], status, createdAt',
  syncMetadata: '&key'
});
```

The compound unique index on `[entityType+entityId]` helps maintain one queue entry per synchronized item.

## 19. Error Handling

### Offline

Keep the item as `pending`. Retry when the browser returns online or when the user initiates synchronization.

### Temporary server or network error

Set the item to `error` and allow manual retry. Automatic retry may also occur during the next startup or **Sync all** operation.

### Authentication error

Keep the queue entry and ask the user to sign in again before retrying.

### Invalid item data

Set the item to `error` and display a message indicating that the item must be corrected before it can be synchronized.

## 20. Important Limitation

If the same item is edited independently on two devices before either device receives the other's update, one edit may overwrite the other according to the latest-update-wins rule.

This is an accepted limitation of the simplified design. If it becomes a frequent problem, record versioning and conflict detection can be added later.

## 21. Minimum Implementation Scope

The first implementation should include:

- `updatedAt` on every synchronized item.
- `syncStatus` in IndexedDB.
- `lastSuccessfulSyncAt` in IndexedDB.
- A persistent Dexie sync queue.
- Background synchronization at application startup.
- Pulling cloud items updated after the last successful sync.
- Uploading pending local changes.
- Server-generated final update dates.
- Latest-update-wins comparison.
- Per-item synchronization badges.
- Item-level retry by clicking the badge.
- A global **Sync all** action.
- Soft-deletion synchronization.

The first implementation should not include:

- Device identifiers.
- Record version numbers.
- Vector clocks.
- Conflict records.
- Field-level merge logic.
- Conflict-resolution dialogs.

## 22. Acceptance Criteria

The design is successfully implemented when:

- The application displays local data immediately after startup.
- Background sync does not block normal UI interaction.
- Cloud items changed after the last successful sync update IndexedDB.
- A local edit remains available after a page refresh.
- A local edit made offline is uploaded after reconnection.
- Each item displays `synced`, `pending`, `syncing`, or `error` status.
- The user can retry one item by clicking its badge.
- The user can synchronize all pending items through a global action.
- Failed updates remain in the queue until they succeed or are corrected.
- The final local timestamp is updated from the successful server response.
