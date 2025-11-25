-- Agregar campos para soporte de Hotmart
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hotmart_subscription_id TEXT, -- Código de suscriptor en Hotmart (subscriber_code)
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual'; -- 'hotmart', 'paypal', 'manual', etc.

-- Comentario para documentación
COMMENT ON COLUMN public.profiles.hotmart_subscription_id IS 'Código único de la suscripción en Hotmart (subscriber_code)';
COMMENT ON COLUMN public.profiles.payment_method IS 'Método de pago actual de la suscripción';

