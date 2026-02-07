-- ============================================
-- REPARAR MI USUARIO: Versión SIMPLE y DIRECTA
-- ============================================
-- Este script convierte tu usuario actual en administrador

-- PASO 1: Ver tu estado actual
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id
FROM profiles
WHERE id = auth.uid();

-- PASO 2: Crear organización si no existe
INSERT INTO organizations (id, owner_id, nombre_negocio, descripcion)
SELECT 
  gen_random_uuid(),
  auth.uid(),
  'Mi Organización',
  'Organización principal'
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE owner_id = auth.uid()
);

-- PASO 3: Actualizar perfil a admin con organization_id
UPDATE profiles
SET 
  role = 'admin',
  organization_id = (SELECT id FROM organizations WHERE owner_id = auth.uid()),
  activo = true,
  updated_at = NOW()
WHERE id = auth.uid();

-- PASO 4: Crear/actualizar user_roles
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  auth.uid(),
  (SELECT id FROM organizations WHERE owner_id = auth.uid()),
  'admin'
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET role = 'admin';

-- PASO 5: Verificar resultado
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,  -- ⭐ Debe ser 'admin'
  p.organization_id,  -- ⭐ Debe tener UUID
  o.nombre_negocio as organizacion
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = auth.uid();

-- PASO 6: Verificar user_roles
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- ✅ RESULTADO ESPERADO en PASO 5:
-- role = 'admin'
-- organization_id = [UUID válido]
-- organizacion = 'Mi Organización'
