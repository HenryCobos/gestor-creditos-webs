-- =====================================================
-- SOLUCIÓN DEFINITIVA: RLS CON FUNCIONES HELPER
-- =====================================================
-- Las funciones simplifican las políticas RLS y evitan
-- problemas con subconsultas complejas
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Crear funciones helper
-- =====================================================

-- Función: Verificar si el usuario es admin de una organización
CREATE OR REPLACE FUNCTION public.es_admin_de_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = org_id
      AND p.role = 'admin'
      AND p.activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función: Verificar si el usuario es cobrador de una ruta específica
CREATE OR REPLACE FUNCTION public.es_cobrador_de_ruta(ruta_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rutas r
    WHERE r.id = ruta_id_param
      AND r.cobrador_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función: Verificar si un cliente está en las rutas del cobrador
CREATE OR REPLACE FUNCTION public.cliente_en_mis_rutas(cliente_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ruta_clientes rc
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE rc.cliente_id = cliente_id_param
      AND r.cobrador_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función: Obtener organization_id de un usuario
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id_param UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = user_id_param;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- PASO 2: Aplicar políticas RLS simplificadas
-- =====================================================

-- =====================================================
-- CLIENTES
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
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
  OR
  cliente_en_mis_rutas(id)
);

-- INSERT: Propietario o admin de la org
CREATE POLICY "clientes_insert_policy" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
);

-- UPDATE: Propietario o admin de la org
CREATE POLICY "clientes_update_policy" ON public.clientes
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
);

-- DELETE: Propietario o admin de la org
CREATE POLICY "clientes_delete_policy" ON public.clientes
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
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

-- SELECT: Propietario + Admin org + Cobrador de ruta
CREATE POLICY "prestamos_select_policy" ON public.prestamos
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
  OR
  (ruta_id IS NOT NULL AND es_cobrador_de_ruta(ruta_id))
);

-- INSERT: Propietario o admin
CREATE POLICY "prestamos_insert_policy" ON public.prestamos
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
);

-- UPDATE: Propietario o admin
CREATE POLICY "prestamos_update_policy" ON public.prestamos
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
);

-- DELETE: Propietario o admin
CREATE POLICY "prestamos_delete_policy" ON public.prestamos
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR
  es_admin_de_org(get_user_organization(user_id))
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
        es_admin_de_org(get_user_organization(p.user_id))
        OR
        (p.ruta_id IS NOT NULL AND es_cobrador_de_ruta(p.ruta_id))
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
        es_admin_de_org(get_user_organization(p.user_id))
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
        es_admin_de_org(get_user_organization(p.user_id))
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
        es_admin_de_org(get_user_organization(p.user_id))
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
        es_admin_de_org(get_user_organization(p.user_id))
        OR
        (p.ruta_id IS NOT NULL AND es_cobrador_de_ruta(p.ruta_id))
      )
  )
);

-- INSERT: Propietario, admin, o cobrador de la ruta
CREATE POLICY "pagos_insert_policy" ON public.pagos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        es_admin_de_org(get_user_organization(p.user_id))
        OR
        (p.ruta_id IS NOT NULL AND es_cobrador_de_ruta(p.ruta_id))
      )
  )
);

-- UPDATE: Admin, propietario, o cobrador solo el mismo día
CREATE POLICY "pagos_update_policy" ON public.pagos
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        es_admin_de_org(get_user_organization(p.user_id))
        OR
        (
          p.ruta_id IS NOT NULL 
          AND es_cobrador_de_ruta(p.ruta_id)
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
        es_admin_de_org(get_user_organization(p.user_id))
      )
  )
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT '✅ Políticas RLS con funciones aplicadas correctamente' as resultado;

-- Test de funciones
SELECT 
  'Test de funciones helper:' as test,
  es_admin_de_org(get_user_organization(auth.uid())) as "soy_admin_de_mi_org",
  get_user_organization(auth.uid()) as "mi_organization_id";

-- Verificar RLS habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename;

-- Contar políticas
SELECT 
  schemaname,
  tablename,
  COUNT(*) as num_policies
FROM pg_policies
WHERE tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
GROUP BY schemaname, tablename
ORDER BY tablename;
