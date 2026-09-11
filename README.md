# sumaq-yachay 🧠✨

`sumaq-yachay` (Quechua for *Beautiful Knowledge*) is a modular, offline-first active recall and interactive learning application built with Angular 17+, IndexedDB (Dexie.js), and Google Sheets / Google Apps Script as a lightweight bi-directional backend.

It features a **Universal 5-Entity Learning Schema** that seamlessly adapts to technical architectures (e.g., Apache Kafka), philosophical texts (e.g., Nietzsche), and narrative fiction (e.g., Isabel Allende).

---

## 📋 Table of Contents
- [Architecture & Structural Design](#-architecture--structural-design)
- [Universal 5-Entity Learning Schema](#-universal-5-entity-learning-schema)
- [Backend (BE) Configuration & Google Apps Script Setup](#-backend-be-configuration--google-apps-script-setup)
- [Getting Started & Local Development](#-getting-started--local-development)
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
