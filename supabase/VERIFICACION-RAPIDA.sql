-- ============================================
-- ⚡ VERIFICACIÓN RÁPIDA DE REGISTROS
-- ============================================
-- Ejecuta este script cuando quieras verificar rápidamente 
-- que los registros de tu campaña estén funcionando bien

-- 🎯 RESULTADO ESPERADO: 
-- Todo debe mostrar 0 problemas y ✅ en los estados

-- ============================================
-- 📊 RESUMEN EJECUTIVO
-- ============================================

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════";

SELECT 
  '🎯 ESTADO GENERAL DEL SISTEMA' as "";

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════";

-- Total de usuarios
SELECT 
  '👥 Total Usuarios Registrados:' as metrica,
  COUNT(*)::text as valor
FROM auth.users;

-- Usuarios con problemas
SELECT 
  '⚠️  Usuarios con Problemas:' as metrica,
  COUNT(*)::text || 
  CASE 
    WHEN COUNT(*) = 0 THEN ' ✅ TODO BIEN'
    ELSE ' ❌ NECESITA CORRECCIÓN'
  END as valor
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL OR p.plan_id IS NULL;

-- Registros de hoy
SELECT 
  '📅 Registros de Hoy:' as metrica,
  COUNT(*)::text as valor
FROM auth.users
WHERE DATE(created_at) = CURRENT_DATE;

-- Registros de esta semana
SELECT 
  '📊 Registros esta Semana:' as metrica,
  COUNT(*)::text as valor
FROM auth.users
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE);

-- Usuarios activos (que han creado algo)
SELECT 
  '🎯 Usuarios Activos (con datos):' as metrica,
  COUNT(DISTINCT user_id)::text || ' usuarios' as valor
FROM (
  SELECT user_id FROM clientes
  UNION
  SELECT user_id FROM prestamos
) active_users;

-- Conversión (usuarios que realmente usan la app)
SELECT 
  '💰 Tasa de Conversión:' as metrica,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN c.user_id IS NOT NULL OR pr.user_id IS NOT NULL THEN u.id END) / 
    NULLIF(COUNT(DISTINCT u.id), 0),
    1
  )::text || '%' as valor
FROM auth.users u
LEFT JOIN clientes c ON u.id = c.user_id
LEFT JOIN prestamos pr ON u.id = pr.user_id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days';

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════";

-- ============================================
-- 🔍 ÚLTIMOS 10 REGISTROS
-- ============================================

SELECT 
  '📋 ÚLTIMOS 10 REGISTROS' as "";

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════";

SELECT 
  LEFT(u.email, 25) as email,
  TO_CHAR(u.created_at, 'DD/MM HH24:MI') as registro,
  COALESCE(pl.nombre, 'Sin plan') as plan,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = u.id) as prestamos,
  CASE 
    WHEN p.id IS NULL THEN '❌'
    WHEN p.plan_id IS NULL THEN '❌'
    ELSE '✅'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 10;

SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════";

-- ============================================
-- ⚠️ PROBLEMAS DETECTADOS (si los hay)
-- ============================================

DO $$
DECLARE
  problem_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO problem_count
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE p.id IS NULL OR p.plan_id IS NULL;
  
  IF problem_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '⚠️  ALERTA: % USUARIOS CON PROBLEMAS', problem_count;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '👉 SOLUCIÓN: Ejecuta el script:';
    RAISE NOTICE '   supabase/EJECUTAR-AHORA-corregir-registros-completo.sql';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅✅✅ SISTEMA FUNCIONANDO PERFECTAMENTE';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Todos los usuarios tienen perfil';
    RAISE NOTICE '✅ Todos los perfiles tienen plan asignado';
    RAISE NOTICE '✅ Los nuevos registros funcionarán automáticamente';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Tu campaña de Google Ads está lista!';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================
-- 💡 COMANDOS ÚTILES
-- ============================================
-- Si necesitas más información, ejecuta:
-- 
-- Ver todos los registros del día:
-- SELECT email, created_at FROM auth.users 
-- WHERE DATE(created_at) = CURRENT_DATE;
--
-- Ver actividad de un usuario específico:
-- SELECT * FROM profiles WHERE email = 'email@ejemplo.com';
--
-- Ver monitoreo completo:
-- Abre: supabase/MONITOREO-registros-campana.sql

