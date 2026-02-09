-- =====================================================
-- SCRIPT: Corregir trigger de pagos para capital de rutas
-- =====================================================
-- ERROR: record "new" has no field "ruta_id"
-- SOLUCIÓN: Recrear función que obtiene ruta_id de prestamos
-- =====================================================

-- PASO 1: Eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_actualizar_capital_pago ON public.pagos;
DROP TRIGGER IF EXISTS trigger_pago_actualiza_capital ON public.pagos;

-- PASO 2: Recrear función correcta
CREATE OR REPLACE FUNCTION public.actualizar_capital_pago()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
  v_capital_actual DECIMAL(12, 2);
BEGIN
  -- Obtener ruta del préstamo (NO de NEW.ruta_id que no existe)
  SELECT ruta_id INTO v_ruta_id
  FROM public.prestamos
  WHERE id = NEW.prestamo_id;
  
  -- Solo procesar si el préstamo tiene ruta asignada
  IF v_ruta_id IS NOT NULL THEN
    -- Obtener capital actual de la ruta
    SELECT capital_actual INTO v_capital_actual
    FROM public.rutas
    WHERE id = v_ruta_id
    FOR UPDATE;
    
    -- Actualizar capital de la ruta (suma el pago)
    UPDATE public.rutas
    SET capital_actual = capital_actual + NEW.monto_pagado,
        updated_at = NOW()
    WHERE id = v_ruta_id;
    
    -- Registrar movimiento (opcional, comentar si tabla no existe)
    BEGIN
      INSERT INTO public.movimientos_capital_ruta (
        ruta_id, tipo_movimiento, monto, saldo_anterior, saldo_nuevo,
        pago_id, realizado_por, concepto
      ) VALUES (
        v_ruta_id, 'pago_recibido', NEW.monto_pagado,
        v_capital_actual, v_capital_actual + NEW.monto_pagado,
        NEW.id, NEW.user_id, 
        'Pago recibido de cuota #' || (SELECT numero_cuota FROM public.cuotas WHERE id = NEW.cuota_id LIMIT 1)
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- Si la tabla movimientos_capital_ruta no existe, continuar sin registrar
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Recrear trigger
CREATE TRIGGER trigger_actualizar_capital_pago
AFTER INSERT ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_capital_pago();

-- PASO 4: Verificación
SELECT 
  'Trigger recreado correctamente' as resultado,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pagos'
  AND event_object_schema = 'public';

SELECT '✅ Script completado. El trigger está corregido.' as mensaje;

-- =====================================================
-- PRUEBA
-- =====================================================
-- Para probar, intenta registrar un pago nuevamente desde la UI
-- Debería funcionar sin el error "record new has no field ruta_id"
-- =====================================================
