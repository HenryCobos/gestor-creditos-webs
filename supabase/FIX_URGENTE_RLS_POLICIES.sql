-- =====================================================
-- FIX URGENTE: Corregir Políticas RLS
-- PROBLEMA: Usuarios no pueden ver sus datos existentes
-- SOLUCIÓN: Simplificar políticas con prioridad a compatibilidad
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Eliminar políticas de clientes
DROP POLICY IF EXISTS "Users can view clientes based on role" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;

-- Eliminar políticas de prestamos
DROP POLICY IF EXISTS "Users can view prestamos based on role" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can insert prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can update prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Admins can delete prestamos" ON public.prestamos;

-- Eliminar políticas de cuotas
DROP POLICY IF EXISTS "Users can view cuotas based on role" ON public.cuotas;
DROP POLICY IF EXISTS "Admins can insert cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can update cuotas based on role" ON public.cuotas;
DROP POLICY IF EXISTS "Admins can delete cuotas" ON public.cuotas;

-- Eliminar políticas de pagos
DROP POLICY IF EXISTS "Users can view pagos based on role" ON public.pagos;
DROP POLICY IF EXISTS "Users can insert pagos based on role" ON public.pagos;

-- =====================================================
-- PASO 2: CREAR POLÍTICAS CORREGIDAS (COMPATIBILIDAD PRIMERO)
-- =====================================================

-- =====================================================
-- CLIENTES: Políticas simplificadas
-- =====================================================

CREATE POLICY "Users can view own clientes" ON public.clientes
  FOR SELECT USING (
    -- PRIORIDAD 1: Usuario es el dueño (compatibilidad total)
    auth.uid() = user_id
    OR
    -- PRIORIDAD 2: Es admin de la organización del dueño
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = clientes.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    -- PRIORIDAD 3: Es cobrador con ruta asignada
    EXISTS(
      SELECT 1 FROM ruta_clientes rc
      JOIN rutas r ON r.id = rc.ruta_id
      WHERE rc.cliente_id = clientes.id 
        AND r.cobrador_id = auth.uid()
        AND rc.activo = true
    )
  );

CREATE POLICY "Users can insert own clientes" ON public.clientes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = clientes.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can update own clientes" ON public.clientes
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = clientes.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own clientes" ON public.clientes
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = clientes.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

-- =====================================================
-- PRESTAMOS: Políticas simplificadas
-- =====================================================

CREATE POLICY "Users can view own prestamos" ON public.prestamos
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = prestamos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    EXISTS(
      SELECT 1 FROM rutas r
      WHERE r.id = prestamos.ruta_id 
        AND r.cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own prestamos" ON public.prestamos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = prestamos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can update own prestamos" ON public.prestamos
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = prestamos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own prestamos" ON public.prestamos
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = prestamos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

-- =====================================================
-- CUOTAS: Políticas simplificadas
-- =====================================================

CREATE POLICY "Users can view own cuotas" ON public.cuotas
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = cuotas.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    EXISTS(
      SELECT 1 FROM prestamos pr
      JOIN rutas r ON r.id = pr.ruta_id
      WHERE pr.id = cuotas.prestamo_id 
        AND r.cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cuotas" ON public.cuotas
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = cuotas.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can update own cuotas" ON public.cuotas
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = cuotas.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    -- Cobrador puede editar solo cuotas registradas HOY por él
    EXISTS(
      SELECT 1 FROM prestamos pr
      JOIN rutas r ON r.id = pr.ruta_id
      JOIN pagos pg ON pg.cuota_id = cuotas.id
      WHERE pr.id = cuotas.prestamo_id 
        AND r.cobrador_id = auth.uid()
        AND pg.registrado_por = auth.uid()
        AND DATE(pg.fecha_registro) = CURRENT_DATE
    )
  );

CREATE POLICY "Users can delete own cuotas" ON public.cuotas
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = cuotas.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
  );

-- =====================================================
-- PAGOS: Políticas simplificadas
-- =====================================================

CREATE POLICY "Users can view own pagos" ON public.pagos
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = pagos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    EXISTS(
      SELECT 1 FROM prestamos pr
      JOIN rutas r ON r.id = pr.ruta_id
      WHERE pr.id = pagos.prestamo_id 
        AND r.cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own pagos" ON public.pagos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS(
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE p.id = pagos.user_id 
        AND ur.organization_id = p.organization_id
        AND ur.role = 'admin'
    )
    OR
    EXISTS(
      SELECT 1 FROM prestamos pr
      JOIN rutas r ON r.id = pr.ruta_id
      WHERE pr.id = pagos.prestamo_id 
        AND r.cobrador_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICACIÓN: Probar que tu usuario puede ver sus datos
-- =====================================================

-- 1. Ver información de tu perfil
SELECT 
  id,
  email,
  organization_id,
  role,
  activo
FROM profiles
WHERE id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com');

-- 2. Contar tus clientes (debería ser > 0)
SELECT COUNT(*) as mis_clientes
FROM clientes
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com');

-- 3. Ver tus primeros 5 clientes
SELECT 
  id,
  nombre,
  dni,
  created_at
FROM clientes
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com')
ORDER BY created_at DESC
LIMIT 5;

-- 4. Contar tus préstamos
SELECT COUNT(*) as mis_prestamos
FROM prestamos
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'hcobos99@gmail.com');

-- 5. Verificar que las políticas permiten acceso
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'clientes'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Deberías ver:
-- 1. Tu perfil con organization_id y role='admin'
-- 2. Conteo de tus clientes (NO debería ser 0)
-- 3. Lista de 5 clientes
-- 4. Conteo de tus préstamos
-- 5. Las 4 políticas de clientes listadas
-- =====================================================
