-- ============================================
-- REPARAR USUARIO: Convertir en administrador
-- ============================================
-- Este script convierte tu usuario actual en administrador

-- PASO 1: Ver tu usuario actual
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE id = auth.uid();

-- PASO 2: Verificar si tienes organización
SELECT 
  id,
  nombre,
  descripcion,
  created_at
FROM organizations
WHERE id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- PASO 3: Crear organización si no existe (para el usuario actual)
DO $$
DECLARE
  mi_org_id UUID;
  mi_email TEXT;
  mi_nombre TEXT;
BEGIN
  -- Obtener datos del usuario actual
  SELECT email, COALESCE(full_name, nombre_completo, email) 
  INTO mi_email, mi_nombre
  FROM profiles 
  WHERE id = auth.uid();

  -- Verificar si ya tiene organización
  SELECT organization_id INTO mi_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Si no tiene organización, crear una nueva
  IF mi_org_id IS NULL THEN
    INSERT INTO organizations (id, nombre, descripcion, activo)
    VALUES (
      gen_random_uuid(),
      'Organización de ' || mi_nombre,
      'Organización principal',
      true
    )
    RETURNING id INTO mi_org_id;

    RAISE NOTICE 'Nueva organización creada: %', mi_org_id;
  END IF;

  -- Actualizar el perfil con role='admin' y organization_id
  UPDATE profiles
  SET 
    role = 'admin',
    organization_id = mi_org_id,
    activo = true,
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Crear/actualizar registro en user_roles
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (auth.uid(), mi_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET 
    role = 'admin',
    created_at = NOW();

  RAISE NOTICE 'Usuario actualizado como administrador';
END $$;

-- PASO 4: Verificar que se actualizó correctamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  p.activo,
  o.nombre as org_nombre
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = auth.uid();

-- PASO 5: Verificar user_roles
SELECT 
  user_id,
  organization_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();

-- PASO 6: Resultado esperado
-- Deberías ver:
-- - role = 'admin'
-- - organization_id con un UUID válido
-- - Un registro en user_roles con role='admin'
