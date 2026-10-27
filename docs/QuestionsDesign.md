# Questions Domain and Practice Feed

## 1. Purpose and Scope

This document defines the QUESTIONS domain within the existing Sumaq Yachay Angular application. It describes the current domain ownership, sheet and local-storage contracts, and the proposed dedicated question-practice workflow.

The feature has two distinct data boundaries:

- Question content is domain data synchronized with the book's Google Sheets data through the existing catalog-detail write path.
- Learner attempts are private client-side activity and must remain in IndexedDB. They must never be included in a Google Sheets write.

The general Learn feed already includes QUESTIONS rows. It is a mixed-domain feed, not a dedicated question quiz. The dedicated practice experience and attempt history described below are planned additions unless explicitly identified as existing behavior.

## 2. Existing Project Ownership

Questions are part of the domain feature tree, not a separate top-level `features/questions` feature. Continue the existing `domain-questions` ownership and reuse catalog-detail, domain-handler, and storage services.

```text
src/app/features/domain/domain-questions/
├── components/
│   ├── question-form/
│   └── question-generator/
├── domain-questions/
│   └── question.component.ts|html|css
├── model/
│   └── domain-question-row.model.ts
└── services/
    └── domain-questions.service.ts

src/app/features/catalog-detail/
├── components/sheet-view-resolver/
├── models/domain-sheet-config.ts
└── services/domain-data.service.ts

src/app/core/services/storage/
└── app-db.service.ts

src/app/features/learn/
├── learn/                   # /learn route
└── services/learn-feed.service.ts
```

The current QUESTIONS tab is rendered by `SheetViewResolverComponent` using `QuestionsComponent`. The component supports listing, searching, adding, editing, and deleting questions. `QuestionGeneratorComponent` can generate a question from a domain entry using the browser AI service.

## 3. Question Data Contract

The canonical model is `src/app/features/domain/domain-questions/model/domain-question-row.model.ts`. Reuse it; do not introduce a parallel `QuestionRow` model under a new feature directory.

### 3.1 Question Types

```ts
export type QuestionType = 'flashcard' | 'multiple-choice' | 'true-false' | 'open';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
```

`QuestionOption` contains `id`, `text`, and `isCorrect`. `QuestionRow` extends `DomainSheetRow` and includes `question`, `answer`, `type`, optional `options`, and source/context fields such as `sourceDomain`, `sourceRowId`, `sourceTerm`, `bookRow`, `bookName`, `page`, `difficulty`, and `aiGenerated`.

### 3.2 QUESTIONS Sheet

The configured sheet columns are defined in `catalog-detail/models/domain-sheet-config.ts`:

```text
id, question, answer, type, options, sourceDomain, sourceRowId, sourceTerm,
bookRow, bookName, page, difficulty, aiGenerated, tags, feed, contributor, syncStatus
```

These names and the four current question type values are the contract. In particular, origins use `sourceDomain` and `sourceRowId`; do not substitute `sourceRef` or a different type vocabulary without an explicit sheet migration.

`QuestionRecord` is the Dexie persistence shape consumed by `DomainQuestionsService`. Keep it aligned with the actual QUESTIONS rows as the model evolves; avoid maintaining duplicate field definitions that drift from `QuestionRow`.

## 4. Persistence and Synchronization Boundaries

### 4.1 Question Content

The existing write flow is:

```text
QuestionsComponent or QuestionGeneratorComponent
  -> DomainDataService.updateDomainSheetRows('QUESTIONS', ...)
  -> DomainDataApiService.updateRows(...)
  -> DomainQuestionsService.syncRemoteRows(...)
  -> AppDbService.db.questions
```

`DomainDataService` owns local-first writes, remote synchronization, and routing to the registered domain feature handler. `DomainQuestionsService` owns QUESTIONS-specific Dexie loading, synchronization, and tag sanitation. New question creation UI should call this established flow rather than calling Google Apps Script or Dexie directly.

The IndexedDB table is `questions`, keyed and indexed using the existing domain-table schema in `AppDatabase`. The `row` property identifies the owning catalog/book row; the question's `id` identifies the row within that domain sheet.

The current QUESTIONS model includes an `options` field, while the implementation's serialization behavior is owned by the API/backend contract. Before changing its wire representation, verify the existing `DomainDataApiService` and Apps Script expectations; do not assume that a new modal should stringify options itself.

### 4.2 Learner Attempts

