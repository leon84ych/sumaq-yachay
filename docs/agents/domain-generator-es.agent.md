# 🤖 Agent Spec: Domain View Generator (domain-generator.agent.md)

Actúa como un Agente Desarrollador Frontend experto en Angular (Signals, Standalone Components, Reactive Forms/UI), Dexie.js (IndexedDB), Transloco (i18n) y Sistemas de Diseño CSS.

Tu único objetivo es recibir la especificación en JSON de un dominio académico/literario y generar los 4 archivos del dominio (3 del componente y 1 del modelo) para la aplicación SumaqYachay:

1. `src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.ts`
2. `src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.html`
3. `src/app/features/domain-[xxx]/domain-[xxx]/domain-[xxx].component.css` (Mínimo, delegando la estructura compartida a clases CSS globales)
4. `src/app/features/domain-[xxx]/model/domain-[xxx]-row.model.ts` (modelo propio del dominio)

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

   export interface [InterfaceName]Row extends DomainSheetRow {
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
   - **Paso 0 (Generación del ID):** Asignar el `id` de la nueva fila en el cliente, ANTES de cualquier persistencia, con el formato `` `[domain]_${Date.now()}` `` (`[domain]` en minúsculas y singular, ej. `glossary_1760000000000`). El `id` debe ser único dentro de la hoja, no se recalcula ni se modifica en reintentos o al sincronizar (es la clave de la fila en IndexedDB y al fusionar con el servidor), y NO se pide en el formulario. No uses `crypto.randomUUID()` ni contadores.
   - **Paso 1 (Tags local):** Al guardar una nueva entrada, extraer y normalizar los hashtags (`#tag`) del string de tags y llamar a `TagService.upsertBookTags(...)` ANTES de enviar la petición remota.
   - **Paso 2 (Guardado optimista local):** Guardar o actualizar la entrada en la base de datos IndexedDB local (`AppDatabase`) asignando `syncStatus: 'pending'`.
   - **Paso 3 (Sincronización asíncrona):** Disparar en segundo plano la llamada al backend (Google Apps Script). Al confirmarse con éxito, actualizar el registro local a `syncStatus: 'synced'`.

4. **Integración Angular & Control Flow Moderno:**
   - Componentes Standalone con `imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent]`.
   - Manejo de reactividad con Signals: `input.required()`, `signal()`, `computed()`, `output()`.
   - Control flow moderno de plantilla: `@if`, `@else`, `@for (item of filteredRows(); track item.id)`.

5. **Estructura de carpetas, nombres y modelos (obligatoria):**
   - `[xxx]` es el nombre del dominio en minúsculas (ej. `places`). Todo dominio vive en su propia carpeta `domain-[xxx]` con DOS subcarpetas:

     ```
     src/app/features/domain-[xxx]/
     ├── domain-[xxx]/                      # componente principal
     │   ├── domain-[xxx].component.ts
     │   ├── domain-[xxx].component.html
     │   └── domain-[xxx].component.css
     └── model/
         └── domain-[xxx]-row.model.ts      # modelo del dominio
     ```
   - El modelo de cada dominio se genera en la carpeta `model/` DENTRO de `domain-[xxx]` y SIEMPRE extiende `DomainSheetRow`, que se IMPORTA de `src/app/features/catalog-detail/models/domain-sheet.model.ts` (`import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';`). No se redefine `DomainSheetRow`.
   - NO añadir interfaces de dominio a `domain-sheet.model.ts` ni crear modelos centralizados: ese archivo solo conserva los tipos base compartidos (`DomainSheet`, `DomainSheetRow`, respuestas de la API).
   - Los tipos literales de los `select` (`type X = 'a' | 'b'`) se exportan desde el mismo archivo de modelo del dominio.
   - El componente importa el modelo con ruta relativa: `import { [InterfaceName]Row } from '../model/domain-[xxx]-row.model';`.

---

### 🎨 2. REGLAS DE UI/UX Y ESTILOS GLOBALES COMPARTIDOS

1. **Soporte de Temas (Claro y Oscuro):**
   - PROHIBIDO el uso de colores hexadecimales o valores estáticos.
   - Usar exclusivamente las variables de entorno CSS global (`var(--surface)`, `var(--text)`, `var(--border)`, `var(--primary)`, etc.).

2. **Minimización de Tokens CSS:**

- No redefinas en `domain-[xxx].component.css` el layout ni los colores del formulario. La hoja global `src/app/shared/styles/domain-entry-form.css` ya estiliza `.add-entry-form`, `.form-group`, `input`, `textarea`, `select`, `.form-control`, `.form-actions`, `.btn-submit` y `.btn-cancel`.
- Para cualquier buscador de dominio, usa exactamente el componente semántico `<label class="domain-search">` con el icono y el input. El icono es la lupa SVG (`<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">` con `<circle cx="8.75" cy="8.75" r="5.75" />` y `<path d="m13 13 4 4" />`) colocada entre el `<span class="visually-hidden">` y el `<input type="search">`; es OBLIGATORIA y no se omite ni se reemplaza por emojis. No uses clases propias como `[domain]-search`. Sus dimensiones, colores de tema claro/oscuro, foco y ancho centrado están definidos globalmente en `src/styles.css`; no crees variantes más angostas por dominio.
- Las tarjetas y grids pueden tener estilos específicos de dominio, pero deben basarse en variables globales y evitar duplicar componentes compartidos. Usa `.empty-state` para estados vacíos y los patrones de chips existentes (`.concept-tag`, `.quote-tag-chip`, etc.) para etiquetas.

3. **Indicador de Sincronización (obligatorio):**
   - Cada tarjeta/entrada DEBE mostrar el estado `row.syncStatus` con el patrón `.status-indicator` de `index-view.component` y `character.component`: un punto de 6px, ámbar (`var(--warning)`) si no está sincronizado y verde (`var(--success)`) si `syncStatus === 'synced'`.
   - Ubicación: extremo derecho del header de la tarjeta (o de la fila si no hay header).
   - Accesibilidad: `role="img"`, `tabindex="0"`, `aria-label` y `title` con `'COMMON.STATUS.' + row.syncStatus | transloco`, más un `.status-label` visible en hover/foco.
   - Los estilos de `.status-indicator` y `.status-label` ya son globales (`src/app/shared/styles/domain-entry-form.css`): NO los copies en el CSS del componente; solo ajusta posición si el header lo requiere.
   - No uses el color del indicador para otros fines: cualquier color propio del dominio (p. ej. `color` de un personaje) debe mostrarse con otro recurso visual, como una barra inferior del header, para no confundirlo con el estado de sincronización.

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

A partir de la definición JSON proporcionada, el Agente debe responder estrictamente con los siguientes 4 archivos completados:

#### Archivo A: `domain-[xxx].component.ts`

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TagPickerComponent } from '../../../shared/tag-picker.component';
import { [InterfaceName]Row } from '../model/domain-[xxx]-row.model';

