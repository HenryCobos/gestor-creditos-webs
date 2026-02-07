-- =====================================================
-- SOLUCIÓN PRAGMÁTICA: RLS BÁSICO QUE SÍ FUNCIONA
-- =====================================================
-- Esta solución mantiene políticas RLS MUY SIMPLES
-- y delega la lógica de roles al frontend/middleware
-- =====================================================

BEGIN;

-- =====================================================
-- CLIENTES - Políticas super simples
-- =====================================================
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

-- Política única para todo
CREATE POLICY "clientes_policy" ON public.clientes
FOR ALL TO authenticated
USING (
  -- Solo acceso si:
  -- 1. Eres el propietario directo
  auth.uid() = user_id
  OR
  -- 2. Eres admin/cobrador de la misma org (verificamos en profiles)
  auth.uid() IN (
    SELECT p.id 
    FROM profiles p
    WHERE p.organization_id = (
      SELECT organization_id FROM profiles WHERE id = clientes.user_id
    )
    AND p.activo = true
  )
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRESTAMOS - Políticas super simples
-- =====================================================
ALTER TABLE public.prestamos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_select_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_insert_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_update_policy" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete_policy" ON public.prestamos;

CREATE POLICY "prestamos_policy" ON public.prestamos
FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR
  auth.uid() IN (
    SELECT p.id 
    FROM profiles p
    WHERE p.organization_id = (
      SELECT organization_id FROM profiles WHERE id = prestamos.user_id
    )
    AND p.activo = true
  )
);

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CUOTAS - Políticas super simples
-- =====================================================
ALTER TABLE public.cuotas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_select_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_insert_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_update_policy" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete_policy" ON public.cuotas;

CREATE POLICY "cuotas_policy" ON public.cuotas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        auth.uid() IN (
          SELECT prof.id 
          FROM profiles prof
          WHERE prof.organization_id = (
            SELECT organization_id FROM profiles WHERE id = p.user_id
          )
          AND prof.activo = true
        )
      )
  )
);

ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PAGOS - Políticas super simples
-- =====================================================
ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pagos;
DROP POLICY IF EXISTS "pagos_select_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete_policy" ON public.pagos;

CREATE POLICY "pagos_policy" ON public.pagos
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND (
        auth.uid() = p.user_id
        OR
        auth.uid() IN (
          SELECT prof.id 
          FROM profiles prof
          WHERE prof.organization_id = (
            SELECT organization_id FROM profiles WHERE id = p.user_id
          )
          AND prof.activo = true
        )
      )
  )
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT '✅ Políticas RLS básicas aplicadas' as resultado;

-- Verificación
SELECT 
  tablename,
  COUNT(*) as num_policies
FROM pg_policies
WHERE tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
GROUP BY tablename
ORDER BY tablename;
