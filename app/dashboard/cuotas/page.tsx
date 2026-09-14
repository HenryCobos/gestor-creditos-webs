'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { DollarSign, CheckCircle, AlertCircle, History, Undo2, Filter } from 'lucide-react'
import { effectiveCuotaEstado, formatCurrency, formatDate } from '@/lib/utils'
import { toastPagoExitoso } from '@/lib/pago-feedback'
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns'
import { useConfigStore } from '@/lib/config-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getCuotasSegunRol,
  getPrestamosInteligente,
  getClientesInteligente,
} from '@/lib/queries-con-roles'
import {
  previewAplicacionCascada,
  totalPendienteDesdeCuota,
} from '@/lib/aplicar-pago-cuotas'
import { CuotaCardMobile } from '@/components/CuotaCardMobile'
import { useStore, type Cuota as CuotaStore } from '@/lib/store'
import { shouldBlockListLoader } from '@/lib/should-block-list-loader'
import { getDashboardSession } from '@/lib/dashboard-session-cache'

interface Pago {
  id: string
  monto_pagado: number
  fecha_pago: string
  metodo_pago: string | null
  notas: string | null
}

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
  cobrador_nombre?: string | null
}

type FiltroFecha = 'hoy' | 'anteriores' | 'posteriores' | 'personalizado'

function cuotaStoreToExtendedMinimal(c: CuotaStore): CuotaExtended {
  return {
    id: c.id,
    numero_cuota: c.numero_cuota,
    monto_cuota: c.monto_cuota,
    fecha_vencimiento: c.fecha_vencimiento,
    fecha_pago: c.fecha_pago,
    estado: effectiveCuotaEstado(c),
    monto_pagado: c.monto_pagado,
    prestamo: {
      id: c.prestamo_id,
      monto_prestado: 0,
      cliente: { nombre: '—', dni: '-' },
    },
  }
}

