import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Flag, DollarSign, TrendingDown, TrendingUp, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ArqueoCardMobileProps {
  arqueo: {
    id: string
    fecha_arqueo: string
    dinero_esperado: number
    dinero_reportado: number
    diferencia: number
    estado: string
    revisado_por?: string | null
    notas?: string | null
    ruta?: {
      nombre_ruta: string
      color: string | null
    } | null
    cobrador?: {
      nombre_completo?: string
      email?: string
    } | null
  }
  currency: string
  userRole: 'admin' | 'cobrador' | null
  onView: () => void
}

export function ArqueoCardMobile({
  arqueo,
  currency,
  userRole,
  onView
}: ArqueoCardMobileProps) {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'cuadra':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'faltante':
        return { color: 'bg-red-100 text-red-800', icon: XCircle }
      case 'sobrante':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    }
  }

  const estadoBadge = getEstadoBadge(arqueo.estado)
  const EstadoIcon = estadoBadge.icon

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="font-semibold">{formatDate(arqueo.fecha_arqueo)}</span>
          </div>
          <Badge className={estadoBadge.color}>
            <EstadoIcon className="h-3 w-3 mr-1" />
            {arqueo.estado}
          </Badge>
        </div>

        {/* Cobrador (para admin) */}
        {userRole === 'admin' && arqueo.cobrador && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 truncate">
              {arqueo.cobrador.nombre_completo || arqueo.cobrador.email || 'N/A'}
            </span>
          </div>
        )}

        {/* Ruta */}
        {arqueo.ruta && (
          <div className="flex items-center gap-2 text-sm">
            <Flag className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: arqueo.ruta.color || '#3B82F6' }}
            />
            <span className="text-gray-600 truncate">{arqueo.ruta.nombre_ruta}</span>
          </div>
        )}

        {/* Montos */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">Esperado</p>
            <p className="font-semibold text-blue-600">
              {formatCurrency(arqueo.dinero_esperado, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reportado</p>
            <p className="font-semibold text-purple-600">
              {formatCurrency(arqueo.dinero_reportado, currency)}
            </p>
          </div>
        </div>

        {/* Diferencia */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {arqueo.diferencia < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : arqueo.diferencia > 0 ? (
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <span className="text-xs text-gray-500">Diferencia</span>
          </div>
          <span className={`font-semibold ${
            arqueo.diferencia < 0 
              ? 'text-red-600' 
              : arqueo.diferencia > 0 
              ? 'text-yellow-600' 
              : 'text-green-600'
          }`}>
            {formatCurrency(Math.abs(arqueo.diferencia), currency)}
          </span>
        </div>

        {/* Estado de revisión */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-gray-500">Revisado</span>
          {arqueo.revisado_por ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Sí
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-800">
              <XCircle className="h-3 w-3 mr-1" />
              No
            </Badge>
          )}
        </div>

        {/* Notas */}
        {arqueo.notas && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Notas</p>
            <p className="text-sm text-gray-700 line-clamp-2">{arqueo.notas}</p>
          </div>
        )}

        {/* Acción */}
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onView}
            className="w-full"
          >
            <Eye className="mr-1 h-4 w-4" />
            Ver Detalles
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
