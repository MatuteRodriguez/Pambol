# ⚽ PAMBOL · Liga MX Fantasy & Quiniela Oficial 🇲🇽

Plataforma web PWA para la afición mexicana (Apertura 2026), combinando mecánicas tácticas de Winning y Gran DT adaptadas a la Liga BBVA MX.

---

## 🚀 Despliegue Continuo Automático en Netlify

Este repositorio está 100% configurado para conectarse a **Netlify** y desplegarse en segundos de forma automática cada vez que hagas un commit o push en GitHub.

### Paso 1: Crear o subir este repositorio a GitHub
1. Crea un nuevo repositorio en tu cuenta de GitHub (ej. `pambol-ligamx`).
2. Sube los archivos de este proyecto (o inicializa git y haz push).

### Paso 2: Vincular con tu sitio en Netlify
1. Ingresa a tu panel en [Netlify](https://app.netlify.com).
2. Selecciona tu sitio actual: **`rainbow-tiramisu-973ed7`** (o crea un sitio nuevo con *Add new site* -> *Import an existing project*).
3. Ve a **Site configuration** -> **Build & deploy** -> **Continuous deployment**.
4. Haz clic en **Link repository** y autoriza tu cuenta de GitHub para seleccionar `pambol-ligamx`.
5. Configura los parámetros de build:
   - **Branch to deploy:** `main` (o `master`)
   - **Build command:** *(dejar vacío)*
   - **Publish directory:** `.` *(directorio raíz)*
6. Haz clic en **Save / Deploy site**.

¡Listo! A partir de ese momento, **cada cambio que se guarde en GitHub activará Netlify automáticamente** y actualizará la web en línea en menos de 10 segundos, sin necesidad de arrastrar archivos manualmente nunca más.

---

## 📁 Estructura del Repositorio

* `index.html`: Aplicación web completa PAMBOL (Mobile-first PWA, CSS, JS, SVG).
* `_redirects`: Regla de redirección SPA para Netlify (`/* /index.html 200`).
* `netlify.toml`: Configuración de headers, caché PWA y redirects.
* `manifest.json`: Manifiesto Web App para instalación en iOS / Android.
* `sw.js`: Service Worker para funcionamiento offline.
* `REGLAMENTO_PAMBOL.md`: Reglamento normativo oficial de PAMBOL.
* `supabase_schema.sql`: Esquema PostgreSQL con RLS para autenticación y guardado en nube.
* `README.md`: Documentación del proyecto.
