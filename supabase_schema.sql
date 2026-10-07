-- ===================================================
-- PAMBOL LIGA MX · ESQUEMA DE BASE DE DATOS SUPABASE
-- Plataforma Oficial de Fantasy & Quiniela Apertura 2026
-- ===================================================

-- 1. Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  favorite_club TEXT NOT NULL DEFAULT 'Club América',
  avatar_url TEXT,
  total_fantasy_pts INTEGER DEFAULT 0,
  total_quiniela_pts INTEGER DEFAULT 0,
  national_rank INTEGER DEFAULT 18420,
  chips_used JSONB DEFAULT '{"TRIPLE_CAP": false, "FREE_HIT": false, "BENCH_BOOST": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los perfiles son públicos para lectura"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Tabla de Once Fantasy por Jornada
CREATE TABLE IF NOT EXISTS public.fantasy_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  formation TEXT NOT NULL DEFAULT '4-3-3',
  starters JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de IDs de jugadores
  bench JSONB NOT NULL DEFAULT '{}'::jsonb,     -- { GK, DEF, MID, FWD }
  coach_id INTEGER NOT NULL DEFAULT 1,
  captain_id INTEGER NOT NULL,
  active_modifiers JSONB DEFAULT '{}'::jsonb,  -- { playerId: 'HACHERO', ... }
  active_chip TEXT DEFAULT 'NONE',              -- 'TRIPLE_CAP', 'FREE_HIT', 'BENCH_BOOST'
  budget_spent NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  gw_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, gameweek)
);

ALTER TABLE public.fantasy_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipos visibles para lectura pública"
  ON public.fantasy_teams FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios administran su propio equipo"
  ON public.fantasy_teams FOR ALL
  USING (auth.uid() = user_id);

-- 3. Tabla de Pronósticos de Quiniela
CREATE TABLE IF NOT EXISTS public.quiniela_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  fixture_id INTEGER NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  is_exact_match BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, gameweek, fixture_id)
);

ALTER TABLE public.quiniela_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pronósticos visibles para todos tras el inicio de fecha"
  ON public.quiniela_picks FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios administran sus pronósticos"
  ON public.quiniela_picks FOR ALL
  USING (auth.uid() = user_id);

-- 4. Tabla de Ligas Privadas
CREATE TABLE IF NOT EXISTS public.private_leagues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '⚽',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.private_leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ligas visibles con código o para miembros"
  ON public.private_leagues FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ligas"
  ON public.private_leagues FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- 5. Miembros de Ligas Privadas
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES public.private_leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros visibles para todos"
  ON public.league_members FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden unirse a ligas"
  ON public.league_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Trigger para crear perfil automáticamente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, favorite_club)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'favorite_club', 'Club América')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
