'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Zap, Star, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

type FeatureGateVariant = 'pdf' | 'multiusuario' | 'api' | 'custom'

interface FeatureGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: FeatureGateVariant
  trialUsed?: boolean
  customTitle?: string
  customDescription?: string
  requiredPlan?: string
}

const FEATURE_CONFIG: Record<FeatureGateVariant, {
  icon: string
  title: string
  description: string
  benefits: string[]
  plan: string
  price: string
}> = {
  pdf: {
    icon: '📄',
    title: 'PDFs sin marca de agua — Plan Pro',
    description: 'Los reportes y contratos PDF sin marca de agua están disponibles en el Plan Pro. Tus clientes verán documentos completamente profesionales.',
    benefits: [
      'Contratos PDF sin marca de agua',
      'Comprobantes de pago profesionales',
      'Reportes exportables para contabilidad',
      '50 clientes y 50 préstamos activos',
    ],
    plan: 'Pro',
    price: '$19/mes',
  },
  multiusuario: {
    icon: '👥',
    title: 'Multi-usuario — Plan Business',
    description: 'Agrega cobradores y administradores a tu equipo. El Plan Business te permite colaborar con hasta 3 usuarios.',
    benefits: [
      'Hasta 3 usuarios en tu equipo',
      'Roles de admin y cobrador',
      '200 clientes y 200 préstamos',
      'Gestión de rutas de cobranza',
    ],
    plan: 'Business',
    price: '$49/mes',
  },
  api: {
    icon: '⚡',
    title: 'API de integración — Plan Enterprise',
    description: 'Conecta el gestor de créditos con tus otros sistemas mediante API. Disponible en el Plan Enterprise.',
    benefits: [
      'Acceso completo a la API REST',
      'Clientes y préstamos ilimitados',
      'Soporte dedicado 24/7',
      'Marca blanca disponible',
    ],
    plan: 'Enterprise',
    price: '$179/mes',
  },
  custom: {
    icon: '🔒',
    title: 'Función Premium',
    description: 'Esta función está disponible en planes de pago.',
    benefits: ['Más capacidad', 'Funciones avanzadas', 'Soporte prioritario'],
    plan: 'Pro',
    price: '$19/mes',
  },
}

export function FeatureGateDialog({
  open,
  onOpenChange,
  variant,
  trialUsed = false,
  customTitle,
  customDescription,
  requiredPlan,
}: FeatureGateDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activatingTrial, setActivatingTrial] = useState(false)

  const config = FEATURE_CONFIG[variant]
  const title = customTitle || config.title
  const description = customDescription || config.description
  const plan = requiredPlan || config.plan

  const showTrial = !trialUsed && (variant === 'pdf' || variant === 'custom')

  const handleActivarTrial = async () => {
    setActivatingTrial(true)
    try {
      const res = await fetch('/api/activate-trial', { method: 'POST' })
      if (res.ok) {
        toast({
          title: '¡Trial Pro activado!',
          description: 'Tienes 7 días gratis con todas las funciones Pro.',
        })
        onOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast({ title: 'No disponible', description: data.error, variant: 'destructive' })
      }
    } finally {
      setActivatingTrial(false)
    }
  }

  const handleVerPlanes = () => {
    onOpenChange(false)
    router.push('/dashboard/subscription')
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
          {/* Beneficios */}
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

          {/* CTAs */}
          <div className="space-y-2">
            {showTrial && (
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11"
                onClick={handleActivarTrial}
                disabled={activatingTrial}
              >
                <Zap className="w-4 h-4 mr-2" />
                {activatingTrial ? 'Activando...' : 'Probar Pro 7 días GRATIS'}
              </Button>
            )}
            <Button
              variant={showTrial ? 'outline' : 'default'}
              className={`w-full h-10 ${!showTrial ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              onClick={handleVerPlanes}
            >
              <Star className="w-4 h-4 mr-2" />
              Activar Plan {plan} — {config.price}
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
            Garantía de devolución de 7 días · Sin contratos forzosos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
