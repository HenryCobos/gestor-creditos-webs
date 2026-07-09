'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Gift, TrendingUp, Users } from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { useToast } from '@/components/ui/use-toast'
import { redirectToHotmartCheckout } from '@/lib/hotmart-checkout'
import { planHasTrial, PLAN_PRICES } from '@/lib/plan-offers'

interface LimiteUsuariosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UpgradeTarget = {
  slug: 'pro' | 'business' | 'enterprise'
  nombre: string
  precio: number
  limiteUsuarios: string
  beneficios: string[]
}

function getUpgradeTarget(planSlug: string): UpgradeTarget {
  switch (planSlug) {
    case 'free':
      return {
        slug: 'pro',
        nombre: 'Plan Pro',
        precio: PLAN_PRICES.pro.monthly,
        limiteUsuarios: '3 usuarios',
        beneficios: [
          'Hasta 3 usuarios en tu equipo',
          '50 clientes y 50 préstamos',
          'PDFs sin marca de agua',
          'Soporte prioritario',
        ],
      }
    case 'pro':
      return {
        slug: 'business',
        nombre: 'Plan Business',
        precio: PLAN_PRICES.business.monthly,
        limiteUsuarios: '5 usuarios',
        beneficios: [
          'Hasta 5 usuarios en tu equipo',
          '200 clientes y 200 préstamos',
          'Gestión de rutas y cobradores',
          'Recordatorios por WhatsApp',
        ],
      }
    default:
      return {
        slug: 'enterprise',
        nombre: 'Plan Enterprise',
        precio: PLAN_PRICES.enterprise.monthly,
        limiteUsuarios: 'Usuarios ilimitados',
        beneficios: [
          'Usuarios ilimitados',
          'Clientes y préstamos ilimitados',
          'Marca blanca y API completa',
          'Soporte dedicado 24/7',
        ],
      }
  }
}

export function LimiteUsuariosDialog({ open, onOpenChange }: LimiteUsuariosDialogProps) {
  const { toast } = useToast()
  const { getCurrentPlan, usageLimits } = useSubscriptionStore()
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const plan = getCurrentPlan()
  const planSlug = plan?.slug ?? 'free'
  const upgrade = getUpgradeTarget(planSlug)

  const current = usageLimits?.usuarios.current ?? 0
  const limit = usageLimits?.usuarios.limit ?? 0
  const limitLabel = limit >= 999999 ? '∞' : String(limit)

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    const result = await redirectToHotmartCheckout(upgrade.slug, 'monthly', {
      useTrial: planHasTrial(upgrade.slug, 'monthly'),
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
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-full bg-orange-100">
            <Users className="w-7 h-7 text-orange-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Límite de usuarios alcanzado
          </DialogTitle>
          <DialogDescription className="text-center">
            Tu plan {plan?.nombre} permite hasta {limitLabel} usuario
            {limit !== 1 ? 's' : ''}. Actualmente tienes {current}/{limitLabel}.
            Actualiza para agregar más cobradores o administradores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Plan actual</p>
              <p className="font-bold text-gray-900">{plan?.nombre}</p>
              <p className="text-sm text-gray-500 mt-1">
                {current}/{limitLabel} usuarios
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-300">
              <p className="text-xs font-medium text-blue-600 mb-1">{upgrade.nombre}</p>
              <p className="font-bold text-blue-900">{upgrade.limiteUsuarios}</p>
              <p className="text-xs text-blue-600 mt-1">${upgrade.precio}/mes</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Prueba el trabajo en equipo con roles de cobrador antes de decidir.
                Con {upgrade.nombre} escala tu operación sin límites de usuarios.
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {upgrade.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? 'Redirigiendo...'
                : `Actualizar a ${upgrade.nombre} — $${upgrade.precio}/mes`}
            </Button>
            {planHasTrial(upgrade.slug, 'monthly') && (
              <p className="text-xs text-center text-green-700 flex items-center justify-center gap-1">
                <Gift className="w-3 h-3" />
                7 días de prueba gratis en Business/Enterprise
              </p>
            )}
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Quizás más tarde
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
