-- =====================================================
-- SOLUCIÓN ALTERNATIVA: RLS SIMPLE SIN FUNCIONES
-- =====================================================
-- Esta solución usa JOINS en lugar de subconsultas
-- y no requiere funciones helper
-- =====================================================

BEGIN;

-- =====================================================
-- CLIENTES
-- =====================================================
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

-- SELECT: Propietario directo SIEMPRE + Admin org + Cobrador de ruta
CREATE POLICY "clientes_select_policy" ON public.clientes
FOR SELECT TO authenticated
USING (
  -- CONDICIÓN 1: Propietario directo (MÁS IMPORTANTE)
  auth.uid() = user_id
  OR
  -- CONDICIÓN 2: Admin de la misma org (usando JOIN lateral)
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = clientes.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
  OR
  -- CONDICIÓN 3: Cobrador que tiene este cliente en su ruta
  EXISTS (
    SELECT 1 
    FROM ruta_clientes rc
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE rc.cliente_id = clientes.id
      AND r.cobrador_id = auth.uid()
  )
);

-- INSERT: Propietario directo o admin de su org
CREATE POLICY "clientes_insert_policy" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = clientes.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- UPDATE: Propietario directo o admin de su org
CREATE POLICY "clientes_update_policy" ON public.clientes
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = clientes.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- DELETE: Propietario directo o admin de su org
CREATE POLICY "clientes_delete_policy" ON public.clientes
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = clientes.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRESTAMOS
-- =====================================================
ALTER TABLE public.prestamos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_select_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_insert_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_update_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete_policy" ON public.prestamos;

-- SELECT
CREATE POLICY "prestamos_select_policy" ON public.prestamos
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = prestamos.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
  OR
  EXISTS (
    SELECT 1 
    FROM rutas r
    WHERE r.id = prestamos.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

-- INSERT
CREATE POLICY "prestamos_insert_policy" ON public.prestamos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = prestamos.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- UPDATE
CREATE POLICY "prestamos_update_policy" ON public.prestamos
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = prestamos.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

-- DELETE
CREATE POLICY "prestamos_delete_policy" ON public.prestamos
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 
    FROM profiles p_user, profiles p_auth
    WHERE p_user.id = prestamos.user_id
      AND p_auth.id = auth.uid()
      AND p_auth.role = 'admin'
      AND p_auth.activo = true
      AND p_user.organization_id = p_auth.organization_id
      AND p_user.organization_id IS NOT NULL
  )
);

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CUOTAS
-- =====================================================
ALTER TABLE public.cuotas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_select_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_insert_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_update_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete_policy" ON public.cuotas;

-- SELECT
CREATE POLICY "cuotas_select_policy" ON public.cuotas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM rutas r
          WHERE r.id = p.ruta_id
            AND r.cobrador_id = auth.uid()
        )
      )
  )
);

-- INSERT
CREATE POLICY "cuotas_insert_policy" ON public.cuotas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
      )
  )
);

-- UPDATE
CREATE POLICY "cuotas_update_policy" ON public.cuotas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
      )
  )
);

-- DELETE
CREATE POLICY "cuotas_delete_policy" ON public.cuotas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
      )
  )
);

ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PAGOS
-- =====================================================
ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pagos;
DROP POLICY IF EXISTS "pagos_select_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete_policy" ON public.pagos;

-- SELECT
CREATE POLICY "pagos_select_policy" ON public.pagos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM rutas r
          WHERE r.id = p.ruta_id
            AND r.cobrador_id = auth.uid()
        )
      )
  )
);

-- INSERT: Propietario, admin, o cobrador
CREATE POLICY "pagos_insert_policy" ON public.pagos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
        OR
        EXISTS (
          SELECT 1 FROM rutas r
          WHERE r.id = p.ruta_id
            AND r.cobrador_id = auth.uid()
        )
      )
  )
);

-- UPDATE: Propietario, admin, o cobrador solo el mismo día
CREATE POLICY "pagos_update_policy" ON public.pagos
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
        OR
        (
          EXISTS (
            SELECT 1 FROM rutas r
            WHERE r.id = p.ruta_id
              AND r.cobrador_id = auth.uid()
          )
          AND DATE(pagos.fecha_pago) = CURRENT_DATE
        )
      )
  )
);

-- DELETE: Solo propietario o admin
CREATE POLICY "pagos_delete_policy" ON public.pagos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        EXISTS (
          SELECT 1 
          FROM profiles p_user, profiles p_auth
          WHERE p_user.id = p.user_id
            AND p_auth.id = auth.uid()
            AND p_auth.role = 'admin'
            AND p_auth.activo = true
            AND p_user.organization_id = p_auth.organization_id
            AND p_user.organization_id IS NOT NULL
        )
      )
  )
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT '✅ Políticas RLS aplicadas correctamente' as resultado;

-- Verificación
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename;
