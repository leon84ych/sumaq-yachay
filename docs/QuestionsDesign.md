# Questions Domain and Practice Feed

## 1. Purpose and Scope

This document defines the QUESTIONS domain and the implemented question-practice workflow in Sumaq Yachay.

The feature has two distinct data boundaries:

- Question content is domain data synchronized with the book's Google Sheets data through the existing catalog-detail write path.
- Learner attempts are private client-side activity and must remain in IndexedDB. They must never be included in a Google Sheets write.

The general Learn feed includes QUESTIONS rows as a mixed-domain feed. The dedicated `/quiz` route provides a separate question-only study experience and records private attempts locally.

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
│   ├── domain-question-row.model.ts
│   └── question-attempt.model.ts
├── practice/
│   └── question-practice.component.ts|html|css
└── services/
  ├── domain-questions.service.ts
  ├── question-practice.service.ts
  └── question-attempt.service.ts

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

`QuestionRecord` extends the full `QuestionRow` shape with the owning catalog row and optional book metadata. Keep it aligned with QUESTIONS rows; do not maintain a narrower duplicate field definition.

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

The local model lives beside the domain model:

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

Use `isCorrect: null` for open responses, which are not automatically graded. The `questionAttempts` table was added in Dexie version 2 as an additive migration; version 1 stores, including `questions`, remain intact. `QuestionAttemptService` writes only to that table and has no remote API dependency.

## 5. User Workflows

### 5.1 Creating a Question

The existing creation path is the QUESTIONS sheet form within catalog detail. The form carries source information in the current `sourceDomain`, `sourceRowId`, and `sourceTerm` fields. The AI generator accepts source-entry context and saves generated content through the same domain-data service.

Concept cards already expose the question generator with source domain, row ID, book context, and tags. It saves through the existing QUESTIONS sheet path rather than creating a separate question record flow.

Question form fields should follow the current sheet contract: type, prompt, answer, options where applicable, source/context, difficulty, and authorized tags. Tag validation and sanitization continue to use `TaxonomyService` and the existing shared tag utilities.

### 5.2 General Learn Feed

`LearnFeedService` already loads local `questions` alongside other domain tables, maps them to generic Learn entries, applies its query filter, shuffles candidates, and selects a batch of up to 20 entries. This batch can contain multiple domains and is not guaranteed to contain 20 questions.

### 5.3 Dedicated Question Practice Feed

The `/quiz` route is linked from the global navigation. It reuses the app's local-first catalog data and queries only the QUESTIONS table. Its single search field matches book/catalog title, author, source domain, question and answer text, tags, question type, and difficulty. With an empty query, it samples up to 10 random questions; a non-empty query filters before the random sample. It supports:

- Searching book/catalog titles, authors, domains, tags, and question content from one field, using the same debounced search interaction as Learn.
- Random sampling of up to 10 matching questions (fewer when fewer than 10 match).
- Refreshing the sample as the search query changes.
- Saving one local attempt after a learner submits or self-assesses.

The mixed-domain Learn feed remains separate and continues to include question entries.

### 5.4 Answer Interaction

- `flashcard`: reveal the answer, then let the learner record a correct/needs-review self-assessment.
- `multiple-choice`: render the configured options and evaluate the selected option against `isCorrect`.
- `true-false`: render configured choices and evaluate the selected answer; conventional true/false choices are supported when the answer field is explicit.
- `open`: accept free text and store it with `isCorrect: null` because no deterministic evaluation contract exists.

After submission, persist question ID, owning book row, timestamp, response, question type, and correctness (or unknown correctness for self-assessed responses) to the local attempt table. Do not mutate the question row as a side effect of answering.

## 6. Implementation Status

1. Question content remains in `domain-questions` and saves through `DomainDataService` and `DomainQuestionsService`.
2. The practice service searches book, author, domain, tags, and question text, shuffles matching questions, and caps each sample at 10.
3. Answer attempts are persisted only to the additive Dexie v2 `questionAttempts` table; the version-1 question store and rows remain available.
4. Focused tests cover question filtering and batch limits, attempt storage, and the local database schema. External Apps Script behavior remains governed by the unchanged QUESTIONS sheet contract.
5. The concept-card question generator continues to reuse `QuestionGeneratorComponent`; no second question-creation path is introduced by the practice view.

## 7. Acceptance Criteria

- Existing QUESTIONS sheet headers and question type values remain compatible with Google Sheets.
- Question create/edit/delete continues through `DomainDataService` and `DomainQuestionsService`.
- Existing mixed-domain Learn behavior remains distinguishable from a dedicated question-only batch.
- A practice batch contains no more than 10 matching questions and handles empty/small result sets.
- Every submitted answer creates a local attempt; no attempt data is included in remote sheet updates.
- Existing IndexedDB data remains readable after adding the attempt table.
- Open-response correctness is represented honestly as self-assessed or unknown unless an explicit evaluation rule is implemented.
