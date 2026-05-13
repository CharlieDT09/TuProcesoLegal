// ================================================
// Tu Proceso Legal — Backend seguro
// Netlify Function: /.netlify/functions/chat
//
// La API key de Anthropic NUNCA llega al navegador.
// Vive solo en las variables de entorno de Netlify.
// ================================================

const { LEGAL_DATA } = require('./legal-data');

const SYSTEM_PROMPT = `Eres el asistente jurídico de "Tu Proceso Legal", especializado exclusivamente en el derecho de la República de Panamá. Orientas a ciudadanos panameños sobre sus derechos y la legislación vigente.

REGLAS:
1. Basa tus respuestas PRINCIPALMENTE en la base de datos legal que se te proporciona a continuación. Cita siempre el artículo exacto.
2. Solo respondes sobre derecho panameño. Si la pregunta no es jurídica o no corresponde a Panamá, declina amablemente.
3. Al final de toda respuesta sobre un caso personal incluye: "⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá."
4. Responde en español formal panameño.
5. Organiza tus respuestas con claridad usando títulos y numeración.
6. Si el tema no está cubierto en la base de datos, indícalo y orienta con tu conocimiento general del derecho panameño.

BASE DE DATOS LEGAL DE REFERENCIA:
${LEGAL_DATA}`;

// ── Constantes ────────────────────────────────────
const DEMO_DELAY_MS     = 1200;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MSGS  = 20;

// ── Respuestas demo (sin API key) ─────────────────
const DEMO_RESPONSES = [
  `Según el Código de Trabajo de Panamá (Ley 44 de 1995), el despido sin causa justificada da derecho al trabajador a:

1. Preaviso (Art. 67): mínimo 1 semana con menos de 2 años de servicio; 2 semanas entre 2 y 5 años; 4 semanas con más de 5 años.
2. Indemnización (Art. 225): equivalente a 3.4 semanas de salario por cada año trabajado.
3. Décimo tercer mes proporcional al tiempo laborado.
4. Vacaciones proporcionales no disfrutadas.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,

  `De acuerdo con el Código Civil de Panamá y sus reformas, el proceso de divorcio puede tramitarse de dos formas:

- Por mutuo acuerdo (Art. 214): ambas partes presentan solicitud conjunta ante el Juzgado Seccional de Familia.
- Por causa específica (Art. 212): incluye adulterio, maltrato, abandono del hogar, entre otras causales legales.

El trámite se realiza ante los Juzgados Seccionales de Familia del Órgano Judicial de Panamá.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,

  `El Código Civil de Panamá regula los contratos de arrendamiento en los artículos 1315 al 1376. Los puntos principales son:

1. El contrato debe especificar el monto del alquiler y la duración acordada.
2. El arrendador está obligado a entregar el bien en condiciones habitables.
3. El arrendatario debe pagar en los plazos pactados y cuidar el inmueble.
4. La Ley 93 de 1973 y sus reformas establecen controles especiales para arrendamientos de vivienda.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,

  `La Ley 45 de 2007 (Ley de Protección al Consumidor) establece en Panamá los siguientes derechos del consumidor:

1. Derecho a la información clara y veraz sobre productos y servicios.
2. Derecho a la seguridad y protección de su salud.
3. Derecho a la libre elección sin presiones comerciales.
4. Derecho a presentar reclamaciones ante la ACODECO (Autoridad de Protección al Consumidor).
5. Derecho a la reparación o sustitución de productos defectuosos.

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,

  `El período de prueba en Panamá está regulado por el Código de Trabajo (Art. 75 y siguientes):

1. Duración máxima: 3 meses para trabajadores en general.
2. Durante este período, cualquiera de las partes puede dar por terminada la relación laboral sin necesidad de causa justificada ni pago de indemnización.
3. Al concluir el período de prueba sin que ninguna parte lo haya rescindido, el contrato se convierte en indefinido automáticamente.
4. El trabajador en período de prueba tiene derecho a todos los demás beneficios laborales (seguro social, salario mínimo, etc.).

⚠️ Esta orientación es informativa. Para su caso específico, consulte a un abogado colegiado en la República de Panamá.`,
];

let demoIndex = 0;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return response({ error: 'Método no permitido' }, 405);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response({ error: 'Body inválido' }, 400);
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return response({ error: 'Sin mensajes' }, 400);
  }

  // Validar estructura y longitud de cada mensaje
  for (const msg of messages) {
    if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return response({ error: 'Formato de mensaje inválido' }, 400);
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return response({ error: `El mensaje supera el límite de ${MAX_MESSAGE_CHARS} caracteres.` }, 400);
    }
  }

  // Limitar historial para evitar contextos excesivamente largos
  const trimmedMessages = messages.length > MAX_HISTORY_MSGS
    ? messages.slice(messages.length - MAX_HISTORY_MSGS)
    : messages;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── MODO PRODUCCIÓN ───────────────────────────────
  if (apiKey && apiKey.startsWith('sk-ant-') && apiKey.length >= 40) {
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: trimmedMessages,
        }),
      });

      if (!anthropicRes.ok) {
        const errBody = await anthropicRes.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Error ${anthropicRes.status}`;
        if (anthropicRes.status === 401) return response({ error: 'API key inválida. Verifica la variable ANTHROPIC_API_KEY en Netlify.' }, 502);
        if (anthropicRes.status === 429) return response({ error: 'Límite de uso alcanzado o sin créditos. Verifica tu cuenta en console.anthropic.com.' }, 502);
        if (anthropicRes.status === 403) return response({ error: 'Sin acceso. Verifica que tu cuenta tenga créditos activos en console.anthropic.com.' }, 502);
        if (anthropicRes.status === 500) return response({ error: 'Error interno de Anthropic. Intenta de nuevo en unos momentos.' }, 502);
        return response({ error: `Error de Anthropic (${anthropicRes.status}): ${msg}` }, 502);
      }

      const data = await anthropicRes.json();
      const reply = data.content?.find(b => b.type === 'text')?.text || 'Sin respuesta.';
      const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
      return response({ reply, usage });

    } catch {
      return response({ error: 'Error de conexión con el servidor. Intenta de nuevo.' }, 502);
    }
  }

  // ── MODO DEMO ─────────────────────────────────────
  await sleep(DEMO_DELAY_MS);
  const reply = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return response({ reply });
};

// ── Helpers ───────────────────────────────────────
function response(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
