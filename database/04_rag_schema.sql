-- ================================================
-- Tu Proceso Legal — RAG con pgvector
-- Ejecutar en: Supabase → SQL Editor
--
-- Prerrequisito: extensión pgvector ya activa
-- ================================================

-- Habilitar extensión (idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tabla de documentos legales con embeddings ──
CREATE TABLE IF NOT EXISTS legal_documents (
  id           BIGSERIAL    PRIMARY KEY,
  source_file  TEXT         NOT NULL,
  codigo_name  TEXT         NOT NULL,
  section      TEXT         DEFAULT '',
  article_num  TEXT         DEFAULT '',
  content      TEXT         NOT NULL,
  embedding    VECTOR(1536),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Índice HNSW (mejor recall que ivfflat para este tamaño de dataset)
CREATE INDEX IF NOT EXISTS idx_legal_docs_embedding
  ON legal_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice para filtrar por código específico
CREATE INDEX IF NOT EXISTS idx_legal_docs_codigo
  ON legal_documents (codigo_name);

-- ── Función de búsqueda semántica ────────────────
-- Devuelve los artículos más relevantes para un query embedding dado.
-- Usada desde la Netlify Function via RPC.
CREATE OR REPLACE FUNCTION match_legal_documents(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.50,
  match_count      INTEGER DEFAULT 6
)
RETURNS TABLE (
  id           BIGINT,
  codigo_name  TEXT,
  section      TEXT,
  article_num  TEXT,
  content      TEXT,
  similarity   FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ld.id,
    ld.codigo_name,
    ld.section,
    ld.article_num,
    ld.content,
    1 - (ld.embedding <=> query_embedding) AS similarity
  FROM legal_documents ld
  WHERE
    ld.embedding IS NOT NULL
    AND 1 - (ld.embedding <=> query_embedding) > match_threshold
  ORDER BY ld.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── RLS: documentos legales son de lectura pública ──
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (los códigos son públicos)
DROP POLICY IF EXISTS "legal_documents_read_public" ON legal_documents;
CREATE POLICY "legal_documents_read_public"
  ON legal_documents
  FOR SELECT
  USING (true);

-- Solo service role puede escribir (el script de ingesta)
DROP POLICY IF EXISTS "legal_documents_insert_service" ON legal_documents;
CREATE POLICY "legal_documents_insert_service"
  ON legal_documents
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "legal_documents_delete_service" ON legal_documents;
CREATE POLICY "legal_documents_delete_service"
  ON legal_documents
  FOR DELETE
  USING (true);
