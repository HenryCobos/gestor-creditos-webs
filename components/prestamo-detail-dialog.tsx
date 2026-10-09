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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CheckCircle, DollarSign, Eye, X, FileText, Package, XCircle, Repeat, TrendingDown, Receipt, MoreHorizontal, Unlock } from 'lucide-react'
import { effectiveCuotaEstado, formatCurrency, formatDate, isDateOverdue } from '@/lib/utils'
import { toastPagoExitoso } from '@/lib/pago-feedback'
import { useConfigStore } from '@/lib/config-store'
import type { Prestamo, Garantia } from '@/lib/store'
import { generarContratoPrestamo, generarReciboPagoConEvolucion } from '@/lib/pdf-generator'
import { generarReciboImagenSimple } from '@/lib/receipt-image-generator'
import { Checkbox } from '@/components/ui/checkbox'
import { AbonoCapitalDialog } from '@/components/abono-capital-dialog'
import { AbonoCapitalAbiertoDialog } from '@/components/abono-capital-abierto-dialog'
import { RenovarEmpenoDialog } from '@/components/renovar-empeno-dialog'
import { PagoAbiertoDialog } from '@/components/pago-abierto-dialog'
import { getCuotasSegunRol } from '@/lib/queries-con-roles'
import { format } from 'date-fns'
import {
  previewAplicacionCascada,
  totalPendienteDesdeCuota,
} from '@/lib/aplicar-pago-cuotas'
import { syncPeriodosAbiertos, formatRangoPeriodo } from '@/lib/open-loan-periods'
import { getNombreFrecuencia, getNombrePeriodoTasa } from '@/lib/loan-calculations'

