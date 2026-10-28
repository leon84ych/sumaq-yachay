# 🤖 Agent Spec: Domain View Generator (domain-generator-es.agent.md)

Actúa como un Agente Desarrollador Frontend experto en Angular (Signals, Standalone Components, Reactive Forms/UI), Dexie.js (IndexedDB), Transloco (i18n) y Sistemas de Diseño CSS.

Tu único objetivo es recibir la especificación JSON de un dominio académico/literario y generar diez archivos: la vista del dominio, un formulario hijo extraído, una tarjeta de entrada reutilizable y el modelo de fila.

1. `src/app/features/domain/domain-[xxx]/domain-[xxx]/domain-[xxx].component.ts`
2. `src/app/features/domain/domain-[xxx]/domain-[xxx]/domain-[xxx].component.html`
3. `src/app/features/domain/domain-[xxx]/domain-[xxx]/domain-[xxx].component.css` (mínimo; delega el layout compartido a estilos globales)
4. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-form/domain-[xxx]-form.component.ts`
5. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-form/domain-[xxx]-form.component.html`
6. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-form/domain-[xxx]-form.component.css`
7. `src/app/features/domain/domain-[xxx]/model/domain-[xxx]-row.model.ts`
8. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-entry-card/domain-[xxx]-entry-card.component.ts`
9. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-entry-card/domain-[xxx]-entry-card.component.html`
10. `src/app/features/domain/domain-[xxx]/components/domain-[xxx]-entry-card/domain-[xxx]-entry-card.component.css`

---

### 🏛️ 1. REGLAS DE ARQUITECTURA Y MODELO DE DATOS

1. **Herencia de Interfaz Base (`DomainSheetRow`):**
   Cualquier modelo de datos de un dominio debe extender obligatoriamente la interfaz base:

   export interface DomainSheetRow extends Record<string, unknown> {
   id: string;
   tags?: string[];
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

- Requiere importar `TagPickerComponent` desde `../../../shared/tag-picker/tag-picker.component` en el array de `imports` del componente hijo del formulario.
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

- **Paso 0 (ID local):** Asignar un `id` temporal local antes de guardar, con formato `` `[domain]_${Date.now()}` ``. No incluyas ese ID temporal de fila en la petición de creación: GAS asigna el ID canónico y lo devuelve; reconcilia ese ID en IndexedDB y en el estado local. En ediciones, conserva y envía el ID de fila existente. Nunca pidas el ID en el formulario.
- **Paso 1 (Tags locales):** Mantén las etiquetas como un `string[]` canónico de hashtags en formularios, filas, IndexedDB y peticiones remotas. Reconstruye los `bookTags` agregados de la hoja dentro de la misma transacción Dexie, antes de la petición remota. Todos los dominios, incluido INDEX, usan únicamente la propiedad plural `tags`; nunca emitas una propiedad `tag` en una fila.
- **Paso 2 (Guardado local optimista):** Conserva la hoja completa en IndexedDB y en el estado local, marcando las filas locales afectadas como `syncStatus: 'pending'`.
- **Paso 3 (Sincronización esperada):** Los formularios generados esperan la respuesta de GAS. Si tiene éxito, reconcilian el ID asignado por el servidor en las creaciones, marcan la hoja local como `synced` y luego limpian el formulario. Si falla, marcan las filas locales como `error`, muestran el error global y conservan los valores del formulario.

4. **Integración Angular & Control Flow Moderno:**

- La vista del dominio, el formulario extraído y la tarjeta son componentes standalone. La vista importa los componentes de formulario y tarjeta; el formulario importa sus dependencias de campos; la tarjeta importa los componentes compartidos de tarjeta/header que utilice.
- Manejo de reactividad con Signals: `input.required()`, `signal()`, `computed()`, `output()`.
- Control flow moderno de plantilla: `@if`, `@else`, `@for (item of filteredRows(); track item.id)`.
- Para opciones `select` traducidas, guarda la clave estable de traducción como valor y renderiza su etiqueta localizada con Transloco. No guardes la etiqueta traducida (ejemplo: valor `Noun`, etiqueta `DOMAINS.GLOSSARY.POS_OPTIONS.Noun`).

5. **Estructura de carpetas, nombres y modelos (obligatoria):**

- `[xxx]` es el nombre del dominio en minúsculas (ej. `places`). Cada dominio vive en su carpeta `domain-[xxx]`, con la vista principal, una carpeta `components/` para su tarjeta de entrada y `model/`:

  ```
  src/app/features/domain/domain-[xxx]/
  ├── domain-[xxx]/                      # componente principal
  │   ├── domain-[xxx].component.ts
  │   ├── domain-[xxx].component.html
  │   └── domain-[xxx].component.css
         ├── components/
         │   ├── domain-[xxx]-form/
         │   │   ├── domain-[xxx]-form.component.ts
         │   │   ├── domain-[xxx]-form.component.html
         │   │   └── domain-[xxx]-form.component.css
      │   └── domain-[xxx]-entry-card/
      │       ├── domain-[xxx]-entry-card.component.ts
      │       ├── domain-[xxx]-entry-card.component.html
      │       └── domain-[xxx]-entry-card.component.css
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
- El detalle del catálogo y Learn comparten el token global `--content-width` de `src/styles.css`, con los mismos márgenes horizontales en escritorio y móvil. No añadas límites de ancho distintos por página.
- Todo el contenido de dominio renderizado por `app-sheet-view-resolver` y el contenedor del feed de Learn usan el token centralizado `--domain-view-width: 800px`, que coincide con el ancho actual de Index. Mantén Index y los demás dominios dentro de ese ancho; no añadas `max-width` locales.
- Cada feed de dominio y el feed de Learn muestran como máximo un elemento por fila. Usa el token compartido `--domain-feed-columns: minmax(0, 1fr)` en las grids de dominios y Learn; no uses grids de tarjetas con varias columnas ni `auto-fill`.

