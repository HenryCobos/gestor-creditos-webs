-- =====================================================
-- FIX SEGURIDAD: SOLO ADMIN PUEDE ELIMINAR CLIENTES/PRESTAMOS
-- =====================================================
-- Objetivo:
-- - Un cobrador NO puede eliminar clientes ni préstamos
-- - Aplica incluso si el cobrador creó originalmente el registro
-- - La validación se hace en RLS (backend), no solo en frontend

BEGIN;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas comunes de DELETE en clientes
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete clientes based on role" ON public.clientes;
DROP POLICY IF EXISTS "Only admins can delete clientes" ON public.clientes;

-- Limpiar políticas previas comunes de DELETE en prestamos
DROP POLICY IF EXISTS "Admins can delete prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete prestamos based on role" ON public.prestamos;
DROP POLICY IF EXISTS "Only admins can delete prestamos" ON public.prestamos;

-- SOLO ADMIN puede eliminar clientes
CREATE POLICY "Only admins can delete clientes" ON public.clientes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.profiles owner_profile
      WHERE owner_profile.id = clientes.user_id
        AND (
          -- Contexto con organización: validar admin desde user_roles
          EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = owner_profile.organization_id
              AND ur.role = 'admin'
          )
          OR
          -- Contexto legacy sin organización: permitir solo perfiles admin
          (
            owner_profile.organization_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.profiles me
              WHERE me.id = auth.uid()
                AND me.role = 'admin'
            )
          )
        )
    )
  );

-- SOLO ADMIN puede eliminar préstamos
CREATE POLICY "Only admins can delete prestamos" ON public.prestamos
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.profiles owner_profile
      WHERE owner_profile.id = prestamos.user_id
        AND (
          -- Contexto con organización: validar admin desde user_roles
          EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.organization_id = owner_profile.organization_id
              AND ur.role = 'admin'
          )
          OR
          -- Contexto legacy sin organización: permitir solo perfiles admin
          (
            owner_profile.organization_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.profiles me
              WHERE me.id = auth.uid()
                AND me.role = 'admin'
            )
          )
        )
    )
  );

COMMIT;
