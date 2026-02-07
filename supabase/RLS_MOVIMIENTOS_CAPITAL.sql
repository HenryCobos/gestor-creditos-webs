-- ============================================
-- RLS MOVIMIENTOS_CAPITAL_RUTA: Políticas para movimientos de capital
-- ============================================

-- PASO 1: Eliminar políticas existentes
DROP POLICY IF EXISTS "movimientos_select" ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_insert" ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_update" ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_delete" ON public.movimientos_capital_ruta;

-- PASO 2: Crear políticas

-- 2A. SELECT: Ver movimientos de rutas de tu organización
CREATE POLICY "movimientos_select_org" ON public.movimientos_capital_ruta
FOR SELECT TO authenticated
USING (
  -- Si eres admin, ver movimientos de rutas de tu org
  EXISTS (
    SELECT 1 FROM rutas r
    JOIN profiles p ON p.organization_id = r.organization_id
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Si eres cobrador, ver movimientos de tus rutas
  EXISTS (
    SELECT 1 FROM rutas r
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

-- 2B. INSERT: Admins y cobradores pueden insertar movimientos
CREATE POLICY "movimientos_insert_policy" ON public.movimientos_capital_ruta
FOR INSERT TO authenticated
WITH CHECK (
  -- Admin de la organización de la ruta
  EXISTS (
    SELECT 1 FROM rutas r
    JOIN profiles p ON p.organization_id = r.organization_id
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Cobrador de la ruta
  EXISTS (
    SELECT 1 FROM rutas r
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

-- PASO 3: Verificar
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'movimientos_capital_ruta';

-- ✅ RESULTADO ESPERADO:
-- - 2 políticas creadas (select, insert)
