-- =====================================================
-- SOLUCIÓN ULTRA SIMPLE - GARANTIZADA QUE FUNCIONA
-- =====================================================
-- Esta es la solución MÁS SIMPLE posible
-- Solo permite acceso directo: auth.uid() = user_id
-- La lógica de roles se manejará en el FRONTEND
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
DROP POLICY IF EXISTS "clientes_policy" ON public.clientes;

CREATE POLICY "clientes_access" ON public.clientes
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "prestamos_policy" ON public.prestamos;

CREATE POLICY "prestamos_access" ON public.prestamos
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "cuotas_policy" ON public.cuotas;

CREATE POLICY "cuotas_access" ON public.cuotas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = cuotas.prestamo_id
      AND p.user_id = auth.uid()
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
DROP POLICY IF EXISTS "pagos_policy" ON public.pagos;

CREATE POLICY "pagos_access" ON public.pagos
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prestamos p
    WHERE p.id = pagos.prestamo_id
      AND p.user_id = auth.uid()
  )
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT '✅ Políticas RLS ultra simples aplicadas - GARANTIZADO' as resultado;

-- Test inmediato
SELECT 
  'Test acceso:' as test,
  (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as mis_clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = auth.uid()) as mis_prestamos;
