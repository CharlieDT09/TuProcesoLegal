// ================================================
// Tu Proceso Legal — Backend con RAG (pgvector)
// Netlify Function: /.netlify/functions/chat
//
// Flujo RAG:
//   1. Recibe mensaje del usuario
//   2. Genera embedding con OpenAI text-embedding-3-small
//   3. Busca artículos relevantes en Supabase pgvector
//   4. Inyecta artículos como contexto en el prompt de Claude
//   5. Devuelve respuesta citando artículos reales
//
// Variables de entorno requeridas en Netlify:
//   ANTHROPIC_API_KEY   — Claude API key
//   OPENAI_API_KEY      — para embeddings (text-embedding-3-small)
//   SUPABASE_URL        — URL del proyecto Supabase
//   SUPABASE_ANON_KEY   — anon key (solo lectura de legal_documents)
// ================================================

// ── Constantes ────────────────────────────────────────────────
const MAX_MESSAGE_CHARS  = 2000;
const MAX_HISTORY_MSGS   = 20;
const RAG_MATCH_COUNT    = 6;      // artículos a recuperar por consulta
const RAG_THRESHOLD      = 0.48;   // similitud coseno mínima (0–1)
const DEMO_DELAY_MS      = 1200;

// ── System prompt base (sin LEGAL_DATA estático) ──────────────
const BASE_SYSTEM_PROMPT = `Eres el asistente jurídico de "Tu Proceso Legal", especializado exclusivamente en el derecho de la República de Panamá. Orientas a ciudadanos panameños sobre sus derechos y la legislación vigente.

REGLAS:
1. Basa tus respuestas EN LOS ARTÍCULOS RECUPERADOS que se te proporcionan abajo. Cita siempre el artículo exacto con su número y código de origen.
2. Solo respondes sobre derecho panameño. Si la pregunta no es jurídica o no corresponde a Panamá, declina amablemente.
3. Al final de toda respuesta sobre un caso personal incluye: "⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá."
4. Responde en español formal panameño.
5. Organiza tus respuestas con claridad usando títulos y numeración.
6. Si los artículos recuperados no cubren completamente la pregunta, indícalo y complementa con tu conocimiento general del derecho panameño, pero siempre prioriza los artículos citados.`;

// ── Respuestas demo (sin API keys) ────────────────────────────
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
// HANDLER PRINCIPAL
// ════════════════════════════════════════════════════════════════

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return res({ error: 'Método no permitido' }, 405);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res({ error: 'Body inválido' }, 400);
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res({ error: 'Sin mensajes' }, 400);
  }

  for (const msg of messages) {
    if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return res({ error: 'Formato de mensaje inválido' }, 400);
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return res({ error: `El mensaje supera el límite de ${MAX_MESSAGE_CHARS} caracteres.` }, 400);
    }
  }

  const trimmedMessages = messages.length > MAX_HISTORY_MSGS
    ? messages.slice(messages.length - MAX_HISTORY_MSGS)
    : messages;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;

  const hasFullConfig = anthropicKey?.startsWith('sk-ant-') && anthropicKey.length >= 40;

  // ── MODO DEMO ─────────────────────────────────────────────────
  if (!hasFullConfig) {
    await sleep(DEMO_DELAY_MS);
    const reply = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
    demoIndex++;
    return res({ reply });
  }

  // ── PASO 1: RAG — recuperar artículos relevantes ──────────────
  let ragContext = '';
  const ragAvailable = openaiKey && supabaseUrl && supabaseAnon;

  if (ragAvailable) {
    try {
      // Usar el último mensaje del usuario como query de búsqueda
      const userQuery = trimmedMessages
        .filter(m => m.role === 'user')
        .slice(-1)[0]?.content || '';

      if (userQuery) {
        const articles = await retrieveRelevantArticles(
          userQuery, openaiKey, supabaseUrl, supabaseAnon
        );
        if (articles.length > 0) {
          ragContext = buildRagContext(articles);
        }
      }
    } catch (err) {
      // RAG falla silenciosamente — Claude responde con conocimiento general
      console.error('[RAG] Error en búsqueda vectorial:', err.message);
    }
  }

  // ── PASO 2: Construir system prompt con contexto RAG ──────────
  const systemPrompt = ragContext
    ? `${BASE_SYSTEM_PROMPT}\n\n${ragContext}`
    : `${BASE_SYSTEM_PROMPT}\n\n[NOTA: La búsqueda semántica no está disponible. Responde con tu conocimiento general del derecho panameño.]`;

  // ── PASO 3: Llamar a Claude ───────────────────────────────────
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       anthropicKey,
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
      if (anthropicRes.status === 401) return res({ error: 'API key inválida. Verifica ANTHROPIC_API_KEY en Netlify.' }, 502);
      if (anthropicRes.status === 429) return res({ error: 'Límite de uso alcanzado. Verifica tu cuenta en console.anthropic.com.' }, 502);
      if (anthropicRes.status === 403) return res({ error: 'Sin acceso. Verifica que tu cuenta tenga créditos activos.' }, 502);
      return res({ error: `Error de Anthropic (${anthropicRes.status}): ${msg}` }, 502);
    }

    const data  = await anthropicRes.json();
    const reply = data.content?.find(b => b.type === 'text')?.text || 'Sin respuesta.';
    const usage = data.usage || { input_tokens: 0, output_tokens: 0 };

    return res({ reply, usage, rag_articles: ragContext ? RAG_MATCH_COUNT : 0 });

  } catch {
    return res({ error: 'Error de conexión con el servidor. Intenta de nuevo.' }, 502);
  }
};


// ════════════════════════════════════════════════════════════════
// RAG — Búsqueda semántica en Supabase pgvector
// ════════════════════════════════════════════════════════════════

async function retrieveRelevantArticles(query, openaiKey, supabaseUrl, supabaseAnon) {
  // 1. Generar embedding del query
  const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query.replace(/\n/g, ' ').slice(0, 8000),
    }),
  });

  if (!embeddingRes.ok) {
    throw new Error(`OpenAI embeddings: ${embeddingRes.status}`);
  }

  const embData   = await embeddingRes.json();
  const embedding = embData.data?.[0]?.embedding;
  if (!embedding) throw new Error('No se recibió embedding de OpenAI');

  // 2. Buscar artículos similares via Supabase RPC
  const searchRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/match_legal_documents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        supabaseAnon,
        'Authorization': `Bearer ${supabaseAnon}`,
      },
      body: JSON.stringify({
        query_embedding:  embedding,
        match_threshold:  RAG_THRESHOLD,
        match_count:      RAG_MATCH_COUNT,
      }),
    }
  );

  if (!searchRes.ok) {
    throw new Error(`Supabase RPC: ${searchRes.status}`);
  }

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


// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function res(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type':          'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
