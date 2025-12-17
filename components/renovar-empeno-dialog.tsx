'use client'

import { useState } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { calcularRenovacionEmpeno } from '@/lib/loan-calculations'
import type { Prestamo } from '@/lib/store'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addMonths, addWeeks, addDays, format as formatDateFns } from 'date-fns'

interface RenovarEmpenoDialogProps {
  prestamo: Prestamo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RenovarEmpenoDialog({
  prestamo,
  open,
  onOpenChange,
  onSuccess,
}: RenovarEmpenoDialogProps) {
  const { toast } = useToast()
  const { config } = useConfigStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [mesesExtension, setMesesExtension] = useState('1')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [calculoPreview, setCalculoPreview] = useState<any>(null)

  if (!prestamo) return null

  // Solo para préstamos tipo "empeño"
  if (prestamo.tipo_prestamo !== 'empeño') {
    return null
  }

  // Calcular saldo actual de capital (puede tener abonos previos)
  const capitalInicial = prestamo.monto_prestado
  const totalAbonosPrevios = prestamo.abonos_capital?.reduce(
    (sum, abono) => sum + abono.monto_abonado,
    0
  ) || 0
  const saldoPendiente = capitalInicial - totalAbonosPrevios

  const fechaActual = new Date()
  const fechaFinActual = prestamo.fecha_fin ? new Date(prestamo.fecha_fin) : fechaActual

  const handleCalcularPreview = () => {
    const meses = parseFloat(mesesExtension)
    
    if (!meses || meses <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un período válido',
        variant: 'destructive',
      })
      return
    }

    const interesRenovacion = calcularRenovacionEmpeno(
      saldoPendiente,
      prestamo.interes_porcentaje,
      meses
    )

    // Calcular nueva fecha de vencimiento
    const nuevaFechaVencimiento = addMonths(fechaFinActual, meses)

