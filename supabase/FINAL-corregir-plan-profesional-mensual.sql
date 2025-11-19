-- ============================================
-- CORREGIR PLAN PROFESIONAL MENSUAL
-- ============================================
-- Este es el ÚNICO Plan ID que está incorrecto en Supabase

-- ANTES: P-67J01139RE989703RNEN20DO (❌ INCORRECTO)
-- AHORA: P-67J01139RE989703RNEN2QDQ (✅ CORRECTO - De PayPal Live)

UPDATE planes 
SET caracteristicas = jsonb_set(
  COALESCE(caracteristicas, '{}'::jsonb), 
  '{paypal_plan_id_monthly}', 
  '"P-67J01139RE989703RNEN2QDQ"'::jsonb
)
WHERE slug = 'pro';

-- ============================================
-- VERIFICAR TODOS LOS PLAN IDS
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
-- Todos los Plan IDs deben coincidir con PayPal Live:
--
-- Profesional:
--   Mensual: "P-67J01139RE989703RNEN2QDQ"  ✅ (CORREGIDO)
--   Anual:   "P-2S618637AV136383VNEN55MY"  ✅
--
-- Business:
--   Mensual: "P-7RK51070YF818864DNEN57QA"  ✅
--   Anual:   "P-0VZ5S7548H525804HNEN6CBA"  ✅
--
-- Enterprise:
--   Mensual: "P-02U73090XU374650VNEN6FIQ"  ✅
--   Anual:   "P-3F668658YY202615DNEN6HHI"  ✅

