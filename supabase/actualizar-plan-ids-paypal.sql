-- Script para actualizar los Plan IDs de PayPal en Producción
-- IMPORTANTE: Reemplaza los P-XXXXXXXX con tus IDs reales de PayPal

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Crea los 6 planes de suscripción en PayPal (modo Live):
--    - Profesional Mensual ($19)
--    - Profesional Anual ($190)
--    - Business Mensual ($49)
--    - Business Anual ($490)
--    - Enterprise Mensual ($179)
--    - Enterprise Anual ($1790)
--
-- 2. Copia el Plan ID de cada uno (empieza con P-...)
-- 3. Reemplaza los P-XXXXXXXX abajo con tus IDs reales
-- 4. Ejecuta este script en Supabase SQL Editor

-- ============================================
-- ACTUALIZAR PLAN PROFESIONAL
-- ============================================

-- Plan ID Mensual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Mensual
)
WHERE slug = 'pro';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Anual
)
WHERE slug = 'pro';

-- ============================================
-- ACTUALIZAR PLAN BUSINESS
-- ============================================

-- Plan ID Mensual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Mensual
)
WHERE slug = 'business';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Anual
)
WHERE slug = 'business';

-- ============================================
-- ACTUALIZAR PLAN ENTERPRISE
-- ============================================

-- Plan ID Mensual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Mensual
)
WHERE slug = 'enterprise';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-XXXXXXXX"'::jsonb  -- ⚠️ REEMPLAZAR con tu Plan ID Anual
)
WHERE slug = 'enterprise';

-- ============================================
-- VERIFICAR QUE SE ACTUALIZARON CORRECTAMENTE
-- ============================================

SELECT 
  nombre,
  slug,
  precio_mensual,
  precio_anual,
  caracteristicas->'paypal_plan_id_monthly' as plan_id_mensual,
  caracteristicas->'paypal_plan_id_yearly' as plan_id_anual
FROM planes
WHERE slug IN ('pro', 'business', 'enterprise')
ORDER BY orden;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Deberías ver tus Plan IDs de PayPal (P-...) en las columnas
-- plan_id_mensual y plan_id_anual para cada plan.
--
-- Si ves NULL o P-XXXXXXXX, significa que necesitas ejecutar
-- el script de nuevo con tus IDs reales de PayPal.

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Solo necesitas actualizar los planes de PAGO (Pro, Business, Enterprise)
-- 2. El plan Gratuito NO necesita Plan IDs de PayPal
-- 3. Guarda los Plan IDs de PayPal en un lugar seguro
-- 4. No compartas tus Plan IDs públicamente
-- 5. Si necesitas cambiar precios, crea NUEVOS planes en PayPal

