-- ============================================
-- SISTEMA DE LÍMITES A NIVEL DE ORGANIZACIÓN
-- ============================================
-- Este script implementa planes compartidos para toda la organización

-- ========================================
-- FASE 1: ESTRUCTURA DE BASE DE DATOS
-- ========================================

-- 1.1 Agregar plan_id a organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES planes(id),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- 1.2 Migrar planes existentes de admins a organizaciones
UPDATE organizations o
SET plan_id = p.plan_id,
    subscription_status = p.subscription_status,
    subscription_start_date = p.subscription_start_date,
    subscription_end_date = p.subscription_end_date,
    paypal_subscription_id = p.paypal_subscription_id
FROM profiles p
WHERE p.id = o.owner_id
  AND p.plan_id IS NOT NULL
  AND o.plan_id IS NULL;

-- 1.3 Agregar límites opcionales por cobrador
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS limite_clientes INTEGER,
ADD COLUMN IF NOT EXISTS limite_prestamos INTEGER;

COMMENT ON COLUMN profiles.limite_clientes IS 'Límite específico de clientes asignado por el admin al cobrador (opcional)';
COMMENT ON COLUMN profiles.limite_prestamos IS 'Límite específico de préstamos asignado por el admin al cobrador (opcional)';

-- ========================================
-- FASE 2: VISTAS Y FUNCIONES
-- ========================================

-- 2.1 Vista: Límites y uso de la organización
CREATE OR REPLACE VIEW vista_organizacion_limites AS
SELECT 
  o.id as organization_id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.max_clientes as limite_clientes,
  pl.max_prestamos as limite_prestamos,
  COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL) as clientes_usados,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL) as prestamos_usados,
  (pl.max_clientes - COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL)) as clientes_disponibles,
  (pl.max_prestamos - COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL)) as prestamos_disponibles,
  ROUND(
    (COUNT(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL)::NUMERIC / NULLIF(pl.max_clientes, 0)) * 100, 
    2
  ) as porcentaje_clientes,
  ROUND(
    (COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL)::NUMERIC / NULLIF(pl.max_prestamos, 0)) * 100, 
    2
  ) as porcentaje_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
GROUP BY o.id, o.nombre_negocio, o.plan_id, pl.id, pl.nombre, pl.slug, pl.max_clientes, pl.max_prestamos;

-- 2.2 Vista: Uso por usuario dentro de la organización
CREATE OR REPLACE VIEW vista_uso_por_usuario AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  p.limite_clientes,
  p.limite_prestamos,
  COUNT(DISTINCT c.id) as clientes_usados,
  COUNT(DISTINCT pr.id) as prestamos_usados,
  CASE 
    WHEN p.limite_clientes IS NOT NULL 
    THEN (p.limite_clientes - COUNT(DISTINCT c.id))
    ELSE NULL 
  END as clientes_disponibles,
  CASE 
    WHEN p.limite_prestamos IS NOT NULL 
    THEN (p.limite_prestamos - COUNT(DISTINCT pr.id))
    ELSE NULL 
  END as prestamos_disponibles
FROM profiles p
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
WHERE p.organization_id IS NOT NULL
GROUP BY p.id, p.email, p.full_name, p.role, p.organization_id, p.limite_clientes, p.limite_prestamos;

