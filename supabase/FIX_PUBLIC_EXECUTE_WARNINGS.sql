-- =========================================================
-- FIX: "Public Can Execute SECURITY DEFINER Function"
-- =========================================================
-- Supabase detecta que funciones SECURITY DEFINER son ejecutables
-- por usuarios no autenticados (rol PUBLIC de PostgreSQL).
--
-- SOLUCIÓN: REVOKE de PUBLIC + GRANT solo a 'authenticated'
-- → No cambia la lógica de ninguna función
-- → No afecta datos de clientes
-- → Las funciones quedan accesibles SOLO para usuarios logueados
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- =========================================================

-- =========================================================
-- GRUPO 1: Funciones que usan la app (solo usuarios logueados)
-- =========================================================

-- can_add_cliente
REVOKE EXECUTE ON FUNCTION public.can_add_cliente(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_add_cliente(uuid) TO authenticated;

-- can_add_prestamo
REVOKE EXECUTE ON FUNCTION public.can_add_prestamo(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_add_prestamo(uuid) TO authenticated;

-- get_clientes_segun_rol
REVOKE EXECUTE ON FUNCTION public.get_clientes_segun_rol() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_clientes_segun_rol() TO authenticated;

-- get_cuotas_segun_rol
REVOKE EXECUTE ON FUNCTION public.get_cuotas_segun_rol() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_cuotas_segun_rol() TO authenticated;

-- get_empeños_vencidos
REVOKE EXECUTE ON FUNCTION public.get_empeños_vencidos(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_empeños_vencidos(uuid) TO authenticated;

-- get_limites_organizacion
REVOKE EXECUTE ON FUNCTION public.get_limites_organizacion() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_limites_organizacion() TO authenticated;

-- get_prestamos_segun_rol
REVOKE EXECUTE ON FUNCTION public.get_prestamos_segun_rol() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_prestamos_segun_rol() TO authenticated;

-- get_user_organization
REVOKE EXECUTE ON FUNCTION public.get_user_organization(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_organization(uuid) TO authenticated;

-- get_user_plan_limits
REVOKE EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) TO authenticated;

-- get_user_role
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_role(uuid, uuid) TO authenticated;

-- get_user_status
REVOKE EXECUTE ON FUNCTION public.get_user_status(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_status(uuid) TO authenticated;

-- get_uso_por_usuario
REVOKE EXECUTE ON FUNCTION public.get_uso_por_usuario() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_uso_por_usuario() TO authenticated;

-- get_usuarios_organizacion
REVOKE EXECUTE ON FUNCTION public.get_usuarios_organizacion() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_usuarios_organizacion() TO authenticated;

-- =========================================================
-- GRUPO 2: Funciones trigger internos
-- Solo las llama PostgreSQL internamente (vía triggers).
-- REVOKE de PUBLIC y de authenticated: nadie las debe llamar directamente
-- =========================================================

-- actualizar_capital_pago (trigger interno)
REVOKE EXECUTE ON FUNCTION public.actualizar_capital_pago()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.actualizar_capital_pago()      FROM authenticated;

-- actualizar_capital_prestamo (trigger interno)
REVOKE EXECUTE ON FUNCTION public.actualizar_capital_prestamo()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.actualizar_capital_prestamo()  FROM authenticated;

-- trg_recalcular_capital_desde_prestamos (trigger interno)
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_prestamos() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_prestamos() FROM authenticated;

-- trg_recalcular_capital_desde_pagos (trigger interno)
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_pagos()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_pagos()     FROM authenticated;

-- trg_recalcular_capital_desde_gastos (trigger interno)
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_gastos()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_capital_desde_gastos()    FROM authenticated;

-- trigger_actualizar_capital_ruta (trigger interno)
REVOKE EXECUTE ON FUNCTION public.trigger_actualizar_capital_ruta()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_actualizar_capital_ruta()        FROM authenticated;

-- asignar_prestamos_a_ruta (trigger interno)
REVOKE EXECUTE ON FUNCTION public.asignar_prestamos_a_ruta()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.asignar_prestamos_a_ruta()               FROM authenticated;

-- =========================================================
-- GRUPO 3: Función admin sensible
-- Solo la debe ejecutar service_role (backend)
-- =========================================================

-- delete_user_by_email → solo backend/service_role
REVOKE EXECUTE ON FUNCTION public.delete_user_by_email(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_user_by_email(text) TO service_role;

-- =========================================================
-- VERIFICACIÓN: Confirmar permisos actuales
-- =========================================================

SELECT
  r.routine_name AS funcion,
  g.grantee,
  g.privilege_type,
  g.is_grantable
FROM information_schema.routines r
LEFT JOIN information_schema.role_routine_grants g
  ON g.routine_schema = r.routine_schema
  AND g.routine_name = r.routine_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'can_add_cliente',
    'can_add_prestamo',
    'get_clientes_segun_rol',
    'get_cuotas_segun_rol',
    'get_empeños_vencidos',
    'get_limites_organizacion',
    'get_prestamos_segun_rol',
    'get_user_organization',
    'get_user_plan_limits',
    'get_user_role',
    'get_user_status',
    'get_uso_por_usuario',
    'get_usuarios_organizacion',
    'actualizar_capital_pago',
    'actualizar_capital_prestamo',
    'delete_user_by_email'
  )
ORDER BY r.routine_name, g.grantee;

-- =========================================================
-- RESULTADO ESPERADO:
-- GRUPO 1 (app → authenticated):
--   can_add_cliente, can_add_prestamo, get_clientes_segun_rol,
--   get_cuotas_segun_rol, get_empeños_vencidos, get_limites_organizacion,
--   get_prestamos_segun_rol, get_user_organization, get_user_plan_limits,
--   get_user_role, get_user_status, get_uso_por_usuario,
--   get_usuarios_organizacion
-- GRUPO 2 (triggers internos): sin grantee PUBLIC, sin grantee alguno
--   actualizar_capital_pago, actualizar_capital_prestamo
-- GRUPO 3 (admin backend → service_role):
--   delete_user_by_email
-- → PUBLIC no debe aparecer en ninguna función
-- =========================================================