3. **Indicador de Sincronización (obligatorio):**

- Cada tarjeta de entrada DEBE mostrar el estado mediante `<app-domain-entry-header>` o `<app-domain-entry-card>` con su input `status`. Nunca dupliques el markup ni los estilos del estado en plantillas del dominio.
- `DomainEntryHeaderComponent` controla la etiqueta del dominio, el libro, el autor y el indicador. Los estilos globales `.status-indicator` y `.status-label` de `src/app/shared/styles/domain-entry-form.css` proporcionan el punto de 6px y su tooltip accesible: sincronizado es verde (`var(--success)`), pendiente ámbar (`var(--warning)`) y error rojo (`var(--error)`). No redefinas estos estilos localmente.
- No uses el color del indicador para otros fines: cualquier color propio del dominio (p. ej. `color` de un personaje) debe mostrarse con otro recurso visual, como una barra inferior del header, para no confundirlo con el estado de sincronización.

4. **Header compartido y tarjeta reutilizable del dominio (obligatorio):**

- Separa la vista del dominio (formulario, filtrado y persistencia) de la presentación de cada fila. La vista recorre las filas filtradas y renderiza `<app-domain-[xxx]-entry-card>` con `row`, `bookName`, `bookAuthor` y `showContext="true"`; recibe sus eventos de edición/borrado y conserva la persistencia.
- La tarjeta de entrada es el único lugar para la presentación de cada fila. DEBE usar directamente `<app-domain-entry-header>` o envolver el contenido con `<app-domain-entry-card>`; ambos consumen `DomainEntryHeaderComponent`. No recrees el bloque dominio/libro/autor/estado en plantillas locales.
- El header compartido muestra la etiqueta traducida del dominio a la izquierda y libro, autor e indicador de sincronización a la derecha, con ajuste responsive y estado accesible. El título, cuerpo, distintivos y etiquetas propios del dominio permanecen en la tarjeta.
- La tarjeta recibe `row` obligatorio, `bookName`, `bookAuthor`, `showContext` (por defecto `false` para reutilización) y `showActions` (por defecto `true`). Emite `editRequested` con la fila y `deleteRequested` con su ID; agrega outputs solo para acciones existentes del dominio.
- Añade `bookAuthor` como input de cada vista de dominio y pasa ambos metadatos desde el resolver de hojas a través de la vista hasta todas las tarjetas. Las tarjetas del Catálogo deben activar `showContext`; no ocultes el header compartido al explorar un libro.
- Las tarjetas con un eyebrow dinámico (por ejemplo, cita/reflexión) pueden proyectar esa etiqueta en el header compartido, pero libro/autor y estado de sincronización siguen perteneciendo al header.

5. **Validación de Taxonomía INDEX (obligatoria para dominios con etiquetas):**

- Inyecta `TaxonomyService` desde `../../../core/services/taxonomy/taxonomy.service` en el componente.
- Calcula `invalidTagsDetected` a partir del `string[]` de `newTags()`, conservando cada token para el que `taxonomyService.isTagAllowed(token)` devuelva `false`. Debe ser reactiva mientras el usuario edita las etiquetas.
- Incluye `invalidTagsDetected().length > 0` en `isFormInvalid()` junto con los campos requeridos. Vincula el botón de guardado con `[disabled]="isFormInvalid()"`; si también hay un guard de guardado en curso, combínalos: `[disabled]="isFormInvalid() || isSaving()"`. Aplica la misma validación en el método de guardado.
- Inmediatamente debajo de `<app-tag-picker>`, muestra un aviso con `@if` y una lista de tokens rechazados con `@for`. Usa las claves Transloco `DOMAINS.TAG_VALIDATION.REJECTED_PREFIX` y `DOMAINS.TAG_VALIDATION.REJECTED_SUFFIX` alrededor del nombre literal `INDEX` en negrita. No hardcodees la frase ni incluyas HTML en los valores de traducción.
- Define `.tag-validation-error` y `.tag-validation-error__badge` en la hoja compartida `src/app/shared/styles/domain-entry-form.css`, usando `var(--error)` y `var(--error-light)`. No uses estilos en línea, colores fijos, utilidades de color Bootstrap ni copias en el CSS del dominio. El aviso debe ser legible en temas claro y oscuro.
- Añade `DOMAINS.TAG_VALIDATION.REJECTED_PREFIX` y `DOMAINS.TAG_VALIDATION.REJECTED_SUFFIX` a `public/i18n/en.json` y `public/i18n/es.json`.
- **INDEX es la fuente de verdad de la taxonomía:** no valides sus definiciones contra la lista blanca ni muestres el aviso de etiquetas rechazadas en INDEX. Al completar su transacción y escritura masiva en la base de datos, llama `await taxonomyService.refreshGlobalTaxonomy(row)`.

6. **Acciones por rol y footer de tarjetas:**

