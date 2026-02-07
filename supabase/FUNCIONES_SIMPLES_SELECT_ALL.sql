-- =====================================================
-- FUNCIONES SIMPLIFICADAS CON SELECT *
-- =====================================================
-- Usar SELECT * para incluir automáticamente todas las columnas

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS public.get_clientes_segun_rol() CASCADE;
DROP FUNCTION IF EXISTS public.get_prestamos_segun_rol() CASCADE;
DROP FUNCTION IF EXISTS public.get_cuotas_segun_rol() CASCADE;

-- =====================================================
-- 1. get_clientes_segun_rol()
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_clientes_segun_rol()
RETURNS SETOF clientes
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  -- Obtener rol y organización del usuario actual
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Si es admin, devolver todos los clientes de la organización
  IF mi_role = 'admin' THEN
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = mi_org
    ORDER BY c.created_at DESC;
  
  -- Si es cobrador, devolver solo clientes de sus rutas
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    JOIN ruta_clientes rc ON rc.cliente_id = c.id
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE r.cobrador_id = auth.uid()
    ORDER BY c.created_at DESC;
  
  -- Si no tiene rol, devolver solo sus propios clientes
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
  END IF;
END;
$$;

-- =====================================================
-- 2. get_prestamos_segun_rol()
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_prestamos_segun_rol()
RETURNS SETOF prestamos
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  IF mi_role = 'admin' THEN
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org
    ORDER BY pr.created_at DESC;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    WHERE pr.ruta_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM rutas r
        WHERE r.id = pr.ruta_id
          AND r.cobrador_id = auth.uid()
      )
    ORDER BY pr.created_at DESC;
  
  ELSE
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    WHERE pr.user_id = auth.uid()
    ORDER BY pr.created_at DESC;
  END IF;
END;
$$;

-- =====================================================
-- 3. get_cuotas_segun_rol()
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cuotas_segun_rol()
RETURNS SETOF cuotas
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  IF mi_role = 'admin' THEN
    RETURN QUERY
    SELECT c.*
    FROM cuotas c
    JOIN prestamos pr ON pr.id = c.prestamo_id
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT c.*
    FROM cuotas c
    JOIN prestamos pr ON pr.id = c.prestamo_id
    WHERE pr.ruta_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM rutas r
        WHERE r.id = pr.ruta_id
          AND r.cobrador_id = auth.uid()
      );
  
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM cuotas c
    WHERE c.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT '✅ Funciones creadas exitosamente' as resultado;

-- Test rápido
SELECT 
  'Clientes:' as test,
  COUNT(*) as cantidad
FROM get_clientes_segun_rol()
UNION ALL
SELECT 
  'Préstamos:' as test,
  COUNT(*) as cantidad
FROM get_prestamos_segun_rol()
UNION ALL
SELECT 
  'Cuotas:' as test,
  COUNT(*) as cantidad
FROM get_cuotas_segun_rol();
