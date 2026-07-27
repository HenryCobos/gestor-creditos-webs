-- =========================================================
-- FIX v2: Admin puede eliminar clientes/préstamos de toda la org
-- Enfoque admin-centrado (no depende de organization_id del cobrador creador)
-- Cobrador NO puede eliminar nada
-- =========================================================
-- Ejecutar en Supabase → SQL Editor después de FIX_ADMIN_DELETE_ORG_COMPLETO.sql

BEGIN;

-- =========================================================
-- Helpers admin-centrados
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
      AND p.organization_id = v_org
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.organization_id = v_org
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
  IF v_org IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = p_cliente_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles cp
          WHERE cp.id = c.user_id AND cp.organization_id = v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = c.user_id AND ur.organization_id = v_org
        )
        OR EXISTS (
          SELECT 1
          FROM public.ruta_clientes rc
          JOIN public.rutas r ON r.id = rc.ruta_id
          WHERE rc.cliente_id = c.id AND r.organization_id = v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.rutas r
          WHERE r.cobrador_id = c.user_id AND r.organization_id = v_org
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
  IF v_org IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT pr.cliente_id INTO v_cliente_id
  FROM public.prestamos pr
  WHERE pr.id = p_prestamo_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.prestamos pr
    WHERE pr.id = p_prestamo_id
      AND (
        EXISTS (
          SELECT 1 FROM public.rutas r
          WHERE r.id = pr.ruta_id AND r.organization_id = v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles pp
          WHERE pp.id = pr.user_id AND pp.organization_id = v_org
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = pr.user_id AND ur.organization_id = v_org
        )
        OR (v_cliente_id IS NOT NULL AND public.admin_puede_eliminar_cliente(v_cliente_id))
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mi_organization_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_admin_activo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_puede_eliminar_cliente(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_puede_eliminar_prestamo(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_mi_organization_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_activo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_puede_eliminar_cliente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_puede_eliminar_prestamo(UUID) TO authenticated;

-- =========================================================
-- DROP exhaustivo políticas DELETE legacy
-- =========================================================

-- clientes
DROP POLICY IF EXISTS "Users can delete own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete clientes based on role" ON public.clientes;
DROP POLICY IF EXISTS "Only admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

-- prestamos
DROP POLICY IF EXISTS "Users can delete own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can delete prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete prestamos based on role" ON public.prestamos;
DROP POLICY IF EXISTS "Only admins can delete prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete_policy" ON public.prestamos;

-- cuotas
DROP POLICY IF EXISTS "Users can delete own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Admins can delete cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can delete cuotas based on role" ON public.cuotas;
DROP POLICY IF EXISTS "Only admins can delete cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete_policy" ON public.cuotas;

-- pagos
DROP POLICY IF EXISTS "Users can delete own pagos" ON public.pagos;
DROP POLICY IF EXISTS "Admins can delete pagos" ON public.pagos;
DROP POLICY IF EXISTS "Users can delete pagos based on role" ON public.pagos;
DROP POLICY IF EXISTS "Only admins can delete pagos" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete_policy" ON public.pagos;

-- abonos_capital (tabla opcional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'abonos_capital'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own abonos_capital" ON public.abonos_capital';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete abonos_capital" ON public.abonos_capital';
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete abonos_capital" ON public.abonos_capital';
    EXECUTE 'DROP POLICY IF EXISTS "abonos_capital_delete_policy" ON public.abonos_capital';
  END IF;
END;
$$;

-- renovaciones_empeno (tabla opcional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'renovaciones_empeno'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own renovaciones" ON public.renovaciones_empeno';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete renovaciones" ON public.renovaciones_empeno';
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete renovaciones_empeno" ON public.renovaciones_empeno';
    EXECUTE 'DROP POLICY IF EXISTS "renovaciones_empeno_delete_policy" ON public.renovaciones_empeno';
  END IF;
END;
$$;

-- garantias (tabla opcional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'garantias'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own garantias" ON public.garantias';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete garantias" ON public.garantias';
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete garantias" ON public.garantias';
    EXECUTE 'DROP POLICY IF EXISTS "garantias_delete_policy" ON public.garantias';
  END IF;
END;
$$;

-- =========================================================
-- Políticas DELETE v2 (solo admin de org)
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
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete garantias" ON public.garantias';
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
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete abonos_capital" ON public.abonos_capital';
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
    EXECUTE 'DROP POLICY IF EXISTS "Only admins can delete renovaciones_empeno" ON public.renovaciones_empeno';
    EXECUTE $policy$
      CREATE POLICY "Only admins can delete renovaciones_empeno" ON public.renovaciones_empeno
      FOR DELETE TO authenticated
      USING (public.admin_puede_eliminar_prestamo(renovaciones_empeno.prestamo_id))
    $policy$;
  END IF;
END;
$$;

COMMIT;

-- Verificación funciones v2
SELECT proname
FROM pg_proc
WHERE proname IN (
  'get_mi_organization_admin',
  'es_admin_activo',
  'admin_puede_eliminar_cliente',
  'admin_puede_eliminar_prestamo'
)
ORDER BY proname;
