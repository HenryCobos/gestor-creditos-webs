-- =========================================================
-- FIX v3: Admin puede eliminar clientes/préstamos de toda la org
-- - Comparaciones NULL-safe (IS NOT DISTINCT FROM)
-- - Lógica espejo de get_prestamos_segun_rol / get_clientes_segun_rol
-- - RPC SECURITY DEFINER para CASCADE fiable
-- - DROP dinámico de TODAS las políticas DELETE legacy
-- Cobrador NO puede eliminar
-- =========================================================
-- Ejecutar en Supabase → SQL Editor (producción)

BEGIN;

-- =========================================================
-- Helpers
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_mi_organization_admin()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.activo = true
        AND p.organization_id IS NOT NULL
    ),
    (
      SELECT ur.organization_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
      ORDER BY ur.created_at ASC NULLS LAST
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.es_admin_activo()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_org UUID;
BEGIN
  -- Legacy: admin activo sin organization_id (cuentas dev/antiguas)
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
      AND p.organization_id IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  v_org := public.get_mi_organization_admin();
  IF v_org IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.activo = true
      AND p.organization_id IS NOT DISTINCT FROM v_org
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.organization_id IS NOT DISTINCT FROM v_org
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_puede_eliminar_cliente(p_cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_org UUID;
BEGIN
  IF p_cliente_id IS NULL OR NOT public.es_admin_activo() THEN
    RETURN FALSE;
  END IF;

  v_org := public.get_mi_organization_admin();

  -- Legacy admin sin org: mismos clientes que ve get_clientes_segun_rol
  IF v_org IS NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.clientes c
      JOIN public.profiles p ON p.id = c.user_id
      WHERE c.id = p_cliente_id
        AND p.organization_id IS NULL
    );
  END IF;

  -- Espejo de visibilidad admin en get_clientes_segun_rol + rutas
  RETURN EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = p_cliente_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles cp
          WHERE cp.id = c.user_id
            AND cp.organization_id IS NOT DISTINCT FROM v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = c.user_id
            AND ur.organization_id IS NOT DISTINCT FROM v_org
        )
        OR EXISTS (
          SELECT 1
          FROM public.ruta_clientes rc
          JOIN public.rutas r ON r.id = rc.ruta_id
          WHERE rc.cliente_id = c.id
            AND r.organization_id IS NOT DISTINCT FROM v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.rutas r
          WHERE r.cobrador_id = c.user_id
            AND r.organization_id IS NOT DISTINCT FROM v_org
        )
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_puede_eliminar_prestamo(p_prestamo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_cliente_id UUID;
BEGIN
  IF p_prestamo_id IS NULL OR NOT public.es_admin_activo() THEN
    RETURN FALSE;
  END IF;

  v_org := public.get_mi_organization_admin();

  SELECT pr.cliente_id INTO v_cliente_id
  FROM public.prestamos pr
  WHERE pr.id = p_prestamo_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Legacy admin sin org: espejo get_prestamos_segun_rol
  IF v_org IS NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.prestamos pr
      JOIN public.profiles p ON p.id = pr.user_id
      WHERE pr.id = p_prestamo_id
        AND p.organization_id IS NULL
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.prestamos pr
    WHERE pr.id = p_prestamo_id
      AND (
        -- Espejo get_prestamos_segun_rol admin
        EXISTS (
          SELECT 1 FROM public.profiles pp
          WHERE pp.id = pr.user_id
            AND pp.organization_id IS NOT DISTINCT FROM v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = pr.user_id
            AND ur.organization_id IS NOT DISTINCT FROM v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.rutas r
          WHERE r.id = pr.ruta_id
            AND r.organization_id IS NOT DISTINCT FROM v_org
        )
        OR (
          v_cliente_id IS NOT NULL
          AND public.admin_puede_eliminar_cliente(v_cliente_id)
        )
      )
  );
END;
$$;

-- =========================================================
-- RPC: eliminar con RLS off tras validación (CASCADE fiable)
-- =========================================================

CREATE OR REPLACE FUNCTION public.eliminar_cliente_admin(p_cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_puede_eliminar_cliente(p_cliente_id) THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  DELETE FROM public.clientes WHERE id = p_cliente_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_prestamo_admin(p_prestamo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_puede_eliminar_prestamo(p_prestamo_id) THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  DELETE FROM public.prestamos WHERE id = p_prestamo_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mi_organization_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_admin_activo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_puede_eliminar_cliente(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_puede_eliminar_prestamo(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_cliente_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_prestamo_admin(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_mi_organization_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_activo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_puede_eliminar_cliente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_puede_eliminar_prestamo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_cliente_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_prestamo_admin(UUID) TO authenticated;

-- =========================================================
-- DROP dinámico: TODAS las políticas DELETE en tablas afectadas
-- =========================================================

DO $$
DECLARE
  pol RECORD;
  tablas TEXT[] := ARRAY[
    'clientes', 'prestamos', 'cuotas', 'pagos',
    'garantias', 'abonos_capital', 'renovaciones_empeno'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t
          AND cmd = 'DELETE'
      LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON public.%I',
          pol.policyname,
          t
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- =========================================================
-- Políticas DELETE v3 (defensa en profundidad)
-- =========================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can delete clientes" ON public.clientes
FOR DELETE TO authenticated
USING (public.admin_puede_eliminar_cliente(id));

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can delete prestamos" ON public.prestamos
FOR DELETE TO authenticated
USING (public.admin_puede_eliminar_prestamo(id));

ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can delete cuotas" ON public.cuotas
FOR DELETE TO authenticated
USING (public.admin_puede_eliminar_prestamo(cuotas.prestamo_id));

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can delete pagos" ON public.pagos
FOR DELETE TO authenticated
USING (public.admin_puede_eliminar_prestamo(pagos.prestamo_id));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'garantias'
  ) THEN
    EXECUTE 'ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY "Only admins can delete garantias" ON public.garantias
      FOR DELETE TO authenticated
      USING (public.admin_puede_eliminar_prestamo(garantias.prestamo_id))
    $policy$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'abonos_capital'
  ) THEN
    EXECUTE 'ALTER TABLE public.abonos_capital ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY "Only admins can delete abonos_capital" ON public.abonos_capital
      FOR DELETE TO authenticated
      USING (public.admin_puede_eliminar_prestamo(abonos_capital.prestamo_id))
    $policy$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'renovaciones_empeno'
  ) THEN
    EXECUTE 'ALTER TABLE public.renovaciones_empeno ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY "Only admins can delete renovaciones_empeno" ON public.renovaciones_empeno
      FOR DELETE TO authenticated
      USING (public.admin_puede_eliminar_prestamo(renovaciones_empeno.prestamo_id))
    $policy$;
  END IF;
END;
$$;

COMMIT;

-- Verificación funciones + RPC v3
SELECT proname
FROM pg_proc
WHERE proname IN (
  'get_mi_organization_admin',
  'es_admin_activo',
  'admin_puede_eliminar_cliente',
  'admin_puede_eliminar_prestamo',
  'eliminar_cliente_admin',
  'eliminar_prestamo_admin'
)
ORDER BY proname;
