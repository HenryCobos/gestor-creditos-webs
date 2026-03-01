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
import { formatCurrency, formatDate, isDateOverdue } from '@/lib/utils'
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns'
import { useConfigStore } from '@/lib/config-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCuotasSegunRol } from '@/lib/queries-con-roles'
import { CuotaCardMobile } from '@/components/CuotaCardMobile'

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

export default function CuotasPage() {
  const [cuotas, setCuotas] = useState<CuotaExtended[]>([])
  const [cuotasFiltradas, setCuotasFiltradas] = useState<CuotaExtended[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadCuotas()
  }, [])

  useEffect(() => {
    aplicarFiltroFecha()
  }, [cuotas, filtroFecha, fechaDesde, fechaHasta])

  const loadCuotas = async () => {
    setLoading(true)
    console.log('[loadCuotas] Iniciando carga de cuotas')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[loadCuotas] No hay usuario autenticado')
      setLoading(false)
      return
    }

    setUserId(user.id)

    // Obtener rol y organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      console.log('[loadCuotas] Usuario sin organización')
      toast({
        title: 'Error',
        description: 'Usuario no asociado a una organización',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    setOrganizationId(profile.organization_id)

    // Obtener rol del usuario
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    let role: 'admin' | 'cobrador' = profile?.role === 'admin' ? 'admin' : 'cobrador'
    if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
      role = roleData.role
    }
    setUserRole(role)
    console.log('[loadCuotas] Rol del usuario:', role)

    try {
      // Usar la función RPC que maneja permisos según rol
      const cuotasData = await getCuotasSegunRol()
      console.log(`[loadCuotas] Se cargaron ${cuotasData.length} cuotas`)

      if (!cuotasData || cuotasData.length === 0) {
        setCuotas([])
        setLoading(false)
        return
      }

      // Enriquecer con datos de préstamos y clientes
      const prestamoIds = [...new Set(cuotasData.map((c: any) => c.prestamo_id))]
      
      const { data: prestamosData } = await supabase
        .from('prestamos')
        .select(`
          id,
          monto_prestado,
          user_id,
          cliente:clientes(
            nombre,
            dni
          )
        `)
        .in('id', prestamoIds)

      console.log(`[loadCuotas] Enriqueciendo cuotas con datos de ${prestamosData?.length || 0} préstamos`)

      // Si es admin, obtener nombres de cobradores para mostrar en la UI
      let cobradoresMap = new Map<string, string>()
      if (role === 'admin') {
        const cobradorIds = [...new Set(prestamosData?.map((p: any) => p.user_id).filter(Boolean) || [])]
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
        const prestamo = prestamosData?.find((p: any) => p.id === cuota.prestamo_id)
        
        // Actualizar estado de cuotas retrasadas
        let estado = cuota.estado
        if (cuota.estado === 'pendiente' && isDateOverdue(cuota.fecha_vencimiento)) {
          estado = 'retrasada'
        }

        // Agregar información del cobrador si es admin
        const cobrador = prestamo?.user_id ? cobradoresMap.get(prestamo.user_id) : null

        return {
          ...cuota,
          estado,
          prestamo: prestamo || { id: cuota.prestamo_id, monto_prestado: 0, cliente: { nombre: 'N/A', dni: 'N/A' } },
          cobrador_nombre: cobrador || null
        }
      })

      setCuotas(cuotasEnriquecidas as CuotaExtended[])

      // Actualizar en la base de datos las cuotas retrasadas
      const cuotasRetrasadas = cuotasEnriquecidas.filter(
        (c: any) => c.estado === 'retrasada' && cuotasData.find((d: any) => d.id === c.id)?.estado === 'pendiente'
      )
      
      if (cuotasRetrasadas.length > 0) {
        console.log(`[loadCuotas] Actualizando ${cuotasRetrasadas.length} cuotas retrasadas`)
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
      setLoading(false)
    }
  }

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
          description: data.error || 'No se pudo registrar el pago',
          variant: 'destructive',
        })
        return
      }

      console.log('[handleRegistrarPago] Pago registrado exitosamente:', data)

      toast({
        title: 'Éxito',
        description: data.message || 'Pago registrado correctamente',
      })

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Eliminar el pago
    const { error: deleteError } = await supabase
      .from('pagos')
      .delete()
      .eq('id', pagoARevertir.id)

    if (deleteError) {
      toast({
        title: 'Error',
        description: 'No se pudo revertir el pago',
        variant: 'destructive',
      })
      return
    }

    // Recalcular el monto_pagado de la cuota
    const nuevoMontoPagado = selectedCuota.monto_pagado - pagoARevertir.monto_pagado
    const esCompletaPagada = nuevoMontoPagado >= selectedCuota.monto_cuota

    // Actualizar la cuota
    const { error: updateError } = await supabase
      .from('cuotas')
      .update({
        monto_pagado: Math.max(0, nuevoMontoPagado),
        estado: esCompletaPagada ? 'pagada' : (isDateOverdue(selectedCuota.fecha_vencimiento) ? 'retrasada' : 'pendiente'),
        fecha_pago: esCompletaPagada ? selectedCuota.fecha_pago : null,
      })
      .eq('id', selectedCuota.id)

    if (updateError) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuota',
        variant: 'destructive',
      })
      return
    }

    // Si la cuota vuelve a estar pendiente, actualizar el estado del préstamo
    if (!esCompletaPagada && selectedCuota.estado === 'pagada') {
      await supabase
        .from('prestamos')
        .update({ estado: 'activo' })
        .eq('id', selectedCuota.prestamo.id)
    }

    toast({
      title: 'Éxito',
      description: 'Pago revertido correctamente',
    })

    // Recargar datos
    loadCuotas()
    loadPagosCuota(selectedCuota.id)
    setRevertirDialogOpen(false)
    setPagoARevertir(null)
  }

  const aplicarFiltroFecha = () => {
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

  const cuotasPendientes = cuotasFiltradas.filter(c => c.estado === 'pendiente' || c.estado === 'retrasada')
  const cuotasPagadas = cuotasFiltradas.filter(c => c.estado === 'pagada')
  const cuotasRetrasadas = cuotasFiltradas.filter(c => c.estado === 'retrasada')

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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cuotas Por Cobrar</CardTitle>
                {filtroFecha !== 'hoy' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Mostrando {cuotasPendientes.length} de {cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'retrasada').length} cuotas
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Filtro de Fecha */}
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
                
                {/* Rango de fechas personalizado */}
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
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : cuotasPendientes.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay cuotas pendientes
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
                {cuotasPendientes.map((cuota) => {
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
              {cuotasPendientes.map((cuota) => (
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

