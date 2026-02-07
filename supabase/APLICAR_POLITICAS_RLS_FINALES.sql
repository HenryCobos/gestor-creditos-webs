-- =====================================================
-- APLICAR POLÍTICAS RLS FINALES CON SOPORTE DE ROLES
-- =====================================================
-- Este script aplica las políticas RLS que permiten:
-- 1. Acceso completo a datos propios (auth.uid() = user_id)
-- 2. Admins ven todo en su organización
-- 3. Cobradores solo ven clientes de sus rutas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. POLÍTICAS PARA: public.clientes
-- =====================================================

ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

-- SELECT: Propietario + Admin org + Cobrador de ruta
CREATE POLICY "clientes_select_policy" ON public.clientes
FOR SELECT TO authenticated
USING (
  -- 1. Acceso directo al propietario (SIEMPRE)
  auth.uid() = user_id
  OR
  -- 2. Admin de la misma organización
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = clientes.user_id
      )
  )
  OR
  -- 3. Cobrador que tiene este cliente en su ruta
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN rutas r ON r.cobrador_id = p.id
    JOIN ruta_clientes rc ON rc.ruta_id = r.id
    WHERE p.id = auth.uid()
      AND p.role = 'cobrador'
      AND rc.cliente_id = clientes.id
  )
);

-- INSERT: Solo propietario o admin de la org
CREATE POLICY "clientes_insert_policy" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = clientes.user_id
      )
  )
);

-- UPDATE: Propietario o admin de la org
CREATE POLICY "clientes_update_policy" ON public.clientes
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = clientes.user_id
      )
  )
);

-- DELETE: Solo propietario o admin
CREATE POLICY "clientes_delete_policy" ON public.clientes
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = clientes.user_id
      )
  )
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. POLÍTICAS PARA: public.prestamos
-- =====================================================

ALTER TABLE public.prestamos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_select_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_insert_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_update_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete_policy" ON public.prestamos;

-- SELECT: Propietario + Admin org + Cobrador de ruta
CREATE POLICY "prestamos_select_policy" ON public.prestamos
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = prestamos.user_id
      )
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN rutas r ON r.cobrador_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'cobrador'
      AND r.id = prestamos.ruta_id
  )
);

-- INSERT: Propietario o admin
CREATE POLICY "prestamos_insert_policy" ON public.prestamos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = prestamos.user_id
      )
  )
);

-- UPDATE: Propietario o admin
CREATE POLICY "prestamos_update_policy" ON public.prestamos
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = prestamos.user_id
      )
  )
);

-- DELETE: Propietario o admin
CREATE POLICY "prestamos_delete_policy" ON public.prestamos
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = (
        SELECT organization_id FROM profiles WHERE id = prestamos.user_id
      )
  )
);

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS PARA: public.cuotas
-- =====================================================

ALTER TABLE public.cuotas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_select_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_insert_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_update_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete_policy" ON public.cuotas;

-- SELECT: Acceso vía prestamo
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
        OR
        EXISTS (
          SELECT 1 FROM profiles prof
          JOIN rutas r ON r.cobrador_id = prof.id
          WHERE prof.id = auth.uid()
            AND prof.role = 'cobrador'
            AND r.id = p.ruta_id
        )
      )
  )
);

-- INSERT: Propietario o admin del préstamo
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
      )
  )
);

-- UPDATE: Propietario o admin
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
      )
  )
);

-- DELETE: Propietario o admin
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
      )
  )
);

ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS PARA: public.pagos
-- =====================================================

ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pagos;
DROP POLICY IF EXISTS "pagos_select_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete_policy" ON public.pagos;

-- SELECT: Acceso vía préstamo
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
        OR
        EXISTS (
          SELECT 1 FROM profiles prof
          JOIN rutas r ON r.cobrador_id = prof.id
          WHERE prof.id = auth.uid()
            AND prof.role = 'cobrador'
            AND r.id = p.ruta_id
        )
      )
  )
);

-- INSERT: Propietario, admin, o cobrador de la ruta (pueden registrar pagos)
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
        OR
        EXISTS (
          SELECT 1 FROM profiles prof
          JOIN rutas r ON r.cobrador_id = prof.id
          WHERE prof.id = auth.uid()
            AND prof.role = 'cobrador'
            AND r.id = p.ruta_id
        )
      )
  )
);

-- UPDATE: Solo admin o propietario (cobradores NO editan pagos después del día)
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
        OR
        -- Cobrador solo puede editar pagos del mismo día
        (
          EXISTS (
            SELECT 1 FROM profiles prof
            JOIN rutas r ON r.cobrador_id = prof.id
            WHERE prof.id = auth.uid()
              AND prof.role = 'cobrador'
              AND r.id = p.ruta_id
              AND DATE(pagos.fecha_pago) = CURRENT_DATE
          )
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
          SELECT 1 FROM profiles prof
          WHERE prof.id = auth.uid()
            AND prof.role = 'admin'
            AND prof.organization_id = (
              SELECT organization_id FROM profiles WHERE id = p.user_id
            )
        )
      )
  )
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT '✅ Políticas RLS aplicadas correctamente' as resultado;

-- Verificar que todas las tablas tienen RLS habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename;
