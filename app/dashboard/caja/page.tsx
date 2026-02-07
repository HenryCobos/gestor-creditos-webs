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
import { 
  Calculator, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar
} from 'lucide-react'
import { useStore, type ArqueoCaja } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { format } from 'date-fns'

export default function CajaPage() {
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [selectedArqueo, setSelectedArqueo] = useState<ArqueoCaja | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [rutas, setRutas] = useState<any[]>([])
  const [dineroEsperado, setDineroEsperado] = useState<number>(0)
  const [desglose, setDesglose] = useState<any>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const { arqueos, setArqueos, addArqueo } = useStore()
  const { config } = useConfigStore()

  const [formData, setFormData] = useState({
    ruta_id: '',
    fecha_arqueo: format(new Date(), 'yyyy-MM-dd'),
    dinero_reportado: '',
    notas: '',
  })

  const [filtros, setFiltros] = useState({
    fecha_desde: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
    fecha_hasta: format(new Date(), 'yyyy-MM-dd'),
    ruta_id: 'todas',
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
      setUserRole(profile.role)
      setUserId(user.id)
      setOrganizationId(profile.organization_id)
      
      if (profile.role === 'admin') {
        loadRutas(profile.organization_id)
        loadArqueos(profile.organization_id)
      } else if (profile.role === 'cobrador') {
        loadRutasCobrador(user.id)
        loadArqueosCobrador(user.id)
      }
    }
  }

  const loadRutas = async (orgId: string) => {
    const { data } = await supabase
      .from('rutas')
      .select('*, cobrador:profiles!rutas_cobrador_id_fkey(id, nombre_completo, email)')
      .eq('organization_id', orgId)
      .eq('estado', 'activa')
      .order('nombre_ruta', { ascending: true })

    if (data) {
      setRutas(data)
    }
  }

  const loadRutasCobrador = async (cobradorId: string) => {
    const { data } = await supabase
      .from('rutas')
      .select('*')
      .eq('cobrador_id', cobradorId)
      .eq('estado', 'activa')
      .order('nombre_ruta', { ascending: true })

    if (data) {
      setRutas(data)
      if (data.length === 1) {
        setFormData(prev => ({ ...prev, ruta_id: data[0].id }))
      }
    }
  }

  const loadArqueos = async (orgId: string) => {
    setLoading(true)

    let query = supabase
      .from('arqueos_caja')
      .select(`
        *,
        ruta:rutas(id, nombre_ruta, color),
        cobrador:profiles!arqueos_caja_cobrador_id_fkey(nombre_completo, email),
        revisor:profiles!arqueos_caja_revisado_por_fkey(nombre_completo)
      `)
      .eq('organization_id', orgId)

    // Aplicar filtros
    if (filtros.fecha_desde) {
      query = query.gte('fecha_arqueo', filtros.fecha_desde)
    }
    if (filtros.fecha_hasta) {
      query = query.lte('fecha_arqueo', filtros.fecha_hasta)
    }
    if (filtros.ruta_id !== 'todas') {
      query = query.eq('ruta_id', filtros.ruta_id)
    }

    query = query.order('fecha_arqueo', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error cargando arqueos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los arqueos',
        variant: 'destructive',
      })
    } else {
      setArqueos(data || [])
    }
    setLoading(false)
  }

  const loadArqueosCobrador = async (cobradorId: string) => {
    setLoading(true)

    let query = supabase
      .from('arqueos_caja')
      .select(`
        *,
        ruta:rutas(id, nombre_ruta, color),
        revisor:profiles!arqueos_caja_revisado_por_fkey(nombre_completo)
      `)
      .eq('cobrador_id', cobradorId)

    // Aplicar filtros
    if (filtros.fecha_desde) {
      query = query.gte('fecha_arqueo', filtros.fecha_desde)
    }
    if (filtros.fecha_hasta) {
      query = query.lte('fecha_arqueo', filtros.fecha_hasta)
    }

    query = query.order('fecha_arqueo', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error cargando arqueos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus arqueos',
        variant: 'destructive',
      })
    } else {
      setArqueos(data || [])
    }
    setLoading(false)
  }

  const calcularDineroEsperado = async () => {
    if (!formData.ruta_id || !formData.fecha_arqueo) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar una ruta y fecha',
        variant: 'destructive',
      })
      return
    }

    setCalculando(true)

    try {
      // 1. Obtener ruta con capital actual
      const { data: ruta } = await supabase
        .from('rutas')
        .select('capital_actual, capital_inicial')
        .eq('id', formData.ruta_id)
        .single()

      if (!ruta) {
        toast({
          title: 'Error',
          description: 'No se encontró la ruta',
          variant: 'destructive',
        })
        setCalculando(false)
        return
      }

      // 2. Obtener pagos recibidos en la fecha
      const { data: pagos } = await supabase
        .from('pagos')
        .select(`
          monto_pagado,
          prestamo:prestamos!inner(ruta_id)
        `)
        .eq('prestamos.ruta_id', formData.ruta_id)
        .gte('fecha_pago', `${formData.fecha_arqueo}T00:00:00`)
        .lte('fecha_pago', `${formData.fecha_arqueo}T23:59:59`)

      const totalPagos = pagos?.reduce((sum, p) => sum + p.monto_pagado, 0) || 0

      // 3. Obtener préstamos entregados en la fecha
      const { data: prestamos } = await supabase
        .from('prestamos')
        .select('monto_prestado')
        .eq('ruta_id', formData.ruta_id)
        .gte('created_at', `${formData.fecha_arqueo}T00:00:00`)
        .lte('created_at', `${formData.fecha_arqueo}T23:59:59`)

      const totalPrestamos = prestamos?.reduce((sum, p) => sum + p.monto_prestado, 0) || 0

      // 4. Obtener gastos aprobados en la fecha
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto')
        .eq('ruta_id', formData.ruta_id)
        .eq('fecha_gasto', formData.fecha_arqueo)
        .eq('aprobado', true)

      const totalGastos = gastos?.reduce((sum, g) => sum + g.monto, 0) || 0

      // 5. Calcular dinero esperado
      // Formula: Capital actual en BD (que ya incluye todos los movimientos históricos)
      const dineroCalculado = ruta.capital_actual

      setDineroEsperado(dineroCalculado)
      setDesglose({
        capital_actual: ruta.capital_actual,
        pagos_del_dia: totalPagos,
        prestamos_del_dia: totalPrestamos,
        gastos_del_dia: totalGastos,
      })

      toast({
        title: 'Cálculo completado',
        description: `Dinero esperado: ${formatCurrency(dineroCalculado, config.currency)}`,
      })
    } catch (error) {
      console.error('Error calculando dinero esperado:', error)
      toast({
        title: 'Error',
        description: 'No se pudo calcular el dinero esperado',
        variant: 'destructive',
      })
    }

    setCalculando(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !organizationId || !formData.ruta_id) return

    const dineroReportado = parseFloat(formData.dinero_reportado)
    if (isNaN(dineroReportado) || dineroReportado < 0) {
      toast({
        title: 'Error',
        description: 'El dinero reportado debe ser un número válido',
        variant: 'destructive',
      })
      return
    }

    // Verificar si ya existe un arqueo para esta ruta y fecha
    const { data: existing } = await supabase
      .from('arqueos_caja')
      .select('id')
      .eq('ruta_id', formData.ruta_id)
      .eq('fecha_arqueo', formData.fecha_arqueo)
      .single()

    if (existing) {
      toast({
        title: 'Error',
        description: 'Ya existe un arqueo para esta ruta y fecha',
        variant: 'destructive',
      })
      return
    }

    // Crear arqueo
    const { data: newArqueo, error } = await supabase
      .from('arqueos_caja')
      .insert({
        organization_id: organizationId,
        ruta_id: formData.ruta_id,
        cobrador_id: userId,
        fecha_arqueo: formData.fecha_arqueo,
        dinero_esperado: dineroEsperado,
        dinero_reportado: dineroReportado,
        notas: formData.notas || null,
      })
      .select(`
        *,
        ruta:rutas(id, nombre_ruta, color),
        cobrador:profiles!arqueos_caja_cobrador_id_fkey(nombre_completo, email)
      `)
      .single()

    if (error) {
      console.error('Error creando arqueo:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el arqueo',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Éxito',
      description: `Arqueo registrado - Estado: ${newArqueo.estado}`,
    })

    // Recargar arqueos
    if (userRole === 'admin') {
      loadArqueos(organizationId)
    } else {
      loadArqueosCobrador(userId)
    }

    resetForm()
  }

  const handleVerDetalle = (arqueo: ArqueoCaja) => {
    setSelectedArqueo(arqueo)
    setDetailOpen(true)
  }

  const handleMarcarRevisado = async (arqueo: ArqueoCaja) => {
    if (userRole !== 'admin') return

    const { error } = await supabase
      .from('arqueos_caja')
      .update({
        revisado_por: userId,
        fecha_revision: new Date().toISOString(),
      })
      .eq('id', arqueo.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo marcar como revisado',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: 'Arqueo marcado como revisado',
      })
      loadArqueos(organizationId!)
    }
  }

  const resetForm = () => {
    setFormData({
      ruta_id: rutas.length === 1 ? rutas[0].id : '',
      fecha_arqueo: format(new Date(), 'yyyy-MM-dd'),
      dinero_reportado: '',
      notas: '',
    })
    setDineroEsperado(0)
    setDesglose(null)
    setOpen(false)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'cuadrado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Cuadrado</Badge>
      case 'sobrante':
        return <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="h-3 w-3 mr-1" />Sobrante</Badge>
      case 'faltante':
        return <Badge className="bg-red-100 text-red-800"><TrendingDown className="h-3 w-3 mr-1" />Faltante</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const totalCuadrados = arqueos.filter(a => a.estado === 'cuadrado').length
  const totalSobrantes = arqueos.filter(a => a.estado === 'sobrante').length
  const totalFaltantes = arqueos.filter(a => a.estado === 'faltante').length
  const totalDiferencias = arqueos.reduce((sum, a) => sum + Math.abs(a.diferencia), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'admin' ? 'Arqueos de Caja' : 'Mi Arqueo de Caja'}
          </h1>
          <p className="text-gray-500 mt-1">
            {userRole === 'admin' 
              ? 'Revisa los arqueos diarios de cada ruta'
              : 'Registra tu arqueo de caja diario'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Calculator className="mr-2 h-4 w-4" />
              Nuevo Arqueo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Registrar Arqueo de Caja</DialogTitle>
              <DialogDescription>
                Calcula el dinero esperado y compáralo con el efectivo real
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruta_id">Ruta *</Label>
                  <Select
                    value={formData.ruta_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, ruta_id: value })
                      setDineroEsperado(0)
                      setDesglose(null)
                    }}
                    required
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_arqueo">Fecha del Arqueo *</Label>
                  <Input
                    id="fecha_arqueo"
                    type="date"
                    value={formData.fecha_arqueo}
                    onChange={(e) => {
                      setFormData({ ...formData, fecha_arqueo: e.target.value })
                      setDineroEsperado(0)
                      setDesglose(null)
                    }}
                    required
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              {/* Botón para calcular */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <Button
                  type="button"
                  onClick={calcularDineroEsperado}
                  disabled={!formData.ruta_id || !formData.fecha_arqueo || calculando}
                  className="w-full"
                  variant="outline"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculando ? 'Calculando...' : 'Calcular Dinero Esperado'}
                </Button>

                {dineroEsperado > 0 && desglose && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Capital en Ruta:</span>
                      <span className="font-semibold">{formatCurrency(desglose.capital_actual, config.currency)}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Dinero Esperado:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(dineroEsperado, config.currency)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Este es el dinero que deberías tener según el sistema
                    </p>
                  </div>
                )}
              </div>

              {/* Dinero reportado */}
              {dineroEsperado > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dinero_reportado">Dinero Real (Contado) *</Label>
                    <Input
                      id="dinero_reportado"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dinero_reportado}
                      onChange={(e) => setFormData({ ...formData, dinero_reportado: e.target.value })}
                      required
                      placeholder="0.00"
                      className="text-lg font-semibold"
                    />
                    {formData.dinero_reportado && (
                      <div className="text-sm">
                        <span className="text-gray-600">Diferencia: </span>
                        <span className={`font-semibold ${
                          parseFloat(formData.dinero_reportado) === dineroEsperado
                            ? 'text-green-600'
                            : parseFloat(formData.dinero_reportado) > dineroEsperado
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {parseFloat(formData.dinero_reportado) > dineroEsperado ? '+' : ''}
                          {formatCurrency(parseFloat(formData.dinero_reportado) - dineroEsperado, config.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas / Observaciones</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Explica cualquier diferencia o situación especial..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={dineroEsperado === 0 || !formData.dinero_reportado}>
                  Registrar Arqueo
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
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => {
                    setFiltros({ ...filtros, fecha_desde: e.target.value })
                    setTimeout(() => loadArqueos(organizationId!), 100)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => {
                    setFiltros({ ...filtros, fecha_hasta: e.target.value })
                    setTimeout(() => loadArqueos(organizationId!), 100)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Ruta</Label>
                <Select
                  value={filtros.ruta_id}
                  onValueChange={(value) => {
                    setFiltros({ ...filtros, ruta_id: value })
                    setTimeout(() => loadArqueos(organizationId!), 100)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
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
                    setFiltros({
                      fecha_desde: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
                      fecha_hasta: format(new Date(), 'yyyy-MM-dd'),
                      ruta_id: 'todas',
                    })
                    setTimeout(() => loadArqueos(organizationId!), 100)
                  }}
                  className="w-full"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Arqueos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arqueos.length}</div>
            <p className="text-xs text-muted-foreground">Registrados en el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuadrados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalCuadrados}</div>
            <p className="text-xs text-muted-foreground">
              {arqueos.length > 0 ? `${((totalCuadrados / arqueos.length) * 100).toFixed(0)}%` : '0%'} del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Diferencias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalSobrantes + totalFaltantes}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalSobrantes} sobrantes, {totalFaltantes} faltantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diferencia Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDiferencias, config.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Suma de diferencias absolutas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de arqueos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Arqueos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : arqueos.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Calculator className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-500">No hay arqueos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  {userRole === 'admin' && <TableHead>Cobrador</TableHead>}
                  <TableHead>Ruta</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Reportado</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Revisado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arqueos.map((arqueo) => (
                  <TableRow key={arqueo.id}>
                    <TableCell className="font-medium">
                      {formatDate(arqueo.fecha_arqueo)}
                    </TableCell>
                    {userRole === 'admin' && (
                      <TableCell>
                        {arqueo.cobrador?.nombre_completo || arqueo.cobrador?.email || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell>
                      {arqueo.ruta ? (
                        <Badge variant="outline" style={{ borderColor: arqueo.ruta.color || undefined }}>
                          {arqueo.ruta.nombre_ruta}
                        </Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(arqueo.dinero_esperado, config.currency)}</TableCell>
                    <TableCell>{formatCurrency(arqueo.dinero_reportado, config.currency)}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        arqueo.diferencia === 0 
                          ? 'text-green-600' 
                          : arqueo.diferencia > 0 
                          ? 'text-blue-600' 
                          : 'text-red-600'
                      }`}>
                        {arqueo.diferencia > 0 ? '+' : ''}
                        {formatCurrency(arqueo.diferencia, config.currency)}
                      </span>
                    </TableCell>
                    <TableCell>{getEstadoBadge(arqueo.estado)}</TableCell>
                    <TableCell>
                      {arqueo.revisado_por ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Revisado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerDetalle(arqueo)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        {userRole === 'admin' && !arqueo.revisado_por && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarcarRevisado(arqueo)}
                            title="Marcar como revisado"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalle del Arqueo */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Arqueo</DialogTitle>
          </DialogHeader>
          {selectedArqueo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold">{formatDate(selectedArqueo.fecha_arqueo)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ruta</p>
                  <p className="font-semibold">{selectedArqueo.ruta?.nombre_ruta}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dinero Esperado:</span>
                  <span className="font-semibold">{formatCurrency(selectedArqueo.dinero_esperado, config.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dinero Reportado:</span>
                  <span className="font-semibold">{formatCurrency(selectedArqueo.dinero_reportado, config.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-semibold">Diferencia:</span>
                  <span className={`font-bold text-lg ${
                    selectedArqueo.diferencia === 0 
                      ? 'text-green-600' 
                      : selectedArqueo.diferencia > 0 
                      ? 'text-blue-600' 
                      : 'text-red-600'
                  }`}>
                    {selectedArqueo.diferencia > 0 ? '+' : ''}
                    {formatCurrency(selectedArqueo.diferencia, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  {getEstadoBadge(selectedArqueo.estado)}
                </div>
              </div>

              {selectedArqueo.notas && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notas:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedArqueo.notas}</p>
                </div>
              )}

              {selectedArqueo.revisado_por && (
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600">Revisado por:</p>
                  <p className="font-semibold">{selectedArqueo.revisor?.nombre_completo || 'Admin'}</p>
                  <p className="text-xs text-gray-500">
                    {selectedArqueo.fecha_revision && formatDate(selectedArqueo.fecha_revision)}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
