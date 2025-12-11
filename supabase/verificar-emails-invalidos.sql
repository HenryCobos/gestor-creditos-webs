-- =====================================================
-- VERIFICAR EMAILS INVÁLIDOS QUE CAUSAN REBOTES
-- =====================================================

-- 1. Emails de prueba o inválidos en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at,
  CASE 
    WHEN email LIKE '%test%' THEN '🧪 Email de prueba'
    WHEN email LIKE '%+%' THEN '➕ Email con plus (+)'
    WHEN email LIKE '%fake%' THEN '🚫 Email fake'
    WHEN email LIKE '%example%' THEN '📧 Email ejemplo'
    WHEN email LIKE '%@mailinator%' THEN '📬 Email temporal'
    WHEN email LIKE '%@guerrillamail%' THEN '📬 Email temporal'
    WHEN email NOT LIKE '%@%.%' THEN '❌ Email mal formado'
    ELSE '✅ Email válido'
  END AS tipo
FROM auth.users
WHERE 
  email LIKE '%test%' 
  OR email LIKE '%fake%' 
  OR email LIKE '%example%'
  OR email LIKE '%@mailinator%'
  OR email LIKE '%@guerrillamail%'
  OR email NOT LIKE '%@%.%'
ORDER BY created_at DESC;

-- 2. Usuarios que nunca confirmaron email (pueden causar rebotes)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at
FROM auth.users
WHERE 
  email_confirmed_at IS NULL
  AND confirmation_sent_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 3. Contar emails por dominio (para identificar dominios problemáticos)
SELECT 
  SPLIT_PART(email, '@', 2) AS dominio,
  COUNT(*) AS cantidad,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) AS sin_confirmar,
  COUNT(CASE WHEN last_sign_in_at IS NULL THEN 1 END) AS sin_login
FROM auth.users
GROUP BY SPLIT_PART(email, '@', 2)
ORDER BY cantidad DESC;

-- 4. Usuarios en email_campaigns con emails problemáticos
SELECT 
  ec.id,
  ec.user_id,
  au.email,
  ec.day_0_sent_at,
  ec.day_1_sent_at,
  ec.unsubscribed,
  ec.created_at,
  CASE 
    WHEN au.email LIKE '%test%' THEN '🧪 Email de prueba'
    WHEN au.email LIKE '%fake%' THEN '🚫 Email fake'
    WHEN au.email IS NULL THEN '❌ Usuario no existe'
    ELSE '⚠️ Revisar'
  END AS problema
FROM email_campaigns ec
LEFT JOIN auth.users au ON ec.user_id = au.id
WHERE 
  au.email LIKE '%test%' 
  OR au.email LIKE '%fake%'
  OR au.id IS NULL;

-- 5. Verificar configuración actual de auth
-- (Esto es solo informativo, no devuelve datos directamente accesibles)
-- SELECT 
--   name,
--   value
-- FROM pg_settings
-- WHERE name LIKE '%smtp%' OR name LIKE '%email%';

