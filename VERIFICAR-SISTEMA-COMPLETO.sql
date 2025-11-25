-- ============================================
-- 🔍 VERIFICACIÓN COMPLETA DEL SISTEMA
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- Te mostrará el estado de todos los componentes

-- ============================================
-- 1. VERIFICAR PLAN GRATUITO
-- ============================================
SELECT 
  '1. Plan Gratuito' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE - Ejecuta schema-subscriptions.sql'
  END as estado,
  COUNT(*) as cantidad
FROM planes
WHERE slug = 'free';

-- ============================================
-- 2. VERIFICAR TRIGGER DE REGISTRO
-- ============================================
SELECT 
  '2. Trigger de Registro' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Activo'
    ELSE '❌ NO EXISTE - Ejecuta EJECUTAR-AHORA-corregir-registros-completo.sql'
  END as estado,
  COUNT(*) as cantidad
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- 3. VERIFICAR FUNCIÓN handle_new_user
-- ============================================
SELECT 
  '3. Función handle_new_user' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE - Ejecuta EJECUTAR-AHORA-corregir-registros-completo.sql'
  END as estado,
  COUNT(*) as cantidad
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- ============================================
-- 4. VERIFICAR TABLA email_campaigns
-- ============================================
SELECT 
  '4. Tabla email_campaigns' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE - Ejecuta create_email_campaigns.sql'
  END as estado,
  COUNT(*) as cantidad
FROM information_schema.tables
WHERE table_name = 'email_campaigns';

-- ============================================
-- 5. VERIFICAR TRIGGER DE EMAIL CAMPAIGN
-- ============================================
SELECT 
  '5. Trigger Email Campaign' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Activo'
    ELSE '❌ NO EXISTE - Ejecuta create_email_campaigns.sql'
  END as estado,
  COUNT(*) as cantidad
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created_email_campaign';

-- ============================================
-- 6. VERIFICAR FUNCIÓN handle_new_user_email_campaign
-- ============================================
SELECT 
  '6. Función Email Campaign' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE - Ejecuta create_email_campaigns.sql'
  END as estado,
  COUNT(*) as cantidad
FROM information_schema.routines
WHERE routine_name = 'handle_new_user_email_campaign';

-- ============================================
-- 7. VERIFICAR USUARIOS CON PERFIL Y PLAN
-- ============================================
SELECT 
  '7. Usuarios con Perfil y Plan' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay usuarios correctos'
    ELSE '⚠️ No hay usuarios con perfil y plan'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.plan_id IS NOT NULL;

-- ============================================
-- 8. VERIFICAR USUARIOS EN EMAIL CAMPAIGN
-- ============================================
SELECT 
  '8. Usuarios en Email Campaign' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay usuarios en campaña'
    ELSE '⚠️ No hay usuarios en campaña - Ejecuta AGREGAR-USUARIOS-CORREGIDOS-A-EMAIL-CAMPAIGN.sql'
  END as estado
FROM email_campaigns;

-- ============================================
-- 9. VERIFICAR USUARIOS SIN PERFIL (PROBLEMA)
-- ============================================
SELECT 
  '9. Usuarios SIN Perfil' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen perfil'
    ELSE '❌ HAY PROBLEMAS - Ejecuta EJECUTAR-AHORA-corregir-registros-completo.sql'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ============================================
-- 10. VERIFICAR USUARIOS SIN PLAN (PROBLEMA)
-- ============================================
SELECT 
  '10. Usuarios SIN Plan' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen plan'
    ELSE '❌ HAY PROBLEMAS - Ejecuta EJECUTAR-AHORA-corregir-registros-completo.sql'
  END as estado
FROM profiles
WHERE plan_id IS NULL;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
  '📊 RESUMEN' as tipo,
  'Total Usuarios' as metrica,
  COUNT(*) as valor
FROM auth.users
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Usuarios con Perfil OK',
  COUNT(*)
FROM profiles
WHERE plan_id IS NOT NULL
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Usuarios en Email Campaign',
  COUNT(*)
FROM email_campaigns
UNION ALL
SELECT 
  '📊 RESUMEN',
  'Usuarios con Problemas',
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN profiles p ON au.id = p.id WHERE p.id IS NULL OR p.plan_id IS NULL);

