# Añadir dominio al catálogo

Un dominio es una sección estructurada dentro de una fuente del catálogo, como Conceptos, Citas o Preguntas.
Añadirlo crea una hoja para esa fuente; no registra un libro nuevo ni importa un catálogo maestro.

## Antes de comenzar

- Registra o carga una fuente del catálogo y ábrela desde **Catálogo**.
- Configura el servicio de Google Apps Script e inicia sesión con permiso para crear hojas. La acción **Dominio** requiere permisos de administrador.
- Desactiva los **datos de ejemplo locales** para este procedimiento. Crear hojas de dominios predefinidos desde el selector no está disponible en ese modo; utiliza los dominios que ya incluyen los libros de ejemplo.

## Crear un dominio

1. Abre **Catálogo** y selecciona el libro o la fuente que contendrá el dominio.
2. Selecciona **+ Dominio** en la cabecera de la fuente.
3. Abre **Seleccionar dominio** y elige un tipo disponible. Solo aparecen los tipos que todavía no existen en esa fuente.
4. La creación comienza al seleccionar el tipo. Espera a que termine la solicitud; el selector se desactiva mientras se procesa.
5. Si la operación tiene éxito, la aplicación actualiza las hojas de la fuente y selecciona la pestaña del dominio nuevo.

Antes de elegir un tipo, puedes cerrar el selector con el botón de cancelar. Si no quedan opciones, la fuente ya contiene todos los tipos de dominio compatibles.

## Elegir el dominio adecuado

| Dominio | Contenido habitual |
| --- | --- |
| Índice | Capítulos, temas, subtemas y taxonomía de etiquetas |
| Conceptos | Ideas, definiciones y categorías |
| Glosario | Vocabulario y significados en contexto |
| Personajes | Personas o personajes y sus descripciones |
| Lugares | Ubicaciones y contexto geográfico |
| Citas | Citas y reflexiones |
| Pasajes | Fragmentos de lectura más extensos |
| Eventos del libro | Eventos y su secuencia |
| Relaciones | Relaciones entre personajes |
| Asociaciones | Conexiones entre conceptos |
| Preguntas | Enunciados, respuestas y material de práctica |

El selector utiliza los tipos de dominio predefinidos de la aplicación y sus campos estándar. No permite inventar un tipo de dominio arbitrario ni diseñar un esquema nuevo.

## Añadir contenido al dominio

1. Mantén seleccionado el dominio nuevo. En escritorio, utiliza las pestañas; en móvil, el selector de vista de la cabecera.
2. Selecciona **+ Entrada** para abrir el formulario. Añadir contenido requiere permiso de escritura.
3. Completa los campos obligatorios y elige etiquetas cuando corresponda.
4. Para los dominios que usan etiquetas, define primero las necesarias en **Índice**; los demás formularios las validan contra esa taxonomía.
5. Guarda y revisa el indicador de sincronización de la entrada. Crear el dominio no lo llena automáticamente de contenido ni genera preguntas.

## Si falta algo

- **No aparece Dominio:** comprueba el inicio de sesión y los permisos.
- **No aparece un tipo en el selector:** puede existir ya; selecciona su pestaña.
- **Falla la creación:** revisa la configuración del servicio, la conexión y el acceso a la fuente. Lee el error antes de volver a intentarlo.
- **Un dominio con contenido parece vacío:** limpia o ajusta la búsqueda compartida. Los filtros de texto, etiquetas, libro, autor y colaborador también se aplican dentro de los dominios del catálogo.