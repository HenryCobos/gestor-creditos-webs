-- =====================================================
-- VERIFICAR PLANES PARA WEBHOOK DE HOTMART
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASO 1: Ver TODOS los planes actuales
-- =====================================================

SELECT 
  '=====================================' as separador,
  '📋 PLANES ACTUALES' as titulo;

SELECT 
  id,
  nombre,
  slug,
  precio_mensual,
  precio_anual,
  limite_clientes,
  limite_prestamos,
  activo,
  CASE 
    WHEN activo = true THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as estado
FROM planes
ORDER BY orden;

-- =====================================================
-- PASO 2: Verificar que existen los 4 slugs REQUERIDOS
-- =====================================================

SELECT 
  '=====================================' as separador,
  '🔍 VERIFICACIÓN DE SLUGS REQUERIDOS' as titulo;

-- Verificar plan FREE
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Plan "free" existe'
    ELSE '❌ Plan "free" NO EXISTE - CREAR URGENTE'
  END as verificacion_free
FROM planes WHERE slug = 'free';

-- Verificar plan PRO
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Plan "pro" existe'
    ELSE '❌ Plan "pro" NO EXISTE - CREAR URGENTE'
  END as verificacion_pro
FROM planes WHERE slug = 'pro';

-- Verificar plan BUSINESS
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Plan "business" existe'
    ELSE '❌ Plan "business" NO EXISTE - CREAR URGENTE'
  END as verificacion_business
FROM planes WHERE slug = 'business';

-- Verificar plan ENTERPRISE
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Plan "enterprise" existe'
    ELSE '❌ Plan "enterprise" NO EXISTE - CREAR URGENTE'
  END as verificacion_enterprise
FROM planes WHERE slug = 'enterprise';

-- =====================================================
-- PASO 3: Resumen de Verificación
-- =====================================================

SELECT 
  '=====================================' as separador,
  '📊 RESUMEN DE VERIFICACIÓN' as titulo;

WITH verificacion AS (
  SELECT 
    COUNT(CASE WHEN slug = 'free' THEN 1 END) as tiene_free,
    COUNT(CASE WHEN slug = 'pro' THEN 1 END) as tiene_pro,
    COUNT(CASE WHEN slug = 'business' THEN 1 END) as tiene_business,
    COUNT(CASE WHEN slug = 'enterprise' THEN 1 END) as tiene_enterprise,
    COUNT(*) as total_planes
  FROM planes
)
SELECT 
  total_planes as planes_totales,
  CASE 
    WHEN tiene_free = 1 AND tiene_pro = 1 AND tiene_business = 1 AND tiene_enterprise = 1 
    THEN '✅ TODOS LOS PLANES REQUERIDOS EXISTEN'
    ELSE '❌ FALTAN PLANES - Ver detalle arriba'
  END as estado_general,
  tiene_free as plan_free,
  tiene_pro as plan_pro,
  tiene_business as plan_business,
  tiene_enterprise as plan_enterprise
FROM verificacion;

-- =====================================================
-- PASO 4: Verificar Slugs Exactos (Case Sensitive)
-- =====================================================

SELECT 
  '=====================================' as separador,
  '⚠️ IMPORTANTE: Verificar Case Sensitive' as titulo;

-- Los slugs DEBEN ser EXACTAMENTE: free, pro, business, enterprise (minúsculas)
SELECT 
  slug,
  CASE 
    WHEN slug IN ('free', 'pro', 'business', 'enterprise') THEN '✅ Correcto'
    ELSE '❌ Slug incorrecto - debe ser minúsculas'
  END as verificacion
FROM planes
WHERE slug IN ('free', 'pro', 'business', 'enterprise', 'Free', 'Pro', 'Business', 'Enterprise');

-- =====================================================
-- PASO 5: Ver IDs de los planes (para debugging)
-- =====================================================

SELECT 
  '=====================================' as separador,
  '🔑 IDs DE LOS PLANES (para debugging)' as titulo;

SELECT 
  slug,
  id,
  nombre
FROM planes
WHERE slug IN ('free', 'pro', 'business', 'enterprise')
ORDER BY orden;

-- =====================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- =====================================================

/*
✅ TODO CORRECTO si ves:
- 4 planes con slugs: free, pro, business, enterprise
- Todos dicen "✅ ACTIVO"
- Todos los checks dicen "✅ existe"
- Estado general: "✅ TODOS LOS PLANES REQUERIDOS EXISTEN"

❌ PROBLEMA si ves:
- Menos de 4 planes
- Algún check dice "❌ NO EXISTE"
- Slugs con mayúsculas (Free, Pro, etc)
- Estado general con "❌"

SOLUCIÓN SI HAY PROBLEMAS:
Ejecuta el script: supabase/schema-subscriptions.sql
Que creará todos los planes con los slugs correctos.
*/

