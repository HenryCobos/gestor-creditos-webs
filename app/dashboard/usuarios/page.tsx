'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, UserPlus, Key, UserX, UserCheck } from 'lucide-react'
import { useStore, type Profile, type UserRole } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { UsuarioCardMobile } from '@/components/UsuarioCardMobile'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadUsageLimits } from '@/lib/subscription-helpers'
import { LimiteUsuariosDialog } from '@/components/limite-usuarios-dialog'

export default function UsuariosPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingUsuario, setEditingUsuario] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [showLimiteUsuarios, setShowLimiteUsuarios] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { usuarios, setUsuarios } = useStore()
  const { usageLimits, setUsageLimits } = useSubscriptionStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    role: 'cobrador' as UserRole,
  })

  useEffect(() => {
    checkPermissions()
    loadUsuarios()
    loadUsageLimits().then((limits) => {
      if (limits) setUsageLimits(limits)
    })
  }, [])

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      let role: 'admin' | 'cobrador' = profile.role === 'admin' ? 'admin' : 'cobrador'
      if (profile.organization_id) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle()

        if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
          role = roleData.role
        }
      }

      setIsAdmin(role === 'admin')
      setOrganizationId(profile.organization_id)
    }
  }

  const loadUsuarios = async () => {
    setLoading(true)
    console.log('[loadUsuarios] Iniciando carga con función RPC...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[loadUsuarios] No hay usuario autenticado')
      return
    }
    console.log('[loadUsuarios] Usuario autenticado:', user.id)

    // Obtener organización del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[loadUsuarios] Error obteniendo perfil:', profileError)
    }
    console.log('[loadUsuarios] Perfil:', profile)

    if (!profile?.organization_id) {
      toast({
        title: 'Acceso denegado',
        description: 'Solo administradores pueden ver esta sección',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    let role: 'admin' | 'cobrador' = profile.role === 'admin' ? 'admin' : 'cobrador'
    if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
      role = roleData.role
    }

    if (role !== 'admin') {
      toast({
        title: 'Acceso denegado',
        description: 'Solo administradores pueden ver esta sección',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Usar función RPC para obtener usuarios (bypassa RLS)
    console.log('[loadUsuarios] Llamando función get_usuarios_organizacion()...')
    const { data: usuariosData, error } = await supabase
      .rpc('get_usuarios_organizacion')

    if (error) {
      console.error('[loadUsuarios] ❌ Error cargando usuarios:', error)
      console.error('[loadUsuarios] Error detallado:', JSON.stringify(error, null, 2))
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } else {
      console.log('[loadUsuarios] ✅ Usuarios encontrados:', usuariosData?.length || 0)
      console.log('[loadUsuarios] Datos:', usuariosData)
      setUsuarios(usuariosData || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAdmin || !organizationId) {
      toast({
        title: 'Error',
        description: 'No tienes permisos para realizar esta acción',
        variant: 'destructive',
      })
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    if (editingUsuario) {
      // Actualizar usuario existente usando API con Service Role
      try {
        const response = await fetch('/api/usuarios/actualizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editingUsuario.id,
            nombre_completo: formData.nombre_completo,
            role: formData.role,
          }),
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          toast({
            title: 'Error',
            description: data.error || 'No se pudo actualizar el usuario',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente',
        })
        setOpen(false)
        resetForm()
        loadUsuarios()
      } catch (error) {
        console.error('Error updating user:', error)
        toast({
          title: 'Error',
          description: 'Error al actualizar el usuario. Intenta de nuevo.',
          variant: 'destructive',
        })
      }
    } else {
      // Crear nuevo usuario usando nuestra API
      try {
        const response = await fetch('/api/usuarios/crear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.nombre_completo,
            role: formData.role,
            organizationId: organizationId,
            invitedBy: currentUser.id
          }),
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          if (response.status === 403 && data.code === 'USER_LIMIT_REACHED') {
            setShowLimiteUsuarios(true)
          }
          toast({
            title: 'Error',
            description: data.error || 'No se pudo crear el usuario',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Éxito',
          description: `${formData.role === 'admin' ? 'Administrador' : 'Cobrador'} creado correctamente`,
        })

        setOpen(false)
        resetForm()
        loadUsuarios()
        loadUsageLimits().then((limits) => {
          if (limits) setUsageLimits(limits)
        })
      } catch (error) {
        console.error('Error creating user:', error)
        toast({
          title: 'Error',
          description: 'Error al crear el usuario. Intenta de nuevo.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleToggleActivo = async (usuario: Profile) => {
    if (!isAdmin) return

    try {
      const response = await fetch('/api/usuarios/toggle-activo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: usuario.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo cambiar el estado del usuario',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: `Usuario ${data.activo ? 'activado' : 'desactivado'} correctamente`,
      })
      loadUsuarios()
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del usuario',
        variant: 'destructive',
      })
    }
  }

  const handleResetPassword = async (usuario: Profile) => {
    // Solicitar nueva contraseña temporal
    const tempPassword = prompt(
      `Ingresa una contraseña temporal para ${usuario.email}:\n\n` +
      `(Mínimo 6 caracteres. El usuario podrá cambiarla después)`
    )

    if (!tempPassword) return // Usuario canceló

    if (tempPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: usuario.id,
          newPassword: tempPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al resetear contraseña')
      }

      toast({
        title: 'Éxito',
        description: `Contraseña restablecida para ${usuario.email}`,
        duration: 8000,
      })

      // Copiar contraseña al portapapeles
      navigator.clipboard.writeText(tempPassword).then(() => {
        toast({
          title: 'Contraseña copiada',
          description: 'La contraseña temporal se copió al portapapeles',
          duration: 5000,
        })
      })

    } catch (error: any) {
      console.error('Error al resetear contraseña:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo restablecer la contraseña',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (usuario: Profile) => {
    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre_completo || usuario.email}? Esta acción no se puede deshacer.`)) return

    if (!isAdmin) return

    try {
      const response = await fetch('/api/usuarios/eliminar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: usuario.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el usuario',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      })
      loadUsuarios()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nombre_completo: '',
      role: 'cobrador',
    })
    setEditingUsuario(null)
    setOpen(false)
  }

  const handleEdit = (usuario: Profile) => {
    setFormData({
      email: usuario.email,
      password: '', // No mostrar password
      nombre_completo: usuario.nombre_completo || '',
      role: usuario.role || 'cobrador',
    })
    setEditingUsuario(usuario)
    setOpen(true)
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <UserX className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="text-lg font-semibold">Acceso Restringido</h3>
              <p className="text-sm text-gray-500">
                Solo administradores pueden acceder a esta sección
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            Administra cobradores y administradores
            {usageLimits?.usuarios && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Usuarios: {usageLimits.usuarios.current}/
                {usageLimits.usuarios.limit >= 999999 ? '∞' : usageLimits.usuarios.limit}
              </span>
            )}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              if (usageLimits && !usageLimits.usuarios.canAdd) {
                setShowLimiteUsuarios(true)
                return
              }
              setOpen(true)
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription>
                {editingUsuario 
                  ? 'Actualiza los datos del usuario'
                  : 'Crea una cuenta para un nuevo cobrador o administrador'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUsuario}
                  placeholder="cobrador@ejemplo.com"
                />
              </div>

              {!editingUsuario && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-gray-500">
                    El usuario podrá cambiarla después del primer acceso
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                <Input
                  id="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  required
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobrador">
                      👤 Cobrador (Acceso limitado a sus rutas)
                    </SelectItem>
                    <SelectItem value="admin">
                      🔑 Administrador (Acceso completo)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {formData.role === 'cobrador' 
                    ? 'Podrá ver solo sus rutas, registrar pagos y gastos'
                    : 'Tendrá acceso completo al sistema'}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUsuario ? 'Actualizar' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios de la Organización</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <UserPlus className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500">No hay usuarios registrados aún</p>
              <p className="text-sm text-gray-400">
                Crea tu primer cobrador o administrador
              </p>
            </div>
          ) : (
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.nombre_completo || 'Sin nombre'}
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant={usuario.role === 'admin' ? 'default' : 'secondary'}>
                        {usuario.role === 'admin' ? '🔑 Admin' : '👤 Cobrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.activo ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {usuario.ultimo_acceso ? formatDate(usuario.ultimo_acceso) : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(usuario)}
                          title="Editar usuario"
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActivo(usuario)}
                          title={usuario.activo ? 'Desactivar' : 'Activar'}
                        >
                          {usuario.activo ? (
                            <UserX className="h-4 w-4 text-orange-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPassword(usuario)}
                          title="Restablecer contraseña"
                        >
                          <Key className="h-4 w-4 text-purple-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario)}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {usuarios.map((usuario) => (
                <UsuarioCardMobile
                  key={usuario.id}
                  usuario={usuario}
                  onEdit={() => handleEdit(usuario)}
                  onResetPassword={() => handleResetPassword(usuario)}
                  onToggleStatus={() => handleToggleActivo(usuario)}
                  onDelete={() => handleDelete(usuario)}
                />
              ))}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      <LimiteUsuariosDialog
        open={showLimiteUsuarios}
        onOpenChange={setShowLimiteUsuarios}
      />
    </div>
  )
}
