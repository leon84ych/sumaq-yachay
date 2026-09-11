# AI Integration Roadmap — sumaq-yachay

This document outlines the strategic AI integration roadmap for `sumaq-yachay`. It expands the application's offline-first learning model into an intelligent platform capable of automated content generation, dynamic diagram synthesis, semantic active recall evaluation, and privacy-preserving on-device tutoring.

---

## 📋 Architectural Principles & Key Decisions

1. **Dual-Entry Architecture:** AI execution is split between **Build-Time/Authoring** (Google Sheets + Google Apps Script) and **Runtime/Active Study** (Angular client + browser APIs).
2. **Offline-First Sovereignty:** The core study experience remains fully functional offline. AI capabilities act as progressive enhancements: cloud-backed when connected, and on-device (via WebLLM/Chrome Built-in AI) when offline.
3. **Structured Output Enforcement:** All AI prompts return strictly formatted JSON or raw domain markup (e.g., Mermaid.js code) to prevent parsing errors when updating IndexedDB or Google Sheets.
4. **Zero-Lock-in Strategy:** Runtime AI components accept user-provided API keys (Gemini / OpenAI API) stored locally in browser storage, avoiding centralized backend dependency.

---

## 🎯 Phase Sequence & Milestones

### Phase 1: Spreadsheet-Native AI Authoring Engine
**Objective:** Enable automated content generation, quiz distractor creation, and visual diagram generation directly within Google Sheets using Google Apps Script and the Gemini API.

* **Trade-Offs:** High authoring velocity and zero client-side overhead; requires an active internet connection during content creation.
* **Key Decisions:** Use Google Apps Script `UrlFetchApp` with Gemini 1.5 Flash to ensure low latency and free-tier compatibility.
* **Implementation Details:**
  * Add custom Apps Script functions (`=GENERATE_DEFINITIONS("Topic")`, `=TEXT_TO_MERMAID(cell)`).
  * Enforce strict prompt schemas to output plain JSON or raw Mermaid syntax without Markdown wrappers.
* **Tasks:**
  1. Store `GEMINI_API_KEY` securely in Apps Script `ScriptProperties`.
  2. Implement `generateMermaidDiagram(prompt)` to transform architectural descriptions into valid flowchart code.
  3. Implement `generateQuizDistractors(concept, definition)` to populate multiple-choice distractors automatically.
* **Milestone 1:** Users can populate entire sheet rows and dynamic flowcharts in seconds via Apps Script custom formulas.
* **Estimated Time:** 4 – 6 Hours

---

### Phase 2: Client-Side Semantic Recall & Dynamic Grader
**Objective:** Upgrade the Angular `FlashcardQuizView` from exact string matching or manual self-assessment to semantic evaluation.

* **Trade-Offs:** Delivers deeper learning feedback by eliminating the "illusion of competence"; introduces small latency (~1s) during answer evaluation.
* **Key Decisions:** Map AI semantic quality scores directly to the SM-2 algorithm grade scale (0 to 5) to drive spaced repetition scheduling automatically.
* **Implementation Details:**
  * Build `SemanticEvaluatorService` in Angular using `@angular/common/http` to send typed user responses to the Gemini API.
  * Evaluate typed answers against reference definitions and output a similarity score, missing key concepts, and SM-2 grade mapping.
* **Tasks:**
  1. Add an **AI Settings Panel** in Angular to store and validate the user's personal API key.
  2. Implement `SemanticEvaluatorService` to parse semantic comparison JSON payloads.
  3. Integrate the evaluator directly with the `calculateSM2` function to automate interval updates based on AI scoring.
* **Milestone 2:** Users receive immediate, conceptual feedback on typed flashcard answers with automatic SM-2 scheduling updates.
* **Estimated Time:** 6 – 8 Hours

---

### Phase 3: Dynamic Socratic Tutor & Mind Map Generator
**Objective:** Provide interactive conceptual deep-dives (Feynman technique) and on-demand hierarchy synthesis inside card views.

* **Trade-Offs:** Unlocks interactive problem-solving and conceptual exploration; increases UI complexity within existing learning cards.
* **Key Decisions:** Bound AI context strictly to the user's active IndexedDB study dataset to eliminate hallucinations.
* **Implementation Details:**
  * Add a Socratic chat drawer to `DefinitionsView` and `ConceptView`.
  * Send the card's `term`, `shortDefinition`, and `extendedExplanation` as system context to guide the conversation.
* **Tasks:**
  1. Build `SocraticTutorComponent` as a slide-out drawer in Angular.
  2. Prompt the AI to ask clarifying, step-by-step questions rather than providing direct answers.
  3. Create an automated mind-map generator that parses selected card groups into hierarchical tree JSON for `MindMapView`.
* **Milestone 3:** Users can engage in Socratic dialogue around difficult concepts directly within their study workspace.
* **Estimated Time:** 8 – 10 Hours

---

### Phase 4: On-Device & Offline AI (WebLLM / Chrome `window.ai`)
**Objective:** Achieve complete offline AI capability by executing small language models directly inside the browser using WebGPU and native APIs.

* **Trade-Offs:** Preserves 100% offline privacy with zero API costs; requires modern hardware (WebGPU support) and initial model download storage (~1–2 GB).
* **Key Decisions:** Use Chrome Built-in Prompt API (`window.ai`) as the primary target, falling back to `@mlc-ai/web-llm` for WebGPU-enabled browsers.
* **Implementation Details:**
  * Wrap client-side LLM calls behind an abstract `AiProvider` interface in Angular.
  * Cache quantized models in browser storage/IndexedDB via Service Workers.
* **Tasks:**
  1. Implement `ChromeWindowAiProvider` utilizing `window.ai.languageModel`.
  2. Implement `WebLlmProvider` using `@mlc-ai/web-llm` for quantized local inference.
  3. Build a local model management UI to display model load status, storage usage, and WebGPU hardware capability checks.
* **Milestone 4:** Full offline AI evaluation and Socratic tutoring running locally on the user's device without network requests.
* **Estimated Time:** 10 – 14 Hours

---

## ⏱️ Total Implementation Estimate (Single Developer)

| Phase | Description | Estimate |
| :--- | :--- | :--- |
| **Phase 1** | Spreadsheet-Native Apps Script AI Engine | 4 – 6 Hours |
| **Phase 2** | Client-Side Semantic Recall & SM-2 Integration | 6 – 8 Hours |
| **Phase 3** | Socratic Tutor & Contextual Mind Map Generator | 8 – 10 Hours |
| **Phase 4** | On-Device Offline AI (WebLLM / Chrome `window.ai`) | 10 – 14 Hours |
| **Total** | **Complete AI Integration** | **28 – 38 Hours** |

---

## 📊 Summary Feature & Integration Matrix

| Feature | Execution Layer | Offline Capability | Primary Target |
| :--- | :--- | :--- | :--- |
| **Content & Card Generator** | Google Apps Script | ❌ Online Only | Accelerating dataset creation |
| **Mermaid Syntax Synthesizer** | Google Apps Script / Angular | ❌ Online Only | Automating flowchart creation |
| **Semantic Answer Grader** | Angular Runtime | ❌ Online (Phase 2) / ✅ Offline (Phase 4) | Active recall accuracy verification |
| **Socratic Learning Tutor** | Angular Runtime | ❌ Online (Phase 3) / ✅ Offline (Phase 4) | Feynman technique study sessions |
| **On-Device LLM Pipeline** | Browser WebGPU / `window.ai` | ✅ 100% Offline | Zero-cost, privacy-focused inference |
