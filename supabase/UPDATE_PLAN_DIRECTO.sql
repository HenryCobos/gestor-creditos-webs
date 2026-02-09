-- =====================================================
-- ACTUALIZACION DIRECTA DE PLAN (SUPER SIMPLE)
-- Usuario: financebusinesscompany@gmail.com
-- =====================================================

-- Este script es más simple y directo, sin bloques DO $$

-- PASO 1: Actualizar el plan de la organización del usuario
UPDATE organizations
SET 
  plan_id = (SELECT id FROM planes WHERE slug = 'profesional' AND activo = true LIMIT 1),
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE id = (
  SELECT organization_id 
  FROM profiles 
  WHERE email = 'financebusinesscompany@gmail.com'
);

-- PASO 2: Limpiar límites individuales del perfil
UPDATE profiles
SET 
  limite_clientes = NULL,
  limite_prestamos = NULL,
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com';

-- PASO 3: Verificar el resultado
SELECT 
  'VERIFICACION FINAL' as "📋 Estado",
  p.email as "📧 Email",
  p.role as "👤 Rol",
  pl.nombre as "📦 Plan",
  pl.limite_clientes as "👥 Límite Clientes",
  pl.limite_prestamos as "💰 Límite Préstamos",
  o.subscription_status as "✅ Estado Suscripción",
  TO_CHAR(o.subscription_start_date, 'DD/MM/YYYY') as "📅 Inicio",
  TO_CHAR(o.subscription_end_date, 'DD/MM/YYYY') as "📅 Fin (30 días)"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';

-- Si el query anterior NO muestra resultados, ejecuta esto para ver qué falta:
SELECT 
  'DIAGNOSTICO' as "🔍 Info",
  p.email as "Email",
  p.organization_id as "Tiene Org?",
  p.role as "Rol",
  o.plan_id as "Org tiene Plan?"
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.email = 'financebusinesscompany@gmail.com';

-- Si organization_id es NULL, ejecuta esto PRIMERO:
/*
INSERT INTO organizations (owner_id, nombre_negocio, created_at, updated_at)
SELECT 
  id,
  'Organización de ' || email,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'financebusinesscompany@gmail.com'
RETURNING id, nombre_negocio;

-- Luego actualiza el perfil con el org_id que te devuelva:
UPDATE profiles
SET 
  organization_id = 'PEGAR_ORG_ID_AQUI',
  role = 'admin',
  updated_at = NOW()
WHERE email = 'financebusinesscompany@gmail.com';

-- Luego vuelve a ejecutar desde el PASO 1
*/
