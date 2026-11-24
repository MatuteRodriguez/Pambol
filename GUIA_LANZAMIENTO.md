# PAMBOL v2 · Guía de lanzamiento

Esta guía te lleva de cero a la app publicada. Calcula unos 30 minutos la primera vez. No necesitas instalar nada en tu computadora: todo se hace en Supabase, GitHub y Netlify desde el navegador.

---

## 1. Base de datos (Supabase)

Entra a tu proyecto en supabase.com → **SQL Editor** → **New query**. Pega y ejecuta (botón **Run**) estos archivos de la carpeta `supabase/`, **en este orden**:

| Archivo | Qué hace | ¿Cuándo? |
|---|---|---|
| `00_reset_legacy.sql` | Borra las tablas del esquema viejo (`supabase_schema.sql`). | Solo si alguna vez ejecutaste el esquema viejo. Si tu proyecto está vacío, sáltalo. |
| `01_schema.sql` | Crea tablas, reglas de seguridad, validaciones y el motor de puntos. | Siempre. Se puede volver a ejecutar sin perder datos (úsalo así para futuras actualizaciones). |
| `02_seed.sql` | Carga el torneo Clausura 2027, los 18 clubes, 406 jugadores y 18 DTs. | Una vez. Si lo vuelves a ejecutar, regresa precios y datos de jugadores a los originales. |

Si alguno marca error, copia el mensaje y compártelo; no sigas con el siguiente.

## 2. Pegar la llave pública

1. En Supabase ve a **Project Settings → API**.
2. Copia la llave **anon / public** (empieza con `eyJ…`). **No** uses la `service_role`.
3. Abre `js/config.js` y reemplaza `PEGA_AQUI_TU_ANON_KEY` por esa llave.
4. Revisa que `SUPABASE_URL` sea la URL de tu proyecto y `SITE_URL` la dirección de tu sitio en Netlify.

La anon key es pública por diseño: lo que protege los datos son las reglas del archivo `01_schema.sql`. Sin la llave, la app funciona en «modo sin conexión» (solo armar equipo en el teléfono).

## 3. Cuentas y correos (Supabase → Authentication)

1. **URL Configuration**
   - *Site URL*: `https://rainbow-tiramisu-973ed7.netlify.app` (o tu dominio).
   - *Redirect URLs*: agrega la misma dirección y `https://rainbow-tiramisu-973ed7.netlify.app/**`.
2. **Providers → Email**: deja activado *Confirm email*.
3. **Correo (muy importante antes de anunciar)**: el servicio de correo incluido en Supabase solo permite enviar unos pocos correos por hora. Con más de un puñado de registros, los correos de confirmación dejarán de llegar. Configura un SMTP propio en **Project Settings → Authentication → SMTP Settings** (por ejemplo Resend, Brevo o SendGrid, que tienen planes gratuitos).
4. **Email Templates** (opcional): traduce al español los textos de «Confirm signup» y «Reset password».
5. **Google** (opcional): si quieres «Continuar con Google», configúralo en *Providers → Google* y luego cambia `ENABLE_GOOGLE_LOGIN` a `true` en `js/config.js`.

## 4. Hazte administrador

1. Abre la app publicada y crea tu cuenta normal (y confírmala desde tu correo).
2. En **SQL Editor** ejecuta, con tu correo:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'TU_CORREO@ejemplo.com';
```

3. Entra a `https://TU-SITIO/admin.html` con la misma cuenta. En tu perfil dentro de la app también aparece el botón «Abrir panel de administración».

Puedes dar de alta a más administradores con la misma instrucción.

## 5. Cargar el calendario

En `admin.html` → **Calendario** → «Importar calendario (CSV)». Pega una línea por partido:

```
jornada,local,visita,fecha,hora,estadio,fase
1,TOL,CHI,2027-01-09,19:00,Estadio Nemesio Diez,regular
1,AME,MTY,2027-01-10,19:05,,regular
```

- Hora del centro de México.
- Clubes con su clave (AME, CHI, CAZ, TIG, MTY, TOL, PUM, PAC, SAN, LEO, ATS, NEC, ADSL, TIJ, JUA, PUE, QRO, ATL) o su nombre (Chivas, América, Rayados, Xolos, etc.).
- Las jornadas que no existan se crean solas. Hay una plantilla en `supabase/plantilla_calendario.csv` que puedes llenar en Excel o Google Sheets y guardar como CSV.
- Si cambia un horario o se pospone un partido, edítalo en la misma pestaña.

La app sola detecta qué jornada está abierta, cuándo cierra cada jugador (al silbatazo de su partido) y qué jornada se está jugando. Ya no hay nada fijo en el código.

