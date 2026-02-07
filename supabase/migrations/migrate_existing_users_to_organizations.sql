-- =====================================================
-- SCRIPT: Migrar Usuarios Existentes a Organizations
-- FECHA: 2026-02-07
-- DESCRIPCIÓN: Convierte automáticamente todos los usuarios
--              existentes en administradores de su propia
--              organización, garantizando 100% compatibilidad
-- =====================================================
-- EJECUTAR DESPUÉS DE: add_roles_rutas_sistema.sql
-- =====================================================

-- =====================================================
-- PASO 1: Crear organizaciones para usuarios existentes
-- =====================================================

-- Crear una organización para cada usuario que no tiene una
INSERT INTO public.organizations (owner_id, nombre_negocio, descripcion, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(p.full_name, p.email, 'Mi Negocio') AS nombre_negocio,
  'Organización creada automáticamente durante la migración' AS descripcion,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.owner_id = u.id
)
AND u.deleted_at IS NULL; -- Solo usuarios activos

-- =====================================================
-- PASO 2: Asignar rol 'admin' a todos los usuarios existentes
-- =====================================================

-- Cada usuario se convierte en admin de su propia organización
INSERT INTO public.user_roles (user_id, organization_id, role, created_at, updated_at)
SELECT 
  u.id AS user_id,
  o.id AS organization_id,
  'admin' AS role,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users u
JOIN public.organizations o ON o.owner_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.organization_id = o.id
)
AND u.deleted_at IS NULL;

-- =====================================================
-- PASO 3: Actualizar tabla profiles con organization_id
-- =====================================================

-- Vincular cada profile con su organización
UPDATE public.profiles p
SET 
  organization_id = o.id,
  role = 'admin',
  activo = true,
  updated_at = NOW()
FROM public.organizations o
WHERE o.owner_id = p.id
AND p.organization_id IS NULL;

-- =====================================================
-- PASO 4: Verificación de migración
-- =====================================================

-- Contar usuarios migrados exitosamente
DO $$
DECLARE
  total_users INT;
  migrated_users INT;
  migrated_orgs INT;
BEGIN
  -- Total de usuarios activos
  SELECT COUNT(*) INTO total_users 
  FROM auth.users 
  WHERE deleted_at IS NULL;
  
  -- Usuarios con organization_id
  SELECT COUNT(*) INTO migrated_users 
  FROM public.profiles 
  WHERE organization_id IS NOT NULL;
  
  -- Organizaciones creadas
  SELECT COUNT(*) INTO migrated_orgs 
  FROM public.organizations;
  
  -- Mostrar resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPORTE DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios activos: %', total_users;
  RAISE NOTICE 'Usuarios migrados: %', migrated_users;
  RAISE NOTICE 'Organizaciones creadas: %', migrated_orgs;
  RAISE NOTICE '========================================';
  
  IF total_users = migrated_users THEN
    RAISE NOTICE '✅ Migración exitosa: Todos los usuarios fueron migrados';
  ELSE
    RAISE WARNING '⚠️  Algunos usuarios no fueron migrados: % de %', 
      (total_users - migrated_users), total_users;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- PASO 5: Crear vista auxiliar para verificar roles
-- =====================================================

-- Vista que muestra todos los usuarios con sus roles
CREATE OR REPLACE VIEW public.v_users_with_roles AS
SELECT 
  u.id AS user_id,
  u.email,
  p.nombre_completo,
  p.role AS role_profile,
  ur.role AS role_assigned,
  o.id AS organization_id,
  o.nombre_negocio,
  o.owner_id = u.id AS is_owner,
  p.activo,
  p.ultimo_acceso,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE u.deleted_at IS NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- PASO 6: Función helper para verificar estado del usuario
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_status(user_id_param UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  has_organization BOOLEAN,
  is_admin BOOLEAN,
  organization_name TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    p.organization_id IS NOT NULL AS has_organization,
    ur.role = 'admin' AS is_admin,
    o.nombre_negocio,
    ur.role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.organizations o ON o.id = p.organization_id
  WHERE u.id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 7: Comentarios finales
-- =====================================================

COMMENT ON VIEW public.v_users_with_roles IS 'Vista para verificar roles y organizaciones de usuarios';
COMMENT ON FUNCTION public.get_user_status(UUID) IS 'Obtiene el estado de organización y rol de un usuario';

-- =====================================================
-- FIN DE SCRIPT DE MIGRACIÓN
-- =====================================================

-- Para verificar manualmente después de ejecutar:
-- SELECT * FROM public.v_users_with_roles;
-- SELECT * FROM public.get_user_status('USER_ID_AQUI');
