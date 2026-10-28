# Añadir entrada de catálogo

Una entrada de catálogo describe un libro u otra fuente de aprendizaje. **Registrar Fuente** ofrece
dos métodos: **Nueva fuente de datos**, que crea una entrada con los campos que completas, y **URL**, que clona una hoja de Google existente.

## Clonar una hoja existente desde una URL

1. Abre **Catálogo** y selecciona **Registrar Fuente**.
2. Selecciona **URL** como método de registro. Solo aparece el campo de URL de Google Sheet; no se requieren ID, nombre, autor ni otros campos del catálogo.
3. Pega la URL de Google Sheets, por ejemplo `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
4. Lee el aviso que indica que se clonará la hoja existente y se añadirá como fuente a tu catálogo. El original solo se utiliza como fuente.
5. Selecciona **Clonar hoja** y espera la respuesta. La solicitud puede tardar hasta un minuto; el diálogo bloquea envíos repetidos y su cierre mientras está pendiente.
6. Si la operación tiene éxito, la aplicación actualiza el catálogo y cierra el diálogo. La fuente clonada se añade junto a las entradas existentes.

La clonación por URL requiere inicio de sesión, permisos de administrador, un servicio configurado
y acceso a la hoja de origen. No está disponible en el modo de **datos de ejemplo locales**.
A diferencia de clonar un catálogo maestro completo, añadir una fuente no requiere un catálogo vacío.

Si falla la clonación, el diálogo conserva la URL y muestra el error. Si la hoja se clonó pero
no se pudo actualizar el catálogo, cierra el diálogo y utiliza **Sincronizar Remoto (GET)** antes
de intentar otra clonación. Tras un timeout, comprueba si la copia ya existe antes de reintentar.

## Crear una fuente de datos nueva

1. Abre **Catálogo** y selecciona la opción para **registrar una fuente**.
2. Mantén seleccionado **Nueva fuente de datos**.
3. Indica un **ID de catálogo** único y un **nombre**. Ambos son obligatorios y admiten hasta 100 caracteres.
4. Completa **Materia**, **Tema** y **Autor**; son campos obligatorios.
5. Añade una descripción o referencia de origen opcional.
6. Ajusta la casilla **Activo** según corresponda.
7. Envía el formulario con **Registrar Fuente**.

La creación requiere permisos adecuados. Si no está disponible, revisa el inicio de sesión y tu rol, o utiliza los datos de ejemplo locales para experimentar en tu dispositivo.

## Entrada con enlace

En el modo **Nueva fuente de datos**, introduce una referencia en el campo opcional **Fuente**.
Puede describir un PDF, un sitio web, un vídeo u otro material. Esa referencia no clona una hoja
ni concede acceso al contenido de otra persona. Utiliza el modo **URL** si quieres clonar una hoja de Google.

Para clonar un catálogo maestro completo desde una fuente compartida, utiliza **Clonar catálogo maestro**. Esta acción está disponible cuando tu catálogo está vacío.

## Entrada definida por el usuario

Deja **Fuente** vacía y describe tu material con los campos obligatorios y la descripción. Puedes organizar un tema de estudio personal sin una URL externa.

## Revisar y editar

Localiza la entrada mediante la búsqueda o los filtros del catálogo. Ábrela para consultar su
contenido o utiliza **Editar** para actualizar sus datos. La edición conserva el formulario de
campos; la clonación por URL es un método de registro, no una operación de edición. El ID no se puede modificar al editar una entrada existente.

Comprueba el estado de sincronización después de guardar. En el modo de datos de ejemplo locales, los cambios permanecen en este dispositivo y no se envían al servidor.