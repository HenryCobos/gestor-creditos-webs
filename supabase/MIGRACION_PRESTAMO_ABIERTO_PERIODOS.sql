-- =====================================================================
-- MIGRACIÓN: Préstamo abierto — períodos, tasa, interés pendiente
-- EJECUTAR EN: Supabase → SQL Editor → Run
-- IMPACTO: CERO en datos existentes (columnas nullable, defaults)
-- =====================================================================

-- 1. Cuotas: rango del período (nullable)
ALTER TABLE public.cuotas
  ADD COLUMN IF NOT EXISTS periodo_desde DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS periodo_hasta DATE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo_periodo_hasta
  ON public.cuotas (prestamo_id, periodo_hasta)
  WHERE periodo_hasta IS NOT NULL;

-- 2. Préstamos: configuración abierto + arrastre de interés
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS periodo_tasa TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS periodo_tasa_dias INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frecuencia_cobro_dias INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interes_pendiente DECIMAL(12, 2) DEFAULT 0;

-- CHECK periodo_tasa (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'prestamos' AND constraint_name = 'prestamos_periodo_tasa_check'
  ) THEN
    ALTER TABLE public.prestamos
      ADD CONSTRAINT prestamos_periodo_tasa_check
      CHECK (
        periodo_tasa IS NULL OR periodo_tasa IN (
          'diario', 'semanal', 'quincenal', 'mensual', 'personalizado'
        )
      );
  END IF;
END $$;

-- 3. Ampliar frecuencia_pago para incluir 'personalizado'
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT constraint_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'prestamos' AND column_name = 'frecuencia_pago'
  LOOP
    EXECUTE format('ALTER TABLE public.prestamos DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;

  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'prestamos'
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'frecuencia_pago'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.prestamos DROP CONSTRAINT %I', cname);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'prestamos' AND constraint_name = 'prestamos_frecuencia_pago_check'
  ) THEN
    ALTER TABLE public.prestamos
      ADD CONSTRAINT prestamos_frecuencia_pago_check
      CHECK (frecuencia_pago IN (
        'diario', 'semanal', 'quincenal', 'mensual', 'personalizado'
      ));
  END IF;
END $$;

SELECT 'Migración préstamo abierto aplicada' AS info;
