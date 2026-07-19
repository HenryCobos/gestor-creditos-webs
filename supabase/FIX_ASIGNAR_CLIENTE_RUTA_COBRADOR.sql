-- =========================================================
-- FIX: Auto-asignar clientes/préstamos del cobrador a su ruta
-- =========================================================
-- Ejecutar en Supabase → SQL Editor (producción y staging)
--
-- Función: asignar_cliente_a_ruta_cobrador
-- - Valida que auth.uid() sea cobrador de la ruta
-- - UPSERT en ruta_clientes (activo = true)
-- - Sincroniza prestamos activo/pendiente con ruta_id
-- - Dispara triggers existentes de capital vía UPDATE prestamos

BEGIN;

CREATE OR REPLACE FUNCTION public.asignar_cliente_a_ruta_cobrador(
  p_cliente_id UUID,
  p_ruta_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cobrador_id UUID := auth.uid();
  v_ruta_id UUID := p_ruta_id;
  v_cliente_user_id UUID;
BEGIN
  IF v_cobrador_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id requerido';
  END IF;

  SELECT c.user_id INTO v_cliente_user_id
  FROM public.clientes c
  WHERE c.id = p_cliente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  -- Resolver ruta: explícita o primera ruta activa del cobrador
  IF v_ruta_id IS NULL THEN
    SELECT r.id INTO v_ruta_id
    FROM public.rutas r
    WHERE r.cobrador_id = v_cobrador_id
      AND r.estado = 'activa'
    ORDER BY r.created_at ASC
    LIMIT 1;
  END IF;

  IF v_ruta_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Solo el cobrador asignado a la ruta puede vincular clientes
  IF NOT EXISTS (
    SELECT 1 FROM public.rutas r
    WHERE r.id = v_ruta_id
      AND r.cobrador_id = v_cobrador_id
      AND r.estado = 'activa'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para asignar clientes a esta ruta';
  END IF;

  -- Cliente debe ser del cobrador o ya estar en alguna de sus rutas
  IF v_cliente_user_id <> v_cobrador_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.ruta_clientes rc
       JOIN public.rutas r ON r.id = rc.ruta_id
       WHERE rc.cliente_id = p_cliente_id
         AND rc.activo = true
         AND r.cobrador_id = v_cobrador_id
     ) THEN
    RAISE EXCEPTION 'Cliente no pertenece a tu cartera de cobrador';
  END IF;

  INSERT INTO public.ruta_clientes (ruta_id, cliente_id, activo, fecha_asignacion)
  VALUES (v_ruta_id, p_cliente_id, true, NOW())
  ON CONFLICT (ruta_id, cliente_id)
  DO UPDATE SET
    activo = true,
    fecha_asignacion = COALESCE(public.ruta_clientes.fecha_asignacion, NOW());

  UPDATE public.prestamos pr
  SET
    ruta_id = v_ruta_id,
    updated_at = NOW()
  WHERE pr.cliente_id = p_cliente_id
    AND pr.estado IN ('activo', 'pendiente')
    AND (pr.ruta_id IS NULL OR pr.ruta_id <> v_ruta_id);

  RETURN v_ruta_id;
END;
$$;

REVOKE ALL ON FUNCTION public.asignar_cliente_a_ruta_cobrador(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asignar_cliente_a_ruta_cobrador(UUID, UUID) TO authenticated;

COMMIT;

-- =========================================================
-- BACKFILL (opcional): clientes creados por cobrador sin ruta_clientes
-- Ejecutar después de crear la función, revisar resultados antes de COMMIT
-- =========================================================

-- Diagnóstico ANTES
SELECT
  'ANTES' AS seccion,
  COUNT(*) AS clientes_sin_ruta_clientes
FROM public.clientes c
JOIN public.rutas r ON r.cobrador_id = c.user_id AND r.estado = 'activa'
LEFT JOIN public.ruta_clientes rc
  ON rc.cliente_id = c.id AND rc.ruta_id = r.id AND rc.activo = true
WHERE rc.id IS NULL;

-- Backfill ruta_clientes (cliente creado por el cobrador de la ruta)
WITH insertados AS (
  INSERT INTO public.ruta_clientes (ruta_id, cliente_id, activo, fecha_asignacion)
  SELECT r.id, c.id, true, NOW()
  FROM public.clientes c
  JOIN public.rutas r ON r.cobrador_id = c.user_id AND r.estado = 'activa'
  LEFT JOIN public.ruta_clientes rc
    ON rc.cliente_id = c.id AND rc.ruta_id = r.id
  WHERE rc.id IS NULL
  ON CONFLICT (ruta_id, cliente_id) DO UPDATE SET activo = true
  RETURNING ruta_id, cliente_id
)
SELECT 'INSERTADOS' AS seccion, COUNT(*) AS filas FROM insertados;

-- Sincronizar prestamos huérfanos de esos clientes
WITH actualizados AS (
  UPDATE public.prestamos pr
  SET ruta_id = rc.ruta_id, updated_at = NOW()
  FROM public.ruta_clientes rc
  WHERE pr.cliente_id = rc.cliente_id
    AND rc.activo = true
    AND pr.estado IN ('activo', 'pendiente')
    AND (pr.ruta_id IS NULL OR pr.ruta_id <> rc.ruta_id)
  RETURNING pr.id, pr.ruta_id
)
SELECT 'PRESTAMOS_SYNC' AS seccion, COUNT(*) AS filas FROM actualizados;

-- Recalcular capital de rutas afectadas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT rc.ruta_id
    FROM public.ruta_clientes rc
    JOIN public.rutas ru ON ru.id = rc.ruta_id AND ru.estado = 'activa'
  LOOP
    PERFORM public.recalcular_capital_ruta(r.ruta_id);
  END LOOP;
END;
$$;
