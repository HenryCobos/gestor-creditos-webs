-- =====================================================
-- FIX: Crear organización y asignar plan
-- Usuario: financebusinesscompany@gmail.com
-- =====================================================

-- PASO 1: Crear la organización
INSERT INTO organizations (
  owner_id,
  nombre_negocio,
  created_at,
  updated_at
)
SELECT 
  id,
  'Finance Business Company',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'financebusinesscompany@gmail.com'
RETURNING id, owner_id, nombre_negocio;

-- ⚠️ COPIA el "id" que aparece en el resultado anterior

-- PASO 2: Actualizar el perfil con la organización
-- Reemplaza 'ORG_ID_AQUI' con el ID que copiaste del PASO 1
UPDATE profiles
SET 
  organization_id = (
    SELECT id 
    FROM organizations 
    WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'financebusinesscompany@gmail.com')
    LIMIT 1
  ),
  role = 'admin',
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com'
RETURNING id, email, organization_id, role;

-- PASO 3: Crear entrada en user_roles
INSERT INTO user_roles (
  user_id,
  organization_id,
  role,
  created_at
)
SELECT 
  p.id,
  p.organization_id,
  'admin',
  NOW()
FROM profiles p
WHERE p.email = 'financebusinesscompany@gmail.com'
  AND p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING
RETURNING user_id, organization_id, role;

-- PASO 4: Asignar el plan profesional a la organización
UPDATE organizations
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'profesional' AND activo = true LIMIT 1),
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'financebusinesscompany@gmail.com')
RETURNING id, plan_id, subscription_status, subscription_start_date, subscription_end_date;

-- PASO 5: Limpiar límites individuales
UPDATE profiles
SET 
  limite_clientes = NULL,
  limite_prestamos = NULL,
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com'
RETURNING id, email, limite_clientes, limite_prestamos;

-- PASO 6: VERIFICACION FINAL
SELECT 
  '✅ RESULTADO FINAL' as "Estado";

SELECT
  p.email as "📧 Email",
  p.role as "👤 Rol",
  o.nombre_negocio as "🏢 Negocio",
  pl.nombre as "📦 Plan",
  pl.limite_clientes as "👥 Límite Clientes",
  pl.limite_prestamos as "💰 Límite Préstamos",
  o.subscription_status as "✅ Estado",
  TO_CHAR(o.subscription_start_date, 'DD/MM/YYYY') as "📅 Inicio",
  TO_CHAR(o.subscription_end_date, 'DD/MM/YYYY') as "📅 Fin"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';
