-- ============================================
-- Límites de usuarios por plan + enforcement
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Actualizar límites en tabla planes
UPDATE planes SET
  limite_usuarios = 2,
  caracteristicas = caracteristicas || '{"multi_usuario": true}'::jsonb
WHERE slug = 'free';

UPDATE planes SET
  limite_usuarios = 3,
  caracteristicas = caracteristicas || '{"multi_usuario": true}'::jsonb
WHERE slug = 'pro';

UPDATE planes SET limite_usuarios = 5 WHERE slug = 'business';
-- enterprise: limite_usuarios = 0 (ilimitado)

-- 2. Recrear vista con conteo de usuarios
CREATE OR REPLACE VIEW vista_organizacion_limites AS
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

-- 3. Función: validar si se puede crear usuario
CREATE OR REPLACE FUNCTION puede_crear_usuario(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_limite_usuarios INTEGER;
  v_usuarios_usados BIGINT;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM profiles
  WHERE id = p_user_id;

  IF v_organization_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT
    pl.limite_usuarios,
    COUNT(DISTINCT p.id)
  INTO v_limite_usuarios, v_usuarios_usados
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  LEFT JOIN profiles p ON p.organization_id = o.id
  WHERE o.id = v_organization_id
  GROUP BY pl.limite_usuarios;

  -- 0 = ilimitado (Enterprise)
  IF v_limite_usuarios = 0 THEN
    RETURN TRUE;
  END IF;

  RETURN v_usuarios_usados < v_limite_usuarios;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION puede_crear_usuario(UUID) TO authenticated;

-- 4. RPC: get_limites_organizacion con usuarios
-- PostgreSQL no permite cambiar columnas de retorno con CREATE OR REPLACE → hay que DROP primero
DROP FUNCTION IF EXISTS get_limites_organizacion();

CREATE FUNCTION get_limites_organizacion()
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_limites_organizacion() TO authenticated;

-- 5. Verificación
SELECT slug, limite_usuarios, caracteristicas->>'multi_usuario' AS multi_usuario
FROM planes
ORDER BY orden;
