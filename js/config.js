// =====================================================================
// PAMBOL · CONFIGURACIÓN PÚBLICA
// ---------------------------------------------------------------------
// Este es el ÚNICO archivo que tienes que editar para lanzar.
// La "anon key" de Supabase es pública por diseño: la seguridad real
// vive en las reglas (RLS) de supabase/01_schema.sql.
// Nunca pongas aquí la "service_role key".
// =====================================================================
window.PAMBOL_CONFIG = {
  // Supabase → Project Settings → API → Project URL
  SUPABASE_URL: 'https://kuefmqevdfkigubjatim.supabase.co',
  // Supabase → Project Settings → API → Project API keys → anon / public
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZWZtcWV2ZGZraWd1YmphdGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDA0NDQsImV4cCI6MjEwNjk3NjQ0NH0.XrDiFcADTj7vw538-1RY9fvO3ISzN582CZ7JS2JdYgQ',
  // Dirección pública de la app (para enlaces de invitación y correos)
  SITE_URL: 'https://rainbow-tiramisu-973ed7.netlify.app',
  // Actívalo solo después de configurar Google en Supabase → Authentication → Providers
  ENABLE_GOOGLE_LOGIN: false,
  // Zona horaria para mostrar horarios de partidos
  TIMEZONE: 'America/Mexico_City',
  APP_VERSION: '2.0.0'
};
