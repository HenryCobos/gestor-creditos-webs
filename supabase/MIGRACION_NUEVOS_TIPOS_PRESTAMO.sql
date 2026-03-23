-- =====================================================================
-- MIGRACIÓN: Nuevos tipos de préstamo — Sistema Francés y Préstamo Abierto
-- EJECUTAR EN: Supabase → SQL Editor → Run
-- IMPACTO: CERO en datos existentes (columnas nullable, constraints amplían)
-- =====================================================================

-- 1. Nuevas columnas en 'cuotas' (nullable, retrocompatibles)
--    monto_interes : porción de la cuota que corresponde a intereses
--    monto_capital : porción de la cuota que corresponde a capital
ALTER TABLE public.cuotas
  ADD COLUMN IF NOT EXISTS monto_interes DECIMAL(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monto_capital DECIMAL(12, 2) DEFAULT NULL;

-- 2. Nueva columna en 'prestamos' (nullable, retrocompatible)
--    capital_saldo : saldo de capital vigente para préstamos abiertos
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS capital_saldo DECIMAL(12, 2) DEFAULT NULL;

-- 3. Ampliar el CHECK de tipo_calculo_interes para incluir 'frances'
--    Primero eliminamos el constraint existente (puede llamarse diferente según tu instancia)
DO $$
BEGIN
  -- Eliminar constraint de tipo_calculo_interes si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'prestamos'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%tipo_calculo_interes%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.prestamos DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'prestamos'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%tipo_calculo_interes%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.prestamos
  ADD CONSTRAINT prestamos_tipo_calculo_interes_check
  CHECK (tipo_calculo_interes IN ('por_periodo', 'global', 'frances'));

-- 4. Ampliar el CHECK de tipo_prestamo para incluir 'abierto'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'prestamos'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%tipo_prestamo%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.prestamos DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'prestamos'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%tipo_prestamo%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.prestamos
  ADD CONSTRAINT prestamos_tipo_prestamo_check
  CHECK (tipo_prestamo IN ('amortizacion', 'solo_intereses', 'empeño', 'venta_credito', 'abierto'));

-- 5. Verificación final
SELECT 'Columnas en cuotas:' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cuotas'
  AND column_name IN ('monto_cuota', 'monto_interes', 'monto_capital', 'monto_pagado')
ORDER BY column_name;

SELECT 'Columnas nuevas en prestamos:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prestamos'
  AND column_name IN ('tipo_prestamo', 'tipo_calculo_interes', 'capital_saldo')
ORDER BY column_name;

SELECT 'Migración completada exitosamente' AS resultado;
