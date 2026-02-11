-- Ver todos los usuarios
SELECT 
  p.email,
  p.nombre_completo,
  p.organization_id,
  o.nombre_negocio as organizacion,
  p.role,
  p.plan_id as plan_individual,
  o.plan_id as plan_organizacion
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.email
LIMIT 20;
