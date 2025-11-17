'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'

interface LimiteAlcanzadoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'clientes' | 'prestamos'
}

export function LimiteAlcanzadoDialog({
  open,
  onOpenChange,
  tipo,
}: LimiteAlcanzadoDialogProps) {
  const router = useRouter()
  const { getCurrentPlan, usageLimits } = useSubscriptionStore()
  const plan = getCurrentPlan()

  const mensajes = {
    clientes: {
      titulo: '¡Límite de Clientes Alcanzado!',
      descripcion: 'Has alcanzado el límite de clientes de tu plan actual.',
    },
    prestamos: {
      titulo: '¡Límite de Préstamos Alcanzado!',
      descripcion: 'Has alcanzado el límite de préstamos activos de tu plan actual.',
    },
  }

  const limite = tipo === 'clientes' 
    ? usageLimits?.clientes.limit 
    : usageLimits?.prestamos.limit

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/dashboard/subscription')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            {mensajes[tipo].titulo}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mensajes[tipo].descripcion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Plan Actual:</span>
              <span className="font-semibold">{plan?.nombre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Límite:</span>
              <span className="font-semibold">
                {limite === 0 ? 'Ilimitado' : `${limite} ${tipo}`}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  ¡Haz crecer tu negocio!
                </h4>
                <p className="text-sm text-blue-700">
                  Actualiza tu plan para agregar más {tipo} y desbloquear funciones premium.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleUpgrade}
            >
              Ver Planes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

