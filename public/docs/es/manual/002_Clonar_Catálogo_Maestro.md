# Clonar catálogo maestro

Un catálogo maestro es una hoja de cálculo de Google que contiene fuentes de aprendizaje.
**Clonar catálogo maestro** crea una copia en tu propio Drive y carga tu catálogo desde ella.
La hoja compartida original solo es la fuente; no hay una opción para utilizarla como catálogo compartido activo.

## Antes de comenzar

- Obtén el enlace de Google Sheets de la fuente y confirma que la aplicación pueda leerla.
- Configura el servicio de Google Apps Script e inicia sesión con los permisos necesarios.
- Desactiva los **datos de ejemplo locales**. La clonación es remota y no está disponible en ese modo.
- Empieza con un catálogo vacío. La acción solo aparece cuando la lista está vacía; no permite mezclar otro catálogo maestro con uno existente.

## Clonar el catálogo

1. Abre **Catálogo** y selecciona **Clonar catálogo maestro**.
2. Pega la URL de Google Sheets en el campo del enlace. Por ejemplo:

   ```text
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

3. Lee el mensaje que indica que el catálogo se va a clonar en tu propio Drive y que el original solo se utiliza como fuente.
4. Selecciona **Clonar catálogo maestro** para confirmar. No tienes que elegir un modo ni marcar una casilla u opción.
5. Espera la respuesta. Una solicitud a Google Apps Script puede tardar hasta **un minuto (60 segundos)**. El diálogo impide repetir el envío o cerrarlo mientras se clona.
6. Si la operación tiene éxito, la aplicación actualiza tu catálogo desde el servicio y cierra el diálogo.

Puedes cancelar antes de enviar. Compartir una URL no concede acceso por sí solo; revisa los
permisos con el propietario si la aplicación no puede leer la fuente.

## Después de clonar

Revisa la lista y abre una fuente para consultar su material. Utiliza **Sincronizar Remoto (GET)**
para actualizar los datos cuando lo necesites. Clonar el catálogo maestro no garantiza acceso a
todas las fuentes enlazadas ni hace que el contenido de cada dominio esté disponible localmente de forma automática.

## Si falla la clonación

Comprueba la URL, el inicio de sesión, los permisos de la fuente, la conexión y la dirección
configurada de la aplicación web. El error permanece en el diálogo para revisarlo antes de reintentar.

Si se agota el tiempo de espera, revisa tu Drive y utiliza **Sincronizar Remoto (GET)** antes de
enviar otra clonación. Un timeout del navegador no demuestra que el script del servidor se haya
detenido; puede haber creado ya la copia. No envíes repetidamente la misma clonación mientras siga pendiente.