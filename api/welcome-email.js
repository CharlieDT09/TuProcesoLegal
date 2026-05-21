// ================================================
// Tu Proceso Legal — Email de bienvenida
// Vercel Function: /api/welcome-email
// ================================================

const FROM_ADDRESS = 'Tu Proceso Legal IA <noreply@tuprocesoia.com>';
const FROM_NAME    = 'Tu Proceso Legal IA';

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { email, name } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(503).json({ error: 'Servicio de email no configurado' });

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [email],
        subject: `¡Bienvenido a ${FROM_NAME}!`,
        html:    buildWelcomeHtml(name || 'Usuario'),
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      return res.status(502).json({ error: `Error al enviar email (${resendRes.status}): ${err.message || ''}` });
    }

    return res.status(200).json({ ok: true });

  } catch {
    return res.status(502).json({ error: 'Error de conexión con el servicio de email' });
  }
};

function buildWelcomeHtml(name) {
  const safeName = name.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Tu Proceso Legal IA</title>
</head>
<body style="margin:0;padding:0;background:#070c18;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#c09d3c;font-size:26px;margin:0 0 6px;letter-spacing:0.02em;">Tu Proceso Legal IA</h1>
      <p style="color:#7a8fa8;font-size:12px;margin:0;text-transform:uppercase;letter-spacing:0.12em;">
        ASISTENTE JURÍDICO · REPÚBLICA DE PANAMÁ
      </p>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(192,157,60,0.25);border-radius:18px;padding:36px;">
      <h2 style="color:#e6d9c0;font-size:22px;margin:0 0 14px;">¡Bienvenido, ${safeName}! 👋</h2>
      <p style="color:#7a8fa8;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Tu cuenta en <strong style="color:#c09d3c;">Tu Proceso Legal IA</strong> ha sido creada exitosamente.
        Ahora tienes acceso a orientación jurídica inteligente basada en la legislación vigente de la República de Panamá.
      </p>
      <div style="border-left:3px solid #c09d3c;padding:14px 16px;margin:24px 0;background:rgba(192,157,60,0.07);border-radius:0 10px 10px 0;">
        <p style="color:#ddb94e;font-size:14px;font-weight:600;margin:0 0 8px;">Puedes consultar sobre:</p>
        <ul style="color:#7a8fa8;font-size:14px;margin:0;padding-left:20px;line-height:1.9;">
          <li>Derechos laborales y despidos</li>
          <li>Procesos de divorcio y familia</li>
          <li>Contratos de arrendamiento</li>
          <li>Derechos del consumidor</li>
          <li>Legislación penal y civil vigente</li>
        </ul>
      </div>
      <p style="color:#7a8fa8;font-size:14px;line-height:1.7;margin:0;">
        Tus conversaciones quedan guardadas en tu cuenta para que puedas consultarlas cuando lo necesites.
      </p>
      <p style="color:#3a4a5e;font-size:12px;font-style:italic;margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(192,157,60,0.15);">
        ⚠️ Tu Proceso Legal IA ofrece orientación legal general e informativa.
        No sustituye el asesoramiento de un abogado colegiado en la República de Panamá.
      </p>
    </div>
    <p style="text-align:center;color:#3a4a5e;font-size:12px;margin-top:28px;line-height:1.7;">
      © 2025 Tu Proceso Legal · República de Panamá<br>
      Si no creaste esta cuenta, puedes ignorar este mensaje con seguridad.
    </p>
  </div>
</body>
</html>`;
}
