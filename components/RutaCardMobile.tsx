import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, User, Users, TrendingUp, Pencil, Trash2, UserPlus, UserX } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RutaCardMobileProps {
  ruta: {
    id: string
    nombre_ruta: string
    descripcion?: string | null
    color: string
    capital_inicial: number
    capital_actual: number
    cobrador?: {
      nombre: string
    } | null
    clientes_count?: number
    prestamos_activos?: number
  }
  currency: string
  onEdit: () => void
  onDelete: () => void
  onAssignCobrador: () => void
  onRemoveCobrador?: () => void
  onAssignClientes: () => void
}

export function RutaCardMobile({
  ruta,
  currency,
  onEdit,
  onDelete,
  onAssignCobrador,
  onRemoveCobrador,
  onAssignClientes
}: RutaCardMobileProps) {
  const gananciaActual = ruta.capital_actual - ruta.capital_inicial
  const porcentajeGanancia = ruta.capital_inicial > 0 
    ? ((gananciaActual / ruta.capital_inicial) * 100) 
    : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: ruta.color }}
            />
            <h3 className="font-semibold truncate">{ruta.nombre_ruta}</h3>
          </div>
          {ruta.prestamos_activos !== undefined && ruta.prestamos_activos > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              {ruta.prestamos_activos} préstamo{ruta.prestamos_activos !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Descripción */}
        {ruta.descripcion && (
          <p className="text-sm text-gray-600 line-clamp-2">{ruta.descripcion}</p>
        )}

        {/* Cobrador */}
        <div className="flex items-center gap-2 text-sm pt-2 border-t">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-gray-700">
            {ruta.cobrador?.nombre || 'Sin cobrador asignado'}
          </span>
        </div>

        {/* Clientes */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">
            {ruta.clientes_count || 0} cliente{ruta.clientes_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Capital */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">Capital Inicial</p>
            <p className="font-semibold text-blue-600">
              {formatCurrency(ruta.capital_inicial, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Capital Actual</p>
            <p className="font-semibold text-purple-600">
              {formatCurrency(ruta.capital_actual, currency)}
            </p>
          </div>
        </div>

        {/* Ganancia */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${gananciaActual >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-xs text-gray-500">Ganancia</span>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${gananciaActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(gananciaActual, currency)}
            </p>
            <p className={`text-xs ${porcentajeGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {porcentajeGanancia >= 0 ? '+' : ''}{porcentajeGanancia.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Acciones de gestión */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAssignCobrador}
              className="flex-1"
            >
              <UserPlus className="mr-1 h-3 w-3" />
              {ruta.cobrador ? 'Cambiar' : 'Asignar'} Cobrador
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAssignClientes}
              className="flex-1"
            >
              <Users className="mr-1 h-3 w-3" />
              Asignar Clientes
            </Button>
          </div>
          
          {/* Acciones principales */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onEdit}
              className="flex-1"
            >
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
            {ruta.cobrador && onRemoveCobrador && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRemoveCobrador}
                className="text-orange-600 hover:text-orange-700"
              >
                <UserX className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
