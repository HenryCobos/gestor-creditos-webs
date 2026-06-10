-- =========================================================
-- FIX: "RLS Policy Always True"
-- =========================================================
-- Supabase detecta políticas RLS con expresiones demasiado
-- permisivas ("FOR ALL USING" genera un WITH CHECK implícito
-- para INSERT que puede ser siempre verdadero).
--
-- SOLUCIÓN: Reemplazar políticas FOR ALL con políticas
-- específicas por operación (SELECT/INSERT/UPDATE/DELETE).
--
-- TABLAS AFECTADAS:
-- - public.rutas
-- - public.ruta_clientes
-- - public.movimientos_capital_ruta
-- - public.gastos
-- - public.arqueos_caja
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- =========================================================

BEGIN;

-- =========================================================
-- TABLA: rutas
-- =========================================================

DROP POLICY IF EXISTS "Users can view rutas in their organization" ON public.rutas;
DROP POLICY IF EXISTS "Admins can manage rutas"                    ON public.rutas;
DROP POLICY IF EXISTS "rutas_select_org"                           ON public.rutas;
DROP POLICY IF EXISTS "rutas_insert_admin"                         ON public.rutas;
DROP POLICY IF EXISTS "rutas_update_policy"                        ON public.rutas;
DROP POLICY IF EXISTS "rutas_delete_admin"                         ON public.rutas;
DROP POLICY IF EXISTS "rutas_select"                               ON public.rutas;
DROP POLICY IF EXISTS "rutas_insert"                               ON public.rutas;
DROP POLICY IF EXISTS "rutas_update"                               ON public.rutas;
DROP POLICY IF EXISTS "rutas_delete"                               ON public.rutas;

CREATE POLICY "rutas_select" ON public.rutas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = rutas.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR (cobrador_id = auth.uid())
);

CREATE POLICY "rutas_insert" ON public.rutas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = rutas.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "rutas_update" ON public.rutas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = rutas.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR (cobrador_id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = rutas.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR (cobrador_id = auth.uid())
);

CREATE POLICY "rutas_delete" ON public.rutas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = rutas.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

-- =========================================================
-- TABLA: ruta_clientes
-- =========================================================

DROP POLICY IF EXISTS "Users can view ruta_clientes"    ON public.ruta_clientes;
DROP POLICY IF EXISTS "Admins can manage ruta_clientes" ON public.ruta_clientes;
DROP POLICY IF EXISTS "ruta_clientes_select"            ON public.ruta_clientes;
DROP POLICY IF EXISTS "ruta_clientes_insert"            ON public.ruta_clientes;
DROP POLICY IF EXISTS "ruta_clientes_update"            ON public.ruta_clientes;
DROP POLICY IF EXISTS "ruta_clientes_delete"            ON public.ruta_clientes;

CREATE POLICY "ruta_clientes_select" ON public.ruta_clientes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = ruta_clientes.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.rutas r
    WHERE r.id = ruta_clientes.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

CREATE POLICY "ruta_clientes_insert" ON public.ruta_clientes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = ruta_clientes.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "ruta_clientes_update" ON public.ruta_clientes
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = ruta_clientes.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = ruta_clientes.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "ruta_clientes_delete" ON public.ruta_clientes
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = ruta_clientes.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
);

-- =========================================================
-- TABLA: movimientos_capital_ruta
-- =========================================================

DROP POLICY IF EXISTS "Users can view movimientos in their organization" ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "Admins can manage movimientos"                    ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_select_org"                           ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_insert_policy"                        ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_select"                               ON public.movimientos_capital_ruta;
DROP POLICY IF EXISTS "movimientos_insert"                               ON public.movimientos_capital_ruta;

CREATE POLICY "movimientos_select" ON public.movimientos_capital_ruta
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.rutas r
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

