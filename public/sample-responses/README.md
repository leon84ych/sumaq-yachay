# Sample Responses (Offline / Dev Mode)

Static JSON files here let the app run without reaching the live Google Apps Script Web App —
useful when you're offline, blocked by a VPN/proxy, or want deterministic data for local dev.

## How it's wired up

- Served as static assets from `public/sample-responses/*.json` (fetched at `/sample-responses/*.json`).
- Toggle **API Settings > "Use sample data (offline/dev mode)"** in the Catalog header. The flag is
  persisted in `localStorage` via `ConfigService.setUseSampleData()`.
- When enabled, `CatalogApiService.getCatalog()` and `DomainDataApiService.getDomainSheets()` read
  the matching file below instead of calling the configured Web App URL. A banner ("Using sample
  data...") is shown on both the Catalog list and Catalog Detail pages while the toggle is on.

## Files

| File | Matches | Shape |
| :--- | :--- | :--- |
| `get-catalog.sample.json` | `GetCatalogResponse` (`CatalogApiService.getCatalog`) | `{ status, timestamp, data: CatalogItem[] }` |
| `get-domain-sheets.sample.json` | `GetDomainSheetsResponse` (`DomainDataApiService.getDomainSheets`) | `{ status, data: { status, catalogId, sheets: [{ index, name, rows }] } }` |

## Adding / updating a sample

1. Paste the real response body you copied from the Web App (or DevTools Network tab) into the
   matching file, keeping the same top-level shape as the model in
   `src/app/features/catalog/models/catalog-api.model.ts` or
   `src/app/features/catalog-detail/models/domain-sheet.model.ts`.
2. No rebuild is required for plain `ng serve` — static assets under `public/` are served as-is.
3. Add new sample files for other actions/entities as needed and wire them into the relevant
   `*ApiService` following the same `if (this.config.useSampleData()) { ... }` pattern.
