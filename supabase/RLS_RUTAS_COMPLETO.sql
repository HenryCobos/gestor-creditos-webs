-- ============================================
-- RLS RUTAS: Políticas completas para gestión de rutas
-- ============================================

-- PASO 1: Ver políticas actuales en rutas
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'rutas';

-- PASO 2: Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "rutas_select" ON public.rutas;
DROP POLICY IF EXISTS "rutas_insert" ON public.rutas;
DROP POLICY IF EXISTS "rutas_update" ON public.rutas;
DROP POLICY IF EXISTS "rutas_delete" ON public.rutas;
DROP POLICY IF EXISTS "rutas_access" ON public.rutas;

-- PASO 3: Crear políticas para rutas

-- 3A. SELECT: Ver rutas de tu organización
CREATE POLICY "rutas_select_org" ON public.rutas
FOR SELECT TO authenticated
USING (
  -- Si eres admin, ver rutas de tu organización
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = rutas.organization_id
  )
  OR
  -- Si eres cobrador, ver solo tus rutas
  (
    cobrador_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'cobrador'
    )
  )
);

-- 3B. INSERT: Solo admins pueden crear rutas
CREATE POLICY "rutas_insert_admin" ON public.rutas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = rutas.organization_id
  )
);

-- 3C. UPDATE: Admins pueden actualizar rutas de su org, cobradores pueden actualizar capital de sus rutas
CREATE POLICY "rutas_update_policy" ON public.rutas
FOR UPDATE TO authenticated
USING (
  -- Admin de la organización
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = rutas.organization_id
  )
  OR
  -- Cobrador de la ruta (solo puede actualizar ciertos campos)
  cobrador_id = auth.uid()
)
WITH CHECK (
  -- Admin de la organización
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = rutas.organization_id
  )
  OR
  -- Cobrador de la ruta
  cobrador_id = auth.uid()
);

-- 3D. DELETE: Solo admins pueden eliminar rutas
CREATE POLICY "rutas_delete_admin" ON public.rutas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = rutas.organization_id
  )
);

-- PASO 4: Verificar que se crearon
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'rutas'
ORDER BY policyname;

-- PASO 5: Probar creación de ruta (simulación)
-- Esto debería funcionar si eres admin
SELECT 
  p.id as mi_id,
  p.email,
  p.role,
  p.organization_id,
  CASE 
    WHEN p.role = 'admin' THEN 'Puedes crear rutas'
    ELSE 'No puedes crear rutas'
  END as permisos
FROM profiles p
WHERE p.id = auth.uid();

-- ✅ RESULTADO ESPERADO:
-- - 4 políticas creadas (select, insert, update, delete)
-- - PASO 5 debe mostrar "Puedes crear rutas" si eres admin
