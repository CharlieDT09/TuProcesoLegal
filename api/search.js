// ================================================
// Tu Proceso Legal — Búsqueda semántica
// Vercel Function: /api/search
// Usado por la Biblioteca Jurídica (JuriTools)
//
// Modos:
//   1. browse: sin query, filtra por codigo_name directo en Supabase
//   2. search: con query, búsqueda semántica con Voyage AI + pgvector
// ================================================

const { checkRateLimit } = require('../lib/rate-limit');

const RAG_MATCH_COUNT  = 12;
const RAG_THRESHOLD    = 0.38;   // umbral más permisivo para términos cortos
const RATE_LIMIT_SEARCH = 30;    // 30 búsquedas cada hora por IP
const RATE_WINDOW_HRS   = 1;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido' });

  const { query, match_count = RAG_MATCH_COUNT, codigo_filter, mode = 'search', offset = 0 } = req.body || {};

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const voyageKey    = process.env.VOYAGE_API_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return res.status(503).json({ error: 'Servicio no configurado' });
  }

  const PAGE_SIZE = 20;
  const limit     = Math.min(Number(match_count) || PAGE_SIZE, 50);
  const pageOffset = Math.max(Number(offset) || 0, 0);

  // ── Rate limiting (por IP — endpoint sin auth) ──
  const rl = await checkRateLimit({
    req, supabaseUrl, supabaseAnon,
    prefix:    'search',
    limit:     RATE_LIMIT_SEARCH,
    windowHrs: RATE_WINDOW_HRS,
  });
  if (!rl.allowed) {
    return res.status(429).json({
      error:   `Demasiadas búsquedas. Intenta de nuevo en una hora.`,
      resetAt: rl.resetAt,
    });
  }

  try {

    // ── MODO BROWSE: navegar por código sin query ──
    if (mode === 'browse' || !query || query.trim().length < 2) {
      if (!codigo_filter || codigo_filter === 'Todos') {
        return res.status(400).json({ error: 'Selecciona un código para explorar' });
      }

      const params = new URLSearchParams({
        select:      'id,codigo_name,section,article_num,content',
        codigo_name: `eq.${codigo_filter}`,
        limit:       String(limit + 1),   // pedimos 1 extra para saber si hay más
        offset:      String(pageOffset),
        order:       'id.asc',
      });

      const browseRes = await fetch(`${supabaseUrl}/rest/v1/legal_documents?${params}`, {
        headers: {
          'apikey':        supabaseAnon,
          'Authorization': `Bearer ${supabaseAnon}`,
        },
      });

      if (!browseRes.ok) throw new Error(`Supabase browse error: ${browseRes.status}`);
      const allArticles = await browseRes.json();

      // Si trajimos limit+1, hay más páginas
      const hasMore  = allArticles.length > limit;
      const articles = hasMore ? allArticles.slice(0, limit) : allArticles;
      const result   = articles.map(a => ({ ...a, similarity: null }));

      return res.status(200).json({
        articles:   result,
        total:      result.length,
        hasMore,
        nextOffset: pageOffset + result.length,
        mode:       'browse',
      });
    }

    // ── MODO ARTICLE LOOKUP: búsqueda por número exacto ──
    // Detecta patrones como "articulo 403", "art. 15", "artículo 1234"
    const articleMatch = query.trim().match(/art[íi]culo?\.?\s*(\d+[\w\-]*)/i);
    if (articleMatch) {
      const artNum = articleMatch[1];
      const qs = new URLSearchParams({
        select:      'id,codigo_name,section,article_num,content',
        article_num: `ilike.*${artNum}*`,
        limit:       String(limit),
        order:       'id.asc',
      });
      if (codigo_filter && codigo_filter !== 'Todos') {
        qs.set('codigo_name', `eq.${codigo_filter}`);
      }
      const artRes = await fetch(`${supabaseUrl}/rest/v1/legal_documents?${qs}`, {
        headers: { 'apikey': supabaseAnon, 'Authorization': `Bearer ${supabaseAnon}` },
      });
      if (!artRes.ok) throw new Error(`Supabase article lookup: ${artRes.status}`);
      const artRows = await artRes.json();
      if (artRows.length > 0) {
        return res.status(200).json({
          articles: artRows.map(a => ({ ...a, similarity: null })),
          total:    artRows.length,
          mode:     'article_lookup',
        });
      }
      // Si no encontró por número, cae a búsqueda semántica
    }

    // ── MODO SEARCH: búsqueda semántica ───────────
    if (!voyageKey) {
      return res.status(503).json({ error: 'Servicio de búsqueda no configurado' });
    }

    // 1. Embedding con Voyage AI
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
    const embData   = await embRes.json();
    const embedding = embData.data?.[0]?.embedding;
    if (!embedding) throw new Error('Sin embedding de Voyage AI');

    // 2. Búsqueda vectorial en Supabase
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
        match_count:     limit,
      }),
    });

    if (!searchRes.ok) throw new Error(`Supabase search error: ${searchRes.status}`);
    let articles = await searchRes.json();

    // 3. Filtro por código si aplica
    if (codigo_filter && codigo_filter !== 'Todos') {
      articles = articles.filter(a => a.codigo_name === codigo_filter);
    }

    return res.status(200).json({ articles, total: articles.length, mode: 'search' });

  } catch (err) {
    console.error('[search] Error:', err.message);
    return res.status(502).json({ error: err.message || 'Error de búsqueda' });
  }
};
