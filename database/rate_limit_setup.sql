-- ================================================
-- Tu Proceso Legal — Rate Limiting
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================

-- Tabla de contadores por ventana de 6 horas
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier    TEXT         PRIMARY KEY,
  message_count INTEGER      NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índice para limpiezas periódicas (opcional)
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON public.rate_limits (window_start);

-- ── Función atómica de verificación e incremento ──
-- SECURITY DEFINER: corre con permisos del dueño (bypassa RLS)
-- Así el anon key puede llamarla sin acceso directo a la tabla

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier  TEXT,
  p_limit       INTEGER,
  p_window_hrs  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        INTEGER;
  v_window_start TIMESTAMPTZ;
  v_reset_at     TIMESTAMPTZ;
BEGIN
  -- Obtener registro existente con bloqueo de fila
  SELECT message_count, window_start
  INTO   v_count, v_window_start
  FROM   rate_limits
  WHERE  identifier = p_identifier
  FOR UPDATE;

  -- Sin registro aún O ventana ya expiró → ventana nueva, count = 1
  IF NOT FOUND OR (NOW() - v_window_start) >= (p_window_hrs || ' hours')::INTERVAL THEN
    INSERT INTO rate_limits (identifier, message_count, window_start, updated_at)
    VALUES (p_identifier, 1, NOW(), NOW())
    ON CONFLICT (identifier) DO UPDATE
      SET message_count = 1,
          window_start  = NOW(),
          updated_at    = NOW();

    RETURN json_build_object(
      'allowed',   true,
      'remaining', p_limit - 1,
      'reset_at',  (NOW() + (p_window_hrs || ' hours')::INTERVAL)::TEXT
    );
  END IF;

  -- Ventana activa: calcular reset
  v_reset_at := v_window_start + (p_window_hrs || ' hours')::INTERVAL;

  -- Límite alcanzado
  IF v_count >= p_limit THEN
    RETURN json_build_object(
      'allowed',   false,
      'remaining', 0,
      'reset_at',  v_reset_at::TEXT
    );
  END IF;

  -- Incrementar
  UPDATE rate_limits
  SET    message_count = message_count + 1,
         updated_at    = NOW()
  WHERE  identifier = p_identifier;

  RETURN json_build_object(
    'allowed',   true,
    'remaining', p_limit - (v_count + 1),
    'reset_at',  v_reset_at::TEXT
  );
END;
$$;

-- Permisos: anon y authenticated pueden llamar la función
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;

-- RLS en la tabla (la función bypassa esto via SECURITY DEFINER)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