- Inyecta el `PermissionService` compartido en los componentes con acciones de escritura y expón `readonly permissionService` y `readonly role = this.permissionService.role` a la plantilla. El rol viene de las respuestas del backend y empieza como `guest`; nunca lo infieras del email ni del token del cliente.
- Usa `@if (permissionService.validatePermission(role(), 'OPERACION'))` alrededor de cada acción. Usa `UPDATE_SHEET_ROWS` para guardar/editar filas de dominio, `DELETE_ROW` para borrarlas, `CREATE_SHEET` para crear pestañas, `CREATE_CATALOG_ITEM` para crear elementos del catálogo, `UPDATE_CATALOG_ITEM` para editarlos/cambiar su estado y `DELETE_CATALOG_ITEM` para borrarlos. Mantén visibles las acciones de lectura según sus operaciones GET.
- El mapa compartido permite las lecturas (`GET_CATALOG`, `GET_SHEETS_NAMES`, `GET_PAGINATED_ROWS`, `GET_CATALOG_HEALTH`) a `guest`, `user` y `admin`; las escrituras son solo para `admin`. Los roles u operaciones desconocidos se deniegan por defecto. Los guards de interfaz no sustituyen la autorización del backend.
- Todos los dominios, incluido INDEX, usan `domain-card-footer`. Coloca primero a la izquierda `<app-domain-contributor [contributor]="row().contributor" />`, antes de las acciones existentes como borrar/editar. Conserva las demás acciones en `domain-card-footer__actions` a la derecha, con sus propios guards de visibilidad y permisos. Los botones de edición/borrado usan estilos compartidos y etiquetas Transloco; filtrar por colaborador es una lectura, no una operación exclusiva de administradores.
- Mantén visible el colaborador en tarjetas de solo lectura de Learn y cuando `showActions()` sea falso. Usa una condición como `showActions() || row().contributor`, añadiendo los flags de lectura/exportación existentes si corresponde. Protege las escrituras por separado con `showActions()` y permisos; mostrar un colaborador no autoriza escrituras.
- INDEX conserva el contenido compacto y los guards por rol, pero también tiene footer de colaborador y búsqueda compartida. Conserva `contributor` al normalizar sus filas. Usa la misma propiedad `tags: string[]` y respeta el orden recibido de la jerarquía.

7. **Búsqueda de estudio compartida y filtros interactivos (obligatorio):**

- Reutiliza `StudySearchService` de `src/app/core/services/study-search.service.ts`. Enlaza `searchTerm` con `inject(StudySearchService).query`; no crees una señal de búsqueda local, no limpies la consulta al navegar ni la guardes en localStorage. La consulta permanece entre rutas y se restablece al recargar la página. Los filtros de materia/activos del Catálogo son independientes.
- Reutiliza `parseStudySearch` y `matchesStudySearch` de `src/app/shared/utils/study-search.ts`; no reimplementes búsquedas con `includes` ni dividas la consulta por espacios. Se combinan con AND la frase de texto libre, las frases entre comillas, todas las etiquetas canónicas exactas y todas las restricciones de metadatos. El texto puede coincidir en distintos campos; `book:"Ulysses"`, `author:"James Joyce"` y `contributor:"leon84ych"` deben coincidir con su metadato exacto.
- Pasa los tres contextos al matcher: `{ book: this.bookName() || row.book, author: this.bookAuthor() || row.author, contributor: row.contributor }`. Incluye contenido del dominio, libro/autor, alias EN/ES del dominio y etiquetas entre los campos buscables. Conserva la identidad original del colaborador en modelos, almacenamiento, normalización, ediciones, resolver y adaptadores de Learn; resuelve la identidad al crear desde el flujo de autenticación existente, no con el literal `currentUser`.
- Cada etiqueta visible usa `<button type="button" class="[clase-existente]" [appStudyTag]="tag">{{ tag }}</button>`. Importa `StudyTagDirective` desde `src/app/shared/directives/study-tag.directive.ts` en cada tarjeta/lector standalone que la use. Conserva `<app-tag-picker>` para editar etiquetas, no para mostrar filtros. Reutiliza `.study-tag` y los estilos de chips; adapta los selectores que antes apuntaban a `span`.
- `StudyTagDirective` llama `StudySearchService.addTag(tag)`. Los botones de libro/autor del header compartido llaman `addText(value, 'book' | 'author')`. `DomainContributorComponent`, en `src/app/features/domain/shared/domain-contributor/`, llama `addText(rawContributor, 'contributor')`. Reutiliza estos controles; no los dupliques por dominio. Añadir filtros conserva la consulta y no duplica restricciones equivalentes; se eliminan editando o vaciando el buscador compartido.
- El colaborador muestra solo el nombre de usuario, pero se filtra por su identidad completa guardada. No elimines el dominio del correo al persistir ni mezcles cuentas con el mismo nombre de usuario. Sin colaborador no hay botón. Los datos de ejemplo EN/ES usan `leon84ych`; conserva otros colaboradores del usuario durante la normalización de muestras.
- Los botones nativos deben ser accesibles por teclado, exponer `aria-pressed`, usar foco/selección compatibles con ambos temas y ajustarse en móvil. Los clics y Enter/Espacio no deben voltear citas, navegar por la tarjeta padre ni enviar formularios. Las tarjetas de solo lectura conservan los controles de búsqueda disponibles.
- Para nuevos dominios, registra la conversión de resultados y los alias localizados en `LearnFeedService` (`src/app/features/learn/services/learn-feed.service.ts`) y `CatalogService.CONTENT_SEARCH_TERMS` (`src/app/features/catalog/services/catalog.service.ts`). El Catálogo obtiene libros relacionados del contenido local, sin peticiones remotas; las restricciones combinadas deben coincidir en la misma entrada y su contexto de libro. Cuestionario/práctica también reutiliza el matcher. Filtra antes de paginar, reinicia IDs/resultados al cambiar la consulta, conserva el debounce e ignora respuestas asíncronas obsoletas.
- Prueba selección acumulativa de etiquetas/libro/autor/colaborador, duplicados, limpieza, navegación, metadatos exactos frente a menciones en el texto, filas de distintos colaboradores, tarjetas de solo lectura, aislamiento de eventos y temas claro/oscuro en escritorio/móvil. Reutiliza las suites y configuraciones TypeScript aisladas indicadas en el validador.

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

