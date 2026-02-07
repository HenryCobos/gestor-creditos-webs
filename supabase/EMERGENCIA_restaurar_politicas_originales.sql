-- =====================================================
-- EMERGENCIA: Restaurar Políticas RLS Originales
-- USAR SOLO SI EL FIX NO FUNCIONÓ
-- Esto restaura el sistema al estado anterior
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS NUEVAS
-- =====================================================

-- Clientes
DROP POLICY IF EXISTS "Users can view own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can view clientes based on role" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;

-- Prestamos
DROP POLICY IF EXISTS "Users can view own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can insert own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can update own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can view prestamos based on role" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can insert prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can update prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can delete prestamos" ON public.prestamos;

-- Cuotas
DROP POLICY IF EXISTS "Users can view own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can insert own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can update own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can delete own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can view cuotas based on role" ON public.cuotas;
DROP POLICY IF EXISTS "Admins can insert cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can update cuotas based on role" ON public.cuotas;
DROP POLICY IF EXISTS "Admins can delete cuotas" ON public.cuotas;

-- Pagos
DROP POLICY IF EXISTS "Users can view own pagos" ON public.pagos;
DROP POLICY IF EXISTS "Users can insert own pagos" ON public.pagos;
DROP POLICY IF EXISTS "Users can view pagos based on role" ON public.pagos;
DROP POLICY IF EXISTS "Users can insert pagos based on role" ON public.pagos;

-- =====================================================
-- PASO 2: RESTAURAR POLÍTICAS ORIGINALES SIMPLES
-- =====================================================

-- Políticas RLS para clientes (ORIGINALES)
CREATE POLICY "Users can view own clientes" ON public.clientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clientes" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clientes" ON public.clientes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clientes" ON public.clientes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para prestamos (ORIGINALES)
CREATE POLICY "Users can view own prestamos" ON public.prestamos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prestamos" ON public.prestamos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prestamos" ON public.prestamos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prestamos" ON public.prestamos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para cuotas (ORIGINALES)
CREATE POLICY "Users can view own cuotas" ON public.cuotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cuotas" ON public.cuotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cuotas" ON public.cuotas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cuotas" ON public.cuotas
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para pagos (ORIGINALES)
CREATE POLICY "Users can view own pagos" ON public.pagos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pagos" ON public.pagos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT '✅ Políticas originales restauradas' as estado;

-- Verificar tus datos
SELECT 
  (SELECT COUNT(*) FROM clientes WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')) as mis_clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')) as mis_prestamos,
  (SELECT COUNT(*) FROM cuotas WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')) as mis_cuotas,
  (SELECT COUNT(*) FROM pagos WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')) as mis_pagos;

SELECT '🔄 Ahora ve a la app, cierra sesión, limpia caché (Ctrl+Shift+R) e inicia sesión nuevamente' as siguiente_paso;
