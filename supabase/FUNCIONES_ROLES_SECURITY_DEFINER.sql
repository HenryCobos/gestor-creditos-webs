-- =====================================================
-- FUNCIONES CON SECURITY DEFINER PARA ROLES
-- =====================================================
-- Estas funciones permiten a cobradores y admins
-- acceder a datos de su organización sin RLS complejo
-- =====================================================

-- =====================================================
-- 1. Función: Obtener clientes según rol del usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_clientes_segun_rol()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nombre TEXT,
  telefono TEXT,
  direccion TEXT,
  dni TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
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
    WHERE p.organization_id = mi_org;
  
  -- Si es cobrador, devolver solo clientes de sus rutas
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    JOIN ruta_clientes rc ON rc.cliente_id = c.id
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE r.cobrador_id = auth.uid();
  
  -- Si no tiene rol, devolver solo sus propios clientes
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    WHERE c.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- 2. Función: Obtener préstamos según rol del usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_prestamos_segun_rol()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  cliente_id UUID,
  monto_prestado DECIMAL(10,2),
  tasa_interes DECIMAL(5,2),
  frecuencia_pago TEXT,
  numero_cuotas INTEGER,
  fecha_inicio DATE,
  fecha_primer_pago DATE,
  estado TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ruta_id UUID
) 
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
    WHERE p.organization_id = mi_org;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid();
  
  ELSE
    RETURN QUERY
    SELECT pr.*
    FROM prestamos pr
    WHERE pr.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- 3. Función: Obtener cuotas según rol del usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cuotas_segun_rol()
RETURNS TABLE (
  id UUID,
  prestamo_id UUID,
  numero_cuota INTEGER,
  monto_cuota DECIMAL(10,2),
  fecha_vencimiento DATE,
  estado TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
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
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid();
  
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM cuotas c
    JOIN prestamos pr ON pr.id = c.prestamo_id
    WHERE pr.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- 4. Función: Obtener pagos según rol del usuario
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_pagos_segun_rol()
RETURNS TABLE (
  id UUID,
  prestamo_id UUID,
  cuota_id UUID,
  monto_pagado DECIMAL(10,2),
  fecha_pago TIMESTAMPTZ,
  metodo_pago TEXT,
  created_at TIMESTAMPTZ,
  registrado_por UUID
) 
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
    SELECT pg.*
    FROM pagos pg
    JOIN prestamos pr ON pr.id = pg.prestamo_id
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT pg.*
    FROM pagos pg
    JOIN prestamos pr ON pr.id = pg.prestamo_id
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid();
  
  ELSE
    RETURN QUERY
    SELECT pg.*
    FROM pagos pg
    JOIN prestamos pr ON pr.id = pg.prestamo_id
    WHERE pr.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- 5. Función: Verificar si usuario puede acceder a un cliente
-- =====================================================
CREATE OR REPLACE FUNCTION public.puede_acceder_cliente(cliente_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
  cliente_org UUID;
BEGIN
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Obtener organización del cliente
  SELECT p.organization_id INTO cliente_org
  FROM clientes c
  JOIN profiles p ON p.id = c.user_id
  WHERE c.id = cliente_id_param;

  -- Si es propietario directo
  IF EXISTS (SELECT 1 FROM clientes WHERE id = cliente_id_param AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Si es admin de la misma org
  IF mi_role = 'admin' AND mi_org = cliente_org THEN
    RETURN TRUE;
  END IF;

  -- Si es cobrador y el cliente está en su ruta
  IF mi_role = 'cobrador' AND EXISTS (
    SELECT 1 FROM ruta_clientes rc
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE rc.cliente_id = cliente_id_param
      AND r.cobrador_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- =====================================================
-- 6. Función: Verificar si usuario puede acceder a un préstamo
-- =====================================================
CREATE OR REPLACE FUNCTION public.puede_acceder_prestamo(prestamo_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
  prestamo_org UUID;
  prestamo_ruta UUID;
BEGIN
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Obtener organización y ruta del préstamo
  SELECT p.organization_id, pr.ruta_id INTO prestamo_org, prestamo_ruta
  FROM prestamos pr
  JOIN profiles p ON p.id = pr.user_id
  WHERE pr.id = prestamo_id_param;

  -- Si es propietario directo
  IF EXISTS (SELECT 1 FROM prestamos WHERE id = prestamo_id_param AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Si es admin de la misma org
  IF mi_role = 'admin' AND mi_org = prestamo_org THEN
    RETURN TRUE;
  END IF;

  -- Si es cobrador y el préstamo está en su ruta
  IF mi_role = 'cobrador' AND prestamo_ruta IS NOT NULL AND EXISTS (
    SELECT 1 FROM rutas r
    WHERE r.id = prestamo_ruta
      AND r.cobrador_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT '✅ Funciones con SECURITY DEFINER creadas correctamente' as resultado;

-- Listar funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%_segun_rol'
  OR routine_name LIKE 'puede_acceder_%'
ORDER BY routine_name;
