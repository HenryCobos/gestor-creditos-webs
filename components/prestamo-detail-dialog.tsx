'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle, DollarSign, Eye, X, FileText, Package } from 'lucide-react'
import { formatCurrency, formatDate, isDateOverdue } from '@/lib/utils'
import { format } from 'date-fns'
import { useConfigStore } from '@/lib/config-store'
import type { Prestamo, Garantia } from '@/lib/store'
import { generarContratoPrestamo } from '@/lib/pdf-generator'

interface Cuota {
  id: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: 'pendiente' | 'pagada' | 'retrasada'
  monto_pagado: number
}

interface PrestamoDetailDialogProps {
  prestamo: Prestamo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function PrestamoDetailDialog({
  prestamo,
  open,
  onOpenChange,
  onUpdate,
}: PrestamoDetailDialogProps) {
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [garantias, setGarantias] = useState<Garantia[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  useEffect(() => {
    if (prestamo && open) {
      loadCuotas()
      if (prestamo.tipo_prestamo === 'empeño') {
        loadGarantias()
      }
    }
  }, [prestamo, open])

  const loadCuotas = async () => {
    if (!prestamo) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('cuotas')
      .select('*')
      .eq('prestamo_id', prestamo.id)
      .order('numero_cuota', { ascending: true })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuotas',
        variant: 'destructive',
      })
    } else {
      // Actualizar estado de cuotas retrasadas
      const cuotasActualizadas = data.map(cuota => {
        if (cuota.estado === 'pendiente' && isDateOverdue(cuota.fecha_vencimiento)) {
          return { ...cuota, estado: 'retrasada' as const }
        }
        return cuota
      })
      setCuotas(cuotasActualizadas as Cuota[])
    }
    setLoading(false)
  }

  const loadGarantias = async () => {
    if (!prestamo) return
    
    const { data, error } = await supabase
      .from('garantias')
      .select('*')
      .eq('prestamo_id', prestamo.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando garantías:', error)
    } else {
      setGarantias(data || [])
    }
  }

  const handleGenerarContrato = () => {
    if (!prestamo || !prestamo.cliente) return

    const garantiasInfo = garantias.map(g => ({
      descripcion: g.descripcion,
      categoria: g.categoria,
      valor_estimado: g.valor_estimado,
      fecha_vencimiento: g.fecha_vencimiento,
    }))

    generarContratoPrestamo(
      {
        nombre: prestamo.cliente.nombre,
        dni: prestamo.cliente.dni,
        telefono: prestamo.cliente.telefono || undefined,
        direccion: prestamo.cliente.direccion || undefined,
      },
      {
        id: prestamo.id,
        monto_prestado: prestamo.monto_prestado,
        interes_porcentaje: prestamo.interes_porcentaje,
        numero_cuotas: prestamo.numero_cuotas,
        fecha_inicio: prestamo.fecha_inicio,
        fecha_fin: prestamo.fecha_fin || undefined,
        monto_total: prestamo.monto_total,
        frecuencia_pago: prestamo.frecuencia_pago,
        tipo_interes: prestamo.tipo_interes,
        tipo_prestamo: prestamo.tipo_prestamo,
        tipo_calculo_interes: prestamo.tipo_calculo_interes,
      },
      config.companyName,
      garantiasInfo.length > 0 ? garantiasInfo : undefined
    )

    toast({
      title: 'Éxito',
      description: 'Contrato PDF generado correctamente',
    })
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCuota || !prestamo) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const monto = parseFloat(montoPago)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Error',
        description: 'El monto del pago debe ser mayor a 0',
        variant: 'destructive',
      })
      return
    }

    const nuevoMontoPagado = selectedCuota.monto_pagado + monto
    const esPagoCompleto = nuevoMontoPagado >= selectedCuota.monto_cuota

    // Registrar el pago
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert([{
        user_id: user.id,
        cuota_id: selectedCuota.id,
        prestamo_id: prestamo.id,
        monto_pagado: monto,
        metodo_pago: metodoPago || null,
        notas: notas || null,
        fecha_pago: new Date().toISOString(),
      }])

    if (pagoError) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el pago',
        variant: 'destructive',
      })
      return
    }

    // Actualizar la cuota
    const { error: cuotaError } = await supabase
      .from('cuotas')
      .update({
        monto_pagado: nuevoMontoPagado,
        estado: esPagoCompleto ? 'pagada' : selectedCuota.estado,
        fecha_pago: esPagoCompleto ? format(new Date(), 'yyyy-MM-dd') : null,
      })
      .eq('id', selectedCuota.id)

    if (cuotaError) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuota',
        variant: 'destructive',
      })
      return
    }

    // Si es pago completo, verificar si todas las cuotas del préstamo están pagadas
    if (esPagoCompleto) {
      const { data: cuotasPrestamo } = await supabase
        .from('cuotas')
        .select('id, estado')
        .eq('prestamo_id', prestamo.id)

      const todasPagadas = cuotasPrestamo?.every(
        c => c.estado === 'pagada' || c.id === selectedCuota.id
      )

      if (todasPagadas) {
        await supabase
          .from('prestamos')
          .update({ estado: 'pagado' })
          .eq('id', prestamo.id)
        
        if (onUpdate) onUpdate()
      }
    }

    toast({
      title: 'Éxito',
      description: esPagoCompleto 
        ? 'Cuota pagada completamente' 
        : 'Pago parcial registrado',
    })

    // Recargar cuotas
    loadCuotas()
    resetPagoForm()
  }

  const resetPagoForm = () => {
    setMontoPago('')
    setMetodoPago('')
    setNotas('')
    setSelectedCuota(null)
    setPagoDialogOpen(false)
  }

  if (!prestamo) return null

  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada').length
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'retrasada').length
  const totalPagado = cuotas.reduce((sum, c) => sum + c.monto_pagado, 0)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Detalle del Préstamo</DialogTitle>
                <DialogDescription>
                  Cliente: {prestamo.cliente?.nombre || '-'}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleGenerarContrato}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Generar Contrato PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Resumen del Préstamo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Resumen del Préstamo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monto Prestado</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(prestamo.monto_prestado, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Interés</p>
                  <p className="text-lg font-bold text-blue-900">
                    {prestamo.interes_porcentaje}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Total</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(prestamo.monto_total, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totalPagado, config.currency)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-blue-200">
                <div>
                  <p className="text-sm text-gray-600">Fecha de Inicio</p>
                  <p className="font-semibold">{formatDate(prestamo.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
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
                </div>
                <div>
                  <p className="text-sm text-gray-600">Progreso</p>
                  <p className="font-semibold">
                    {cuotasPagadas} / {cuotas.length} cuotas pagadas
                  </p>
                </div>
                {prestamo.tipo_prestamo && (
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prestamo.tipo_prestamo === 'empeño'
                        ? 'bg-purple-100 text-purple-800'
                        : prestamo.tipo_prestamo === 'solo_intereses'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prestamo.tipo_prestamo === 'empeño' ? 'Empeño' :
                       prestamo.tipo_prestamo === 'solo_intereses' ? 'Solo Intereses' :
                       'Amortización'}
                    </span>
                  </div>
                )}
                {prestamo.fecha_fin && (
                  <div>
                    <p className="text-sm text-gray-600">Vencimiento Capital</p>
                    <p className="font-semibold">{formatDate(prestamo.fecha_fin)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Garantías (Solo para Empeños) */}
            {prestamo.tipo_prestamo === 'empeño' && garantias.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Garantías/Colaterales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {garantias.map((garantia) => (
                    <div key={garantia.id} className="border rounded-lg p-4 bg-purple-50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-purple-900">{garantia.descripcion}</h4>
                          {garantia.categoria && (
                            <p className="text-xs text-purple-700 mt-1">
                              Categoría: {garantia.categoria}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          garantia.estado === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : garantia.estado === 'liquidado'
                            ? 'bg-red-100 text-red-800'
                            : garantia.estado === 'renovado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {garantia.estado}
                        </span>
                      </div>
                      {garantia.valor_estimado && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Valor estimado:</span>{' '}
                          {formatCurrency(garantia.valor_estimado, config.currency)}
                        </p>
                      )}
                      {garantia.fecha_vencimiento && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Vencimiento:</span>{' '}
                          {formatDate(garantia.fecha_vencimiento)}
                          {isDateOverdue(garantia.fecha_vencimiento) && garantia.estado === 'activo' && (
                            <span className="ml-2 text-red-600 font-medium">⚠ Vencido</span>
                          )}
                        </p>
                      )}
                      {garantia.numero_renovaciones > 0 && (
                        <p className="text-xs text-blue-700">
                          Renovaciones: {garantia.numero_renovaciones}
                        </p>
                      )}
                      {garantia.observaciones && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          {garantia.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Cuotas */}
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Cuotas del Préstamo</h3>
              {loading ? (
                <p className="text-center py-8 text-gray-500">Cargando cuotas...</p>
              ) : cuotas.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No hay cuotas registradas</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuotas.map((cuota) => {
                        const montoPendiente = cuota.monto_cuota - cuota.monto_pagado
                        return (
                          <TableRow key={cuota.id}>
                            <TableCell className="font-medium">
                              {cuota.numero_cuota}
                            </TableCell>
                            <TableCell>{formatCurrency(cuota.monto_cuota, config.currency)}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(cuota.monto_pagado, config.currency)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(montoPendiente, config.currency)}
                            </TableCell>
                            <TableCell>{formatDate(cuota.fecha_vencimiento)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  cuota.estado === 'pagada'
                                    ? 'bg-green-100 text-green-800'
                                    : cuota.estado === 'retrasada'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {cuota.estado}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {cuota.estado !== 'pagada' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCuota(cuota)
                                    setMontoPago(montoPendiente.toFixed(2))
                                    setPagoDialogOpen(true)
                                  }}
                                >
                                  <DollarSign className="mr-1 h-3 w-3" />
                                  Pagar
                                </Button>
                              )}
                              {cuota.estado === 'pagada' && (
                                <CheckCircle className="h-5 w-5 text-green-600 inline" />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Registro de Pago */}
      <Dialog open={pagoDialogOpen} onOpenChange={(isOpen) => {
        setPagoDialogOpen(isOpen)
        if (!isOpen) resetPagoForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Cliente: {prestamo.cliente?.nombre} - Cuota #{selectedCuota?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          {selectedCuota && (
            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto de la cuota:</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedCuota.monto_cuota, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ya pagado:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto pendiente:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(selectedCuota.monto_cuota - selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto del Pago *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCuota.monto_cuota - selectedCuota.monto_pagado}
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo">Método de Pago</Label>
                <Input
                  id="metodo"
                  placeholder="Ej: Efectivo, Transferencia, etc."
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Input
                  id="notas"
                  placeholder="Información adicional"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetPagoForm}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Pago</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