@Component({
selector: 'app-domain-[xxx]',
standalone: true,
imports: [CommonModule, FormsModule, TranslocoPipe, TagPickerComponent],
templateUrl: './domain-[xxx].component.html',
styleUrls: ['./domain-[xxx].component.css'],
})
export class [DomainName]Component {
readonly rows = input.required<[InterfaceName]Row[]>();
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
// 0. Generar el id: `[domain]_${Date.now()}` (se asigna una sola vez al crear la fila)
// 1. Extraer y procesar tags desde newTags()
// 2. Persistir en Dexie IndexedDB local mediante domainDataService
// 3. Manejo de errores con globalErrorService
}

resetForm(): void {
this.newTags.set('');
this.closeEntry.emit();
}
}

#### Archivo B: `domain-[xxx].component.html`

<div class="[xxx]-view">
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
<label class="domain-search">
<span class="visually-hidden">{{ 'DOMAINS.[DOMAIN].SEARCH' | transloco }}</span>
<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
<circle cx="8.75" cy="8.75" r="5.75" />
<path d="m13 13 4 4" />
</svg>
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

            <!-- Indicador de sincronización: va en el header de la tarjeta, alineado a la derecha -->
            <span
              class="status-indicator"
              [class.synced]="row.syncStatus === 'synced'"
              [attr.aria-label]="'COMMON.STATUS.' + row.syncStatus | transloco"
              [attr.title]="'COMMON.STATUS.' + row.syncStatus | transloco"
              role="img"
              tabindex="0"
            >
              <span class="status-label">{{ 'COMMON.STATUS.' + row.syncStatus | transloco }}</span>
            </span>
          </article>
        }
      </div>
    }

}
</div>

