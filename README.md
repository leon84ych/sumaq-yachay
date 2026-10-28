# sumaq-yachay 🧠✨

`sumaq-yachay` (Quechua for *Beautiful Knowledge*) is a modular, offline-first active recall and interactive learning application built with Angular 17+, IndexedDB (Dexie.js), and Google Sheets / Google Apps Script as a lightweight bi-directional backend.

It features a **Universal 5-Entity Learning Schema** that seamlessly adapts to technical architectures (e.g., Apache Kafka), philosophical texts (e.g., Nietzsche), and narrative fiction (e.g., Isabel Allende).

## User Manual

Select the application brand to open `/documentation`. The responsive manual follows the language,
light/dark theme, and text size selected in Settings.

Manuals are public Markdown files in `public/docs/en/manual/` and `public/docs/es/manual/`.
Name each file `001_Title.md`: the numeric prefix sets the order, and the remaining filename
becomes the link label, with underscores displayed as spaces. Use the same unique numeric prefix
for matching topics in both languages so language switching stays on the current topic.

`npm start`, `npm run build`, and `npm run watch` regenerate `public/docs/manuals.json` automatically.
After adding, removing, or renaming files during development, run `npm run docs:index` or restart
the server. Editing an existing Markdown file does not require regenerating the index. When invoking
`ng` directly rather than the npm scripts, run `npm run docs:index` first.

Run the documentation tests independently with:

```bash
npm test -- --watch=false --ts-config=tsconfig.documentation-spec.json --include=src/app/features/documentation/**/*.spec.ts
```

## Master Catalog Cloning

**Clone Master Catalog** is the only master-catalog import operation. The dialog retains a clone
warning but has no clone/shared mode selector. It submits `{ action: 'CLONE_CATALOG', SheetId: url }`;
the HTTP client adds `idToken`, with no `option` field. GAS requests wait up to 60 seconds.
Cloning remains unavailable in Local Sample Data mode or while catalog items already exist.

## Registering Data Sources

**Register Source** supports **New data source** (the existing fields-based create operation) and
**URL** (clone one existing Google Sheet). URL mode submits
`{ action: 'CLONE_CATALOG_ITEM', SheetId: url }`; the HTTP client adds only `idToken`.
It does not send catalog metadata or mode options and can add to a non-empty catalog.
The clone operation requires administrator permissions and remote mode, retains the one-minute
timeout, and refreshes the catalog after success. Editing remains fields-only.

## Study Session Search

`StudySearchService` owns the in-memory keyword shared by Catalog, Learn, Quiz, and the searchable
book-content views. Clearing a search box clears it everywhere; reloading the application starts
with an empty keyword. Catalog also checks locally stored learning content for related books.

Domain tag buttons append canonical hashtags to that keyword without duplicates. The shared
matcher requires the free-text phrase and every exact tag to match, for example
`James Joyce #memory #identity`. Removing hashtags in the search field removes those constraints.

Book and author header buttons add exact metadata constraints such as `book:"Ulysses"` and
`author:"James Joyce"`, preserving existing text and tags. These constraints do not match mere
mentions of the selected title or author in other entries' body text.

Contributor footer buttons add `contributor:"identity"` filters across domains, Catalog, and
Learn without clearing other filters. They display the username but match the full stored
contributor identity; entries from different accounts sharing a username remain distinct.

Run the shared-search integration tests with:

```bash
npm test -- --watch=false --ts-config=tsconfig.study-search-spec.json --include=src/app/core/services/study-search.service.spec.ts
```

---

