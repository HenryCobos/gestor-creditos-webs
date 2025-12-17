-- Script SQL para Reestructuración Completa del Sistema de Préstamos
-- Este script NO afecta datos existentes
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. AGREGAR NUEVAS COLUMNAS A TABLA PRESTAMOS
-- ============================================

-- Columnas para Ventas a Crédito
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS precio_contado DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS enganche DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS cargos_adicionales DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS descripcion_producto TEXT;

-- Columna para excluir domingos (si no existe)
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS excluir_domingos BOOLEAN DEFAULT false;

-- ============================================
-- 2. ACTUALIZAR TIPO DE PRÉSTAMO PARA INCLUIR VENTA_CREDITO
-- ============================================

-- Eliminar constraint anterior si existe
ALTER TABLE public.prestamos 
DROP CONSTRAINT IF EXISTS prestamos_tipo_prestamo_check;

-- Agregar nuevo constraint con todos los tipos
ALTER TABLE public.prestamos 
ADD CONSTRAINT prestamos_tipo_prestamo_check 
CHECK (tipo_prestamo IN ('amortizacion', 'solo_intereses', 'empeño', 'venta_credito'));

-- ============================================
-- 3. TABLA DE ABONOS A CAPITAL (Para Casas de Empeño)
-- ============================================

CREATE TABLE IF NOT EXISTS public.abonos_capital (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE CASCADE NOT NULL,
  monto_abonado DECIMAL(10, 2) NOT NULL CHECK (monto_abonado > 0),
  saldo_anterior DECIMAL(10, 2) NOT NULL,
  saldo_nuevo DECIMAL(10, 2) NOT NULL,
  interes_recalculado DECIMAL(10, 2), -- Nuevo interés después del abono
  fecha_abono TIMESTAMPTZ DEFAULT NOW(),
  metodo_pago TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLA DE PRODUCTOS (Para Tiendas que Venden a Crédito)
-- ============================================

CREATE TABLE IF NOT EXISTS public.productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT, -- SKU o código interno
  nombre TEXT NOT NULL,
  categoria TEXT, -- motos, muebles, electrodomesticos, etc.
  descripcion TEXT,
  precio_contado DECIMAL(10, 2) NOT NULL CHECK (precio_contado >= 0),
  precio_credito DECIMAL(10, 2), -- Precio sugerido a crédito
  margen_credito DECIMAL(5, 2), -- Porcentaje de ganancia en crédito
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER DEFAULT 0,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE HISTORIAL DE RENOVACIONES (Para Empeños)
-- ============================================

CREATE TABLE IF NOT EXISTS public.renovaciones_empeno (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE CASCADE NOT NULL,
  garantia_id UUID REFERENCES public.garantias(id) ON DELETE SET NULL,
  fecha_renovacion TIMESTAMPTZ DEFAULT NOW(),
  monto_intereses_pagados DECIMAL(10, 2) NOT NULL, -- Intereses que pagó para renovar
  nueva_fecha_vencimiento DATE NOT NULL,
  dias_extendidos INTEGER NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

-- Índices para abonos_capital
CREATE INDEX IF NOT EXISTS idx_abonos_capital_user_id ON public.abonos_capital(user_id);
CREATE INDEX IF NOT EXISTS idx_abonos_capital_prestamo_id ON public.abonos_capital(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_abonos_capital_fecha ON public.abonos_capital(fecha_abono);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_user_id ON public.productos(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON public.productos(codigo);

-- Índices para renovaciones
CREATE INDEX IF NOT EXISTS idx_renovaciones_user_id ON public.renovaciones_empeno(user_id);
CREATE INDEX IF NOT EXISTS idx_renovaciones_prestamo_id ON public.renovaciones_empeno(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_renovaciones_garantia_id ON public.renovaciones_empeno(garantia_id);

-- ============================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE TRIGGER update_abonos_capital_updated_at 
BEFORE UPDATE ON public.abonos_capital
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at 
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.abonos_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovaciones_empeno ENABLE ROW LEVEL SECURITY;

-- Políticas para abonos_capital
CREATE POLICY "Users can view their own abonos_capital" 
  ON public.abonos_capital FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own abonos_capital" 
  ON public.abonos_capital FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Políticas para productos
CREATE POLICY "Users can view their own productos" 
  ON public.productos FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own productos" 
  ON public.productos FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own productos" 
  ON public.productos FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own productos" 
  ON public.productos FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas para renovaciones_empeno
CREATE POLICY "Users can view their own renovaciones" 
  ON public.renovaciones_empeno FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own renovaciones" 
  ON public.renovaciones_empeno FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. VERIFICACIÓN DE DATOS EXISTENTES
-- ============================================

-- Verificar que préstamos existentes mantienen sus valores
-- Este query NO modifica nada, solo verifica
SELECT 
  COUNT(*) as total_prestamos,
  tipo_prestamo,
  COUNT(CASE WHEN precio_contado IS NULL THEN 1 END) as sin_precio_contado,
  COUNT(CASE WHEN enganche IS NULL THEN 1 END) as sin_enganche
FROM public.prestamos
GROUP BY tipo_prestamo;

-- ============================================
-- SCRIPT COMPLETADO ✅
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Este script es SEGURO - No modifica datos existentes
-- 2. Solo agrega columnas OPCIONALES (pueden ser NULL)
-- 3. Préstamos existentes seguirán funcionando sin cambios
-- 4. Las nuevas tablas están vacías inicialmente
-- 5. RLS está habilitado para seguridad

-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que no hay errores
-- 3. Actualizar código frontend para usar nuevas funcionalidades

