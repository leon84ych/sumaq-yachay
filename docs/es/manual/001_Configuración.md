# Configuración

Abre **Configuración** en la navegación superior para ajustar tu espacio de trabajo.

## Apariencia e idioma

- **Tema:** elige Claro u Oscuro. La aplicación y el manual se actualizan juntos.
- **Tamaño del texto:** reduce o aumenta el tamaño de lectura.
- **Idioma:** selecciona inglés o español. El manual cambia a la traducción del mismo tema cuando está disponible.

Estas preferencias se guardan en este navegador.

## Conectar el servicio

1. Busca el campo de **URL de la aplicación web de Google Apps Script** en Configuración.
2. Introduce la dirección de la aplicación web desplegada que te proporcione el administrador. Normalmente tiene este formato:

   ```text
   https://script.google.com/macros/s/DEPLOYMENT_ID/exec
   ```

3. Selecciona **Guardar cambios**.
4. Vuelve a Catálogo y utiliza la sincronización remota **GET** para recuperar los datos si tu rol lo permite.

La URL guardada tiene prioridad sobre el servicio predeterminado. Utiliza la URL de una aplicación web desplegada, no un enlace compartido de Google Sheets. Inicia sesión cuando la operación requiera autenticación.

Las solicitudes a Google Apps Script tienen un tiempo de espera de **un minuto (60 segundos)**.
Espera a que termine la solicitud, especialmente al **Clonar catálogo maestro**; no repitas el envío mientras siga pendiente.

## Probar datos de ejemplo locales

Activa los **datos de ejemplo locales** y confirma el aviso. Los datos y las modificaciones se guardan en este dispositivo; mientras este modo está activo no se envían solicitudes al servidor de la aplicación. Desactívalo para volver a utilizar datos remotos.

## Borrar datos locales

La opción para **eliminar todos los datos locales** borra la base de datos del navegador tras la confirmación. No modifica los datos del servidor. Conserva cualquier trabajo que solo exista localmente y actualiza la página antes de volver a sincronizar.

## Problemas de conexión

Comprueba tu conexión, la URL desplegada, el inicio de sesión y los permisos. Si esperas datos remotos, verifica que el modo de datos de ejemplo locales esté desactivado.