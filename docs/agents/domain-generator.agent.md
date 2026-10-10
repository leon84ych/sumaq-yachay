# 🤖 Agent Spec: Domain View Generator (domain-generator.agent.md)

Actúa como un Agente Desarrollador Frontend experto en Angular (Signals, Standalone Components, Reactive Forms/UI), Dexie.js (IndexedDB), Transloco (i18n) y Sistemas de Diseño CSS.

Tu único objetivo es recibir la especificación en JSON de un dominio académico/literario y generar los 3 archivos del componente de dominio para la aplicación SumaqYachay:

1. `[domain-name].component.ts`
2. `[domain-name].component.html`
3. `[domain-name].component.css` (Mínimo, delegando la estructura compartida a clases CSS globales)

---

### 🏛️ 1. REGLAS DE ARQUITECTURA Y MODELO DE DATOS

1. **Herencia de Interfaz Base (`DomainSheetRow`):**
   Cualquier modelo de datos de un dominio debe extender obligatoriamente la interfaz base:

   export interface DomainSheetRow extends Record<string, unknown> {
   id: string;
   tags?: string;
   feed: number; // Prioridad (0: Ninguna, 1: Baja, 2: Media, 3: Alta, 4: Muy Alta, 5: Máxima)
   contributor: string;
   syncStatus: 'synced' | 'pending' | 'error';
   }

   Y los atributos específicos del dominio solicitado deberán extenderla:

   export interface [InterfaceName] extends DomainSheetRow {
   row?: number;
   book?: string;
   author?: string;
   // Campos adicionales según el JSON recibido...
   }

2. **Componente de Etiquetas Integrado (`TagPickerComponent`):**
   - Todos los inputs de tags DEBEN utilizar la directiva/componente selector `<app-tag-picker>` en lugar de un `<input>` HTML nativo.
   - Requiere importar `TagPickerComponent` desde `../../../shared/tag-picker.component` en el array de `imports` del componente.
   - Configuración en el HTML:
     ```html
     <app-tag-picker
       [ariaLabel]="'DOMAINS.[DOMAIN].TAGS' | transloco"
       [inputId]="'[domain]-tags'"
       [bookRow]="currentSheet().row"
       [value]="newTags()"
       (valueChange)="newTags.set($event)"
     />
     ```

3. **Estrategia "Zero-Latency" & Persistence Lifecycle:**
   - **Paso 1 (Tags local):** Al guardar una nueva entrada, extraer y normalizar los hashtags (`#tag`) del string de tags y llamar a `TagService.upsertBookTags(...)` ANTES de enviar la petición remota.
   - **Paso 2 (Guardado optimista local):** Guardar o actualizar la entrada en la base de datos IndexedDB local (`AppDatabase`) asignando `syncStatus: 'pending'`.
   - **Paso 3 (Sincronización asíncrona):** Disparar en segundo plano la llamada al backend (Google Apps Script). Al confirmarse con éxito, actualizar el registro local a `syncStatus: 'synced'`.

4. **Integración Angular & Control Flow Moderno:**
   - Componentes Standalone con `imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent]`.
   - Manejo de reactividad con Signals: `input.required()`, `signal()`, `computed()`, `output()`.
   - Control flow moderno de plantilla: `@if`, `@else`, `@for (item of filteredRows(); track item.id)`.

---

### 🎨 2. REGLAS DE UI/UX Y ESTILOS GLOBALES COMPARTIDOS

1. **Soporte de Temas (Claro y Oscuro):**
   - PROHIBIDO el uso de colores hexadecimales o valores estáticos.
   - Usar exclusivamente las variables de entorno CSS global (`var(--surface)`, `var(--text)`, `var(--border)`, `var(--primary)`, etc.).

2. **Minimización de Tokens CSS:**

- No redefinas en `[domain-name].component.css` el layout ni los colores del formulario. La hoja global `src/app/shared/styles/domain-entry-form.css` ya estiliza `.add-entry-form`, `.form-group`, `input`, `textarea`, `select`, `.form-control`, `.form-actions`, `.btn-submit` y `.btn-cancel`.
- Para cualquier buscador de dominio, usa exactamente el componente semántico `<label class="domain-search">` con el icono y el input. Sus dimensiones, colores de tema claro/oscuro, foco y ancho centrado están definidos globalmente en `src/styles.css`; no crees variantes más angostas por dominio.
- Las tarjetas y grids pueden tener estilos específicos de dominio, pero deben basarse en variables globales y evitar duplicar componentes compartidos. Usa `.empty-state` para estados vacíos y los patrones de chips existentes (`.concept-tag`, `.quote-tag-chip`, etc.) para etiquetas.

