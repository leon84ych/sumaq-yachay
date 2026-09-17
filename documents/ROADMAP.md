# Implementation Roadmap — sumaq-yachay

This document outlines the sequential development phases, requirements, prerequisites, and milestone estimates for `sumaq-yachay`. It includes visual and interactive definitions (Learning Components, Quiz Engine, Hybrid Diagramming, Bi-Directional Write-Back, and the Universal 5-Entity Learning Schema) alongside a structured "Nice-to-Have / Future Implementations" section.

---

## 📋 Prerequisites & Initial Requirements

* **Development Environment:** Node.js (v18+ or v20+ LTS), Angular CLI (v17+), and an IDE (e.g., VS Code).
* **Google Account:** A personal `@gmail.com` account for testing Google Sheets and Google Apps Script execution.
* **Key Dependencies:** `dexie` (IndexedDB ORM), `mermaid` (Dynamic SVGs), `@angular/cdk` (Drag-and-Drop for Quizzes), and `zod` (Form & Schema Validation).

---

## 🏗️ Catalog & Domain Data Model

> **Update:** The original Universal 5-Entity Schema (keyed by a `Category` of `Technical` / `Philosophy` / `Fiction`) has been replaced. The **Catalog** is now a flat registry of study entries (`subject`, `topic`, `name`, `author`, `description`, `source`, `active`) with no `Category` or `Type` classification. **Domain Data Sheets** (the actual study content — words, concepts, relations, etc.) are no longer typed either; each is simply a named tab (e.g. `Words`, `Concepts`, `Relations`) inside the linked Domain Data Spreadsheet, and the Angular dispatcher renders the matching view **based on that tab name**. See [CatalogFeatureImplemenationPlan.md](./CatalogFeatureImplemenationPlan.md) and [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for the current model and the `SheetID` security constraints.

| Domain Data Sheet (by tab name) | Example Rendered View |
| :--- | :--- |
| `Words` / `Definitions` | Terms, glossary entries, flashcard-style reviews |
| `Concepts` | Multi-definition concept breakdowns (easy-read columns) |
| `Relations` | Relationship graph (`RelationsGraphView`) |
| `Timelines` | Chronological event/plot ribbons |
| `Excerpts` / `Quotes` | Quote & excerpt gallery |
| `Scenarios` | Active-recall / Socratic prompts |

---

## 🎯 Phase Sequence & Milestones

### Phase 1: Foundational Sync Pipeline & Universal Catalogs — ✅ Done
**Objective:** Connect the Google Apps Script endpoint, sync flat definitions, quotes, and narrative entities, and store data into IndexedDB.

* **Requirements:**
  * Master Index Sheet layout design (`SheetID` as first, Google-account-only-editable element, plus `Subject`, `Topic`, `Name`, `Author`, `Description`, `Source`, `Active`).
  * Apps Script Web App standard deployment setup (`doGet`).
  * Schema support for the Catalog registry (implemented) — per-domain views (`DefinitionsView`, `QuoteGalleryView`, character/motif cards) are still pending.
* **Tasks:**
  1. ✅ Define the Master Index Sheet structure and draft base Apps Script JSON handler.
  2. ✅ Implement `CatalogApiService`/`CatalogService` to fetch JSON via `HTTP GET` and perform atomic writes to IndexedDB.
  3. ⬜ Create `DefinitionsView` (flashcard/glossary grid) and `QuoteGalleryView` (quote carousel/masonry).
* **Milestone 1:** ✅ The app pulls JSON from Apps Script and persists Catalog entries locally (Domain Data Sheet content sync is not yet built).
* **Estimated Time:** 15 – 21 Hours (3x original estimate, based on actual pace)

---

### Phase 1.5: Google Authentication & Auto-Provisioning Security Layer — ✅ Done
**Objective:** Replace the manual "Template Copy" onboarding and open (`Anyone`) access model with authenticated, per-identity requests and automatic backend file provisioning.

* **Requirements:**
  * Google Identity Services (GIS) sign-in button + ID token issuance on the client.
  * Apps Script `doGet(e)`/`doPost(e)` verify the ID token before any `SpreadsheetApp` access; requests without a valid token are rejected.
  * Auto-create the Master Index Spreadsheet (per identity) and per-item Domain Data Spreadsheet on first use, instead of requiring the user to manually copy a template sheet.
  * User-configurable GAS request timeout (30s / 1m / 3m / 6m) to tolerate the slower first-run auto-provisioning call.
* **Tasks:**
  1. ✅ Build `GoogleAuthService` (token storage, decode, logout) + `LoginComponent` (GIS button, signed-in user badge).
  2. ✅ Attach `idToken` to every `CatalogApiService` GET (query param) and POST (payload field); block calls client-side when unauthenticated (`CATALOG.ERRORS.authRequired`).
  3. ✅ Add `ConfigService.gasRequestTimeoutMs` (`GAS_TIMEOUT_OPTIONS`) with a Settings-drawer selector, wired into the GET/POST `AbortController` timeout + sample-data fallback.
  4. ✅ Document backend-side token verification and create-on-first-use provisioning behavior for Master Index & Domain Data files (see [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-authentication--auto-provisioning)).
* **Milestone 1.5:** ✅ Users sign in with Google before any sync/write; the backend auto-provisions their Master Index and Domain Data files on first use with no manual spreadsheet copying.
* **Estimated Time:** 6 – 9 Hours

---

### Phase 2: Structural Learning Components, Plot Timelines & Form Write-Back Engine — 🟡 Partially Done
**Objective:** Establish ordered workflows, character matrices, plot timelines, dynamic forms, and background write-back functionality.

* **Requirements:**
  * Schema support for **Step-by-Step Process Flow** (`ProcessSequenceView`), **Chronological Plot/Date Timeline** (`TimelineView`), and **Comparative Matrix** (`ComparisonMatrixView`).
  * `doPost` Apps Script Web App implementation with `LockService` for safe bi-directional updates.
* **Tasks:**
  1. ⬜ Implement `ProcessSequenceView` (numbered steppers), `TimelineView` (chronological plot ribbons), and `ComparisonMatrixView` (sticky character/feature grids).
  2. ✅ Build `CatalogFormModalComponent` using typed Angular Reactive Forms (Catalog CRUD only; Zod validation not yet added).
  3. ⬜ Build background `SyncQueue` worker listening to `window.ononline` to flush queued form additions/edits to Google Sheets (Catalog currently retries via `syncStatus: 'pending'/'error'` without an online-listener queue).
* **Milestone 2:** 🟡 Catalog entries save locally to IndexedDB and push to Google Sheets optimistically; structural/narrative domain views are not yet built.
* **Estimated Time:** 21 – 30 Hours (3x original estimate, based on actual pace)

---

### Phase 3: Dynamic Visual Engines, Mind Maps & Active Recall Quizzes — ⬜ Not Started
**Objective:** Render dynamic text diagrams (Mermaid.js), character maps, relational graphs, and interactive quiz components.

* **Requirements:**
  * Integration of `mermaid` renderer for dynamic flowchart generation and character relationship mapping.
  * Schema support for **Relational Knowledge/Character Graph** (`RelationsGraphView`) and **Mind Map / Hierarchy** (`MindMapView`).
  * Interactive components: **Flashcard Active Recall** (Spaced Repetition / Leitner), **Multiple-Choice Quiz**, **Fill-in-the-Blank Cloze**, and **Sequence Order Reconstruction** (`@angular/cdk/drag-drop`).
* **Tasks:**
  1. ⬜ Build `MermaidViewerComponent` to render `diagramCode` markup blocks on the fly inside card templates.
  2. ⬜ Build `RelationsGraphView` (D3.js / Cytoscape) for character trees and system topology.
  3. ⬜ Build `FlashcardQuizView` with Leitner / SM-2 algorithm tracking stored locally in IndexedDB.
  4. ⬜ Build `SequenceOrderQuizView` using Angular CDK drag-and-drop mechanics to test process step orders or plot chronologies.
* **Milestone 3:** ⬜ Full visual rendering of diagrammatic/character data alongside interactive quiz views for active recall.
* **Estimated Time:** 30 – 42 Hours (3x original estimate, based on actual pace)

---

### Phase 4: UX Polish, Onboarding & Deployment — ⬜ Not Started
**Objective:** Refine user onboarding documentation, optimize offline performance, and prepare for production hosting.

* **Requirements:**
  * In-app setup guide and production build pipeline for GitHub Pages or Vercel.
* **Tasks:**
  1. ⬜ Create an **Onboarding Modal/Guide** providing copy-paste Google Sheets and Apps Script templates across study domains.
  2. ⬜ Build `ImageContainerComponent` with automatic Google Drive view link conversion (`drive.google.com/uc?export=view&id=...`).
  3. ⬜ Optimize IndexedDB live queries and configure GitHub Actions deployment.
* **Milestone 4:** ⬜ Fully functional, standalone PWA/web app ready for production deployment.
* **Estimated Time:** 12 – 18 Hours (3x original estimate, based on actual pace)

---

## ⏱️ Total Implementation Estimate (Single Developer)

> **Revised:** Original estimates below assumed uninterrupted focus time; actual time spent has run roughly **3x** those figures, so estimates have been adjusted accordingly.

| Phase | Description | Estimate (3x Revised) | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Connection Setup, Catalog Registry & Sync Pipeline | 15 – 21 Hours | ✅ Done |
| **Phase 1.5** | Google Authentication & Auto-Provisioning Security Layer | 6 – 9 Hours | ✅ Done |
| **Phase 2** | Plot Timelines, Character Matrices & Form Write-Back Engine | 21 – 30 Hours | 🟡 Partially Done (Catalog CRUD only) |
| **Phase 3** | Character/System Graphs (Mermaid), Mind Maps & Quiz Engines | 30 – 42 Hours | ⬜ Not Started |
| **Phase 4** | Hybrid Image Handlers, Domain Polish & Deployment | 12 – 18 Hours | ⬜ Not Started |
| **Total** | **Complete Implementation** | **84 – 120 Hours** | 🟡 In Progress |

---

## 🌟 Nice to Have & Future Implementations

The following features represent high-value enhancements to be prioritized after completing the core implementation roadmap:

**1. Diagram Interactivity & Modal Visualizers**
* **Zoom & Pan Lightbox (`DiagramLightboxComponent`):** Add interactive SVG zooming (pan/zoom touch controls) for complex Mermaid diagrams and relational graphs when clicked.
* **Live Mermaid Sandbox Editor:** Provide an in-app text editor allowing users to live-preview Mermaid diagrams before saving them back to Google Sheets.

**2. Advanced Assessment & Learning Analytics**
* **Spaced Repetition Analytics Dashboard:** A visual heatmap displaying daily quiz completions, retention rates, and upcoming SM-2 review schedules.
* **Automated Distractor Generator:** An AI Angular service that uses existing definition/narrative entities to automatically construct distractor options for multiple-choice questions without requiring manual sheet input.

**3. Offline Conflict Resolution & Data Management**
* **Timestamp-Based Conflict Resolver:** An interactive resolution modal that prompts users when a local IndexedDB record conflicts with an updated Google Sheet row during sync (Choose: *Keep Mine*, *Overwrite*, or *Duplicate*).
* **IndexedDB Backup & Restore (.json):** Allow users to export and import their full local IndexedDB database as a JSON file to transfer study progress across devices without re-syncing from scratch.
