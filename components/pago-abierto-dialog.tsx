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
import { calcularInteresAbierto } from '@/lib/loan-calculations'
import type { Prestamo } from '@/lib/store'
import { format } from 'date-fns'

interface PagoAbiertoDialogProps {
  prestamo: Prestamo
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PagoAbiertoDialog({
  prestamo,
  open,
  onOpenChange,
  onSuccess,
}: PagoAbiertoDialogProps) {
  const [diasPeriodo, setDiasPeriodo] = useState('30')
  const [abonoCapital, setAbonoCapital] = useState('0')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  const capitalSaldo = prestamo.capital_saldo ?? prestamo.monto_prestado
  const dias = parseFloat(diasPeriodo) || 30
  const abono = parseFloat(abonoCapital) || 0

  const interesCalculado = calcularInteresAbierto(
    capitalSaldo,
    prestamo.interes_porcentaje,
    dias
  )
  const totalPago = interesCalculado + abono
  const nuevoSaldo = capitalSaldo - abono

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Determinar próximo número de cuota
    const { data: cuotasExistentes } = await supabase
      .from('cuotas')
      .select('numero_cuota')
      .eq('prestamo_id', prestamo.id)
      .order('numero_cuota', { ascending: false })
      .limit(1)

    const siguienteNumero = cuotasExistentes && cuotasExistentes.length > 0
      ? cuotasExistentes[0].numero_cuota + 1
      : 1

    const hoy = format(new Date(), 'yyyy-MM-dd')
    const fechaVencimiento = `${hoy}T12:00:00`

    // Crear la cuota del período
    const { data: nuevaCuota, error: cuotaError } = await supabase
      .from('cuotas')
      .insert([{
        user_id: user.id,
        prestamo_id: prestamo.id,
        numero_cuota: siguienteNumero,
        monto_cuota: totalPago,
        monto_interes: interesCalculado,
        monto_capital: abono,
        monto_pagado: totalPago,
        fecha_vencimiento: fechaVencimiento,
        fecha_pago: hoy,
        estado: 'pagada',
      }])
      .select()
      .single()

    if (cuotaError || !nuevaCuota) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el pago',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Registrar en tabla pagos
    await supabase.from('pagos').insert([{
      user_id: user.id,
      cuota_id: nuevaCuota.id,
      prestamo_id: prestamo.id,
      monto_pagado: totalPago,
      fecha_pago: hoy,
      metodo_pago: metodoPago || null,
      notas: notas
        ? `[${dias} días] Interés: ${formatCurrency(interesCalculado, config.currency)}, Capital: ${formatCurrency(abono, config.currency)}. ${notas}`
        : `[${dias} días] Interés: ${formatCurrency(interesCalculado, config.currency)}, Capital: ${formatCurrency(abono, config.currency)}`,
      registrado_por: user.id,
      fecha_registro: new Date().toISOString(),
    }])

    // Actualizar saldo de capital y número de cuotas
    const { error: updateError } = await supabase
      .from('prestamos')
      .update({
        capital_saldo: Math.max(0, nuevoSaldo),
        numero_cuotas: siguienteNumero,
        estado: nuevoSaldo <= 0.01 ? 'pagado' : 'activo',
        updated_at: new Date().toISOString(),
      })
      .eq('id', prestamo.id)

    if (updateError) {
      toast({
        title: 'Advertencia',
        description: 'Pago registrado pero no se pudo actualizar el saldo del préstamo',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Pago registrado',
        description: nuevoSaldo <= 0.01
          ? 'Préstamo pagado completamente'
          : `Nuevo saldo de capital: ${formatCurrency(Math.max(0, nuevoSaldo), config.currency)}`,
      })
    }

    // Resetear formulario
    setDiasPeriodo('30')
    setAbonoCapital('0')
    setMetodoPago('')
    setNotas('')
    setLoading(false)
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago del Período</DialogTitle>
          <DialogDescription>
            Préstamo abierto — {prestamo.cliente?.nombre || 'Cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumen del saldo actual */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saldo de capital actual</span>
              <span className="font-bold text-amber-900">
                {formatCurrency(capitalSaldo, config.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tasa mensual</span>
              <span className="font-medium">{prestamo.interes_porcentaje}%</span>
            </div>
          </div>

          {/* Días del período */}
          <div className="space-y-1">
            <Label htmlFor="dias_periodo">Días del período *</Label>
            <Input
              id="dias_periodo"
              type="number"
              min="1"
              max="365"
              value={diasPeriodo}
              onChange={(e) => setDiasPeriodo(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Días transcurridos desde el último pago (30 = 1 mes)
            </p>
          </div>

          {/* Interés calculado automáticamente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Interés del período ({dias} días)
              </span>
              <span className="font-bold text-blue-900">
                {formatCurrency(interesCalculado, config.currency)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(capitalSaldo, config.currency)} × {prestamo.interes_porcentaje}% × ({dias}/30 meses)
            </p>
          </div>

          {/* Abono a capital */}
          <div className="space-y-1">
            <Label htmlFor="abono_capital">Abono a capital (opcional)</Label>
            <Input
              id="abono_capital"
              type="number"
              step="0.01"
              min="0"
              max={capitalSaldo}
              value={abonoCapital}
              onChange={(e) => setAbonoCapital(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Si el cliente abona capital el saldo disminuye y el próximo interés será menor
            </p>
          </div>

          {/* Resumen del pago */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Interés del período</span>
              <span>{formatCurrency(interesCalculado, config.currency)}</span>
            </div>
            {abono > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Abono a capital</span>
                <span>{formatCurrency(abono, config.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-green-300 pt-1 mt-1">
              <span>Total a pagar</span>
              <span className="text-green-800">{formatCurrency(totalPago, config.currency)}</span>
            </div>
            {abono > 0 && (
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Nuevo saldo de capital</span>
                <span>{formatCurrency(Math.max(0, nuevoSaldo), config.currency)}</span>
              </div>
            )}
          </div>

          {/* Método de pago y notas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="metodo_pago">Método de pago</Label>
              <Input
                id="metodo_pago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                placeholder="Efectivo, transferencia..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notas">Notas</Label>
              <Input
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones..."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
