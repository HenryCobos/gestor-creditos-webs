-- ============================================
-- FIX RLS: Permitir a admins ver usuarios de su organización
-- ============================================

-- 1. Ver las políticas actuales en profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 2. Eliminar políticas existentes conflictivas (si existen)
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- 3. Crear política simple para acceso a profiles
-- Un usuario puede:
-- a) Ver su propio perfil
-- b) Si es admin, ver perfiles de su organización

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id  -- Puede ver su propio perfil
  OR
  EXISTS (  -- O es admin y el perfil es de su organización
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = profiles.organization_id
  )
);

-- 4. Política para UPDATE (solo su propio perfil)
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Verificar que las políticas se crearon
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Probar la consulta como admin
-- (Este query debería devolver todos los usuarios de tu organización)
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE organization_id = (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
ORDER BY created_at DESC;