interface Cuota {
  id: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: 'pendiente' | 'pagada' | 'retrasada'
  monto_pagado: number
  monto_interes?: number | null
  monto_capital?: number | null
  periodo_desde?: string | null
  periodo_hasta?: string | null
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
  const [abonosCapital, setAbonosCapital] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCuota, setSelectedCuota] = useState<Cuota | null>(null)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [desmarcarDialogOpen, setDesmarcarDialogOpen] = useState(false)
  const [cuotaADesmarcar, setCuotaADesmarcar] = useState<Cuota | null>(null)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [emitirReciboAlPagar, setEmitirReciboAlPagar] = useState(true)
  const [emitirReciboImagenAlPagar, setEmitirReciboImagenAlPagar] = useState(false)
  const [abonoCapitalDialogOpen, setAbonoCapitalDialogOpen] = useState(false)
  const [renovarEmpenoDialogOpen, setRenovarEmpenoDialogOpen] = useState(false)
  const [pagoAbiertoDialogOpen, setPagoAbiertoDialogOpen] = useState(false)
  const [abonoCapitalAbiertoDialogOpen, setAbonoCapitalAbiertoDialogOpen] = useState(false)
  const [prestamoVigente, setPrestamoVigente] = useState<Prestamo | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  useEffect(() => {
    if (prestamo) setPrestamoVigente(prestamo)
  }, [prestamo])

  const reloadPrestamoFromDb = async (): Promise<Prestamo | null> => {
    if (!prestamo) return null
    const { data, error } = await supabase
      .from('prestamos')
      .select(`*, cliente:clientes(*)`)
      .eq('id', prestamo.id)
      .single()

    if (error || !data) {
      console.error('[reloadPrestamoFromDb]', error)
      return prestamoVigente ?? prestamo
    }

    const merged: Prestamo = {
      ...(prestamoVigente ?? prestamo),
      ...data,
      cliente: (data as Prestamo).cliente ?? prestamo.cliente,
    }
    setPrestamoVigente(merged)
    return merged
  }

  useEffect(() => {
    if (prestamo && open) {
      void (async () => {
        const fresh = await reloadPrestamoFromDb()
        const p = fresh ?? prestamoVigente ?? prestamo
        if (p.tipo_prestamo === 'abierto' && p.estado === 'activo') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const modo = p.periodo_tasa != null ? 'nuevo' : 'legacy_forward'
            await syncPeriodosAbiertos(
              supabase,
              p.id,
              p,
              user.id,
              modo
            )
          }
        }
        await loadCuotas()
      })()
      loadUserRole()
      if (prestamo.tipo_prestamo === 'empeño' || prestamo.tipo_prestamo === 'solo_intereses') {
        loadGarantias()
        loadAbonosCapital()
      }
      if (prestamo.tipo_prestamo === 'abierto') {
        loadAbonosCapital()
      }
    }
  }, [prestamo, open])

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsAdmin(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle()

    let role: 'admin' | 'cobrador' =
      profile?.role === 'admin' ? 'admin' : 'cobrador'

    if (profile?.organization_id && role !== 'admin') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()
      if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
        role = roleData.role
      }
    }
    setIsAdmin(role === 'admin')
  }

  const loadCuotas = async (): Promise<Cuota[]> => {
    if (!prestamo) return []

    setLoading(true)
    try {
      const cuotasRol = await getCuotasSegunRol()
      const data = (cuotasRol || [])
        .filter(cuota => cuota.prestamo_id === prestamo.id)
        .sort((a, b) => a.numero_cuota - b.numero_cuota)

      const cuotasActualizadas = data.map((cuota) => ({
        ...cuota,
        estado: effectiveCuotaEstado(cuota),
      })) as Cuota[]
      setCuotas(cuotasActualizadas)
      return cuotasActualizadas
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuotas',
        variant: 'destructive',
      })
      console.error('Error cargando cuotas por rol:', error)
      return []
    } finally {
      setLoading(false)
    }
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

  const loadAbonosCapital = async () => {
    if (!prestamo) return
    
    const { data, error } = await supabase
      .from('abonos_capital')
      .select('*')
      .eq('prestamo_id', prestamo.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando abonos:', error)
    } else {
      setAbonosCapital(data || [])
      // Actualizar el préstamo con los abonos cargados
      if (prestamo) {
        prestamo.abonos_capital = data || []
      }
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
      garantiasInfo.length > 0 ? garantiasInfo : undefined,
      config.currency,
      config.currencySymbol
    )

    toast({
      title: 'Éxito',
      description: 'Contrato PDF generado correctamente',
    })
  }

  const buildReciboPayload = (
    cuota: Cuota,
    extras?: { metodo_pago?: string | null; notas?: string | null },
    cuotasSnapshot?: Cuota[]
  ) => {
    if (!prestamo || !prestamo.cliente) return null

    const lista = cuotasSnapshot ?? cuotas
    const cuotasParaRecibo = lista.map((c) => ({
      id: c.id,
      numero_cuota: c.numero_cuota,
      monto_cuota: c.monto_cuota,
      monto_pagado: c.monto_pagado,
      fecha_vencimiento: c.fecha_vencimiento,
      fecha_pago: c.fecha_pago,
      estado: c.estado,
    }))

    return {
      cuotaPago: {
        id: cuota.id,
        numero_cuota: cuota.numero_cuota,
        monto_cuota: cuota.monto_cuota,
        monto_pagado: cuota.monto_pagado,
        fecha_vencimiento: cuota.fecha_vencimiento,
        fecha_pago: cuota.fecha_pago ?? format(new Date(), "yyyy-MM-dd'T'12:00:00"),
        estado: cuota.estado,
      },
      cuotasParaRecibo,
      prestamo: {
        id: prestamo.id,
        monto_prestado: prestamo.monto_prestado,
        monto_total: prestamo.monto_total,
        numero_cuotas: prestamo.numero_cuotas,
        frecuencia_pago: prestamo.frecuencia_pago,
        fecha_inicio: prestamo.fecha_inicio,
        interes_porcentaje: prestamo.interes_porcentaje,
      },
      cliente: {
        nombre: prestamo.cliente.nombre,
        dni: prestamo.cliente.dni,
        telefono: prestamo.cliente.telefono || undefined,
      },
      options: {
        metodo_pago: extras?.metodo_pago,
        notas: extras?.notas,
        companyName: config.companyName,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
      },
    }
  }

  const emitirReciboPdf = (
    cuota: Cuota,
    extras?: { metodo_pago?: string | null; notas?: string | null },
    cuotasSnapshot?: Cuota[]
  ) => {
    const payload = buildReciboPayload(cuota, extras, cuotasSnapshot)
    if (!payload) return

    generarReciboPagoConEvolucion(
      payload.cuotaPago,
      payload.cuotasParaRecibo,
      payload.prestamo,
      payload.cliente,
      payload.options
    )

    toast({
      title: 'Recibo generado',
      description: `PDF con evolución hasta la cuota N° ${cuota.numero_cuota}`,
    })
  }

  const emitirReciboImagen = (
    cuota: Cuota,
    extras?: { metodo_pago?: string | null; notas?: string | null },
    cuotasSnapshot?: Cuota[]
  ) => {
    const payload = buildReciboPayload(cuota, extras, cuotasSnapshot)
    if (!payload) return

    generarReciboImagenSimple(
      payload.cuotaPago,
      payload.cuotasParaRecibo,
      payload.prestamo,
      payload.cliente,
      payload.options
    )

    toast({
      title: 'Recibo generado',
      description: `Imagen simple de la cuota N° ${cuota.numero_cuota}`,
    })
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCuota || !prestamo) return

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
      // Usar API route (service role) para respetar permisos por rol
      const response = await fetch('/api/registrar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cuota_id: selectedCuota.id,
          prestamo_id: prestamo.id,
          monto_pagado: monto,
          metodo_pago: metodoPago || null,
          notas: notas || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const detalle = data.details ? `: ${data.details}` : ''
        toast({
          title: 'Error',
          description: `${data.error || 'No se pudo registrar el pago'}${detalle}`,
          variant: 'destructive',
        })
        return
      }

      toastPagoExitoso(toast, data, config.currency)

      const cuotasActualizadas = await loadCuotas()

      if (emitirReciboAlPagar || emitirReciboImagenAlPagar) {
        const cuotaRecibo =
          cuotasActualizadas.find((c) => c.id === selectedCuota.id) ?? selectedCuota
        const extras = { metodo_pago: metodoPago, notas }
        if (emitirReciboAlPagar) {
          emitirReciboPdf(cuotaRecibo, extras, cuotasActualizadas)
        }
        if (emitirReciboImagenAlPagar) {
          emitirReciboImagen(cuotaRecibo, extras, cuotasActualizadas)
        }
      }

      resetPagoForm()
      if (onUpdate) onUpdate()
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
    if (!cuotaADesmarcar || !prestamo) return

    try {
      const response = await fetch('/api/desmarcar-cuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuota_id: cuotaADesmarcar.id,
          prestamo_id: prestamo.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo desmarcar la cuota',
          variant: 'destructive',
        })
        return
      }

      const montoRev = Number(data.monto_revertido) || 0
      const cajaActualizada = data.capital_recalculado != null
      const partes: string[] = []
      if (montoRev > 0) {
        partes.push(
          `Cuota desmarcada. Revertido: ${formatCurrency(montoRev, config.currency)}`
        )
      } else {
        partes.push(data.message || 'Cuota desmarcada correctamente')
      }
      if (cajaActualizada) {
        partes.push('Caja actualizada')
      }
      toast({
        title: 'Éxito',
        description: partes.join('. '),
      })

      await loadCuotas()
      if (onUpdate) onUpdate()
      setDesmarcarDialogOpen(false)
      setCuotaADesmarcar(null)
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo desmarcar la cuota',
        variant: 'destructive',
      })
    }
  }

  const handleAbonoSuccess = async () => {
    await reloadPrestamoFromDb()
    await loadCuotas()
    loadAbonosCapital()
    if (prestamo && prestamo.tipo_prestamo === 'empeño') {
      loadGarantias()
    }
    if (onUpdate) onUpdate()
  }

  const handleRenovacionSuccess = () => {
    loadCuotas()
    loadGarantias()
    if (onUpdate) onUpdate()
  }

  if (!prestamo) return null

  const prestamoActivo = prestamoVigente ?? prestamo

  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada').length
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'retrasada').length
  const totalPagado = cuotas.reduce((sum, c) => sum + c.monto_pagado, 0)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Préstamo</DialogTitle>
            <DialogDescription>
              Cliente: {prestamo.cliente?.nombre || '-'}
            </DialogDescription>
          </DialogHeader>

          {/* Barra de acciones — separada del header para no interferir con el botón X */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            {/* Abonar a Capital (solo para empeños y solo_intereses activos) */}
            {(prestamo.tipo_prestamo === 'empeño' || prestamo.tipo_prestamo === 'solo_intereses') && prestamo.estado === 'activo' && (
              <Button
                variant="outline"
                onClick={() => setAbonoCapitalDialogOpen(true)}
                className="gap-2 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-200 dark:border-green-700 dark:hover:bg-green-950/40"
              >
                <TrendingDown className="h-4 w-4" />
                <span className="hidden sm:inline">Abonar a Capital</span>
                <span className="sm:hidden">Abonar</span>
              </Button>
            )}
            {/* Renovar Empeño (solo para empeños activos) */}
            {prestamo.tipo_prestamo === 'empeño' && prestamo.estado === 'activo' && (
              <Button
                variant="outline"
                onClick={() => setRenovarEmpenoDialogOpen(true)}
                className="gap-2 text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-200 dark:border-purple-700 dark:hover:bg-purple-950/40"
              >
                <Repeat className="h-4 w-4" />
                <span className="hidden sm:inline">Renovar Empeño</span>
                <span className="sm:hidden">Renovar</span>
              </Button>
            )}
            {/* Registrar Pago del Período (solo para préstamos abiertos activos) */}
            {prestamo.tipo_prestamo === 'abierto' && prestamo.estado === 'activo' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAbonoCapitalAbiertoDialogOpen(true)}
                  className="gap-2 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-200 dark:border-green-700 dark:hover:bg-green-950/40"
                >
                  <TrendingDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Abono a capital</span>
                  <span className="sm:hidden">Abono</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPagoAbiertoDialogOpen(true)}
                  className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-950/40"
                >
                  <Unlock className="h-4 w-4" />
                  <span className="hidden sm:inline">Registrar Pago del Período</span>
                  <span className="sm:hidden">Pagar</span>
                </Button>
              </>
            )}
            {/* Generar Contrato PDF — siempre visible */}
            <Button
              variant="outline"
              onClick={handleGenerarContrato}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Generar Contrato PDF</span>
              <span className="sm:hidden">Contrato</span>
            </Button>
          </div>

          <div className="space-y-6">
            {/* Resumen del Préstamo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Resumen del Préstamo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Prestado</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                    {formatCurrency(prestamo.monto_prestado, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interés</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                    {prestamo.interes_porcentaje}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                    {formatCurrency(prestamo.monto_total, config.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagado</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalPagado, config.currency)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                  <p className="font-semibold text-foreground">{formatDate(prestamo.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prestamo.estado === 'activo'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                        : prestamo.estado === 'pagado'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100'
                    }`}
                  >
                    {prestamo.estado}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progreso</p>
                  <p className="font-semibold text-foreground">
                    {cuotasPagadas} / {cuotas.length} cuotas pagadas
                  </p>
                </div>
                {prestamo.tipo_prestamo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prestamo.tipo_prestamo === 'empeño'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-100'
                        : prestamo.tipo_prestamo === 'solo_intereses'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-100'
                        : prestamo.tipo_prestamo === 'abierto'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}>
                      {prestamo.tipo_prestamo === 'empeño' ? 'Empeño' :
                       prestamo.tipo_prestamo === 'solo_intereses' ? 'Solo Intereses' :
                       prestamo.tipo_prestamo === 'abierto' ? 'Préstamo Abierto' :
                       prestamo.tipo_calculo_interes === 'frances' ? 'Amortización Francesa' :
                       prestamo.tipo_calculo_interes === 'total_acordado' ? 'Total Acordado' :
                       'Amortización'}
                    </span>
                  </div>
                )}
                {prestamo.fecha_fin && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimiento Capital</p>
                    <p className="font-semibold text-foreground">{formatDate(prestamo.fecha_fin)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Saldo de capital vigente (solo para préstamos abiertos) */}
            {prestamoActivo.tipo_prestamo === 'abierto' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-base text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  Estado del Préstamo Abierto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Capital inicial</p>
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      {formatCurrency(prestamoActivo.monto_prestado, config.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo de capital actual</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300 text-lg">
                      {formatCurrency(prestamoActivo.capital_saldo ?? prestamoActivo.monto_prestado, config.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {prestamoActivo.periodo_tasa == null
                        ? 'Tasa mensual (legacy)'
                        : `Tasa ${getNombrePeriodoTasa(prestamoActivo.periodo_tasa).toLowerCase()}`}
                    </p>
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      {prestamoActivo.interes_porcentaje}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frecuencia de cobro</p>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {prestamoActivo.frecuencia_pago === 'personalizado'
                        ? `Cada ${prestamoActivo.frecuencia_cobro_dias ?? '?'} días`
                        : getNombreFrecuencia(prestamoActivo.frecuencia_pago)}
                    </p>
                  </div>
                  {(prestamoActivo.interes_pendiente ?? 0) > 0 && (
                    <div>
                      <p className="text-muted-foreground">Interés pendiente (arrastre)</p>
                      <p className="font-bold text-orange-700 dark:text-orange-300">
                        {formatCurrency(prestamoActivo.interes_pendiente ?? 0, config.currency)}
                      </p>
                    </div>
                  )}
                </div>
                {abonosCapital.length > 0 && (
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Abonos a capital registrados
                    </p>
                    <div className="rounded-md border border-amber-200/80 dark:border-amber-800/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs text-right">Abono</TableHead>
                            <TableHead className="text-xs text-right">Saldo después</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {abonosCapital.map((abono) => (
                            <TableRow key={abono.id}>
                              <TableCell className="text-xs py-2">
                                {formatDate(abono.fecha_abono ?? abono.created_at)}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-right font-medium text-green-700 dark:text-green-300">
                                {formatCurrency(Number(abono.monto_abonado), config.currency)}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-right">
                                {formatCurrency(Number(abono.saldo_nuevo), config.currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección de Garantías (Solo para Empeños) */}
            {prestamo.tipo_prestamo === 'empeño' && garantias.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Garantías/Colaterales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {garantias.map((garantia) => (
                    <div key={garantia.id} className="border border-border rounded-lg p-4 bg-purple-50 dark:bg-purple-950/30 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-purple-900 dark:text-purple-100">{garantia.descripcion}</h4>
                          {garantia.categoria && (
                            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                              Categoría: {garantia.categoria}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          garantia.estado === 'activo'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100'
                            : garantia.estado === 'liquidado'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100'
                            : garantia.estado === 'renovado'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                        }`}>
                          {garantia.estado}
                        </span>
                      </div>
                      {garantia.valor_estimado && (
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Valor estimado:</span>{' '}
                          {formatCurrency(garantia.valor_estimado, config.currency)}
                        </p>
                      )}
                      {garantia.fecha_vencimiento && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Vencimiento:</span>{' '}
                          {formatDate(garantia.fecha_vencimiento)}
                          {isDateOverdue(garantia.fecha_vencimiento) && garantia.estado === 'activo' && (
                            <span className="ml-2 text-red-600 dark:text-red-400 font-medium">⚠ Vencido</span>
                          )}
                        </p>
                      )}
                      {garantia.numero_renovaciones > 0 && (
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Renovaciones: {garantia.numero_renovaciones}
                        </p>
                      )}
                      {garantia.observaciones && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
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
              <h3 className="font-semibold text-lg text-foreground mb-4">
                {prestamo.tipo_prestamo === 'abierto' ? 'Historial de Pagos' : 'Cuotas del Préstamo'}
              </h3>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Cargando cuotas...</p>
              ) : cuotas.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {prestamo.tipo_prestamo === 'abierto'
                    ? 'No hay períodos registrados aún. Si hay cuotas pendientes generadas, regístralas con "Registrar Pago del Período".'
                    : 'No hay cuotas registradas'}
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  {/* Nota informativa para sistema francés */}
                  {prestamo.tipo_calculo_interes === 'frances' && (
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-border text-xs text-blue-700 dark:text-blue-200">
                      Sistema Francés: la cuota es constante pero el interés decrece cada período porque se calcula sobre el saldo restante.
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Cuota</TableHead>
                        {/* Columnas de desglose para Sistema Francés y Préstamo Abierto */}
                        {(prestamo.tipo_calculo_interes === 'frances' || prestamo.tipo_prestamo === 'abierto') && (
                          <>
                            <TableHead className="text-blue-700 dark:text-blue-300">Interés</TableHead>
                            <TableHead className="text-green-700 dark:text-green-300">Capital</TableHead>
                          </>
                        )}
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        {prestamo.tipo_prestamo === 'abierto' && (
                          <TableHead>Período</TableHead>
                        )}
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
                            {/* Desglose interés/capital para Sistema Francés y Préstamo Abierto */}
                            {(prestamo.tipo_calculo_interes === 'frances' || prestamo.tipo_prestamo === 'abierto') && (
                              <>
                                <TableCell className="text-blue-700 dark:text-blue-300 text-sm">
                                  {cuota.monto_interes != null
                                    ? formatCurrency(cuota.monto_interes, config.currency)
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-green-700 dark:text-green-300 text-sm">
                                  {cuota.monto_capital != null
                                    ? formatCurrency(cuota.monto_capital, config.currency)
                                    : '—'}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-green-600 dark:text-green-400">
                              {formatCurrency(cuota.monto_pagado, config.currency)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(montoPendiente, config.currency)}
                            </TableCell>
                            {prestamo.tipo_prestamo === 'abierto' && (
                              <TableCell className="text-xs whitespace-nowrap">
                                {cuota.periodo_desde && cuota.periodo_hasta
                                  ? formatRangoPeriodo(cuota.periodo_desde, cuota.periodo_hasta)
                                  : '—'}
                              </TableCell>
                            )}
                            <TableCell>{formatDate(cuota.fecha_vencimiento)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  cuota.estado === 'pagada'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100'
                                    : cuota.estado === 'retrasada'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
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
                                    if (prestamo.tipo_prestamo === 'abierto') {
                                      setPagoAbiertoDialogOpen(true)
                                      return
                                    }
                                    setSelectedCuota(cuota)
                                    setMontoPago(montoPendiente.toFixed(2))
                                    setPagoDialogOpen(true)
                                  }}
                                >
                                  <DollarSign className="mr-1 h-3 w-3" />
                                  Pagar
                                </Button>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => emitirReciboPdf(cuota)}
                                  >
                                    <Receipt className="h-3 w-3" />
                                    Recibo
                                  </Button>
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1 px-2">
                                      <MoreHorizontal className="h-3 w-3" />
                                      <span className="sr-only">Opciones</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => emitirReciboPdf(cuota)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Receipt className="h-4 w-4 text-blue-600" />
                                      Recibo PDF (evolución)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => emitirReciboImagen(cuota)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Receipt className="h-4 w-4 text-purple-600" />
                                      Recibo imagen (simple)
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCuotaADesmarcar(cuota)
                                        setDesmarcarDialogOpen(true)
                                      }}
                                      className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Desmarcar
                                    </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
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
              <div className="bg-muted/50 dark:bg-muted/80 p-4 rounded-lg space-y-1 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto de la cuota:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(selectedCuota.monto_cuota, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ya pagado:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendiente esta cuota:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(selectedCuota.monto_cuota - selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Pendiente desde aquí (siguientes):</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(
                      totalPendienteDesdeCuota(cuotas, selectedCuota.numero_cuota),
                      config.currency
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto cobrado hoy *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Puede ser mayor que una cuota: el excedente se aplica a las siguientes en orden.
                </p>
                {montoPago && parseFloat(montoPago) > 0 && (
                  <p className="text-xs text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 p-2 rounded border border-blue-100 dark:border-blue-900/50">
                    {previewAplicacionCascada(
                      cuotas,
                      selectedCuota.numero_cuota,
                      parseFloat(montoPago)
                    )}
                  </p>
                )}
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

              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emitir_recibo"
                    checked={emitirReciboAlPagar}
                    onCheckedChange={(checked) => setEmitirReciboAlPagar(checked === true)}
                  />
                  <Label htmlFor="emitir_recibo" className="text-sm font-normal cursor-pointer">
                    Descargar recibo PDF con evolución del préstamo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emitir_recibo_imagen"
                    checked={emitirReciboImagenAlPagar}
                    onCheckedChange={(checked) => setEmitirReciboImagenAlPagar(checked === true)}
                  />
                  <Label htmlFor="emitir_recibo_imagen" className="text-sm font-normal cursor-pointer">
                    Descargar recibo imagen simple (ideal para WhatsApp)
                  </Label>
                </div>
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
              Se eliminarán o ajustarán los pagos registrados para esta cuota y el capital en caja se recalculará.
              <br /><br />
              El monto pagado de la cuota volverá a {formatCurrency(0, config.currency)}.
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

      {/* Dialog de Abono a Capital */}
      <AbonoCapitalDialog
        prestamo={prestamo}
        open={abonoCapitalDialogOpen}
        onOpenChange={setAbonoCapitalDialogOpen}
        onSuccess={handleAbonoSuccess}
      />

      {/* Dialog de Renovar Empeño */}
      <RenovarEmpenoDialog
        prestamo={prestamo}
        open={renovarEmpenoDialogOpen}
        onOpenChange={setRenovarEmpenoDialogOpen}
        onSuccess={handleRenovacionSuccess}
      />

      {/* Dialog para pagos de período en préstamos abiertos */}
      {prestamo.tipo_prestamo === 'abierto' && (
        <>
          <AbonoCapitalAbiertoDialog
            prestamo={prestamoActivo}
            open={abonoCapitalAbiertoDialogOpen}
            onOpenChange={setAbonoCapitalAbiertoDialogOpen}
            onSuccess={handleAbonoSuccess}
          />
          <PagoAbiertoDialog
            prestamo={prestamoActivo}
            open={pagoAbiertoDialogOpen}
            onOpenChange={setPagoAbiertoDialogOpen}
            onSuccess={async () => {
              await reloadPrestamoFromDb()
              await loadCuotas()
              if (onUpdate) onUpdate()
            }}
          />
        </>
      )}
    </>
  )
}