Attempts are not part of the QUESTIONS sheet and must not be sent through `DomainDataService` or `DomainDataApiService`.

The planned local model should live beside the domain model, for example:

```text
features/domain/domain-questions/model/question-attempt.model.ts
features/domain/domain-questions/services/question-attempt.service.ts
```

Suggested record fields:

```ts
export interface QuestionAttempt {
  id?: number;
  questionId: string;
  bookRow: number;
  timestamp: string;
  userResponse: string;
  isCorrect: boolean | null;
  type: QuestionType;
}
```

Use `isCorrect: null` for open-response self-assessment when correctness is not automatically determined. Add a dedicated Dexie table such as `questionAttempts` and introduce a new database schema version with an additive store migration; do not alter the existing version-1 schema in place. The attempt service should write only to that table.

## 5. User Workflows

### 5.1 Creating a Question

The existing creation path is the QUESTIONS sheet form within catalog detail. The form carries source information in the current `sourceDomain`, `sourceRowId`, and `sourceTerm` fields. The AI generator accepts source-entry context and saves generated content through the same domain-data service.

A future origin-card shortcut may open or prefill this existing form/generator. It should pass the source domain and row ID, plus book context and tags when available. A new catalog-card footer action or modal is not currently present and should be treated as a UI enhancement, not as an existing architectural entry point.

Question form fields should follow the current sheet contract: type, prompt, answer, options where applicable, source/context, difficulty, and authorized tags. Tag validation and sanitization continue to use `TaxonomyService` and the existing shared tag utilities.

### 5.2 General Learn Feed

`LearnFeedService` already loads local `questions` alongside other domain tables, maps them to generic Learn entries, applies its query filter, shuffles candidates, and selects a batch of up to 20 entries. This batch can contain multiple domains and is not guaranteed to contain 20 questions.

### 5.3 Dedicated Question Practice Feed (Planned)

A question-only practice view can reuse the Learn feed's local-first and random-selection patterns while querying only the QUESTIONS table. It should support:

- Filtering by book/catalog row.
- Filtering by authorized tags and searchable text.
- Random sampling of up to 20 matching questions (fewer when fewer than 20 match).
- Refreshing the sample when the book or filters change.
- Saving one local attempt after a learner submits or self-assesses.

The current router exposes `/catalog`, `/learn`, and `/catalog/:id`. Add a separate route only if the product requires a distinct practice screen; otherwise extend the Learn experience without presenting the mixed-domain batch as a question-only feed.

### 5.4 Answer Interaction

- `flashcard`: reveal the answer, then let the learner record a self-assessment.
- `multiple-choice`: render the configured options and evaluate the selected option against `isCorrect`.
- `true-false`: render the configured true/false choices and evaluate the selected answer.
- `open`: accept free text and allow self-assessment unless a deterministic evaluation contract is defined.

After submission, persist question ID, owning book row, timestamp, response, question type, and correctness (or unknown correctness for self-assessed responses) to the local attempt table. Do not mutate the question row as a side effect of answering.

## 6. Implementation Plan

1. Keep question content in the existing `domain-questions` model, components, and `DomainQuestionsService`.
2. Align `QuestionRecord` with the full persisted question row so fields used by feeds and answer rendering are typed consistently.
3. Implement a focused question-practice component/service under `features/domain/domain-questions` if a separate question-only feed is required. Reuse shared catalog and tag metadata rather than duplicating their loading logic.
4. Add the `QuestionAttempt` model, attempt service, and an additive Dexie schema version for the local-only table.
5. Add focused tests for question mapping/filtering/random batch selection and local attempt persistence. Verify that attempt writes never invoke the remote API.
6. Add a source-card shortcut only after choosing its host component and reuse the existing form or generator rather than duplicating question creation logic.

## 7. Acceptance Criteria

- Existing QUESTIONS sheet headers and question type values remain compatible with Google Sheets.
- Question create/edit/delete continues through `DomainDataService` and `DomainQuestionsService`.
- Existing mixed-domain Learn behavior remains distinguishable from a dedicated question-only batch.
- A practice batch contains no more than 20 matching questions and handles empty/small result sets.
- Every submitted answer creates a local attempt; no attempt data is included in remote sheet updates.
- Existing IndexedDB data remains readable after adding the attempt table.
- Open-response correctness is represented honestly as self-assessed or unknown unless an explicit evaluation rule is implemented.
