-- =====================================================
-- HOTFIX: Corrige capital duplicado por ingreso inicial
-- =====================================================
-- Ejecutar este script si ya corriste FIX_CAPITAL_RUTAS_FORMULA_CONSISTENTE.sql
-- y observas capital inflado (ej: +capital_inicial duplicado).

BEGIN;

CREATE OR REPLACE FUNCTION public.recalcular_capital_ruta(p_ruta_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capital_inicial NUMERIC := 0;
  v_manual_neto NUMERIC := 0;
  v_total_pagos NUMERIC := 0;
  v_total_prestado_activo NUMERIC := 0;
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

  -- Excluir ingreso de capital inicial para evitar doble conteo
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

  SELECT COALESCE(SUM(pr.monto_prestado), 0)
  INTO v_total_prestado_activo
  FROM public.prestamos pr
  WHERE pr.ruta_id = p_ruta_id
    AND pr.estado IN ('activo', 'pendiente');

  SELECT COALESCE(SUM(g.monto), 0)
  INTO v_total_gastos_aprobados
  FROM public.gastos g
  WHERE g.ruta_id = p_ruta_id
    AND g.aprobado = true;

  v_capital_actual :=
      v_capital_inicial
    + v_manual_neto
    + v_total_pagos
    - v_total_prestado_activo
    - v_total_gastos_aprobados;

  UPDATE public.rutas
  SET capital_actual = v_capital_actual,
      updated_at = NOW()
  WHERE id = p_ruta_id;

  RETURN v_capital_actual;
END;
$$;

-- Recalcular todas las rutas inmediatamente
SELECT public.recalcular_capital_ruta(r.id)
FROM public.rutas r;

COMMIT;
