-- =====================================================
-- MIGRACIÓN: Sistema de Roles, Rutas y Cobradores
-- FECHA: 2026-02-07
-- DESCRIPCIÓN: Implementa sistema multiusuario con roles,
--              rutas de cobro, gastos y arqueo de caja
-- COMPATIBILIDAD: 100% - No afecta usuarios existentes
-- =====================================================

-- =====================================================
-- PASO 1: CREAR TABLAS PRINCIPALES
-- =====================================================

-- Tabla: organizations
-- Agrupa administradores y cobradores en una organización
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre_negocio TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- Tabla: user_roles
-- Define el rol de cada usuario en una organización
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cobrador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Tabla: rutas
-- Define rutas de cobro con capital de trabajo asignado
CREATE TABLE IF NOT EXISTS public.rutas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  nombre_ruta TEXT NOT NULL,
  descripcion TEXT,
  cobrador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  capital_inicial DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (capital_inicial >= 0),
  capital_actual DECIMAL(12, 2) NOT NULL DEFAULT 0,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ruta_clientes
-- Relaciona clientes con rutas (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.ruta_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ruta_id UUID REFERENCES public.rutas(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ruta_id, cliente_id)
);

-- Tabla: movimientos_capital_ruta
-- Historial de movimientos de capital en cada ruta
CREATE TABLE IF NOT EXISTS public.movimientos_capital_ruta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ruta_id UUID REFERENCES public.rutas(id) ON DELETE CASCADE NOT NULL,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'retiro', 'transferencia_entrada', 'transferencia_salida', 'prestamo_entregado', 'pago_recibido')),
  monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
  saldo_anterior DECIMAL(12, 2) NOT NULL,
  saldo_nuevo DECIMAL(12, 2) NOT NULL,
  ruta_origen_id UUID REFERENCES public.rutas(id) ON DELETE SET NULL,
  ruta_destino_id UUID REFERENCES public.rutas(id) ON DELETE SET NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE SET NULL,
  pago_id UUID REFERENCES public.pagos(id) ON DELETE SET NULL,
  realizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  concepto TEXT NOT NULL,
  fecha_movimiento TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: gastos
-- Registro de gastos operativos (gasolina, comida, etc.)
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  ruta_id UUID REFERENCES public.rutas(id) ON DELETE SET NULL,
  cobrador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('gasolina', 'mantenimiento', 'comida', 'transporte', 'otro')),
  monto DECIMAL(10, 2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  fecha_gasto DATE NOT NULL,
  comprobante_url TEXT,
  aprobado BOOLEAN DEFAULT true,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ DEFAULT NOW(),
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: arqueos_caja
-- Arqueo diario de caja por ruta
CREATE TABLE IF NOT EXISTS public.arqueos_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  ruta_id UUID REFERENCES public.rutas(id) ON DELETE CASCADE NOT NULL,
  cobrador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha_arqueo DATE NOT NULL,
  dinero_esperado DECIMAL(12, 2) NOT NULL,
  dinero_reportado DECIMAL(12, 2) NOT NULL,
  diferencia DECIMAL(12, 2) GENERATED ALWAYS AS (dinero_reportado - dinero_esperado) STORED,
  estado TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN dinero_reportado = dinero_esperado THEN 'cuadrado'
      WHEN dinero_reportado > dinero_esperado THEN 'sobrante'
      ELSE 'faltante'
    END
  ) STORED,
  notas TEXT,
  revisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_revision TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ruta_id, fecha_arqueo)
);

-- =====================================================
-- PASO 2: ACTUALIZAR TABLA PROFILES
-- =====================================================

-- Agregar columnas nuevas a profiles (si no existen)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'cobrador')),
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- =====================================================
-- PASO 3: ACTUALIZAR TABLAS EXISTENTES
-- =====================================================

-- Agregar ruta_id a préstamos (para vincular préstamo con ruta)
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES public.rutas(id) ON DELETE SET NULL;

