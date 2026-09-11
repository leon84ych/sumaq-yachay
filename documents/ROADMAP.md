# Implementation Roadmap — sumaq-yachay

This document outlines the sequential development phases, requirements, prerequisites, and milestone estimates for `sumaq-yachay`. It includes visual and interactive definitions (Learning Components, Quiz Engine, Hybrid Diagramming, Bi-Directional Write-Back, and the Universal 5-Entity Learning Schema) alongside a structured "Nice-to-Have / Future Implementations" section.

---

## 📋 Prerequisites & Initial Requirements

* **Development Environment:** Node.js (v18+ or v20+ LTS), Angular CLI (v17+), and an IDE (e.g., VS Code).
* **Google Account:** A personal `@gmail.com` account for testing Google Sheets and Google Apps Script execution.
* **Key Dependencies:** `dexie` (IndexedDB ORM), `mermaid` (Dynamic SVGs), `@angular/cdk` (Drag-and-Drop for Quizzes), and `zod` (Form & Schema Validation).

---

## 🏗️ Universal 5-Entity Learning Schema

To prevent tab sprawl across different study domains (Technical, Philosophical, and Narrative Fiction), `sumaq-yachay` uses a single **Universal 5-Entity Schema**. The UI automatically adapts components based on the `Category` attribute (`Technical`, `Philosophy`, `Fiction`).

| Entity | Technical (e.g., Kafka) | Philosophy (e.g., Nietzsche) | Fiction & Narrative (e.g., Allende) |
| :--- | :--- | :--- | :--- |
| **1. Entities** | Terms, Architecture, Services | Philosophical concepts, Core terms | Characters, Settings, Symbols/Motifs |
| **2. Relations** | Topology, Component interactions | Dialectics, Influence graphs | Character relationships, Lineage |
| **3. Excerpts** | Code blocks, CLI commands | Iconic quotes, Aphorisms | Key narrative passages, Sensory prose |
| **4. Timelines / Sequences** | Event logs, Step-by-step flows | Historical context, Argument flow | Chronological plot arcs, Chapter events |
| **5. Scenarios / Active Recall** | Failover cases, Edge cases | Socratic prompts, Thought experiments | Character motivations, Plot conflict analysis |

---

## 🎯 Phase Sequence & Milestones

### Phase 1: Foundational Sync Pipeline & Universal Catalogs
**Objective:** Connect the Google Apps Script endpoint, sync flat definitions, quotes, and narrative entities, and store data into IndexedDB.

* **Requirements:**
  * Master Index Sheet layout design (`Type`, `SheetID`, `Name`, `Category`, `Active`).
  * Apps Script Web App standard deployment setup (`doGet`).
  * Schema support for **Entities & Glossary** (`DefinitionsView`), **Quote & Excerpt Gallery** (`QuoteGalleryView`), and **Character/Motif Cards** (Narrative Mode).
* **Tasks:**
  1. Define the Master Index Sheet structure and draft base Apps Script JSON handler.
  2. Implement `DataSyncService` to fetch JSON via `HTTP GET` and perform atomic writes to IndexedDB.
  3. Create `DefinitionsView` (flashcard/glossary grid) and `QuoteGalleryView` (quote carousel/masonry).
* **Milestone 1:** The app pulls JSON from Apps Script and persists entities, excerpts, and narrative cards locally.
* **Estimated Time:** 5 – 7 Hours

---

### Phase 2: Structural Learning Components, Plot Timelines & Form Write-Back Engine
**Objective:** Establish ordered workflows, character matrices, plot timelines, dynamic forms, and background write-back functionality.

* **Requirements:**
  * Schema support for **Step-by-Step Process Flow** (`ProcessSequenceView`), **Chronological Plot/Date Timeline** (`TimelineView`), and **Comparative Matrix** (`ComparisonMatrixView`).
  * `doPost` Apps Script Web App implementation with `LockService` for safe bi-directional updates.
* **Tasks:**
  1. Implement `ProcessSequenceView` (numbered steppers), `TimelineView` (chronological plot ribbons), and `ComparisonMatrixView` (sticky character/feature grids).
  2. Build `DefinitionFormComponent` using typed Angular Reactive Forms and Zod validation.
  3. Build background `SyncQueue` worker listening to `window.ononline` to flush queued form additions/edits to Google Sheets.
* **Milestone 2:** Structural and narrative views render sorted spreadsheet data, and user updates save locally to IndexedDB while syncing asynchronously back to Google Sheets.
* **Estimated Time:** 7 – 10 Hours

---

### Phase 3: Dynamic Visual Engines, Mind Maps & Active Recall Quizzes
**Objective:** Render dynamic text diagrams (Mermaid.js), character maps, relational graphs, and interactive quiz components.

* **Requirements:**
  * Integration of `mermaid` renderer for dynamic flowchart generation and character relationship mapping.
  * Schema support for **Relational Knowledge/Character Graph** (`RelationsGraphView`) and **Mind Map / Hierarchy** (`MindMapView`).
  * Interactive components: **Flashcard Active Recall** (Spaced Repetition / Leitner), **Multiple-Choice Quiz**, **Fill-in-the-Blank Cloze**, and **Sequence Order Reconstruction** (`@angular/cdk/drag-drop`).
* **Tasks:**
  1. Build `MermaidViewerComponent` to render `diagramCode` markup blocks on the fly inside card templates.
  2. Build `RelationsGraphView` (D3.js / Cytoscape) for character trees and system topology.
  3. Build `FlashcardQuizView` with Leitner / SM-2 algorithm tracking stored locally in IndexedDB.
  4. Build `SequenceOrderQuizView` using Angular CDK drag-and-drop mechanics to test process step orders or plot chronologies.
* **Milestone 3:** Full visual rendering of diagrammatic/character data alongside interactive quiz views for active recall.
* **Estimated Time:** 10 – 14 Hours

---

### Phase 4: UX Polish, Onboarding & Deployment
**Objective:** Refine user onboarding documentation, optimize offline performance, and prepare for production hosting.

* **Requirements:**
  * In-app setup guide and production build pipeline for GitHub Pages or Vercel.
* **Tasks:**
  1. Create an **Onboarding Modal/Guide** providing copy-paste Google Sheets and Apps Script templates across Technical, Philosophical, and Narrative domains.
  2. Build `ImageContainerComponent` with automatic Google Drive view link conversion (`drive.google.com/uc?export=view&id=...`).
  3. Optimize IndexedDB live queries and configure GitHub Actions deployment.
* **Milestone 4:** Fully functional, standalone PWA/web app ready for production deployment.
* **Estimated Time:** 4 – 6 Hours

---

## ⏱️ Total Implementation Estimate (Single Developer)

| Phase | Description | Estimate |
| :--- | :--- | :--- |
| **Phase 1** | Connection Setup, Universal Schema & Excerpt Gallery | 5 – 7 Hours |
| **Phase 2** | Plot Timelines, Character Matrices & Form Write-Back Engine | 7 – 10 Hours |
| **Phase 3** | Character/System Graphs (Mermaid), Mind Maps & Quiz Engines | 10 – 14 Hours |
| **Phase 4** | Hybrid Image Handlers, Domain Polish & Deployment | 4 – 6 Hours |
| **Total** | **Complete Implementation** | **26 – 37 Hours** |

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
