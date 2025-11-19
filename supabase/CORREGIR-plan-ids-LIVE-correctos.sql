-- ============================================
-- CORREGIR PLAN IDS DE PAYPAL CON LOS IDs REALES DE LIVE
-- ============================================
-- Estos son los Plan IDs que están ACTIVOS en tu cuenta de PayPal Live

-- ============================================
-- ACTUALIZAR PLAN PROFESIONAL
-- ============================================

-- Plan ID Mensual (CORREGIDO)
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-67J01139RE989703RNEN2QDQ"'::jsonb  -- ✅ Corregido: terminaba en 20DO, ahora 2QDQ
)
WHERE slug = 'pro';

-- Plan ID Anual (verificar si es correcto)
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-2S618637AV136383VNEN55MY"'::jsonb  -- ✅ Este parece correcto
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
  '"P-7RK51070YF818864DNEN57QA"'::jsonb  -- ✅ Este parece correcto
)
WHERE slug = 'business';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-0VZ5S7548H525804HNEN6CBA"'::jsonb  -- ✅ Este parece correcto
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
  '"P-02U73090XU374650VNEN6FIQ"'::jsonb  -- ✅ Este parece correcto
)
WHERE slug = 'enterprise';

-- Plan ID Anual
UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_yearly}', 
  '"P-3F668658YY202615DNEN6HHI"'::jsonb  -- ✅ Este parece correcto
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
-- Profesional Mensual: P-67J01139RE989703RNEN2QDQ (corregido ✅)
-- Profesional Anual:   P-2S618637AV136383VNEN55MY
-- Business Mensual:    P-7RK51070YF818864DNEN57QA
-- Business Anual:      P-0VZ5S7548H525804HNEN6CBA
-- Enterprise Mensual:  P-02U73090XU374650VNEN6FIQ
-- Enterprise Anual:    P-3F668658YY202615DNEN6HHI