A partir de la definición JSON proporcionada, el Agente debe responder estrictamente con los siguientes 10 archivos completados:

#### Archivo A: `domain-[xxx].component.ts`

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { GlobalErrorService } from '../../../core/services/global-error.service';
import { DomainDataService } from '../../catalog-detail/services/domain-data.service';
import { DomainSheet } from '../../catalog-detail/models/domain-sheet.model';
import { TaxonomyService } from '../../../core/services/taxonomy/taxonomy.service';
import { PermissionService } from '../../../core/services/permission.service';
import { StudySearchService } from '../../../../core/services/study-search.service';
import { matchesStudySearch, parseStudySearch } from '../../../../shared/utils/study-search';
import { ConfigService } from '../../../../core/services/config.service';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { Domain[xxx]FormComponent } from '../components/domain-[xxx]-form/domain-[xxx]-form.component';
import { Domain[xxx]EntryCardComponent } from '../components/domain-[xxx]-entry-card/domain-[xxx]-entry-card.component';
import { [InterfaceName]Row } from '../model/domain-[xxx]-row.model';

@Component({
selector: 'app-domain-[xxx]',
standalone: true,
imports: [CommonModule, FormsModule, TranslocoPipe, Domain[xxx]FormComponent, Domain[xxx]EntryCardComponent],
templateUrl: './domain-[xxx].component.html',
styleUrls: ['./domain-[xxx].component.css'],
})
export class [DomainName]Component {
readonly rows = input.required<[InterfaceName]Row[]>();
readonly currentSheet = input.required<DomainSheet>();
readonly bookName = input<string>('');
readonly bookAuthor = input<string>('');
readonly isAddingEntry = input<boolean>(false);
readonly closeEntry = output<void>();

readonly editingId = signal<string | null>(null);
readonly permissionService = inject(PermissionService);
readonly role = this.permissionService.role;
private readonly taxonomyService = inject(TaxonomyService);
private readonly configService = inject(ConfigService);
private readonly authService = inject(GoogleAuthService);
readonly contributorIdentity = computed(() =>
  this.configService.localSampleDataEnabled()
    ? 'leon84ych'
    : (this.authService.currentUser()?.email?.trim() ?? ''),
);
readonly searchTerm = inject(StudySearchService).query;
readonly newTags = signal<string[]>([]);
readonly invalidTagsDetected = computed<string[]>(() =>
this.newTags().filter((tag) => !this.taxonomyService.isTagAllowed(tag)),
);
readonly isFormInvalid = computed<boolean>(() => {
const hasMissingRequiredFields = !this.newTerm().trim(); // Incluir todos los campos requeridos del JSON.
return hasMissingRequiredFields || this.invalidTagsDetected().length > 0;
});

// Signals individuales para cada campo definido en el JSON
// ...

readonly filteredRows = computed(() => {
const search = parseStudySearch(this.searchTerm());
return this.rows().filter((row) => matchesStudySearch(
  search,
  [this.bookName(), this.bookAuthor(), '[DOMAIN]', ...Object.values(row), ...(row.tags ?? [])],
  row.tags,
  { book: this.bookName() || row.book, author: this.bookAuthor() || row.author,
    contributor: row.contributor },
));
});

private domainDataService = inject(DomainDataService);
private globalErrorService = inject(GlobalErrorService);

splitTags(tags: string[]): string[] {
return tags;
}

async addEntry(): Promise<void> {
if (this.isFormInvalid()) return;

// 0. Asignar un ID local temporal; GAS lo sustituye al crear y se conserva al editar.
// 1. Extraer y procesar tags desde newTags()
// 2. Persistir en Dexie IndexedDB local mediante domainDataService
// 3. Manejo de errores con globalErrorService
}

editEntry(row: [InterfaceName]Row): void {
this.editingId.set(row.id);
// Cargar cada campo del registro en su signal correspondiente.
}

resetForm(): void {
this.editingId.set(null);
this.newTags.set([]);
this.closeEntry.emit();
}
}

#### Archivo B: `domain-[xxx].component.html`

