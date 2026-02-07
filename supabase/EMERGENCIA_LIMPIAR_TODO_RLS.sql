-- ============================================
-- EMERGENCIA: ELIMINAR TODAS LAS POLÍTICAS RLS
-- ============================================
-- Este script elimina ABSOLUTAMENTE TODAS las políticas problemáticas

-- PASO 1: Ver TODAS las políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- PASO 2: Eliminar TODAS las políticas de user_roles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_roles CASCADE';
    END LOOP;
END $$;

-- PASO 3: Eliminar TODAS las políticas de rutas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'rutas'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.rutas CASCADE';
    END LOOP;
END $$;

-- PASO 4: Eliminar TODAS las políticas de movimientos_capital_ruta
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'movimientos_capital_ruta'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.movimientos_capital_ruta CASCADE';
    END LOOP;
END $$;

-- PASO 5: Eliminar TODAS las políticas de ruta_clientes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ruta_clientes'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.ruta_clientes CASCADE';
    END LOOP;
END $$;

-- PASO 6: Verificar que NO queden políticas
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('user_roles', 'rutas', 'movimientos_capital_ruta', 'ruta_clientes', 'gastos', 'arqueos_caja');
-- Debe devolver 0 filas

-- PASO 7: Crear políticas ULTRA-SIMPLES sin JOINs ni subqueries

-- user_roles: Sin políticas (acceso via backend solo)
-- NO CREAR NINGUNA POLÍTICA AQUÍ - Causa recursión

-- rutas: Acceso completo
CREATE POLICY "rutas_full_access" ON public.rutas
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- movimientos_capital_ruta: Acceso completo
CREATE POLICY "movimientos_full_access" ON public.movimientos_capital_ruta
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ruta_clientes: Acceso completo
CREATE POLICY "ruta_clientes_full_access" ON public.ruta_clientes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- gastos: Acceso completo
DROP POLICY IF EXISTS "gastos_all_auth" ON public.gastos;
CREATE POLICY "gastos_full_access" ON public.gastos
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- arqueos_caja: Acceso completo
DROP POLICY IF EXISTS "arqueos_all_auth" ON public.arqueos_caja;
CREATE POLICY "arqueos_full_access" ON public.arqueos_caja
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- PASO 8: Verificar políticas finales
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_roles', 'rutas', 'movimientos_capital_ruta', 'ruta_clientes', 'gastos', 'arqueos_caja')
ORDER BY tablename;

-- ✅ RESULTADO ESPERADO:
-- - user_roles: 0 políticas (sin RLS, acceso via backend)
-- - rutas: 1 política (full_access)
-- - movimientos_capital_ruta: 1 política (full_access)
-- - ruta_clientes: 1 política (full_access)
-- - gastos: 1 política (full_access)
-- - arqueos_caja: 1 política (full_access)
