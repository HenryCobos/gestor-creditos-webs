-- =====================================================
-- SCRIPT: Identificar y corregir trigger problemático en pagos
-- =====================================================
-- Error: record "new" has no field "ruta_id"
-- Causa: Hay un trigger que intenta acceder a NEW.ruta_id
-- =====================================================

-- PASO 1: Ver todos los triggers de la tabla pagos
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'pagos'
  AND event_object_schema = 'public';

-- PASO 2: Ver definición completa de cada trigger
SELECT 
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.pagos'::regclass
  AND tgisinternal = false;

-- PASO 3: Ver funciones asociadas a los triggers
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%pago%'
  OR p.proname LIKE '%ruta%'
  OR p.proname LIKE '%capital%';

-- =====================================================
-- POSIBLES SOLUCIONES (EJECUTAR SOLO SI IDENTIFICAS EL TRIGGER PROBLEMÁTICO)
-- =====================================================

-- OPCIÓN A: Si hay un trigger de actualización de capital de ruta
-- Este trigger probablemente intenta actualizar rutas.capital_actual basándose en NEW.ruta_id
-- Pero la tabla pagos NO tiene ruta_id, se debe obtener de prestamos

-- Ejemplo de trigger correcto:
/*
CREATE OR REPLACE FUNCTION actualizar_capital_ruta_desde_pago()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
BEGIN
  -- Obtener ruta_id del préstamo (si existe)
  SELECT ruta_id INTO v_ruta_id
  FROM prestamos
  WHERE id = NEW.prestamo_id;
  
  -- Solo actualizar si el préstamo tiene ruta asignada
  IF v_ruta_id IS NOT NULL THEN
    -- Recalcular capital de la ruta
    UPDATE rutas
    SET capital_actual = calcular_capital_actual_ruta(v_ruta_id)
    WHERE id = v_ruta_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_pago_actualiza_capital ON pagos;
CREATE TRIGGER trigger_pago_actualiza_capital
  AFTER INSERT ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_capital_ruta_desde_pago();
*/

-- OPCIÓN B: Si el trigger no es necesario, deshabilitarlo temporalmente
-- DROP TRIGGER IF EXISTS [nombre_del_trigger] ON pagos;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT '✅ Script completado. Revisa los triggers identificados arriba.' as mensaje;
