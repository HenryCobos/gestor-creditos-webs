-- =====================================================
-- VERIFICAR QUE PLANES EXISTEN
-- =====================================================

SELECT 
  id,
  nombre,
  slug,
  limite_clientes,
  limite_prestamos,
  precio_mensual,
  activo
FROM planes
ORDER BY limite_clientes;

-- Si no aparece ningún plan o no aparece "profesional", 
-- ejecuta el siguiente script para crear los planes
