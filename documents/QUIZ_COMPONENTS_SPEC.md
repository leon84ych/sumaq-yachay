# Interactive Quiz Components Specification — sumaq-yachay

This specification details the technical architecture, spreadsheet schemas, IndexedDB database models, assessment logic, and implementation order for the self-assessment and quiz components in `sumaq-yachay`.

These components automatically transform raw study data stored in Google Sheets into interactive review activities to reinforce retention through active recall and spaced repetition.

---

## 🎯 Quiz Component Catalog & Technical Specs

### 1. Flashcard Active Recall (`FlashcardQuizView`)
* **Core Concept:** Classic two-sided card flip with self-reported confidence grading (Spaced Repetition / SuperMemo Leitner system).
* **Source Domain:** `DefinitionsView` or `QuoteGalleryView`
* **Google Sheet Schema:** Uses existing `Definitions` sheet (`term`, `shortDefinition`, `extendedExplanation`, `sourceBook`).
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface FlashcardProgressEntity {
    id?: number;
    definitionId: number;
    boxLevel: number; // 1 to 5 (Leitner Box)
    intervalDays: number;
    easeFactor: number; // Default 2.5
    nextReviewDate: string; // ISO Date String
    lastReviewedAt: string;
  }
  // Dexie Table Index: '++id, definitionId, nextReviewDate, boxLevel'
  ```
* **Interaction & Logic:**
  1. Shows the `term` or `quote`.
  2. User attempts active recall, then clicks **Flip Card** to reveal `shortDefinition`.
  3. User grades their performance: **Again (1)**, **Hard (2)**, **Good (3)**, or **Easy (4)**.
  4. Updates `nextReviewDate` in IndexedDB based on interval calculation.

---

### 2. Multiple-Choice Quiz (`MultipleChoiceQuizView`)
* **Core Concept:** Four-option question generated automatically or manually from definitions, concepts, or timeline dates.
* **Source Domain:** `DefinitionsView` or `TimelineView`
* **Google Sheet Schema:**
  * `question` (String, Required)
  * `correctAnswer` (String, Required)
  * `distractor1` (String, Required)
  * `distractor2` (String, Required)
  * `distractor3` (String, Required)
  * `explanation` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface MultipleChoiceEntity {
    id?: number;
    sheetId: string;
    question: string;
    correctAnswer: string;
    options: string[]; // Dynamically shuffled Array(4)
    explanation?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, sourceBook'
  ```
* **Interaction & Logic:**
  1. Presents question and 4 randomized options.
  2. On option select, highlights correct answer in green and distractors in red.
  3. Displays source attribution (`sourceBook`, `explanation`) for context.

---

### 3. Step Order Reconstruction (`SequenceOrderQuizView`)
* **Core Concept:** Interactive drag-and-drop / click-to-reorder quiz to test process comprehension.
* **Source Domain:** `ProcessSequenceView`
* **Google Sheet Schema:** Reuses `ProcessSequence` sheet (`processName`, `stepNumber`, `actionTitle`, `detailsOrCode`).
* **Dexie.js / IndexedDB Schema:** Uses existing `ProcessStepEntity` table.
* **Interaction & Logic:**
  1. Selects a `processName` and fetches all related steps.
  2. Shuffles the step tiles randomly on screen.
  3. User drags and drops (or uses up/down controls) to restore the correct `stepNumber` order.
  4. Provides instant feedback showing misplaced steps in red and correct sequences in green.

---

### 4. Fill-in-the-Blank Code / Term Cloze (`ClozeDeletionQuizView`)
* **Core Concept:** Sentence or code block completion where key terms, commands, or concepts are masked out.
* **Source Domain:** `DefinitionsView` or `ProcessSequenceView`
* **Google Sheet Schema:**
  * `contextText` (String, Required — e.g., "In DDD, a `{{bounded_context}}` defines explicit boundaries.")
  * `targetAnswer` (String, Required)
  * `hint` (String, Optional)
  * `sourceBook` (String, Required)
* **Dexie.js / IndexedDB Schema:**
  ```typescript
  export interface ClozeQuizEntity {
    id?: number;
    sheetId: string;
    contextText: string;
    targetAnswer: string;
    hint?: string;
    sourceBook: string;
    updatedAt: string;
  }
  // Dexie Table Index: '++id, sheetId, sourceBook'
  ```
* **Interaction & Logic:**
  1. Parses `contextText` dynamically, replacing `{{tag}}` placeholders with input fields.
  2. User types the missing word or command.
  3. Case-insensitive string matching provides instant validation with optional hint reveal.

---

### 5. Relationship Matcher (`ConceptMatchQuizView`)
* **Core Concept:** Matching pairs of entities (e.g., matching a term to its definition, or a concept node to its related target).
* **Source Domain:** `RelationsGraphView` or `DefinitionsView`
* **Google Sheet Schema:** Reuses `Relations` or `Definitions` sheet.
* **Dexie.js / IndexedDB Schema:** Reads directly from existing `RelationEntity` or `DefinitionEntity` stores.
* **Interaction & Logic:**
  1. Displays two parallel columns (left: terms/nodes; right: definitions/targets, randomized).
  2. User clicks an item on the left, then clicks its corresponding match on the right.
  3. Successfully matched pairs freeze and lock in green; incorrect attempts flash red.

---

## 🛠️ Combined Quiz Database Class

```typescript
import Dexie, { Table } from 'dexie';

export class SumaqYachayQuizDB extends Dexie {
  flashcardProgress!: Table<FlashcardProgressEntity, number>;
  multipleChoice!: Table<MultipleChoiceEntity, number>;
  clozeQuizzes!: Table<ClozeQuizEntity, number>;

  constructor() {
    super('SumaqYachayQuizDB');
    this.version(1).stores({
      flashcardProgress: '++id, definitionId, nextReviewDate, boxLevel',
      multipleChoice: '++id, sheetId, sourceBook',
      clozeQuizzes: '++id, sheetId, sourceBook'
    });
  }
}

export const quizDb = new SumaqYachayQuizDB();
```

---

## 🚀 Suggested Quiz Implementation Order

```
[ Phase 1: High ROI ] ──────> [ Phase 2: Interactive ] ──────> [ Phase 3: Advanced Drag/Drop ]
  - Flashcard Active Recall     - Multiple Choice Quiz           - Sequence Order Reconstruction
  - Fill-in-the-Blank Cloze     - Relationship Matcher
```

### Order Rationale:
1. **Phase 1 (Immediate Self-Assessment Value):** **Flashcards** and **Cloze Deletions** require minimal UI complexity, reuse existing definition schemas directly, and establish the core repetition loop.
2. **Phase 2 (Structured Review):** **Multiple Choice** and **Relationship Matchers** introduce score tracking, option shuffling, and multi-entity validation.
3. **Phase 3 (Interactive Mechanics):** **Sequence Order Reconstruction** requires Angular CDK Drag and Drop (`@angular/cdk/drag-drop`), making it best suited once the core state management is fully established.
