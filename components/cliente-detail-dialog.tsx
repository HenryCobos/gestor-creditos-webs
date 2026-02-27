"use client"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDate, isDateOverdue } from '@/lib/utils'
import { getNombreFrecuencia } from '@/lib/loan-calculations'
import { DollarSign, CreditCard, AlertCircle, CheckCircle, FileText, Download, XCircle } from 'lucide-react'
import type { Cliente } from '@/lib/store'
import { generarContratoPrestamo, generarPlanPagos } from '@/lib/pdf-generator'
import { useConfigStore } from '@/lib/config-store'
import { getCuotasSegunRol, getPrestamosInteligente } from '@/lib/queries-con-roles'

interface ClienteDetailDialogProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentComplete?: () => void
}

interface PrestamoDetalle {
  id: string
  monto_prestado: number
  interes_porcentaje: number
  numero_cuotas: number
  fecha_inicio: string
  estado: string
  monto_total: number
  frecuencia_pago: string
  tipo_interes: string
}

interface CuotaDetalle {
  id: string
  prestamo_id: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: string
  monto_pagado: number
  prestamo: {
    monto_prestado: number
    frecuencia_pago: string
  }
}

export function ClienteDetailDialog({
  cliente,
  open,
  onOpenChange,
  onPaymentComplete,
}: ClienteDetailDialogProps) {
  const [prestamos, setPrestamos] = useState<PrestamoDetalle[]>([])
  const [cuotas, setCuotas] = useState<CuotaDetalle[]>([])
  const [loading, setLoading] = useState(false)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [desmarcarDialogOpen, setDesmarcarDialogOpen] = useState(false)
  const [cuotaADesmarcar, setCuotaADesmarcar] = useState<CuotaDetalle | null>(null)
  const [selectedCuota, setSelectedCuota] = useState<CuotaDetalle | null>(null)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  useEffect(() => {
    if (cliente && open) {
      loadClienteData()
    }
  }, [cliente, open])

  const loadClienteData = async () => {
    if (!cliente) return
    
    setLoading(true)
    try {
      const [prestamosRol, cuotasRol] = await Promise.all([
        getPrestamosInteligente(),
        getCuotasSegunRol(),
      ])

      const prestamosData = (prestamosRol || [])
        .filter(p => p.cliente_id === cliente.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const prestamosMap = new Map(
        prestamosData.map((p: any) => [p.id, { monto_prestado: p.monto_prestado, frecuencia_pago: p.frecuencia_pago }])
      )
      const prestamoIds = new Set(prestamosData.map((p: any) => p.id))

      const cuotasData = (cuotasRol || [])
        .filter(c => prestamoIds.has(c.prestamo_id))
        .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
        .map((cuota: any) => ({
          ...cuota,
          prestamo: prestamosMap.get(cuota.prestamo_id) || { monto_prestado: 0, frecuencia_pago: 'mensual' },
        }))

      setPrestamos(prestamosData as PrestamoDetalle[])
      setCuotas(cuotasData as CuotaDetalle[])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del cliente',
        variant: 'destructive',
      })
      console.error('Error cargando detalle del cliente:', error)
    }
    setLoading(false)
  }

  const handlePagarCuota = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCuota) return

    const monto = parseFloat(montoPago)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Error',
        description: 'El monto del pago debe ser mayor a 0',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/registrar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cuota_id: selectedCuota.id,
          prestamo_id: selectedCuota.prestamo_id,
          monto_pagado: monto,
          metodo_pago: metodoPago || null,
          notas: notas || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo registrar el pago',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: data.message || 'Pago registrado correctamente',
      })

      // Recargar datos
      loadClienteData()
      resetPagoForm()
      onPaymentComplete?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el pago',
        variant: 'destructive',
      })
    }
  }

  const resetPagoForm = () => {
    setMontoPago('')
    setMetodoPago('')
    setNotas('')
    setSelectedCuota(null)
    setPagoDialogOpen(false)
  }

  const handleDesmarcarCuota = async () => {
    if (!cuotaADesmarcar) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Eliminar todos los pagos asociados a esta cuota
    const { error: deletePagosError } = await supabase
      .from('pagos')
      .delete()
      .eq('cuota_id', cuotaADesmarcar.id)

    if (deletePagosError) {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los pagos',
        variant: 'destructive',
      })
      return
    }

    // Determinar nuevo estado de la cuota
    const nuevoEstado = isDateOverdue(cuotaADesmarcar.fecha_vencimiento) ? 'retrasada' : 'pendiente'

    // Actualizar la cuota a estado pendiente
    const { error: updateError } = await supabase
      .from('cuotas')
      .update({
        monto_pagado: 0,
        estado: nuevoEstado,
        fecha_pago: null,
      })
      .eq('id', cuotaADesmarcar.id)

    if (updateError) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuota',
        variant: 'destructive',
      })
      return
    }

    // Obtener el préstamo de la cuota y verificar si estaba pagado
    const { data: prestamoData } = await supabase
      .from('prestamos')
      .select('id, estado')
      .eq('id', cuotaADesmarcar.prestamo_id)
      .single()

    // Si el préstamo estaba marcado como pagado, cambiarlo a activo
    if (prestamoData && prestamoData.estado === 'pagado') {
      await supabase
        .from('prestamos')
        .update({ estado: 'activo' })
        .eq('id', prestamoData.id)
      
      onPaymentComplete?.()
    }

    toast({
      title: 'Éxito',
      description: 'Cuota desmarcada correctamente',
    })

    // Recargar datos
    loadClienteData()
    setDesmarcarDialogOpen(false)
    setCuotaADesmarcar(null)
  }

  const handleGenerarContrato = async (prestamo: PrestamoDetalle) => {
    if (!cliente) return
    
    try {
      // Cargar cuotas del préstamo
      const cuotasRol = await getCuotasSegunRol()
      const cuotasData = (cuotasRol || [])
        .filter(c => c.prestamo_id === prestamo.id)
        .sort((a, b) => a.numero_cuota - b.numero_cuota)

      generarContratoPrestamo(
        {
          nombre: cliente.nombre,
          dni: cliente.dni,
          telefono: cliente.telefono || undefined,
          direccion: cliente.direccion || undefined,
        },
        prestamo,
        config.companyName,
        undefined,
        config.currency,
        config.currencySymbol
      )

      toast({
        title: 'Contrato Generado',
        description: 'El PDF se ha descargado correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el contrato',
        variant: 'destructive',
      })
    }
  }

  const handleGenerarPlanPagos = async (prestamo: PrestamoDetalle) => {
    if (!cliente) return
    
    try {
      const cuotasRol = await getCuotasSegunRol()
      const cuotasData = (cuotasRol || [])
        .filter(c => c.prestamo_id === prestamo.id)
        .sort((a, b) => a.numero_cuota - b.numero_cuota)

      if (cuotasData) {
        generarPlanPagos(
          {
            nombre: cliente.nombre,
            dni: cliente.dni,
            telefono: cliente.telefono || undefined,
            direccion: cliente.direccion || undefined,
          },
          prestamo,
          cuotasData,
          config.companyName
        )

        toast({
          title: 'Plan de Pagos Generado',
          description: 'El PDF se ha descargado correctamente',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el plan de pagos',
        variant: 'destructive',
      })
    }
  }

  if (!cliente) return null

  const totalPrestado = prestamos.reduce((sum, p) => sum + p.monto_prestado, 0)
  const totalPorCobrar = prestamos
    .filter(p => p.estado === 'activo')
    .reduce((sum, p) => sum + p.monto_total, 0)
  const cuotasPendientes = cuotas.filter(c => c.estado !== 'pagada').length
  const cuotasRetrasadas = cuotas.filter(c => c.estado === 'retrasada').length

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalle del Cliente</DialogTitle>
            <DialogDescription>
              Información completa, préstamos y cuotas
            </DialogDescription>
          </DialogHeader>

          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-semibold">{cliente.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">DNI</p>
                <p className="font-semibold">{cliente.dni}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold">{cliente.telefono || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-semibold">{cliente.direccion || '-'}</p>
              </div>
              {cliente.cuenta_bancaria && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Número de Cuenta Bancaria</p>
                  <p className="font-semibold">{cliente.cuenta_bancaria}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen Financiero */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Prestado</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(totalPrestado, config.currency)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Por Cobrar</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(totalPorCobrar, config.currency)}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cuotas Pendientes</p>
                    <p className="text-xl font-bold text-gray-700">
                      {cuotasPendientes}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Retrasadas</p>
                    <p className="text-xl font-bold text-red-600">
                      {cuotasRetrasadas}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de Préstamos y Cuotas */}
          <Tabs defaultValue="cuotas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cuotas">Cuotas Pendientes</TabsTrigger>
              <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
            </TabsList>

            <TabsContent value="cuotas" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-gray-500">Cargando...</p>
              ) : cuotas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-500">No hay cuotas pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota #</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => {
                      const montoPendiente = cuota.monto_cuota - cuota.monto_pagado
                      return (
                        <TableRow key={cuota.id}>
                          <TableCell>#{cuota.numero_cuota}</TableCell>
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
                            {cuota.estado !== 'pagada' ? (
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
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setCuotaADesmarcar(cuota)
                                  setDesmarcarDialogOpen(true)
                                }}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Desmarcar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="prestamos" className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-gray-500">Cargando...</p>
              ) : prestamos.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No hay préstamos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monto</TableHead>
                      <TableHead>Interés</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Cuotas</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">PDFs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prestamos.map((prestamo) => (
                      <TableRow key={prestamo.id}>
                        <TableCell className="font-semibold">
                          {formatCurrency(prestamo.monto_prestado, config.currency)}
                        </TableCell>
                        <TableCell>
                          {prestamo.interes_porcentaje}%
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(prestamo.monto_total, config.currency)}
                        </TableCell>
                        <TableCell>{prestamo.numero_cuotas}</TableCell>
                        <TableCell>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            {getNombreFrecuencia((prestamo.frecuencia_pago as any) || 'mensual')}
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
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerarContrato(prestamo)}
                            title="Generar Contrato"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerarPlanPagos(prestamo)}
                            title="Plan de Pagos"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de Pago */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Cliente: {cliente.nombre} - Cuota #{selectedCuota?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          {selectedCuota && (
            <form onSubmit={handlePagarCuota} className="space-y-4">
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

      {/* Dialog de Confirmación para Desmarcar */}
      <AlertDialog open={desmarcarDialogOpen} onOpenChange={setDesmarcarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desmarcar esta cuota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desmarcará la cuota #{cuotaADesmarcar?.numero_cuota} como pagada y la volverá a estado pendiente.
              <br /><br />
              Se eliminarán todos los pagos registrados para esta cuota y el monto pagado volverá a {formatCurrency(0, config.currency)}.
              <br /><br />
              <strong>¿Estás seguro de que quieres desmarcar esta cuota?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCuotaADesmarcar(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDesmarcarCuota}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, Desmarcar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

