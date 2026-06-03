-- Migración: modo de cálculo "Total Acordado" (total_acordado)
-- Permite fijar el monto total a cobrar sin depender de un % exacto.
-- Ejecutar en Supabase → SQL Editor → Run

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'prestamos'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%tipo_calculo_interes%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.prestamos DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'prestamos'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%tipo_calculo_interes%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.prestamos
  ADD CONSTRAINT prestamos_tipo_calculo_interes_check
  CHECK (tipo_calculo_interes IN ('por_periodo', 'global', 'frances', 'total_acordado'));

COMMENT ON COLUMN public.prestamos.tipo_calculo_interes IS
  'por_periodo | global | frances | total_acordado (monto total pactado a cobrar)';
