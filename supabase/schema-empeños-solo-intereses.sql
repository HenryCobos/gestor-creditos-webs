-- Script SQL para agregar soporte de empeños y modo "solo intereses"
-- Ejecutar esto en Supabase SQL Editor

-- 1. Agregar campo tipo_prestamo a la tabla prestamos
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS tipo_prestamo TEXT DEFAULT 'amortizacion' 
CHECK (tipo_prestamo IN ('amortizacion', 'solo_intereses', 'empeño'));

-- 2. Actualizar préstamos existentes
UPDATE public.prestamos 
SET tipo_prestamo = 'amortizacion' 
WHERE tipo_prestamo IS NULL;

-- 3. Agregar campo fecha_fin para préstamos "solo intereses" (cuando se paga el capital)
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- 4. Agregar campo de días de gracia para renovaciones de empeños
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS dias_gracia INTEGER DEFAULT 0;

-- 5. Crear tabla de garantías/colaterales para empeños
CREATE TABLE IF NOT EXISTS public.garantias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prestamo_id UUID REFERENCES public.prestamos(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL,
  categoria TEXT, -- joyas, electronica, vehiculo, electrodomesticos, herramientas, otros
  valor_estimado DECIMAL(10, 2),
  foto_url TEXT,
  fecha_vencimiento DATE,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'liquidado', 'renovado', 'recuperado')),
  fecha_liquidacion DATE,
  monto_liquidacion DECIMAL(10, 2),
  fecha_renovacion DATE,
  numero_renovaciones INTEGER DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Índices para garantías
CREATE INDEX IF NOT EXISTS idx_garantias_user_id ON public.garantias(user_id);
CREATE INDEX IF NOT EXISTS idx_garantias_prestamo_id ON public.garantias(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_garantias_estado ON public.garantias(estado);
CREATE INDEX IF NOT EXISTS idx_garantias_fecha_vencimiento ON public.garantias(fecha_vencimiento);

-- 7. RLS para garantías
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own garantias" ON public.garantias
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garantias" ON public.garantias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garantias" ON public.garantias
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garantias" ON public.garantias
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Trigger para updated_at en garantías
CREATE TRIGGER update_garantias_updated_at BEFORE UPDATE ON public.garantias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Función para verificar vencimiento de empeños (para usar en cron jobs)
CREATE OR REPLACE FUNCTION public.get_empeños_vencidos(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  prestamo_id UUID,
  cliente_id UUID,
  cliente_nombre TEXT,
  garantia_id UUID,
  garantia_descripcion TEXT,
  fecha_vencimiento DATE,
  dias_vencido INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.cliente_id,
    c.nombre,
    g.id,
    g.descripcion,
    g.fecha_vencimiento,
    EXTRACT(DAY FROM (CURRENT_DATE - g.fecha_vencimiento))::INTEGER as dias_vencido
  FROM public.prestamos p
  INNER JOIN public.clientes c ON c.id = p.cliente_id
  LEFT JOIN public.garantias g ON g.prestamo_id = p.id
  WHERE p.tipo_prestamo = 'empeño'
    AND g.estado = 'activo'
    AND g.fecha_vencimiento < CURRENT_DATE
    AND (user_uuid IS NULL OR p.user_id = user_uuid)
  ORDER BY g.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

