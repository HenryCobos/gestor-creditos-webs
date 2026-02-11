-- Ver todas las organizaciones
SELECT 
  o.id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  pl.limite_clientes,
  pl.limite_prestamos
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY o.created_at DESC
LIMIT 10;
