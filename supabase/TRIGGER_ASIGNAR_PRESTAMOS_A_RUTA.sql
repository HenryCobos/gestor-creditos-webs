-- ============================================
-- TRIGGER: Asignar préstamos automáticamente cuando se asigna cliente a ruta
-- ============================================

-- PASO 1: Crear función que actualiza préstamos cuando se asigna cliente a ruta
CREATE OR REPLACE FUNCTION asignar_prestamos_a_ruta()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se activa un cliente en una ruta (INSERT o UPDATE activo=true)
  IF (TG_OP = 'INSERT' AND NEW.activo = true) OR 
     (TG_OP = 'UPDATE' AND NEW.activo = true AND OLD.activo = false) THEN
    
    -- Actualizar todos los préstamos activos del cliente a esta ruta
    UPDATE prestamos
    SET ruta_id = NEW.ruta_id,
        updated_at = NOW()
    WHERE cliente_id = NEW.cliente_id
      AND estado IN ('activo', 'pendiente')
      AND (ruta_id IS NULL OR ruta_id != NEW.ruta_id);
    
    RAISE NOTICE 'Préstamos del cliente % asignados a ruta %', NEW.cliente_id, NEW.ruta_id;
  
  -- Cuando se desactiva un cliente de una ruta
  ELSIF TG_OP = 'UPDATE' AND NEW.activo = false AND OLD.activo = true THEN
    
    -- Quitar la asignación de ruta de los préstamos del cliente
    UPDATE prestamos
    SET ruta_id = NULL,
        updated_at = NOW()
    WHERE cliente_id = NEW.cliente_id
      AND ruta_id = OLD.ruta_id
      AND estado IN ('activo', 'pendiente');
    
    RAISE NOTICE 'Préstamos del cliente % removidos de ruta %', NEW.cliente_id, OLD.ruta_id;
  
  -- Cuando se elimina la relación
  ELSIF TG_OP = 'DELETE' AND OLD.activo = true THEN
    
    -- Quitar la asignación de ruta de los préstamos del cliente
    UPDATE prestamos
    SET ruta_id = NULL,
        updated_at = NOW()
    WHERE cliente_id = OLD.cliente_id
      AND ruta_id = OLD.ruta_id
      AND estado IN ('activo', 'pendiente');
    
    RAISE NOTICE 'Préstamos del cliente % removidos de ruta %', OLD.cliente_id, OLD.ruta_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Crear trigger
DROP TRIGGER IF EXISTS trigger_asignar_prestamos_a_ruta ON ruta_clientes;

CREATE TRIGGER trigger_asignar_prestamos_a_ruta
AFTER INSERT OR UPDATE OR DELETE ON ruta_clientes
FOR EACH ROW
EXECUTE FUNCTION asignar_prestamos_a_ruta();

-- PASO 3: Actualizar préstamos existentes de clientes ya asignados a rutas
-- Esto actualiza todos los préstamos activos cuyos clientes ya están en rutas
UPDATE prestamos p
SET ruta_id = rc.ruta_id,
    updated_at = NOW()
FROM ruta_clientes rc
WHERE rc.cliente_id = p.cliente_id
  AND rc.activo = true
  AND p.estado IN ('activo', 'pendiente')
  AND (p.ruta_id IS NULL OR p.ruta_id != rc.ruta_id);

-- PASO 4: Verificar cuántos préstamos se actualizaron
SELECT 
  r.nombre_ruta,
  r.id as ruta_id,
  COUNT(DISTINCT rc.cliente_id) as clientes_asignados,
  COUNT(DISTINCT p.id) as prestamos_asignados
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
LEFT JOIN prestamos p ON p.ruta_id = r.id AND p.estado IN ('activo', 'pendiente')
GROUP BY r.id, r.nombre_ruta
ORDER BY r.nombre_ruta;

-- PASO 5: Ver detalle de préstamos por ruta
SELECT 
  r.nombre_ruta,
  c.nombre as cliente,
  p.id as prestamo_id,
  p.monto_prestado,
  p.estado,
  p.ruta_id
FROM rutas r
JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
JOIN clientes c ON c.id = rc.cliente_id
LEFT JOIN prestamos p ON p.cliente_id = c.id AND p.estado IN ('activo', 'pendiente')
ORDER BY r.nombre_ruta, c.nombre;

-- ✅ RESULTADO ESPERADO:
-- - PASO 4 debe mostrar tus rutas con clientes y préstamos asignados
-- - PASO 5 debe mostrar el detalle de cada préstamo por ruta
-- - El trigger asegura que futuros clientes asignados tengan sus préstamos automáticamente en la ruta
