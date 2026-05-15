-- ================================================
-- Tu Proceso Legal — Database Schema
-- Version: 1.0.0
-- Engine: PostgreSQL 15 (Supabase)
--
-- Run order:
--   01_schema.sql  ← this file
--   02_rls.sql
--   03_seed_codes.sql
-- ================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── profiles ─────────────────────────────────────
-- Extended user data auto-created on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  phone           text,
  legal_interests text[]      NOT NULL DEFAULT '{}',
  quiz_branch_1   text,
  quiz_branch_2   text,
  quiz_branch_3   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row whenever a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── conversations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT 'Nueva consulta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text        NOT NULL,
  input_tokens    integer     NOT NULL DEFAULT 0,
  output_tokens   integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── quiz_results ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  text,
  branch_1    text        NOT NULL,
  branch_2    text,
  branch_3    text,
  scores      jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- ── user_documents ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_documents (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  file_path  text        NOT NULL,
  file_type  text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── legal_codes ───────────────────────────────────
-- Catalog of Panamanian legal codes.
CREATE TABLE IF NOT EXISTS public.legal_codes (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_key     text        UNIQUE NOT NULL,
  name         text        NOT NULL,
  branch       text        NOT NULL,
  description  text,
  official_url text,
  is_active    boolean     NOT NULL DEFAULT true,
  last_revised date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── legal_articles ────────────────────────────────
-- Individual articles from each code, with full-text search.
CREATE TABLE IF NOT EXISTS public.legal_articles (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id        uuid        NOT NULL REFERENCES public.legal_codes(id) ON DELETE CASCADE,
  article_number text        NOT NULL,
  title          text,
  content        text        NOT NULL,
  branch         text,
  keywords       text[]      NOT NULL DEFAULT '{}',
  search_vector  tsvector,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, article_number)
);

-- Full-text search: keep search_vector in sync automatically.
CREATE OR REPLACE FUNCTION public.update_article_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'spanish',
    coalesce(NEW.title,   '') || ' ' ||
    coalesce(NEW.content, '') || ' ' ||
    coalesce(array_to_string(NEW.keywords, ' '), '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_article_search ON public.legal_articles;
CREATE TRIGGER trg_article_search
  BEFORE INSERT OR UPDATE ON public.legal_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_article_search_vector();

-- ── query_analytics ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.query_analytics (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    text,
  branch        text,
  query_summary text,
  input_tokens  integer     NOT NULL DEFAULT 0,
  output_tokens integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_user    ON public.conversations    (user_id,          updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv         ON public.messages         (conversation_id,  created_at  ASC);
CREATE INDEX IF NOT EXISTS idx_quiz_user             ON public.quiz_results     (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_session          ON public.quiz_results     (session_id);
CREATE INDEX IF NOT EXISTS idx_legal_articles_search ON public.legal_articles   USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_legal_articles_code   ON public.legal_articles   (code_id);
CREATE INDEX IF NOT EXISTS idx_legal_articles_branch ON public.legal_articles   (branch);
CREATE INDEX IF NOT EXISTS idx_analytics_branch      ON public.query_analytics  (branch);
CREATE INDEX IF NOT EXISTS idx_analytics_date        ON public.query_analytics  (created_at DESC);