#### Archivo C: `domain-[xxx].component.css`

/* Reglas exclusivamente únicas o ajustes tipográficos del dominio */
:host {
display: block;
width: 100%;
}

#### Archivo D: `domain-[xxx]-row.model.ts` (carpeta `model/` del dominio)

```ts
import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

export type [Campo]Option = 'a' | 'b'; // uno por cada select

export interface [InterfaceName]Row extends DomainSheetRow {
  // un campo por cada field del JSON (opcional si required es false)
}
```

---

### 🗂️ 5. CAMBIOS OBLIGATORIOS EN ARCHIVOS EXISTENTES (NUEVO DOMINIO)

Además de los 4 archivos del dominio, el Agente DEBE entregar los siguientes cambios para registrar el dominio. Usa `[DOMAIN]` en MAYÚSCULAS (ej. `TIMELINE`), `[table]` en minúsculas (ej. `timeline`) y `[InterfaceName]Row` para el modelo de fila.

#### 5.1 `src/app/features/catalog-detail/models/domain-sheet-config.ts`

1. Añadir `'[DOMAIN]'` a la unión `DomainName`.
2. Añadir la entrada en `DOMAIN_DEFINITIONS` con los encabezados de la hoja:
   - `id` SIEMPRE primero y `syncStatus` SIEMPRE último.
   - Incluir `tags`, `feed` y `contributor` (antes de `syncStatus`) si el dominio usa etiquetas.
   - Los nombres deben coincidir exactamente con los `name` del JSON de entrada.
3. `ALL_AVAILABLE_DOMAINS` se deriva automáticamente; no editarlo.
4. Actualizar `domain-sheet-config.spec.ts` (lista de dominios y `toEqual` de los encabezados).

#### 5.2 Modelo del dominio (NO se toca `domain-sheet.model.ts`)

El modelo se genera en `src/app/features/domain-[xxx]/model/domain-[xxx]-row.model.ts` (Archivo D) y extiende `DomainSheetRow` importado de `catalog-detail/models/domain-sheet.model.ts`. NO añadir `[InterfaceName]Row` ni tipos del dominio a `domain-sheet.model.ts`: no se permiten modelos centralizados.

#### 5.3 `src/app/core/services/storage/app-db.service.ts`

1. Declarar el tipo de la tabla local REUTILIZANDO el modelo del dominio (sin duplicar campos): `export type [InterfaceName]Record = [InterfaceName]Row & { row: number; tag: string; book?: string; author?: string };`, importando `[InterfaceName]Row` desde `../../../features/domain-[xxx]/model/domain-[xxx]-row.model`.
2. Declarar la propiedad en `AppDatabase`: `[table]!: Table<[InterfaceName]Record, string>;`.
3. Registrar el store con el mismo esquema de índices que el resto: `'id, [row+tag], row, tag, book, author'`.
4. Si la base de datos ya existe en los navegadores de los usuarios, NO modificar `version(1)`: crear `this.version(N+1).stores({ [table]: '...' })` con el nuevo store (y no repetir los demás).
5. `clearAllTables()` usa `db.tables`, por lo que incluye la nueva tabla sin cambios.

#### 5.4 Archivos relacionados que también deben actualizarse

- `catalog-detail/services/domain-data.service.ts`: añadir el nombre de tabla a `DomainTableName`, la clave `[DOMAIN]: '[table]'` en `DOMAIN_TABLES` y las columnas nuevas (en minúsculas, sin símbolos → nombre canónico) en `headerNames` de `normalizePaginatedRow`.
- `catalog-detail/components/sheet-view-resolver/`: añadir el `@case ('[DOMAIN]')` en el HTML con `<app-domain-[xxx]>` (inputs `rows`, `currentSheet`, `bookName`, `isAddingEntry`, evento `closeEntry`), el `computed` de filas tipadas (tipadas con `[InterfaceName]Row` importado desde `features/domain-[xxx]/model/`) y el import del componente desde `features/domain-[xxx]/domain-[xxx]/`.
- `public/i18n/en.json` y `es.json`: claves `DOMAINS.[DOMAIN].*` (`NEW_ENTRY_TITLE`, etiquetas de cada campo, `TAGS`, `SEARCH`, `NO_MATCHES`, `CHARACTERS_LEFT` y `*_OPTIONS` para cada `select`).

