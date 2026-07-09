'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Star, Check, Gift } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { redirectToHotmartCheckout } from '@/lib/hotmart-checkout'
import { planHasTrial } from '@/lib/plan-offers'

type FeatureGateVariant = 'pdf' | 'multiusuario' | 'api' | 'custom'

interface FeatureGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: FeatureGateVariant
  customTitle?: string
  customDescription?: string
  requiredPlan?: string
}

const FEATURE_CONFIG: Record<
  FeatureGateVariant,
  {
    icon: string
    title: string
    description: string
    benefits: string[]
    plan: string
    price: string
    slug: 'pro' | 'business' | 'enterprise'
    period: 'monthly' | 'yearly'
  }
> = {
  pdf: {
    icon: '📄',
    title: 'PDFs sin marca de agua — Plan Pro',
    description:
      'Los reportes y contratos PDF sin marca de agua están disponibles en el Plan Pro. Tus clientes verán documentos completamente profesionales.',
    benefits: [
      'Contratos PDF sin marca de agua',
      'Comprobantes de pago profesionales',
      'Reportes exportables para contabilidad',
      '50 clientes y 50 préstamos activos',
    ],
    plan: 'Pro',
    price: '$19/mes',
    slug: 'pro',
    period: 'monthly',
  },
  multiusuario: {
    icon: '👥',
    title: 'Más usuarios en tu equipo',
    description:
      'Has alcanzado el límite de usuarios de tu plan. Actualiza para agregar más cobradores y administradores.',
    benefits: [
      'Más usuarios en tu equipo',
      'Roles de admin y cobrador',
      'Mayor capacidad de clientes y préstamos',
      'Funciones avanzadas según plan',
    ],
    plan: 'Pro',
    price: '$19/mes',
    slug: 'pro',
    period: 'monthly',
  },
  api: {
    icon: '⚡',
    title: 'API de integración — Plan Enterprise',
    description:
      'Conecta el gestor de créditos con tus otros sistemas mediante API. Disponible en el Plan Enterprise.',
    benefits: [
      'Acceso completo a la API REST',
      'Clientes y préstamos ilimitados',
      'Soporte dedicado 24/7',
      'Marca blanca disponible',
    ],
    plan: 'Enterprise',
    price: '$179/mes',
    slug: 'enterprise',
    period: 'monthly',
  },
  custom: {
    icon: '🔒',
    title: 'Función Premium',
    description: 'Esta función está disponible en planes de pago.',
    benefits: ['Más capacidad', 'Funciones avanzadas', 'Soporte prioritario'],
    plan: 'Pro',
    price: '$19/mes',
    slug: 'pro',
    period: 'monthly',
  },
}

export function FeatureGateDialog({
  open,
  onOpenChange,
  variant,
  customTitle,
  customDescription,
  requiredPlan,
}: FeatureGateDialogProps) {
  const { toast } = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const config = FEATURE_CONFIG[variant]
  const title = customTitle || config.title
  const description = customDescription || config.description
  const plan = requiredPlan || config.plan
  const hasTrial = planHasTrial(config.slug, config.period)

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    const result = await redirectToHotmartCheckout(config.slug, config.period, {
      useTrial: hasTrial,
    })
    if (!result.ok) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      setCheckoutLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-full bg-purple-100 text-2xl">
            {config.icon}
          </div>
          <DialogTitle className="text-center text-lg">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Plan {plan} incluye:
            </p>
            {config.benefits.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>

          {hasTrial && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              <Gift className="w-4 h-4 shrink-0" />
              7 días de prueba gratis disponibles en Hotmart
            </div>
          )}

          <div className="space-y-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 h-11"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {hasTrial ? (
                <Gift className="w-4 h-4 mr-2" />
              ) : (
                <Star className="w-4 h-4 mr-2" />
              )}
              {checkoutLoading
                ? 'Redirigiendo a Hotmart...'
                : hasTrial
                ? `Probar ${plan} 7 días gratis →`
                : `Activar Plan ${plan} — ${config.price}`}
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              Quizás más tarde
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Pago seguro en Hotmart · Garantía de devolución 7 días
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
