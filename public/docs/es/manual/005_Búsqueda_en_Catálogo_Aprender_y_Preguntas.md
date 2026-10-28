# Búsqueda en Catálogo, Aprender y Preguntas

El buscador se comparte entre **Catálogo**, **Aprender**, **Cuestionario** y las vistas de dominio de una fuente que permiten búsquedas, incluidas las **Preguntas**.
Empieza una búsqueda en una vista y continúa estudiando en otra sin volver a introducir los mismos filtros.

## Empezar con texto

Escribe un nombre de libro, autor, colaborador, dominio, una palabra de etiqueta o parte del contenido. La búsqueda compartida no distingue mayúsculas ni acentos.
Por ejemplo, `James Joyce` puede encontrar sus fuentes del catálogo, entradas de aprendizaje y preguntas.

El texto sin comillas se trata como una sola frase, no como palabras independientes unidas por OR. Para añadir restricciones exactas de libro, autor o colaborador, utiliza los nombres pulsables o las expresiones siguientes.

## Añadir filtros pulsando

| Elemento | Filtro añadido | Coincidencia requerida |
| --- | --- | --- |
| Una etiqueta de una entrada | `#memory` | Esa etiqueta exacta, no otra más larga como `#memory-loss` |
| Un libro en la cabecera de una tarjeta | `book:"Ulysses"` | El metadato de libro de la entrada |
| Un autor en la cabecera de una tarjeta | `author:"James Joyce"` | El metadato de autor de la entrada |
| Un colaborador al pie de una tarjeta | `contributor:"leon84ych"` | La identidad guardada de quien creó la entrada |

Cada pulsación añade una condición a la consulta. No sustituye el texto ni los filtros existentes y no duplica un valor ya seleccionado. Los controles seleccionados se marcan como activos; volver a pulsarlos no elimina el filtro.

El colaborador muestra solo el nombre de usuario. Si la identidad guardada es un correo, el filtro conserva la dirección completa, por ejemplo `contributor:"leon84ych@gmail.com"`. No se mezclan cuentas que comparten nombre de usuario.

## Combinar condiciones

Todas las condiciones se combinan con **AND**. Esta búsqueda exige que la entrada pertenezca al libro y autor indicados, sea del colaborador seleccionado y tenga ambas etiquetas:

```text
book:"Ulysses" author:"James Joyce" contributor:"leon84ych" #memory #identity
```

Los filtros de libro, autor y colaborador comprueban sus metadatos, no nombres que solo aparecen mencionados en el texto. Varias restricciones exactas de libro o autor deben cumplirse a la vez; seleccionar libros distintos puede dejar la lista sin resultados.

Puedes escribir las expresiones directamente. Mantén las comillas alrededor de los valores, especialmente si contienen espacios. Una frase independiente entre comillas, como `"stream of consciousness"`, busca contenido en lugar de seleccionar un libro o autor.

## Qué muestra cada vista

### Catálogo

Catálogo devuelve **libros y fuentes**, no notas individuales. El texto puede coincidir con los metadatos de la fuente o con su contenido local. Una consulta como `author:"James Joyce" #memory` devuelve fuentes con una entrada guardada localmente que cumpla la etiqueta y el contexto del autor del libro.

Las búsquedas por etiquetas, dominios y colaboradores dependen del contenido guardado en este dispositivo. El contenido que solo existe en el servidor no se busca automáticamente. Si faltan resultados, carga los datos de la fuente o dominio correspondientes antes de volver a intentarlo.

La selección de **materia** y la casilla **Solo activos** son filtros adicionales exclusivos de Catálogo. No se trasladan a Aprender o Preguntas; la búsqueda compartida sí.

### Aprender

Aprender devuelve **entradas individuales de aprendizaje** de los libros y dominios disponibles localmente. Cada elemento mostrado debe cumplir la consulta actual. Los resultados llegan en lotes aleatorios de hasta 20; la opción para cargar 20 más continúa el mismo feed filtrado.

Cambiar la búsqueda borra los resultados anteriores y comienza un lote filtrado nuevo. La vista espera brevemente después de escribir antes de cargar; deja que termine antes de valorar el número de resultados.

### Preguntas dentro de una fuente del catálogo

El dominio **Preguntas** filtra las filas cargadas para la fuente que estás consultando. Busca en el enunciado, respuesta, término/dominio de origen, etiquetas, contexto de libro/autor y colaborador. No convierte esa lista de una fuente en una búsqueda de preguntas de todos los libros.

Los demás dominios se comportan de forma similar: la consulta compartida se aplica dentro del libro y dominio actuales. La búsqueda oculta las entradas que no coinciden; no las elimina ni modifica.

### Cuestionario

La vista **Cuestionario** de la navegación superior utiliza la misma consulta para seleccionar un lote aleatorio de hasta 10 preguntas locales de distintos libros. Cambiar la consulta sustituye el lote actual y restablece el estado de la respuesta en curso.

Cuestionario solo muestra preguntas existentes; buscar o seleccionar una etiqueta no crea preguntas nuevas. Un filtro de dominio puede coincidir con el dominio de origen de una pregunta, por lo que buscar Concepts puede encontrar preguntas basadas en conceptos.

## Quitar filtros y continuar estudiando

- Elimina un hashtag o una expresión completa `book:`, `author:` o `contributor:` del buscador para ampliar los resultados.
- Vacía el campo para quitar todas las condiciones compartidas. Los controles de materia y Solo activos de Catálogo no cambian.
- Navega entre Catálogo, Aprender y Cuestionario para reutilizar la consulta. Se conserva al navegar y se restablece al recargar la aplicación.
- En móvil, utiliza el mismo buscador y las etiquetas, cabeceras y colaboradores pulsables; las reglas son idénticas.

## Si no hay resultados

Revisa si hay condiciones incompatibles, una etiqueta ausente en la entrada, una identidad de colaborador distinta del nombre visible, filtros exclusivos de Catálogo o contenido que todavía no se ha cargado localmente. Que un libro aparezca en Catálogo no significa que todos sus dominios contengan entradas coincidentes.