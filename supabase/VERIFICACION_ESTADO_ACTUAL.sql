-- =========================================================
-- VERIFICACIÓN DEL ESTADO ACTUAL
-- =========================================================
-- Este script NO hace cambios, solo muestra el estado real
-- =========================================================

-- 1. Ver SI la función get_limites_organizacion existe y su definición
SELECT 
  'FUNCIÓN get_limites_organizacion:' as info,
  proname as nombre,
  prosecdef as tiene_security_definer
FROM pg_proc
WHERE proname = 'get_limites_organizacion';

-- 2. Ver tu usuario específico (Henry)
SELECT 
  'TU USUARIO (HENRY):' as info,
  p.email,
  p.organization_id,
  p.role,
  p.plan_id as plan_individual,
  o.nombre_negocio as org_nombre,
  o.plan_id as plan_org_id,
  pl.nombre as plan_org_nombre,
  pl.limite_clientes as limite_org_clientes,
  pl.limite_prestamos as limite_org_prestamos
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE p.email LIKE '%henry%' OR p.email LIKE '%hcobos%';

-- 3. Ver el usuario cobrador (Valeria)
SELECT 
  'USUARIO COBRADOR (VALERIA):' as info,
  p.email,
  p.organization_id,
  p.role,
  p.plan_id as plan_individual,
  o.nombre_negocio as org_nombre,
  o.plan_id as plan_org_id,
  pl.nombre as plan_org_nombre
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE p.email LIKE '%valeria%';

-- 4. Ver user_roles de ambos
SELECT 
  'USER_ROLES:' as info,
  p.email,
  ur.organization_id as org_en_user_roles,
  ur.role as rol_en_user_roles,
  o.nombre_negocio as org_nombre
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE p.email LIKE '%henry%' OR p.email LIKE '%valeria%';

-- 5. Contar clientes y préstamos de la organización de Henry
SELECT 
  'CONTEO REAL DE RECURSOS:' as info,
  (SELECT COUNT(*) 
   FROM clientes c 
   JOIN profiles p ON p.id = c.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email LIKE '%henry%' LIMIT 1)
  ) as total_clientes,
  (SELECT COUNT(*) 
   FROM prestamos pr 
   JOIN profiles p ON p.id = pr.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email LIKE '%henry%' LIMIT 1)
  ) as total_prestamos;
