// ================================================
// Tu Proceso Legal — Backend con RAG (pgvector)
// Vercel Function: /api/chat
//
// Flujo RAG:
//   1. Recibe mensaje del usuario
//   2. Verifica rate limit (IP para anónimos, user_id para registrados)
//   3. Genera embedding con Voyage AI voyage-law-2
//   4. Busca artículos relevantes en Supabase pgvector
//   5. Inyecta artículos como contexto en el prompt de Claude
//   6. Devuelve respuesta citando artículos reales
//
// Variables de entorno requeridas en Vercel:
//   ANTHROPIC_API_KEY   — Claude API key
//   VOYAGE_API_KEY      — Voyage AI key (voyage-law-2, partner oficial Anthropic)
//   SUPABASE_URL        — URL del proyecto Supabase
//   SUPABASE_ANON_KEY   — anon key (solo lectura de legal_documents)
// ================================================

const MAX_MESSAGE_CHARS  = 2000;
const MAX_HISTORY_MSGS   = 20;
const RAG_MATCH_COUNT    = 6;
const RAG_THRESHOLD      = 0.48;
const DEMO_DELAY_MS      = 1200;

// Rate limiting
const RATE_LIMIT_ANON    = 3;   // mensajes cada 6 h para usuarios sin cuenta
const RATE_LIMIT_AUTH    = 5;   // mensajes cada 6 h para usuarios registrados
const RATE_WINDOW_HOURS  = 6;

const BASE_SYSTEM_PROMPT = `Eres el asistente jurídico de "Tu Proceso Legal", especializado exclusivamente en el derecho de la República de Panamá. Orientas a ciudadanos panameños sobre sus derechos y la legislación vigente.

REGLAS:
1. Basa tus respuestas EN LOS ARTÍCULOS RECUPERADOS que se te proporcionan abajo. Cita siempre el artículo exacto con su número y código de origen.
2. Solo respondes sobre derecho panameño. Si la pregunta no es jurídica o no corresponde a Panamá, declina amablemente.
3. Al final de toda respuesta sobre un caso personal incluye: "⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá."
4. Responde en español formal panameño.
5. Organiza tus respuestas con claridad usando títulos y numeración.
6. Si los artículos recuperados no cubren completamente la pregunta, indícalo y complementa con tu conocimiento general del derecho panameño, pero siempre prioriza los artículos citados.`;

const DEMO_RESPONSES = [
  `Según el **Código de Trabajo de Panamá** (Ley 44 de 1995), el despido sin causa justificada da derecho al trabajador a:

1. **Preaviso** (Art. 67): mínimo 1 semana con menos de 2 años; 2 semanas entre 2 y 5 años; 4 semanas con más de 5 años.
2. **Indemnización** (Art. 225): 3.4 semanas de salario por cada año trabajado.
3. **Décimo tercer mes** proporcional al tiempo laborado.
4. **Vacaciones** proporcionales no disfrutadas.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,

  `De acuerdo con el **Código de la Familia de Panamá**, el proceso de divorcio puede tramitarse de dos formas:

- **Por mutuo acuerdo** (Art. 214): ambas partes presentan solicitud conjunta ante el Juzgado Seccional de Familia.
- **Por causa específica** (Art. 212): incluye adulterio, maltrato, abandono del hogar, entre otras causales legales.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,
];
let demoIndex = 0;


