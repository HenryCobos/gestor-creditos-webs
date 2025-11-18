-- MEJORAR LA FUNCIÓN get_user_plan_limits PARA MANEJAR USUARIOS SIN PLAN
-- Este script mejora la función para que automáticamente asigne el plan gratuito si no existe

-- Reemplazar la función get_user_plan_limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_uuid UUID)
RETURNS TABLE (
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  limite_usuarios INTEGER,
  plan_nombre VARCHAR,
  caracteristicas JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  free_plan_id UUID;
  profile_exists BOOLEAN;
  plan_assigned BOOLEAN;
BEGIN
  -- Verificar si el perfil existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_uuid) INTO profile_exists;
  
  -- Si no existe el perfil, retornar los límites del plan gratuito sin crear el perfil
  IF NOT profile_exists THEN
    RETURN QUERY
    SELECT 
      p.limite_clientes,
      p.limite_prestamos,
      p.limite_usuarios,
      p.nombre,
      p.caracteristicas
    FROM planes p
    WHERE p.slug = 'free'
    LIMIT 1;
    RETURN;
  END IF;
  
  -- Verificar si el perfil tiene plan asignado
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = user_uuid AND plan_id IS NOT NULL
  ) INTO plan_assigned;
  
  -- Si no tiene plan asignado, asignarle el plan gratuito
  IF NOT plan_assigned THEN
    -- Obtener el ID del plan gratuito
    SELECT id INTO free_plan_id FROM planes WHERE slug = 'free' LIMIT 1;
    
    -- Actualizar el perfil con el plan gratuito
    UPDATE profiles 
    SET 
      plan_id = free_plan_id,
      subscription_status = 'active'
    WHERE id = user_uuid;
  END IF;
  
  -- Retornar los límites del plan del usuario
  RETURN QUERY
  SELECT 
    p.limite_clientes,
    p.limite_prestamos,
    p.limite_usuarios,
    p.nombre,
    p.caracteristicas
  FROM profiles prof
  JOIN planes p ON prof.plan_id = p.id
  WHERE prof.id = user_uuid;
  
  -- Si por alguna razón aún no hay resultado, retornar el plan gratuito
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.limite_clientes,
      p.limite_prestamos,
      p.limite_usuarios,
      p.nombre,
      p.caracteristicas
    FROM planes p
    WHERE p.slug = 'free'
    LIMIT 1;
  END IF;
END;
$$;

-- Mejorar también can_add_cliente para manejar usuarios sin plan
CREATE OR REPLACE FUNCTION can_add_cliente(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan (con fallback a plan gratuito)
  SELECT COALESCE(
    (SELECT p.limite_clientes
     FROM profiles prof
     JOIN planes p ON prof.plan_id = p.id
     WHERE prof.id = user_uuid),
    (SELECT limite_clientes FROM planes WHERE slug = 'free' LIMIT 1)
  ) INTO limite;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar clientes actuales
  SELECT COUNT(*) INTO actual
  FROM clientes
  WHERE user_id = user_uuid;
  
  RETURN actual < limite;
END;
$$;

-- Mejorar can_add_prestamo para manejar usuarios sin plan
CREATE OR REPLACE FUNCTION can_add_prestamo(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan (con fallback a plan gratuito)
  SELECT COALESCE(
    (SELECT p.limite_prestamos
     FROM profiles prof
     JOIN planes p ON prof.plan_id = p.id
     WHERE prof.id = user_uuid),
    (SELECT limite_prestamos FROM planes WHERE slug = 'free' LIMIT 1)
  ) INTO limite;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar préstamos activos
  SELECT COUNT(*) INTO actual
  FROM prestamos
  WHERE user_id = user_uuid AND estado = 'activo';
  
  RETURN actual < limite;
END;
$$;

-- Verificar que la función funciona correctamente
-- Puedes probar ejecutando (reemplaza 'TU_USER_ID' con un ID real):
-- SELECT * FROM get_user_plan_limits('TU_USER_ID');

