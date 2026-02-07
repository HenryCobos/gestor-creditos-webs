-- ============================================
-- EJECUTAR AHORA: Fix RLS para ver usuarios de la organización
-- ============================================
-- Este script permite que los admins vean todos los usuarios de su organización

-- PASO 1: Eliminar políticas anteriores que puedan estar bloqueando
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- PASO 2: Crear política SELECT que permite:
-- a) Ver tu propio perfil
-- b) Ver perfiles de tu organización si eres admin
CREATE POLICY "profiles_select_org" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id  -- Tu propio perfil
  OR
  (
    -- Eres admin y el perfil es de tu organización
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
        AND admin.role = 'admin'
        AND admin.organization_id = profiles.organization_id
    )
  )
);

-- PASO 3: Política UPDATE (solo tu propio perfil)
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 4: Verificar que se crearon correctamente
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- PASO 5: Probar la query (debe devolver tu usuario + cualquier otro de tu organización)
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  activo
FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
ORDER BY created_at DESC;