-- 2.3 Función: Validar si se puede crear cliente
CREATE OR REPLACE FUNCTION puede_crear_cliente(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_limite_org INTEGER;
  v_usado_org INTEGER;
  v_limite_usuario INTEGER;
  v_usado_usuario INTEGER;
BEGIN
  -- Obtener organization_id y límite del usuario
  SELECT organization_id, limite_clientes
  INTO v_organization_id, v_limite_usuario
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_organization_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar límite de organización
  SELECT 
    pl.max_clientes,
    COUNT(DISTINCT c.id)
  INTO v_limite_org, v_usado_org
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN clientes c ON c.user_id = p.id
  WHERE o.id = v_organization_id
  GROUP BY pl.max_clientes;
  
  -- Si excede límite de organización
  IF v_usado_org >= v_limite_org THEN
    RETURN FALSE;
  END IF;
  
  -- Si el usuario tiene límite específico, verificarlo
  IF v_limite_usuario IS NOT NULL THEN
    SELECT COUNT(*) 
    INTO v_usado_usuario
    FROM clientes 
    WHERE user_id = p_user_id;
    
    IF v_usado_usuario >= v_limite_usuario THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2.4 Función: Validar si se puede crear préstamo
CREATE OR REPLACE FUNCTION puede_crear_prestamo(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_limite_org INTEGER;
  v_usado_org INTEGER;
  v_limite_usuario INTEGER;
  v_usado_usuario INTEGER;
BEGIN
  -- Obtener organization_id y límite del usuario
  SELECT organization_id, limite_prestamos
  INTO v_organization_id, v_limite_usuario
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_organization_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar límite de organización
  SELECT 
    pl.max_prestamos,
    COUNT(DISTINCT pr.id)
  INTO v_limite_org, v_usado_org
  FROM organizations o
  JOIN planes pl ON pl.id = o.plan_id
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN prestamos pr ON pr.user_id = p.id
  WHERE o.id = v_organization_id
  GROUP BY pl.max_prestamos;
  
  -- Si excede límite de organización
  IF v_usado_org >= v_limite_org THEN
    RETURN FALSE;
  END IF;
  
  -- Si el usuario tiene límite específico, verificarlo
  IF v_limite_usuario IS NOT NULL THEN
    SELECT COUNT(*) 
    INTO v_usado_usuario
    FROM prestamos 
    WHERE user_id = p_user_id;
    
    IF v_usado_usuario >= v_limite_usuario THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2.5 Función RPC: Obtener límites de la organización (para frontend)
CREATE OR REPLACE FUNCTION get_limites_organizacion()
RETURNS TABLE (
  organization_id UUID,
  plan_nombre TEXT,
  plan_slug TEXT,
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  clientes_usados BIGINT,
  prestamos_usados BIGINT,
  clientes_disponibles BIGINT,
  prestamos_disponibles BIGINT,
  porcentaje_clientes NUMERIC,
  porcentaje_prestamos NUMERIC,
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
    v.clientes_usados,
    v.prestamos_usados,
    v.clientes_disponibles,
    v.prestamos_disponibles,
    v.porcentaje_clientes,
    v.porcentaje_prestamos,
    (v.clientes_usados < v.limite_clientes) as puede_crear_cliente,
    (v.prestamos_usados < v.limite_prestamos) as puede_crear_prestamo
  FROM vista_organizacion_limites v
  JOIN profiles p ON p.organization_id = v.organization_id
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_limites_organizacion() TO authenticated;

-- 2.6 Función RPC: Obtener uso por usuario (para admin)
CREATE OR REPLACE FUNCTION get_uso_por_usuario()
RETURNS SETOF vista_uso_por_usuario AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
BEGIN
  -- Obtener rol y organización del usuario actual
  SELECT role, organization_id INTO v_role, v_org_id
  FROM profiles
  WHERE id = auth.uid();
  
  -- Solo admins pueden ver esto
  IF v_role != 'admin' THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT * FROM vista_uso_por_usuario
  WHERE organization_id = v_org_id
  ORDER BY role DESC, email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_uso_por_usuario() TO authenticated;

-- ========================================
-- FASE 3: VERIFICACIÓN
-- ========================================

-- Verificar migración
SELECT 
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan,
  COUNT(DISTINCT p.id) as usuarios,
  COUNT(DISTINCT c.id) as clientes,
  COUNT(DISTINCT pr.id) as prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
GROUP BY o.id, o.nombre_negocio, o.plan_id, pl.nombre;

-- ✅ RESULTADO ESPERADO:
-- Todas las organizaciones deben tener plan_id asignado
-- Los contadores deben sumar todos los usuarios de la organización