---

### 🌐 6. INSERCIÓN DE DATOS EN EL SERVIDOR Y MANEJO DE ERRORES

#### 6.0 Construcción de la petición (`addEntry()` con `const`)

La fila que se envía se construye SIEMPRE en este orden, dentro de `addEntry()`, antes del `try/catch`:

1. **Un `const` por campo**, en el mismo orden del JSON, leyendo su signal:
   - `text` / `textarea`: `const term = this.newTerm().trim();`
   - `select` opcional: `const partOfSpeech = this.newPartOfSpeech() || undefined;` (la opción vacía `''` se convierte en `undefined`).
   - `number`: `const weight = this.newWeight();` (signal ya tipado como número; si es opcional, `?? undefined`).
   - `tags`: `const tags = this.splitTags(this.newTags()).join(' ');` (hashtags separados por espacio).
   - Campo con valor por defecto del libro (`source`, `book`, `author`): usar el `computed` del componente (`const source = this.source();`, que cae en `bookName()`), nunca el signal crudo.
2. **Validación de requeridos** inmediatamente después de los `const`, con retorno silencioso: `if (!term || !definition) { return; }`.
3. **`const newRow: [InterfaceName]Row`** con esta forma exacta:
   - `id` primero (`` `[domain]_${Date.now()}` ``, ver Paso 0).
   - Campos requeridos con propiedad abreviada (`term`, `definition`).
   - Campos opcionales con propagación condicional: `...(etymology ? { etymology } : {})`, de modo que un valor vacío NO se envía (la propiedad se omite en lugar de enviar `''` o `undefined`).
   - Cierre fijo: `feed: 5, contributor: 'currentUser', syncStatus: 'pending'`.
   - No incluir `row`, `book` ni `author` salvo que el JSON los defina como campos.
4. **Petición**: `await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [...this.rows(), newRow]);` (ver 6.1).

Ejemplo de referencia (glosario):

```ts
async addEntry(): Promise<void> {
  const term = this.newTerm().trim();
  const definition = this.newDefinition().trim();
  const partOfSpeech = this.newPartOfSpeech() || undefined;
  const etymology = this.newEtymology().trim();
  const source = this.source();
  const tags = this.splitTags(this.newTags()).join(' ');

  if (!term || !definition) {
    return;
  }

  const newRow: GlossaryRow = {
    id: `glossary_${Date.now()}`,
    term,
    definition,
    ...(partOfSpeech ? { partOfSpeech } : {}),
    ...(etymology ? { etymology } : {}),
    ...(source ? { source } : {}),
    ...(tags ? { tags } : {}),
    feed: 5,
    contributor: 'currentUser',
    syncStatus: 'pending',
  };

  try {
    await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
      ...this.rows(),
      newRow,
    ]);
    this.resetForm();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
    this.globalErrorService.show(message);
  }
}
```

#### 6.1 Flujo de inserción (el componente NO llama al API ni a Dexie directamente)

1. `addEntry()` valida los campos requeridos, construye el nuevo `row` (con `id`, `feed: 5`, `contributor: 'currentUser'`, `syncStatus: 'pending'`) y delega TODO en el servicio:
   ```ts
   await this.domainDataService.updateDomainSheetRows(this.currentSheet().name, [
     ...this.rows(),
     newRow,
   ]);
   ```
   Siempre se envía la lista COMPLETA (filas existentes + la nueva), nunca solo la nueva.
2. `DomainDataService.updateDomainSheetRows` ejecuta, en orden: (a) normaliza tags y hace `upsertBookTags`; (b) fuerza `syncStatus: 'pending'` y guarda en Dexie en una transacción `rw`; (c) actualiza el estado en memoria; (d) dispara en segundo plano `void syncRemoteUpdate(...)` sin bloquear la UI.
3. `syncRemoteUpdate` llama a `DomainDataApiService.updateRows(row, sheetName, rows)`: `fetch` POST a la URL del Web App de Google Apps Script con `Content-Type: text/plain;charset=utf-8` (evita el preflight CORS; NO añadir otros headers) y cuerpo JSON `{ action: 'UPDATE_SHEET_ROWS', row, sheetName, rows, idToken }`. Requiere la URL configurada y el `idToken` de Google.
4. Si la respuesta es correcta, el servicio marca todas las filas como `syncStatus: 'synced'` en Dexie y en el estado, por lo que el indicador de sincronización pasa a verde. Una respuesta HTTP no OK o `data.status === 'error'` se trata como fallo remoto.

