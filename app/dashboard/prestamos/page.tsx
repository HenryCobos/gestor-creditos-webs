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
  type TipoInteres,
  type TipoPrestamo
} from '@/lib/loan-calculations'
import { format, addMonths, addWeeks, addDays } from 'date-fns'
import type { Garantia } from '@/lib/store'

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
    fecha_fin: '',
    frecuencia_pago: 'mensual' as FrecuenciaPago,
    tipo_interes: 'simple' as TipoInteres,
    tipo_prestamo: 'amortizacion' as TipoPrestamo,
  })

  const [garantias, setGarantias] = useState<Array<{
    descripcion: string
    categoria: string
    valor_estimado: string
    fecha_vencimiento: string
    observaciones: string
  }>>([])

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
          tipoPrestamo: formData.tipo_prestamo,
        })
        setCalculatedDetails(details)
        
        // Calcular fecha_fin para modo solo intereses
        if (formData.tipo_prestamo === 'solo_intereses' && formData.fecha_inicio) {
          const fechaInicio = new Date(formData.fecha_inicio)
          let fechaFin: Date
          
          switch (formData.frecuencia_pago) {
            case 'diario':
              fechaFin = addDays(fechaInicio, cuotas)
              break
            case 'semanal':
              fechaFin = addWeeks(fechaInicio, cuotas)
              break
            case 'quincenal':
              fechaFin = addWeeks(fechaInicio, cuotas * 2)
              break
            case 'mensual':
            default:
              fechaFin = addMonths(fechaInicio, cuotas)
              break
          }
          
          setFormData(prev => ({
            ...prev,
            fecha_fin: format(fechaFin, 'yyyy-MM-dd')
          }))
        }
      }
    }
  }, [formData.monto_prestado, formData.interes_porcentaje, formData.numero_cuotas, formData.tipo_interes, formData.tipo_prestamo, formData.frecuencia_pago, formData.fecha_inicio])

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
      tipoPrestamo: formData.tipo_prestamo,
    })

    // Calcular fecha_fin si es modo solo intereses
    let fechaFin: string | null = null
    if (formData.tipo_prestamo === 'solo_intereses') {
      const fechaInicio = new Date(formData.fecha_inicio)
      let fechaFinDate: Date
      
      switch (formData.frecuencia_pago) {
        case 'diario':
          fechaFinDate = addDays(fechaInicio, cuotas)
          break
        case 'semanal':
          fechaFinDate = addWeeks(fechaInicio, cuotas)
          break
        case 'quincenal':
          fechaFinDate = addWeeks(fechaInicio, cuotas * 2)
          break
        case 'mensual':
        default:
          fechaFinDate = addMonths(fechaInicio, cuotas)
          break
      }
      fechaFin = format(fechaFinDate, 'yyyy-MM-dd')
    }

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
        fecha_fin: fechaFin,
        monto_total: montoTotal,
        frecuencia_pago: formData.frecuencia_pago,
        tipo_interes: formData.tipo_interes,
        tipo_prestamo: formData.tipo_prestamo,
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

    // Crear garantías si es empeño
    if (formData.tipo_prestamo === 'empeño' && garantias.length > 0) {
      const garantiasToCreate = garantias
        .filter(g => g.descripcion.trim() !== '')
        .map(garantia => ({
          user_id: user.id,
          prestamo_id: prestamo.id,
          descripcion: garantia.descripcion,
          categoria: garantia.categoria || null,
          valor_estimado: garantia.valor_estimado ? parseFloat(garantia.valor_estimado) : null,
          fecha_vencimiento: garantia.fecha_vencimiento || null,
          observaciones: garantia.observaciones || null,
          estado: 'activo',
          numero_renovaciones: 0,
        }))

      if (garantiasToCreate.length > 0) {
        const { error: garantiasError } = await supabase
          .from('garantias')
          .insert(garantiasToCreate)

        if (garantiasError) {
          toast({
            title: 'Advertencia',
            description: 'Préstamo creado pero no se pudieron crear las garantías',
            variant: 'destructive',
          })
        }
      }
    }

    // Crear cuotas automáticamente con la frecuencia seleccionada
    const cuotasToCreate = []
    const fechaInicio = new Date(formData.fecha_inicio)

    // Para modo "solo intereses", cada cuota es solo el interés
    // Para modo "amortización" o "empeño", cada cuota incluye capital + interés
    const montoPorCuota = formData.tipo_prestamo === 'solo_intereses'
      ? (monto * interes / 100) // Solo el interés mensual
      : montoCuota // Capital + interés

    for (let i = 1; i <= cuotas; i++) {
      const fechaVencimiento = calcularSiguienteFechaPago(
        fechaInicio,
        i,
        formData.frecuencia_pago
      )
      
      // Última cuota en modo "solo intereses" incluye el capital
      const esUltimaCuota = i === cuotas
      const montoCuotaFinal = formData.tipo_prestamo === 'solo_intereses' && esUltimaCuota
        ? montoPorCuota + monto // Interés + capital
        : montoPorCuota

      cuotasToCreate.push({
        user_id: user.id,
        prestamo_id: prestamo.id,
        numero_cuota: i,
        monto_cuota: montoCuotaFinal,
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
      fecha_fin: '',
      frecuencia_pago: 'mensual',
      tipo_interes: 'simple',
      tipo_prestamo: 'amortizacion',
    })
    setGarantias([])
    setCalculatedDetails({
      interes: 0,
      montoTotal: 0,
      montoCuota: 0,
    })
    setOpen(false)
  }

  const addGarantia = () => {
    setGarantias([...garantias, {
      descripcion: '',
      categoria: '',
      valor_estimado: '',
      fecha_vencimiento: '',
      observaciones: '',
    }])
  }

  const removeGarantia = (index: number) => {
    setGarantias(garantias.filter((_, i) => i !== index))
  }

  const updateGarantia = (index: number, field: string, value: string) => {
    const updated = [...garantias]
    updated[index] = { ...updated[index], [field]: value }
    setGarantias(updated)
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
                  <Label htmlFor="tipo_prestamo">Tipo de Préstamo *</Label>
                  <Select
                    value={formData.tipo_prestamo}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo_prestamo: value as TipoPrestamo })
                      if (value !== 'empeño') {
                        setGarantias([])
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amortizacion">Amortización (Capital + Interés)</SelectItem>
                      <SelectItem value="solo_intereses">Solo Intereses (Capital al final)</SelectItem>
                      <SelectItem value="empeño">Empeño (Con garantías)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {formData.tipo_prestamo === 'solo_intereses' && formData.fecha_fin && (
                  <div className="space-y-2">
                    <Label htmlFor="fecha_fin">Fecha de Vencimiento (Capital)</Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={formData.fecha_fin}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500">Calculada automáticamente</p>
                  </div>
                )}

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
                  {formData.tipo_prestamo === 'solo_intereses' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Interés por Cuota</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(calculatedDetails.montoCuota || 0, config.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Capital a Pagar al Final</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(parseFloat(formData.monto_prestado || '0'), config.currency)}
                        </p>
                      </div>
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
                    </div>
                  ) : (
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
                  )}
                </div>
              )}

              {/* Sección de Garantías para Empeños */}
              {formData.tipo_prestamo === 'empeño' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Garantías/Colaterales</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGarantia}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Garantía
                    </Button>
                  </div>
                  
                  {garantias.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Agrega al menos una garantía para este empeño
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {garantias.map((garantia, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">Garantía {index + 1}</h5>
                            {garantias.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGarantia(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label>Descripción *</Label>
                              <Input
                                value={garantia.descripcion}
                                onChange={(e) => updateGarantia(index, 'descripcion', e.target.value)}
                                placeholder="Ej: Anillo de oro, iPhone 13, etc."
                                required
                              />
                            </div>
                            
                            <div>
                              <Label>Categoría</Label>
                              <Select
                                value={garantia.categoria}
                                onValueChange={(value) => updateGarantia(index, 'categoria', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="joyas">Joyas</SelectItem>
                                  <SelectItem value="electronica">Electrónica</SelectItem>
                                  <SelectItem value="vehiculo">Vehículo</SelectItem>
                                  <SelectItem value="electrodomesticos">Electrodomésticos</SelectItem>
                                  <SelectItem value="herramientas">Herramientas</SelectItem>
                                  <SelectItem value="otros">Otros</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Valor Estimado</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={garantia.valor_estimado}
                                onChange={(e) => updateGarantia(index, 'valor_estimado', e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <Label>Fecha de Vencimiento</Label>
                              <Input
                                type="date"
                                value={garantia.fecha_vencimiento}
                                onChange={(e) => updateGarantia(index, 'fecha_vencimiento', e.target.value)}
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Observaciones</Label>
                              <Input
                                value={garantia.observaciones}
                                onChange={(e) => updateGarantia(index, 'observaciones', e.target.value)}
                                placeholder="Notas adicionales..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <TableHead>Tipo</TableHead>
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        prestamo.tipo_prestamo === 'empeño'
                          ? 'bg-purple-100 text-purple-800'
                          : prestamo.tipo_prestamo === 'solo_intereses'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prestamo.tipo_prestamo === 'empeño' ? 'Empeño' :
                         prestamo.tipo_prestamo === 'solo_intereses' ? 'Solo Interés' :
                         'Amortización'}
                      </span>
                    </TableCell>
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

