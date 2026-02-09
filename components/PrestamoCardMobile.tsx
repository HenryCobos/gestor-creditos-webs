import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, DollarSign, Calendar, Eye, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PrestamoCardMobileProps {
  prestamo: {
    id: string
    cliente?: {
      nombre: string
      dni: string
    }
    monto_prestado: number
    interes_porcentaje: number
    monto_total: number
    numero_cuotas: number
    fecha_inicio: string
    estado: string
    ruta?: {
      nombre_ruta: string
      color: string | null
    } | null
  }
  currency: string
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PrestamoCardMobile({
  prestamo,
  currency,
  onView,
  onEdit,
  onDelete
}: PrestamoCardMobileProps) {
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800'
      case 'pagado':
        return 'bg-blue-100 text-blue-800'
      case 'retrasado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold truncate">{prestamo.cliente?.nombre || 'Sin cliente'}</h3>
            </div>
            {prestamo.cliente?.dni && (
              <p className="text-xs text-gray-500 mt-0.5">DNI: {prestamo.cliente.dni}</p>
            )}
          </div>
          <Badge className={getEstadoBadgeColor(prestamo.estado)}>
            {prestamo.estado}
          </Badge>
        </div>

        {/* Ruta (si tiene) */}
        {prestamo.ruta && (
          <div className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: prestamo.ruta.color || '#3B82F6' }}
            />
            <span className="text-gray-600 truncate">{prestamo.ruta.nombre_ruta}</span>
          </div>
        )}

        {/* Información financiera */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">Prestado</p>
            <p className="font-semibold text-blue-600">
              {formatCurrency(prestamo.monto_prestado, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total a Pagar</p>
            <p className="font-semibold text-purple-600">
              {formatCurrency(prestamo.monto_total, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Interés
            </p>
            <p className="font-medium">{prestamo.interes_porcentaje}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cuotas</p>
            <p className="font-medium">{prestamo.numero_cuotas}</p>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2 text-sm pt-2 border-t">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Inicio: {formatDate(prestamo.fecha_inicio)}</span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onView}
            className="flex-1"
          >
            <Eye className="mr-1 h-4 w-4" />
            Ver
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
