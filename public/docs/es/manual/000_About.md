# Acerca de Sumaq Yachay

Sumaq Yachay significa **Conocimiento Hermoso**. Es una aplicación de autoestudio colaborativo y una base de conocimiento que reúne tus fuentes de lectura, notas de aprendizaje y preguntas de práctica.

> La autoeducación es, creo firmemente, el único tipo de educación que existe.
> La única función de una escuela es facilitar la autoeducación; si no logra eso, no hace nada.
> Es más, la educación formal termina; la autoeducación nunca.
>
> *Isaac Asimov*

## Tu espacio de trabajo

- **Catálogo** organiza libros y otras fuentes por materia, tema y autor.
- **Aprender** reúne entradas de aprendizaje, como definiciones, procesos, líneas de tiempo y diagramas.
- **Cuestionario** permite practicar preguntas relacionadas con tu material de estudio.

## Búsqueda durante una sesión de estudio

Busca una sola vez un libro, autor, dominio o etiqueta. La palabra clave se mantiene al cambiar
entre Catálogo, Aprender, Cuestionario y las vistas de contenido que permiten búsquedas, incluidas
las Preguntas. Cambiarla en una vista actualiza las demás; vaciar cualquier buscador elimina la
palabra clave compartida. Los filtros de materia y Solo activos son independientes del buscador
y se aplican únicamente al Catálogo.

Pulsa una etiqueta de cualquier entrada de dominio para añadirla a la búsqueda actual. Por
ejemplo, `James Joyce` pasa a ser `James Joyce #memory`. Deben coincidir el texto y todas las
etiquetas seleccionadas; pulsar de nuevo la misma etiqueta no la duplica. Puedes eliminar un
hashtag del buscador para ampliar los resultados o vaciarlo para quitar todos los filtros.
Los filtros de etiquetas utilizan coincidencias exactas.

Los nombres de libros y autores en las cabeceras también son filtros. Pulsar uno añade una
restricción exacta de libro o autor y conserva el texto, las etiquetas y las demás selecciones.
Por ejemplo, `#memory author:"James Joyce" book:"Ulysses"` solo incluye entradas coincidentes
de ese libro y autor. Pulsar de nuevo el mismo nombre no duplica el filtro. Elimina su expresión
`book:` o `author:` del buscador para quitar esa restricción.

Los nombres de los colaboradores al pie de las entradas también se pueden pulsar. Seleccionar
uno añade un filtro como `contributor:"leon84ych"` y conserva el texto, las etiquetas, el libro
y el autor seleccionados. Solo se muestran entradas creadas por ese colaborador en los distintos
dominios. El nombre visible omite el dominio del correo, pero el filtro utiliza la identidad
completa guardada cuando es una dirección de correo. Elimina la expresión `contributor:` o
vacía el buscador para quitar el filtro.

El Catálogo puede encontrar libros relacionados mediante el contenido guardado localmente en
este dispositivo. El contenido remoto debe cargarse localmente antes de aparecer en estas
búsquedas. La palabra clave se conserva mientras la aplicación está abierta y se restablece
al recargar la página.

Google Sheets y un servicio de Google Apps Script proporcionan almacenamiento remoto. La aplicación también guarda datos locales en tu navegador. Las acciones disponibles dependen de tus permisos y del modo de datos seleccionado.

## Primeros pasos

1. Abre **Configuración** para elegir el idioma, el tema y el tamaño del texto.
2. Prueba los **datos de ejemplo locales** para explorar sin contactar al servidor de la aplicación, o configura el servicio para utilizar tus propios datos.
3. Abre **Catálogo** para clonar un catálogo maestro desde un enlace compartido o registrar una fuente.
4. Explora **Aprender** y **Cuestionario** cuando tus entradas de aprendizaje estén disponibles localmente.

## Datos y acceso

Los cambios en datos de ejemplo permanecen en este dispositivo. Las operaciones remotas requieren conexión y permisos adecuados. Borrar los datos locales no elimina los del servidor, pero sí el contenido de la base de datos local, incluidos los cambios que solo existen en este dispositivo.

Selecciona el nombre de la aplicación en la navegación superior para volver a este manual. El idioma y la apariencia siguen tus preferencias.