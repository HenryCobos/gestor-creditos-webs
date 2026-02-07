-- ============================================
-- SOLUCIÓN DEFINITIVA: Función para obtener usuarios de la organización
-- ============================================
-- Similar a get_clientes_segun_rol, pero para usuarios

-- PASO 1: Eliminar función si existe
DROP FUNCTION IF EXISTS public.get_usuarios_organizacion();

-- PASO 2: Crear función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_usuarios_organizacion()
RETURNS SETOF profiles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  -- Obtener role y organization_id del usuario actual
  SELECT p.role, p.organization_id 
  INTO mi_role, mi_org 
  FROM profiles p 
  WHERE p.id = auth.uid();

  -- Si es admin, devolver todos los usuarios de su organización
  IF mi_role = 'admin' AND mi_org IS NOT NULL THEN
    RETURN QUERY 
    SELECT p.* 
    FROM profiles p 
    WHERE p.organization_id = mi_org
    ORDER BY p.created_at DESC;
  ELSE
    -- Si no es admin, solo devolver su propio perfil
    RETURN QUERY 
    SELECT p.* 
    FROM profiles p 
    WHERE p.id = auth.uid();
  END IF;
END;
$$;

-- PASO 3: Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_usuarios_organizacion() TO authenticated;

-- PASO 4: Probar la función
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  activo
FROM get_usuarios_organizacion();

-- ✅ Esta query debe devolver:
-- - Tu usuario (admin)
-- - Todos los usuarios de tu organización (incluido el cobrador recién creado)
