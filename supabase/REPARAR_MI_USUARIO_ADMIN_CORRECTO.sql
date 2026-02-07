-- ============================================
-- REPARAR MI USUARIO: Convertir en administrador (VERSIÓN CORREGIDA)
-- ============================================

-- PASO 1: Ver tu estado actual
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,
  organization_id,
  activo
FROM profiles
WHERE id = auth.uid();

-- PASO 2: Crear organización y actualizar usuario
DO $$
DECLARE
  mi_org_id UUID;
  mi_email TEXT;
  mi_nombre TEXT;
  mi_user_id UUID;
BEGIN
  -- Obtener datos del usuario actual
  SELECT 
    id,
    email, 
    COALESCE(full_name, nombre_completo, email) 
  INTO mi_user_id, mi_email, mi_nombre
  FROM profiles 
  WHERE id = auth.uid();

  RAISE NOTICE 'Usuario actual: % - %', mi_user_id, mi_email;

  -- Verificar si ya tiene organización
  SELECT organization_id INTO mi_org_id
  FROM profiles
  WHERE id = auth.uid();

  RAISE NOTICE 'Organization_id actual: %', mi_org_id;

  -- Si no tiene organización, crear una nueva
  IF mi_org_id IS NULL THEN
    -- Verificar si ya existe una organización con este owner_id
    SELECT id INTO mi_org_id
    FROM organizations
    WHERE owner_id = mi_user_id;

    -- Si no existe, crearla
    IF mi_org_id IS NULL THEN
      INSERT INTO organizations (id, owner_id, nombre_negocio, descripcion)
      VALUES (
        gen_random_uuid(),
        mi_user_id,
        'Organización de ' || mi_nombre,
        'Organización principal'
      )
      RETURNING id INTO mi_org_id;
      
      RAISE NOTICE 'Nueva organización creada: %', mi_org_id;
    ELSE
      RAISE NOTICE 'Organización existente encontrada: %', mi_org_id;
    END IF;
  ELSE
    RAISE NOTICE 'Usuario ya tiene organización: %', mi_org_id;
  END IF;

  -- Actualizar el perfil con role='admin' y organization_id
  UPDATE profiles
  SET 
    role = 'admin',
    organization_id = mi_org_id,
    activo = true,
    updated_at = NOW()
  WHERE id = auth.uid();

  RAISE NOTICE 'Perfil actualizado: role=admin, organization_id=%', mi_org_id;

  -- Crear/actualizar registro en user_roles
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (mi_user_id, mi_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = 'admin';

  RAISE NOTICE 'User_role actualizado';

END $$;

-- PASO 3: Verificar que se actualizó correctamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.nombre_completo,
  p.role,  -- ⭐ Debe ser 'admin'
  p.organization_id,  -- ⭐ Debe tener un UUID
  p.activo,
  o.nombre_negocio as organizacion,
  o.owner_id
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = auth.uid();

-- PASO 4: Verificar user_roles
SELECT 
  user_id,
  organization_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();

-- ✅ RESULTADO ESPERADO:
-- En PASO 3 deberías ver:
-- - role = 'admin'
-- - organization_id con un UUID válido
-- - organizacion = 'Organización de [tu nombre]'
-- - owner_id = tu user_id
--
-- En PASO 4 deberías ver:
-- - Un registro con role = 'admin'
