// ================================================
// Tu Proceso Legal — Rate limit helper
//
// Llama al RPC `check_rate_limit` en Supabase (ver
// database/rate_limit_setup.sql) con un identificador
// construido a partir del prefijo + userId/IP.
//
// Uso:
//   const { checkRateLimit } = require('../lib/rate-limit');
//   const rl = await checkRateLimit({
//     req, supabaseUrl, supabaseAnon,
//     userId,                  // opcional — si null, usa IP
//     prefix: 'ruta',          // distingue endpoints
//     limit: 5,
//     windowHrs: 6,
//   });
//   if (!rl.allowed) return res.status(429).json({ error: ..., resetAt: rl.resetAt });
// ================================================

async function checkRateLimit({ req, supabaseUrl, supabaseAnon, userId, prefix, limit, windowHrs }) {
  if (!supabaseUrl || !supabaseAnon) {
    // Sin Supabase no podemos rate-limitar; fail-open con aviso en logs.
    console.warn('[RateLimit] Supabase no configurado, permitiendo request');
    return { allowed: true, remaining: null, resetAt: null };
  }

  let identifier;
  if (userId) {
    identifier = `${prefix}_user_${userId}`;
  } else {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || 'unknown';
    identifier = `${prefix}_ip_${ip}`;
  }

  try {
    const rlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        supabaseAnon,
        'Authorization': `Bearer ${supabaseAnon}`,
      },
      body: JSON.stringify({
        p_identifier: identifier,
        p_limit:      limit,
        p_window_hrs: windowHrs,
      }),
    });

    if (!rlRes.ok) {
      console.warn('[RateLimit] RPC error:', rlRes.status);
      return { allowed: true, remaining: null, resetAt: null };
    }

    const rl = await rlRes.json();
    return {
      allowed:   rl.allowed === true,
      remaining: typeof rl.remaining === 'number' ? rl.remaining : null,
      resetAt:   rl.reset_at || null,
    };
  } catch (err) {
    console.error('[RateLimit] Error:', err.message);
    // Fail-open: si el rate limiter falla, no bloquear al usuario.
    return { allowed: true, remaining: null, resetAt: null };
  }
}

// Helper para verificar un Supabase access_token y obtener el user_id
async function verifyAuthToken({ supabaseUrl, supabaseAnon, authToken }) {
  if (!authToken || !supabaseUrl || !supabaseAnon) return null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': supabaseAnon,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id || null;
  } catch {
    return null;
  }
}

module.exports = { checkRateLimit, verifyAuthToken };
