-- =====================================================
-- SCRIPT: Verificación de préstamos y organizaciones
-- =====================================================
-- NOTA IMPORTANTE: La tabla 'prestamos' NO tiene columna 'organization_id'
-- Este script verifica la relación prestamos-usuarios-organizaciones
-- a través de la tabla profiles
-- =====================================================

-- PASO 1: Verificar estructura de la tabla prestamos
SELECT 
  'Verificando estructura de prestamos' as paso,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prestamos'
  AND column_name IN ('id', 'user_id', 'ruta_id', 'organization_id')
ORDER BY ordinal_position;

-- PASO 2: Verificar todos los préstamos y sus usuarios
SELECT 
  'Estado de préstamos y organizaciones' as resumen,
  COUNT(*) as total_prestamos,
  COUNT(prof.organization_id) as prestamos_con_org_via_usuario,
  COUNT(CASE WHEN prof.organization_id IS NULL THEN 1 END) as prestamos_sin_org
FROM prestamos p
LEFT JOIN profiles prof ON prof.id = p.user_id;

-- PASO 3: Ver préstamos de usuarios sin organización (problema)
SELECT 
  p.id as prestamo_id,
  p.user_id,
  p.cliente_id,
  p.monto_prestado,
  p.estado,
  prof.email,
  prof.organization_id,
  CASE 
    WHEN prof.organization_id IS NULL THEN '⚠️ Usuario sin organización'
    ELSE '✅ Usuario con organización'
  END as estado_validacion
FROM prestamos p
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE prof.organization_id IS NULL
LIMIT 20;

-- PASO 4: Si hay usuarios sin organización, ejecutar este script primero:
-- MIGRACION_MASIVA_TODOS_USUARIOS.sql

-- PASO 5: Verificar integridad de datos
SELECT 
  'Integridad de datos' as check_nombre,
  COUNT(p.id) as total_prestamos,
  COUNT(prof.id) as prestamos_con_usuario_existente,
  COUNT(prof.organization_id) as prestamos_con_usuario_y_org,
  COUNT(CASE WHEN prof.id IS NULL THEN 1 END) as prestamos_huerfanos,
  COUNT(CASE WHEN prof.organization_id IS NULL THEN 1 END) as usuarios_sin_org
FROM prestamos p
LEFT JOIN profiles prof ON prof.id = p.user_id;

-- =====================================================
-- CONCLUSIÓN
-- =====================================================
-- La tabla prestamos NO tiene organization_id.
-- La relación prestamos -> organización se hace a través de:
-- prestamos.user_id -> profiles.organization_id
-- 
-- El API route ya está corregido para manejar esto correctamente.
-- =====================================================

SELECT '✅ Verificación completada. Revisa los resultados arriba.' as mensaje;
