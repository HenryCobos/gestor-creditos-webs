-- =========================================================
-- FIX: Function Search Path Mutable Warnings
-- =========================================================
-- Elimina todos los warnings "Function Search Path Mutable"
-- del Security Advisor de Supabase.
--
-- MÉTODO SEGURO: ALTER FUNCTION ... SET search_path = public
-- → No modifica la lógica de ninguna función
-- → Solo agrega el parámetro de seguridad search_path
-- → No afecta datos de clientes ni comportamiento del sistema
-- → Completamente reversible
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- =========================================================

-- =========================================================
-- GRUPO 1: Funciones de roles y organización (SQL language)
-- =========================================================

-- get_user_role(UUID, UUID)
ALTER FUNCTION public.get_user_role(UUID, UUID)
  SET search_path = public;

-- is_admin(UUID, UUID)
ALTER FUNCTION public.is_admin(UUID, UUID)
  SET search_path = public;

-- get_user_organization(UUID)
ALTER FUNCTION public.get_user_organization(UUID)
  SET search_path = public;

-- get_user_status(UUID)
ALTER FUNCTION public.get_user_status(UUID)
  SET search_path = public;

-- =========================================================
-- GRUPO 2: Funciones de validación de límites
-- =========================================================

-- puede_crear_cliente(UUID)
ALTER FUNCTION public.puede_crear_cliente(UUID)
  SET search_path = public;

-- puede_crear_prestamo(UUID)
ALTER FUNCTION public.puede_crear_prestamo(UUID)
  SET search_path = public;

-- =========================================================
-- GRUPO 3: Funciones de capital de rutas
-- =========================================================

-- recalcular_capital_ruta(UUID)
ALTER FUNCTION public.recalcular_capital_ruta(UUID)
  SET search_path = public;

-- calcular_capital_actual_ruta(UUID)
ALTER FUNCTION public.calcular_capital_actual_ruta(UUID)
  SET search_path = public;

-- =========================================================
-- GRUPO 4: Funciones trigger (actualizan datos automáticamente)
-- =========================================================

-- actualizar_capital_prestamo() - trigger al crear préstamo
ALTER FUNCTION public.actualizar_capital_prestamo()
  SET search_path = public;

-- actualizar_capital_pago() - trigger al registrar pago
ALTER FUNCTION public.actualizar_capital_pago()
  SET search_path = public;

-- trigger_actualizar_capital_ruta() - trigger rutas
ALTER FUNCTION public.trigger_actualizar_capital_ruta()
  SET search_path = public;

-- asignar_prestamos_a_ruta() - trigger asignación de ruta
ALTER FUNCTION public.asignar_prestamos_a_ruta()
  SET search_path = public;

-- trg_recalcular_capital_desde_prestamos()
ALTER FUNCTION public.trg_recalcular_capital_desde_prestamos()
  SET search_path = public;

-- trg_recalcular_capital_desde_pagos()
ALTER FUNCTION public.trg_recalcular_capital_desde_pagos()
  SET search_path = public;

-- trg_recalcular_capital_desde_gastos()
ALTER FUNCTION public.trg_recalcular_capital_desde_gastos()
  SET search_path = public;

-- =========================================================
-- VERIFICACIÓN: Confirmar que se aplicó el search_path
-- =========================================================

SELECT
  p.proname AS funcion,
  n.nspname AS schema,
  CASE
    WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
    THEN '✅ CORREGIDO'
    ELSE '❌ FALTA CORREGIR'
  END AS estado
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_user_role',
    'is_admin',
    'get_user_organization',
    'get_user_status',
    'puede_crear_cliente',
    'puede_crear_prestamo',
    'recalcular_capital_ruta',
    'calcular_capital_actual_ruta',
    'actualizar_capital_prestamo',
    'actualizar_capital_pago',
    'trigger_actualizar_capital_ruta',
    'asignar_prestamos_a_ruta',
    'trg_recalcular_capital_desde_prestamos',
    'trg_recalcular_capital_desde_pagos',
    'trg_recalcular_capital_desde_gastos'
  )
ORDER BY p.proname;

-- =========================================================
-- RESULTADO ESPERADO:
-- Todas las funciones deben mostrar: ✅ CORREGIDO
--
-- DESPUÉS DE EJECUTAR:
-- 1. Ve a Supabase → Security Advisor
-- 2. Haz clic en "Refresh" / "Rerun Analysis"
-- 3. Espera 2-5 minutos
-- 4. Los warnings "Function Search Path Mutable" deben desaparecer
-- =========================================================
