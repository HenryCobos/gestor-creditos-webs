-- =====================================================
-- VERIFICACIÓN: Estado de la Migración
-- Ejecuta esto en Supabase SQL Editor
-- =====================================================

-- 1. Ver todos los usuarios con sus roles
SELECT 
  u.email,
  p.organization_id,
  p.role,
  o.nombre_negocio,
  ur.role as role_en_user_roles
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;

-- 2. Contar usuarios migrados vs no migrados
SELECT 
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as usuarios_migrados,
  COUNT(*) FILTER (WHERE organization_id IS NULL) as usuarios_sin_migrar,
  COUNT(*) as total_usuarios
FROM profiles;

-- 3. Ver organizaciones creadas
SELECT * FROM organizations;

-- 4. Ver user_roles creados
SELECT 
  ur.*,
  p.email
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id;
