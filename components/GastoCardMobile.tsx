import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Calendar, User, FileText, Flag, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface GastoCardMobileProps {
  gasto: {
    id: string
    monto: number
    descripcion: string
    fecha_gasto: string
    estado: string
    ruta?: {
      nombre_ruta: string
      color: string
    } | null
    cobrador?: {
      nombre: string
    } | null
    revisor?: {
      nombre: string
    } | null
  }
  currency: string
  userRole: 'admin' | 'cobrador' | null
  onEdit: () => void
  onDelete: () => void
}

export function GastoCardMobile({
  gasto,
  currency,
  userRole,
  onEdit,
  onDelete
}: GastoCardMobileProps) {
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'rechazado':
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
              <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold text-lg text-purple-600">
                {formatCurrency(gasto.monto, currency)}
              </h3>
            </div>
          </div>
          <Badge className={getEstadoBadgeColor(gasto.estado)}>
            {gasto.estado}
          </Badge>
        </div>

        {/* Descripción */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 line-clamp-2">{gasto.descripcion}</p>
        </div>

        {/* Ruta */}
        {gasto.ruta && (
          <div className="flex items-center gap-2 text-sm">
            <Flag className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: gasto.ruta.color }}
            />
            <span className="text-gray-600 truncate">{gasto.ruta.nombre_ruta}</span>
          </div>
        )}

        {/* Fecha */}
        <div className="flex items-center gap-2 text-sm pt-2 border-t">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">{formatDate(gasto.fecha_gasto)}</span>
        </div>

        {/* Cobrador y Revisor (para admin) */}
        {userRole === 'admin' && (
          <div className="space-y-1 text-xs text-gray-500 pt-2 border-t">
            {gasto.cobrador && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>Cobrador: {gasto.cobrador.nombre}</span>
              </div>
            )}
            {gasto.revisor && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>Revisó: {gasto.revisor.nombre}</span>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
