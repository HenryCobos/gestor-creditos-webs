-- ============================================
-- ✅ QUERY RÁPIDA: VER TUS REGISTROS EXITOSOS
-- ============================================
-- Copia y pega esta query en Supabase SQL Editor
-- Muestra SOLO los registros que están funcionando correctamente
-- 
-- ⚠️ IMPORTANTE: Si Google Ads dice que tienes más conversiones pero no las ves aquí,
-- es porque esos registros tienen errores (sin perfil o sin plan).
-- Usa la query "VER TODOS LOS REGISTROS (INCLUYE ERRORES)" para encontrarlos.

SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados,
  CASE 
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 📊 CONTAR TOTAL DE REGISTROS EXITOSOS
-- ============================================
-- Ejecuta esta query para contar cuántos registros exitosos tienes

SELECT 
  COUNT(*) as total_registros_exitosos,
  COUNT(CASE WHEN pl.slug = 'free' THEN 1 END) as usuarios_gratuitos,
  COUNT(CASE WHEN pl.slug != 'free' THEN 1 END) as usuarios_de_pago
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL AND p.plan_id IS NOT NULL;

-- ============================================
-- 🔍 VER TODOS LOS REGISTROS (INCLUYE ERRORES)
-- ============================================
-- Si Google Ads dice que tienes más conversiones pero no las ves en la query anterior,
-- ejecuta esta query para ver TODOS los registros (incluyendo los que tienen problemas)

SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR: Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ ERROR: Sin plan'
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 50;

