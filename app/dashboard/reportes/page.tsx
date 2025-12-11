'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Download, TrendingUp, DollarSign } from 'lucide-react'
import { useConfigStore } from '@/lib/config-store'
import { generarReporteGeneral, generarReporteCliente } from '@/lib/pdf-generator'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface ReporteGeneral {
  totalPrestado: number
  totalRecuperado: number
  totalPendiente: number
  gananciaIntereses: number
  prestamosActivos: number
  prestamosPagados: number
  cuotasPendientes: number
  cuotasRetrasadas: number
  clientesActivos: number
}

interface ReporteCliente {
  cliente_id: string
  cliente_nombre: string
  cliente_dni: string
  total_prestado: number
  total_pagado: number
  total_pendiente: number
  prestamos_activos: number
  cuotas_pendientes: number
}

interface ClienteDetalle {
  id: string
  nombre: string
  dni: string
}

export default function ReportesPage() {
  const [reporteGeneral, setReporteGeneral] = useState<ReporteGeneral | null>(null)
  const [reportesClientes, setReportesClientes] = useState<ReporteCliente[]>([])
  const [clientes, setClientes] = useState<ClienteDetalle[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const supabase = createClient()
  const { config } = useConfigStore()
  const { toast } = useToast()

  useEffect(() => {
    loadReportes()
  }, [])

  const loadReportes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Cargar todos los datos necesarios
    const [
      { data: prestamos },
      { data: cuotas },
      { data: clientesData }
    ] = await Promise.all([
      supabase.from('prestamos').select('*').eq('user_id', user.id),
      supabase.from('cuotas').select('*').eq('user_id', user.id),
      supabase.from('clientes').select('id, nombre, dni').eq('user_id', user.id)
    ])

    if (clientesData) {
      setClientes(clientesData)
    }

    // Calcular reporte general
    if (prestamos && cuotas) {
      const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.monto_prestado), 0)
      const totalRecuperado = cuotas.reduce((sum, c) => sum + parseFloat(c.monto_pagado), 0)
      // Calcular total pendiente sumando la diferencia entre monto de cuota y monto pagado
      const totalPendiente = cuotas.reduce((sum, c) => {
        const pendiente = parseFloat(c.monto_cuota) - parseFloat(c.monto_pagado)
        return sum + (pendiente > 0 ? pendiente : 0)
      }, 0)
      const gananciaIntereses = prestamos.reduce((sum, p) => {
        const interes = (parseFloat(p.monto_prestado) * parseFloat(p.interes_porcentaje)) / 100
        return sum + interes
      }, 0)
      const prestamosActivos = prestamos.filter(p => p.estado === 'activo').length
      const prestamosPagados = prestamos.filter(p => p.estado === 'pagado').length
      const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente').length
      const cuotasRetrasadas = cuotas.filter(c => c.estado === 'retrasada').length

      setReporteGeneral({
        totalPrestado,
        totalRecuperado,
        totalPendiente,
        gananciaIntereses,
        prestamosActivos,
        prestamosPagados,
        cuotasPendientes,
        cuotasRetrasadas,
        clientesActivos: clientesData?.length || 0,
      })

      // Calcular reportes por cliente
      const reportesPorCliente: Map<string, ReporteCliente> = new Map()

      prestamos.forEach(prestamo => {
        if (!reportesPorCliente.has(prestamo.cliente_id)) {
          reportesPorCliente.set(prestamo.cliente_id, {
            cliente_id: prestamo.cliente_id,
            cliente_nombre: '',
            cliente_dni: '',
            total_prestado: 0,
            total_pagado: 0,
            total_pendiente: 0,
            prestamos_activos: 0,
            cuotas_pendientes: 0,
          })
        }

        const reporte = reportesPorCliente.get(prestamo.cliente_id)!
        reporte.total_prestado += parseFloat(prestamo.monto_prestado)
        if (prestamo.estado === 'activo') {
          reporte.prestamos_activos++
        }
      })

      cuotas.forEach(cuota => {
        const prestamo = prestamos.find(p => p.id === cuota.prestamo_id)
        if (prestamo) {
          const reporte = reportesPorCliente.get(prestamo.cliente_id)
          if (reporte) {
            // Sumar el monto pagado independientemente del estado (incluye pagos parciales)
            reporte.total_pagado += parseFloat(cuota.monto_pagado)
            // Calcular pendiente como la diferencia entre el monto de la cuota y lo pagado
            const montoPendiente = parseFloat(cuota.monto_cuota) - parseFloat(cuota.monto_pagado)
            if (montoPendiente > 0) {
              reporte.total_pendiente += montoPendiente
              reporte.cuotas_pendientes++
            }
          }
        }
      })

      // Agregar información del cliente
      const reportesArray = Array.from(reportesPorCliente.values()).map(reporte => {
        const cliente = clientesData?.find(c => c.id === reporte.cliente_id)
        return {
          ...reporte,
          cliente_nombre: cliente?.nombre || 'Desconocido',
          cliente_dni: cliente?.dni || '-',
        }
      })

      setReportesClientes(reportesArray)
    }

    setLoading(false)
  }

  const handleExportarReporte = async () => {
    try {
      if (activeTab === 'general' && reporteGeneral) {
        // Exportar Reporte General
        generarReporteGeneral(
          {
            ...reporteGeneral,
            fecha: format(new Date(), 'dd/MM/yyyy'),
          },
          config.companyName,
          config.currency
        )
        toast({
          title: 'Reporte Exportado',
          description: 'El reporte general se ha descargado exitosamente',
        })
      } else if (activeTab === 'clientes') {
        // Exportar Reporte por Cliente
        if (!clienteSeleccionado) {
          toast({
            title: 'Selecciona un Cliente',
            description: 'Por favor selecciona un cliente para exportar su reporte',
            variant: 'destructive',
          })
          return
        }

        const reporteClienteDetalle = reportesClientes.find(r => r.cliente_id === clienteSeleccionado)
        const clienteInfo = clientes.find(c => c.id === clienteSeleccionado)

        if (!reporteClienteDetalle || !clienteInfo) {
          toast({
            title: 'Error',
            description: 'No se encontró información del cliente',
            variant: 'destructive',
          })
          return
        }

        // Obtener préstamos del cliente
        const { data: prestamosCliente } = await supabase
          .from('prestamos')
          .select('*')
          .eq('cliente_id', clienteSeleccionado)

        // Obtener cuotas retrasadas del cliente
        const { data: cuotasRetrasadas } = await supabase
          .from('cuotas')
          .select('*')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .in('prestamo_id', prestamosCliente?.map(p => p.id) || [])
          .eq('estado', 'retrasada')

        generarReporteCliente(
          {
            cliente: {
              nombre: clienteInfo.nombre,
              dni: clienteInfo.dni,
            },
            total_prestado: reporteClienteDetalle.total_prestado,
            total_pagado: reporteClienteDetalle.total_pagado,
            total_pendiente: reporteClienteDetalle.total_pendiente,
            prestamos_activos: reporteClienteDetalle.prestamos_activos,
            cuotas_pendientes: reporteClienteDetalle.cuotas_pendientes,
            cuotas_retrasadas: cuotasRetrasadas?.length || 0,
            prestamos: prestamosCliente || [],
            fecha: format(new Date(), 'dd/MM/yyyy'),
          },
          config.companyName,
          config.currency
        )

        toast({
          title: 'Reporte Exportado',
          description: `El reporte de ${clienteInfo.nombre} se ha descargado exitosamente`,
        })
      }
    } catch (error) {
      console.error('Error al exportar reporte:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar el reporte',
        variant: 'destructive',
      })
    }
  }

  const reporteClienteDetalle = reportesClientes.find(r => r.cliente_id === clienteSeleccionado)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 mt-1">Análisis y estadísticas de tu negocio</p>
        </div>
        <Button onClick={handleExportarReporte}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Reporte General</TabsTrigger>
          <TabsTrigger value="clientes">Reporte por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : reporteGeneral ? (
            <>
              {/* Métricas Financieras */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Prestado
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reporteGeneral.totalPrestado, config.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Capital en circulación
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Recuperado
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(reporteGeneral.totalRecuperado, config.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pagos recibidos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pendiente
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(reporteGeneral.totalPendiente, config.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por cobrar
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ganancia Intereses
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(reporteGeneral.gananciaIntereses, config.currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Intereses generados
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas Operacionales */}
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas Operacionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Préstamos Activos</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reporteGeneral.prestamosActivos}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Préstamos Pagados</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reporteGeneral.prestamosPagados}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Cuotas Pendientes</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {reporteGeneral.cuotasPendientes}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Cuotas Retrasadas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reporteGeneral.cuotasRetrasadas}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de Cartera */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Cartera</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-600">Clientes Activos</span>
                      <span className="font-semibold">{reporteGeneral.clientesActivos}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-600">Tasa de Recuperación</span>
                      <span className="font-semibold text-green-600">
                        {reporteGeneral.totalPrestado > 0
                          ? ((reporteGeneral.totalRecuperado / (reporteGeneral.totalPrestado + reporteGeneral.gananciaIntereses)) * 100).toFixed(2)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Promedio por Préstamo</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          reporteGeneral.prestamosActivos + reporteGeneral.prestamosPagados > 0
                            ? reporteGeneral.totalPrestado / (reporteGeneral.prestamosActivos + reporteGeneral.prestamosPagados)
                            : 0,
                          config.currency
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="clientes" className="space-y-6">
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : (
            <>
              {/* Resumen General por Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportesClientes.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">
                      No hay datos de clientes disponibles
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>DNI</TableHead>
                          <TableHead>Total Prestado</TableHead>
                          <TableHead>Total Pagado</TableHead>
                          <TableHead>Total Pendiente</TableHead>
                          <TableHead>Préstamos Activos</TableHead>
                          <TableHead>Cuotas Pendientes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportesClientes.map((reporte) => (
                          <TableRow key={reporte.cliente_id}>
                            <TableCell className="font-medium">
                              {reporte.cliente_nombre}
                            </TableCell>
                            <TableCell>{reporte.cliente_dni}</TableCell>
                            <TableCell>{formatCurrency(reporte.total_prestado, config.currency)}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(reporte.total_pagado, config.currency)}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {formatCurrency(reporte.total_pendiente, config.currency)}
                            </TableCell>
                            <TableCell>{reporte.prestamos_activos}</TableCell>
                            <TableCell>{reporte.cuotas_pendientes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Detalle de Cliente Individual */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle por Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seleccionar Cliente</Label>
                    <Select
                      value={clienteSeleccionado}
                      onValueChange={setClienteSeleccionado}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre} - {cliente.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {reporteClienteDetalle && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total Prestado</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(reporteClienteDetalle.total_prestado, config.currency)}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Total Pagado</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(reporteClienteDetalle.total_pagado, config.currency)}
                        </p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Total Pendiente</p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatCurrency(reporteClienteDetalle.total_pendiente, config.currency)}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Préstamos Activos</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {reporteClienteDetalle.prestamos_activos}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Cuotas Pendientes</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {reporteClienteDetalle.cuotas_pendientes}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 font-medium">% Pagado</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {reporteClienteDetalle.total_prestado > 0
                            ? ((reporteClienteDetalle.total_pagado / (reporteClienteDetalle.total_prestado + reporteClienteDetalle.total_pendiente + reporteClienteDetalle.total_pagado)) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>
}

