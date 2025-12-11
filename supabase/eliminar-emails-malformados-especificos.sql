-- =====================================================
-- ELIMINAR EMAILS MALFORMADOS ESPECÍFICOS
-- =====================================================
-- Este script elimina SOLO los emails que están
-- confirmadamente malformados y causan rebotes
-- =====================================================

-- IMPORTANTE: Revisa cada email antes de ejecutar

-- 1. EMAILS MALFORMADOS (100% seguros de eliminar)
BEGIN;

-- Email con doble @ (malformado)
DELETE FROM auth.users 
WHERE email = '11u438@946@gmail.com';

-- Email con dominio incompleto @gmao1
DELETE FROM auth.users 
WHERE email LIKE '%@gmao1%';

-- Email con dominio "gmai" (sin .com)
DELETE FROM auth.users 
WHERE email LIKE '%@gmai' OR email LIKE '%@gmai ';

-- Email con dominio "gmsl.com" (typo de gmail)
DELETE FROM auth.users 
WHERE email LIKE '%@gmsl.com';

-- Email con dominio "hdjkddu.com" (fake)
DELETE FROM auth.users 
WHERE email LIKE '%@hdjkddu.com';

COMMIT;

-- 2. OPCIONAL: Eliminar usuarios válidos pero ABANDONADOS (sin login, +7 días)
-- ⚠️ SOLO ejecuta esto si estás seguro de que no son clientes reales

-- DESCOMENTAR PARA EJECUTAR:
/*
BEGIN;

DELETE FROM auth.users 
WHERE 
  email_confirmed_at IS NULL 
  AND last_sign_in_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days'
  AND email NOT LIKE '%test%'
  AND email NOT LIKE '%fake%';

COMMIT;
*/

-- 3. Verificar cuántos usuarios quedan
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as con_login,
  COUNT(CASE WHEN last_sign_in_at IS NULL THEN 1 END) as sin_login,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as email_confirmado
FROM auth.users;

-- 4. Verificar que no queden emails malformados
SELECT 
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE 
  email NOT LIKE '%@%.%'
  OR email LIKE '%@@%'
  OR email LIKE '%@gmai'
  OR email LIKE '%@gmao%'
ORDER BY created_at DESC;

