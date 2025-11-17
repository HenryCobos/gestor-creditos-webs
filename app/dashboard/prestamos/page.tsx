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
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useStore, type Prestamo, type Cliente } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { PrestamoDetailDialog } from '@/components/prestamo-detail-dialog'
import { LimiteAlcanzadoDialog } from '@/components/limite-alcanzado-dialog'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadUserSubscription, loadUsageLimits } from '@/lib/subscription-helpers'
import { 
  calculateLoanDetails, 
  calcularSiguienteFechaPago, 
  getNombreFrecuencia,
  validarNumeroCuotas,
  type FrecuenciaPago,
  type TipoInteres 
} from '@/lib/loan-calculations'
import { format } from 'date-fns'

export default function PrestamosPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null)
  const [limiteDialogOpen, setLimiteDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { clientes, setClientes, prestamos, setPrestamos, addPrestamo, updatePrestamo, deletePrestamo } = useStore()
  const { config } = useConfigStore()
  const { canAddPrestamo, setUserSubscription, setUsageLimits } = useSubscriptionStore()

  const [formData, setFormData] = useState({
    cliente_id: '',
    monto_prestado: '',
    interes_porcentaje: '',
    numero_cuotas: '',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    frecuencia_pago: 'mensual' as FrecuenciaPago,
    tipo_interes: 'simple' as TipoInteres,
  })

  const [calculatedDetails, setCalculatedDetails] = useState({
    interes: 0,
    montoTotal: 0,
    montoCuota: 0,
  })

  useEffect(() => {
    loadData()
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    const [subscription, limits] = await Promise.all([
      loadUserSubscription(),
      loadUsageLimits(),
    ])
    if (subscription) setUserSubscription(subscription)
    if (limits) setUsageLimits(limits)
  }

  useEffect(() => {
    // Calcular detalles del préstamo cuando cambian los valores
    if (formData.monto_prestado && formData.interes_porcentaje && formData.numero_cuotas) {
      const monto = parseFloat(formData.monto_prestado)
      const interes = parseFloat(formData.interes_porcentaje)
      const cuotas = parseInt(formData.numero_cuotas)

      if (!isNaN(monto) && !isNaN(interes) && !isNaN(cuotas) && cuotas > 0) {
        const details = calculateLoanDetails({
          monto,
          interesPorcentaje: interes,
          numeroCuotas: cuotas,
          tipoInteres: formData.tipo_interes,
        })
        setCalculatedDetails(details)
      }
    }
  }, [formData.monto_prestado, formData.interes_porcentaje, formData.numero_cuotas, formData.tipo_interes])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Cargar clientes
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre', { ascending: true })

    if (clientesData) {
      setClientes(clientesData)
    }

    // Cargar préstamos con información del cliente
    const { data: prestamosData, error } = await supabase
      .from('prestamos')
      .select(`
        *,
        cliente:clientes(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los préstamos',
        variant: 'destructive',
      })
    } else {
      setPrestamos(prestamosData || [])
    }
    setLoading(false)
  }

  const handleOpenDialog = () => {
    if (!canAddPrestamo()) {
      setLimiteDialogOpen(true)
      return
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificar límite antes de crear
    if (!canAddPrestamo()) {
      setLimiteDialogOpen(true)
      setOpen(false)
      return
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const monto = parseFloat(formData.monto_prestado)
    const interes = parseFloat(formData.interes_porcentaje)
    const cuotas = parseInt(formData.numero_cuotas)

    // Validar número de cuotas según frecuencia
    const validacion = validarNumeroCuotas(cuotas, formData.frecuencia_pago)
    if (!validacion.valido) {
      toast({
        title: 'Error de validación',
        description: validacion.mensaje,
        variant: 'destructive',
      })
      return
    }

    const { montoTotal, montoCuota } = calculateLoanDetails({
      monto,
      interesPorcentaje: interes,
      numeroCuotas: cuotas,
      tipoInteres: formData.tipo_interes,
    })

    // Crear préstamo
    const { data: prestamo, error: prestamoError } = await supabase
      .from('prestamos')
      .insert([{
        user_id: user.id,
        cliente_id: formData.cliente_id,
        monto_prestado: monto,
        interes_porcentaje: interes,
        numero_cuotas: cuotas,
        fecha_inicio: formData.fecha_inicio,
        monto_total: montoTotal,
        frecuencia_pago: formData.frecuencia_pago,
        tipo_interes: formData.tipo_interes,
        estado: 'activo',
      }])
      .select(`
        *,
        cliente:clientes(*)
      `)
      .single()

    if (prestamoError) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el préstamo',
        variant: 'destructive',
      })
      return
    }

    // Crear cuotas automáticamente con la frecuencia seleccionada
    const cuotasToCreate = []
    const fechaInicio = new Date(formData.fecha_inicio)

    for (let i = 1; i <= cuotas; i++) {
      const fechaVencimiento = calcularSiguienteFechaPago(
        fechaInicio,
        i,
        formData.frecuencia_pago
      )
      cuotasToCreate.push({
        user_id: user.id,
        prestamo_id: prestamo.id,
        numero_cuota: i,
        monto_cuota: montoCuota,
        fecha_vencimiento: format(fechaVencimiento, 'yyyy-MM-dd'),
        estado: 'pendiente',
        monto_pagado: 0,
      })
    }

    const { error: cuotasError } = await supabase
      .from('cuotas')
      .insert(cuotasToCreate)

    if (cuotasError) {
      toast({
        title: 'Error',
        description: 'No se pudieron crear las cuotas',
        variant: 'destructive',
      })
      // Eliminar el préstamo si falló la creación de cuotas
      await supabase.from('prestamos').delete().eq('id', prestamo.id)
      return
    }

    addPrestamo(prestamo)
    toast({
      title: 'Éxito',
      description: `Préstamo creado con ${cuotas} cuotas ${getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}es`,
    })
    
    // Recargar límites después de agregar
    loadSubscriptionData()
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este préstamo? Se eliminarán también sus cuotas.')) return

    const { error } = await supabase
      .from('prestamos')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el préstamo',
        variant: 'destructive',
      })
    } else {
      deletePrestamo(id)
      toast({
        title: 'Éxito',
        description: 'Préstamo eliminado correctamente',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      monto_prestado: '',
      interes_porcentaje: '',
      numero_cuotas: '',
      fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
      frecuencia_pago: 'mensual',
      tipo_interes: 'simple',
    })
    setCalculatedDetails({
      interes: 0,
      montoTotal: 0,
      montoCuota: 0,
    })
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-gray-500 mt-1">Gestiona los créditos otorgados</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button disabled={clientes.length === 0} onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Préstamo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Préstamo</DialogTitle>
              <DialogDescription>
                Las cuotas se calcularán y crearán automáticamente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cliente_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monto_prestado">Monto Prestado *</Label>
                  <Input
                    id="monto_prestado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto_prestado}
                    onChange={(e) =>
                      setFormData({ ...formData, monto_prestado: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interes_porcentaje">Interés (%) *</Label>
                  <Input
                    id="interes_porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.interes_porcentaje}
                    onChange={(e) =>
                      setFormData({ ...formData, interes_porcentaje: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_cuotas">Número de Cuotas *</Label>
                  <Input
                    id="numero_cuotas"
                    type="number"
                    min="1"
                    value={formData.numero_cuotas}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_cuotas: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_inicio: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frecuencia_pago">Frecuencia de Pago *</Label>
                  <Select
                    value={formData.frecuencia_pago}
                    onValueChange={(value) =>
                      setFormData({ ...formData, frecuencia_pago: value as FrecuenciaPago })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_interes">Tipo de Interés *</Label>
                  <Select
                    value={formData.tipo_interes}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo_interes: value as TipoInteres })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="compuesto">Compuesto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculatedDetails.montoTotal > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm text-blue-900">
                    Resumen del Préstamo
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Interés Total</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculatedDetails.interes, config.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Monto Total</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculatedDetails.montoTotal, config.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cuota {getNombreFrecuencia(formData.frecuencia_pago)}</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculatedDetails.montoCuota, config.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Préstamo</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Primero debes agregar clientes para poder crear préstamos
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : prestamos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay préstamos registrados aún
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto Prestado</TableHead>
                  <TableHead>Interés</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Cuotas</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestamos.map((prestamo) => (
                  <TableRow key={prestamo.id}>
                    <TableCell className="font-medium">
                      {prestamo.cliente?.nombre || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(prestamo.monto_prestado, config.currency)}</TableCell>
                    <TableCell>{prestamo.interes_porcentaje}% ({prestamo.tipo_interes || 'simple'})</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(prestamo.monto_total, config.currency)}
                    </TableCell>
                    <TableCell>{prestamo.numero_cuotas}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {getNombreFrecuencia(prestamo.frecuencia_pago || 'mensual')}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(prestamo.fecha_inicio)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prestamo.estado === 'activo'
                            ? 'bg-blue-100 text-blue-800'
                            : prestamo.estado === 'pagado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {prestamo.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPrestamo(prestamo)
                            setDetailDialogOpen(true)
                          }}
                          title="Ver detalles y cuotas"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(prestamo.id)}
                          title="Eliminar préstamo"
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

      <PrestamoDetailDialog
        prestamo={selectedPrestamo}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={loadData}
      />

      <LimiteAlcanzadoDialog
        open={limiteDialogOpen}
        onOpenChange={setLimiteDialogOpen}
        tipo="prestamos"
      />
    </div>
  )
}

