'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  MapPin,
  AlertTriangle,
  Banknote,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { format, startOfMonth } from 'date-fns'
import { loadRutasCaja, type MovimientoCaja, type ResumenCajaRuta, type RutaCajaOption, type AlertaPrestamosSinRuta } from '@/lib/caja-movimientos'

export default function CajaPage() {
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const inicioMes = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [rutas, setRutas] = useState<RutaCajaOption[]>([])
  const [filtroRuta, setFiltroRuta] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState(inicioMes)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [resumenRuta, setResumenRuta] = useState<ResumenCajaRuta | null>(null)
  const [resumenTodas, setResumenTodas] = useState<ResumenCajaRuta[]>([])
  const [alertaSinRuta, setAlertaSinRuta] = useState<AlertaPrestamosSinRuta | null>(null)

  const { toast } = useToast()
  const supabase = createClient()
  const { config } = useConfigStore()

  const esVistaTodas = userRole === 'admin' && filtroRuta === 'todas'

  const cargarDatos = useCallback(async () => {
    if (!organizationId || !userRole || !filtroRuta) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        desde: fechaDesde,
        hasta: fechaHasta,
      })
      if (esVistaTodas) {
        params.set('todas', '1')
      } else {
        params.set('rutaId', filtroRuta)
      }

      const res = await fetch(`/api/caja/resumen?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al cargar caja')
      }

      if (json.rutas?.length) {
        setRutas(json.rutas)
      }

      setAlertaSinRuta(json.alertaSinRuta ?? null)

      if (esVistaTodas) {
        setResumenTodas(json.resumenTodas || [])
        setResumenRuta(null)
      } else {
        setResumenRuta(json.resumen || null)
        setResumenTodas([])
      }
    } catch (e) {
      console.error('[Caja] Error cargando datos:', e)
      toast({
        title: 'Error',
        description:
          e instanceof Error ? e.message : 'No se pudieron cargar los movimientos de caja',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [
    organizationId,
    userRole,
    esVistaTodas,
    filtroRuta,
    fechaDesde,
    fechaHasta,
    toast,
  ])

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        setLoading(false)
        return
      }

      let role: 'admin' | 'cobrador' =
        profile.role === 'cobrador' ? 'cobrador' : 'admin'
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
        role = roleData.role
      }

      setUserRole(role)
      setOrganizationId(profile.organization_id)

      const rutasData = await loadRutasCaja(
        supabase,
        profile.organization_id,
        role,
        user.id
      )
      setRutas(rutasData)

      if (role === 'admin') {
        setFiltroRuta('todas')
      } else if (rutasData.length > 0) {
        setFiltroRuta(rutasData[0].id)
      }
    }

    init()
  }, [supabase])

  useEffect(() => {
    if (!organizationId || !filtroRuta) return
    cargarDatos()
  }, [organizationId, filtroRuta, fechaDesde, fechaHasta, cargarDatos])

  const limpiarFiltros = () => {
    setFechaDesde(inicioMes)
    setFechaHasta(hoy)
    if (userRole === 'admin') {
      setFiltroRuta('todas')
    } else if (rutas.length > 0) {
      setFiltroRuta(rutas[0].id)
    }
  }

  const iconoMovimiento = (m: MovimientoCaja) =>
    m.es_entrada ? (
      <ArrowDownLeft className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    )

  const totalesOrg = resumenTodas.reduce(
    (acc, r) => ({
      cobrado: acc.cobrado + r.total_cobrado,
      prestado: acc.prestado + r.total_prestado,
      prestadoActivo: acc.prestadoActivo + r.total_prestado_activo,
      gastos: acc.gastos + r.total_gastos,
      capital: acc.capital + r.capital_actual,
    }),
    { cobrado: 0, prestado: 0, prestadoActivo: 0, gastos: 0, capital: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {userRole === 'admin' ? 'Caja por rutas' : 'Mi caja'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">
          Movimientos diarios: lo cobrado, préstamos entregados, gastos y saldo actual
          de cada ruta. Admin y cobrador ven los mismos números.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userRole === 'admin' && (
              <div className="space-y-2">
                <Label>Ruta</Label>
                <Select value={filtroRuta} onValueChange={setFiltroRuta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las rutas</SelectItem>
                    {rutas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre_ruta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {userRole === 'cobrador' && rutas.length > 0 && (
              <div className="space-y-2">
                <Label>Mi ruta</Label>
                <Select value={filtroRuta} onValueChange={setFiltroRuta}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre_ruta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                max={fechaHasta}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                min={fechaDesde}
                max={hoy}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Periodo: {formatDate(fechaDesde)} — {formatDate(fechaHasta)}. El dashboard
            muestra totales de toda la organización; aquí ves movimientos de la ruta
            seleccionada. El saldo actual incluye capital inicial y préstamos activos
            en la ruta (no solo el periodo filtrado).
          </p>
          {userRole === 'admin' &&
            alertaSinRuta &&
            alertaSinRuta.prestamos_sin_ruta_count > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Hay {alertaSinRuta.prestamos_sin_ruta_count} préstamo(s) activo(s) sin
                  ruta ({formatCurrency(alertaSinRuta.monto_sin_ruta, config.currency)}).
                  No aparecen en caja hasta asignarlos en{' '}
                  <Link href="/dashboard/rutas" className="underline font-medium">
                    Rutas
                  </Link>
                  .
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Cargando movimientos...</p>
      ) : rutas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay rutas activas asignadas.
          </CardContent>
        </Card>
      ) : esVistaTodas ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total cobrado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totalesOrg.cobrado, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">En el periodo</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Prestado en periodo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totalesOrg.prestado, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Por fecha de registro</p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Préstamos activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(totalesOrg.prestadoActivo, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Capital en circulación</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(totalesOrg.gastos, config.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Capital en rutas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${totalesOrg.capital < 0 ? 'text-red-700' : 'text-blue-600'}`}>
                  {formatCurrency(totalesOrg.capital, config.currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Resumen por ruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Cobrador</TableHead>
                    <TableHead className="text-right">Cobrado</TableHead>
                    <TableHead className="text-right">Prestado (periodo)</TableHead>
                    <TableHead className="text-right">Préstamos activos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Saldo actual</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenTodas.map((r) => (
                    <TableRow key={r.ruta_id}>
                      <TableCell className="font-medium">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: r.color || '#94a3b8' }}
                        />
                        {r.nombre_ruta}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.cobrador_nombre || '—'}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(r.total_cobrado, config.currency)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(r.total_prestado, config.currency)}
                      </TableCell>
                      <TableCell className="text-right text-red-700 font-medium">
                        {formatCurrency(r.total_prestado_activo, config.currency)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatCurrency(r.total_gastos, config.currency)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(r.capital_actual, config.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFiltroRuta(r.ruta_id)}
                        >
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : resumenRuta ? (
        <>
          {resumenRuta.total_prestado_activo > resumenRuta.total_prestado && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Hay préstamos activos fuera del periodo seleccionado (
                {formatCurrency(
                  resumenRuta.total_prestado_activo - resumenRuta.total_prestado,
                  config.currency
                )}{' '}
                no aparecen en &quot;Prestado en el periodo&quot;). Amplía la fecha
                &quot;Hasta&quot; o revisa &quot;Capital en préstamos activos&quot; (
                {formatCurrency(resumenRuta.total_prestado_activo, config.currency)}).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cobrado en el periodo</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(resumenRuta.total_cobrado, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Por fecha de cobro (pagos registrados)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Prestado en el periodo</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(resumenRuta.total_prestado, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Por fecha de registro del préstamo
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Capital en préstamos activos</CardTitle>
                <Banknote className="h-4 w-4 text-red-700" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(resumenRuta.total_prestado_activo, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total en circulación — comparable con el dashboard
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gastos aprobados</CardTitle>
                <Receipt className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(resumenRuta.total_gastos, config.currency)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo actual (sistema)</CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${(resumenRuta.capital_actual ?? 0) < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                  {formatCurrency(resumenRuta.capital_actual, config.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Capital de la ruta — debe coincidir con admin y cobrador
                </p>
                {resumenRuta.desglose_saldo && (
                  <div className="mt-3 pt-3 border-t border-blue-200/60 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground/80">Composición del saldo:</p>
                    <p>+ Capital inicial: {formatCurrency(resumenRuta.desglose_saldo.capital_inicial, config.currency)}</p>
                    <p>+ Cobros acumulados: {formatCurrency(resumenRuta.desglose_saldo.cobros_acumulados, config.currency)}</p>
                    <p>− Préstamos activos en ruta: {formatCurrency(resumenRuta.desglose_saldo.prestamos_activos, config.currency)}</p>
                    <p>− Gastos aprobados: {formatCurrency(resumenRuta.desglose_saldo.gastos_aprobados_total, config.currency)}</p>
                  </div>
                )}
                {resumenRuta.cobrador_nombre && (
                  <p className="text-xs mt-2">
                    Cobrador: <strong>{resumenRuta.cobrador_nombre}</strong>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Movimientos — {resumenRuta.nombre_ruta}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resumenRuta.movimientos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay movimientos en este periodo para esta ruta.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumenRuta.movimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(m.fecha)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {iconoMovimiento(m)}
                            <Badge
                              variant="outline"
                              className={
                                m.es_entrada
                                  ? 'border-green-200 text-green-800'
                                  : 'border-red-200 text-red-800'
                              }
                            >
                              {m.concepto}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {m.detalle || '—'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold whitespace-nowrap ${
                            m.es_entrada ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {m.es_entrada ? '+' : '−'}
                          {formatCurrency(m.monto, config.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
