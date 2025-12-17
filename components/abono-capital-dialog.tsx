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
import { formatCurrency } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { calcularAbonoCapital } from '@/lib/loan-calculations'
import type { Prestamo } from '@/lib/store'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AbonoCapitalDialogProps {
  prestamo: Prestamo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AbonoCapitalDialog({
  prestamo,
  open,
  onOpenChange,
  onSuccess,
}: AbonoCapitalDialogProps) {
  const { toast } = useToast()
  const { config } = useConfigStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [calculoPreview, setCalculoPreview] = useState<any>(null)

  if (!prestamo) return null

  // Solo para préstamos tipo "empeño" o "solo_intereses"
  if (prestamo.tipo_prestamo !== 'empeño' && prestamo.tipo_prestamo !== 'solo_intereses') {
    return null
  }

  // Calcular saldo actual de capital (puede tener abonos previos)
  const capitalInicial = prestamo.monto_prestado
  const totalAbonosPrevios = prestamo.abonos_capital?.reduce(
    (sum, abono) => sum + abono.monto_abonado,
    0
  ) || 0
  const saldoActual = capitalInicial - totalAbonosPrevios

  // Calcular meses restantes aproximados
  const fechaInicio = new Date(prestamo.fecha_inicio)
  const fechaFin = prestamo.fecha_fin ? new Date(prestamo.fecha_fin) : new Date()
  const mesesRestantes = Math.max(
    1,
    Math.round((fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  )

  const handleCalcularPreview = () => {
    const monto = parseFloat(montoAbono)
    
    if (!monto || monto <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un monto válido',
        variant: 'destructive',
      })
      return
    }

    if (monto > saldoActual) {
      toast({
        title: 'Error',
        description: `El abono no puede ser mayor al saldo actual (${formatCurrency(saldoActual, config.currency)})`,
        variant: 'destructive',
      })
      return
    }

    const resultado = calcularAbonoCapital({
      saldoActual,
      montoAbono: monto,
      interesPorcentaje: prestamo.interes_porcentaje,
      mesesRestantes,
      frecuenciaPago: prestamo.frecuencia_pago,
    })

    setCalculoPreview(resultado)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const monto = parseFloat(montoAbono)

      if (!monto || monto <= 0 || monto > saldoActual) {
        toast({
          title: 'Error',
          description: 'Monto inválido',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calcular nuevos valores
      const resultado = calcularAbonoCapital({
        saldoActual,
        montoAbono: monto,
        interesPorcentaje: prestamo.interes_porcentaje,
        mesesRestantes,
        frecuenciaPago: prestamo.frecuencia_pago,
      })

      // 1. Registrar el abono a capital
      const { error: abonoError } = await supabase
        .from('abonos_capital')
        .insert({
          user_id: user.id,
          prestamo_id: prestamo.id,
          monto_abonado: monto,
          saldo_anterior: saldoActual,
          saldo_nuevo: resultado.nuevoSaldo,
          interes_recalculado: resultado.nuevoInteres,
          metodo_pago: metodoPago || null,
          notas: notas || null,
        })

      if (abonoError) throw abonoError

      // 2. Actualizar el préstamo con el nuevo monto total
      const nuevoMontoTotal = resultado.nuevoSaldo + resultado.nuevoInteres
      
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({
          monto_total: nuevoMontoTotal,
        })
        .eq('id', prestamo.id)

      if (prestamoError) throw prestamoError

      // 3. Actualizar las cuotas pendientes con el nuevo monto de interés
      // Solo actualizar cuotas que aún no han sido pagadas
      const { error: cuotasError } = await supabase
        .from('cuotas')
        .update({
          monto_cuota: resultado.nuevaCuotaInteres,
        })
        .eq('prestamo_id', prestamo.id)
        .eq('estado', 'pendiente')

      if (cuotasError) throw cuotasError

      toast({
        title: '✅ Abono registrado',
        description: `Se abonaron ${formatCurrency(monto, config.currency)} al capital. Nuevo saldo: ${formatCurrency(resultado.nuevoSaldo, config.currency)}`,
      })

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error al registrar abono:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el abono',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMontoAbono('')
    setMetodoPago('')
    setNotas('')
    setCalculoPreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Abonar a Capital - Empeño</DialogTitle>
          <DialogDescription>
            Reduce el capital pendiente y los intereses futuros
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {/* Estado actual */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm text-blue-900">Estado Actual</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Capital Inicial</p>
                <p className="font-semibold text-blue-900">
                  {formatCurrency(capitalInicial, config.currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Saldo Pendiente</p>
                <p className="font-semibold text-blue-900">
                  {formatCurrency(saldoActual, config.currency)}
                </p>
              </div>
              {totalAbonosPrevios > 0 && (
                <div className="col-span-2">
                  <p className="text-gray-600">Abonos Previos</p>
                  <p className="font-semibold text-green-700">
                    {formatCurrency(totalAbonosPrevios, config.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto_abono">Monto a Abonar *</Label>
            <Input
              id="monto_abono"
              type="number"
              step="0.01"
              min="0"
              max={saldoActual}
              value={montoAbono}
              onChange={(e) => {
                setMontoAbono(e.target.value)
                setCalculoPreview(null)
              }}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-500">
              Máximo: {formatCurrency(saldoActual, config.currency)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo_pago">Método de Pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
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
              placeholder="Observaciones sobre este abono..."
              rows={2}
            />
          </div>

          {/* Botón para calcular preview */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCalcularPreview}
            disabled={!montoAbono || parseFloat(montoAbono) <= 0}
            className="w-full"
          >
            📊 Calcular Impacto del Abono
          </Button>

          {/* Preview del cálculo */}
          {calculoPreview && (
            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm text-green-900">
                💡 Después del Abono
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Nuevo Saldo Capital</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(calculoPreview.nuevoSaldo, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Ahorro en Intereses</p>
                  <p className="font-semibold text-green-700">
                    -{formatCurrency(calculoPreview.ahorroInteres, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Nueva Cuota de Interés</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(calculoPreview.nuevaCuotaInteres, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Interés Total Nuevo</p>
                  <p className="font-semibold text-green-900">
                    {formatCurrency(calculoPreview.nuevoInteres, config.currency)}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-gray-600">
                  Las {calculoPreview.cuotasRestantes} cuotas pendientes se actualizarán
                  automáticamente con el nuevo monto de interés.
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
            <Button type="submit" disabled={loading || !calculoPreview}>
              {loading ? 'Procesando...' : 'Registrar Abono'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