export default function CuotasPage() {
  const { cuotas: storeCuotas, setCuotas: setStoreCuotas } = useStore()
  const [cuotas, setCuotas] = useState<CuotaExtended[]>(() =>
    storeCuotas.map(cuotaStoreToExtendedMinimal)
  )
  const [cuotasFiltradas, setCuotasFiltradas] = useState<CuotaExtended[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCuota, setSelectedCuota] = useState<CuotaExtended | null>(null)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [pagosDialogOpen, setPagosDialogOpen] = useState(false)
  const [revertirDialogOpen, setRevertirDialogOpen] = useState(false)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [pagoARevertir, setPagoARevertir] = useState<Pago | null>(null)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [notas, setNotas] = useState('')
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('hoy')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [vistaRetrasadas, setVistaRetrasadas] = useState(false)

  useEffect(() => {
    setVistaRetrasadas(searchParams.get('vista') === 'retrasadas')
  }, [searchParams])

  useEffect(() => {
    loadCuotas()
  }, [])

  useEffect(() => {
    aplicarFiltroFecha()
  }, [cuotas, filtroFecha, fechaDesde, fechaHasta, vistaRetrasadas])

  const loadCuotas = async () => {
    setRefreshing(true)

    try {
      const session = await getDashboardSession(supabase)
      if (!session) return

      if (!session.organizationId) {
        toast({
          title: 'Error',
          description: 'Usuario no asociado a una organización',
          variant: 'destructive',
        })
        return
      }

      setUserId(session.userId)
      setOrganizationId(session.organizationId)
      setUserRole(session.role)

      const [cuotasData, prestamosData, clientesData] = await Promise.all([
        getCuotasSegunRol(),
        getPrestamosInteligente(),
        getClientesInteligente(),
      ])

      if (!cuotasData || cuotasData.length === 0) {
        setCuotas([])
        setStoreCuotas([])
        return
      }

      setStoreCuotas(cuotasData as CuotaStore[])

      const prestamosMap = new Map(
        (prestamosData || []).map((p: any) => [p.id, p])
      )
      const clientesMap = new Map(
        (clientesData || []).map((c: any) => [c.id, c])
      )

      let cobradoresMap = new Map<string, string>()
      if (session.role === 'admin') {
        const cobradorIds = [
          ...new Set(
            (prestamosData || []).map((p: any) => p.user_id).filter(Boolean)
          ),
        ]
        if (cobradorIds.length > 0) {
          const { data: cobradoresData } = await supabase.rpc('get_usuarios_organizacion')
          if (cobradoresData) {
            cobradoresData.forEach((c: any) => {
              cobradoresMap.set(c.id, c.nombre_completo || c.email)
            })
          }
        }
      }

      const cuotasEnriquecidas = cuotasData.map((cuota: any) => {
        const p = prestamosMap.get(cuota.prestamo_id)
        const cliente = p?.cliente_id ? clientesMap.get(p.cliente_id) : null

        const estado = effectiveCuotaEstado(cuota)

        // Agregar información del cobrador si es admin
        const cobrador = p?.user_id ? cobradoresMap.get(p.user_id) : null

        return {
          ...cuota,
          estado,
          prestamo: {
            id: p?.id || cuota.prestamo_id,
            monto_prestado: p?.monto_prestado || 0,
            user_id: p?.user_id,
            cliente: cliente
              ? { nombre: cliente.nombre, dni: cliente.dni }
              : { nombre: 'Sin cliente', dni: '-' },
          },
          cobrador_nombre: cobrador || null,
        }
      })

      setCuotas(cuotasEnriquecidas as CuotaExtended[])

      // Actualizar en la base de datos las cuotas retrasadas
      const cuotasRetrasadas = cuotasEnriquecidas.filter(
        (c: any) => c.estado === 'retrasada' && cuotasData.find((d: any) => d.id === c.id)?.estado === 'pendiente'
      )
      
      if (cuotasRetrasadas.length > 0) {
        await Promise.all(
          cuotasRetrasadas.map((cuota: any) =>
            supabase
              .from('cuotas')
              .update({ estado: 'retrasada' })
              .eq('id', cuota.id)
          )
        )
      }
    } catch (error: any) {
      console.error('[loadCuotas] Error:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las cuotas',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const cuotasCacheCount = cuotas.length || storeCuotas.length

  const handleRegistrarPago = async (e: React.FormEvent) => {
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

    console.log('[handleRegistrarPago] Registrando pago:', {
      cuota_id: selectedCuota.id,
      prestamo_id: selectedCuota.prestamo.id,
      monto_pagado: monto,
      metodo_pago: metodoPago,
    })

    try {
      // Usar API route para registrar el pago de forma segura
      // Esto permite que admin registre pagos en nombre de cobradores
      const response = await fetch('/api/registrar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cuota_id: selectedCuota.id,
          prestamo_id: selectedCuota.prestamo.id,
          monto_pagado: monto,
          metodo_pago: metodoPago || null,
          notas: notas || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[handleRegistrarPago] Error en API:', data)
        toast({
          title: 'Error',
          description: `${data.error || 'No se pudo registrar el pago'}${data.details ? `: ${data.details}` : ''}`,
          variant: 'destructive',
        })
        return
      }

      console.log('[handleRegistrarPago] Pago registrado exitosamente:', data)

      toastPagoExitoso(toast, data, config.currency)

      // Recargar cuotas
      loadCuotas()
      resetPagoForm()
    } catch (error: any) {
      console.error('[handleRegistrarPago] Error al registrar pago:', error)
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

  const loadPagosCuota = async (cuotaId: string) => {
    setLoadingPagos(true)
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('cuota_id', cuotaId)
      .order('fecha_pago', { ascending: false })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pagos',
        variant: 'destructive',
      })
      setPagos([])
    } else {
      setPagos(data || [])
    }
    setLoadingPagos(false)
  }

  const handleVerPagos = async (cuota: CuotaExtended) => {
    setSelectedCuota(cuota)
    await loadPagosCuota(cuota.id)
    setPagosDialogOpen(true)
  }

  const handleRevertirPago = async () => {
    if (!pagoARevertir || !selectedCuota) return

    try {
      const response = await fetch('/api/revertir-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pagoARevertir.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo revertir el pago',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Éxito',
        description: data.message || 'Pago revertido correctamente',
      })

      loadCuotas()
      loadPagosCuota(selectedCuota.id)
      setRevertirDialogOpen(false)
      setPagoARevertir(null)
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo revertir el pago',
        variant: 'destructive',
      })
    }
  }

  const salirVistaRetrasadas = () => {
    setVistaRetrasadas(false)
    router.replace('/dashboard/cuotas')
  }

  const aplicarFiltroFecha = () => {
    if (vistaRetrasadas) {
      setCuotasFiltradas(
        cuotas.filter((c) => effectiveCuotaEstado(c) === 'retrasada')
      )
      return
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    let filtradas = cuotas

    switch (filtroFecha) {
      case 'hoy':
        filtradas = cuotas.filter(cuota => {
          const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
          fechaVencimiento.setHours(0, 0, 0, 0)
          return isSameDay(fechaVencimiento, hoy)
        })
        break
      case 'anteriores':
        filtradas = cuotas.filter(cuota => {
          const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
          fechaVencimiento.setHours(0, 0, 0, 0)
          return fechaVencimiento < hoy
        })
        break
      case 'posteriores':
        filtradas = cuotas.filter(cuota => {
          const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
          fechaVencimiento.setHours(0, 0, 0, 0)
          return fechaVencimiento > hoy
        })
        break
      case 'personalizado':
        if (fechaDesde && fechaHasta) {
          const desde = parseISO(fechaDesde)
          const hasta = parseISO(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          filtradas = cuotas.filter(cuota => {
            const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
            return fechaVencimiento >= desde && fechaVencimiento <= hasta
          })
        } else if (fechaDesde) {
          const desde = parseISO(fechaDesde)
          filtradas = cuotas.filter(cuota => {
            const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
            return fechaVencimiento >= desde
          })
        } else if (fechaHasta) {
          const hasta = parseISO(fechaHasta)
          hasta.setHours(23, 59, 59, 999)
          filtradas = cuotas.filter(cuota => {
            const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
            return fechaVencimiento <= hasta
          })
        }
        break
    }

    setCuotasFiltradas(filtradas)
  }

  const cuotasConEstadoEfectivo = cuotas.map((c) => ({
    ...c,
    estado: effectiveCuotaEstado(c),
  }))

  const resumenPendientes = cuotasConEstadoEfectivo.filter(
    (c) => c.estado === 'pendiente' || c.estado === 'retrasada'
  )
  const resumenPagadas = cuotasConEstadoEfectivo.filter((c) => c.estado === 'pagada')
  const resumenRetrasadas = cuotasConEstadoEfectivo.filter((c) => c.estado === 'retrasada')

  const cuotasPendientes = cuotasFiltradas.filter(
    (c) => effectiveCuotaEstado(c) === 'pendiente' || effectiveCuotaEstado(c) === 'retrasada'
  )
  const cuotasPagadas = cuotasFiltradas.filter((c) => effectiveCuotaEstado(c) === 'pagada')
  const cuotasRetrasadasLista = cuotasFiltradas.filter(
    (c) => effectiveCuotaEstado(c) === 'retrasada'
  )
  const cuotasEnListado = vistaRetrasadas ? cuotasRetrasadasLista : cuotasPendientes

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
            <div className="text-2xl font-bold">{resumenPendientes.length}</div>
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
              {resumenRetrasadas.length}
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
              {resumenPagadas.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {vistaRetrasadas && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span>Mostrando todas las cuotas retrasadas (cualquier fecha de vencimiento).</span>
          <Button type="button" variant="outline" size="sm" onClick={salirVistaRetrasadas}>
            Ver filtro por fecha
          </Button>
        </div>
      )}

      {/* Cuotas Pendientes y Retrasadas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{vistaRetrasadas ? 'Cuotas Retrasadas' : 'Cuotas Por Cobrar'}</CardTitle>
                  {refreshing && cuotasCacheCount > 0 && (
                    <span className="text-xs text-muted-foreground">Actualizando…</span>
                  )}
                </div>
                {!vistaRetrasadas && filtroFecha !== 'hoy' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Mostrando {cuotasPendientes.length} de {resumenPendientes.length} cuotas
                  </p>
                )}
                {vistaRetrasadas && (
                  <p className="text-sm text-gray-500 mt-1">
                    {cuotasRetrasadasLista.length} cuota(s) en listado
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Filtro de Fecha */}
                {!vistaRetrasadas && (
                  <>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Select value={filtroFecha} onValueChange={(value: FiltroFecha) => {
                        setFiltroFecha(value)
                        if (value !== 'personalizado') {
                          setFechaDesde('')
                          setFechaHasta('')
                        }
                      }}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filtrar por fecha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hoy">Hoy</SelectItem>
                          <SelectItem value="anteriores">Días anteriores</SelectItem>
                          <SelectItem value="posteriores">Días posteriores</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {filtroFecha === 'personalizado' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={fechaDesde}
                          onChange={(e) => setFechaDesde(e.target.value)}
                          placeholder="Desde"
                          className="w-[150px]"
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="date"
                          value={fechaHasta}
                          onChange={(e) => setFechaHasta(e.target.value)}
                          placeholder="Hasta"
                          className="w-[150px]"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {shouldBlockListLoader(refreshing, cuotasCacheCount) ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : (vistaRetrasadas ? cuotasRetrasadasLista : cuotasPendientes).length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              {vistaRetrasadas ? 'No hay cuotas retrasadas' : 'No hay cuotas pendientes'}
            </p>
          ) : (
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    {userRole === 'admin' && <TableHead>Cobrador</TableHead>}
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
                {cuotasEnListado.map((cuota) => {
                  const montoPendiente = cuota.monto_cuota - cuota.monto_pagado
                  return (
                    <TableRow key={cuota.id}>
                      <TableCell className="font-medium">
                        {cuota.prestamo.cliente.nombre}
                      </TableCell>
                      {userRole === 'admin' && (
                        <TableCell className="text-sm text-gray-600">
                          {cuota.cobrador_nombre || 'Sin asignar'}
                        </TableCell>
                      )}
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
                        <div className="flex justify-end gap-2">
                          {cuota.monto_pagado > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerPagos(cuota)}
                            >
                              <History className="mr-1 h-3 w-3" />
                              Ver Pagos
                            </Button>
                          )}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {cuotasEnListado.map((cuota) => (
                <CuotaCardMobile
                  key={cuota.id}
                  cuota={cuota}
                  currency={config.currency}
                  userRole={userRole}
                  onRegistrarPago={() => {
                    setSelectedCuota(cuota)
                    setMontoPago((cuota.monto_cuota - cuota.monto_pagado).toFixed(2))
                    setPagoDialogOpen(true)
                  }}
                  onVerPagos={cuota.monto_pagado > 0 ? () => handleVerPagos(cuota) : undefined}
                />
              ))}
            </div>
          </>
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
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    {userRole === 'admin' && <TableHead>Cobrador</TableHead>}
                    <TableHead>Cuota #</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {cuotasPagadas.slice(0, 10).map((cuota) => (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-medium">
                      {cuota.prestamo.cliente.nombre}
                    </TableCell>
                    {userRole === 'admin' && (
                      <TableCell className="text-sm text-gray-600">
                        {cuota.cobrador_nombre || 'Sin asignar'}
                      </TableCell>
                    )}
                    <TableCell>{cuota.numero_cuota}</TableCell>
                    <TableCell>{formatCurrency(cuota.monto_cuota, config.currency)}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {formatCurrency(cuota.monto_pagado, config.currency)}
                    </TableCell>
                    <TableCell>
                      {cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Pagada
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerPagos(cuota)}
                      >
                        <History className="mr-1 h-3 w-3" />
                        Ver Pagos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {cuotasPagadas.slice(0, 10).map((cuota) => (
                <CuotaCardMobile
                  key={cuota.id}
                  cuota={cuota}
                  currency={config.currency}
                  userRole={userRole}
                  onRegistrarPago={() => {}}
                  onVerPagos={() => handleVerPagos(cuota)}
                />
              ))}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Registro de Pago */}
      <Dialog open={pagoDialogOpen} onOpenChange={(isOpen) => {
        setPagoDialogOpen(isOpen)
        if (!isOpen) resetPagoForm()
      }}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
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
                  <span className="text-gray-600">Pendiente esta cuota:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(selectedCuota.monto_cuota - selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
                {(() => {
                  const delPrestamo = cuotas.filter(
                    (c) => c.prestamo.id === selectedCuota.prestamo.id
                  )
                  return (
                    <div className="flex justify-between text-sm border-t pt-1 mt-1">
                      <span className="text-gray-600">Pendiente desde aquí:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(
                          totalPendienteDesdeCuota(delPrestamo, selectedCuota.numero_cuota),
                          config.currency
                        )}
                      </span>
                    </div>
                  )
                })()}
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
                  Si cobras más de una cuota, el excedente se aplica a las siguientes.
                </p>
                {montoPago &&
                  parseFloat(montoPago) > 0 &&
                  (() => {
                    const delPrestamo = cuotas.filter(
                      (c) => c.prestamo.id === selectedCuota.prestamo.id
                    )
                    return (
                      <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                        {previewAplicacionCascada(
                          delPrestamo,
                          selectedCuota.numero_cuota,
                          parseFloat(montoPago)
                        )}
                      </p>
                    )
                  })()}
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

      {/* Dialog de Ver Pagos */}
      <Dialog open={pagosDialogOpen} onOpenChange={setPagosDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Pagos</DialogTitle>
            <DialogDescription>
              Cliente: {selectedCuota?.prestamo.cliente.nombre} - Cuota #{selectedCuota?.numero_cuota}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCuota && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto de la cuota:</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedCuota.monto_cuota, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total pagado:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(selectedCuota.monto_pagado, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pendiente:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(Math.max(0, selectedCuota.monto_cuota - selectedCuota.monto_pagado), config.currency)}
                  </span>
                </div>
              </div>

              {loadingPagos ? (
                <p className="text-center py-4 text-gray-500">Cargando pagos...</p>
              ) : pagos.length === 0 ? (
                <p className="text-center py-4 text-gray-500">No hay pagos registrados</p>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Pagos registrados:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagos.map((pago) => (
                        <TableRow key={pago.id}>
                          <TableCell>{formatDate(pago.fecha_pago)}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(pago.monto_pagado, config.currency)}
                          </TableCell>
                          <TableCell>{pago.metodo_pago || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={pago.notas || '-'}>
                            {pago.notas || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {userRole === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setPagoARevertir(pago)
                                setRevertirDialogOpen(true)
                              }}
                            >
                              <Undo2 className="mr-1 h-3 w-3" />
                              Revertir
                            </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación para Revertir */}
      <AlertDialog open={revertirDialogOpen} onOpenChange={setRevertirDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el pago de {pagoARevertir ? formatCurrency(pagoARevertir.monto_pagado, config.currency) : ''} 
              {' '}registrado el {pagoARevertir ? formatDate(pagoARevertir.fecha_pago) : ''}.
              <br /><br />
              El monto pagado de la cuota se actualizará automáticamente y el estado de la cuota 
              podría cambiar de "pagada" a "pendiente" o "retrasada".
              <br /><br />
              <strong>Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPagoARevertir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertirPago}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, Revertir Pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

