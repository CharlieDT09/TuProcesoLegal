// ================================================
// Tu Proceso Legal — Ruta Procesal
// Vercel Function: /api/ruta
// Genera guía paso a paso de procesos legales panameños
// ================================================

const { checkRateLimit, verifyAuthToken } = require('../lib/rate-limit');

const RATE_LIMIT_RUTA   = 5;   // 5 rutas cada 6 horas (caro: Claude 2048 tokens)
const RATE_WINDOW_HOURS = 6;

const SYSTEM_PROMPT = `Eres un experto en derecho procesal panameño con amplio conocimiento de la legislación y práctica jurídica de la República de Panamá.

Tu tarea es generar una guía práctica paso a paso para que un ciudadano pueda navegar un proceso legal específico en Panamá.

FORMATO DE RESPUESTA: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes ni después, con esta estructura exacta:
{
  "titulo": "nombre descriptivo del proceso",
  "intro": "descripción breve del proceso en 1-2 oraciones explicando de qué se trata",
  "duracion": "duración estimada realista del proceso completo (ej: '3-6 meses', '1-2 años')",
  "pasos": [
    {
      "n": 1,
      "titulo": "título corto y claro del paso (máx 8 palabras)",
      "que_hacer": "descripción concreta de qué debe hacer el ciudadano en este paso (2-4 oraciones directas y accionables)",
      "donde": "institución o lugar donde se realiza (ej: MITRADEL, Ministerio Público, Juzgado Municipal, etc.)",
      "plazo": "tiempo aproximado para este paso (ej: 'Inmediato', '3-5 días hábiles', '1 mes')"
    }
  ],
  "consejos": [
    "consejo práctico 1",
    "consejo práctico 2",
    "consejo práctico 3"
  ]
}

INSTRUCCIONES:
1. Genera entre 5 y 8 pasos concretos, ordenados cronológicamente.
2. Cada paso debe ser accionable: el ciudadano debe saber exactamente qué hacer.
3. Cita las instituciones panameñas correctas: MITRADEL, Ministerio Público, Órgano Judicial, Juzgados Municipales, Tribunal Superior, Corte Suprema de Justicia, Defensoría del Pueblo, ACODECO, Registro Público, etc.
4. Menciona artículos del Código aplicable cuando sea relevante (Código de Trabajo, Código Civil, Código de la Familia, Código Judicial, Código Procesal Penal, etc.).
5. Los plazos deben ser realistas según la legislación y práctica panameña actual.
6. Si el usuario indicó que ya tiene abogado, adapta los pasos para trabajar junto a él (ej: "Coordina con tu abogado para...").
7. Personaliza la ruta según la situación específica y la ciudad mencionada.
8. Los consejos deben ser prácticos y específicos al proceso panameño.
9. Responde solo JSON válido. No uses markdown, no uses bloques de código.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { area, proceso, situacion, ciudad, tieneAbogado, notas, authToken } = req.body || {};

  if (!area || !proceso || !situacion) {
    return res.status(400).json({ error: 'Datos incompletos. Selecciona el proceso y describe tu situación.' });
  }

  if (situacion.trim().length < 10) {
    return res.status(400).json({ error: 'Describe tu situación con más detalle.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;

  // ── Rate limiting (por usuario si hay token, si no por IP) ──
  const userId = await verifyAuthToken({ supabaseUrl, supabaseAnon, authToken });
  const rl = await checkRateLimit({
    req, supabaseUrl, supabaseAnon, userId,
    prefix:    'ruta',
    limit:     RATE_LIMIT_RUTA,
    windowHrs: RATE_WINDOW_HOURS,
  });
  if (!rl.allowed) {
    return res.status(429).json({
      error:   `Has alcanzado el límite de ${RATE_LIMIT_RUTA} rutas procesales cada ${RATE_WINDOW_HOURS} horas.`,
      resetAt: rl.resetAt,
    });
  }

  const userPrompt = `Genera la ruta procesal para el siguiente caso:

ÁREA DEL DERECHO: ${area}
TIPO DE PROCESO: ${proceso}
CIUDAD: ${ciudad || 'Ciudad de Panamá'}
TIENE ABOGADO: ${tieneAbogado ? 'Sí' : 'No'}

SITUACIÓN DEL CASO:
${situacion.trim()}${notas ? `\n\nINFORMACIÓN ADICIONAL:\n${notas.trim()}` : ''}

Genera la guía paso a paso en formato JSON según las instrucciones.`;

  // Modo demo si no hay API key
  if (!anthropicKey?.startsWith('sk-ant-')) {
    return res.status(200).json({
      titulo: `${proceso} — Guía orientativa`,
      intro: 'Esta es una guía de demostración. Configure la API key de Anthropic para obtener rutas personalizadas.',
      duracion: '3-6 meses (estimado)',
      pasos: [
        { n: 1, titulo: 'Recopilar documentación', que_hacer: 'Reúne todos los documentos relevantes al caso: contratos, comunicaciones, recibos y cualquier prueba disponible.', donde: 'Domicilio / Archivos personales', plazo: 'Inmediato' },
        { n: 2, titulo: 'Consultar con un abogado', que_hacer: 'Busca asesoría legal con un abogado colegiado en Panamá que tenga experiencia en el área correspondiente.', donde: 'Bufete de abogados / Consultorios jurídicos', plazo: 'Primera semana' },
        { n: 3, titulo: 'Presentar la reclamación formal', que_hacer: 'Con la orientación de tu abogado, presenta la reclamación o denuncia ante la institución competente.', donde: 'Institución competente según el caso', plazo: '1-2 semanas' },
      ],
      consejos: [
        'Guarda copias de todos los documentos que presentes.',
        'Anota las fechas y números de referencia de cada trámite.',
        'Consulta con un abogado colegiado antes de tomar decisiones importantes.',
      ],
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
      if (anthropicRes.status === 429) {
        return res.status(429).json({ error: 'Servicio temporalmente sobrecargado. Intenta en unos minutos.' });
      }
      return res.status(502).json({ error: `Error al generar la ruta: ${msg}` });
    }

    const data    = await anthropicRes.json();
    const rawText = data.content?.find(b => b.type === 'text')?.text || '';

    // Parsear JSON de la respuesta
    let ruta;
    try {
      // Limpiar posibles bloques de código markdown
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      ruta = JSON.parse(cleaned);
    } catch {
      console.error('[RutaProcesal] JSON parse error. Raw:', rawText.slice(0, 300));
      return res.status(502).json({ error: 'Error al procesar la respuesta. Intenta de nuevo.' });
    }

    // Validar estructura mínima
    if (!ruta.pasos || !Array.isArray(ruta.pasos) || ruta.pasos.length === 0) {
      return res.status(502).json({ error: 'La ruta generada está incompleta. Intenta de nuevo.' });
    }

    return res.status(200).json(ruta);

  } catch (err) {
    console.error('[RutaProcesal]', err.message);
    return res.status(502).json({ error: 'Error de conexión. Intenta de nuevo.' });
  }
};
