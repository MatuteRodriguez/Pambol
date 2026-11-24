# PAMBOL · Cambios de la versión 2.0.0

De prototipo con datos fijos de la Jornada 11 a una app lista para lanzar con datos reales.

## Datos reales en lugar de datos fijos
- Se eliminó todo lo fijo de la Jornada 11: calendario, resultados, veda, estadísticas «en vivo», MVPs, historiales, tabla de aficiones y precios en movimiento.
- Torneo, jornadas, partidos, horarios, resultados y actas se leen de Supabase. La app calcula sola qué jornada está abierta, cuál se está jugando y cuándo cierra cada jugador.
- Tabla general calculada con los resultados reales; cuadro de Liguilla armado con los 8 primeros (reclasificación en semifinales).
- La ficha del futbolista muestra sus partidos, puntos y estadísticas reales del torneo, y sus próximos 3 rivales con la dificultad según la tabla.
- Puntos en vivo por jugador y desglose («acta») tomados del servidor.
- Se quitó el uso de azar en datos y puntos. Solo quedan efectos visuales (confeti, sonidos).

## Cuentas reales
- Registro con correo y contraseña, confirmación por correo, recuperación de contraseña, perfil editable y botón «Borrar mi cuenta y mis datos».
- La llave pública de Supabase viene preconfigurada en `js/config.js`; ya no se le pide a cada usuario.
- Antes cualquier contraseña «entraba» y el registro no creaba la cuenta en el servidor.
- Inicio de sesión con Google opcional (se activa en la configuración).

## Seguridad y reglas en el servidor
- Nadie puede editar sus propios puntos, rankings ni resultados (antes se podía).
- El servidor valida cada equipo: 11 titulares + 4 suplentes (uno por posición) + DT, formación 4-3-3 / 3-4-3 / 3-3-4, tope de 100.0 Varos, máximo 3 titulares y 5 jugadores por club, capitán titular, máximo 2 modificadores (1 por jugador) y comodines una vez por torneo.
- Veda por jugador: no se puede meter, sacar, nombrar capitán ni cambiar el modificador de un jugador cuyo partido ya empezó. Los comodines se cierran con el primer partido de la jornada.
- La quiniela de cada partido se cierra al silbatazo y nadie ve los pronósticos ajenos antes de ese momento. Los equipos ajenos solo se pueden ver a partir de que empieza la jornada.
- Cambios: 2 gratis por jornada y −4 por cada extra, calculados en el servidor.
- Solo las cuentas administradoras pueden cargar calendario, actas y precios.

## Motor de puntos
- Implementa el reglamento completo: minutos, goles por posición, penal, gol de visitante, gol de oro, asistencias y pre-asistencias, balón parado, valla invicta, atajadas, penales atajados y fallados, tarjetas, DT (+6 / +2), Hachero, Chulada, El Paro, Ley del Ex, Revulsivo, capitán x2, Triple Capitán x3, Banca Blindada, Fecha Libre.
- Cambio automático: si un titular no juega, entra el suplente de su posición.
- Quien no guarda equipo juega con el de la jornada anterior (sin modificadores ni comodín).
- Quiniela 5-3-0 y +20 por acertar al campeón.

## Ligas y rankings reales
- Ligas privadas en el servidor con código de 6 caracteres y enlace de invitación por WhatsApp (`?liga=CÓDIGO`).
- Tabla de la liga, modo Cara a Cara con calendario automático y Vestuario (mensajes) reales. Se puede salir de una liga o borrarla.
- Ranking nacional, perfil con posición y puntos reales, peñas por club favorito y Diario Pambolero (Once ideal, DT de la fecha, Hachero de oro y Tronco) calculados con los datos de la jornada.
- Logros calculados con tu historial real.

## Panel de administración (`admin.html`)
- Jornadas: crear, calcular puntos, cerrar y reabrir.
- Calendario: alta, edición e importación por CSV.
- Actas por partido con todas las estadísticas del reglamento.
- Jugadores (precio, situación, nota, ex clubes, alta de nuevos, carga masiva) y DTs.
- Torneo: cierre del pronóstico de campeón, campeón oficial (+20), torneo actual y nuevos torneos.

## App instalable y actualizaciones
- Nuevo service worker: siempre carga la versión más reciente con internet y funciona sin conexión. Aviso «Hay una nueva versión · Actualizar». El anterior nunca se registraba y, de hacerlo, dejaba la app vieja para siempre.
- Íconos reales de 192 y 512 px (incluido el adaptable de Android), ícono para iPhone, imagen para compartir en redes y descripción para buscadores.
- `netlify.toml` con encabezados para no guardar versiones viejas y ocultar el panel a buscadores.

## Arreglos de errores
- `showToast` no existía y rompía varias acciones.
- El reloj de cierre creaba un temporizador nuevo en cada vuelta.
- Los botones para ordenar el mercado no hacían nada.
- El costo del DT estaba fijo en 4.8 V aunque eligieras otro.
- Estadísticas «en vivo» con jugadores que no correspondían a tu alineación.
- El calendario fijo incluía a Mazatlán, que no está entre los 18 clubes; ahora el calendario se carga desde el panel.
- Textos del reglamento corregidos (plantel de 15 + DT, cambios y cambio automático).

## Legal y marca
- Aviso de Privacidad (LFPDPPP) y Términos en plantilla para completar.
- Se quitaron las menciones a «Liga BBVA MX» y «plataforma oficial»; se aclara que es un juego independiente de aficionados.

## Organización del código
- El `index.html` de 760 KB se separó en `css/`, `js/data.js` (catálogo), `js/app.js` (interfaz original), `js/cloud.js` (datos y reglas) y `js/cloud-ui.js` (pantallas conectadas).
- Se eliminaron `pambol_app.html` (copia duplicada) y el esquema viejo. Las imágenes pasaron de 3.8 MB a menos de 0.6 MB.
