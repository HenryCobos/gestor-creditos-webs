-- =====================================================
-- FIX: Recalcular capital usando nombres correctos
-- columna: capital_actual (ya existe)
-- columna préstamo: monto_prestado
-- =====================================================

-- PASO 1: Ver estado actual
SELECT 
  '=== ESTADO ACTUAL DE RUTAS ===' as info;

SELECT 
  r.id,
  r.nombre_ruta,
  r.capital_inicial,
  r.capital_actual,
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado IN ('activo', 'pendiente')) as prestamos_activos,
  COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto_prestado ELSE 0 END), 0) as total_prestado
FROM rutas r
LEFT JOIN prestamos p ON p.ruta_id = r.id
GROUP BY r.id, r.nombre_ruta, r.capital_inicial, r.capital_actual
ORDER BY r.nombre_ruta;

-- PASO 2: Crear función para calcular capital actual
CREATE OR REPLACE FUNCTION calcular_capital_actual_ruta(p_ruta_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_capital_inicial NUMERIC;
  v_total_prestado NUMERIC;
  v_total_pagos NUMERIC;
  v_total_gastos NUMERIC;
  v_capital_actual NUMERIC;
BEGIN
  -- Obtener capital inicial
  SELECT capital_inicial INTO v_capital_inicial
  FROM rutas
  WHERE id = p_ruta_id;
  
  IF v_capital_inicial IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular total prestado (solo préstamos activos y pendientes)
  SELECT COALESCE(SUM(pr.monto_prestado), 0) INTO v_total_prestado
  FROM prestamos pr
  WHERE pr.ruta_id = p_ruta_id
    AND pr.estado IN ('activo', 'pendiente');
  
  -- Calcular total de pagos recibidos
  SELECT COALESCE(SUM(pag.monto_pagado), 0) INTO v_total_pagos
  FROM pagos pag
  JOIN prestamos pr ON pr.id = pag.prestamo_id
  WHERE pr.ruta_id = p_ruta_id;
  
  -- Calcular total de gastos aprobados
  SELECT COALESCE(SUM(g.monto), 0) INTO v_total_gastos
  FROM gastos g
  WHERE g.ruta_id = p_ruta_id
    AND g.aprobado = true;
  
  -- Calcular capital actual
  v_capital_actual := v_capital_inicial + v_total_pagos - v_total_prestado - v_total_gastos;
  
  RETURN v_capital_actual;
END;
$$;

SELECT '✓ Función calcular_capital_actual_ruta() creada' as "Paso 2";

-- PASO 3: Actualizar capital_actual de TODAS las rutas
UPDATE rutas
SET 
  capital_actual = calcular_capital_actual_ruta(id),
  updated_at = NOW();

SELECT '✓ Capital de todas las rutas recalculado' as "Paso 3";

-- PASO 4: Crear triggers para actualización automática
CREATE OR REPLACE FUNCTION trigger_actualizar_capital_ruta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar capital de la ruta afectada
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.ruta_id IS NOT NULL THEN
      UPDATE rutas
      SET capital_actual = calcular_capital_actual_ruta(NEW.ruta_id),
          updated_at = NOW()
      WHERE id = NEW.ruta_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.ruta_id IS NOT NULL AND OLD.ruta_id != COALESCE(NEW.ruta_id, '00000000-0000-0000-0000-000000000000'::UUID)) THEN
    IF OLD.ruta_id IS NOT NULL THEN
      UPDATE rutas
      SET capital_actual = calcular_capital_actual_ruta(OLD.ruta_id),
          updated_at = NOW()
      WHERE id = OLD.ruta_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Crear triggers en las tablas relevantes
DROP TRIGGER IF EXISTS trigger_prestamo_actualiza_capital ON prestamos;
CREATE TRIGGER trigger_prestamo_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON prestamos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

DROP TRIGGER IF EXISTS trigger_pago_actualiza_capital ON pagos;
CREATE TRIGGER trigger_pago_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON pagos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

DROP TRIGGER IF EXISTS trigger_gasto_actualiza_capital ON gastos;
CREATE TRIGGER trigger_gasto_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON gastos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

SELECT '✓ Triggers creados para actualización automática' as "Paso 4";

-- PASO 5: Verificar resultado final con desglose detallado
SELECT 
  '=== RESULTADO FINAL ===' as info;

SELECT 
  r.nombre_ruta as "Ruta",
  r.capital_inicial as "Capital Inicial",
  
  -- Desglose detallado
  COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto_prestado ELSE 0 END), 0) as "Total Prestado",
  
  COALESCE((
    SELECT SUM(pag.monto_pagado) 
    FROM pagos pag 
    JOIN prestamos pr ON pr.id = pag.prestamo_id 
    WHERE pr.ruta_id = r.id
  ), 0) as "Pagos Recibidos",
  
  COALESCE((
    SELECT SUM(g.monto) 
    FROM gastos g 
    WHERE g.ruta_id = r.id AND g.aprobado = true
  ), 0) as "Gastos",
  
  -- Capital actual recalculado (NUEVO)
  r.capital_actual as "Capital Actual",
  
  -- Verificación manual
  (r.capital_inicial 
    + COALESCE((SELECT SUM(pag.monto_pagado) FROM pagos pag JOIN prestamos pr ON pr.id = pag.prestamo_id WHERE pr.ruta_id = r.id), 0)
    - COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto_prestado ELSE 0 END), 0)
    - COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.ruta_id = r.id AND g.aprobado = true), 0)
  ) as "Verificación Manual",
  
  -- Contadores
  COUNT(DISTINCT rc.cliente_id) FILTER (WHERE rc.activo = true) as "Clientes",
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado IN ('activo', 'pendiente')) as "Préstamos Activos"
  
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id
LEFT JOIN prestamos p ON p.ruta_id = r.id
GROUP BY r.id, r.nombre_ruta, r.capital_inicial, r.capital_actual
ORDER BY r.nombre_ruta;

-- PASO 6: Resumen
SELECT ' ' as " ";
SELECT '========================================' as " ";
SELECT '✅ RECALCULO COMPLETADO' as " ";
SELECT '========================================' as " ";
SELECT ' ' as " ";
SELECT 'CAMBIOS REALIZADOS:' as " ";
SELECT '• Función calcular_capital_actual_ruta() creada' as " ";
SELECT '• Capital de todas las rutas recalculado' as " ";
SELECT '• Triggers automáticos instalados' as " ";
SELECT ' ' as " ";
SELECT 'ACTUALIZACION AUTOMATICA:' as " ";
SELECT '• Al crear/modificar préstamo → capital se actualiza' as " ";
SELECT '• Al registrar pago → capital aumenta' as " ";
SELECT '• Al registrar gasto → capital disminuye' as " ";
SELECT ' ' as " ";
SELECT '⚠️ IMPORTANTE:' as " ";
SELECT 'La columna "capital_actual" en tabla rutas ahora refleja' as " ";
SELECT 'el dinero REAL disponible en cada ruta' as " ";
