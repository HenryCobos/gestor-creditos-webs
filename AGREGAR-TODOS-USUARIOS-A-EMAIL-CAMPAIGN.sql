-- ============================================
-- 📧 AGREGAR TODOS LOS USUARIOS AL DRIP CAMPAIGN
-- ============================================
-- Este script agrega TODOS los usuarios que tienen perfil y plan
-- pero NO están en email_campaigns
--
-- Ejecuta este script para agregar los 21 usuarios faltantes

-- ============================================
-- PASO 1: Agregar usuarios faltantes a email_campaigns
-- ============================================
INSERT INTO public.email_campaigns (user_id, email, full_name, day_0_sent_at, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(p.full_name, u.email),
  u.created_at, -- Fecha de registro original (consideramos que recibieron bienvenida)
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
  COUNT(*) as usuarios_agregados_ahora,
  'Usuarios agregados en este momento' as descripcion
FROM email_campaigns
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- ============================================
-- PASO 3: Verificar total de usuarios en campaña
-- ============================================
SELECT 
  COUNT(*) as total_usuarios_en_campana,
  'Total de usuarios en email_campaigns' as descripcion
FROM email_campaigns;

-- ============================================
-- PASO 4: Ver todos los usuarios en la campaña
-- ============================================
SELECT 
  ec.email,
  ec.full_name,
  ec.created_at as fecha_registro,
  ec.day_0_sent_at as email_bienvenida_enviado,
  CASE 
    WHEN ec.day_0_sent_at IS NULL THEN '❌ No recibió email de bienvenida'
    ELSE '✅ Email de bienvenida enviado'
  END as estado_bienvenida,
  -- Mostrar qué emails de seguimiento se han enviado
  CASE 
    WHEN ec.day_1_sent_at IS NOT NULL THEN '✅ Día 1'
    ELSE '⏳ Pendiente'
  END as email_dia_1,
  CASE 
    WHEN ec.day_2_sent_at IS NOT NULL THEN '✅ Día 2'
    ELSE '⏳ Pendiente'
  END as email_dia_2,
  CASE 
    WHEN ec.day_3_sent_at IS NOT NULL THEN '✅ Día 3'
    ELSE '⏳ Pendiente'
  END as email_dia_3
FROM email_campaigns ec
ORDER BY ec.created_at DESC;

