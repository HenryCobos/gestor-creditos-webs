-- =====================================================
-- FIX: RLS en public.user_roles sin políticas
-- =====================================================
-- Ejecutar en Supabase → SQL Editor → Run
-- Corrige el aviso "RLS Enabled No Policy" en user_roles.
--
-- Reglas:
-- • SELECT: tu propia fila + roles de tu organización (vía profiles)
-- • INSERT/UPDATE/DELETE: solo admin de esa org (función is_admin, sin recursión)
-- • Registro de usuarios y APIs con service role no se ven afectados
-- =====================================================

BEGIN;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas (nombres usados en distintos scripts)
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

-- Lectura: propio rol + miembros de la misma organización
CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT p.organization_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id IS NOT NULL
  )
);

-- Escritura: solo administradores de la organización (SECURITY DEFINER, sin recursión RLS)
CREATE POLICY "user_roles_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid(), organization_id)
);

CREATE POLICY "user_roles_update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid(), organization_id))
WITH CHECK (public.is_admin(auth.uid(), organization_id));

CREATE POLICY "user_roles_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid(), organization_id));

COMMIT;

-- Verificación
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_roles'
ORDER BY policyname;
