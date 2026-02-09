import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, History, Calendar, User } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CuotaCardMobileProps {
  cuota: {
    id: string
    numero_cuota: number
    monto_cuota: number
    fecha_vencimiento: string
    fecha_pago: string | null
    estado: 'pendiente' | 'pagada' | 'retrasada'
    monto_pagado: number
    prestamo: {
      id: string
      monto_prestado: number
      cliente: {
        nombre: string
        dni: string
      }
    }
    cobrador_nombre?: string | null
  }
  currency: string
  userRole?: 'admin' | 'cobrador' | null
  onRegistrarPago: () => void
  onVerPagos?: () => void
}

export function CuotaCardMobile({
  cuota,
  currency,
  userRole,
  onRegistrarPago,
  onVerPagos
}: CuotaCardMobileProps) {
  const montoPendiente = cuota.monto_cuota - cuota.monto_pagado
  const isPagada = cuota.estado === 'pagada'

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{cuota.prestamo.cliente.nombre}</h3>
            <p className="text-sm text-gray-500">Cuota #{cuota.numero_cuota}</p>
          </div>
          <Badge 
            variant={
              cuota.estado === 'retrasada' ? 'destructive' : 
              cuota.estado === 'pagada' ? 'default' : 
              'secondary'
            }
            className={
              cuota.estado === 'pagada' ? 'bg-green-100 text-green-800' :
              cuota.estado === 'retrasada' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }
          >
            {cuota.estado}
          </Badge>
        </div>

        {/* Cobrador (solo para admin) */}
        {userRole === 'admin' && cuota.cobrador_nombre && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{cuota.cobrador_nombre}</span>
          </div>
        )}

        {/* Información principal */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Monto Total</p>
            <p className="font-semibold">{formatCurrency(cuota.monto_cuota, currency)}</p>
          </div>
          <div>
            <p className="text-gray-500">Pagado</p>
            <p className="font-semibold text-green-600">
              {formatCurrency(cuota.monto_pagado, currency)}
            </p>
          </div>
          {!isPagada && (
            <>
              <div>
                <p className="text-gray-500">Pendiente</p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(montoPendiente, currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Vencimiento</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(cuota.fecha_vencimiento)}
                </p>
              </div>
            </>
          )}
          {isPagada && cuota.fecha_pago && (
            <div className="col-span-2">
              <p className="text-gray-500">Fecha de Pago</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(cuota.fecha_pago)}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          {!isPagada && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onRegistrarPago}
            >
              <DollarSign className="mr-1 h-4 w-4" />
              Pagar
            </Button>
          )}
          {cuota.monto_pagado > 0 && onVerPagos && (
            <Button 
              variant="outline" 
              size="sm" 
              className={isPagada ? 'flex-1' : ''}
              onClick={onVerPagos}
            >
              <History className="mr-1 h-4 w-4" />
              Historial
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
