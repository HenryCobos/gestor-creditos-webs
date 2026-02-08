-- =====================================================
-- DIAGNÓSTICO: Por qué el cobrador no ve sus datos
-- =====================================================
-- Este script ayuda a diagnosticar el problema

-- 1. Verificar el perfil del cobrador
SELECT 
  '1. PERFIL DEL COBRADOR' as seccion,
  id,
  email,
  role,
  organization_id,
  full_name
FROM profiles
WHERE id = auth.uid();

-- 2. Ver clientes creados por el cobrador
SELECT 
  '2. CLIENTES CREADOS POR EL COBRADOR' as seccion,
  id,
  nombre,
  user_id,
  created_at
FROM clientes
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 3. Ver préstamos creados por el cobrador
SELECT 
  '3. PRÉSTAMOS CREADOS POR EL COBRADOR' as seccion,
  id,
  cliente_id,
  monto,
  user_id,
  ruta_id,
  created_at
FROM prestamos
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 4. Ver rutas asignadas al cobrador
SELECT 
  '4. RUTAS DEL COBRADOR' as seccion,
  r.id,
  r.nombre,
  r.cobrador_id,
  COUNT(rc.id) as clientes_en_ruta
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
WHERE r.cobrador_id = auth.uid()
GROUP BY r.id, r.nombre, r.cobrador_id;

-- 5. Probar la función RPC actual
SELECT 
  '5. RESULTADO DE get_clientes_segun_rol()' as seccion,
  COUNT(*) as cantidad_clientes
FROM get_clientes_segun_rol();

SELECT 
  '5. RESULTADO DE get_prestamos_segun_rol()' as seccion,
  COUNT(*) as cantidad_prestamos
FROM get_prestamos_segun_rol();

-- 6. Ver organización
SELECT 
  '6. ORGANIZACIÓN' as seccion,
  o.id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan_nombre,
  o.subscription_status
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE o.id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- 7. Ver límites de organización
SELECT 
  '7. LÍMITES DE ORGANIZACIÓN' as seccion,
  *
FROM get_limites_organizacion();

-- INSTRUCCIONES:
-- Ejecuta este script mientras estás autenticado como COBRADOR
-- Los resultados te dirán exactamente qué está mal