#### 6.2 Manejo de errores

| Fallo | Comportamiento del servicio | Comportamiento del componente |
| --- | --- | --- |
| Local (Dexie, hoja no soportada, sin catálogo activo) | Marca las filas como `error`, fija `errorMessage` y RELANZA el error | Captura con `try/catch`, llama `globalErrorService.show(message)` y NO llama `resetForm()` (conserva lo escrito) |
| Remoto (red, sin URL, sin token, `status: 'error'`) | NO lanza: `console.warn`; las filas quedan en `pending` y los datos locales siguen disponibles | Nada que hacer: no mostrar error bloqueante ni revertir; el indicador ámbar refleja el estado |

Reglas para el componente generado:

- `try/catch` alrededor del `await` con `const message = error instanceof Error ? error.message : 'Failed to add [domain] entry.'; this.globalErrorService.show(message);`.
- `resetForm()` solo tras el guardado local exitoso (dentro del `try`).
- Validación previa con retorno silencioso (`if (!field) { return; }`) y sin `alert()`.
- No crear spinners ni estados de carga propios: el servicio ya usa `GlobalLoadingService`.
- No reintentar ni relanzar manualmente: una fila `pending` se vuelve a enviar con el siguiente guardado, porque siempre se envía la lista completa.

---

### 🔧 7. REFACTORIZACIÓN DE COMPONENTES EXISTENTES (ALINEACIÓN CON UN DOMINIO DE REFERENCIA)

Nombre de la técnica: **refactorización por alineación con un patrón de referencia** (*reference-guided refactoring*), que incluye **eliminación de código muerto** (variables declaradas y nunca usadas, normalmente residuo de copiar y pegar de otro dominio).

Se aplica cuando el usuario pide "mejora/alinea el componente X tomando como referencia Y" (ej. `addEntry()` de Places tomando como referencia Quotes). Procedimiento:

1. **Alcance estricto:** modificar SOLO lo pedido (ej. solo `addEntry()`). Si el usuario dice "no hagas nada más", no tocar plantilla, CSS, traducciones, modelos ni otros métodos. Si se detecta otro problema, solo mencionarlo al final.
2. **Leer el componente de referencia y el modelo** (`[InterfaceName]Row`) antes de editar; el resultado debe tipar contra el modelo real.
3. **Eliminar código muerto:** quitar todo `const` que no se use en la fila (nombres de otro dominio como `term`, `definition`, `partOfSpeech`, etc.).
4. **Aplicar el patrón de la sección 6.0:**
   - un `const` por campo, leído UNA sola vez desde su signal (con `trim()` donde aplique) y reutilizado en la fila (no volver a llamar `this.newX()` dentro del objeto);
   - validación de requeridos con retorno silencioso justo después de los `const`;
   - `const newRow: [InterfaceName]Row` (tipo completo, NO `Partial<...>`), para que el compilador exija los campos obligatorios;
   - opcionales con propagación condicional; tags normalizados con `splitTags(...).join(' ')`;
   - cierre fijo `feed: 5`, `contributor: 'currentUser'`, `syncStatus: 'pending'`.
5. **Eliminar campos que el modelo no define** (ej. `row`, `book`, `author` si no están en la interfaz); el servicio ya conoce la fila del catálogo.
6. **Conservar sin cambios** el bloque `try/catch`, el mensaje de error y `resetForm()`, salvo que difieran del patrón de la sección 6.2.
7. **Verificar:** revisar errores del archivo editado (y compilar si el cambio afecta tipos o plantillas).
8. **Informar** de forma breve qué se eliminó, qué se alineó y qué cambió de comportamiento (ej. `feed` de `0` a `5`, `contributor` de `'Current User'` a `'currentUser'`, tags normalizados), ya que no es una refactorización pura sino también una normalización de valores.