// ════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL (formato Vercel)
// ════════════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = req.body || {};
  const { messages, authToken } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Sin mensajes' });
  }

  for (const msg of messages) {
    if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Formato de mensaje inválido' });
    }
    // Solo validar longitud en mensajes del usuario, no en respuestas del asistente
    if (msg.role === 'user' && msg.content.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `El mensaje supera el límite de ${MAX_MESSAGE_CHARS} caracteres.` });
    }
  }

  const trimmedMessages = messages.length > MAX_HISTORY_MSGS
    ? messages.slice(messages.length - MAX_HISTORY_MSGS)
    : messages;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const voyageKey    = process.env.VOYAGE_API_KEY;
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;

  const hasFullConfig = anthropicKey?.startsWith('sk-ant-') && anthropicKey.length >= 40;

  // ── MODO DEMO (sin API key) → omitir rate limit ───────────────
  if (!hasFullConfig) {
    await sleep(DEMO_DELAY_MS);
    const reply = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
    demoIndex++;
    return res.status(200).json({ reply });
  }

  // ── RATE LIMITING ─────────────────────────────────────────────
  let rateLimitRemaining = null;
  let rateLimitResetAt   = null;

  if (supabaseUrl && supabaseAnon) {
    try {
      let identifier;
      let messageLimit;

      // Si viene token, verificar con Supabase para obtener el user_id
      if (authToken) {
        try {
          const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'apikey': supabaseAnon,
            },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData?.id) {
              identifier   = `user_${userData.id}`;
              messageLimit = RATE_LIMIT_AUTH;
            }
          }
        } catch (err) {
          console.warn('[RateLimit] Error verificando token:', err.message);
        }
      }

      // Sin usuario autenticado → usar IP
      if (!identifier) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.headers['x-real-ip']
          || 'unknown';
        identifier   = `ip_${ip}`;
        messageLimit = RATE_LIMIT_ANON;
      }

      // Verificar e incrementar vía RPC atómica
      const rlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        supabaseAnon,
          'Authorization': `Bearer ${supabaseAnon}`,
        },
        body: JSON.stringify({
          p_identifier: identifier,
          p_limit:      messageLimit,
          p_window_hrs: RATE_WINDOW_HOURS,
        }),
      });

      if (rlRes.ok) {
        const rl = await rlRes.json();
        if (!rl.allowed) {
          return res.status(429).json({
            error:     `Has alcanzado el límite de ${messageLimit} consultas cada ${RATE_WINDOW_HOURS} horas.`,
            resetAt:   rl.reset_at,
            remaining: 0,
          });
        }
        rateLimitRemaining = rl.remaining;
        rateLimitResetAt   = rl.reset_at;
      }
    } catch (err) {
      // Fallo en rate limit → permitir el mensaje (fail open)
      console.error('[RateLimit] Error:', err.message);
    }
  }

  // ── PASO 1: RAG — recuperar artículos relevantes ──────────────
  let ragContext = '';
  const ragAvailable = voyageKey && supabaseUrl && supabaseAnon;

  if (ragAvailable) {
    try {
      const userQuery = trimmedMessages
        .filter(m => m.role === 'user')
        .slice(-1)[0]?.content || '';

      if (userQuery) {
        const articles = await retrieveRelevantArticles(
          userQuery, voyageKey, supabaseUrl, supabaseAnon
        );
        if (articles.length > 0) {
          ragContext = buildRagContext(articles);
        }
      }
    } catch (err) {
      console.error('[RAG] Error en búsqueda vectorial:', err.message);
    }
  }

  // ── PASO 2: System prompt con contexto RAG ────────────────────
  const systemPrompt = ragContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${ragContext}`
    : `${BASE_SYSTEM_PROMPT}\n\n[NOTA: La búsqueda semántica no está disponible. Responde con tu conocimiento general del derecho panameño.]`;

  // ── PASO 3: Llamar a Claude ───────────────────────────────────
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   trimmedMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Error ${anthropicRes.status}`;
      if (anthropicRes.status === 401) return res.status(502).json({ error: 'API key inválida. Verifica ANTHROPIC_API_KEY en Vercel.' });
      if (anthropicRes.status === 429) return res.status(429).json({ error: 'Servicio temporalmente sobrecargado. Intenta en unos minutos.' });
      if (anthropicRes.status === 403) return res.status(502).json({ error: 'Sin acceso. Verifica que tu cuenta tenga créditos activos.' });
      return res.status(502).json({ error: `Error de Anthropic (${anthropicRes.status}): ${msg}` });
    }

    const data  = await anthropicRes.json();
    const reply = data.content?.find(b => b.type === 'text')?.text || 'Sin respuesta.';
    const usage = data.usage || { input_tokens: 0, output_tokens: 0 };

    return res.status(200).json({
      reply,
      usage,
      rag_articles: ragContext ? RAG_MATCH_COUNT : 0,
      remaining:    rateLimitRemaining,
      resetAt:      rateLimitResetAt,
    });

  } catch {
    return res.status(502).json({ error: 'Error de conexión con el servidor. Intenta de nuevo.' });
  }
};


// ════════════════════════════════════════════════════════════════
// RAG — Búsqueda semántica en Supabase pgvector
// ════════════════════════════════════════════════════════════════

async function retrieveRelevantArticles(query, voyageKey, supabaseUrl, supabaseAnon) {
  const embeddingRes = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${voyageKey}`,
    },
    body: JSON.stringify({
      model:      'voyage-law-2',
      input:      query.replace(/\n/g, ' ').slice(0, 16000),
      input_type: 'query',
    }),
  });

  if (!embeddingRes.ok) throw new Error(`Voyage AI: ${embeddingRes.status}`);

  const embData   = await embeddingRes.json();
  const embedding = embData.data?.[0]?.embedding;
  if (!embedding) throw new Error('Sin embedding de Voyage AI');

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
      match_count:     RAG_MATCH_COUNT,
    }),
  });

  if (!searchRes.ok) throw new Error(`Supabase RPC: ${searchRes.status}`);
  return await searchRes.json();
}

function buildRagContext(articles) {
  if (!articles || articles.length === 0) return '';

  const lines = ['ARTÍCULOS LEGALES RELEVANTES RECUPERADOS DE LA BASE DE DATOS:'];
  lines.push('(Cita estos artículos en tu respuesta cuando corresponda)\n');

  for (const art of articles) {
    const header = [
      `[${art.codigo_name}]`,
      art.section ? `${art.section} —` : '',
      art.article_num || '',
      `(similitud: ${(art.similarity * 100).toFixed(0)}%)`,
    ].filter(Boolean).join(' ');

    lines.push(`--- ${header}`);
    lines.push(art.content.trim());
    lines.push('');
  }

  return lines.join('\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
