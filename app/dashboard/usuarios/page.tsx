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
  DialogTrigger,
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

export default function UsuariosPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingUsuario, setEditingUsuario] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const { usuarios, setUsuarios } = useStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    role: 'cobrador' as UserRole,
  })

  useEffect(() => {
    checkPermissions()
    loadUsuarios()
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
      setIsAdmin(profile.role === 'admin')
      setOrganizationId(profile.organization_id)
    }
  }

  const loadUsuarios = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      toast({
        title: 'Acceso denegado',
        description: 'Solo administradores pueden ver esta sección',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Obtener todos los usuarios de la organización
    const { data: usuariosData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role, organization_id)
      `)
      .eq('user_roles.organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } else {
      // Mapear datos correctamente
      const mappedUsers = usuariosData.map((u: any) => ({
        ...u,
        role: u.user_roles[0]?.role || null,
      }))
      setUsuarios(mappedUsers)
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
      // Actualizar usuario existente
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nombre_completo: formData.nombre_completo,
        })
        .eq('id', editingUsuario.id)

      // Actualizar rol si cambió
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: formData.role })
        .eq('user_id', editingUsuario.id)
        .eq('organization_id', organizationId)

      if (updateError || roleError) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el usuario',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: 'Usuario actualizado correctamente',
      })
    } else {
      // Crear nuevo usuario
      // 1. Crear cuenta en auth.users
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.nombre_completo,
        },
      })

      if (signUpError || !newUser.user) {
        toast({
          title: 'Error',
          description: signUpError?.message || 'No se pudo crear el usuario',
          variant: 'destructive',
        })
        return
      }

      // 2. Actualizar profile con datos adicionales
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          role: formData.role,
          nombre_completo: formData.nombre_completo,
          activo: true,
        })
        .eq('id', newUser.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }

      // 3. Crear registro en user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          organization_id: organizationId,
          role: formData.role,
        })

      if (roleError) {
        toast({
          title: 'Advertencia',
          description: 'Usuario creado pero hubo un error asignando el rol',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Éxito',
          description: `${formData.role === 'admin' ? 'Administrador' : 'Cobrador'} creado correctamente`,
        })
      }
    }

    loadUsuarios()
    resetForm()
  }

  const handleToggleActivo = async (usuario: Profile) => {
    if (!isAdmin) return

    const { error } = await supabase
      .from('profiles')
      .update({ activo: !usuario.activo })
      .eq('id', usuario.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del usuario',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: `Usuario ${!usuario.activo ? 'activado' : 'desactivado'} correctamente`,
      })
      loadUsuarios()
    }
  }

  const handleResetPassword = async (usuario: Profile) => {
    if (!confirm(`¿Deseas restablecer la contraseña de ${usuario.email}?`)) return

    // Generar contraseña temporal
    const tempPassword = `${usuario.email.split('@')[0]}123`

    const { error } = await supabase.auth.admin.updateUserById(
      usuario.id,
      { password: tempPassword }
    )

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo restablecer la contraseña',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: `Contraseña restablecida a: ${tempPassword}`,
        duration: 10000,
      })
    }
  }

  const handleDelete = async (usuario: Profile) => {
    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre_completo || usuario.email}? Esta acción no se puede deshacer.`)) return

    if (!isAdmin) return

    // Eliminar de user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', usuario.id)
      .eq('organization_id', organizationId)

    // Desactivar usuario (no eliminamos para mantener historial)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ activo: false, organization_id: null, role: null })
      .eq('id', usuario.id)

    if (roleError || profileError) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      })
      loadUsuarios()
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra cobradores y administradores</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
            <Table>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
