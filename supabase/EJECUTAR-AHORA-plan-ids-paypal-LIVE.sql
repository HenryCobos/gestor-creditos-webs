-- ============================================
-- SCRIPT PARA AGREGAR PLAN IDS DE PAYPAL (LIVE)
-- ============================================
-- IMPORTANTE: Ejecuta este script en Supabase SQL Editor
-- Esto agregará los Plan IDs de PayPal a tu base de datos

-- ============================================
-- ACTUALIZAR PLAN PROFESIONAL
-- ============================================

-- Plan ID Mensual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-67J01139RE989703RNEN20DO"'::jsonb
)
WHERE slug = 'pro';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-2S618637AV136383VNEN55MY"'::jsonb
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
  '"P-7RK51070YF818864DNEN57QA"'::jsonb
)
WHERE slug = 'business';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-0VZ5S7548H525804HNEN6CBA"'::jsonb
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
  '"P-02U73090XU374650VNEN6FIQ"'::jsonb
)
WHERE slug = 'enterprise';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-3F668658YY202615DNEN6HHI"'::jsonb
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
-- Deberías ver una tabla con 3 filas:
-- 
-- | nombre       | plan_id_mensual        | plan_id_anual          |
-- |--------------|------------------------|------------------------|
-- | Profesional  | P-67J01139RE989703...  | P-2S618637AV136383...  |
-- | Business     | P-7RK51070YF818864...  | P-0VZ5S7548H525804...  |
-- | Enterprise   | P-02U73090XU374650...  | P-3F668658YY202615...  |
--
-- Si ves esto, ¡PERFECTO! Ya puedes probar PayPal.

