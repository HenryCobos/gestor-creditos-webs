-- =========================================================
-- Diagnóstico DELETE admin v3 (ejecutar en Supabase SQL Editor)
-- =========================================================

-- 1) Funciones + RPC v3 requeridas
SELECT 'FUNCIONES_V3' AS seccion, proname
FROM pg_proc
WHERE proname IN (
  'get_mi_organization_admin',
  'es_admin_activo',
  'admin_puede_eliminar_cliente',
  'admin_puede_eliminar_prestamo',
  'eliminar_cliente_admin',
  'eliminar_prestamo_admin'
)
ORDER BY proname;

-- 2) Políticas DELETE activas (ideal: 1 por tabla "Only admins can delete ...")
SELECT 'POLITICAS_DELETE' AS seccion, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'DELETE'
  AND tablename IN (
    'clientes',
    'prestamos',
    'cuotas',
    'pagos',
    'garantias',
    'abonos_capital',
    'renovaciones_empeno'
  )
ORDER BY tablename, policyname;

-- 3) Cobradores con organization_id NULL
SELECT 'COBRADORES_ORG_NULL' AS seccion, p.id, p.email, p.full_name
FROM public.profiles p
WHERE p.role = 'cobrador'
  AND p.organization_id IS NULL;

-- 4) Admins con organization_id NULL (modo legacy)
SELECT 'ADMINS_ORG_NULL' AS seccion, p.id, p.email, p.full_name
FROM public.profiles p
WHERE p.role = 'admin'
  AND p.organization_id IS NULL;

-- 5) Clientes creados por cobrador con org NULL en perfil
SELECT 'CLIENTES_COBRADOR_ORG_NULL' AS seccion,
       c.id,
       c.nombre,
       p.email AS creador_email
FROM public.clientes c
JOIN public.profiles p ON p.id = c.user_id
WHERE p.role = 'cobrador'
  AND p.organization_id IS NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- 6) Préstamos del cobrador: ¿puede eliminarlos un admin? (requiere sesión admin en SQL Editor)
-- Nota: admin_puede_eliminar_* usa auth.uid(); ejecutar logueado como admin o usar RPC desde la app
SELECT 'PRESTAMOS_MUESTRA' AS seccion,
       pr.id,
       c.nombre AS cliente,
       p.email AS creador,
       p.organization_id AS creador_org,
       pr.ruta_id
FROM public.prestamos pr
JOIN public.clientes c ON c.id = pr.cliente_id
JOIN public.profiles p ON p.id = pr.user_id
ORDER BY pr.created_at DESC
LIMIT 10;
