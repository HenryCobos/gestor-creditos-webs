-- ============================================
-- DIAGNÓSTICO: ¿Por qué no veo el usuario creado?
-- ============================================

-- PASO 1: Ver TU perfil (el admin que está logueado)
SELECT 
  id as mi_id,
  email as mi_email,
  role as mi_role,
  organization_id as mi_org_id
FROM profiles
WHERE id = auth.uid();
-- Anota tu organization_id

-- PASO 2: Ver TODOS los usuarios de tu organización (ignorando RLS temporalmente)
-- REEMPLAZA 'TU_ORG_ID' con el organization_id del PASO 1
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,
  organization_id,
  activo,
  created_at
FROM profiles
WHERE organization_id = 'TU_ORG_ID'::uuid
ORDER BY created_at DESC;

-- PASO 3: Ver el último usuario creado (debería ser el cobrador)
SELECT 
  id,
  email,
  full_name,
  nombre_completo,
  role,
  organization_id,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- PASO 4: Probar la query EXACTA que usa loadUsuarios()
-- REEMPLAZA 'TU_ORG_ID' con tu organization_id
SELECT *
FROM profiles
WHERE organization_id = 'TU_ORG_ID'::uuid
ORDER BY created_at DESC;

-- PASO 5: Ver si la política RLS está bloqueando
-- Esta query debería devolver los mismos usuarios que PASO 4
-- Si devuelve MENOS usuarios, entonces RLS está bloqueando
SELECT COUNT(*) as usuarios_sin_rls
FROM profiles
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());

-- ✅ Si PASO 2, 3 y 4 muestran el usuario creado, pero PASO 5 muestra menos usuarios,
-- entonces el problema ES la política RLS.
