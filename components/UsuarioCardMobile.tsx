import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Key, Edit, Trash2, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Profile {
  id: string
  email: string
  nombre_completo: string | null
  role: 'admin' | 'cobrador' | null
  activo: boolean
  ultimo_acceso: string | null
  created_at: string
}

interface UsuarioCardMobileProps {
  usuario: Profile
  onEdit: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

export function UsuarioCardMobile({
  usuario,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete
}: UsuarioCardMobileProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold truncate">
                {usuario.nombre_completo || 'Sin nombre'}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
            </div>
          </div>
          <Badge 
            variant={usuario.activo ? 'default' : 'secondary'}
            className={usuario.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
          >
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        {/* Información */}
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-gray-500 text-xs">Rol</p>
              <p className="font-medium capitalize">
                {usuario.role === 'admin' ? 'Administrador' : 'Cobrador'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Último Acceso</p>
              <p className="font-medium text-xs">
                {usuario.ultimo_acceso ? formatDate(usuario.ultimo_acceso) : 'Nunca'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onEdit}
            className="w-full"
          >
            <Edit className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onResetPassword}
            className="w-full"
          >
            <Key className="mr-1 h-4 w-4" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onToggleStatus}
            className="w-full"
          >
            <Shield className="mr-1 h-4 w-4" />
            {usuario.activo ? 'Desactivar' : 'Activar'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDelete}
            className="w-full text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