<div class="[xxx]-view">
  @if (isAddingEntry() || editingId() !== null) {
      <app-domain-[xxx]-form [form]="this" />

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
          <app-domain-[xxx]-entry-card
            [row]="row"
            [bookName]="bookName()"
            [bookAuthor]="bookAuthor()"
            [showContext]="true"
            [showActions]="true"
            (editRequested)="editEntry($event)"
            (deleteRequested)="deleteEntry($event)"
          />
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

#### Archivo E: `domain-[xxx]-entry-card.component.ts`

Genera una tarjeta standalone en `components/domain-[xxx]-entry-card/`. Recibe `row` tipado como input obligatorio, `bookName`, `bookAuthor`, `showContext` (por defecto `false`) y `showActions` (por defecto `true`). Emite `editRequested` con la fila y `deleteRequested` con el ID. Añade outputs solo para acciones propias del dominio que ya existan. La tarjeta presenta la fila; la vista del dominio conserva la persistencia.

Usa `DomainEntryCardComponent` de `src/app/features/domain/shared/domain-entry-card/` para el contenedor estándar y `DomainEntryHeaderComponent` indirectamente. No recrees los filtros de libro/autor ni el estado de sincronización. Si se requiere un contenedor propio, usa el header compartido directamente. Importa `StudyTagDirective` y `DomainContributorComponent` en los `imports` standalone de la tarjeta y resuelve las rutas relativas desde el archivo generado.

#### Archivo F: `domain-[xxx]-entry-card.component.html`

Renderiza los campos, chips y acciones propios de la fila. Pasa el dominio, título/estado derivados de la fila, los metadatos del libro y el flag de contexto al componente compartido:

```html
<app-domain-entry-card
  [domain]="'[DOMAIN]'"
  [title]="row().[titleField]"
  [bookName]="bookName()"
  [bookAuthor]="bookAuthor()"
  [status]="row().syncStatus"
  [showContext]="showContext()"
>
  <!-- Distintivos y contenido específico de la fila -->
  @for (tag of row().tags ?? []; track $index) {
    <button type="button" class="concept-tag" [appStudyTag]="tag">{{ tag }}</button>
  }
  @if (showActions() || row().contributor) {
  <footer class="domain-card-footer">
    <div class="domain-card-footer__management">
      <app-domain-contributor [contributor]="row().contributor" />
      @if (showActions()) {
        <!-- Botones borrar y luego editar, protegidos por permisos -->
      }
    </div>
    <div class="domain-card-footer__actions">
      <!-- Acciones existentes, conservando sus propios guards de visibilidad y permisos -->
    </div>
  </footer>
  }
</app-domain-entry-card>
```

#### Archivo G: `domain-[xxx]-entry-card.component.css`

Incluye solo reglas de presentación exclusivas de la tarjeta. Reutiliza tokens y estilos de footer globales; nunca definas localmente `.status-indicator`, `.status-label` ni estilos del header compartido.

#### Archivo H: `domain-[xxx]-form.component.ts`

Crea un componente hijo standalone. Su input `form` es obligatorio y está tipado con el componente padre del dominio. Importa `DomainEntryFormOverlayComponent` y solo las dependencias que use la plantilla hija (por ejemplo, `FormsModule`, `TranslocoPipe`, `TagPickerComponent` o un selector específico del dominio). El hijo es de presentación: las señales, la validación, el estado de edición, la persistencia y el guardado permanecen en el padre.

#### Archivo I: `domain-[xxx]-form.component.html`

Envuelve el markup existente de `.add-entry-form` con `<app-domain-entry-form-overlay>`. Enlaza todos los valores y acciones mediante `form()`, incluidos datos de edición, validación, permisos, guardar y cancelar. Usa una etiqueta accesible de Transloco que cambie entre el título de edición y el de nueva entrada. Conserva los IDs, etiquetas, tag picker y validación existentes.

```html
<app-domain-entry-form-overlay
  [ariaLabel]="(form().editingId() ? 'COMMON.EDIT' : 'DOMAINS.[DOMAIN].NEW_ENTRY_TITLE') | transloco"
>
  <div class="add-entry-form">
    <!-- Campos existentes del dominio, enlazados mediante form() -->
    <div class="form-actions">
      @if (form().permissionService.validatePermission(form().role(), 'UPDATE_SHEET_ROWS')) {
      <button
        type="button"
        class="btn-submit"
        [disabled]="form().isFormInvalid()"
        (click)="form().addEntry()"
      >
        {{ (form().editingId() ? 'COMMON.UPDATE' : 'COMMON.SAVE') | transloco }}
      </button>
      }
      <button type="button" class="btn-cancel" (click)="form().resetForm()">
        {{ 'COMMON.CANCEL' | transloco }}
      </button>
    </div>
  </div>
</app-domain-entry-form-overlay>
```

#### Archivo J: `domain-[xxx]-form.component.css`

Incluye solo estilos del formulario específicos del dominio que estaban en el componente padre y no llegan al hijo por la encapsulación de vistas de Angular. El layout compartido permanece en `domain-entry-form.css`; usa las variables del tema.

---

### 🗂️ 5. CAMBIOS OBLIGATORIOS EN ARCHIVOS EXISTENTES (NUEVO DOMINIO)

Además de los 10 archivos generados del dominio, el Agente DEBE entregar los siguientes cambios para registrar el dominio. Usa `[DOMAIN]` en MAYÚSCULAS (ej. `TIMELINE`), `[table]` en minúsculas (ej. `timeline`) y `[InterfaceName]Row` para el modelo de fila.

#### 5.1 `src/app/features/catalog-detail/models/domain-sheet-config.ts`

1. Añadir `'[DOMAIN]'` a la unión `DomainName`.
2. Añadir la entrada en `DOMAIN_DEFINITIONS` con los encabezados de la hoja:
   - `id` SIEMPRE primero y `syncStatus` SIEMPRE último.
   - Incluir `tags`, `feed` y `contributor` (antes de `syncStatus`) si el dominio usa etiquetas.
   - Los nombres deben coincidir exactamente con los `name` del JSON de entrada.
3. `ALL_AVAILABLE_DOMAINS` se deriva automáticamente; no editarlo.
4. Actualizar `domain-sheet-config.spec.ts` (lista de dominios y `toEqual` de los encabezados).

#### 5.2 Modelo del dominio (NO se toca `domain-sheet.model.ts`)

El modelo se genera en `src/app/features/domain/domain-[xxx]/model/domain-[xxx]-row.model.ts` (Archivo D) y extiende `DomainSheetRow` importado de `catalog-detail/models/domain-sheet.model.ts`. NO añadir `[InterfaceName]Row` ni tipos del dominio a `domain-sheet.model.ts`: no se permiten modelos centralizados.

#### 5.3 `src/app/core/services/storage/app-db.service.ts`

1. Declarar el tipo de la tabla local REUTILIZANDO el modelo del dominio (sin duplicar campos): `export type [InterfaceName]Record = [InterfaceName]Row & { row: number; book?: string; author?: string };`, importando `[InterfaceName]Row` desde `../../../features/domain/domain-[xxx]/model/domain-[xxx]-row.model`.
2. Declarar la propiedad en `AppDatabase`: `[table]!: Table<[InterfaceName]Record, string>;`.
3. Registrar el store con el esquema compartido para arrays: `'id, row, book, author, *tags'`.
4. Si la base de datos ya existe en los navegadores de los usuarios, NO modificar `version(1)`: crear `this.version(N+1).stores({ [table]: '...' })` con el nuevo store (y no repetir los demás).
5. `clearAllTables()` usa `db.tables`, por lo que incluye la nueva tabla sin cambios.

#### 5.4 Archivos relacionados que también deben actualizarse

- `catalog-detail/services/domain-data.service.ts`: añadir el nombre de tabla a `DomainTableName`, la clave `[DOMAIN]: '[table]'` en `DOMAIN_TABLES` y las columnas nuevas (en minúsculas, sin símbolos → nombre canónico) en `headerNames` de `normalizePaginatedRow`.
- `catalog-detail/components/sheet-view-resolver/`: añadir el `@case ('[DOMAIN]')` en el HTML con `<app-domain-[xxx]>` (inputs `rows`, `currentSheet`, `bookName`, `bookAuthor`, `isAddingEntry`, evento `closeEntry`), el `computed` de filas tipadas (tipadas con `[InterfaceName]Row` importado desde `features/domain/domain-[xxx]/model/`) y el import del componente desde `features/domain/domain-[xxx]/domain-[xxx]/`. La vista del dominio importa y renderiza su tarjeta de entrada y su formulario hijo.
- `public/i18n/en.json` y `es.json`: claves `DOMAINS.[DOMAIN].*` (`NEW_ENTRY_TITLE`, etiquetas de cada campo, `TAGS`, `SEARCH`, `NO_MATCHES`, `CHARACTERS_LEFT` y `*_OPTIONS` para cada `select`).

#### 5.5 Aislamiento de taxonomía y pruebas del servicio de dominio

- Al crear o actualizar un servicio de dominio que use Angular `inject()`, importa `Injectable` y coloca `@Injectable({ providedIn: 'root' })` directamente encima de la clase.
- Para todos los dominios, sanea el `tags: string[]` entrante en `syncRemoteRows` con `TaxonomyService.filterAllowedTags(...)` y persiste los valores permitidos como array. Mantén un helper como `validateAndSanitizeTags` como único punto de delegación.
- INDEX es la fuente de la taxonomía: persiste su array `tags` sin filtrarlo contra sí mismo, completa la transacción y `bulkPut`, y después espera `TaxonomyService.refreshGlobalTaxonomy(row)`.
- Añade un spec correspondiente en `services/` del dominio. Usa `TestBed` y `jasmine.createSpyObj` para `TaxonomyService`, proporcionado con `{ provide: TaxonomyService, useValue: mockTaxonomyService }`. Para los helpers de otros dominios, comprueba que los tokens lleguen a `filterAllowedTags`, que se devuelva la lista permitida y que se excluyan las etiquetas no autorizadas. Para INDEX, verifica que la actualización de taxonomía reciba la fila solo después del delete y bulk put; no pruebes filtrado de etiquetas.

---

### 🌐 6. INSERCIÓN DE DATOS EN EL SERVIDOR Y MANEJO DE ERRORES

#### 6.0 Construcción de la petición (`addEntry()` con `const`)

La fila que se envía se construye SIEMPRE en este orden, dentro de `addEntry()`, antes del `try/catch`:

1. **Un `const` por campo**, en el mismo orden del JSON, leyendo su signal:
   - `text` / `textarea`: `const term = this.newTerm().trim();`
   - `select` opcional: `const partOfSpeech = this.newPartOfSpeech() || undefined;` (la opción vacía `''` se convierte en `undefined`).
   - `number`: `const weight = this.newWeight();` (signal ya tipado como número; si es opcional, `?? undefined`).

- `tags`: `const tags = this.newTags();` (array canónico de hashtags).
- Campo con valor por defecto del libro (`source`, `book`, `author`): usar el `computed` del componente (`const source = this.source();`, que cae en `bookName()`), nunca el signal crudo.

2. **Validación de requeridos** inmediatamente después de los `const`, con retorno silencioso: `if (!term || !definition) { return; }`.
3. **`const newRow: [InterfaceName]Row`** con esta forma exacta:

- `id` primero. Usa `editingId()` al editar; al crear, usa un ID local temporal (ver Paso 0), que se omite de la petición.
- Campos requeridos con propiedad abreviada (`term`, `definition`).
- Campos opcionales con propagación condicional: `...(etymology ? { etymology } : {})`, de modo que un valor vacío NO se envía (la propiedad se omite en lugar de enviar `''` o `undefined`).
- Conserva `originalRow.contributor` al editar. Al crear, resuelve `const contributor = originalRow?.contributor ?? this.contributorIdentity();` y no guardes si está vacío. El computed compartido usa `GoogleAuthService.currentUser()?.email`; solo el modo de datos de ejemplo locales usa `leon84ych`. No sustituyas un correo existente por su nombre de usuario visible.
- Cierre fijo: `feed: 5, contributor, syncStatus: 'pending'`.
- No incluir `row`, `book` ni `author` salvo que el JSON los defina como campos.

4. **Petición**: Construye la lista local completa y llama `updateDomainSheetRows(sheetName, allLocalRows, true, editingId ?? undefined, editingId ? undefined : newRow.id)` (ver 6.1). El servicio persiste la lista local completa, pero solo envía la fila modificada a GAS.

Ejemplo de referencia (glosario):

```ts
async addEntry(): Promise<void> {
  const term = this.newTerm().trim();
  const definition = this.newDefinition().trim();
  const partOfSpeech = this.newPartOfSpeech() || undefined;
  const etymology = this.newEtymology().trim();
  const source = this.source();
  const tags = this.newTags();
  const editingId = this.editingId();

  if (!term || !definition) {
    return;
  }

  const originalRow = editingId ? this.rows().find((row) => row.id === editingId) : undefined;
  if (editingId && !originalRow) {
    this.globalErrorService.show('El término que editas ya no está disponible.');
    return;
  }

  const contributor = originalRow?.contributor ?? this.contributorIdentity();
  if (!contributor) return;

  const newRow: GlossaryRow = {
    ...(originalRow ?? {}),
    id: editingId ?? `glossary_${Date.now()}`,
    term,
    definition,
    ...(partOfSpeech ? { partOfSpeech } : {}),
    ...(etymology ? { etymology } : {}),
    ...(source ? { source } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    feed: 5,
    contributor,
    syncStatus: 'pending',
  };

  const allLocalRows = editingId
    ? this.rows().map((row) => (row.id === editingId ? newRow : row))
    : [...this.rows(), newRow];

  try {
    await this.domainDataService.updateDomainSheetRows(
      this.currentSheet().name,
      allLocalRows,
      true,
      editingId ?? undefined,
      editingId ? undefined : newRow.id,
    );
    this.resetForm();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add glossary entry.';
    this.globalErrorService.show(message);
  }
}
```

#### 6.1 Flujo de inserción (el componente NO llama al API ni a Dexie directamente)

1. Construye `allLocalRows`: al editar, reemplaza solo la fila que coincide con `editingId`; al crear, agrega la nueva fila local. Esta lista completa es únicamente para Dexie y el estado local.
2. Llama `updateDomainSheetRows(sheetName, allLocalRows, true, editedId, createdLocalId)`. El servicio persiste la hoja local completa y reconstruye sus etiquetas agregadas, pero la petición remota contiene solo el registro modificado.
3. Al editar, envía `rows: [editedRow]` con su ID existente. Al crear, envía `rows: [newRowWithoutId]`: omite el ID local temporal del objeto. Conserva el `CatalogItem.id` padre en el `id` de nivel superior. La petición usa `action: 'UPDATE_SHEET_ROWS'`, `row`, `sheetName`, `rows`, `idToken` y `Content-Type: text/plain;charset=utf-8`.
4. GAS asigna el ID canónico al crear y lo devuelve (por ejemplo, en `data.id`). Reconcilia ese ID con el temporal local antes de marcar la hoja completa como sincronizada. Si GAS no devuelve el ID, trata la creación como fallida.
5. Espera la respuesta remota antes de limpiar el formulario. Una respuesta HTTP no OK, malformada o con `data.status !== 'success'` debe propagarse al componente como error.

#### 6.2 Manejo de errores

| Fallo                                                  | Comportamiento del servicio                                                                                     | Comportamiento del componente                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Local (Dexie, hoja no soportada, sin catálogo activo)  | Marca las filas como `error`, fija `errorMessage` y RELANZA el error                                            | Captura con `try/catch`, llama `globalErrorService.show(message)` y NO llama `resetForm()` (conserva lo escrito) |
| Remoto (red, sin URL, sin token, respuesta no exitosa) | Marca las filas locales como `error`, fija `errorMessage` y relanza el error en los formularios que esperan GAS | Muestra el error global y conserva los valores; solo limpia el formulario tras el éxito                          |

Reglas para el componente generado:

- `try/catch` alrededor del `await` con `const message = error instanceof Error ? error.message : 'Failed to add [domain] entry.'; this.globalErrorService.show(message);`.
- `resetForm()` solo después de que la operación remota esperada tenga éxito (dentro del `try`).
- Validación previa con `if (this.isFormInvalid()) { return; }` y sin `alert()`. `isFormInvalid()` debe incluir todos los campos requeridos y las etiquetas inválidas.
- No crear spinners ni estados de carga propios: el servicio ya usa `GlobalLoadingService`.
- No reintentar manualmente. Conserva la hoja completa local, pero envía a GAS solo la fila creada o editada. Si falla la petición, no limpies el formulario.

---

### 🔧 7. REFACTORIZACIÓN DE COMPONENTES EXISTENTES (ALINEACIÓN CON UN DOMINIO DE REFERENCIA)

Nombre de la técnica: **refactorización por alineación con un patrón de referencia** (_reference-guided refactoring_), que incluye **eliminación de código muerto** (variables declaradas y nunca usadas, normalmente residuo de copiar y pegar de otro dominio).

Se aplica cuando el usuario pide "mejora/alinea el componente X tomando como referencia Y" (ej. `addEntry()` de Places tomando como referencia Quotes). Procedimiento:

1. **Alcance estricto:** modificar SOLO lo pedido (ej. solo `addEntry()`). Si el usuario dice "no hagas nada más", no tocar plantilla, CSS, traducciones, modelos ni otros métodos. Si se detecta otro problema, solo mencionarlo al final.
2. **Leer el componente de referencia y el modelo** (`[InterfaceName]Row`) antes de editar; el resultado debe tipar contra el modelo real.
3. **Eliminar código muerto:** quitar todo `const` que no se use en la fila (nombres de otro dominio como `term`, `definition`, `partOfSpeech`, etc.).
4. **Aplicar el patrón de la sección 6.0:**
   - un `const` por campo, leído UNA sola vez desde su signal (con `trim()` donde aplique) y reutilizado en la fila (no volver a llamar `this.newX()` dentro del objeto);
   - validación de requeridos con retorno silencioso justo después de los `const`;
   - `const newRow: [InterfaceName]Row` (tipo completo, NO `Partial<...>`), para que el compilador exija los campos obligatorios;

- opcionales con propagación condicional; `tags` permanece como `string[]` y nunca se une en una cadena;
- cierre fijo `feed: 5`, `contributor` (identidad original al editar; identidad autenticada o de muestras locales al crear), `syncStatus: 'pending'`.

5. **Eliminar campos que el modelo no define** (ej. `row`, `book`, `author` si no están en la interfaz); el servicio ya conoce la fila del catálogo.
6. **Conservar sin cambios** el bloque `try/catch`, el mensaje de error y `resetForm()`, salvo que difieran del patrón de la sección 6.2.
7. **Verificar:** revisar errores del archivo editado (y compilar si el cambio afecta tipos o plantillas).
8. **Informar** de forma breve qué se eliminó, qué se alineó y qué cambió de comportamiento (ej. `feed` de `0` a `5`, `contributor` de `'Current User'` a `'currentUser'`, tags normalizados), ya que no es una refactorización pura sino también una normalización de valores.

---

### 🪟 8. FLUJO DE FORMULARIO A PANTALLA COMPLETA (TODOS LOS DOMINIOS)

Todos los formularios de creación/edición se abren en el modal compartido a pantalla completa. No renderices `.add-entry-form` dentro de la lista con scroll del dominio.

1. **Extraer la interfaz del formulario:**

- Crea un componente hijo standalone en `src/app/features/domain/domain-[xxx]/components/[domain]-form/`.
- Mantén las señales del dominio, la validación, `editEntry`, los métodos de guardado y la persistencia en el componente padre existente. El hijo recibe un input obligatorio y tipado del contexto padre llamado `form`; enlaza campos y acciones mediante `form()`.
- El padre muestra el hijo solo durante creación o edición:

  ```html
  @if (isAddingEntry() || editingId() !== null) {
  <app-domain-[xxx]-form [form]="this" />
  }
  ```

2. **Usar el shell modal compartido:**

- Envuelve el `.add-entry-form` del hijo en `<app-domain-entry-form-overlay>`, ubicado en `src/app/shared/domain-entry-form-overlay/`.
- Proporciona una etiqueta accesible de Transloco que diferencie el título de edición del título de nueva entrada.
- El shell compartido usa un diálogo modal nativo, ocupa el viewport incluyendo las áreas seguras móviles, permite el scroll interno del formulario y vuelve inerte la página subyacente. Reutilízalo; no crees overlays ni manejadores de scroll por dominio.
- El modal solo se cierra con Guardar exitoso o Cancelar. Impide que Escape o un clic en el backdrop descarte los datos.

3. **Conservar la posición del usuario:**

- Al abrir el overlay, guarda la posición de scroll de la página y el foco del elemento que lo invocó. Para editar, el padre debe cargar la fila seleccionada antes de abrir el hijo. `+ Entrada` abre un formulario vacío.
- Tras Guardar exitoso o Cancelar, cierra el modal, restaura exactamente la posición de scroll guardada y devuelve el foco al elemento invocador si sigue conectado. Esto aplica a edición y creación en todos los dominios.
- Si falla la validación o el guardado, deja el modal abierto y conserva los valores introducidos. No restaures el scroll ni limpies el formulario cuando ocurra un fallo.

4. **Conservar el comportamiento de datos existente:**

- El hijo solo presenta el formulario y llama los métodos existentes del contexto padre tipado. No muevas Dexie, API ni la lógica de guardado/errores al hijo.
- Conserva permisos, validación de etiquetas, carga y guardado esperado. Si Angular view encapsulation impide que los estilos específicos del formulario se apliquen, mantenlos en la hoja de estilos del hijo.
