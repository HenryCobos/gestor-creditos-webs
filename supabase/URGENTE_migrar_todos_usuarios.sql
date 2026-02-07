-- =====================================================
-- URGENTE: Migrar TODOS los usuarios existentes
-- Este script asegura que TODOS los +200 usuarios
-- sean migrados correctamente a organizations
-- =====================================================

-- PASO 1: Crear organizaciones para TODOS los usuarios que no tienen una
DO $$
DECLARE
  v_count_antes INT;
  v_count_despues INT;
  v_user RECORD;
  v_org_id UUID;
BEGIN
  -- Contar usuarios sin organización
  SELECT COUNT(*) INTO v_count_antes
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL 
    AND (p.organization_id IS NULL OR p.organization_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id));
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIO DE MIGRACIÓN MASIVA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios sin organización: %', v_count_antes;
  
  -- Migrar cada usuario
  FOR v_user IN 
    SELECT u.id, u.email, p.full_name
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.deleted_at IS NULL
  LOOP
    -- Verificar si ya tiene organización
    SELECT organization_id INTO v_org_id
    FROM profiles
    WHERE id = v_user.id;
    
    IF v_org_id IS NULL THEN
      -- Crear organización si no existe
      INSERT INTO organizations (owner_id, nombre_negocio, descripcion)
      VALUES (
        v_user.id, 
        COALESCE(v_user.full_name, v_user.email, 'Mi Negocio'),
        'Organización creada automáticamente'
      )
      ON CONFLICT (owner_id) DO NOTHING
      RETURNING id INTO v_org_id;
      
      -- Si hubo conflict, obtener el ID existente
      IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id
        FROM organizations
        WHERE owner_id = v_user.id;
      END IF;
      
      -- Actualizar profile con organization_id y role
      UPDATE profiles 
      SET 
        organization_id = v_org_id,
        role = 'admin',
        activo = true
      WHERE id = v_user.id;
      
      -- Crear registro en user_roles
      INSERT INTO user_roles (user_id, organization_id, role)
      VALUES (v_user.id, v_org_id, 'admin')
      ON CONFLICT (user_id, organization_id) DO UPDATE
      SET role = 'admin';
      
      RAISE NOTICE 'Usuario migrado: % (ID: %)', v_user.email, v_user.id;
    ELSE
      -- Ya tiene organización, solo asegurar que tenga role
      UPDATE profiles 
      SET role = 'admin', activo = true
      WHERE id = v_user.id AND role IS NULL;
      
      -- Asegurar que existe en user_roles
      INSERT INTO user_roles (user_id, organization_id, role)
      VALUES (v_user.id, v_org_id, 'admin')
      ON CONFLICT (user_id, organization_id) DO UPDATE
      SET role = 'admin';
      
      RAISE NOTICE 'Usuario ya migrado: %', v_user.email;
    END IF;
  END LOOP;
  
  -- Contar usuarios después de migración
  SELECT COUNT(*) INTO v_count_despues
  FROM profiles
  WHERE organization_id IS NOT NULL AND role IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios migrados: %', v_count_despues;
  RAISE NOTICE '========================================';
END $$;

-- PASO 2: Verificar que TU usuario específico fue migrado
SELECT 
  u.id,
  u.email,
  p.organization_id,
  p.role as role_profile,
  o.nombre_negocio,
  ur.role as role_assigned,
  CASE 
    WHEN p.organization_id IS NOT NULL AND p.role = 'admin' AND ur.role = 'admin' 
    THEN '✅ MIGRADO CORRECTAMENTE'
    ELSE '❌ FALTA MIGRAR'
  END as estado_migracion
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hcobos99@gmail.com';

-- PASO 3: Estadísticas finales
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE p.organization_id IS NOT NULL) as usuarios_con_org,
  COUNT(*) FILTER (WHERE p.role = 'admin') as usuarios_admin,
  COUNT(*) FILTER (WHERE p.organization_id IS NULL) as usuarios_sin_migrar
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.deleted_at IS NULL;

-- PASO 4: Ver primeros 10 usuarios migrados
SELECT 
  u.email,
  p.role,
  o.nombre_negocio,
  p.organization_id IS NOT NULL as tiene_org
FROM auth.users u
JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC
LIMIT 10;
