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
import { DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, isDateOverdue } from '@/lib/utils'
import { format } from 'date-fns'
import { useConfigStore } from '@/lib/config-store'

interface CuotaExtended {
  id: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: 'pendiente' | 'pagada' | 'retrasada'
  monto_pagado: number
  prestamo: {
    id: string
    monto_prestado: number
    cliente: {
      nombre: string
      dni: string
    }
  }
}

export default function CuotasPage() {
  const [cuotas, setCuotas] = useState<CuotaExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCuota, setSelectedCuota] = useState<CuotaExtended | null>(null)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  useEffect(() => {
    loadCuotas()
  }, [])

  const loadCuotas = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from('cuotas')
      .select(`
        *,
        prestamo:prestamos(
          id,
          monto_prestado,
          cliente:clientes(
            nombre,
            dni
          )
        )
      `)
      .eq('user_id', user.id)
      .order('fecha_vencimiento', { ascending: true })

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
      setCuotas(cuotasActualizadas as CuotaExtended[])

      // Actualizar en la base de datos las cuotas retrasadas
      const cuotasRetrasadas = cuotasActualizadas.filter(
        c => c.estado === 'retrasada' && data.find(d => d.id === c.id)?.estado === 'pendiente'
      )
      
      if (cuotasRetrasadas.length > 0) {
        await Promise.all(
          cuotasRetrasadas.map(cuota =>
            supabase
              .from('cuotas')
              .update({ estado: 'retrasada' })
              .eq('id', cuota.id)
          )
        )
      }
    }
    setLoading(false)
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCuota) return

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
        prestamo_id: selectedCuota.prestamo.id,
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
        .eq('prestamo_id', selectedCuota.prestamo.id)

      const todasPagadas = cuotasPrestamo?.every(
        c => c.estado === 'pagada' || c.id === selectedCuota.id
      )

      if (todasPagadas) {
        await supabase
          .from('prestamos')
          .update({ estado: 'pagado' })
          .eq('id', selectedCuota.prestamo.id)
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

  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'retrasada')
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada')
  const cuotasRetrasadas = cuotas.filter(c => c.estado === 'retrasada')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cuotas</h1>
        <p className="text-gray-500 mt-1">Gestiona los pagos de las cuotas</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cuotas Pendientes
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cuotasPendientes.length}</div>
            <p className="text-xs text-muted-foreground">
              Por cobrar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cuotas Retrasadas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cuotasRetrasadas.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cuotas Pagadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {cuotasPagadas.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cuotas Pendientes y Retrasadas */}
      <Card>
        <CardHeader>
          <CardTitle>Cuotas Por Cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : cuotasPendientes.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay cuotas pendientes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cuota #</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotasPendientes.map((cuota) => {
                  const montoPendiente = cuota.monto_cuota - cuota.monto_pagado
                  return (
                    <TableRow key={cuota.id}>
                      <TableCell className="font-medium">
                        {cuota.prestamo.cliente.nombre}
                      </TableCell>
                      <TableCell>{cuota.numero_cuota}</TableCell>
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
                            cuota.estado === 'retrasada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cuota.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCuota(cuota)
                            setMontoPago(montoPendiente.toFixed(2))
                            setPagoDialogOpen(true)
                          }}
                        >
                          <DollarSign className="mr-1 h-3 w-3" />
                          Registrar Pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cuotas Pagadas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cuotas Pagadas</CardTitle>
        </CardHeader>
        <CardContent>
          {cuotasPagadas.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay cuotas pagadas aún
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cuota #</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotasPagadas.slice(0, 10).map((cuota) => (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-medium">
                      {cuota.prestamo.cliente.nombre}
                    </TableCell>
                    <TableCell>{cuota.numero_cuota}</TableCell>
                    <TableCell>{formatCurrency(cuota.monto_cuota, config.currency)}</TableCell>
                    <TableCell>
                      {cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Pagada
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Registro de Pago */}
      <Dialog open={pagoDialogOpen} onOpenChange={(isOpen) => {
        setPagoDialogOpen(isOpen)
        if (!isOpen) resetPagoForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Cliente: {selectedCuota?.prestamo.cliente.nombre} - Cuota #{selectedCuota?.numero_cuota}
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
    </div>
  )
}

