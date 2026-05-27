// ================================================
// Tu Proceso Legal — TuEscritoIA
// Vercel Function: /api/escrito
// Genera escritos jurídicos profesionales con Claude
// ================================================

const { checkRateLimit } = require('../lib/rate-limit');

const RATE_LIMIT_ESCRITO = 5;   // 5 escritos cada 6 horas por usuario
const RATE_WINDOW_HOURS  = 6;

const SYSTEM_PROMPT = `Eres un redactor legal especializado en derecho panameño. Tu tarea es generar documentos jurídicos profesionales y completos conforme a la legislación vigente de la República de Panamá.

INSTRUCCIONES:
1. Redacta el documento completo con estructura formal apropiada: encabezado, destinatario, saludo protocolar (si aplica), cuerpo con fundamento legal, petitorio (si aplica), y cierre con línea de firma.
2. Usa lenguaje jurídico formal y preciso, acorde al derecho panameño vigente.
3. Cita artículos específicos de la legislación panameña cuando sean relevantes (Código de Trabajo, Código Civil, Código Judicial, Código de la Familia, Código Penal, Código Procesal Penal, etc.).
4. Si el usuario no proporcionó algún dato necesario, usa [COMPLETAR: descripción breve] para indicar dónde agregar esa información.
5. NO incluyas explicaciones externas, comentarios ni meta-texto sobre el documento. Solo el documento jurídico en sí.
6. Al terminar el documento, agrega una línea separadora y la nota obligatoria: "— Documento generado con asistencia de inteligencia artificial. Se recomienda su revisión por un abogado colegiado de la República de Panamá antes de su uso oficial."
7. NO uses formato markdown bajo ninguna circunstancia. Específicamente:
   - NO uses asteriscos (** o *) para negrita o cursiva — los escritos jurídicos usan MAYÚSCULAS para énfasis.
   - NO uses almohadillas (#, ##, ###) para títulos — usa MAYÚSCULAS centradas o subrayadas con guiones.
   - NO uses guiones (-) ni asteriscos (*) para listas — usa numeración "1.", "2.", "3." o literales "a)", "b)", "c)".
   - NO uses bloques de código con backticks.
   El documento debe ser texto plano profesional como un escrito jurídico tradicional listo para imprimir.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { category, documentType, fields, authToken } = req.body || {};

  if (!category || !documentType || !fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'Datos incompletos. Por favor completa el formulario.' });
  }

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!authToken) {
    return res.status(401).json({ error: 'Se requiere iniciar sesión para usar TuEscritoIA.' });
  }

  // Fail-closed: si no podemos verificar la sesión, rechazamos el request.
  if (!supabaseUrl || !supabaseAnon) {
    return res.status(503).json({ error: 'Servicio de autenticación no disponible. Intenta más tarde.' });
  }

  let verifiedUserId = null;
  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': supabaseAnon,
      },
    });
    if (!authRes.ok) {
      return res.status(401).json({ error: 'Sesión inválida. Por favor inicia sesión de nuevo.' });
    }
    const userData = await authRes.json();
    if (!userData?.id) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    verifiedUserId = userData.id;
  } catch {
    return res.status(401).json({ error: 'Error al verificar la sesión.' });
  }

  // ── Rate limiting (por usuario autenticado) ──
  const rl = await checkRateLimit({
    req, supabaseUrl, supabaseAnon,
    userId:    verifiedUserId,
    prefix:    'escrito',
    limit:     RATE_LIMIT_ESCRITO,
    windowHrs: RATE_WINDOW_HOURS,
  });
  if (!rl.allowed) {
    return res.status(429).json({
      error:   `Has alcanzado el límite de ${RATE_LIMIT_ESCRITO} escritos cada ${RATE_WINDOW_HOURS} horas.`,
      resetAt: rl.resetAt,
    });
  }

  // Construir prompt con los datos del formulario
  const fieldLines = Object.entries(fields)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `• ${k}: ${String(v).trim()}`)
    .join('\n');

  const userPrompt = `Redacta el siguiente documento jurídico:

TIPO DE DOCUMENTO: ${documentType}
ÁREA DEL DERECHO: ${category}

INFORMACIÓN PROPORCIONADA POR EL USUARIO:
${fieldLines}

Genera el documento completo ahora:`;

  // Modo demo si no hay API key configurada
  if (!anthropicKey?.startsWith('sk-ant-')) {
    return res.status(200).json({
      escrito: `${documentType.toUpperCase()}\n\n[MODO DEMO — Configure ANTHROPIC_API_KEY en Vercel para generar escritos reales]\n\nEste es un escrito de demostración para "${documentType}".\n\nLos datos proporcionados han sido recibidos correctamente.\n\n\n— Documento generado con asistencia de inteligencia artificial. Se recomienda su revisión por un abogado colegiado de la República de Panamá antes de su uso oficial.`
    });
  }

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
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Error ${anthropicRes.status}`;
      if (anthropicRes.status === 429) return res.status(429).json({ error: 'Servicio temporalmente sobrecargado. Intenta en unos minutos.' });
      return res.status(502).json({ error: `Error al generar el escrito: ${msg}` });
    }

    const data    = await anthropicRes.json();
    const escrito = data.content?.find(b => b.type === 'text')?.text || '';
    const usage   = data.usage || {};

    return res.status(200).json({ escrito, usage });

  } catch (err) {
    console.error('[TuEscritoIA]', err.message);
    return res.status(502).json({ error: 'Error de conexión. Intenta de nuevo.' });
  }
};
