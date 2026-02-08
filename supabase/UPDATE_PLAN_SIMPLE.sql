-- =====================================================
-- ACTUALIZACION MANUAL DE PLAN (VERSION SIMPLE)
-- Usuario: financebusinesscompany@gmail.com
-- Plan: Profesional Mensual (50 clientes + 50 préstamos)
-- =====================================================

-- Si el script complejo no funciona, usa este paso a paso:

-- PASO 1: Obtener el ID del usuario
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'financebusinesscompany@gmail.com';

-- Copia el user_id del resultado anterior

-- PASO 2: Verificar su perfil y organización
SELECT 
  id,
  email,
  organization_id,
  role,
  limite_clientes,
  limite_prestamos
FROM profiles
WHERE email = 'financebusinesscompany@gmail.com';

-- PASO 3: Obtener ID del plan profesional
SELECT 
  id as plan_id,
  nombre,
  slug,
  limite_clientes,
  limite_prestamos,
  precio_mensual
FROM planes
WHERE slug = 'profesional'
  AND activo = true;

-- Copia el plan_id del resultado

-- PASO 4: Si NO tiene organization_id, crear organización
-- (Solo ejecuta si organization_id es NULL en PASO 2)
/*
INSERT INTO organizations (
  owner_id,
  nombre_negocio,
  created_at,
  updated_at
)
SELECT 
  id,
  'Organización de ' || email,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'financebusinesscompany@gmail.com'
RETURNING id;

-- Actualizar perfil con la organización
UPDATE profiles
SET 
  organization_id = 'PEGAR_ORG_ID_AQUI',
  role = 'admin',
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com';
*/

-- PASO 5: Actualizar el plan de la organización
-- Reemplaza los siguientes valores:
-- PLAN_ID_PROFESIONAL = el ID del plan profesional del PASO 3
-- ORG_ID = el organization_id del PASO 2 (o el creado en PASO 4)

UPDATE organizations
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'profesional' LIMIT 1),
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE id = (
  SELECT organization_id 
  FROM profiles 
  WHERE email = 'financebusinesscompany@gmail.com'
);

-- PASO 6: Limpiar límites individuales del perfil
UPDATE profiles
SET 
  limite_clientes = NULL,
  limite_prestamos = NULL,
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com';

-- PASO 7: VERIFICACION FINAL
SELECT 
  p.email,
  p.role,
  o.nombre_negocio,
  pl.nombre as plan_nombre,
  pl.limite_clientes,
  pl.limite_prestamos,
  o.subscription_status,
  o.subscription_start_date,
  o.subscription_end_date,
  p.limite_clientes as limite_individual_clientes,
  p.limite_prestamos as limite_individual_prestamos
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';

-- Debería mostrar:
-- plan_nombre: Profesional
-- limite_clientes: 50
-- limite_prestamos: 50
-- subscription_status: active
-- limite_individual_clientes: NULL
-- limite_individual_prestamos: NULL
