-- =====================================================
-- ELIMINAR USUARIOS DE PRUEBA ESPECÍFICOS
-- =====================================================
-- Usa este script para eliminar usuarios de prueba
-- y poder probar el flujo de registro completo
-- =====================================================

-- INSTRUCCIONES:
-- 1. Reemplaza 'EMAIL_DE_PRUEBA' con el email real
-- 2. Ejecuta cada línea que necesites
-- 3. Verifica que se eliminaron correctamente

-- =====================================================
-- ELIMINAR POR EMAIL ESPECÍFICO
-- =====================================================

-- Ejemplo: Eliminar usuario con email específico
-- SELECT delete_user_by_email('tuprueba@gmail.com');

-- Descomenta y ajusta según tus emails de prueba:
-- SELECT delete_user_by_email('test1@gmail.com');
-- SELECT delete_user_by_email('test2@gmail.com');
-- SELECT delete_user_by_email('prueba@test.com');


-- =====================================================
-- O ELIMINAR TODOS LOS USUARIOS DE PRUEBA (CUIDADO)
-- =====================================================
-- ⚠️ SOLO ejecuta esto si estás 100% seguro de que
-- quieres eliminar TODOS los usuarios sin login real

/*
DELETE FROM auth.users 
WHERE 
  email LIKE '%test%' 
  OR email LIKE '%prueba%'
  OR email LIKE '%demo%';
*/

-- =====================================================
-- VERIFICAR QUÉ USUARIOS HAY ACTUALMENTE
-- =====================================================

-- Ver todos los usuarios
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN last_sign_in_at IS NOT NULL THEN '✅ Ha hecho login'
    ELSE '⚠️ Nunca hizo login'
  END as estado
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Ver solo usuarios que nunca hicieron login
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE last_sign_in_at IS NULL
ORDER BY created_at DESC;

