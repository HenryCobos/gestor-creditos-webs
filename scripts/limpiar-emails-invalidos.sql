-- ================================================
-- Script para Limpiar Emails Inválidos en Supabase
-- ================================================
-- 
-- IMPORTANTE: Ejecuta estas queries paso a paso en el SQL Editor de Supabase
-- NO ejecutes DELETE sin antes revisar los resultados de los SELECT
--
-- Navegación: Supabase Dashboard → SQL Editor → New Query
-- ================================================

-- ================================================
-- PASO 1: REVISAR USUARIOS CON EMAILS SOSPECHOSOS
-- ================================================

-- Ver todos los usuarios creados recientemente
SELECT 
  id,
  email,
  created_at,
  confirmed_at,
  CASE 
    WHEN confirmed_at IS NULL THEN '❌ No confirmado'
    ELSE '✅ Confirmado'
  END as estado
FROM auth.users
ORDER BY created_at DESC
LIMIT 50;

-- ================================================
-- PASO 2: IDENTIFICAR EMAILS DE PRUEBA
-- ================================================

-- Emails que contienen "test", "prueba", etc.
SELECT 
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE 
  email ILIKE '%test%' 
  OR email ILIKE '%prueba%'
  OR email ILIKE '%ejemplo%'
  OR email ILIKE '%sample%'
  OR email ILIKE '%demo%'
  OR email ILIKE '%fake%'
  OR email ILIKE '%temp%'
ORDER BY created_at DESC;

-- ================================================
-- PASO 3: IDENTIFICAR DOMINIOS INVÁLIDOS
-- ================================================

-- Emails con dominios comunes mal escritos
SELECT 
  id,
  email,
  created_at,
  confirmed_at,
  CASE 
    WHEN email LIKE '%@gmai.com' THEN '💡 Debería ser @gmail.com'
    WHEN email LIKE '%@gmial.com' THEN '💡 Debería ser @gmail.com'
    WHEN email LIKE '%@hotmai.com' THEN '💡 Debería ser @hotmail.com'
    WHEN email LIKE '%@yahooo.com' THEN '💡 Debería ser @yahoo.com'
    WHEN email LIKE '%@outlok.com' THEN '💡 Debería ser @outlook.com'
    ELSE 'Otro error'
  END as correccion_sugerida
FROM auth.users
WHERE 
  email LIKE '%@gmai.com'
  OR email LIKE '%@gmial.com'
  OR email LIKE '%@gmil.com'
  OR email LIKE '%@hotmai.com'
  OR email LIKE '%@hotmial.com'
  OR email LIKE '%@yahooo.com'
  OR email LIKE '%@yaho.com'
  OR email LIKE '%@outlok.com'
  OR email LIKE '%@outloo.com'
ORDER BY created_at DESC;

-- ================================================
-- PASO 4: IDENTIFICAR EMAILS MAL FORMATEADOS
-- ================================================

-- Emails sin dominio válido (sin punto después de @)
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE 
  email NOT LIKE '%@%.%'
  OR email LIKE '% %'  -- Contiene espacios
  OR email LIKE '%..%' -- Puntos consecutivos
ORDER BY created_at DESC;

-- ================================================
-- PASO 5: VER USUARIOS NO CONFIRMADOS (POSIBLES BOUNCES)
-- ================================================

-- Usuarios que se registraron pero nunca confirmaron su email
-- (después de más de 2 días)
SELECT 
  id,
  email,
  created_at,
  EXTRACT(DAY FROM (NOW() - created_at)) as dias_sin_confirmar
FROM auth.users
WHERE 
  confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '2 days'
ORDER BY created_at DESC;

-- ================================================
-- PASO 6: ESTADÍSTICAS GENERALES
-- ================================================

-- Tasa de confirmación de emails
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) as usuarios_confirmados,
  COUNT(*) FILTER (WHERE confirmed_at IS NULL) as usuarios_sin_confirmar,
  ROUND(
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as tasa_confirmacion_percent
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days';

-- Ver distribución por dominios
SELECT 
  SPLIT_PART(email, '@', 2) as dominio,
  COUNT(*) as cantidad,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) as confirmados,
  ROUND(
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric / 
    COUNT(*) * 100, 
    2
  ) as tasa_confirmacion_percent
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY dominio
ORDER BY cantidad DESC
LIMIT 20;

-- ================================================
-- PASO 7: ELIMINAR USUARIOS INVÁLIDOS (CUIDADO!)
-- ================================================

-- ⚠️ IMPORTANTE: Primero revisa los resultados de los SELECT anteriores
-- ⚠️ Solo elimina usuarios que estés SEGURO que son inválidos
-- ⚠️ Esto NO se puede deshacer

-- Opción A: Eliminar usuarios de prueba no confirmados
-- DESCOMENTAR SOLO SI ESTÁS SEGURO:

-- DELETE FROM auth.users
-- WHERE 
--   confirmed_at IS NULL
--   AND (
--     email ILIKE '%test%' 
--     OR email ILIKE '%prueba%'
--     OR email ILIKE '%ejemplo%'
--     OR email ILIKE '%@test.com'
--     OR email ILIKE '%@example.com'
--   );

-- Opción B: Eliminar usuarios no confirmados después de 7 días
-- DESCOMENTAR SOLO SI ESTÁS SEGURO:

-- DELETE FROM auth.users
-- WHERE 
--   confirmed_at IS NULL
--   AND created_at < NOW() - INTERVAL '7 days';

-- Opción C: Eliminar usuarios con dominios específicamente inválidos
-- DESCOMENTAR SOLO SI ESTÁS SEGURO:

-- DELETE FROM auth.users
-- WHERE 
--   email LIKE '%@gmai.com'
--   OR email LIKE '%@hotmai.com'
--   OR email LIKE '%@test.com'
--   OR email LIKE '%@example.com';

-- ================================================
-- PASO 8: VERIFICAR LIMPIEZA
-- ================================================

-- Después de eliminar, vuelve a ejecutar las estadísticas
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) as usuarios_confirmados,
  COUNT(*) FILTER (WHERE confirmed_at IS NULL) as usuarios_sin_confirmar,
  ROUND(
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as tasa_confirmacion_percent
FROM auth.users;

-- ================================================
-- CONSULTAS ÚTILES ADICIONALES
-- ================================================

-- Ver usuarios creados hoy
SELECT 
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- Ver últimos 10 usuarios confirmados
SELECT 
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE confirmed_at IS NOT NULL
ORDER BY confirmed_at DESC
LIMIT 10;

-- Buscar un usuario específico por email
-- SELECT * FROM auth.users WHERE email = 'usuario@ejemplo.com';

-- ================================================
-- NOTAS IMPORTANTES
-- ================================================
--
-- 1. SIEMPRE ejecuta los SELECT primero para ver qué se va a eliminar
-- 2. NUNCA elimines usuarios confirmados sin estar 100% seguro
-- 3. Considera hacer un backup antes de eliminar datos
-- 4. Si tienes dudas, contacta a soporte de Supabase
-- 5. Los usuarios eliminados NO se pueden recuperar
--
-- ================================================

