-- ================================================
-- Tu Proceso Legal — Row Level Security Policies
-- Version: 1.0.0
--
-- Apply AFTER 01_schema.sql
-- ================================================

-- Enable RLS on every table.
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_articles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_analytics   ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────
-- Each user can only read and write their own profile.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── conversations ─────────────────────────────────
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
CREATE POLICY "conversations_delete_own"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ── messages ──────────────────────────────────────
-- A user can only access messages inside their own conversations.
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
        AND user_id = auth.uid()
    )
  );

-- ── quiz_results ──────────────────────────────────
-- Anyone (even anonymous) can insert; only owners can read.
DROP POLICY IF EXISTS "quiz_select_own" ON public.quiz_results;
CREATE POLICY "quiz_select_own"
  ON public.quiz_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_insert_any" ON public.quiz_results;
CREATE POLICY "quiz_insert_any"
  ON public.quiz_results FOR INSERT
  WITH CHECK (true);

-- ── user_documents ────────────────────────────────
DROP POLICY IF EXISTS "docs_select_own" ON public.user_documents;
CREATE POLICY "docs_select_own"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "docs_insert_own" ON public.user_documents;
CREATE POLICY "docs_insert_own"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "docs_delete_own" ON public.user_documents;
CREATE POLICY "docs_delete_own"
  ON public.user_documents FOR DELETE
  USING (auth.uid() = user_id);

-- ── legal_codes & legal_articles ──────────────────
-- Public read-only — no authentication required.
DROP POLICY IF EXISTS "legal_codes_read_all" ON public.legal_codes;
CREATE POLICY "legal_codes_read_all"
  ON public.legal_codes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "legal_articles_read_all" ON public.legal_articles;
CREATE POLICY "legal_articles_read_all"
  ON public.legal_articles FOR SELECT
  USING (true);

-- ── query_analytics ───────────────────────────────
-- Backend may insert from any session; no one can read via client.
DROP POLICY IF EXISTS "analytics_insert" ON public.query_analytics;
CREATE POLICY "analytics_insert"
  ON public.query_analytics FOR INSERT
  WITH CHECK (true);
