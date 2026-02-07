-- ============================================
-- LIMPIAR Y RECREAR POLÍTICAS RLS DE PROFILES
-- ============================================
-- Este script elimina TODAS las políticas y crea solo las necesarias

-- PASO 1: Eliminar TODAS las políticas existentes (incluyendo las viejas)
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

-- PASO 2: Verificar que se eliminaron todas
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'profiles';
-- Debe devolver 0 filas

-- PASO 3: Crear SOLO las dos políticas necesarias

-- 3A. SELECT: Ver tu propio perfil O perfiles de tu organización si eres admin
CREATE POLICY "profiles_select_org" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id  
  OR
  EXISTS (
    SELECT 1 FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.organization_id = profiles.organization_id
  )
);

-- 3B. UPDATE: Solo tu propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 4: Verificar que ahora solo hay 2 políticas
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
-- Debe devolver exactamente 2 filas

-- PASO 5: Probar la consulta (debe devolver usuarios de tu organización)
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
ORDER BY created_at DESC;
