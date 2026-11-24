-- =====================================================================
-- PAMBOL · LIMPIEZA DEL ESQUEMA ANTERIOR (v1)
-- Ejecuta este archivo UNA sola vez y solo si instalaste el
-- supabase_schema.sql viejo. La versión anterior de la app nunca creaba
-- cuentas reales, así que estas tablas no tienen datos de usuarios.
-- Si tu proyecto de Supabase está vacío, sáltate este archivo.
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.quiniela_picks cascade;
drop table if exists public.fantasy_teams cascade;
drop table if exists public.league_members cascade;
drop table if exists public.private_leagues cascade;
drop table if exists public.profiles cascade;