-- Agregar campos de auditoría a pagos (quién registró el pago)
ALTER TABLE public.pagos 
ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- PASO 4: CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_rutas_organization_id ON public.rutas(organization_id);
CREATE INDEX IF NOT EXISTS idx_rutas_cobrador_id ON public.rutas(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_ruta_clientes_ruta_id ON public.ruta_clientes(ruta_id);
CREATE INDEX IF NOT EXISTS idx_ruta_clientes_cliente_id ON public.ruta_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_capital_ruta_id ON public.movimientos_capital_ruta(ruta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_capital_fecha ON public.movimientos_capital_ruta(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_gastos_organization_id ON public.gastos(organization_id);
CREATE INDEX IF NOT EXISTS idx_gastos_ruta_id ON public.gastos(ruta_id);
CREATE INDEX IF NOT EXISTS idx_gastos_cobrador_id ON public.gastos(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_arqueos_ruta_id ON public.arqueos_caja(ruta_id);
CREATE INDEX IF NOT EXISTS idx_arqueos_fecha ON public.arqueos_caja(fecha_arqueo);
CREATE INDEX IF NOT EXISTS idx_prestamos_ruta_id ON public.prestamos(ruta_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- =====================================================
-- PASO 5: TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rutas_updated_at BEFORE UPDATE ON public.rutas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gastos_updated_at BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arqueos_caja_updated_at BEFORE UPDATE ON public.arqueos_caja
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASO 6: FUNCIONES AUXILIARES
-- =====================================================

-- Función: Obtener rol del usuario en una organización
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param UUID, org_id_param UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = user_id_param AND organization_id = org_id_param
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función: Verificar si usuario es admin de una organización
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID, org_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_id_param 
    AND organization_id = org_id_param 
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función: Obtener organización del usuario
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id_param UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles
  WHERE id = user_id_param
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función: Actualizar capital de ruta al crear préstamo
CREATE OR REPLACE FUNCTION public.actualizar_capital_prestamo()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
  v_capital_actual DECIMAL(12, 2);
BEGIN
  -- Solo procesar si el préstamo tiene ruta asignada
  IF NEW.ruta_id IS NOT NULL THEN
    -- Obtener capital actual de la ruta
    SELECT capital_actual INTO v_capital_actual
    FROM public.rutas
    WHERE id = NEW.ruta_id
    FOR UPDATE;
    
    -- Validar que hay capital suficiente
    IF v_capital_actual < NEW.monto_prestado THEN
      RAISE EXCEPTION 'Capital insuficiente en la ruta. Disponible: %, Requerido: %', 
        v_capital_actual, NEW.monto_prestado;
    END IF;
    
    -- Actualizar capital de la ruta
    UPDATE public.rutas
    SET capital_actual = capital_actual - NEW.monto_prestado
    WHERE id = NEW.ruta_id;
    
    -- Registrar movimiento
    INSERT INTO public.movimientos_capital_ruta (
      ruta_id, tipo_movimiento, monto, saldo_anterior, saldo_nuevo,
      prestamo_id, realizado_por, concepto
    ) VALUES (
      NEW.ruta_id, 'prestamo_entregado', NEW.monto_prestado,
      v_capital_actual, v_capital_actual - NEW.monto_prestado,
      NEW.id, NEW.user_id, 'Préstamo entregado a ' || (SELECT nombre FROM public.clientes WHERE id = NEW.cliente_id LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Actualizar capital de ruta al recibir pago
CREATE OR REPLACE FUNCTION public.actualizar_capital_pago()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
  v_capital_actual DECIMAL(12, 2);
BEGIN
  -- Obtener ruta del préstamo
  SELECT ruta_id INTO v_ruta_id
  FROM public.prestamos
  WHERE id = NEW.prestamo_id;
  
  -- Solo procesar si el préstamo tiene ruta asignada
  IF v_ruta_id IS NOT NULL THEN
    -- Obtener capital actual de la ruta
    SELECT capital_actual INTO v_capital_actual
    FROM public.rutas
    WHERE id = v_ruta_id
    FOR UPDATE;
    
    -- Actualizar capital de la ruta
    UPDATE public.rutas
    SET capital_actual = capital_actual + NEW.monto_pagado
    WHERE id = v_ruta_id;
    
    -- Registrar movimiento
    INSERT INTO public.movimientos_capital_ruta (
      ruta_id, tipo_movimiento, monto, saldo_anterior, saldo_nuevo,
      pago_id, realizado_por, concepto
    ) VALUES (
      v_ruta_id, 'pago_recibido', NEW.monto_pagado,
      v_capital_actual, v_capital_actual + NEW.monto_pagado,
      NEW.id, NEW.user_id, 'Pago recibido de cuota #' || (SELECT numero_cuota FROM public.cuotas WHERE id = NEW.cuota_id LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 7: CREAR TRIGGERS PARA CAPITAL
-- =====================================================

-- Trigger: Actualizar capital al crear préstamo
CREATE TRIGGER trigger_actualizar_capital_prestamo
AFTER INSERT ON public.prestamos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_capital_prestamo();

-- Trigger: Actualizar capital al registrar pago
CREATE TRIGGER trigger_actualizar_capital_pago
AFTER INSERT ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_capital_pago();

-- =====================================================
-- PASO 8: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_capital_ruta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arqueos_caja ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: ORGANIZATIONS
-- =====================================================

CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update their organization" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create their organization" ON public.organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS: USER_ROLES
-- =====================================================

CREATE POLICY "Users can view roles in their organization" ON public.user_roles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.organization_id = user_roles.organization_id 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: RUTAS
-- =====================================================

CREATE POLICY "Users can view rutas in their organization" ON public.rutas
  FOR SELECT USING (
    -- Admin ve todas las rutas
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = rutas.organization_id 
      AND role = 'admin'
    )
    OR
    -- Cobrador ve solo sus rutas
    cobrador_id = auth.uid()
  );

CREATE POLICY "Admins can manage rutas" ON public.rutas
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = rutas.organization_id 
      AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: RUTA_CLIENTES
-- =====================================================

CREATE POLICY "Users can view ruta_clientes" ON public.ruta_clientes
  FOR SELECT USING (
    -- Admin ve todos
    EXISTS(
      SELECT 1 FROM public.rutas r
      JOIN public.user_roles ur ON ur.organization_id = r.organization_id
      WHERE r.id = ruta_clientes.ruta_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve solo sus rutas
    EXISTS(
      SELECT 1 FROM public.rutas
      WHERE id = ruta_clientes.ruta_id 
      AND cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ruta_clientes" ON public.ruta_clientes
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.rutas r
      JOIN public.user_roles ur ON ur.organization_id = r.organization_id
      WHERE r.id = ruta_clientes.ruta_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: MOVIMIENTOS_CAPITAL_RUTA
-- =====================================================

CREATE POLICY "Users can view movimientos in their organization" ON public.movimientos_capital_ruta
  FOR SELECT USING (
    -- Admin ve todos los movimientos
    EXISTS(
      SELECT 1 FROM public.rutas r
      JOIN public.user_roles ur ON ur.organization_id = r.organization_id
      WHERE r.id = movimientos_capital_ruta.ruta_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve movimientos de sus rutas
    EXISTS(
      SELECT 1 FROM public.rutas
      WHERE id = movimientos_capital_ruta.ruta_id 
      AND cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage movimientos" ON public.movimientos_capital_ruta
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.rutas r
      JOIN public.user_roles ur ON ur.organization_id = r.organization_id
      WHERE r.id = movimientos_capital_ruta.ruta_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: GASTOS
-- =====================================================

CREATE POLICY "Users can view gastos in their organization" ON public.gastos
  FOR SELECT USING (
    -- Admin ve todos los gastos
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = gastos.organization_id 
      AND role = 'admin'
    )
    OR
    -- Cobrador ve solo sus gastos
    cobrador_id = auth.uid()
  );

CREATE POLICY "Cobradores can create their gastos" ON public.gastos
  FOR INSERT WITH CHECK (cobrador_id = auth.uid());

CREATE POLICY "Admins can update gastos" ON public.gastos
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = gastos.organization_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete gastos" ON public.gastos
  FOR DELETE USING (
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = gastos.organization_id 
      AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: ARQUEOS_CAJA
-- =====================================================

CREATE POLICY "Users can view arqueos in their organization" ON public.arqueos_caja
  FOR SELECT USING (
    -- Admin ve todos los arqueos
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = arqueos_caja.organization_id 
      AND role = 'admin'
    )
    OR
    -- Cobrador ve solo sus arqueos
    cobrador_id = auth.uid()
  );

CREATE POLICY "Users can create arqueos" ON public.arqueos_caja
  FOR INSERT WITH CHECK (
    -- Admin puede crear cualquier arqueo
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = arqueos_caja.organization_id 
      AND role = 'admin'
    )
    OR
    -- Cobrador solo puede crear sus propios arqueos
    cobrador_id = auth.uid()
  );

CREATE POLICY "Admins can update arqueos" ON public.arqueos_caja
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = arqueos_caja.organization_id 
      AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS ACTUALIZADAS: CLIENTES
-- =====================================================

-- Eliminar políticas antiguas de clientes
DROP POLICY IF EXISTS "Users can view own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete own clientes" ON public.clientes;

-- Nuevas políticas con soporte para roles
CREATE POLICY "Users can view clientes based on role" ON public.clientes
  FOR SELECT USING (
    -- Usuario original (compatibilidad hacia atrás)
    auth.uid() = user_id
    OR
    -- Admin ve todos los clientes de su organización
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = clientes.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve solo clientes de sus rutas
    EXISTS(
      SELECT 1 FROM public.ruta_clientes rc
      JOIN public.rutas r ON r.id = rc.ruta_id
      WHERE rc.cliente_id = clientes.id 
      AND r.cobrador_id = auth.uid() 
      AND rc.activo = true
    )
  );

CREATE POLICY "Admins can insert clientes" ON public.clientes
  FOR INSERT WITH CHECK (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede crear clientes
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = clientes.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update clientes" ON public.clientes
  FOR UPDATE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede editar clientes
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = clientes.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete clientes" ON public.clientes
  FOR DELETE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede eliminar clientes
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = clientes.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS ACTUALIZADAS: PRESTAMOS
-- =====================================================

-- Eliminar políticas antiguas de préstamos
DROP POLICY IF EXISTS "Users can view own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can insert own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can update own prestamos" ON public.prestamos;
DROP POLICY IF EXISTS "Users can delete own prestamos" ON public.prestamos;

-- Nuevas políticas con soporte para roles
CREATE POLICY "Users can view prestamos based on role" ON public.prestamos
  FOR SELECT USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin ve todos los préstamos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = prestamos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve préstamos de sus rutas
    EXISTS(
      SELECT 1 FROM public.rutas
      WHERE id = prestamos.ruta_id 
      AND cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert prestamos" ON public.prestamos
  FOR INSERT WITH CHECK (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede crear préstamos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = prestamos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update prestamos" ON public.prestamos
  FOR UPDATE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede editar préstamos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = prestamos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete prestamos" ON public.prestamos
  FOR DELETE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede eliminar préstamos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = prestamos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS ACTUALIZADAS: CUOTAS
-- =====================================================

-- Eliminar políticas antiguas de cuotas
DROP POLICY IF EXISTS "Users can view own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can insert own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can update own cuotas" ON public.cuotas;
DROP POLICY IF EXISTS "Users can delete own cuotas" ON public.cuotas;

-- Nuevas políticas con soporte para roles
CREATE POLICY "Users can view cuotas based on role" ON public.cuotas
  FOR SELECT USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin ve todas las cuotas
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = cuotas.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve cuotas de sus préstamos
    EXISTS(
      SELECT 1 FROM public.prestamos pr
      JOIN public.rutas r ON r.id = pr.ruta_id
      WHERE pr.id = cuotas.prestamo_id 
      AND r.cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert cuotas" ON public.cuotas
  FOR INSERT WITH CHECK (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede crear cuotas
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = cuotas.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Política especial para UPDATE: Cobradores solo pueden editar cuotas del mismo día
CREATE POLICY "Users can update cuotas based on role" ON public.cuotas
  FOR UPDATE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede editar todas las cuotas
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = cuotas.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador puede editar solo cuotas registradas hoy por él
    EXISTS(
      SELECT 1 FROM public.prestamos pr
      JOIN public.rutas r ON r.id = pr.ruta_id
      JOIN public.pagos pg ON pg.cuota_id = cuotas.id
      WHERE pr.id = cuotas.prestamo_id 
      AND r.cobrador_id = auth.uid()
      AND pg.registrado_por = auth.uid()
      AND DATE(pg.fecha_registro) = CURRENT_DATE
    )
  );

CREATE POLICY "Admins can delete cuotas" ON public.cuotas
  FOR DELETE USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede eliminar cuotas
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = cuotas.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS ACTUALIZADAS: PAGOS
-- =====================================================

-- Eliminar políticas antiguas de pagos
DROP POLICY IF EXISTS "Users can view own pagos" ON public.pagos;
DROP POLICY IF EXISTS "Users can insert own pagos" ON public.pagos;

-- Nuevas políticas con soporte para roles
CREATE POLICY "Users can view pagos based on role" ON public.pagos
  FOR SELECT USING (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin ve todos los pagos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = pagos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador ve pagos de sus rutas
    EXISTS(
      SELECT 1 FROM public.prestamos pr
      JOIN public.rutas r ON r.id = pr.ruta_id
      WHERE pr.id = pagos.prestamo_id 
      AND r.cobrador_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pagos based on role" ON public.pagos
  FOR INSERT WITH CHECK (
    -- Usuario original (compatibilidad)
    auth.uid() = user_id
    OR
    -- Admin puede registrar pagos
    EXISTS(
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.organization_id = p.organization_id
      WHERE p.id = pagos.user_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR
    -- Cobrador puede registrar pagos de sus rutas
    EXISTS(
      SELECT 1 FROM public.prestamos pr
      JOIN public.rutas r ON r.id = pr.ruta_id
      WHERE pr.id = pagos.prestamo_id 
      AND r.cobrador_id = auth.uid()
    )
  );

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Comentarios finales
COMMENT ON TABLE public.organizations IS 'Organizaciones que agrupan administradores y cobradores';
COMMENT ON TABLE public.user_roles IS 'Roles de usuarios en organizaciones';
COMMENT ON TABLE public.rutas IS 'Rutas de cobro con capital de trabajo asignado';
COMMENT ON TABLE public.ruta_clientes IS 'Asignación de clientes a rutas';
COMMENT ON TABLE public.movimientos_capital_ruta IS 'Historial de movimientos de capital por ruta';
COMMENT ON TABLE public.gastos IS 'Gastos operativos de cobradores (gasolina, comida, etc.)';
COMMENT ON TABLE public.arqueos_caja IS 'Arqueos diarios de caja por ruta y cobrador';
