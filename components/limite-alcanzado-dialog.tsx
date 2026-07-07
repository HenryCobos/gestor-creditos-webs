'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TrendingUp, Zap, Star, Check } from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { useToast } from '@/components/ui/use-toast'

interface LimiteAlcanzadoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'clientes' | 'prestamos'
  trialUsed?: boolean
}

export function LimiteAlcanzadoDialog({
  open,
  onOpenChange,
  tipo,
  trialUsed = false,
}: LimiteAlcanzadoDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { getCurrentPlan, usageLimits } = useSubscriptionStore()
  const plan = getCurrentPlan()
  const [activatingTrial, setActivatingTrial] = useState(false)

  const mensajes = {
    clientes: {
      titulo: 'Límite de Clientes Alcanzado',
      descripcion: 'Has llegado al máximo de clientes de tu plan actual.',
      icono: '👥',
      planPro: '50 clientes',
      valor: '$19/mes — se paga con 1 cliente de interés mensual',
    },
    prestamos: {
      titulo: 'Límite de Préstamos Alcanzado',
      descripcion: 'Has llegado al máximo de préstamos activos de tu plan actual.',
      icono: '📋',
      planPro: '50 préstamos',
      valor: 'Cada préstamo adicional genera retorno inmediato',
    },
  }

  const msg = mensajes[tipo]
  const limite = tipo === 'clientes'
    ? usageLimits?.clientes.limit
    : usageLimits?.prestamos.limit

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/dashboard/subscription/upgrade')
  }

  const handleActivarTrial = async () => {
    setActivatingTrial(true)
    try {
      const res = await fetch('/api/activate-trial', { method: 'POST' })
      if (res.ok) {
        toast({
          title: '¡Trial Pro activado! 7 días gratis.',
          description: 'Ya tienes acceso a 50 clientes y todas las funciones Pro.',
        })
        onOpenChange(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast({ title: 'No se pudo activar', description: data.error, variant: 'destructive' })
      }
    } finally {
      setActivatingTrial(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-full bg-orange-100 text-2xl">
            {msg.icono}
          </div>
          <DialogTitle className="text-center text-xl">
            {msg.titulo}
          </DialogTitle>
          <DialogDescription className="text-center">
            {msg.descripcion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan actual vs Pro */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Plan actual</p>
              <p className="font-bold text-gray-900">{plan?.nombre}</p>
              <p className="text-sm text-gray-500 mt-1">
                {limite === 0 ? 'Ilimitado' : `${limite} ${tipo}`}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-300">
              <p className="text-xs font-medium text-blue-600 mb-1">Plan Pro</p>
              <p className="font-bold text-blue-900">{msg.planPro}</p>
              <p className="text-xs text-blue-600 mt-1">$19/mes</p>
            </div>
          </div>

          {/* ROI */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">¿Vale la pena?</p>
                <p className="text-xs text-green-700 mt-0.5">{msg.valor}</p>
              </div>
            </div>
          </div>

          {/* Beneficios Pro */}
          <div className="space-y-1.5">
            {[
              '50 clientes y 50 préstamos activos',
              'PDFs sin marca de agua',
              'Soporte prioritario por email',
              'Reportes avanzados y historial 90 días',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {benefit}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2 pt-1">
            {!trialUsed ? (
              <>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11"
                  onClick={handleActivarTrial}
                  disabled={activatingTrial}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {activatingTrial ? 'Activando...' : 'Probar Pro 7 días GRATIS'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={handleUpgrade}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Activar plan Pro — $19/mes
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                  onClick={handleUpgrade}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Activar plan Pro — $19/mes
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            Garantía de devolución de 7 días por Hotmart
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
