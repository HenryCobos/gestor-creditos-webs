-- ============================================
-- REPARAR MI USUARIO: Ejecutar PASO A PASO
-- ============================================
-- IMPORTANTE: Ejecuta SOLO UN PASO a la vez y verifica el resultado

-- =====================================
-- PASO 1: Ver tu usuario actual
-- =====================================
-- Copia el ID que aparezca aquí, lo necesitarás para los siguientes pasos
SELECT 
  id,
  email,
  full_name,
  role,
  organization_id
FROM profiles
WHERE id = auth.uid();

-- ⚠️ ANOTA TU USER_ID del resultado anterior
-- Ejemplo: c2680c13-1cc6-4ccb-84cb-9c87ba3ef934


-- =====================================
-- PASO 2: Ver si ya tienes organización
-- =====================================
SELECT * FROM organizations WHERE owner_id = auth.uid();

-- Si devuelve 0 filas, continúa con PASO 3
-- Si devuelve 1 fila, SALTA al PASO 4


-- =====================================
-- PASO 3: Crear organización (SOLO si PASO 2 dio 0 filas)
-- =====================================
-- ⚠️ REEMPLAZA 'TU_USER_ID_AQUI' con el ID del PASO 1

INSERT INTO organizations (id, owner_id, nombre_negocio, descripcion)
VALUES (
  gen_random_uuid(),
  'TU_USER_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZA ESTO
  'Mi Organización',
  'Organización principal'
);

-- Verificar que se creó:
SELECT * FROM organizations WHERE owner_id = 'TU_USER_ID_AQUI'::uuid;


-- =====================================
-- PASO 4: Actualizar tu perfil a admin
-- =====================================
-- ⚠️ REEMPLAZA 'TU_USER_ID_AQUI' con el ID del PASO 1

UPDATE profiles
SET 
  role = 'admin',
  organization_id = (SELECT id FROM organizations WHERE owner_id = 'TU_USER_ID_AQUI'::uuid),
  activo = true,
  updated_at = NOW()
WHERE id = 'TU_USER_ID_AQUI'::uuid;

-- Verificar:
SELECT 
  id,
  email,
  role,
  organization_id,
  activo
FROM profiles
WHERE id = 'TU_USER_ID_AQUI'::uuid;


-- =====================================
-- PASO 5: Crear user_role
-- =====================================
-- ⚠️ REEMPLAZA 'TU_USER_ID_AQUI' con el ID del PASO 1

INSERT INTO user_roles (user_id, organization_id, role)
VALUES (
  'TU_USER_ID_AQUI'::uuid,
  (SELECT id FROM organizations WHERE owner_id = 'TU_USER_ID_AQUI'::uuid),
  'admin'
)
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET role = 'admin';

-- Verificar:
SELECT * FROM user_roles WHERE user_id = 'TU_USER_ID_AQUI'::uuid;


-- =====================================
-- PASO 6: VERIFICACIÓN FINAL
-- =====================================
-- ⚠️ REEMPLAZA 'TU_USER_ID_AQUI' con el ID del PASO 1

SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,  -- ⭐ Debe ser 'admin'
  p.organization_id,  -- ⭐ Debe tener UUID
  o.nombre_negocio as organizacion
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = 'TU_USER_ID_AQUI'::uuid;


-- ✅ RESULTADO ESPERADO:
-- role = 'admin'
-- organization_id = [UUID válido]
-- organizacion = 'Mi Organización'
