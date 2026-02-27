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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ArrowRightLeft,
  Users,
  History,
  AlertCircle
} from 'lucide-react'
import { useStore, type Ruta, type Profile, type Cliente } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { Textarea } from '@/components/ui/textarea'
import { getClientesInteligente } from '@/lib/queries-con-roles'

export default function RutasPage() {
  const [open, setOpen] = useState(false)
  const [capitalDialogOpen, setCapitalDialogOpen] = useState(false)
  const [clientesDialogOpen, setClientesDialogOpen] = useState(false)
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null)
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [cobradores, setCobradores] = useState<Profile[]>([])
  const [todosClientes, setTodosClientes] = useState<any[]>([]) // Con info de ruta
  const [clientesRuta, setClientesRuta] = useState<string[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [mostrarAsignados, setMostrarAsignados] = useState(false) // Toggle para clientes asignados
  const { toast } = useToast()
  const supabase = createClient()
  const { rutas, setRutas, addRuta, updateRuta, deleteRuta } = useStore()
  const { config } = useConfigStore()

  const [formData, setFormData] = useState({
    nombre_ruta: '',
    descripcion: '',
    cobrador_id: '',
    capital_inicial: '',
    color: '#3B82F6',
  })

  const [capitalData, setCapitalData] = useState({
    tipo: 'ingreso' as 'ingreso' | 'retiro' | 'transferencia',
    monto: '',
    concepto: '',
    ruta_destino_id: '',
  })

  useEffect(() => {
    checkPermissions()
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
      if (profile.role === 'admin') {
        loadRutas(profile.organization_id)
        loadCobradores(profile.organization_id)
        loadClientes()
      }
    }
  }

  const loadRutas = async (orgId: string) => {
    setLoading(true)
    console.log('[loadRutas] Cargando rutas para orgId:', orgId)

    try {
      const { data: rutasData, error } = await supabase
        .from('rutas')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[loadRutas] Error:', error)
        throw error
      }

      if (!rutasData || rutasData.length === 0) {
        setRutas([])
        setLoading(false)
        return
      }

      console.log('[loadRutas] Rutas básicas obtenidas:', rutasData.length)

      // Obtener IDs únicos de cobradores
      const cobradorIds = [...new Set(rutasData.map((r: any) => r.cobrador_id).filter(Boolean))]
      
      console.log('[loadRutas] Cargando info de cobradores:', cobradorIds.length)

      // Cargar información de cobradores
      let cobradoresData: any[] = []
      if (cobradorIds.length > 0) {
        const { data } = await supabase
          .rpc('get_usuarios_organizacion')
        
        cobradoresData = (data || []).filter((u: any) => cobradorIds.includes(u.id))
        console.log('[loadRutas] Cobradores obtenidos:', cobradoresData.length)
      }

      // Obtener contadores y enriquecer con info de cobrador
      const rutasConContadores = await Promise.all(
        rutasData.map(async (ruta: any) => {
          const [clientesCount, prestamosCount] = await Promise.all([
            supabase.from('ruta_clientes').select('id', { count: 'exact', head: true }).eq('ruta_id', ruta.id).eq('activo', true),
            supabase.from('prestamos').select('id', { count: 'exact', head: true }).eq('ruta_id', ruta.id).eq('estado', 'activo')
          ])
          
          // Buscar info del cobrador
          const cobrador = cobradoresData.find((c: any) => c.id === ruta.cobrador_id)
          
          return {
            ...ruta,
            clientes_count: clientesCount.count || 0,
            prestamos_count: prestamosCount.count || 0,
            cobrador: cobrador ? {
              id: cobrador.id,
              nombre_completo: cobrador.nombre_completo,
              email: cobrador.email
            } : null
          }
        })
      )
      
      console.log('[loadRutas] Rutas enriquecidas con contadores y cobradores:', rutasConContadores.length)
      setRutas(rutasConContadores)

    } catch (error: any) {
      console.error('[loadRutas] Error completo:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las rutas',
        variant: 'destructive',
      })
      setRutas([])
    } finally {
      setLoading(false)
    }
  }

  const loadCobradores = async (orgId: string) => {
    console.log('[loadCobradores] Cargando cobradores de org:', orgId)
    
    // Usar función RPC para obtener todos los usuarios
    const { data: allUsers, error } = await supabase
      .rpc('get_usuarios_organizacion')

    if (error) {
      console.error('[loadCobradores] Error:', error)
      return
    }

    // Filtrar solo los cobradores activos
    const data = allUsers?.filter((user: any) => 
      user.role === 'cobrador' && 
      user.activo === true
    )

    console.log('[loadCobradores] Cobradores encontrados:', data?.length || 0)

    if (data) {
      setCobradores(data)
    }
  }

  const loadClientes = async () => {
    if (!organizationId) return

    try {
      console.log('[loadClientes] Cargando clientes de la organización...')
      
      // Obtener todos los clientes de la organización usando función inteligente
      const clientesData = await getClientesInteligente()
      
      if (!clientesData) {
        console.log('[loadClientes] No se obtuvieron clientes')
        setTodosClientes([])
        return
      }

      console.log('[loadClientes] Clientes obtenidos:', clientesData.length)

      // Obtener asignaciones activas de rutas
      const { data: asignaciones, error: asigError } = await supabase
        .from('ruta_clientes')
        .select(`
          cliente_id,
          ruta_id,
          activo,
          ruta:rutas(id, nombre_ruta)
        `)
        .eq('activo', true)

      if (asigError) {
        console.error('[loadClientes] Error cargando asignaciones:', asigError)
      }

      console.log('[loadClientes] Asignaciones obtenidas:', asignaciones?.length || 0)

      // Mapear clientes con info de ruta
      const clientesConInfo = clientesData.map(cliente => {
        const asignacion = asignaciones?.find(a => a.cliente_id === cliente.id)
        const rutaInfo = asignacion?.ruta as any
        return {
          ...cliente,
          ruta_asignada: rutaInfo?.nombre_ruta || null,
          ruta_id_asignada: asignacion?.ruta_id || null,
          tiene_ruta: !!asignacion
        }
      })

      console.log('[loadClientes] Clientes con info procesados:', clientesConInfo.length)
      console.log('[loadClientes] Clientes sin ruta:', clientesConInfo.filter(c => !c.tiene_ruta).length)
      console.log('[loadClientes] Clientes con ruta:', clientesConInfo.filter(c => c.tiene_ruta).length)

      setTodosClientes(clientesConInfo)
    } catch (error) {
      console.error('[loadClientes] Error:', error)
      setTodosClientes([])
    }
  }

  const loadClientesRuta = async (rutaId: string) => {
    const { data } = await supabase
      .from('ruta_clientes')
      .select('cliente_id')
      .eq('ruta_id', rutaId)
      .eq('activo', true)

    if (data) {
      setClientesRuta(data.map(rc => rc.cliente_id))
    }
  }

  const loadHistorialMovimientos = async (rutaId: string) => {
    const { data } = await supabase
      .from('movimientos_capital_ruta')
      .select(`
        *,
        realizador:profiles!movimientos_capital_ruta_realizado_por_fkey(nombre_completo, email),
        ruta_origen:rutas!movimientos_capital_ruta_ruta_origen_id_fkey(nombre_ruta),
        ruta_destino:rutas!movimientos_capital_ruta_ruta_destino_id_fkey(nombre_ruta)
      `)
      .eq('ruta_id', rutaId)
      .order('fecha_movimiento', { ascending: false })
      .limit(50)

    if (data) {
      setMovimientos(data)
    }
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

    const capitalInicial = parseFloat(formData.capital_inicial)
    if (isNaN(capitalInicial) || capitalInicial < 0) {
      toast({
        title: 'Error',
        description: 'El capital inicial debe ser un número válido mayor o igual a 0',
        variant: 'destructive',
      })
      return
    }

    if (!formData.cobrador_id) {
      toast({
        title: 'Error',
        description: 'Debes asignar un cobrador a la ruta',
        variant: 'destructive',
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingRuta) {
      // Actualizar ruta existente
      const { data: updatedRuta, error } = await supabase
        .from('rutas')
        .update({
          nombre_ruta: formData.nombre_ruta,
          descripcion: formData.descripcion,
          cobrador_id: formData.cobrador_id,
          color: formData.color,
        })
        .eq('id', editingRuta.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar la ruta',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: 'Ruta actualizada correctamente',
      })
      loadRutas(organizationId)
    } else {
      // Crear nueva ruta
      const { data: newRuta, error: rutaError } = await supabase
        .from('rutas')
        .insert({
          organization_id: organizationId,
          nombre_ruta: formData.nombre_ruta,
          descripcion: formData.descripcion,
          cobrador_id: formData.cobrador_id,
          capital_inicial: capitalInicial,
          capital_actual: capitalInicial,
          color: formData.color,
          estado: 'activa',
        })
        .select()
        .single()

      if (rutaError || !newRuta) {
        console.error('[handleSubmit] Error creando ruta:', rutaError)
        toast({
          title: 'Error',
          description: rutaError?.message || 'No se pudo crear la ruta',
          variant: 'destructive',
        })
        return
      }

      // Registrar movimiento inicial de capital
      if (capitalInicial > 0) {
        await supabase
          .from('movimientos_capital_ruta')
          .insert({
            ruta_id: newRuta.id,
            tipo_movimiento: 'ingreso',
            monto: capitalInicial,
            saldo_anterior: 0,
            saldo_nuevo: capitalInicial,
            realizado_por: user.id,
            concepto: 'Capital inicial de la ruta',
          })
      }

      toast({
        title: 'Éxito',
        description: 'Ruta creada correctamente',
      })
      loadRutas(organizationId)
    }

    resetForm()
  }

  const handleCapitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRuta || !isAdmin) return

    const monto = parseFloat(capitalData.monto)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número válido mayor a 0',
        variant: 'destructive',
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Validar retiro
    if (capitalData.tipo === 'retiro' && monto > selectedRuta.capital_actual) {
      toast({
        title: 'Error',
        description: `No hay suficiente capital disponible. Disponible: ${formatCurrency(selectedRuta.capital_actual, config.currency)}`,
        variant: 'destructive',
      })
      return
    }

    // Validar transferencia
    if (capitalData.tipo === 'transferencia') {
      if (!capitalData.ruta_destino_id) {
        toast({
          title: 'Error',
          description: 'Debes seleccionar la ruta de destino',
          variant: 'destructive',
        })
        return
      }
      if (monto > selectedRuta.capital_actual) {
        toast({
          title: 'Error',
          description: `No hay suficiente capital para transferir. Disponible: ${formatCurrency(selectedRuta.capital_actual, config.currency)}`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      if (capitalData.tipo === 'transferencia') {
        // Transferencia entre rutas (2 movimientos)
        const rutaDestino = rutas.find(r => r.id === capitalData.ruta_destino_id)
        if (!rutaDestino) return

        // 1. Salida de ruta origen
        const nuevoSaldoOrigen = selectedRuta.capital_actual - monto
        await supabase.from('rutas').update({ capital_actual: nuevoSaldoOrigen }).eq('id', selectedRuta.id)
        await supabase.from('movimientos_capital_ruta').insert({
          ruta_id: selectedRuta.id,
          tipo_movimiento: 'transferencia_salida',
          monto: monto,
          saldo_anterior: selectedRuta.capital_actual,
          saldo_nuevo: nuevoSaldoOrigen,
          ruta_destino_id: rutaDestino.id,
          realizado_por: user.id,
          concepto: `Transferencia a ${rutaDestino.nombre_ruta}: ${capitalData.concepto}`,
        })

        // 2. Entrada a ruta destino
        const nuevoSaldoDestino = rutaDestino.capital_actual + monto
        await supabase.from('rutas').update({ capital_actual: nuevoSaldoDestino }).eq('id', rutaDestino.id)
        await supabase.from('movimientos_capital_ruta').insert({
          ruta_id: rutaDestino.id,
          tipo_movimiento: 'transferencia_entrada',
          monto: monto,
          saldo_anterior: rutaDestino.capital_actual,
          saldo_nuevo: nuevoSaldoDestino,
          ruta_origen_id: selectedRuta.id,
          realizado_por: user.id,
          concepto: `Transferencia desde ${selectedRuta.nombre_ruta}: ${capitalData.concepto}`,
        })

        toast({
          title: 'Éxito',
          description: `Transferencia de ${formatCurrency(monto, config.currency)} completada`,
        })
      } else {
        // Ingreso o Retiro
        const nuevoCapital = capitalData.tipo === 'ingreso' 
          ? selectedRuta.capital_actual + monto 
          : selectedRuta.capital_actual - monto

        // Actualizar capital
        await supabase
          .from('rutas')
          .update({ capital_actual: nuevoCapital })
          .eq('id', selectedRuta.id)

        // Registrar movimiento
        await supabase
          .from('movimientos_capital_ruta')
          .insert({
            ruta_id: selectedRuta.id,
            tipo_movimiento: capitalData.tipo,
            monto: monto,
            saldo_anterior: selectedRuta.capital_actual,
            saldo_nuevo: nuevoCapital,
            realizado_por: user.id,
            concepto: capitalData.concepto,
          })

        toast({
          title: 'Éxito',
          description: `${capitalData.tipo === 'ingreso' ? 'Ingreso' : 'Retiro'} de ${formatCurrency(monto, config.currency)} registrado`,
        })
      }

      loadRutas(organizationId!)
      resetCapitalForm()
    } catch (error) {
      console.error('Error en movimiento de capital:', error)
      toast({
        title: 'Error',
        description: 'No se pudo realizar el movimiento',
        variant: 'destructive',
      })
    }
  }

  const handleAsignarClientes = async () => {
    if (!selectedRuta) return

    try {
      // Detectar clientes que se están moviendo de otra ruta
      const clientesAMover = clientesRuta
        .map(id => todosClientes.find(c => c.id === id))
        .filter(c => c && c.tiene_ruta && c.ruta_id_asignada !== selectedRuta.id)

      // Si hay clientes a mover, pedir confirmación
      if (clientesAMover.length > 0) {
        const nombresClientes = clientesAMover.map(c => c.nombre).join(', ')
        const rutasOrigen = [...new Set(clientesAMover.map(c => c.ruta_asignada))].join(', ')
        
        const confirmar = window.confirm(
          `⚠️ ${clientesAMover.length} cliente(s) será(n) movido(s):\n\n` +
          `${nombresClientes}\n\n` +
          `Desde: ${rutasOrigen}\n` +
          `Hacia: ${selectedRuta.nombre_ruta}\n\n` +
          `¿Continuar?`
        )
        
        if (!confirmar) return
      }

      // 1. Desactivar asignaciones de clientes que están siendo movidos de otras rutas
      for (const cliente of clientesAMover) {
        await supabase
          .from('ruta_clientes')
          .update({ activo: false })
          .eq('cliente_id', cliente.id)
          .eq('activo', true)
      }

      // 2. Desactivar todas las asignaciones actuales de esta ruta
      await supabase
        .from('ruta_clientes')
        .update({ activo: false })
        .eq('ruta_id', selectedRuta.id)

      // 3. Crear/reactivar asignaciones seleccionadas
      for (const clienteId of clientesRuta) {
        const { data: existing } = await supabase
          .from('ruta_clientes')
          .select('id')
          .eq('ruta_id', selectedRuta.id)
          .eq('cliente_id', clienteId)
          .single()

        if (existing) {
          // Reactivar
          await supabase
            .from('ruta_clientes')
            .update({ activo: true })
            .eq('id', existing.id)
        } else {
          // Crear nueva
          await supabase
            .from('ruta_clientes')
            .insert({
              ruta_id: selectedRuta.id,
              cliente_id: clienteId,
              activo: true,
            })
        }
      }

      // Mensaje de éxito personalizado
      const mensaje = clientesAMover.length > 0
        ? `${clientesRuta.length} cliente(s) asignado(s) (${clientesAMover.length} movido(s) de otra ruta)`
        : `${clientesRuta.length} cliente(s) asignado(s) a la ruta`

      toast({
        title: 'Éxito',
        description: mensaje,
      })
      
      setClientesDialogOpen(false)
      loadRutas(organizationId!)
      loadClientes() // Recargar clientes para actualizar info de rutas
    } catch (error) {
      console.error('Error asignando clientes:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron asignar los clientes',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (ruta: Ruta) => {
    if (!confirm(`¿Estás seguro de eliminar la ruta "${ruta.nombre_ruta}"? Se eliminarán también las asignaciones de clientes.`)) return

    const { error } = await supabase
      .from('rutas')
      .delete()
      .eq('id', ruta.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la ruta',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: 'Ruta eliminada correctamente',
      })
      loadRutas(organizationId!)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre_ruta: '',
      descripcion: '',
      cobrador_id: '',
      capital_inicial: '',
      color: '#3B82F6',
    })
    setEditingRuta(null)
    setOpen(false)
  }

  const resetCapitalForm = () => {
    setCapitalData({
      tipo: 'ingreso',
      monto: '',
      concepto: '',
      ruta_destino_id: '',
    })
    setCapitalDialogOpen(false)
    setSelectedRuta(null)
  }

  const handleEdit = (ruta: Ruta) => {
    setFormData({
      nombre_ruta: ruta.nombre_ruta,
      descripcion: ruta.descripcion || '',
      cobrador_id: ruta.cobrador_id || '',
      capital_inicial: ruta.capital_inicial.toString(),
      color: ruta.color || '#3B82F6',
    })
    setEditingRuta(ruta)
    setOpen(true)
  }

  const handleOpenCapitalDialog = (ruta: Ruta) => {
    setSelectedRuta(ruta)
    setCapitalDialogOpen(true)
  }

  const handleOpenClientesDialog = async (ruta: Ruta) => {
    setSelectedRuta(ruta)
    
    // Cargar todos los clientes con info de rutas
    await loadClientes()
    
    // Cargar los clientes ya asignados a esta ruta específica
    await loadClientesRuta(ruta.id)
    
    setClientesDialogOpen(true)
  }

  const handleOpenHistorialDialog = async (ruta: Ruta) => {
    setSelectedRuta(ruta)
    await loadHistorialMovimientos(ruta.id)
    setHistorialDialogOpen(true)
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="text-lg font-semibold">Acceso Restringido</h3>
              <p className="text-sm text-gray-500">
                Solo administradores pueden gestionar rutas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Rutas</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Administra rutas de cobro y capital de trabajo</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ruta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRuta ? 'Editar Ruta' : 'Nueva Ruta'}
              </DialogTitle>
              <DialogDescription>
                {editingRuta 
                  ? 'Actualiza los datos de la ruta'
                  : 'Crea una nueva ruta de cobro con capital asignado'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre_ruta">Nombre de la Ruta *</Label>
                <Input
                  id="nombre_ruta"
                  value={formData.nombre_ruta}
                  onChange={(e) => setFormData({ ...formData, nombre_ruta: e.target.value })}
                  required
                  placeholder="Ej: Ruta Centro, Zona Norte"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cobrador_id">Cobrador Asignado *</Label>
                <Select
                  value={formData.cobrador_id}
                  onValueChange={(value) => setFormData({ ...formData, cobrador_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent>
                    {cobradores.length === 0 ? (
                      <SelectItem value="none" disabled>No hay cobradores disponibles</SelectItem>
                    ) : (
                      cobradores.map((cobrador) => (
                        <SelectItem key={cobrador.id} value={cobrador.id}>
                          {cobrador.nombre_completo || cobrador.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {!editingRuta && (
                <div className="space-y-2">
                  <Label htmlFor="capital_inicial">Capital Inicial * (Obligatorio)</Label>
                  <Input
                    id="capital_inicial"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.capital_inicial}
                    onChange={(e) => setFormData({ ...formData, capital_inicial: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Capital de trabajo asignado a la ruta (obligatorio)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción opcional de la ruta"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Identificador</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRuta ? 'Actualizar' : 'Crear Ruta'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando rutas...</p>
        </div>
      ) : rutas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-8">
              <MapPin className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No hay rutas creadas</h3>
                <p className="text-sm text-gray-500">
                  Crea tu primera ruta de cobro para comenzar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {rutas.map((ruta) => (
            <Card key={ruta.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: ruta.color || '#3B82F6' }}
                    />
                    <CardTitle className="text-lg">{ruta.nombre_ruta}</CardTitle>
                  </div>
                  <Badge variant={ruta.estado === 'activa' ? 'default' : 'secondary'}>
                    {ruta.estado}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cobrador */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    {ruta.cobrador?.nombre_completo || ruta.cobrador?.email || 'Sin cobrador'}
                  </span>
                </div>

                {/* Capital */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Capital Disponible:</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(ruta.capital_actual, config.currency)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Capital inicial: {formatCurrency(ruta.capital_inicial, config.currency)}
                  </div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">
                    Disponible = Inicial + Cobros - Capital prestado activo - Gastos aprobados
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{ruta.clientes_count || 0}</div>
                    <div className="text-xs text-gray-500">Clientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{ruta.prestamos_count || 0}</div>
                    <div className="text-xs text-gray-500">Préstamos activos</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCapitalDialog(ruta)}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Capital
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenClientesDialog(ruta)}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Clientes
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenHistorialDialog(ruta)}
                    title="Ver historial"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ruta)}
                    title="Editar ruta"
                  >
                    <Pencil className="h-4 w-4 text-yellow-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ruta)}
                    title="Eliminar ruta"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Gestión de Capital */}
      <Dialog open={capitalDialogOpen} onOpenChange={(isOpen) => {
        setCapitalDialogOpen(isOpen)
        if (!isOpen) resetCapitalForm()
      }}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Capital</DialogTitle>
            <DialogDescription>
              {selectedRuta && `Ruta: ${selectedRuta.nombre_ruta} | Disponible: ${formatCurrency(selectedRuta.capital_actual, config.currency)}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapitalSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Operación *</Label>
              <Select
                value={capitalData.tipo}
                onValueChange={(value: any) => setCapitalData({ ...capitalData, tipo: value, ruta_destino_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Ingresar Capital
                    </div>
                  </SelectItem>
                  <SelectItem value="retiro">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Retirar Capital
                    </div>
                  </SelectItem>
                  <SelectItem value="transferencia">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                      Transferir a Otra Ruta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {capitalData.tipo === 'transferencia' && (
              <div className="space-y-2">
                <Label>Ruta Destino *</Label>
                <Select
                  value={capitalData.ruta_destino_id}
                  onValueChange={(value) => setCapitalData({ ...capitalData, ruta_destino_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas
                      .filter(r => r.id !== selectedRuta?.id && r.estado === 'activa')
                      .map((ruta) => (
                        <SelectItem key={ruta.id} value={ruta.id}>
                          {ruta.nombre_ruta} ({formatCurrency(ruta.capital_actual, config.currency)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                value={capitalData.monto}
                onChange={(e) => setCapitalData({ ...capitalData, monto: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto">Concepto *</Label>
              <Textarea
                id="concepto"
                value={capitalData.concepto}
                onChange={(e) => setCapitalData({ ...capitalData, concepto: e.target.value })}
                required
                placeholder="Describe el motivo de esta operación"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={resetCapitalForm}>
                Cancelar
              </Button>
              <Button type="submit">
                Confirmar {capitalData.tipo === 'ingreso' ? 'Ingreso' : capitalData.tipo === 'retiro' ? 'Retiro' : 'Transferencia'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Clientes */}
      <Dialog open={clientesDialogOpen} onOpenChange={(open) => {
        setClientesDialogOpen(open)
        if (!open) {
          setMostrarAsignados(false) // Reset toggle al cerrar
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Asignar Clientes a Ruta</DialogTitle>
            <DialogDescription>
              {selectedRuta && `Ruta: ${selectedRuta.nombre_ruta}`}
            </DialogDescription>
          </DialogHeader>

          {/* Toggle para mostrar clientes asignados */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">
                Clientes Disponibles ({todosClientes.filter(c => !c.tiene_ruta || c.ruta_id_asignada === selectedRuta?.id).length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="mostrar-asignados" className="text-sm cursor-pointer">
                Mostrar ya asignados
              </Label>
              <Switch
                id="mostrar-asignados"
                checked={mostrarAsignados}
                onCheckedChange={setMostrarAsignados}
              />
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="flex-1 space-y-2 overflow-y-auto pr-2">
            {/* Clientes sin ruta o de esta ruta */}
            {todosClientes
              .filter(c => !c.tiene_ruta || c.ruta_id_asignada === selectedRuta?.id)
              .map((cliente) => (
                <label
                  key={cliente.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    "hover:bg-gray-50",
                    clientesRuta.includes(cliente.id) && "bg-blue-50 border-blue-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={clientesRuta.includes(cliente.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setClientesRuta([...clientesRuta, cliente.id])
                      } else {
                        setClientesRuta(clientesRuta.filter(id => id !== cliente.id))
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{cliente.nombre}</p>
                    <p className="text-sm text-gray-500">{cliente.dni}</p>
                  </div>
                  {cliente.tiene_ruta && cliente.ruta_id_asignada === selectedRuta?.id && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ En esta ruta
                    </Badge>
                  )}
                </label>
              ))}

            {/* Separador si hay clientes asignados y el toggle está activo */}
            {mostrarAsignados && todosClientes.some(c => c.tiene_ruta && c.ruta_id_asignada !== selectedRuta?.id) && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-xs font-medium text-gray-500 uppercase">Ya Asignados a Otras Rutas</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
            )}

            {/* Clientes ya asignados a otras rutas (solo si toggle activo) */}
            {mostrarAsignados && todosClientes
              .filter(c => c.tiene_ruta && c.ruta_id_asignada !== selectedRuta?.id)
              .map((cliente) => (
                <label
                  key={cliente.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    "bg-amber-50 border-amber-200 hover:bg-amber-100",
                    clientesRuta.includes(cliente.id) && "ring-2 ring-amber-400"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={clientesRuta.includes(cliente.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setClientesRuta([...clientesRuta, cliente.id])
                      } else {
                        setClientesRuta(clientesRuta.filter(id => id !== cliente.id))
                      }
                    }}
                    className="h-4 w-4 rounded border-amber-400"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{cliente.nombre}</p>
                    <p className="text-sm text-gray-500">{cliente.dni}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      📍 En: {cliente.ruta_asignada}
                    </Badge>
                  </div>
                </label>
              ))}
          </div>

          {/* Footer con resumen y botones */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {clientesRuta.length} cliente(s) seleccionado(s)
              </span>
              {clientesRuta.some(id => todosClientes.find(c => c.id === id && c.tiene_ruta && c.ruta_id_asignada !== selectedRuta?.id)) && (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Incluye clientes de otras rutas
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setClientesDialogOpen(false)
                setMostrarAsignados(false) // Reset toggle
              }} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleAsignarClientes}
                className="flex-1"
                disabled={clientesRuta.length === 0}
              >
                Guardar Asignación ({clientesRuta.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial de Movimientos */}
      <Dialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Movimientos de Capital</DialogTitle>
            <DialogDescription>
              {selectedRuta && `Ruta: ${selectedRuta.nombre_ruta}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {movimientos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay movimientos registrados</p>
            ) : (
              movimientos.map((mov) => (
                <div key={mov.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {mov.tipo_movimiento === 'ingreso' && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {mov.tipo_movimiento === 'retiro' && <TrendingDown className="h-5 w-5 text-red-500" />}
                      {(mov.tipo_movimiento === 'transferencia_entrada' || mov.tipo_movimiento === 'transferencia_salida') && 
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />}
                      {mov.tipo_movimiento === 'prestamo_entregado' && <DollarSign className="h-5 w-5 text-orange-500" />}
                      {mov.tipo_movimiento === 'pago_recibido' && <DollarSign className="h-5 w-5 text-green-500" />}
                      <span className="font-semibold capitalize">
                        {mov.tipo_movimiento.replace('_', ' ')}
                      </span>
                    </div>
                    <span className={`font-bold ${
                      mov.tipo_movimiento === 'ingreso' || mov.tipo_movimiento === 'pago_recibido' || mov.tipo_movimiento === 'transferencia_entrada'
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(mov.tipo_movimiento === 'ingreso' || mov.tipo_movimiento === 'pago_recibido' || mov.tipo_movimiento === 'transferencia_entrada') ? '+' : '-'}
                      {formatCurrency(mov.monto, config.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{mov.concepto}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Por: {mov.realizador?.nombre_completo || mov.realizador?.email || 'Sistema'}
                    </span>
                    <span>{new Date(mov.fecha_movimiento).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t">
                    <span>Saldo anterior: {formatCurrency(mov.saldo_anterior, config.currency)}</span>
                    <span>→</span>
                    <span>Saldo nuevo: {formatCurrency(mov.saldo_nuevo, config.currency)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
