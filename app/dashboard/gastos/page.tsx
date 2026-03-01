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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { GastoCardMobile } from '@/components/GastoCardMobile'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  DollarSign, 
  Car, 
  Utensils, 
  Wrench,
  Bus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useStore, type Gasto, type CategoriaGasto } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { format } from 'date-fns'

const getCategoriaIcon = (categoria: CategoriaGasto) => {
  switch (categoria) {
    case 'gasolina': return <Car className="h-4 w-4" />
    case 'mantenimiento': return <Wrench className="h-4 w-4" />
    case 'comida': return <Utensils className="h-4 w-4" />
    case 'transporte': return <Bus className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getCategoriaColor = (categoria: CategoriaGasto) => {
  switch (categoria) {
    case 'gasolina': return 'bg-orange-100 text-orange-800'
    case 'mantenimiento': return 'bg-blue-100 text-blue-800'
    case 'comida': return 'bg-green-100 text-green-800'
    case 'transporte': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function GastosPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [rutas, setRutas] = useState<any[]>([])
  const [filtroFecha, setFiltroFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filtroCobrador, setFiltroCobrador] = useState<string>('todos')
  const [filtroRuta, setFiltroRuta] = useState<string>('todos')
  const [cobradores, setCobradores] = useState<any[]>([])
  const { toast } = useToast()
  const supabase = createClient()
  const { gastos, setGastos, addGasto, updateGasto, deleteGasto: deleteGastoStore } = useStore()
  const { config } = useConfigStore()

  const [formData, setFormData] = useState({
    categoria: 'gasolina' as CategoriaGasto,
    monto: '',
    descripcion: '',
    fecha_gasto: format(new Date(), 'yyyy-MM-dd'),
    ruta_id: '',
  })

  useEffect(() => {
    checkPermissionsAndLoad()
  }, [])

  const checkPermissionsAndLoad = async () => {
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

      setUserRole(role)
      setUserId(user.id)
      setOrganizationId(profile.organization_id)
      
      if (role === 'admin') {
        loadRutas(profile.organization_id)
        loadCobradores(profile.organization_id)
        loadGastos(profile.organization_id)
      } else if (role === 'cobrador') {
        loadRutasCobrador(user.id)
        loadGastosCobrador(user.id)
      }
    }
  }

  const loadRutas = async (orgId: string) => {
    console.log('[loadRutas] Cargando rutas para orgId:', orgId)
    
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('organization_id', orgId)
      .eq('estado', 'activa')
      .order('nombre_ruta', { ascending: true })

    if (error) {
      console.error('[loadRutas] Error:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las rutas',
        variant: 'destructive',
      })
      setRutas([])
      return
    }

    console.log('[loadRutas] Rutas cargadas:', data?.length || 0)
    if (data) {
      setRutas(data)
    }
  }

  const loadRutasCobrador = async (cobradorId: string) => {
    console.log('[loadRutasCobrador] Cargando rutas para cobrador:', cobradorId)
    
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('cobrador_id', cobradorId)
      .eq('estado', 'activa')
      .order('nombre_ruta', { ascending: true })

    if (error) {
      console.error('[loadRutasCobrador] Error:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus rutas',
        variant: 'destructive',
      })
      setRutas([])
      return
    }

    console.log('[loadRutasCobrador] Rutas cargadas:', data?.length || 0)
    
    if (data) {
      setRutas(data)
      // Autoseleccionar la primera ruta si solo tiene una
      if (data.length === 1) {
        console.log('[loadRutasCobrador] Autoseleccionando ruta:', data[0].nombre_ruta)
        setFormData(prev => ({ ...prev, ruta_id: data[0].id }))
      }
    }
  }

  const loadCobradores = async (orgId: string) => {
    console.log('[loadCobradores] Cargando cobradores para orgId:', orgId)
    
    const { data, error } = await supabase
      .rpc('get_usuarios_organizacion')

    if (error) {
      console.error('[loadCobradores] Error:', error)
      setCobradores([])
      return
    }

    // Filtrar solo cobradores activos
    const cobradoresActivos = (data || []).filter(
      (u: any) => u.role === 'cobrador' && u.activo === true
    )

    console.log('[loadCobradores] Cobradores cargados:', cobradoresActivos.length)
    setCobradores(cobradoresActivos)
  }

  const loadGastos = async (orgId: string) => {
    setLoading(true)
    console.log('[loadGastos] Iniciando carga de gastos para orgId:', orgId)

    try {
      // Query simplificado sin JOINs complejos
      let query = supabase
        .from('gastos')
        .select('*')
        .eq('organization_id', orgId)

      // Aplicar filtros
      if (filtroFecha) {
        query = query.eq('fecha_gasto', filtroFecha)
      }
      if (filtroCobrador !== 'todos') {
        query = query.eq('cobrador_id', filtroCobrador)
      }
      if (filtroRuta !== 'todos') {
        query = query.eq('ruta_id', filtroRuta)
      }

      query = query.order('fecha_gasto', { ascending: false })

      const { data: gastosData, error: gastosError } = await query

      if (gastosError) {
        console.error('[loadGastos] Error en query de gastos:', gastosError)
        throw gastosError
      }

      console.log('[loadGastos] Gastos básicos obtenidos:', gastosData?.length || 0)

      if (!gastosData || gastosData.length === 0) {
        setGastos([])
        setLoading(false)
        return
      }

      // Cargar datos relacionados por separado
      const cobradorIds = [...new Set(gastosData.map(g => g.cobrador_id))]
      const rutaIds = [...new Set(gastosData.map(g => g.ruta_id).filter(Boolean))]

      console.log('[loadGastos] Cargando datos relacionados...', { cobradorIds: cobradorIds.length, rutaIds: rutaIds.length })

      // Cargar cobradores
      const { data: cobradoresData } = await supabase
        .rpc('get_usuarios_organizacion')

      // Cargar rutas
      const { data: rutasData } = await supabase
        .from('rutas')
        .select('id, nombre_ruta, color')
        .in('id', rutaIds)

      console.log('[loadGastos] Datos relacionados obtenidos', { 
        cobradores: cobradoresData?.length || 0,
        rutas: rutasData?.length || 0
      })

      // Enriquecer gastos con datos relacionados
      const gastosEnriquecidos = gastosData.map(gasto => {
        const cobrador = (cobradoresData || []).find((c: any) => c.id === gasto.cobrador_id)
        const ruta = (rutasData || []).find(r => r.id === gasto.ruta_id)
        const aprobador = (cobradoresData || []).find((c: any) => c.id === gasto.aprobado_por)

        return {
          ...gasto,
          cobrador: cobrador ? {
            id: cobrador.id,
            nombre_completo: cobrador.nombre_completo,
            email: cobrador.email
          } : null,
          ruta: ruta || null,
          aprobador: aprobador ? {
            nombre_completo: aprobador.nombre_completo
          } : null
        }
      })

      console.log('[loadGastos] Gastos enriquecidos:', gastosEnriquecidos.length)
      setGastos(gastosEnriquecidos)

    } catch (error: any) {
      console.error('[loadGastos] Error completo:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los gastos',
        variant: 'destructive',
      })
      setGastos([])
    } finally {
      setLoading(false)
    }
  }

  const loadGastosCobrador = async (cobradorId: string) => {
    setLoading(true)
    console.log('[loadGastosCobrador] Iniciando carga de gastos para cobrador:', cobradorId)

    try {
      // Query simplificado sin JOINs
      let query = supabase
        .from('gastos')
        .select('*')
        .eq('cobrador_id', cobradorId)

      // Aplicar filtro de fecha
      if (filtroFecha) {
        query = query.eq('fecha_gasto', filtroFecha)
      }

      query = query.order('fecha_gasto', { ascending: false })

      const { data: gastosData, error: gastosError } = await query

      if (gastosError) {
        console.error('[loadGastosCobrador] Error en query:', gastosError)
        throw gastosError
      }

      console.log('[loadGastosCobrador] Gastos obtenidos:', gastosData?.length || 0)

      if (!gastosData || gastosData.length === 0) {
        setGastos([])
        setLoading(false)
        return
      }

      // Cargar rutas relacionadas
      const rutaIds = [...new Set(gastosData.map(g => g.ruta_id).filter(Boolean))]
      
      console.log('[loadGastosCobrador] Cargando rutas:', rutaIds.length)

      const { data: rutasData } = await supabase
        .from('rutas')
        .select('id, nombre_ruta, color')
        .in('id', rutaIds)

      console.log('[loadGastosCobrador] Rutas obtenidas:', rutasData?.length || 0)

      // Enriquecer gastos
      const gastosEnriquecidos = gastosData.map(gasto => ({
        ...gasto,
        ruta: (rutasData || []).find(r => r.id === gasto.ruta_id) || null,
        aprobador: null // No necesario para cobradores
      }))

      console.log('[loadGastosCobrador] Gastos enriquecidos:', gastosEnriquecidos.length)
      setGastos(gastosEnriquecidos)

    } catch (error: any) {
      console.error('[loadGastosCobrador] Error completo:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus gastos',
        variant: 'destructive',
      })
      setGastos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !organizationId) return

    const monto = parseFloat(formData.monto)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor a 0',
        variant: 'destructive',
      })
      return
    }

    if (userRole === 'cobrador' && !formData.ruta_id) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar una ruta',
        variant: 'destructive',
      })
      return
    }

    if (editingGasto) {
      // Solo admin puede editar
      if (userRole !== 'admin') {
        toast({
          title: 'Error',
          description: 'Solo administradores pueden editar gastos',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('gastos')
        .update({
          categoria: formData.categoria,
          monto: monto,
          descripcion: formData.descripcion,
          fecha_gasto: formData.fecha_gasto,
          ruta_id: formData.ruta_id || null,
        })
        .eq('id', editingGasto.id)

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el gasto',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: 'Gasto actualizado correctamente',
      })
    } else {
      // Crear nuevo gasto
      const { data: newGasto, error } = await supabase
        .from('gastos')
        .insert({
          organization_id: organizationId,
          cobrador_id: userId,
          categoria: formData.categoria,
          monto: monto,
          descripcion: formData.descripcion,
          fecha_gasto: formData.fecha_gasto,
          ruta_id: formData.ruta_id || null,
          aprobado: true, // Automático
          aprobado_por: userId,
          fecha_aprobacion: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo registrar el gasto',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: 'Gasto registrado correctamente',
      })
    }

    // Recargar gastos
    if (userRole === 'admin') {
      loadGastos(organizationId)
    } else {
      loadGastosCobrador(userId)
    }

    resetForm()
  }

  const handleToggleAprobado = async (gasto: Gasto) => {
    if (userRole !== 'admin') return

    const { error } = await supabase
      .from('gastos')
      .update({
        aprobado: !gasto.aprobado,
        aprobado_por: userId,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id', gasto.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: `Gasto ${!gasto.aprobado ? 'aprobado' : 'desaprobado'} correctamente`,
      })
      loadGastos(organizationId!)
    }
  }

  const handleDelete = async (gasto: Gasto) => {
    if (userRole !== 'admin') {
      toast({
        title: 'Error',
        description: 'Solo administradores pueden eliminar gastos',
        variant: 'destructive',
      })
      return
    }

    if (!confirm(`¿Estás seguro de eliminar este gasto de ${formatCurrency(gasto.monto, config.currency)}?`)) return

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', gasto.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el gasto',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: 'Gasto eliminado correctamente',
      })
      loadGastos(organizationId!)
    }
  }

  const handleEdit = (gasto: Gasto) => {
    if (userRole !== 'admin') {
      toast({
        title: 'Error',
        description: 'Solo administradores pueden editar gastos',
        variant: 'destructive',
      })
      return
    }

    setFormData({
      categoria: gasto.categoria,
      monto: gasto.monto.toString(),
      descripcion: gasto.descripcion,
      fecha_gasto: gasto.fecha_gasto,
      ruta_id: gasto.ruta_id || '',
    })
    setEditingGasto(gasto)
    setOpen(true)
  }

  const resetForm = () => {
    setFormData({
      categoria: 'gasolina',
      monto: '',
      descripcion: '',
      fecha_gasto: format(new Date(), 'yyyy-MM-dd'),
      ruta_id: rutas.length === 1 ? rutas[0].id : '',
    })
    setEditingGasto(null)
    setOpen(false)
  }

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const gastosAprobados = gastos.filter(g => g.aprobado).length
  const gastosPendientes = gastos.filter(g => !g.aprobado).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {userRole === 'admin' ? 'Gestión de Gastos' : 'Mis Gastos'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {userRole === 'admin' 
              ? 'Administra los gastos operativos de los cobradores'
              : 'Registra tus gastos diarios (gasolina, comida, etc.)'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {userRole === 'admin' ? 'Nuevo Gasto' : 'Registrar Gasto'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGasto ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
              </DialogTitle>
              <DialogDescription>
                {editingGasto 
                  ? 'Actualiza los datos del gasto'
                  : 'Los gastos se aprueban automáticamente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value: CategoriaGasto) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasolina">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Gasolina
                      </div>
                    </SelectItem>
                    <SelectItem value="mantenimiento">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Mantenimiento
                      </div>
                    </SelectItem>
                    <SelectItem value="comida">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Comida
                      </div>
                    </SelectItem>
                    <SelectItem value="transporte">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        Transporte
                      </div>
                    </SelectItem>
                    <SelectItem value="otro">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Otro
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_gasto">Fecha *</Label>
                <Input
                  id="fecha_gasto"
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                  required
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruta_id">
                  Ruta {userRole === 'cobrador' ? '*' : '(Opcional)'}
                </Label>
                {rutas.length === 0 ? (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    ⚠️ No hay rutas activas disponibles
                  </div>
                ) : (
                  <Select
                    value={formData.ruta_id}
                    onValueChange={(value) => setFormData({ ...formData, ruta_id: value })}
                    required={userRole === 'cobrador'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      {rutas.map((ruta) => (
                        <SelectItem key={ruta.id} value={ruta.id}>
                          {ruta.nombre_ruta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                  placeholder="Detalla el gasto..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingGasto ? 'Actualizar' : 'Registrar Gasto'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros (solo para admin) */}
      {userRole === 'admin' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => {
                    setFiltroFecha(e.target.value)
                    setTimeout(() => loadGastos(organizationId!), 100)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Cobrador</Label>
                <Select
                  value={filtroCobrador}
                  onValueChange={(value) => {
                    setFiltroCobrador(value)
                    setTimeout(() => loadGastos(organizationId!), 100)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {cobradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre_completo || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ruta</Label>
                <Select
                  value={filtroRuta}
                  onValueChange={(value) => {
                    setFiltroRuta(value)
                    setTimeout(() => loadGastos(organizationId!), 100)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {rutas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre_ruta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiltroFecha(format(new Date(), 'yyyy-MM-dd'))
                    setFiltroCobrador('todos')
                    setFiltroRuta('todos')
                    setTimeout(() => loadGastos(organizationId!), 100)
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalGastos, config.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {gastos.length} gasto(s) registrado(s)
            </p>
          </CardContent>
        </Card>

        {userRole === 'admin' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{gastosAprobados}</div>
                <p className="text-xs text-muted-foreground">
                  {gastosAprobados > 0 ? formatCurrency(gastos.filter(g => g.aprobado).reduce((sum, g) => sum + g.monto, 0), config.currency) : '---'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{gastosPendientes}</div>
                <p className="text-xs text-muted-foreground">
                  {gastosPendientes > 0 ? formatCurrency(gastos.filter(g => !g.aprobado).reduce((sum, g) => sum + g.monto, 0), config.currency) : '---'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabla de gastos */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === 'admin' ? 'Todos los Gastos' : 'Mis Gastos Registrados'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : gastos.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500">No hay gastos registrados para esta fecha</p>
            </div>
          ) : (
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {userRole === 'admin' && <TableHead>Cobrador</TableHead>}
                    <TableHead>Ruta</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    {userRole === 'admin' && <TableHead>Estado</TableHead>}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {gastos.map((gasto) => (
                  <TableRow key={gasto.id}>
                    <TableCell>{formatDate(gasto.fecha_gasto)}</TableCell>
                    {userRole === 'admin' && (
                      <TableCell className="font-medium">
                        {gasto.cobrador?.nombre_completo || gasto.cobrador?.email || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell>
                      {gasto.ruta ? (
                        <Badge variant="outline" style={{ borderColor: gasto.ruta.color || undefined }}>
                          {gasto.ruta.nombre_ruta}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">Sin ruta</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoriaColor(gasto.categoria)}>
                        <span className="flex items-center gap-1">
                          {getCategoriaIcon(gasto.categoria)}
                          {gasto.categoria}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{gasto.descripcion}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(gasto.monto, config.currency)}
                    </TableCell>
                    {userRole === 'admin' && (
                      <TableCell>
                        {gasto.aprobado ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {userRole === 'admin' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleAprobado(gasto)}
                              title={gasto.aprobado ? 'Desaprobar' : 'Aprobar'}
                            >
                              {gasto.aprobado ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(gasto)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-yellow-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(gasto)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {gastos.map((gasto) => {
                const gastoData = gasto as any
                return (
                  <GastoCardMobile
                    key={gasto.id}
                    gasto={{
                      id: gasto.id,
                      monto: gasto.monto,
                      descripcion: gasto.descripcion,
                      fecha_gasto: gasto.fecha_gasto,
                      estado: gasto.aprobado ? 'aprobado' : 'pendiente',
                      ruta: gastoData.ruta ? {
                        nombre_ruta: gastoData.ruta.nombre_ruta,
                        color: gastoData.ruta.color || null
                      } : null,
                      cobrador: gastoData.cobrador ? { 
                        nombre: gastoData.cobrador.nombre_completo || gastoData.cobrador.email || 'N/A' 
                      } : null,
                      revisor: gastoData.revisor ? { 
                        nombre: gastoData.revisor.nombre_completo || gastoData.revisor.email || 'N/A' 
                      } : null
                    }}
                    currency={config.currency}
                    userRole={userRole}
                    onEdit={() => handleEdit(gasto)}
                    onDelete={() => handleDelete(gasto)}
                  />
                )
              })}
            </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
