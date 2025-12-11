-- =====================================================
-- LIMPIAR EMAILS PROBLEMÁTICOS QUE CAUSAN REBOTES
-- =====================================================
-- ⚠️ IMPORTANTE: Revisa los resultados de verificar-emails-invalidos.sql
-- antes de ejecutar este script para saber qué se eliminará
-- =====================================================

-- 1. ELIMINAR usuarios de prueba/fake que nunca hicieron login
-- (Esto usa la función delete_user_by_email que creamos anteriormente)

-- Ejemplo: Descomentar y ajustar según los emails que encontraste
-- SELECT delete_user_by_email('test@test.com');
-- SELECT delete_user_by_email('fake@fake.com');
-- SELECT delete_user_by_email('prueba@prueba.com');

-- Si prefieres eliminar en batch todos los emails de prueba sin login:
DO $$
DECLARE
  user_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Seleccionar usuarios con emails problemáticos que nunca hicieron login
  FOR user_record IN 
    SELECT id, email
    FROM auth.users
    WHERE 
      (
        email LIKE '%test%' 
        OR email LIKE '%fake%' 
        OR email LIKE '%example%'
        OR email LIKE '%@mailinator%'
        OR email LIKE '%@guerrillamail%'
        OR email NOT LIKE '%@%.%'
      )
      AND last_sign_in_at IS NULL  -- Nunca hicieron login
      AND created_at < NOW() - INTERVAL '1 day'  -- Creados hace más de 1 día
  LOOP
    -- Eliminar el usuario
    DELETE FROM auth.users WHERE id = user_record.id;
    
    -- También eliminar de profiles y email_campaigns (si no tienes CASCADE)
    DELETE FROM profiles WHERE id = user_record.id;
    DELETE FROM email_campaigns WHERE user_id = user_record.id;
    
    deleted_count := deleted_count + 1;
    
    RAISE NOTICE 'Eliminado: % (ID: %)', user_record.email, user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Total eliminados: %', deleted_count;
END $$;

-- 2. LIMPIAR registros huérfanos en email_campaigns
-- (Usuarios que ya no existen en auth.users)
DELETE FROM email_campaigns
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 3. Verificar cuántos usuarios quedan
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as con_login,
  COUNT(CASE WHEN last_sign_in_at IS NULL THEN 1 END) as sin_login,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as email_confirmado
FROM auth.users;

-- 4. Verificar que email_campaigns esté limpio
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as activas,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completadas,
  COUNT(CASE WHEN status = 'paused' THEN 1 END) as pausadas
FROM email_campaigns;