## 📋 Table of Contents
- [Architecture & Structural Design](#-architecture--structural-design)
- [Universal 5-Entity Learning Schema](#-universal-5-entity-learning-schema)
- [Backend (BE) Configuration & Google Apps Script Setup](#-backend-be-configuration--google-apps-script-setup)
- [Getting Started & Local Development](#-getting-started--local-development)
- [GitHub Pages Deployment](#-github-pages-deployment)
- [Code Generation & Build Commands](#-code-generation--build-commands)
- [Implementation & AI Roadmaps](#-implementation--ai-roadmaps)

---

## 🏛️ Architecture & Structural Design

The application follows a **Feature-Driven Domain-Driven Design (DDD)** structure divided into four distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│        (Smart Components, Dumb Components, View Controllers)    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Direct Signal / Observable Access
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                         │
│         (State Facades, Quiz Engines, Sync Coordinators)        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Uses Services & Repositories
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DOMAIN LAYER                           │
│        (Entities, Schemas, SM-2 Algorithm, Constants)           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Persists & Syncs Data
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│      (Dexie IndexedDB, Apps Script HTTP Client, WebLLM API)      │
└─────────────────────────────────────────────────────────────────┘
```

### 📂 Directory Layout
```
src/app/
├── core/                         # Singleton services, Dexie DB & HTTP clients
├── domain/                       # Framework-free business models, SM-2 algorithm, Zod schemas
├── features/                     # Domain-driven feature modules
│   ├── catalog/                  # Master index catalog navigation
│   ├── learning-views/           # Definitions, Process Steppers, Timeline Ribbons
│   ├── active-recall/            # Spaced repetition, Flashcards, Cloze quizzes
│   ├── diagram-engine/           # Dynamic Mermaid.js flowcharts & Mind maps
│   └── sync-engine/              # Background sync queue & write-back worker
├── shared/                       # Reusable UI elements, directives, and pipes
└── app.routes.ts                 # Main standalone routes configuration
```

---

## 🏗️ Universal 5-Entity Learning Schema

Instead of managing unique tabs for every subject, `sumaq-yachay` normalizes knowledge into 5 structural entities. The UI dynamically renders custom views based on the `Category` attribute (`Technical`, `Philosophy`, `Fiction`):

| Entity | Technical (e.g., Kafka) | Philosophy (e.g., Nietzsche) | Fiction & Narrative (e.g., Allende) |
| :--- | :--- | :--- | :--- |
| **1. Entities** | Terms, Architecture, Services | Philosophical concepts, Core terms | Characters, Settings, Symbols/Motifs |
| **2. Relations** | Topology, Component interactions | Dialectics, Influence graphs | Character relationships, Lineage |
| **3. Excerpts** | Code blocks, CLI commands | Iconic quotes, Aphorisms | Key narrative passages, Sensory prose |
| **4. Timelines / Sequences** | Event logs, Step-by-step flows | Historical context, Argument flow | Chronological plot arcs, Chapter events |
| **5. Scenarios / Active Recall** | Failover cases, Edge cases | Socratic prompts, Thought experiments | Character motivations, Plot conflict analysis |

---

## ⚙️ Backend (BE) Configuration & Google Apps Script Setup

`sumaq-yachay` uses **Google Sheets** as its database and **Google Apps Script** as a serverless API gateway.

### 1. Master Index Sheet Structure
Create a Google Sheet titled **Master Index** with a tab named `Index`:

| Type | SheetID | Name | Category | Active |
| :--- | :--- | :--- | :--- | :--- |
| `Definitions` | `1a8B...x9` | Kafka Core Concepts | `Technical` | `TRUE` |
| `Timeline` | `3m4N...q7` | Allende Plot Arc | `Fiction` | `TRUE` |
| `Quotes` | `9z2K...p1` | Zaratustra Passages | `Philosophy` | `TRUE` |

### 2. Apps Script Endpoint (`Code.gs`)
1. In your Google Sheet, navigate to **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with the following code:

```javascript
/**
 * Handles HTTP GET requests — Syncs sheets data to client IndexedDB
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const indexSheet = ss.getSheetByName("Index");
  const indexData = getSheetData(indexSheet);
  
  const payload = {
    index: indexData,
    sheets: {}
  };
  
  indexData.forEach(row => {
    if (row.Active === true || row.Active === "TRUE") {
      const targetSheet = ss.getSheetByName(row.Name);
      if (targetSheet) {
        payload.sheets[row.Name] = getSheetData(targetSheet);
      }
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests — Bi-directional write-back with LockService
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Prevent concurrent write race conditions
  
  try {
    const contents = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetSheet = ss.getSheetByName(contents.targetSheet);
    
    if (!targetSheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Append or update row payload
    targetSheet.appendRow(contents.rowValues);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}
```

### 3. Deployment Steps
1. Click **Deploy > New deployment**.
2. Select **Web app** as the deployment type.
3. Configure settings:
   * **Execute as:** `Me (your email)`
   * **Who has access:** `Anyone` (required for seamless client fetching without OAuth prompt overhead).
4. Copy the resulting **Web App URL** and add it to your `environment.ts` file in the Angular frontend:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  appsScriptUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};
```

---

## 🚀 Getting Started & Local Development

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.0+.

### Prerequisites
* **Node.js**: v18.0.0+ or v20.0.0+ LTS
* **Package Manager**: npm (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/sumaq-yachay.git

# Change directory
cd sumaq-yachay

# Install dependencies
npm install
```

### Development Server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

```bash
ng serve
```

---

## 🚀 GitHub Pages Deployment

This project is configured as a GitHub Pages project site at:

https://leon84ych.github.io/sumaq-yachay/

### Prerequisites

- A GitHub repository with GitHub Pages enabled.
- Node.js and npm installed.
- The repository remote configured as `https://github.com/leon84ych/sumaq-yachay.git`.

### Deploy

From the repository root, run:

```bash
npm install
npm run deploy
```

The `deploy` script performs the following steps:

1. Builds the Angular application in production mode.
2. Sets the Angular base URL to the project's GitHub Pages URL.
3. Publishes the generated `dist/sumaq-yachay/browser` directory to the GitHub Pages branch.

The deployment command uses the following base URL:

```text
https://leon84ych.github.io/sumaq-yachay/
```

If the deployment fails, verify that the repository has a `gh-pages` branch or that GitHub Pages is configured to publish from the branch used by `angular-cli-ghpages`.

To verify the deployment after publishing, open:

```text
https://leon84ych.github.io/sumaq-yachay/
```

---

## 🛠️ Code Generation & Build Commands

### Code Generators
Run `ng generate component component-name` to generate a new component. You can also use:
```bash
ng generate directive|pipe|service|class|guard|interface|enum|module
```

### Running Unit Tests
Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

```bash
ng test
```

### Running End-to-End Tests
Run `ng e2e` to execute end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

### Production Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

```bash
ng build --configuration production
```

---

## 📑 Implementation & AI Roadmaps

For detailed operational guides and phase-by-phase development schedules, refer to:
* 📄 [`Roadmap.md`](./Roadmap.md) — Implementation schedule for core Angular & Dexie features.
* 📄 [`AI-ROADMAP.md`](./AI-ROADMAP.md) — Phased rollout for Gemini API, Semantic Active Recall, and WebLLM on-device AI.
* 📄 [`ARCHITECTURE-AND-STRUCTURE.md`](./ARCHITECTURE-AND-STRUCTURE.md) — In-depth architectural guidelines.