    setCalculoPreview({
      interesRenovacion,
      nuevaFechaVencimiento,
      mesesExtension: meses,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const meses = parseFloat(mesesExtension)

      if (!meses || meses <= 0) {
        toast({
          title: 'Error',
          description: 'Período inválido',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const interesRenovacion = calcularRenovacionEmpeno(
        saldoPendiente,
        prestamo.interes_porcentaje,
        meses
      )

      const nuevaFechaVencimiento = addMonths(fechaFinActual, meses)
      const diasExtendidos = Math.round(
        (nuevaFechaVencimiento.getTime() - fechaFinActual.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 1. Registrar la renovación
      const { error: renovacionError } = await supabase
        .from('renovaciones_empeno')
        .insert({
          user_id: user.id,
          prestamo_id: prestamo.id,
          garantia_id: prestamo.garantias?.[0]?.id || null,
          monto_intereses_pagados: interesRenovacion,
          nueva_fecha_vencimiento: formatDateFns(nuevaFechaVencimiento, 'yyyy-MM-dd'),
          dias_extendidos: diasExtendidos,
          notas: notas || null,
        })

      if (renovacionError) throw renovacionError

      // 2. Actualizar el préstamo con la nueva fecha de vencimiento
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({
          fecha_fin: formatDateFns(nuevaFechaVencimiento, 'yyyy-MM-dd'),
        })
        .eq('id', prestamo.id)

      if (prestamoError) throw prestamoError

      // 3. Actualizar garantía si existe (marcar como renovada)
      if (prestamo.garantias && prestamo.garantias.length > 0) {
        const { error: garantiaError } = await supabase
          .from('garantias')
          .update({
            estado: 'renovado',
            fecha_renovacion: new Date().toISOString(),
            numero_renovaciones: (prestamo.garantias[0].numero_renovaciones || 0) + 1,
            fecha_vencimiento: formatDateFns(nuevaFechaVencimiento, 'yyyy-MM-dd'),
          })
          .eq('id', prestamo.garantias[0].id)

        if (garantiaError) throw garantiaError
      }

      // 4. Registrar el pago de intereses de renovación como un pago especial
      const { error: pagoError } = await supabase
        .from('pagos')
        .insert({
          user_id: user.id,
          prestamo_id: prestamo.id,
          cuota_id: null, // No está asociado a una cuota específica
          monto_pagado: interesRenovacion,
          metodo_pago: metodoPago || null,
          notas: `Renovación de empeño por ${meses} mes${meses > 1 ? 'es' : ''}. ${notas || ''}`,
        })

      if (pagoError) throw pagoError

      toast({
        title: '✅ Empeño renovado',
        description: `Se extendió el plazo por ${meses} mes${meses > 1 ? 'es' : ''}. Nueva fecha: ${formatDate(nuevaFechaVencimiento.toISOString())}`,
      })

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error al renovar empeño:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo renovar el empeño',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMesesExtension('1')
    setMetodoPago('')
    setNotas('')
    setCalculoPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Renovar Empeño</DialogTitle>
          <DialogDescription>
            Extiende el plazo del empeño pagando los intereses correspondientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {/* Estado actual */}
          <div className="bg-purple-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm text-purple-900">Estado Actual del Empeño</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Capital Pendiente</p>
                <p className="font-semibold text-purple-900">
                  {formatCurrency(saldoPendiente, config.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Tasa de Interés</p>
                <p className="font-semibold text-purple-900">
                  {prestamo.interes_porcentaje}% mensual
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Fecha de Vencimiento Actual</p>
                <p className="font-semibold text-purple-900">
                  {formatDate(prestamo.fecha_fin || '')}
                </p>
              </div>
              {prestamo.garantias && prestamo.garantias.length > 0 && (
                <div className="col-span-2">
                  <p className="text-gray-600">Garantía</p>
                  <p className="font-semibold text-purple-900">
                    {prestamo.garantias[0].descripcion}
                    {prestamo.garantias[0].numero_renovaciones > 0 && (
                      <span className="text-xs text-purple-700 ml-2">
                        (Renovado {prestamo.garantias[0].numero_renovaciones} {prestamo.garantias[0].numero_renovaciones === 1 ? 'vez' : 'veces'})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meses_extension">Meses de Extensión *</Label>
            <Input
              id="meses_extension"
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              value={mesesExtension}
              onChange={(e) => {
                setMesesExtension(e.target.value)
                setCalculoPreview(null)
              }}
              required
            />
            <p className="text-xs text-gray-500">
              ¿Por cuántos meses quieres extender el empeño?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo_pago">Método de Pago de Intereses *</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre la renovación..."
              rows={2}
            />
          </div>

          {/* Botón para calcular preview */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCalcularPreview}
            disabled={!mesesExtension || parseFloat(mesesExtension) <= 0}
            className="w-full"
          >
            📊 Calcular Costo de Renovación
          </Button>

          {/* Preview del cálculo */}
          {calculoPreview && (
            <div className="bg-orange-50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm text-orange-900">
                💰 Detalles de la Renovación
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Interés a Pagar Ahora</p>
                  <p className="font-bold text-xl text-orange-900">
                    {formatCurrency(calculoPreview.interesRenovacion, config.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {saldoPendiente.toFixed(2)} × {prestamo.interes_porcentaje}% × {calculoPreview.mesesExtension} mes{calculoPreview.mesesExtension > 1 ? 'es' : ''}
                  </p>
                </div>
                <div className="pt-2 border-t border-orange-200">
                  <p className="text-gray-600">Nueva Fecha de Vencimiento</p>
                  <p className="font-semibold text-orange-900">
                    {formatDate(calculoPreview.nuevaFechaVencimiento.toISOString())}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-orange-200">
                <p className="text-xs text-gray-600">
                  ⚠️ El cliente debe pagar {formatCurrency(calculoPreview.interesRenovacion, config.currency)} para
                  renovar el empeño. El capital de {formatCurrency(saldoPendiente, config.currency)} seguirá 
                  pendiente y deberá pagarse antes de la nueva fecha de vencimiento para recuperar la garantía.
                </p>
              </div>
            </div>
          )}

          </div>
          
          {/* Botones */}
          <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !calculoPreview || !metodoPago}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Procesando...' : 'Confirmar Renovación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

