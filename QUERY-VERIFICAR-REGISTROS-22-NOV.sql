-- ============================================
-- 🔍 VERIFICAR REGISTROS DEL 22/11/2025
-- ============================================
-- Esta query muestra TODOS los registros del 22 de noviembre
-- Incluye los que tienen errores para que puedas verlos

SELECT 
  u.email,
  u.created_at as fecha_registro,
  p.full_name as nombre,
  pl.nombre as plan_actual,
  -- Estado detallado
  CASE 
    WHEN p.id IS NULL THEN '❌ ERROR: Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ ERROR: Sin plan'
    WHEN pl.slug != 'free' THEN '💰 Usuario de pago'
    ELSE '✅ Usuario gratuito OK'
  END as estado,
  -- Información adicional
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos_creados
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE DATE(u.created_at) = '2025-11-22'
ORDER BY u.created_at DESC;

-- ============================================
-- 📊 RESUMEN DEL 22/11/2025
-- ============================================
-- Cuenta cuántos registros hubo ese día y cuántos tienen problemas

SELECT 
  COUNT(*) as total_registros_22_nov,
  COUNT(CASE WHEN p.id IS NOT NULL AND p.plan_id IS NOT NULL THEN 1 END) as registros_exitosos,
  COUNT(CASE WHEN p.id IS NULL OR p.plan_id IS NULL THEN 1 END) as registros_con_error
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE DATE(u.created_at) = '2025-11-22';

-- ============================================
-- 🔍 VER TODOS LOS REGISTROS (INCLUYE ERRORES)
-- ============================================
-- Esta query muestra TODOS los registros, incluyendo los que tienen problemas
-- Úsala para encontrar los 3 registros que faltan

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

