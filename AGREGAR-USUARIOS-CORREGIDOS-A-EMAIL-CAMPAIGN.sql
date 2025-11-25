-- ============================================
-- 📧 AGREGAR USUARIOS CORREGIDOS AL DRIP CAMPAIGN
-- ============================================
-- Este script agrega los usuarios corregidos a la tabla email_campaigns
-- para que reciban los emails de seguimiento (drip campaign)
--
-- IMPORTANTE: Esto NO envía el email de confirmación de Supabase Auth
-- (ese solo se envía al momento del registro original)

-- ============================================
-- PASO 1: Agregar usuarios corregidos a email_campaigns
-- ============================================
-- Esto agrega usuarios que tienen perfil y plan pero no están en email_campaigns

INSERT INTO public.email_campaigns (user_id, email, full_name, day_0_sent_at, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(p.full_name, u.email),
  u.created_at, -- Fecha de registro original
  NOW() -- Fecha de cuando se agrega al campaign
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.id IS NOT NULL 
  AND p.plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM email_campaigns ec WHERE ec.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PASO 2: Verificar cuántos usuarios se agregaron
-- ============================================
SELECT 
  COUNT(*) as usuarios_agregados_al_campaign
FROM email_campaigns
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- ============================================
-- PASO 3: Ver todos los usuarios en el drip campaign
-- ============================================
SELECT 
  ec.email,
  ec.full_name,
  ec.created_at as fecha_registro,
  ec.day_0_sent_at as email_bienvenida_enviado,
  ec.day_1_sent_at,
  ec.day_2_sent_at,
  ec.day_3_sent_at,
  ec.day_4_sent_at,
  ec.day_5_sent_at,
  ec.day_6_sent_at,
  ec.day_7_sent_at,
  CASE 
    WHEN ec.day_0_sent_at IS NULL THEN '❌ No recibió email de bienvenida'
    ELSE '✅ Email de bienvenida enviado'
  END as estado_bienvenida
FROM email_campaigns ec
ORDER BY ec.created_at DESC;

