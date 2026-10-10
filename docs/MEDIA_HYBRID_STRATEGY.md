# Media & Diagramming Specification: Hybrid Strategy — sumaq-yachay

This specification documents the technical architecture, Angular component implementation, dependency setup, and database schemas for integrating visual diagrams and static images into `sumaq-yachay`.

To balance rendering performance, storage efficiency, and offline reliability, `sumaq-yachay` uses a **Hybrid Media Strategy**:
1. **Declarative Text-Based Diagrams (Mermaid.js):** Rendered on the fly for dynamic architecture, process flows, and conceptual trees.
2. **Managed Image Assets (URLs / Drive File IDs):** Used for static figures, book screenshots, and real-world illustrations.

---

## 🏗️ Architecture & Technical Approach

```
                                  +-----------------------+
                                  |  Google Sheets Data   |
                                  +-----------+-----------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
                        v                                           v
            [ `diagramCode` Field ]                         [ `imageUrl` Field ]
         (Declarative Mermaid Markup)                    (HTTP URL / Drive File ID)
                        |                                           |
                        v                                           v
             +--------------------+                        +------------------+
             | Mermaid.js Engine  |                        |  Angular Image   |
             | (Client-side SVG)  |                        |  Container /     |
             +---------+----------+                        |  IndexedDB Blob  |
                       |                                   +--------+---------+
                       v                                            v
            +-----------------------------------------------------------------+
            |                    Angular View Components                      |
            |        (`MermaidViewerComponent`, `ImageContainerComponent`)    |
            +-----------------------------------------------------------------+
```

---

## 🛠️ Required Libraries & External Resources

* **Mermaid.js (`mermaid`):** Core JS library for parsing text markup into responsive SVG diagrams.
  ```bash
  npm install mermaid
  ```
* **DomSanitizer (Angular Core):** Native Angular utility used to securely render generated SVGs and bypass cross-site scripting (XSS) warnings.
* **IndexedDB Storage Engine (Dexie.js):** Used to store text markup and cache static image URLs locally.

---

## 📊 Database & Spreadsheet Schema Extensions

### Extended `DefinitionsView` & `TimelineView` Schema (Static Images)
Adds an optional `imageUrl` column to support book figures, charts, and diagrams.

```typescript
export interface ExtendedDefinitionEntity {
  id?: number;
  sheetId: string;
  term: string;
  category: string;
  shortDefinition: string;
  extendedExplanation?: string;
  imageUrl?: string; // Direct HTTP URL or Google Drive View Link
  sourceBook: string;
  updatedAt: string;
}
```

### Extended `RelationsView` & `ProcessSequenceView` Schema (Mermaid Markup)
Adds an optional `diagramCode` column to support dynamic text diagrams.

```typescript
export interface ExtendedRelationEntity {
  id?: number;
  sheetId: string;
  sourceNode: string;
  relationship: string;
  targetNode: string;
  diagramCode?: string; // e.g., "graph TD; A-->B;"
  sourceBook: string;
  updatedAt: string;
}
```

---

## 🧩 Angular Component Implementations

### 1. Dynamic Mermaid Diagram Component (`MermaidViewerComponent`)

This component takes raw Mermaid markup strings from IndexedDB/Sheets, initializes the renderer, and outputs clean SVG diagrams directly inside Angular templates.

```typescript
import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import mermaid from 'mermaid';

@Component({
  selector: 'app-mermaid-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diagram-wrapper">
      @if (svgContent) {
        <div [innerHTML]="svgContent" class="mermaid-container"></div>
      } @else {
        <div class="diagram-placeholder">Rendering diagram...</div>
      }
    </div>
  `,
  styles: [`
    .diagram-wrapper {
      width: 100%;
      overflow-x: auto;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 8px;
    }
    .mermaid-container {
      display: flex;
      justify-content: center;
    }
  `]
})
export class MermaidViewerComponent implements OnChanges {
  @Input({ required: true }) code!: string;
  @Input() elementId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

  private sanitizer = inject(DomSanitizer);
  svgContent: SafeHtml | null = null;

  constructor() {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['code'] && this.code) {
      this.renderDiagram();
    }
  }

  private async renderDiagram(): Promise<void> {
    try {
      const { svg } = await mermaid.render(this.elementId, this.code);
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svg);
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error);
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
        `<div class="error-box">Invalid diagram syntax</div>`
      );
    }
  }
}
```

---

### 2. Static Image Viewer Component (`ImageContainerComponent`)

Handles loading external image URLs and automatically formats Google Drive shareable links into direct rendering endpoints.

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (processedUrl) {
      <div class="image-box">
        <img [src]="processedUrl" [alt]="altText" loading="lazy" (error)="onImageError()" />
        @if (hasError) {
          <span class="fallback-label">Image failed to load (offline or broken URL)</span>
        }
      </div>
    }
  `,
  styles: [`
    .image-box {
      margin: 0.5rem 0;
      text-align: center;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .fallback-label {
      display: block;
      font-size: 0.8rem;
      color: #777;
      margin-top: 0.25rem;
    }
  `]
})
export class ImageContainerComponent {
  @Input({ required: true }) src!: string;
  @Input() altText = 'Book figure';
  hasError = false;

  get processedUrl(): string {
    if (!this.src) return '';
    // Automatically convert Google Drive view links to direct image endpoints
    if (this.src.includes('drive.google.com/file/d/')) {
      const fileId = this.src.split('/file/d/')[1].split('/')[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return this.src;
  }

  onImageError(): void {
    this.hasError = true;
  }
}
```

---

## 📝 Example Google Sheet Column Data

### 1. `diagramCode` (For `RelationsView` or `ProcessSequenceView`)
```text
graph TD
    A[Client App] -->|HTTP GET| B(Apps Script)
    B -->|Read Rows| C[(Google Sheet)]
    B -->|JSON Payload| A
    A -->|Persist| D[(IndexedDB)]
```

### 2. `imageUrl` (For `DefinitionsView` or `TimelineView`)
```text
https://drive.google.com/file/d/1A2b3C4d5E6f7G8h9I0j/view?usp=sharing
```

---

## 🚀 Implementation Checklist

- [ ] Install `mermaid` dependency in the Angular project (`npm install mermaid`).
- [ ] Create `MermaidViewerComponent` and test rendering a basic flowchart markup block.
- [ ] Create `ImageContainerComponent` with Google Drive URL conversion logic.
- [ ] Add `diagramCode` and `imageUrl` optional fields to Dexie.js database schema tables.
- [ ] Update `DefinitionsView` and `ProcessSequenceView` card templates to display diagrams/images conditionally when data is present.
