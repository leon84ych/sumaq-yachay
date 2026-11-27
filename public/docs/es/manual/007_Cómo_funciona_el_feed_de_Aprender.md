# Cómo funciona el feed de Aprender

La vista **Aprender** reúne entradas individuales de tus libros. Elige qué mostrar según la
búsqueda, el tiempo transcurrido desde que se mostró una entrada y su intervalo de repaso.

## Qué puede aparecer

Aprender incluye conceptos, citas, pasajes, personajes, lugares, eventos, relaciones, asociaciones
y entradas del glosario. Las entradas de Índice y las preguntas no aparecen en este feed; las
preguntas están disponibles en **Cuestionario** y en el dominio Preguntas.

Aprender comienza con las entradas disponibles en este dispositivo. Cuando hay acceso remoto,
puede cargar contenido adicional mientras sigues desplazándote. La búsqueda compartida actual
filtra las entradas antes de seleccionarlas.

## Cómo se seleccionan las entradas

1. Aprender busca entradas que coincidan con la búsqueda y aún no hayan aparecido en el feed actual.
2. Da prioridad a las entradas **pendientes de repaso**: las que nunca se han mostrado o aquellas
   cuyo intervalo ya ha transcurrido desde la última vez que se mostraron.
3. Si no hay suficientes entradas pendientes para completar un lote, también pueden aparecer
   entradas cuyo intervalo aún no ha terminado. El intervalo es una prioridad, **no una garantía**
   de que la entrada permanezca oculta durante todos esos días.
4. Las entradas candidatas se mezclan y se intenta incluir distintos dominios en cada lote.
   No se garantiza un orden desde la entrada más antigua.

Los resultados llegan en lotes de hasta 20, pero **el feed no se limita a 20 entradas en total**.
Desplázate hacia el final para cargar más automáticamente; no hay un botón habitual para cargar más. Se muestra un mensaje si no hay
resultados o se llega al final del feed. Si la carga falla, utiliza la opción para reintentar.
Al cambiar la búsqueda comienza un feed nuevo, por lo que una entrada anterior puede volver a
aparecer si coincide con la nueva búsqueda.

## Qué ocurre al mostrar una entrada

Cada entrada tiene una fecha de **última visualización** y un **intervalo** en días. Al añadir
un lote a Aprender, la aplicación guarda la hora actual para todas sus entradas, incluso las que
están más abajo y todavía no has visto al desplazarte. Una entrada sin intervalo comienza con
un intervalo de un día.

El intervalo utiliza potencias de dos: 1, 2, 4, 8, 16, 32, 64, 128 y 256 días de forma
predeterminada. El mínimo es un día. El máximo predeterminado es 256 días; la aplicación puede
configurarlo con otra potencia de dos positiva, pero actualmente no hay un control para ello en
el panel de configuración.

Si no seleccionas una acción de repaso y la entrada vuelve a mostrarse después de que transcurra
su intervalo, este se duplica hasta el máximo configurado. No se duplica en la primera
visualización ni cuando se muestra antes de estar pendiente. Mostrarla antes de tiempo sí
actualiza la última visualización, que sirve de inicio para el siguiente cálculo.

## Indica si recordabas la entrada

Cada tarjeta de Aprender tiene dos botones de repaso junto al botón para descargar la imagen:

- **Reloj — olvidado:** aumenta el contador de olvidos y reduce el intervalo a la mitad, hasta
  un mínimo de un día.
- **Marca de verificación — recordado:** aumenta el contador de aciertos y duplica el intervalo,
  hasta el máximo configurado.

Por ejemplo, con un intervalo de cuatro días, olvidado lo cambia a dos días y recordado a ocho.
La aplicación registra la hora del repaso. No aplica además la duplicación por falta de
interacción en ese mismo período. Tras una selección correcta, ambos botones quedan
deshabilitados y el elegido permanece resaltado mientras la tarjeta siga en el feed.

El siguiente cálculo se basa en cuándo se añadió por última vez la entrada al feed, no en cuándo
pulsaste el botón de repaso. La programación y los datos de repaso se guardan en los datos locales
de este navegador; no se debe asumir que se comparten con otro navegador o dispositivo.

## Si una entrada no aparece

Revisa la búsqueda compartida y elimina los filtros que no quieras. Asegúrate de que el libro y
sus entradas estén disponibles en este dispositivo y desplázate hasta que Aprender indique el
final del feed. Una entrada pendiente tiene prioridad, pero su posición exacta varía según las
demás coincidencias y el orden aleatorio.
