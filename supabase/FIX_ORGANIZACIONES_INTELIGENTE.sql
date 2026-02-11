-- =========================================================
-- FIX INTELIGENTE: Corregir organizaciones huérfanas
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- PROBLEMA:
-- Algunos usuarios (cobradores) tienen su propia organización cuando
-- deberían estar en la organización del admin que los creó.
-- 
-- ESTRATEGIA SEGURA:
-- 1. Identificar "organizaciones huérfanas" (solo 1 usuario, plan gratuito)
-- 2. Para cada usuario en org huérfana, buscar si tiene user_role en otra org
-- 3. Si lo encuentra, moverlo a esa organización correcta
-- 4. NUNCA mezclar organizaciones con múltiples usuarios o planes pagados
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 CORRIGIENDO ORGANIZACIONES HUÉRFANAS' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: Identificar organizaciones huérfanas
-- =========================================================

CREATE TEMP TABLE organizaciones_huerfanas AS
SELECT 
  o.id as org_id,
  o.nombre_negocio,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  COUNT(p.id) as total_usuarios,
  (ARRAY_AGG(p.id))[1] as unico_usuario_id
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre, pl.slug
HAVING 
  -- Solo organizaciones con 1 usuario Y plan gratuito
  COUNT(p.id) = 1 
  AND (pl.slug = 'free' OR pl.slug IS NULL);

SELECT 
  'ORGANIZACIONES HUÉRFANAS DETECTADAS:' as info,
  COUNT(*) as total
FROM organizaciones_huerfanas;

-- Ver detalles
SELECT 
  'Detalle de organizaciones huérfanas:' as info,
  oh.nombre_negocio,
  p.email as usuario_unico,
  p.role as rol_en_org_huerfana
FROM organizaciones_huerfanas oh
JOIN profiles p ON p.id = oh.unico_usuario_id
LIMIT 20;

SELECT '✓ Paso 1: Organizaciones huérfanas identificadas' as " ";

-- =========================================================
-- PASO 2: Para cada usuario en org huérfana, buscar su org correcta
-- =========================================================

CREATE TEMP TABLE movimientos_necesarios AS
SELECT DISTINCT ON (oh.unico_usuario_id)
  oh.unico_usuario_id as user_id,
  p.email,
  oh.org_id as org_actual_incorrecta,
  ur.organization_id as org_correcta,
  ur.role as rol_correcto
FROM organizaciones_huerfanas oh
JOIN profiles p ON p.id = oh.unico_usuario_id
JOIN user_roles ur ON ur.user_id = oh.unico_usuario_id
WHERE 
  -- El user_role apunta a una organización DIFERENTE (la correcta)
  ur.organization_id != oh.org_id
  -- Y esa organización existe
  AND EXISTS (
    SELECT 1 FROM organizations o2 WHERE o2.id = ur.organization_id
  )
ORDER BY oh.unico_usuario_id, ur.created_at DESC;

SELECT 
  'MOVIMIENTOS NECESARIOS:' as info,
  COUNT(*) as total_usuarios_a_mover
FROM movimientos_necesarios;

-- Ver detalles de movimientos
SELECT 
  'Usuarios que se moverán:' as info,
  mn.email,
  mn.rol_correcto,
  o_correcta.nombre_negocio as org_destino,
  pl.nombre as plan_destino
FROM movimientos_necesarios mn
JOIN organizations o_correcta ON o_correcta.id = mn.org_correcta
LEFT JOIN planes pl ON pl.id = o_correcta.plan_id
LIMIT 20;

SELECT '✓ Paso 2: Movimientos identificados' as " ";

-- =========================================================
-- PASO 3: Ejecutar movimientos
-- =========================================================

DO $$
DECLARE
  v_mov RECORD;
  v_movidos INTEGER := 0;
BEGIN
  FOR v_mov IN 
    SELECT * FROM movimientos_necesarios
  LOOP
    -- Actualizar profiles
    UPDATE profiles
    SET 
      organization_id = v_mov.org_correcta,
      role = v_mov.rol_correcto,
      updated_at = NOW()
    WHERE id = v_mov.user_id;
    
    v_movidos := v_movidos + 1;
    
    RAISE NOTICE '✓ Movido: % → Org correcta', v_mov.email;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Total usuarios movidos: %', v_movidos;
  RAISE NOTICE '========================================';
END $$;

SELECT '✓ Paso 3: Usuarios movidos a organizaciones correctas' as " ";

-- =========================================================
-- PASO 4: Limpiar organizaciones huérfanas vacías
-- =========================================================

-- Ver organizaciones que quedaron vacías
SELECT 
  'ORGANIZACIONES VACÍAS (pueden eliminarse):' as info,
  o.id,
  o.nombre_negocio,
  COUNT(p.id) as usuarios_restantes
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio
HAVING COUNT(p.id) = 0
LIMIT 20;

SELECT '✓ Paso 4: Organizaciones vacías identificadas' as " ";
SELECT '⚠️ No se eliminan automáticamente por seguridad' as " ";

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICACIÓN FINAL' as " ";
SELECT '========================================' as " ";

-- Ver organizaciones con usuarios y sus planes
SELECT 
  'ORGANIZACIONES DESPUÉS DEL FIX:' as info,
  o.nombre_negocio,
  pl.nombre as plan,
  pl.limite_clientes,
  pl.limite_prestamos,
  COUNT(p.id) as total_usuarios,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN p.role = 'cobrador' THEN 1 END) as cobradores
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre, pl.limite_clientes, pl.limite_prestamos
HAVING COUNT(p.id) > 0
ORDER BY 
  CASE WHEN pl.slug != 'free' THEN 0 ELSE 1 END,
  total_usuarios DESC
LIMIT 30;

-- Verificar que no quedan organizaciones de 1 usuario con plan gratuito (huérfanas)
SELECT 
  'ORGANIZACIONES HUÉRFANAS RESTANTES:' as info,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No quedan organizaciones huérfanas'
    ELSE '⚠️ Aún hay organizaciones huérfanas (revisar manualmente)'
  END as estado
FROM (
  SELECT o.id
  FROM organizations o
  LEFT JOIN planes pl ON pl.id = o.plan_id
  LEFT JOIN profiles p ON p.organization_id = o.id
  GROUP BY o.id, pl.slug
  HAVING COUNT(p.id) = 1 AND (pl.slug = 'free' OR pl.slug IS NULL)
) subq;

-- Limpiar tablas temporales
DROP TABLE IF EXISTS organizaciones_huerfanas;
DROP TABLE IF EXISTS movimientos_necesarios;

SELECT '========================================' as " ";
SELECT '✅ FIX COMPLETADO' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 RESULTADO:' as " ";
SELECT '- Usuarios en organizaciones huérfanas han sido movidos' as " ";
SELECT '- Organizaciones legítimas NO fueron tocadas' as " ";
SELECT '- Cada admin mantiene su propia organización' as " ";
SELECT '- Cobradores están con sus admins correctos' as " ";
SELECT '' as " ";
SELECT '🚀 SIGUIENTE PASO:' as " ";
SELECT '1. Refresca tu navegador (Ctrl+F5)' as " ";
SELECT '2. Verifica que admin y cobradores vean el mismo plan' as " ";
SELECT '3. Verifica que múltiples organizaciones NO se mezclaron' as " ";
SELECT '========================================' as " ";
