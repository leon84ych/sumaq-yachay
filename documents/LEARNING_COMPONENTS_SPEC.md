# Learning Visual Components Specification — sumaq-yachay

This specification outlines the technical design, spreadsheet schemas, IndexedDB database models, use cases, and recommended implementation order for the visual learning components in `sumaq-yachay`.

---

## 🎯 Component Catalog & Specifications

### 1. Definitions & Glossary (`DefinitionsView`)
* **Best For Learning:** Vocabulary building, domain taxonomies, key terminology, and flashcard-style reviews.
* **Use Case:** A software team reviewing core DDD (Domain-Driven Design) terms extracted from *Domain-Driven Design* by Eric Evans.
* **Google Sheet Schema:**
  * `term` (String, Required)
  * `category` (String, Required)
  * `shortDefinition` (String, Required)
  * `extendedExplanation` (String, Optional)
  * `sourceBook` (String, Required)
  * `chapterPage` (String, Optional)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface DefinitionEntity {
    id?: number;
    sheetId: string;
    term: string;
    category: string;
    shortDefinition: string;
    extendedExplanation?: string;
    sourceBook: string;
    chapterPage?: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, term, category, sourceBook'
  ```

---

### 2. Process Sequence Flow (`ProcessSequenceView`)
* **Best For Learning:** Standard Operating Procedures (SOPs), algorithmic execution, deployment pipelines, and ordered workflows.
* **Use Case:** Visualizing a CI/CD pipeline setup or an incident response protocol derived from SRE handbooks.
* **Google Sheet Schema:**
  * `processName` (String, Required)
  * `stepNumber` (Number, Required)
  * `actionTitle` (String, Required)
  * `prerequisites` (String, Optional)
  * `detailsOrCode` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface ProcessStepEntity {
    id?: number;
    sheetId: string;
    name: string;
    stepNumber: number;
    actionTitle: string;
    prerequisites?: string;
    detailsOrCode?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, processName, [processName+stepNumber]'
  ```

---

### 3. Chronological Timeline (`TimelineView`)
* **Best For Learning:** Historical evolutions, technical framework release timelines, case studies, and progressive event tracking.
* **Use Case:** Tracking the evolution of web architecture patterns from monolithic to serverless across multiple technical books.
* **Google Sheet Schema:**
  * `dateOrEra` (String, Required)
  * `eventTitle` (String, Required)
  * `description` (String, Required)
  * `tags` (Comma-separated String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface TimelineEntity {
    id?: number;
    sheetId: string;
    dateOrEra: string;
    eventTitle: string;
    description: string;
    tags: string[];
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, dateOrEra, sourceBook'
  ```

---

### 4. Relational Knowledge Graph (`RelationsGraphView`)
* **Best For Learning:** System dependencies, interconnected conceptual models, architectural trade-offs, and node mapping.
* **Use Case:** Mapping relationships between Microservices principles (e.g., *Service Discovery* `depends_on` *Health Checks*).
* **Google Sheet Schema:**
  * `sourceNode` (String, Required)
  * `relationship` (String, Required — e.g., `depends_on`, `implements`, `contradicts`)
  * `targetNode` (String, Required)
  * `contextNote` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface RelationEntity {
    id?: number;
    sheetId: string;
    sourceNode: string;
    relationship: string;
    targetNode: string;
    contextNote?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, sourceNode, targetNode, relationship'
  ```

---

### 5. Mind Map & Hierarchy Tree (`MindMapView`)
* **Best For Learning:** High-level curriculum overviews, book chapter breakdowns, and structured hierarchical topic summaries.
* **Use Case:** Displaying a collapsible chapter tree for a technical book like *Designing Data-Intensive Applications*.
* **Google Sheet Schema:**
  * `nodeId` (String, Required)
  * `parentNodeId` (String, Optional — Empty for root nodes)
  * `topicTitle` (String, Required)
  * `summary` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface MindMapEntity {
    id?: number;
    sheetId: string;
    nodeId: string;
    parentNodeId?: string;
    topicTitle: string;
    summary?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, nodeId, parentNodeId, sourceBook'
  ```

---

### 6. Quote & Excerpt Gallery (`QuoteGalleryView`)
* **Best For Learning:** Retaining core author philosophies, memorable heuristics, design rules of thumb, and key quotes.
* **Use Case:** A team billboard displaying rules of thumb from *The Pragmatic Programmer*.
* **Google Sheet Schema:**
  * `quote` (String, Required)
  * `author` (String, Required)
  * `bookTitle` (String, Required)
  * `chapterPage` (String, Optional)
  * `keyTakeaway` (String, Optional)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface QuoteEntity {
    id?: number;
    sheetId: string;
    quote: string;
    author: string;
    bookTitle: string;
    chapterPage?: string;
    keyTakeaway?: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, author, bookTitle'
  ```

---

### 7. Comparative Matrix (`ComparisonMatrixView`)
* **Best For Learning:** Evaluating technical trade-offs, pattern comparisons, framework evaluations, and decision matrix analysis.
* **Use Case:** Comparing REST vs. GraphQL vs. gRPC based on networking and API books.
* **Google Sheet Schema:**
  * `featureCriteria` (String, Required)
  * `optionA` (String, Required)
  * `optionB` (String, Required)
  * `recommendation` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface ComparisonEntity {
    id?: number;
    sheetId: string;
    featureCriteria: string;
    optionA: string;
    optionB: string;
    recommendation?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, featureCriteria, sourceBook'
  ```

---

## 🛠️ Combined Dexie.js Database Class

```typescript
import Dexie, { Table } from 'dexie';

export class SumaqYachayDB extends Dexie {
  definitions!: Table<DefinitionEntity, number>;
  processSteps!: Table<ProcessStepEntity, number>;
  timelines!: Table<TimelineEntity, number>;
  relations!: Table<RelationEntity, number>;
  mindMaps!: Table<MindMapEntity, number>;
  quotes!: Table<QuoteEntity, number>;
  comparisons!: Table<ComparisonEntity, number>;

  constructor() {
    super('SumaqYachayDB');
    this.version(1).stores({
      definitions: '++id, sheetId, term, category, sourceBook',
      processSteps: '++id, sheetId, processName, [processName+stepNumber]',
      timelines: '++id, sheetId, dateOrEra, sourceBook',
      relations: '++id, sheetId, sourceNode, targetNode, relationship',
      mindMaps: '++id, sheetId, nodeId, parentNodeId, sourceBook',
      quotes: '++id, sheetId, author, bookTitle',
      comparisons: '++id, sheetId, featureCriteria, sourceBook'
    });
  }
}

export const db = new SumaqYachayDB();
```

---

## 🚀 Suggested Implementation Order

```
[ Phase 1: Foundational ] ──> [ Phase 2: Structural ] ──> [ Phase 3: Visual & Complex ]
  - Definitions                 - Process Sequence          - Relational Graph
  - Quotes                      - Timeline                  - Mind Map
                                - Comparison Matrix
```

### Order Rationale:
1. **Phase 1 (Low Complexity, High Immediate Value):** Start with **Definitions** and **Quotes**. These rely on flat arrays with simple search/filter logic and validate the data rendering pipeline quickly.
2. **Phase 2 (Medium Complexity):** Implement **Process Sequences**, **Timelines**, and **Comparison Matrices**. These require sorting (e.g., step order, dates) and tabular alignments.
3. **Phase 3 (High Complexity):** Implement **Relational Graphs** (requires D3.js or Cytoscape.js) and **Mind Maps** (requires hierarchical tree parsing). Building these last ensures the data fetching and IndexedDB engines are fully stable.
