-- =====================================================
-- FIX: Capital de rutas con fórmula consistente
-- =====================================================
-- Problema que corrige:
-- - Diferencias entre "Cobros acumulados" y "Capital disponible"
-- - Préstamos asignados a ruta después de crearse pueden desbalancear capital
--
-- Fórmula objetivo por ruta:
-- capital_actual =
--   capital_inicial
-- + movimientos manuales netos (ingreso/transferencia_entrada - retiro/transferencia_salida)
-- + pagos recibidos (bruto)
-- - capital prestado ACTIVO
-- - gastos aprobados
--
-- Este script:
-- 1) Crea función de recálculo por ruta
-- 2) Recalcula TODAS las rutas (corrige históricos)
-- 3) Crea triggers para mantener consistencia en préstamos/pagos/gastos

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

  -- Si la ruta no existe, devolver 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Movimientos manuales netos (evitar doble conteo de préstamos/pagos aquí)
  -- IMPORTANTE:
  -- "Capital inicial de la ruta" YA está incluido en capital_inicial,
  -- por lo que NO debe volver a sumarse desde movimientos.
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

  -- Cobros acumulados (bruto)
  SELECT COALESCE(SUM(pg.monto_pagado), 0)
  INTO v_total_pagos
  FROM public.pagos pg
  JOIN public.prestamos pr ON pr.id = pg.prestamo_id
  WHERE pr.ruta_id = p_ruta_id;

  -- Capital prestado actualmente en circulación
  SELECT COALESCE(SUM(pr.monto_prestado), 0)
  INTO v_total_prestado_activo
  FROM public.prestamos pr
  WHERE pr.ruta_id = p_ruta_id
    AND pr.estado IN ('activo', 'pendiente');

  -- Gastos aprobados de la ruta
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

-- =====================================================
-- Trigger: préstamos (insert/update/delete)
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_recalcular_capital_desde_prestamos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(NEW.ruta_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(OLD.ruta_id);
    END IF;
    IF NEW.ruta_id IS NOT NULL AND (NEW.ruta_id IS DISTINCT FROM OLD.ruta_id OR NEW.monto_prestado IS DISTINCT FROM OLD.monto_prestado OR NEW.estado IS DISTINCT FROM OLD.estado) THEN
      PERFORM public.recalcular_capital_ruta(NEW.ruta_id);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(OLD.ruta_id);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalcular_capital_desde_prestamos ON public.prestamos;
CREATE TRIGGER trigger_recalcular_capital_desde_prestamos
AFTER INSERT OR UPDATE OR DELETE ON public.prestamos
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalcular_capital_desde_prestamos();

-- =====================================================
-- Trigger: pagos (insert/update/delete)
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_recalcular_capital_desde_pagos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ruta_old UUID;
  v_ruta_new UUID;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT pr.ruta_id INTO v_ruta_old
    FROM public.prestamos pr
    WHERE pr.id = OLD.prestamo_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT pr.ruta_id INTO v_ruta_new
    FROM public.prestamos pr
    WHERE pr.id = NEW.prestamo_id;
  END IF;

  IF v_ruta_old IS NOT NULL THEN
    PERFORM public.recalcular_capital_ruta(v_ruta_old);
  END IF;

  IF v_ruta_new IS NOT NULL AND (v_ruta_new IS DISTINCT FROM v_ruta_old) THEN
    PERFORM public.recalcular_capital_ruta(v_ruta_new);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalcular_capital_desde_pagos ON public.pagos;
CREATE TRIGGER trigger_recalcular_capital_desde_pagos
AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalcular_capital_desde_pagos();

-- =====================================================
-- Trigger: gastos (insert/update/delete)
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_recalcular_capital_desde_gastos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(NEW.ruta_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(OLD.ruta_id);
    END IF;
    IF NEW.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(NEW.ruta_id);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.ruta_id IS NOT NULL THEN
      PERFORM public.recalcular_capital_ruta(OLD.ruta_id);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalcular_capital_desde_gastos ON public.gastos;
CREATE TRIGGER trigger_recalcular_capital_desde_gastos
AFTER INSERT OR UPDATE OR DELETE ON public.gastos
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalcular_capital_desde_gastos();

-- =====================================================
-- Recalcular todas las rutas (corrige datos históricos)
-- =====================================================
SELECT public.recalcular_capital_ruta(r.id)
FROM public.rutas r;

COMMIT;

-- Verificación rápida
SELECT
  r.nombre_ruta,
  r.capital_inicial,
  r.capital_actual
FROM public.rutas r
ORDER BY r.nombre_ruta;
