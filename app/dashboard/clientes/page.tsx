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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useStore, type Cliente } from '@/lib/store'
import { ClienteDetailDialog } from '@/components/cliente-detail-dialog'
import { SearchFilterBar } from '@/components/search-filter-bar'
import { LimiteAlcanzadoDialog } from '@/components/limite-alcanzado-dialog'
import { ClienteCardMobile } from '@/components/ClienteCardMobile'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadOrganizationSubscription, loadOrganizationUsageLimits } from '@/lib/subscription-helpers'
import { getClientesInteligente } from '@/lib/queries-con-roles'
import { useConfigStore } from '@/lib/config-store'
import { useMemo } from 'react'

export default function ClientesPage() {
  const [open, setOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [limiteDialogOpen, setLimiteDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { clientes, setClientes, addCliente, updateCliente, deleteCliente } = useStore()
  const { canAddCliente, setUserSubscription, setUsageLimits } = useSubscriptionStore()
  const { config } = useConfigStore()

  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    direccion: '',
    cuenta_bancaria: '',
  })

  useEffect(() => {
    loadClientes()
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    const [subscription, limits] = await Promise.all([
      loadOrganizationSubscription(),
      loadOrganizationUsageLimits(),
    ])
    if (subscription) setUserSubscription(subscription)
    if (limits) setUsageLimits(limits)
  }

  const loadClientes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    try {
      // Usar función inteligente que respeta roles
      const data = await getClientesInteligente()
      setClientes(data || [])
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleOpenDialog = () => {
    if (!editingCliente && !canAddCliente()) {
      setLimiteDialogOpen(true)
      return
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificar límite solo si es nuevo cliente
    if (!editingCliente && !canAddCliente()) {
      setLimiteDialogOpen(true)
      setOpen(false)
      return
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingCliente) {
      // Actualizar cliente existente
      const { data, error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', editingCliente.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el cliente',
          variant: 'destructive',
        })
      } else {
        updateCliente(editingCliente.id, data)
        toast({
          title: 'Éxito',
          description: 'Cliente actualizado correctamente',
        })
        resetForm()
      }
    } else {
      // Crear nuevo cliente
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ ...formData, user_id: user.id }])
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo crear el cliente',
          variant: 'destructive',
        })
      } else {
        addCliente(data)
        toast({
          title: 'Éxito',
          description: 'Cliente creado correctamente',
        })
        
        // Recargar límites después de agregar
        loadSubscriptionData()
        resetForm()
      }
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nombre: cliente.nombre,
      dni: cliente.dni,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      cuenta_bancaria: cliente.cuenta_bancaria || '',
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente',
        variant: 'destructive',
      })
    } else {
      deleteCliente(id)
      toast({
        title: 'Éxito',
        description: 'Cliente eliminado correctamente',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      dni: '',
      telefono: '',
      direccion: '',
      cuenta_bancaria: '',
    })
    setEditingCliente(null)
    setOpen(false)
  }

  // Filtrar clientes por búsqueda
  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes

    const searchLower = searchTerm.toLowerCase()
    return clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(searchLower) ||
        cliente.dni.toLowerCase().includes(searchLower) ||
        cliente.telefono?.toLowerCase().includes(searchLower) ||
        cliente.direccion?.toLowerCase().includes(searchLower) ||
        cliente.cuenta_bancaria?.toLowerCase().includes(searchLower)
    )
  }, [clientes, searchTerm])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestiona tu base de clientes</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingCliente
                  ? 'Actualiza la información del cliente'
                  : 'Ingresa los datos del nuevo cliente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                  Nombre Completo *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni" className="text-sm font-medium text-gray-700">
                  DNI *
                </Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) =>
                    setFormData({ ...formData, dni: e.target.value })
                  }
                  required
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Ej: 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-sm font-medium text-gray-700">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Ej: +1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion" className="text-sm font-medium text-gray-700">
                  Dirección
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Ej: Calle Principal 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuenta_bancaria" className="text-sm font-medium text-gray-700">
                  Número de Cuenta Bancaria
                </Label>
                <Input
                  id="cuenta_bancaria"
                  value={formData.cuenta_bancaria}
                  onChange={(e) =>
                    setFormData({ ...formData, cuenta_bancaria: e.target.value })
                  }
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  placeholder="Ej: 1234567890123456"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  {editingCliente ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Barra de Búsqueda */}
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType="clientes"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay clientes registrados aún
            </p>
          ) : filteredClientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No se encontraron clientes con "{searchTerm}"
            </p>
          ) : (
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nombre}
                    </TableCell>
                    <TableCell>{cliente.dni}</TableCell>
                    <TableCell>{cliente.telefono || '-'}</TableCell>
                    <TableCell>{cliente.direccion || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCliente(cliente)
                          setDetailOpen(true)
                        }}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cliente.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {filteredClientes.map((cliente) => {
                const clienteData = cliente as any
                return (
                  <ClienteCardMobile
                    key={cliente.id}
                    cliente={{
                      id: cliente.id,
                      nombre: cliente.nombre,
                      dni: cliente.dni,
                      telefono: cliente.telefono || null,
                      direccion: cliente.direccion || null,
                      prestamos_activos: clienteData.prestamos_activos,
                      total_prestado: clienteData.total_prestado,
                      ruta: clienteData.ruta ? {
                        nombre_ruta: clienteData.ruta.nombre_ruta,
                        color: clienteData.ruta.color || null
                      } : null
                    }}
                    currency={config?.currency || 'PEN'}
                    onEdit={() => handleEdit(cliente)}
                    onDelete={() => handleDelete(cliente.id)}
                  />
                )
              })}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalle del Cliente */}
      <ClienteDetailDialog
        cliente={selectedCliente}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onPaymentComplete={loadClientes}
      />

      {/* Dialog de Límite Alcanzado */}
      <LimiteAlcanzadoDialog
        open={limiteDialogOpen}
        onOpenChange={setLimiteDialogOpen}
        tipo="clientes"
      />
    </div>
  )
}

