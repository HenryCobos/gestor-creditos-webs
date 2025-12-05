-- Script para verificar y corregir políticas RLS en la tabla profiles
-- Este script permite que el Service Role Key pueda actualizar perfiles sin restricciones

-- 1. Ver políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 2. Crear política para permitir actualizaciones desde el Service Role
-- (el webhook usa SUPABASE_SERVICE_ROLE_KEY que debe poder escribir sin RLS)

-- Nota: El Service Role Key en Supabase BYPASA automáticamente RLS
-- Pero si hay problemas, podemos crear una política explícita:

-- DROP POLICY IF EXISTS "Service role can update all profiles" ON profiles;

-- CREATE POLICY "Service role can update all profiles"
-- ON profiles
-- FOR UPDATE
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

-- 3. Verificar que la tabla profiles permita actualizaciones
-- Ver los permisos de la tabla
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='profiles';

-- 4. Si necesitas deshabilitar RLS temporalmente para pruebas (NO RECOMENDADO EN PRODUCCIÓN):
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 5. Para volver a habilitar RLS:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

