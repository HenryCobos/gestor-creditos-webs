'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { getNombreFrecuencia, getNombrePeriodoTasa } from '@/lib/loan-calculations'
import { syncPeriodosAbiertos } from '@/lib/open-loan-periods'
import {
  calcularAbonoCapitalAbierto,
  capitalSaldoVigente,
  previewInteresProximoPeriodoFuturo,
  validarAbonoCapitalAbierto,
  type CuotaPeriodoRef,
} from '@/lib/open-loan-abono-capital'
import type { Prestamo } from '@/lib/store'

interface AbonoCapitalAbiertoDialogProps {
  prestamo: Prestamo
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AbonoCapitalAbiertoDialog({
  prestamo,
  open,
  onOpenChange,
  onSuccess,
}: AbonoCapitalAbiertoDialogProps) {
  const { toast } = useToast()
  const { config } = useConfigStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [cuotasPendientes, setCuotasPendientes] = useState<CuotaPeriodoRef[]>([])

  const saldoActual = capitalSaldoVigente(prestamo)

  const labelTasa =
    prestamo.periodo_tasa == null
      ? 'Tasa mensual (legacy)'
      : `Tasa ${getNombrePeriodoTasa(prestamo.periodo_tasa).toLowerCase()}`

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('cuotas')
        .select('id, numero_cuota, estado, periodo_desde, periodo_hasta, monto_pagado')
        .eq('prestamo_id', prestamo.id)
        .in('estado', ['pendiente', 'retrasada'])
        .order('numero_cuota', { ascending: true })
      setCuotasPendientes(data ?? [])
    }
    void load()
  }, [open, prestamo.id, supabase])

  const montoNum = parseFloat(montoAbono)
  const preview = useMemo(() => {
    if (!Number.isFinite(montoNum) || montoNum <= 0) return null
    const err = validarAbonoCapitalAbierto({ prestamo, montoAbono: montoNum })
    if (err) return null
    const calc = calcularAbonoCapitalAbierto(saldoActual, montoNum)
    const fechaAbono = format(new Date(), 'yyyy-MM-dd')
    const interesFuturo = previewInteresProximoPeriodoFuturo({
      prestamo,
      nuevoCapitalSaldo: calc.saldoNuevo,
      fechaAbono,
      cuotasPendientes,
    })
    return { ...calc, interesFuturo }
  }, [montoNum, prestamo, saldoActual, cuotasPendientes])

  const handleClose = () => {
    setMontoAbono('')
    setMetodoPago('')
    setNotas('')
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const monto = parseFloat(montoAbono)
      const err = validarAbonoCapitalAbierto({ prestamo, montoAbono: monto })
      if (err) {
        const msg =
          err === 'monto_excede_saldo'
            ? `El abono no puede superar ${formatCurrency(saldoActual, config.currency)}`
            : 'Monto inválido'
        toast({ title: 'Error', description: msg, variant: 'destructive' })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { saldoAnterior, saldoNuevo, prestamoPagado } = calcularAbonoCapitalAbierto(
        saldoActual,
        monto
      )
      const fechaAbonoIso = format(new Date(), 'yyyy-MM-dd')
      const interesRecalculado = previewInteresProximoPeriodoFuturo({
        prestamo,
        nuevoCapitalSaldo: saldoNuevo,
        fechaAbono: fechaAbonoIso,
        cuotasPendientes,
      })

      const { error: abonoError } = await supabase.from('abonos_capital').insert({
        user_id: user.id,
        prestamo_id: prestamo.id,
        monto_abonado: monto,
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        interes_recalculado: interesRecalculado,
        metodo_pago: metodoPago || null,
        notas: notas || null,
      })

      if (abonoError) throw abonoError

      const { error: prestamoError } = await supabase
        .from('prestamos')
        .update({
          capital_saldo: saldoNuevo,
          estado: prestamoPagado ? 'pagado' : 'activo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', prestamo.id)

      if (prestamoError) throw prestamoError

      const prestamoActualizado: Prestamo = {
        ...prestamo,
        capital_saldo: saldoNuevo,
        estado: prestamoPagado ? 'pagado' : 'activo',
      }

      if (!prestamoPagado) {
        const modo = prestamo.periodo_tasa != null ? 'nuevo' : 'legacy_forward'
        await syncPeriodosAbiertos(
          supabase,
          prestamo.id,
          prestamoActualizado,
          user.id,
          modo,
          { fechaCortePreservarInteres: fechaAbonoIso }
        )
      }

      toast({
        title: 'Abono registrado',
        description: prestamoPagado
          ? `Capital liquidado. Préstamo marcado como pagado.`
          : `Nuevo saldo de capital: ${formatCurrency(saldoNuevo, config.currency)}`,
      })

      onSuccess()
      handleClose()
    } catch (error: unknown) {
      console.error('[AbonoCapitalAbiertoDialog]', error)
      const message = error instanceof Error ? error.message : 'No se pudo registrar el abono'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (prestamo.tipo_prestamo !== 'abierto') return null

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abono a capital</DialogTitle>
          <DialogDescription>
            Préstamo abierto — reduce el saldo de capital en cualquier momento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo de capital actual</span>
              <span className="font-bold">{formatCurrency(saldoActual, config.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{labelTasa}</span>
              <span>{prestamo.interes_porcentaje}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frecuencia de cobro</span>
              <span>
                {prestamo.frecuencia_pago === 'personalizado'
                  ? `Cada ${prestamo.frecuencia_cobro_dias ?? '?'} días`
                  : getNombreFrecuencia(prestamo.frecuencia_pago)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            El interés del período actual no cambia. Los siguientes períodos se calculan sobre el
            nuevo capital.
          </p>

          <div className="space-y-1">
            <Label htmlFor="monto_abono_abierto">Monto a abonar *</Label>
            <Input
              id="monto_abono_abierto"
              type="number"
              step="0.01"
              min="0"
              max={saldoActual}
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Máximo: {formatCurrency(saldoActual, config.currency)}
            </p>
          </div>

          {preview && (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Nuevo saldo de capital</span>
                <span className="font-semibold">
                  {formatCurrency(preview.saldoNuevo, config.currency)}
                </span>
              </div>
              {preview.interesFuturo != null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Interés estimado (próximo período futuro)</span>
                  <span>{formatCurrency(preview.interesFuturo, config.currency)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="metodo_abono_abierto">Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger id="metodo_abono_abierto">
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

          <div className="space-y-1">
            <Label htmlFor="notas_abono_abierto">Notas</Label>
            <Textarea
              id="notas_abono_abierto"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar abono'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
