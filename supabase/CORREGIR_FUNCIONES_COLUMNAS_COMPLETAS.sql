-- =====================================================
-- CORREGIR FUNCIONES: Incluir TODAS las columnas
-- =====================================================

-- =====================================================
-- 1. get_clientes_segun_rol() - TODAS las columnas
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_clientes_segun_rol()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nombre TEXT,
  dni TEXT,
  telefono TEXT,
  direccion TEXT,
  cuenta_bancaria TEXT,
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
    SELECT 
      c.id,
      c.user_id,
      c.nombre,
      c.dni,
      c.telefono,
      c.direccion,
      c.cuenta_bancaria,
      c.created_at,
      c.updated_at
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = mi_org
    ORDER BY c.created_at DESC;
  
  -- Si es cobrador, devolver solo clientes de sus rutas
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.user_id,
      c.nombre,
      c.dni,
      c.telefono,
      c.direccion,
      c.cuenta_bancaria,
      c.created_at,
      c.updated_at
    FROM clientes c
    JOIN ruta_clientes rc ON rc.cliente_id = c.id
    JOIN rutas r ON r.id = rc.ruta_id
    WHERE r.cobrador_id = auth.uid()
    ORDER BY c.created_at DESC;
  
  -- Si no tiene rol, devolver solo sus propios clientes
  ELSE
    RETURN QUERY
    SELECT 
      c.id,
      c.user_id,
      c.nombre,
      c.dni,
      c.telefono,
      c.direccion,
      c.cuenta_bancaria,
      c.created_at,
      c.updated_at
    FROM clientes c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
  END IF;
END;
$$;

-- =====================================================
-- 2. get_prestamos_segun_rol() - TODAS las columnas
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_prestamos_segun_rol()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  cliente_id UUID,
  monto_prestado DECIMAL(10,2),
  interes_porcentaje DECIMAL(5,2),
  numero_cuotas INTEGER,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT,
  monto_total DECIMAL(10,2),
  frecuencia_pago TEXT,
  tipo_interes TEXT,
  tipo_prestamo TEXT,
  tipo_calculo_interes TEXT,
  dias_gracia INTEGER,
  excluir_domingos BOOLEAN,
  precio_contado DECIMAL(10,2),
  enganche DECIMAL(10,2),
  cargos_adicionales DECIMAL(10,2),
  descripcion_producto TEXT,
  producto_id UUID,
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
    SELECT 
      pr.id,
      pr.user_id,
      pr.cliente_id,
      pr.monto_prestado,
      pr.interes_porcentaje,
      pr.numero_cuotas,
      pr.fecha_inicio,
      pr.fecha_fin,
      pr.estado,
      pr.monto_total,
      pr.frecuencia_pago,
      pr.tipo_interes,
      pr.tipo_prestamo,
      pr.tipo_calculo_interes,
      pr.dias_gracia,
      pr.excluir_domingos,
      pr.precio_contado,
      pr.enganche,
      pr.cargos_adicionales,
      pr.descripcion_producto,
      pr.producto_id,
      pr.created_at,
      pr.updated_at,
      pr.ruta_id
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org
    ORDER BY pr.created_at DESC;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT 
      pr.id,
      pr.user_id,
      pr.cliente_id,
      pr.monto_prestado,
      pr.interes_porcentaje,
      pr.numero_cuotas,
      pr.fecha_inicio,
      pr.fecha_fin,
      pr.estado,
      pr.monto_total,
      pr.frecuencia_pago,
      pr.tipo_interes,
      pr.tipo_prestamo,
      pr.tipo_calculo_interes,
      pr.dias_gracia,
      pr.excluir_domingos,
      pr.precio_contado,
      pr.enganche,
      pr.cargos_adicionales,
      pr.descripcion_producto,
      pr.producto_id,
      pr.created_at,
      pr.updated_at,
      pr.ruta_id
    FROM prestamos pr
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid()
    ORDER BY pr.created_at DESC;
  
  ELSE
    RETURN QUERY
    SELECT 
      pr.id,
      pr.user_id,
      pr.cliente_id,
      pr.monto_prestado,
      pr.interes_porcentaje,
      pr.numero_cuotas,
      pr.fecha_inicio,
      pr.fecha_fin,
      pr.estado,
      pr.monto_total,
      pr.frecuencia_pago,
      pr.tipo_interes,
      pr.tipo_prestamo,
      pr.tipo_calculo_interes,
      pr.dias_gracia,
      pr.excluir_domingos,
      pr.precio_contado,
      pr.enganche,
      pr.cargos_adicionales,
      pr.descripcion_producto,
      pr.producto_id,
      pr.created_at,
      pr.updated_at,
      pr.ruta_id
    FROM prestamos pr
    WHERE pr.user_id = auth.uid()
    ORDER BY pr.created_at DESC;
  END IF;
END;
$$;

-- =====================================================
-- 3. get_cuotas_segun_rol() - TODAS las columnas
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_cuotas_segun_rol()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  prestamo_id UUID,
  numero_cuota INTEGER,
  monto_cuota DECIMAL(10,2),
  fecha_vencimiento DATE,
  fecha_pago DATE,
  estado TEXT,
  monto_pagado DECIMAL(10,2),
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
    SELECT 
      c.id,
      c.user_id,
      c.prestamo_id,
      c.numero_cuota,
      c.monto_cuota,
      c.fecha_vencimiento,
      c.fecha_pago,
      c.estado,
      c.monto_pagado,
      c.created_at,
      c.updated_at
    FROM cuotas c
    JOIN prestamos pr ON pr.id = c.prestamo_id
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = mi_org;
  
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.user_id,
      c.prestamo_id,
      c.numero_cuota,
      c.monto_cuota,
      c.fecha_vencimiento,
      c.fecha_pago,
      c.estado,
      c.monto_pagado,
      c.created_at,
      c.updated_at
    FROM cuotas c
    JOIN prestamos pr ON pr.id = c.prestamo_id
    JOIN rutas r ON r.id = pr.ruta_id
    WHERE r.cobrador_id = auth.uid();
  
  ELSE
    RETURN QUERY
    SELECT 
      c.id,
      c.user_id,
      c.prestamo_id,
      c.numero_cuota,
      c.monto_cuota,
      c.fecha_vencimiento,
      c.fecha_pago,
      c.estado,
      c.monto_pagado,
      c.created_at,
      c.updated_at
    FROM cuotas c
    WHERE c.user_id = auth.uid();
  END IF;
END;
$$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT '✅ Funciones actualizadas con columnas completas' as resultado;

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
