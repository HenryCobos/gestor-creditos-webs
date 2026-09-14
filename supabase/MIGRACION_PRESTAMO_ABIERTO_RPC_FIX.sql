-- =====================================================================
-- RECUPERACIÓN: Dashboard tras error "column pr.producto_id does not exist"
-- EJECUTAR EN: Supabase → SQL Editor → Run (una vez)
--
-- Orden recomendado previo (si aún no lo hiciste):
--   1. MIGRACION_PRESTAMO_ABIERTO_PERIODOS.sql
--   2. MIGRACION_NUEVOS_TIPOS_PRESTAMO.sql (opcional si ya tienes capital_saldo)
--
-- IMPACTO: CERO en filas existentes (solo ADD COLUMN IF NOT EXISTS + RPC)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Paso A — Columnas nullable que el RPC explícito asumía
-- ---------------------------------------------------------------------

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS capital_saldo DECIMAL(12, 2) DEFAULT NULL;

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS precio_contado DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS enganche DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cargos_adicionales DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descripcion_producto TEXT;

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS excluir_domingos BOOLEAN DEFAULT false;

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS excluir_fines_semana BOOLEAN DEFAULT false;

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS producto_id UUID DEFAULT NULL;

-- Préstamo abierto (por si PERIODOS no se aplicó completo)
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS periodo_tasa TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS periodo_tasa_dias INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frecuencia_cobro_dias INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interes_pendiente DECIMAL(12, 2) DEFAULT 0;

-- ---------------------------------------------------------------------
-- Paso B — RPC robusto: devuelve todas las columnas actuales de prestamos
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_prestamos_segun_rol() CASCADE;

CREATE FUNCTION public.get_prestamos_segun_rol()
RETURNS SETOF prestamos
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  IF mi_role = 'admin' THEN
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org
    ORDER BY pr.created_at DESC;

  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid()
    ORDER BY pr.created_at DESC;

  ELSE
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    WHERE pr.user_id = auth.uid()
    ORDER BY pr.created_at DESC;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_prestamos_segun_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prestamos_segun_rol() TO authenticated;

-- ---------------------------------------------------------------------
-- Paso C — Verificación (debe devolver un número sin error 42703)
-- ---------------------------------------------------------------------
SELECT COUNT(*) AS prestamos_visibles_por_rol FROM get_prestamos_segun_rol();

SELECT 'RPC get_prestamos_segun_rol restaurado (SETOF prestamos)' AS info;
