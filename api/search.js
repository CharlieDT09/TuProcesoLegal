// ================================================
// Tu Proceso Legal — Búsqueda semántica
// Vercel Function: /api/search
// Usado por la Biblioteca Jurídica (JuriTools)
// ================================================

const RAG_MATCH_COUNT = 12;
const RAG_THRESHOLD   = 0.42;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido' });

  const { query, match_count = RAG_MATCH_COUNT, codigo_filter } = req.body || {};

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'Consulta muy corta' });
  }

  const voyageKey   = process.env.VOYAGE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;

  if (!voyageKey || !supabaseUrl || !supabaseAnon) {
    return res.status(503).json({ error: 'Servicio no configurado' });
  }

  try {
    // ── 1. Embedding con Voyage AI ─────────────────
    const embRes = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        model:      'voyage-law-2',
        input:      query.trim().slice(0, 2000),
        input_type: 'query',
      }),
    });

    if (!embRes.ok) throw new Error(`Voyage AI error: ${embRes.status}`);
    const embData  = await embRes.json();
    const embedding = embData.data?.[0]?.embedding;
    if (!embedding) throw new Error('Sin embedding de Voyage AI');

    // ── 2. Búsqueda en Supabase pgvector ──────────
    const searchRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_legal_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        supabaseAnon,
        'Authorization': `Bearer ${supabaseAnon}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: RAG_THRESHOLD,
        match_count:     Math.min(Number(match_count) || RAG_MATCH_COUNT, 20),
      }),
    });

    if (!searchRes.ok) throw new Error(`Supabase error: ${searchRes.status}`);
    let articles = await searchRes.json();

    // ── 3. Filtro opcional por código ─────────────
    if (codigo_filter && codigo_filter !== 'Todos') {
      articles = articles.filter(a => a.codigo_name === codigo_filter);
    }

    return res.status(200).json({ articles, total: articles.length });

  } catch (err) {
    console.error('[search] Error:', err.message);
    return res.status(502).json({ error: err.message || 'Error de búsqueda' });
  }
};
