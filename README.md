# PAMBOL · Fantasy y Quiniela Liga MX

PWA en HTML, CSS y JavaScript sin paso de compilación. Datos y reglas en Supabase; publicada en Netlify.

- **Cómo lanzar y operar:** [GUIA_LANZAMIENTO.md](GUIA_LANZAMIENTO.md)
- **Qué cambió en la v2:** [CHANGELOG.md](CHANGELOG.md)

## Estructura
| Ruta | Contenido |
|---|---|
| `index.html` | La app |
| `admin.html`, `js/admin.js` | Panel de administración (solo cuentas en `app_admins`) |
| `js/config.js` | URL y llave pública de Supabase, URL del sitio |
| `js/data.js` | Catálogo para modo sin conexión |
| `js/app.js` | Interfaz (cancha, mercado, modales, efectos) |
| `js/cloud.js` | Carga de datos, sesión, guardado de equipo, jornada actual, puntos en vivo |
| `js/cloud-ui.js` | Quiniela, tabla, liguilla, cuenta, ligas, rankings, diario, ficha |
| `supabase/01_schema.sql` | Tablas, RLS, validaciones y motor de puntos (idempotente) |
| `supabase/02_seed.sql` | Torneo, clubes, jugadores y DTs iniciales |
| `sw.js` | Service worker (red primero). Sube `VERSION` en cada despliegue |

Los scripts de `js/` se cargan en orden y comparten el ámbito global: `cloud.js` y `cloud-ui.js` reemplazan funciones de `app.js` con el mismo nombre.
