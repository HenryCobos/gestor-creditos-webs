  -- =========================================================
-- FIX: Admin puede eliminar clientes/préstamos de toda la org
-- Cobrador NO puede eliminar (ni lo propio ni asignado)
-- =========================================================
-- Ejecutar en Supabase → SQL Editor (producción)
-- Solo modifica políticas DELETE + funciones helper

BEGIN;

-- =========================================================
-- Helpers
-- =========================================================

CREATE OR REPLACE FUNCTION public.es_admin_de_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = org_id
      AND p.role = 'admin'
      AND p.activo = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = org_id
      AND ur.role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cliente_organization(cliente_id_param UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.organization_id
      FROM public.clientes c
      JOIN public.profiles p ON p.id = c.user_id
      WHERE c.id = cliente_id_param
    ),
    (
      SELECT r.organization_id
      FROM public.ruta_clientes rc
      JOIN public.rutas r ON r.id = rc.ruta_id
      WHERE rc.cliente_id = cliente_id_param
        AND rc.activo = true
      ORDER BY rc.fecha_asignacion DESC NULLS LAST
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_prestamo_organization(prestamo_id_param UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT r.organization_id
      FROM public.prestamos pr
      JOIN public.rutas r ON r.id = pr.ruta_id
      WHERE pr.id = prestamo_id_param
    ),
    (
      SELECT p.organization_id
      FROM public.prestamos pr
      JOIN public.profiles p ON p.id = pr.user_id
      WHERE pr.id = prestamo_id_param
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.puede_eliminar_prestamo(prestamo_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.es_admin_de_org(public.get_prestamo_organization(prestamo_id_param));
$$;

REVOKE ALL ON FUNCTION public.es_admin_de_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cliente_organization(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_prestamo_organization(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.puede_eliminar_prestamo(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.es_admin_de_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cliente_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prestamo_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_eliminar_prestamo(UUID) TO authenticated;

-- =========================================================
-- CLIENTES — DELETE solo admin de org
-- =========================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete clientes based on role" ON public.clientes;
DROP POLICY IF EXISTS "Only admins can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

CREATE POLICY "Only admins can delete clientes" ON public.clientes
FOR DELETE TO authenticated
USING (
  public.es_admin_de_org(public.get_cliente_organization(id))
);

-- =========================================================
-- PRESTAMOS — DELETE solo admin de org
-- =========================================================

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can delete prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete prestamos based on role" ON public.prestamos;
DROP POLICY IF EXISTS "Only admins can delete prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete_policy" ON public.prestamos;

CREATE POLICY "Only admins can delete prestamos" ON public.prestamos
FOR DELETE TO authenticated
USING (
  public.es_admin_de_org(public.get_prestamo_organization(id))
);

-- =========================================================
-- CUOTAS — DELETE vía org del préstamo padre
-- =========================================================

ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete_policy" ON public.cuotas;

CREATE POLICY "Only admins can delete cuotas" ON public.cuotas
FOR DELETE TO authenticated
USING (
  public.puede_eliminar_prestamo(cuotas.prestamo_id)
);

-- =========================================================
-- PAGOS — DELETE vía org del préstamo padre
-- =========================================================

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own pagos" ON public.pagos;
DROP POLICY IF EXISTS "pagos_delete_policy" ON public.pagos;

CREATE POLICY "Only admins can delete pagos" ON public.pagos
FOR DELETE TO authenticated
USING (
  public.puede_eliminar_prestamo(pagos.prestamo_id)
);

-- =========================================================
-- GARANTIAS — DELETE vía org del préstamo (si existe tabla)
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'garantias'
  ) THEN
    EXECUTE 'ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own garantias" ON public.garantias';
    EXECUTE 'DROP POLICY IF EXISTS "garantias_delete_policy" ON public.garantias';

    EXECUTE $policy$
      CREATE POLICY "Only admins can delete garantias" ON public.garantias
      FOR DELETE TO authenticated
      USING (
        public.puede_eliminar_prestamo(garantias.prestamo_id)
      )
    $policy$;
  END IF;
END;
$$;

COMMIT;

-- Verificación
SELECT proname
FROM pg_proc
WHERE proname IN (
  'es_admin_de_org',
  'get_cliente_organization',
  'get_prestamo_organization',
  'puede_eliminar_prestamo'
)
ORDER BY proname;
