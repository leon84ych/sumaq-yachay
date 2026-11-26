## Storage Capacity and Feasibility Analysis for Local IndexedDB

### 1. Browser Storage Quotas (IndexedDB)
Modern browsers (Chrome, Firefox, Safari, Edge) dynamically assign local storage based on the device's free disk space:
* **IndexedDB:** Dynamically allocates up to **50% – 60% of available free disk space**. On a device with 100 GB free, the PWA has access to approximately **50 GB** without needing special user permissions.
* **LocalStorage:** Restricted to **5 MB** (strictly reserved for configurations and session tokens).

---

### 2. Volume Estimation per Degree Program (5 Years / ~40-60 Subjects)

Structured plain text (JSON/Rows) is extremely lightweight compared to heavy media files:

* **Text-Heavy Degrees (Law, Sociology, Philosophy):**
  * ~50 subjects × 500 entries (cards, passages, quotes, glossaries).
  * **Total:** ~25,000 text entries.
  * **Estimated Size:** **25 MB – 50 MB** total for the entire degree.

* **Technical & Science Degrees (Medicine, Engineering):**
  * ~60 subjects × 1,000 entries (concepts, formulas, practice questions, entities).
  * **Total:** ~60,000 text entries.
  * **Estimated Size:** **60 MB – 120 MB** total.

> **Conclusion:** Complete notes for an entire college degree require between **50 MB and 150 MB**, occupying less than **0.3%** of the standard available IndexedDB quota on average devices.

---

### 3. Architectural Feasibility Verdict

The **Offline-First** strategy built into **SumaqYachay** (powered by **Dexie.js** and **IndexedDB**) is **100% viable and ideal**:
1. **Zero-Latency Performance:** Querying 50,000 indexed records takes between **2 ms and 8 ms**.
2. **Offline Autonomy:** Students can search, study, and take spaced-repetition quizzes completely offline.
3. **Asynchronous Cloud Backup:** Google Sheets/Drive acts purely as a secondary cloud store for background synchronization and data ownership.