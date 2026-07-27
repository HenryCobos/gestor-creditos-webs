-- =====================================================
-- FASE A: Solo funciones (sin recalcular rutas)
-- =====================================================
-- Ejecutar PRIMERO en Supabase → SQL Editor (producción activa).
-- No modifica capital_actual hasta ejecutar Fase B o C.
--
-- Siguiente paso: FIX_CAPITAL_PENDIENTE_CAJA_B.sql (prueba ANITA)

-- =====================================================
-- Capital pendiente por préstamo (solo activo/pendiente)
-- =====================================================
CREATE OR REPLACE FUNCTION public.capital_pendiente_prestamo(p_prestamo_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado TEXT;
  v_monto_prestado NUMERIC := 0;
  v_monto_total NUMERIC := 0;
  v_capital_saldo NUMERIC;
  v_total_pagos NUMERIC := 0;
  v_abonos NUMERIC := 0;
  v_capital_cobrado_cuotas NUMERIC := 0;
  v_tiene_monto_capital BOOLEAN := FALSE;
BEGIN
  IF p_prestamo_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT pr.estado, pr.monto_prestado, pr.monto_total, pr.capital_saldo
    INTO v_estado, v_monto_prestado, v_monto_total, v_capital_saldo
  FROM public.prestamos pr
  WHERE pr.id = p_prestamo_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_estado NOT IN ('activo', 'pendiente') THEN
    RETURN 0;
  END IF;

  IF v_capital_saldo IS NOT NULL THEN
    RETURN GREATEST(0, v_capital_saldo);
  END IF;

  SELECT COALESCE(SUM(pg.monto_pagado), 0)
    INTO v_total_pagos
  FROM public.pagos pg
  WHERE pg.prestamo_id = p_prestamo_id;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'abonos_capital'
      AND column_name = 'monto_abonado'
  ) THEN
    SELECT COALESCE(SUM(ac.monto_abonado), 0)
      INTO v_abonos
    FROM public.abonos_capital ac
    WHERE ac.prestamo_id = p_prestamo_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cuotas c
    WHERE c.prestamo_id = p_prestamo_id AND c.monto_capital IS NOT NULL
  ) INTO v_tiene_monto_capital;

  IF v_tiene_monto_capital THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN c.monto_cuota > 0 AND c.monto_pagado >= c.monto_cuota THEN COALESCE(c.monto_capital, 0)
        WHEN c.monto_cuota > 0 AND c.monto_capital IS NOT NULL THEN
          (c.monto_pagado / c.monto_cuota) * c.monto_capital
        ELSE 0
      END
    ), 0)
    INTO v_capital_cobrado_cuotas
    FROM public.cuotas c
    WHERE c.prestamo_id = p_prestamo_id;

    RETURN GREATEST(0, v_monto_prestado - v_capital_cobrado_cuotas - v_abonos);
  END IF;

  RETURN GREATEST(
    0,
    v_monto_prestado
      - LEAST(
          v_monto_prestado,
          COALESCE(v_total_pagos, 0) * v_monto_prestado / NULLIF(v_monto_total, 0)
        )
      - COALESCE(v_abonos, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_capital_pendiente_ruta(p_ruta_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(public.capital_pendiente_prestamo(pr.id)), 0)
  FROM public.prestamos pr
  WHERE pr.ruta_id = p_ruta_id
    AND pr.estado IN ('activo', 'pendiente');
$$;

CREATE OR REPLACE FUNCTION public.recalcular_capital_ruta(p_ruta_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capital_inicial NUMERIC := 0;
  v_manual_neto NUMERIC := 0;
  v_total_pagos NUMERIC := 0;
  v_capital_pendiente NUMERIC := 0;
  v_total_gastos_aprobados NUMERIC := 0;
  v_capital_actual NUMERIC := 0;
BEGIN
  SELECT COALESCE(r.capital_inicial, 0)
    INTO v_capital_inicial
  FROM public.rutas r
  WHERE r.id = p_ruta_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN m.tipo_movimiento IN ('ingreso', 'transferencia_entrada')
        AND NOT (
          m.tipo_movimiento = 'ingreso'
          AND COALESCE(LOWER(m.concepto), '') LIKE 'capital inicial%'
        )
      THEN m.monto
      WHEN m.tipo_movimiento IN ('retiro', 'transferencia_salida') THEN -m.monto
      ELSE 0
    END
  ), 0)
  INTO v_manual_neto
  FROM public.movimientos_capital_ruta m
  WHERE m.ruta_id = p_ruta_id;

  SELECT COALESCE(SUM(pg.monto_pagado), 0)
  INTO v_total_pagos
  FROM public.pagos pg
  JOIN public.prestamos pr ON pr.id = pg.prestamo_id
  WHERE pr.ruta_id = p_ruta_id;

  v_capital_pendiente := public.get_capital_pendiente_ruta(p_ruta_id);

  SELECT COALESCE(SUM(g.monto), 0)
  INTO v_total_gastos_aprobados
  FROM public.gastos g
  WHERE g.ruta_id = p_ruta_id
    AND g.aprobado = true;

  v_capital_actual :=
      v_capital_inicial
    + v_manual_neto
    + v_total_pagos
    - v_capital_pendiente
    - v_total_gastos_aprobados;

  UPDATE public.rutas
  SET capital_actual = v_capital_actual,
      updated_at = NOW()
  WHERE id = p_ruta_id;

  RETURN v_capital_actual;
END;
$$;

GRANT EXECUTE ON FUNCTION public.capital_pendiente_prestamo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_capital_pendiente_ruta(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_capital_ruta(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_recalcular_capital_desde_abonos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruta_id UUID;
  v_prestamo_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_prestamo_id := OLD.prestamo_id;
  ELSE
    v_prestamo_id := NEW.prestamo_id;
  END IF;

  SELECT pr.ruta_id INTO v_ruta_id
  FROM public.prestamos pr
  WHERE pr.id = v_prestamo_id;

  IF v_ruta_id IS NOT NULL THEN
    PERFORM public.recalcular_capital_ruta(v_ruta_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'abonos_capital'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_recalcular_capital_desde_abonos ON public.abonos_capital;
    CREATE TRIGGER trigger_recalcular_capital_desde_abonos
    AFTER INSERT OR UPDATE OR DELETE ON public.abonos_capital
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_recalcular_capital_desde_abonos();
  END IF;
END;
$$;

SELECT proname
FROM pg_proc
WHERE proname IN (
  'capital_pendiente_prestamo',
  'get_capital_pendiente_ruta',
  'recalcular_capital_ruta'
)
ORDER BY proname;
