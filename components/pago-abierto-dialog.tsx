'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import {
  calcularInteresAbiertoPeriodo,
  formatRangoPeriodo,
  getConfigAbierto,
  sugerirRangoProximoPeriodo,
  syncPeriodosAbiertos,
} from '@/lib/open-loan-periods'
import { getNombrePeriodoTasa } from '@/lib/loan-calculations'
import {
  aplicarPagoCuotaAbierta,
  calcularInteresDebido,
  totalInteresObligacionPeriodo,
} from '@/lib/open-loan-pago-parcial'
import type { Cuota, Prestamo } from '@/lib/store'
import { format, parseISO } from 'date-fns'

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
  const [cuotaSeleccionadaId, setCuotaSeleccionadaId] = useState<string>('manual')
  const [periodoDesde, setPeriodoDesde] = useState('')
  const [periodoHasta, setPeriodoHasta] = useState('')
  const [montoInteresPagado, setMontoInteresPagado] = useState('')
  const [abonoCapital, setAbonoCapital] = useState('0')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [cuotasPendientes, setCuotasPendientes] = useState<Cuota[]>([])

  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  const capitalSaldo = prestamo.capital_saldo ?? prestamo.monto_prestado
  const interesArrastre = prestamo.interes_pendiente ?? 0
  const configAbierto = getConfigAbierto(prestamo)

  const labelTasa =
    prestamo.periodo_tasa == null
      ? 'Tasa mensual (legacy)'
      : `Tasa ${getNombrePeriodoTasa(prestamo.periodo_tasa).toLowerCase()}`

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('cuotas')
        .select('*')
        .eq('prestamo_id', prestamo.id)
        .in('estado', ['pendiente', 'retrasada'])
        .order('numero_cuota', { ascending: true })

      const pendientes = (data ?? []) as Cuota[]
      setCuotasPendientes(pendientes)

      const { data: todas } = await supabase
        .from('cuotas')
        .select('numero_cuota, estado, periodo_desde, periodo_hasta, fecha_pago')
        .eq('prestamo_id', prestamo.id)

      const rango = sugerirRangoProximoPeriodo(prestamo, todas ?? [])
      setPeriodoDesde(rango.desde)
      setPeriodoHasta(rango.hasta)

      if (pendientes[0]) {
        setCuotaSeleccionadaId(pendientes[0].id)
        if (pendientes[0].periodo_desde && pendientes[0].periodo_hasta) {
          setPeriodoDesde(pendientes[0].periodo_desde.split('T')[0])
          setPeriodoHasta(pendientes[0].periodo_hasta.split('T')[0])
        }
      } else {
        setCuotaSeleccionadaId('manual')
      }
    }
    void load()
  }, [open, prestamo.id, prestamo, supabase])

  const interesCalculado = useMemo(() => {
    if (!periodoDesde || !periodoHasta) return 0
    const desde = parseISO(periodoDesde)
    const hasta = parseISO(periodoHasta)
    return calcularInteresAbiertoPeriodo(
      capitalSaldo,
      desde,
      hasta,
      configAbierto
    )
  }, [capitalSaldo, periodoDesde, periodoHasta, configAbierto])

  const cuotaSeleccionada = useMemo(
    () =>
      cuotaSeleccionadaId !== 'manual'
        ? cuotasPendientes.find((c) => c.id === cuotaSeleccionadaId) ?? null
        : null,
    [cuotaSeleccionadaId, cuotasPendientes]
  )

  const interesDebido = useMemo(
    () =>
      calcularInteresDebido({
        interesCalculadoPeriodo: interesCalculado,
        interesArrastrePrestamo: interesArrastre,
        cuotaExistente: cuotaSeleccionada,
        esCuotaManual: cuotaSeleccionadaId === 'manual',
      }),
    [interesCalculado, interesArrastre, cuotaSeleccionada, cuotaSeleccionadaId]
  )

  const totalInteresPeriodo = useMemo(
    () =>
      totalInteresObligacionPeriodo({
        interesCalculadoPeriodo: interesCalculado,
        interesArrastrePrestamo: interesArrastre,
        cuotaExistente: cuotaSeleccionada,
        esCuotaManual: cuotaSeleccionadaId === 'manual',
      }),
    [interesCalculado, interesArrastre, cuotaSeleccionada, cuotaSeleccionadaId]
  )

  useEffect(() => {
    if (!open) return
    setMontoInteresPagado(interesDebido.toFixed(2))
  }, [open, interesDebido, periodoDesde, periodoHasta, cuotaSeleccionadaId])

  const abono = parseFloat(abonoCapital) || 0
  const pagadoInteres = parseFloat(montoInteresPagado) || 0
  const totalPago = Number((pagadoInteres + abono).toFixed(2))
  const nuevoArrastre = Number(Math.max(0, interesDebido - pagadoInteres).toFixed(2))
  const nuevoSaldo = capitalSaldo - abono

  const handleCuotaChange = (id: string) => {
    setCuotaSeleccionadaId(id)
    if (id === 'manual') return
    const c = cuotasPendientes.find((x) => x.id === id)
    if (c?.periodo_desde && c?.periodo_hasta) {
      setPeriodoDesde(c.periodo_desde.split('T')[0])
      setPeriodoHasta(c.periodo_hasta.split('T')[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!periodoDesde || !periodoHasta) {
      toast({
        title: 'Error',
        description: 'Indica el rango del período',
        variant: 'destructive',
      })
      return
    }
    if (pagadoInteres < 0 || abono < 0 || abono > capitalSaldo) {
      toast({
        title: 'Error',
        description: 'Montos inválidos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const fechaPago = format(new Date(), 'yyyy-MM-dd')
    const cuotaExistente = cuotaSeleccionada

    const pagoCalc = aplicarPagoCuotaAbierta({
      interesCalculadoPeriodo: interesCalculado,
      interesArrastrePrestamo: interesArrastre,
      cuotaExistente: cuotaExistente
        ? {
            monto_cuota: Number(cuotaExistente.monto_cuota),
            monto_pagado: Number(cuotaExistente.monto_pagado),
            monto_capital: cuotaExistente.monto_capital,
          }
        : null,
      pagadoInteresEstePago: pagadoInteres,
      abonoCapital: abono,
    })

    const nuevoArrastreCalc = pagoCalc.interesPendientePrestamo
    const estadoCuota = pagoCalc.cuotaPagada ? 'pagada' : 'pendiente'

    let cuotaId = cuotaExistente?.id

    if (cuotaExistente) {
      const { error: upErr } = await supabase
        .from('cuotas')
        .update({
          monto_cuota: pagoCalc.montoCuota,
          monto_interes: pagoCalc.montoInteresAcumulado,
          monto_capital: pagoCalc.montoCapital,
          monto_pagado: pagoCalc.montoPagadoNuevo,
          fecha_pago: fechaPago,
          estado: estadoCuota,
          periodo_desde: periodoDesde,
          periodo_hasta: periodoHasta,
          fecha_vencimiento: `${periodoHasta}T12:00:00`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cuotaExistente.id)

      if (upErr) {
        toast({ title: 'Error', description: upErr.message, variant: 'destructive' })
        setLoading(false)
        return
      }
    } else {
      const { data: cuotasExistentes } = await supabase
        .from('cuotas')
        .select('numero_cuota')
        .eq('prestamo_id', prestamo.id)
        .order('numero_cuota', { ascending: false })
        .limit(1)

      const siguienteNumero =
        cuotasExistentes && cuotasExistentes.length > 0
          ? cuotasExistentes[0].numero_cuota + 1
          : 1

      const { data: nuevaCuota, error: cuotaError } = await supabase
        .from('cuotas')
        .insert([
          {
            user_id: user.id,
            prestamo_id: prestamo.id,
            numero_cuota: siguienteNumero,
            monto_cuota: pagoCalc.montoCuota,
            monto_interes: pagoCalc.montoInteresAcumulado,
            monto_capital: pagoCalc.montoCapital,
            monto_pagado: pagoCalc.montoPagadoNuevo,
            fecha_vencimiento: `${periodoHasta}T12:00:00`,
            periodo_desde: periodoDesde,
            periodo_hasta: periodoHasta,
            fecha_pago: fechaPago,
            estado: estadoCuota,
          },
        ])
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
      cuotaId = nuevaCuota.id
    }

    const rangoLabel = formatRangoPeriodo(periodoDesde, periodoHasta)
    await supabase.from('pagos').insert([
      {
        user_id: user.id,
        cuota_id: cuotaId,
        prestamo_id: prestamo.id,
        monto_pagado: totalPago,
        fecha_pago: fechaPago,
        metodo_pago: metodoPago || null,
        notas: notas
          ? `[${rangoLabel}] Interés: ${formatCurrency(pagadoInteres, config.currency)}, Capital: ${formatCurrency(abono, config.currency)}. ${notas}`
          : `[${rangoLabel}] Interés: ${formatCurrency(pagadoInteres, config.currency)}, Capital: ${formatCurrency(abono, config.currency)}`,
        registrado_por: user.id,
        fecha_registro: new Date().toISOString(),
      },
    ])

    const prestamoActualizado = {
      ...prestamo,
      capital_saldo: Math.max(0, nuevoSaldo),
      interes_pendiente: nuevoArrastreCalc,
      numero_cuotas: Math.max(prestamo.numero_cuotas, cuotaExistente?.numero_cuota ?? 0),
      estado: nuevoSaldo <= 0.01 ? ('pagado' as const) : ('activo' as const),
    }

    let prestamoDbOk = false
    const { error: updateError } = await supabase
      .from('prestamos')
      .update({
        capital_saldo: Math.max(0, nuevoSaldo),
        interes_pendiente: nuevoArrastreCalc,
        estado: nuevoSaldo <= 0.01 ? 'pagado' : 'activo',
        updated_at: new Date().toISOString(),
      })
      .eq('id', prestamo.id)

    if (updateError) {
      const { error: fallbackError } = await supabase
        .from('prestamos')
        .update({
          capital_saldo: Math.max(0, nuevoSaldo),
          estado: nuevoSaldo <= 0.01 ? 'pagado' : 'activo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', prestamo.id)

      if (fallbackError) {
        toast({
          title: 'Advertencia',
          description: 'Pago registrado pero no se pudo actualizar el saldo del préstamo',
          variant: 'destructive',
        })
      } else {
        prestamoDbOk = true
        if (nuevoArrastreCalc > 0) {
          toast({
            title: 'Nota',
            description:
              'Saldo de capital actualizado. Ejecuta la migración de préstamo abierto en Supabase para registrar interés pendiente.',
          })
        }
      }
    } else {
      prestamoDbOk = true
    }

    if (prestamoDbOk) {
      const modo =
        prestamo.periodo_tasa != null ? 'nuevo' : 'legacy_forward'
      await syncPeriodosAbiertos(
        supabase,
        prestamo.id,
        prestamoActualizado,
        user.id,
        modo
      )

      toast({
        title: 'Pago registrado',
        description:
          nuevoArrastreCalc > 0
            ? `Interés pendiente arrastrado: ${formatCurrency(nuevoArrastreCalc, config.currency)}`
            : nuevoSaldo <= 0.01
              ? 'Préstamo pagado completamente'
              : `Nuevo saldo de capital: ${formatCurrency(Math.max(0, nuevoSaldo), config.currency)}`,
      })
    }

    setAbonoCapital('0')
    setMetodoPago('')
    setNotas('')
    setLoading(false)
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago del Período</DialogTitle>
          <DialogDescription>
            Préstamo abierto — {prestamo.cliente?.nombre || 'Cliente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo de capital actual</span>
              <span className="font-bold text-amber-900 dark:text-amber-100">
                {formatCurrency(capitalSaldo, config.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{labelTasa}</span>
              <span className="font-medium">{prestamo.interes_porcentaje}%</span>
            </div>
            {interesArrastre > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interés arrastrado</span>
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  {formatCurrency(interesArrastre, config.currency)}
                </span>
              </div>
            )}
          </div>

          {cuotasPendientes.length > 0 && (
            <div className="space-y-1">
              <Label>Período a pagar</Label>
              <Select value={cuotaSeleccionadaId} onValueChange={handleCuotaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  {cuotasPendientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Cuota #{c.numero_cuota}
                      {c.periodo_desde && c.periodo_hasta
                        ? ` — ${formatRangoPeriodo(c.periodo_desde, c.periodo_hasta)}`
                        : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="manual">Otro rango (manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="periodo_desde">Desde *</Label>
              <Input
                id="periodo_desde"
                type="date"
                value={periodoDesde}
                onChange={(e) => {
                  setCuotaSeleccionadaId('manual')
                  setPeriodoDesde(e.target.value)
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="periodo_hasta">Hasta *</Label>
              <Input
                id="periodo_hasta"
                type="date"
                value={periodoHasta}
                onChange={(e) => {
                  setCuotaSeleccionadaId('manual')
                  setPeriodoHasta(e.target.value)
                }}
                required
              />
            </div>
          </div>
          {periodoDesde && periodoHasta && (
            <p className="text-xs text-muted-foreground">
              Período: {formatRangoPeriodo(periodoDesde, periodoHasta)}
            </p>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interés del período</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(interesCalculado, config.currency)}
              </span>
            </div>
            {interesArrastre > 0 &&
              !(cuotaSeleccionada && (cuotaSeleccionada.monto_pagado ?? 0) > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ Arrastre</span>
                <span>{formatCurrency(interesArrastre, config.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-blue-200 dark:border-blue-800 pt-1">
              <span>Total interés debido</span>
              <span>{formatCurrency(interesDebido, config.currency)}</span>
            </div>
            {cuotaSeleccionada && (cuotaSeleccionada.monto_pagado ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Obligación del período: {formatCurrency(totalInteresPeriodo, config.currency)} (
                ya pagado{' '}
                {formatCurrency(Number(cuotaSeleccionada.monto_pagado), config.currency)})
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="monto_interes">Monto pagado a intereses *</Label>
            <Input
              id="monto_interes"
              type="number"
              step="0.01"
              min="0"
              value={montoInteresPagado}
              onChange={(e) => setMontoInteresPagado(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Si pagas menos del total debido, la diferencia se arrastra al siguiente período
            </p>
          </div>

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
          </div>

          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm font-bold">
              <span>Total del recibo</span>
              <span className="text-green-800 dark:text-green-200">
                {formatCurrency(totalPago, config.currency)}
              </span>
            </div>
            {nuevoArrastre > 0 && pagadoInteres < interesDebido && (
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Quedará pendiente de interés: {formatCurrency(nuevoArrastre, config.currency)}
              </p>
            )}
          </div>

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