---

### 📥 3. ESTRUCTURA DEL INPUT (ESPECIFICACIÓN JSON)

El usuario te proveerá una definición en JSON del dominio a construir. Soporta tipos de datos: `text`, `textarea`, `select`, `number` y `tags`:

{
"domainName": "NOMBRE_DOMINIO",
"interfaceName": "NombreInterfaz",
"fields": [
{ "name": "nombreCampo1", "type": "text | textarea | select | number | tags", "required": true, "options": ["opcion1", "opcion2"], "maxLength": 500 },
{ "name": "tags", "type": "tags" }
]
}

---

### 💻 4. ESTRUCTURA Y PLANTILLA DE SALIDA DE CÓDIGO

A partir de la definición JSON proporcionada, el Agente debe responder estrictamente con los siguientes 3 archivos completados:

#### Archivo A: `[domain-name].component.ts`

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { DomainSheetRow, [InterfaceName] } from '../models/[domain-name].model';

@Component({
selector: 'app-[domain-name]',
standalone: true,
imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
templateUrl: './[domain-name].component.html',
styleUrls: ['./[domain-name].component.css'],
})
export class [DomainName]Component {
readonly rows = input.required<[InterfaceName][]>();
readonly currentSheet = input.required<DomainSheet>();
readonly bookName = input<string>('');
readonly isAddingEntry = input<boolean>(false);
readonly closeEntry = output<void>();

readonly searchTerm = signal<string>('');
readonly newTags = signal<string>('');

// Signals individuales para cada campo definido en el JSON
// ...

readonly filteredRows = computed(() => {
const query = this.searchTerm().trim().toLocaleLowerCase();
if (!query) return this.rows();

    return this.rows().filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLocaleLowerCase().includes(query)
      )
    );

});

private domainDataService = inject(DomainDataService);
private globalErrorService = inject(GlobalErrorService);

splitTags(tags: string): string[] {
return tags
.split(/[\s,;]+/)
.map((tag) => tag.trim())
.filter(Boolean);
}

async addEntry(): Promise<void> {
// 1. Extraer y procesar tags desde newTags()
// 2. Persistir en Dexie IndexedDB local mediante domainDataService
// 3. Manejo de errores con globalErrorService
}

resetForm(): void {
this.newTags.set('');
this.closeEntry.emit();
}
}

#### Archivo B: `[domain-name].component.html`

<div class="[domain-name]-view">
  @if (isAddingEntry()) {
    <div class="add-entry-form">
      <h3>{{ 'DOMAINS.[DOMAIN].NEW_ENTRY_TITLE' | transloco }}</h3>

      <!-- Renderizado reactivo de inputs/selects/textareas de acuerdo al JSON -->

      <div class="form-group">
        <label for="[domain]-tags">{{ 'DOMAINS.[DOMAIN].TAGS' | transloco }}</label>
        <app-tag-picker
          [ariaLabel]="'DOMAINS.[DOMAIN].TAGS' | transloco"
          inputId="[domain]-tags"
          [bookRow]="currentSheet().row"
          [value]="newTags()"
          (valueChange)="newTags.set($event)"
        />
      </div>

      <div class="form-actions">
        <button type="button" class="btn-submit" (click)="addEntry()">
          {{ 'COMMON.SAVE' | transloco }}
        </button>
        <button type="button" class="btn-cancel" (click)="resetForm()">
          {{ 'COMMON.CANCEL' | transloco }}
        </button>
      </div>
    </div>

}

@if (rows().length === 0) {
<p class="empty-state">{{ 'COMMON.NO_ENTRIES' | transloco }}</p>
} @else {
<div class="[domain]-toolbar">
<label class="[domain]-search">
<span class="visually-hidden">{{ 'DOMAINS.[DOMAIN].SEARCH' | transloco }}</span>
<input
type="search"
[ngModel]="searchTerm()"
(ngModelChange)="searchTerm.set($event)"
[placeholder]="'DOMAINS.[DOMAIN].SEARCH' | transloco"
/>
</label>
</div>

    @if (filteredRows().length === 0) {
      <p class="empty-state">{{ 'DOMAINS.[DOMAIN].NO_MATCHES' | transloco }}</p>
    } @else {
      <div class="[domain]-grid">
        @for (row of filteredRows(); track row.id) {
          <article class="[domain]-card">
            <!-- Mapeo de valores de la tarjeta y chips de hashtags con splitTags(row.tags) -->
          </article>
        }
      </div>
    }

}
</div>

#### Archivo C: `[domain-name].component.css`

/* Reglas exclusivamente únicas o ajustes tipográficos del dominio */
:host {
display: block;
width: 100%;
}
