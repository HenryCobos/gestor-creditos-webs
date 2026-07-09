-- FIX Security Advisor: vista_organizacion_limites sin SECURITY DEFINER
-- Ejecutar todo este archivo en Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_limites_organizacion();
DROP VIEW IF EXISTS public.vista_organizacion_limites CASCADE;

CREATE VIEW public.vista_organizacion_limites
WITH (security_invoker = true)
AS
SELECT
  o.id AS organization_id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre AS plan_nombre,
  pl.slug AS plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  pl.limite_usuarios,
  COUNT(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) AS usuarios_usados,
  COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL) AS clientes_usados,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL) AS prestamos_usados,
  GREATEST(
    pl.limite_usuarios - COUNT(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL),
    0
  ) AS usuarios_disponibles,
  GREATEST(
    pl.limite_clientes - COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL),
    0
  ) AS clientes_disponibles,
  GREATEST(
    pl.limite_prestamos - COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL),
    0
  ) AS prestamos_disponibles,
  ROUND(
    (COUNT(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL)::NUMERIC / NULLIF(pl.limite_usuarios, 0)) * 100,
    2
  ) AS porcentaje_usuarios,
  ROUND(
    (COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL)::NUMERIC / NULLIF(pl.limite_clientes, 0)) * 100,
    2
  ) AS porcentaje_clientes,
  ROUND(
    (COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL)::NUMERIC / NULLIF(pl.limite_prestamos, 0)) * 100,
    2
  ) AS porcentaje_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
GROUP BY
  o.id,
  o.nombre_negocio,
  o.plan_id,
  pl.id,
  pl.nombre,
  pl.slug,
  pl.limite_clientes,
  pl.limite_prestamos,
  pl.limite_usuarios;

GRANT SELECT ON public.vista_organizacion_limites TO authenticated;

CREATE FUNCTION public.get_limites_organizacion()
RETURNS TABLE (
  organization_id UUID,
  plan_nombre TEXT,
  plan_slug TEXT,
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  limite_usuarios INTEGER,
  usuarios_usados BIGINT,
  clientes_usados BIGINT,
  prestamos_usados BIGINT,
  usuarios_disponibles BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  porcentaje_usuarios NUMERIC,
  porcentaje_clientes NUMERIC,
  porcentaje_prestamos NUMERIC,
  puede_crear_usuario BOOLEAN,
  puede_crear_cliente BOOLEAN,
  puede_crear_prestamo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.organization_id,
    v.plan_nombre,
    v.plan_slug,
    v.limite_clientes,
    v.limite_prestamos,
    v.limite_usuarios,
    v.usuarios_usados,
    v.clientes_usados,
    v.prestamos_usados,
    v.usuarios_disponibles,
    v.clientes_disponibles,
    v.prestamos_disponibles,
    v.porcentaje_usuarios,
    v.porcentaje_clientes,
    v.porcentaje_prestamos,
    (v.limite_usuarios = 0 OR v.usuarios_usados < v.limite_usuarios) AS puede_crear_usuario,
    (v.clientes_usados < v.limite_clientes) AS puede_crear_cliente,
    (v.prestamos_usados < v.limite_prestamos) AS puede_crear_prestamo
  FROM vista_organizacion_limites v
  JOIN profiles p ON p.organization_id = v.organization_id
  WHERE p.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

SELECT slug, limite_usuarios FROM planes ORDER BY orden;
