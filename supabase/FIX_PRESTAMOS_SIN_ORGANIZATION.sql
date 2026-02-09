-- =====================================================
-- SCRIPT: Actualizar préstamos sin organization_id
-- =====================================================
-- Descripción: Algunos préstamos fueron creados antes de implementar
--              el sistema de organizaciones y no tienen organization_id.
--              Este script actualiza esos préstamos basándose en la
--              organización del usuario que los creó.
-- =====================================================

-- PASO 1: Verificar cuántos préstamos están sin organization_id
SELECT 
  'Préstamos sin organization_id' as estado,
  COUNT(*) as total
FROM prestamos
WHERE organization_id IS NULL;

-- PASO 2: Ver detalles de los préstamos sin organization_id
SELECT 
  p.id,
  p.user_id,
  p.organization_id,
  p.cliente_id,
  p.monto_prestado,
  p.estado,
  prof.organization_id as user_org_id,
  prof.email
FROM prestamos p
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE p.organization_id IS NULL
LIMIT 20;

-- PASO 3: Actualizar préstamos sin organization_id
-- Asignar el organization_id del usuario que creó el préstamo
UPDATE prestamos p
SET 
  organization_id = prof.organization_id,
  updated_at = NOW()
FROM profiles prof
WHERE p.user_id = prof.id
  AND p.organization_id IS NULL
  AND prof.organization_id IS NOT NULL;

-- PASO 4: Verificar resultados
SELECT 
  'Estado después de actualización' as resultado,
  COUNT(*) as total_prestamos,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as sin_organization,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as con_organization
FROM prestamos;

-- PASO 5: Verificar préstamos que AÚN están sin organization_id
-- (Estos serían préstamos de usuarios que tampoco tienen organization_id)
SELECT 
  p.id as prestamo_id,
  p.user_id,
  p.organization_id as prestamo_org,
  prof.organization_id as user_org,
  prof.email,
  'Usuario también sin organization_id' as problema
FROM prestamos p
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE p.organization_id IS NULL;

-- =====================================================
-- OPCIONAL: Si hay usuarios sin organization_id,
-- primero ejecutar MIGRACION_MASIVA_TODOS_USUARIOS.sql
-- =====================================================

-- ✅ RESULTADO ESPERADO:
-- - Todos los préstamos deben tener organization_id
-- - El organization_id debe coincidir con el del usuario que los creó
-- - Si aún hay préstamos sin organization_id, revisar que los usuarios tengan organización

SELECT '✅ Script completado. Verifica los resultados arriba.' as mensaje;
