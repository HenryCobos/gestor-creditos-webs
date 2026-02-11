-- =========================================================
-- DIAGNÓSTICO COMPLETO - ORGANIZACIÓN DE HCOBOS99
-- =========================================================
-- Este script usa como ejemplo el usuario:
--   hcobos99@gmail.com
-- y muestra:
--   - Perfil y organización
--   - Plan asignado a la organización
--   - Usuarios (admin + cobradores) de esa organización
--   - Conteo de clientes y préstamos por usuario
--   - Conteo total por organización
-- Puedes copiarlo y cambiar el email para otros clientes.
-- =========================================================

-- 1. Datos básicos del usuario base
SELECT
  '1. USUARIO BASE' AS seccion,
  p.id AS user_id,
  p.email,
  p.role,
  p.organization_id,
  p.plan_id AS plan_individual
FROM profiles p
WHERE p.email = 'hcobos99@gmail.com';

-- 2. Organización de ese usuario y su plan
SELECT
  '2. ORGANIZACIÓN DEL USUARIO' AS seccion,
  o.id AS organization_id,
  o.nombre_negocio,
  o.owner_id,
  o.plan_id,
  o.subscription_status,
  pl.nombre AS plan_nombre,
  pl.slug AS plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE o.id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
);

-- 3. Usuarios (admin + cobradores) de la organización
SELECT
  '3. USUARIOS DE LA ORGANIZACIÓN' AS seccion,
  p.email,
  p.role,
  p.organization_id,
  ur.organization_id AS org_en_user_roles,
  ur.role AS rol_en_user_roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.organization_id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
)
ORDER BY p.role DESC, p.email;

-- 4. Conteo de clientes por usuario de la organización
SELECT
  '4. CLIENTES POR USUARIO' AS seccion,
  p.email,
  p.role,
  COUNT(c.id) AS total_clientes
FROM profiles p
LEFT JOIN clientes c ON c.user_id = p.id
WHERE p.organization_id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
)
GROUP BY p.email, p.role
ORDER BY total_clientes DESC;

-- 5. Conteo de préstamos por usuario de la organización
SELECT
  '5. PRÉSTAMOS POR USUARIO' AS seccion,
  p.email,
  p.role,
  COUNT(pr.id) AS total_prestamos
FROM profiles p
LEFT JOIN prestamos pr ON pr.user_id = p.id
WHERE p.organization_id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
)
GROUP BY p.email, p.role
ORDER BY total_prestamos DESC;

-- 6. Conteo total de recursos de la organización
SELECT 
  '6. CONTEO TOTAL DE RECURSOS' AS seccion,
  (SELECT COUNT(*)
   FROM clientes c
   JOIN profiles p ON p.id = c.user_id
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1)
  ) AS total_clientes,
  (SELECT COUNT(*)
   FROM prestamos pr
   JOIN profiles p ON p.id = pr.user_id
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1)
  ) AS total_prestamos;