CREATE POLICY "movimientos_insert" ON public.movimientos_capital_ruta
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rutas r
    JOIN public.profiles p ON p.organization_id = r.organization_id
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR EXISTS (
    SELECT 1 FROM public.rutas r
    WHERE r.id = movimientos_capital_ruta.ruta_id
      AND r.cobrador_id = auth.uid()
  )
);

-- =========================================================
-- TABLA: gastos
-- =========================================================

DROP POLICY IF EXISTS "Users can view gastos in their organization" ON public.gastos;
DROP POLICY IF EXISTS "Cobradores can create their gastos"          ON public.gastos;
DROP POLICY IF EXISTS "Admins can update gastos"                    ON public.gastos;
DROP POLICY IF EXISTS "Admins can delete gastos"                    ON public.gastos;
DROP POLICY IF EXISTS "gastos_select"                               ON public.gastos;
DROP POLICY IF EXISTS "gastos_insert"                               ON public.gastos;
DROP POLICY IF EXISTS "gastos_update"                               ON public.gastos;
DROP POLICY IF EXISTS "gastos_delete"                               ON public.gastos;

CREATE POLICY "gastos_select" ON public.gastos
FOR SELECT TO authenticated
USING (
  cobrador_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = gastos.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "gastos_insert" ON public.gastos
FOR INSERT TO authenticated
WITH CHECK (
  cobrador_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = gastos.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "gastos_update" ON public.gastos
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = gastos.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = gastos.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "gastos_delete" ON public.gastos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = gastos.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

-- =========================================================
-- TABLA: arqueos_caja
-- =========================================================

DROP POLICY IF EXISTS "Users can view arqueos in their organization" ON public.arqueos_caja;
DROP POLICY IF EXISTS "Users can create arqueos"                     ON public.arqueos_caja;
DROP POLICY IF EXISTS "Admins can update arqueos"                    ON public.arqueos_caja;
DROP POLICY IF EXISTS "arqueos_select"                               ON public.arqueos_caja;
DROP POLICY IF EXISTS "arqueos_insert"                               ON public.arqueos_caja;
DROP POLICY IF EXISTS "arqueos_update"                               ON public.arqueos_caja;
DROP POLICY IF EXISTS "arqueos_delete"                               ON public.arqueos_caja;

CREATE POLICY "arqueos_select" ON public.arqueos_caja
FOR SELECT TO authenticated
USING (
  cobrador_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = arqueos_caja.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "arqueos_insert" ON public.arqueos_caja
FOR INSERT TO authenticated
WITH CHECK (
  cobrador_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = arqueos_caja.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "arqueos_update" ON public.arqueos_caja
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = arqueos_caja.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = arqueos_caja.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

CREATE POLICY "arqueos_delete" ON public.arqueos_caja
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = arqueos_caja.organization_id
      AND p.role = 'admin'
      AND p.activo = true
  )
);

COMMIT;

-- =========================================================
-- VERIFICACIÓN: Políticas creadas por tabla
-- =========================================================

SELECT
  tablename,
  policyname,
  cmd AS operacion,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'rutas',
    'ruta_clientes',
    'movimientos_capital_ruta',
    'gastos',
    'arqueos_caja'
  )
ORDER BY tablename, cmd;

-- =========================================================
-- RESULTADO ESPERADO por tabla:
-- rutas              → 4 políticas (SELECT, INSERT, UPDATE, DELETE)
-- ruta_clientes      → 4 políticas (SELECT, INSERT, UPDATE, DELETE)
-- movimientos_capital_ruta → 2 políticas (SELECT, INSERT)
-- gastos             → 4 políticas (SELECT, INSERT, UPDATE, DELETE)
-- arqueos_caja       → 4 políticas (SELECT, INSERT, UPDATE, DELETE)
--
-- COMPORTAMIENTO (sin cambios para usuarios):
-- ✅ Admin ve y gestiona todos los recursos de su organización
-- ✅ Cobrador ve solo sus rutas, gastos y arqueos propios
-- ✅ Cobrador puede insertar movimientos en sus rutas
-- =========================================================
