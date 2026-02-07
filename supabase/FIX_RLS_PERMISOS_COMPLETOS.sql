-- ============================================
-- FIX RLS: Permisos completos para ver perfiles
-- ============================================
-- Este script asegura que TODOS los usuarios puedan ver su propio perfil completo

-- PASO 1: Eliminar TODAS las políticas de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- PASO 2: Verificar que no queden políticas
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
-- Debe devolver 0 filas

-- PASO 3: Crear UNA SOLA política ultra-permisiva para SELECT
-- Permite ver tu propio perfil Y perfiles de tu organización
CREATE POLICY "profiles_full_access" ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Siempre puedes ver tu propio perfil
  auth.uid() = id
  OR
  -- Si eres admin, puedes ver perfiles de tu organización
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
        AND me.organization_id = profiles.organization_id
    )
  )
);

-- PASO 4: Política UPDATE simple
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 5: Verificar que se crearon
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- PASO 6: Probar que funciona
SELECT 
  id,
  email,
  role,
  organization_id
FROM profiles
WHERE id = auth.uid();

-- ✅ PASO 6 debe devolver tu perfil con role='admin' y organization_id
