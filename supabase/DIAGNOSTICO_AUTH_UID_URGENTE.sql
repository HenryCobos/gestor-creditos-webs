-- =====================================================
-- DIAGNÓSTICO URGENTE: ¿Por qué auth.uid() no coincide?
-- =====================================================

-- 1. ¿Qué devuelve auth.uid()?
SELECT '============ 1. AUTH.UID() ============' as seccion;

SELECT 
  auth.uid() as mi_auth_uid,
  auth.uid() IS NULL as "es_null",
  current_user as postgres_user,
  auth.jwt() ->> 'email' as mi_email_desde_jwt;

-- 2. ¿Qué user_id tienen tus clientes?
SELECT '============ 2. USER_ID EN CLIENTES ============' as seccion;

SELECT DISTINCT
  c.user_id,
  u.email,
  COUNT(*) as cantidad_clientes
FROM clientes c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'hcobos99@gmail.com'
GROUP BY c.user_id, u.email;

-- 3. Comparación directa
SELECT '============ 3. COMPARACIÓN DIRECTA ============' as seccion;

SELECT 
  auth.uid() as "mi_auth_uid",
  (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com') as "mi_user_id_desde_email",
  auth.uid() = (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com') as "coinciden";

-- 4. Contar clientes POR user_id
SELECT '============ 4. TODOS LOS USER_ID CON CLIENTES ============' as seccion;

SELECT 
  c.user_id,
  u.email,
  COUNT(*) as num_clientes,
  c.user_id = auth.uid() as "es_mi_uid"
FROM clientes c
LEFT JOIN auth.users u ON u.id = c.user_id
GROUP BY c.user_id, u.email
HAVING u.email = 'hcobos99@gmail.com'
   OR c.user_id = auth.uid()
ORDER BY num_clientes DESC;

-- 5. Sample de UN cliente tuyo
SELECT '============ 5. SAMPLE CLIENTE ============' as seccion;

SELECT 
  c.id,
  c.nombre,
  c.user_id,
  u.email as user_email,
  auth.uid() as mi_auth_uid,
  c.user_id = auth.uid() as "user_id_match"
FROM clientes c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'hcobos99@gmail.com'
LIMIT 1;

-- 6. Verificar si auth.users y clientes están desconectados
SELECT '============ 6. POSIBLE PROBLEMA ============' as seccion;

SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ auth.uid() devuelve NULL - Problema de autenticación'
    WHEN NOT EXISTS (SELECT 1 FROM clientes WHERE user_id = auth.uid()) 
      AND EXISTS (SELECT 1 FROM clientes c JOIN auth.users u ON u.id = c.user_id WHERE u.email = 'hcobos99@gmail.com')
    THEN '⚠️ Tienes clientes pero con un user_id diferente a auth.uid() - MISMATCH'
    WHEN NOT EXISTS (SELECT 1 FROM clientes c JOIN auth.users u ON u.id = c.user_id WHERE u.email = 'hcobos99@gmail.com')
    THEN '❌ NO tienes clientes en la base de datos'
    ELSE '✅ Todo debería estar bien'
  END as diagnostico;

-- 7. Contar clientes ignorando RLS (fuerza lectura)
SELECT '============ 7. CONTEO SIN RLS ============' as seccion;

SELECT 
  (SELECT COUNT(*) FROM clientes c 
   JOIN auth.users u ON u.id = c.user_id 
   WHERE u.email = 'hcobos99@gmail.com') as clientes_por_email,
  (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as clientes_por_auth_uid;
