-- =====================================================
-- RECALCULAR CAPITAL DISPONIBLE DE RUTAS
-- =====================================================
-- Este script recalcula el capital disponible de cada ruta
-- considerando préstamos activos, pagos y gastos

-- PASO 1: Ver el estado actual de las rutas
SELECT 
  '=== ESTADO ACTUAL ===' as info;

SELECT 
  r.id,
  r.nombre_ruta,
  r.capital_inicial,
  r.capital_disponible as capital_actual,
  COUNT(DISTINCT rc.cliente_id) as clientes_asignados,
  COUNT(DISTINCT p.id) as prestamos_en_ruta,
  COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto ELSE 0 END), 0) as total_prestado_activo
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
LEFT JOIN clientes c ON c.id = rc.cliente_id
LEFT JOIN prestamos p ON p.cliente_id = c.id AND p.ruta_id = r.id
GROUP BY r.id, r.nombre_ruta, r.capital_inicial, r.capital_disponible
ORDER BY r.nombre_ruta;

-- PASO 2: Crear función para calcular capital disponible de una ruta
CREATE OR REPLACE FUNCTION calcular_capital_disponible_ruta(p_ruta_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_capital_inicial NUMERIC;
  v_total_prestado NUMERIC;
  v_total_pagos NUMERIC;
  v_total_gastos NUMERIC;
  v_capital_disponible NUMERIC;
BEGIN
  -- Obtener capital inicial
  SELECT capital_inicial INTO v_capital_inicial
  FROM rutas
  WHERE id = p_ruta_id;
  
  IF v_capital_inicial IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular total prestado (solo préstamos activos y pendientes)
  SELECT COALESCE(SUM(pr.monto), 0) INTO v_total_prestado
  FROM prestamos pr
  WHERE pr.ruta_id = p_ruta_id
    AND pr.estado IN ('activo', 'pendiente');
  
  -- Calcular total de pagos recibidos
  SELECT COALESCE(SUM(pag.monto_pagado), 0) INTO v_total_pagos
  FROM pagos pag
  JOIN prestamos pr ON pr.id = pag.prestamo_id
  WHERE pr.ruta_id = p_ruta_id;
  
  -- Calcular total de gastos
  SELECT COALESCE(SUM(g.monto), 0) INTO v_total_gastos
  FROM gastos g
  WHERE g.ruta_id = p_ruta_id
    AND g.aprobado = true;
  
  -- Calcular capital disponible
  v_capital_disponible := v_capital_inicial + v_total_pagos - v_total_prestado - v_total_gastos;
  
  RETURN v_capital_disponible;
END;
$$;

SELECT '✓ Función calcular_capital_disponible_ruta() creada' as "Paso 2";

-- PASO 3: Actualizar el capital disponible de TODAS las rutas
UPDATE rutas
SET 
  capital_disponible = calcular_capital_disponible_ruta(id),
  updated_at = NOW()
WHERE id IN (SELECT id FROM rutas);

SELECT '✓ Capital de todas las rutas actualizado' as "Paso 3";

-- PASO 4: Verificar el resultado
SELECT 
  '=== RESULTADO FINAL ===' as info;

SELECT 
  r.nombre_ruta as "Ruta",
  r.capital_inicial as "Capital Inicial",
  
  -- Desglose
  COALESCE(SUM(CASE WHEN p.estado IN ('activo', 'pendiente') THEN p.monto ELSE 0 END), 0) as "Total Prestado",
  COALESCE((
    SELECT SUM(pag.monto_pagado) 
    FROM pagos pag 
    JOIN prestamos pr ON pr.id = pag.prestamo_id 
    WHERE pr.ruta_id = r.id
  ), 0) as "Total Pagos",
  COALESCE((
    SELECT SUM(g.monto) 
    FROM gastos g 
    WHERE g.ruta_id = r.id AND g.aprobado = true
  ), 0) as "Total Gastos",
  
  -- Capital disponible actualizado
  r.capital_disponible as "Capital Disponible",
  
  -- Verificación
  COUNT(DISTINCT rc.cliente_id) as "Clientes",
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado IN ('activo', 'pendiente')) as "Préstamos Activos"
  
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
LEFT JOIN clientes c ON c.id = rc.cliente_id
LEFT JOIN prestamos p ON p.cliente_id = c.id AND p.ruta_id = r.id
GROUP BY r.id, r.nombre_ruta, r.capital_inicial, r.capital_disponible
ORDER BY r.nombre_ruta;

-- PASO 5: Crear trigger para actualizar capital automáticamente
CREATE OR REPLACE FUNCTION trigger_actualizar_capital_ruta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar capital de la ruta afectada
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.ruta_id IS NOT NULL THEN
      UPDATE rutas
      SET capital_disponible = calcular_capital_disponible_ruta(NEW.ruta_id),
          updated_at = NOW()
      WHERE id = NEW.ruta_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.ruta_id IS NOT NULL AND OLD.ruta_id != NEW.ruta_id) THEN
    IF OLD.ruta_id IS NOT NULL THEN
      UPDATE rutas
      SET capital_disponible = calcular_capital_disponible_ruta(OLD.ruta_id),
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

-- Trigger cuando se crea/actualiza/elimina un préstamo
DROP TRIGGER IF EXISTS trigger_prestamo_actualiza_capital ON prestamos;
CREATE TRIGGER trigger_prestamo_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON prestamos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

-- Trigger cuando se registra un pago
DROP TRIGGER IF EXISTS trigger_pago_actualiza_capital ON pagos;
CREATE TRIGGER trigger_pago_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON pagos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

-- Trigger cuando se registra un gasto
DROP TRIGGER IF EXISTS trigger_gasto_actualiza_capital ON gastos;
CREATE TRIGGER trigger_gasto_actualiza_capital
AFTER INSERT OR UPDATE OR DELETE ON gastos
FOR EACH ROW
EXECUTE FUNCTION trigger_actualizar_capital_ruta();

SELECT '✓ Triggers creados para actualización automática' as "Paso 5";

-- PASO 6: Resumen final
SELECT 
  '========================================' as " ";
SELECT 
  '✅ RECALCULO COMPLETADO' as " ";
SELECT 
  '========================================' as " ";
SELECT 
  'El capital de todas las rutas ha sido recalculado' as " ";
SELECT 
  'Los triggers garantizan actualizaciones automáticas' as " ";
SELECT 
  ' ' as " ";
SELECT 
  '⚡ IMPORTANTE:' as " ";
SELECT 
  'Cada vez que se:' as " ";
SELECT 
  '  • Cree/modifique/elimine un préstamo' as " ";
SELECT 
  '  • Registre un pago' as " ";
SELECT 
  '  • Registre un gasto' as " ";
SELECT 
  'El capital de la ruta se actualizará automáticamente' as " ";
