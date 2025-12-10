-- Script para limpiar usuarios de prueba que causan rebotes
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- 1. Ver usuarios con emails sospechosos
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE 
  email LIKE '%test%'
  OR email LIKE '%prueba%'
  OR email LIKE '%ejemplo%'
  OR email LIKE '%temp%'
  OR email NOT LIKE '%@gmail.%'
  AND email NOT LIKE '%@hotmail.%'
  AND email NOT LIKE '%@outlook.%'
  AND email NOT LIKE '%@yahoo.%'
ORDER BY created_at DESC;

-- 2. OPCIONAL: Eliminar usuarios de prueba (CUIDADO!)
-- Descomenta estas líneas SOLO si estás seguro
/*
DELETE FROM auth.users
WHERE 
  email LIKE '%test%'
  OR email LIKE '%prueba%'
  OR email LIKE '%ejemplo%'
  OR email LIKE '%temp%';
*/

-- 3. Ver estadísticas de emails
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as emails_confirmados,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as emails_sin_confirmar
FROM auth.users;

