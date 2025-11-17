-- Script SQL para crear las tablas en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled'
  subscription_id TEXT,
  stripe_customer_id TEXT,
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de préstamos
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  monto_prestado DECIMAL(10, 2) NOT NULL,
  interes_porcentaje DECIMAL(5, 2) NOT NULL,
  numero_cuotas INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  estado TEXT DEFAULT 'activo', -- 'activo', 'pagado', 'retrasado'
  monto_total DECIMAL(10, 2) NOT NULL, -- monto_prestado + intereses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cuotas
CREATE TABLE IF NOT EXISTS public.cuotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE CASCADE NOT NULL,
  numero_cuota INTEGER NOT NULL,
  monto_cuota DECIMAL(10, 2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'pagada', 'retrasada'
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos (historial)
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cuota_id UUID REFERENCES public.cuotas(id) ON DELETE CASCADE NOT NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE CASCADE NOT NULL,
  monto_pagado DECIMAL(10, 2) NOT NULL,
  fecha_pago TIMESTAMPTZ DEFAULT NOW(),
  metodo_pago TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_user_id ON public.prestamos(user_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente_id ON public.prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_user_id ON public.cuotas(user_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo_id ON public.cuotas(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_user_id ON public.pagos(user_id);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prestamos_updated_at BEFORE UPDATE ON public.prestamos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cuotas_updated_at BEFORE UPDATE ON public.cuotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS para clientes
CREATE POLICY "Users can view own clientes" ON public.clientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clientes" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clientes" ON public.clientes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clientes" ON public.clientes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para prestamos
CREATE POLICY "Users can view own prestamos" ON public.prestamos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prestamos" ON public.prestamos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prestamos" ON public.prestamos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prestamos" ON public.prestamos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para cuotas
CREATE POLICY "Users can view own cuotas" ON public.cuotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cuotas" ON public.cuotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cuotas" ON public.cuotas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cuotas" ON public.cuotas
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para pagos
CREATE POLICY "Users can view own pagos" ON public.pagos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pagos" ON public.pagos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

