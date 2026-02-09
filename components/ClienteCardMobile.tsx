import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Phone, MapPin, CreditCard, Pencil, Trash2, Flag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ClienteCardMobileProps {
  cliente: {
    id: string
    nombre: string
    dni: string
    telefono?: string | null
    direccion?: string | null
    prestamos_activos?: number
    total_prestado?: number
    ruta?: {
      nombre_ruta: string
      color: string
    } | null
  }
  currency: string
  onEdit: () => void
  onDelete: () => void
}

export function ClienteCardMobile({
  cliente,
  currency,
  onEdit,
  onDelete
}: ClienteCardMobileProps) {
  const hasPrestamosActivos = (cliente.prestamos_activos || 0) > 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold truncate">{cliente.nombre}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <CreditCard className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-500">{cliente.dni}</p>
            </div>
          </div>
          {hasPrestamosActivos && (
            <Badge className="bg-blue-100 text-blue-800">
              {cliente.prestamos_activos} préstamo{cliente.prestamos_activos !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Ruta (si tiene) */}
        {cliente.ruta && (
          <div className="flex items-center gap-2 text-sm">
            <Flag className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: cliente.ruta.color }}
            />
            <span className="text-gray-600 truncate">{cliente.ruta.nombre_ruta}</span>
          </div>
        )}

        {/* Información de contacto */}
        {(cliente.telefono || cliente.direccion) && (
          <div className="space-y-1 pt-2 border-t text-sm">
            {cliente.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 truncate">{cliente.telefono}</span>
              </div>
            )}
            {cliente.direccion && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 text-xs truncate">{cliente.direccion}</span>
              </div>
            )}
          </div>
        )}

        {/* Total prestado */}
        {cliente.total_prestado !== undefined && cliente.total_prestado > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">Total Prestado</p>
            <p className="font-semibold text-lg text-purple-600">
              {formatCurrency(cliente.total_prestado, currency)}
            </p>
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