> Nota: el archivo de datos incluye a Atlante entre los 18 clubes (no a Mazatlán). Si la plantilla real de clubes del torneo es distinta, avísame y la ajusto, o edítala desde el panel.

## 6. La operación de cada jornada

**Antes de la jornada (precios y lesiones)**
1. **Jugadores** → «Nueva semana de cotizaciones» (guarda los precios actuales como base de las flechas ▲▼).
2. Ajusta precios, situación (titular probable, en duda, lesionado…) y nota visible. Para muchos cambios usa la carga masiva `id,precio,situación,nota`.

**Durante y después de cada partido (actas)**
1. **Actas** → elige jornada y partido.
2. Captura marcador y estado (Final).
3. Llena solo a los jugadores que jugaron: minutos, titular, goles, asistencias, atajadas, tarjetas, faltas, regates, etc. Las casillas vacías son 0. Pasa el cursor sobre cada columna para ver qué significa.
4. «Guardar acta y marcador». El servidor calcula los puntos base de cada jugador.
5. Pulsa «Recalcular puntos de la jornada» cuando quieras que los usuarios vean sus puntos actualizados (puedes hacerlo tras cada partido).

**Al terminar la jornada**
- **Jornadas** → «Calcular y cerrar». Esto: arrastra el equipo de quien no guardó, aplica cambios automáticos, capitán, modificadores, comodines y DT, puntúa la quiniela (5-3-0), cierra la jornada y actualiza el ranking nacional y las ligas.
- ¿Error en un acta? «Reabrir», corrige y vuelve a «Calcular y cerrar».

**Liguilla**
- Crea las jornadas de Liguilla con nombre (ej. «Cuartos de Final») y marca sus partidos con la fase.
- **Torneo** → pon el «Cierre del pronóstico de campeón» (inicio del primer partido de Cuartos). Antes de esa fecha los usuarios pueden armar su cuadro pero no guardarlo.
- Al terminar la Final: **Torneo** → «Definir campeón y dar +20».

## 7. Publicar (GitHub → Netlify)

1. En tu repositorio `MatuteRodriguez/Pambol`, **reemplaza todo el contenido** por el de esta carpeta (puedes borrar los archivos viejos y subir los nuevos con «Add file → Upload files»).
   - Ya no se usan: `pambol_app.html`, `supabase_schema.sql`, `pambol_logo_badge.png`, `pambol_logo_header.png` y las imágenes grandes de `assets/` (los logos quedaron optimizados en `assets/brand/`).
2. Netlify publica solo. El archivo `netlify.toml` ya configura que la app no se quede vieja en el navegador.
3. **En cada actualización futura**, sube el número de `VERSION` en `sw.js` (ej. `pambol-2.0.1`). Así, quien tenga la app instalada verá el aviso «Hay una nueva versión · Actualizar».

## 8. Páginas legales

Antes de anunciar, abre `privacidad.html` y `terminos.html` y reemplaza lo que está entre corchetes y resaltado: nombre del responsable, domicilio, correo de contacto y fecha. Son plantillas razonables para México (LFPDPPP), pero conviene que las revise un abogado.

## 9. Prueba final (10 minutos)

1. Abre el sitio en el celular: debe decir «Clausura 2027 · Jornada 1» arriba y la cuenta regresiva del cierre.
2. Crea una cuenta nueva, confirma el correo, entra.
3. Arma tu equipo y pulsa «Guardar equipo». Prueba a meter 4 titulares del mismo club: el servidor debe rechazarlo.
4. Llena la quiniela y guárdala.
5. Crea una liga privada y ábrela desde otro teléfono con el enlace «Invitar».
6. En `admin.html`, captura un acta de prueba y «Calcular puntos»; revisa que se vean en la app. (Luego bórrala.)
7. En Chrome del celular: menú → «Instalar app».

## 10. Lo que queda pendiente o es manual

- **Las estadísticas se capturan a mano** en el panel. No hay un proveedor de datos automático conectado; si después contratas uno (API-Football, Sportmonks, etc.) se puede conectar para llenar las actas solo.
- **Cláusulas de rescisión y subastas** quedaron desactivadas («Próximamente»): necesitan reglas de negocio que conviene definir contigo.
- **Recordatorios**: el botón de alertas descarga un archivo de calendario con alarma 2 horas antes de cada cierre. Las notificaciones push reales requieren un servicio adicional.
- **Capitán que no juega**: entra su suplente, pero el brazalete no pasa a otro jugador (no hay vicecapitán). Se puede agregar si lo quieres.
