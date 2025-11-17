'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingUp, AlertCircle, CreditCard, Crown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DashboardCharts } from '@/components/dashboard-charts'
import { useConfigStore } from '@/lib/config-store'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadUserSubscription, loadUsageLimits } from '@/lib/subscription-helpers'
import Link from 'next/link'

interface Prestamo {
  id: string
  monto_prestado: number
  interes_porcentaje: number
  numero_cuotas: number
  estado: string
  frecuencia_pago: string
}

interface Cuota {
  id: string
  estado: string
  monto_pagado: number
}

export function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const { config } = useConfigStore()
  const { 
    getCurrentPlan, 
    usageLimits, 
    setUserSubscription, 
    setUsageLimits 
  } = useSubscriptionStore()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    loadSubscriptionData()
  }, [])
  
  const loadSubscriptionData = async () => {
    const [subscription, limits] = await Promise.all([
      loadUserSubscription(),
      loadUsageLimits(),
    ])
    if (subscription) setUserSubscription(subscription)
    if (limits) setUsageLimits(limits)
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener métricas
    const { data: prestamosData } = await supabase
      .from('prestamos')
      .select('*')
      .eq('user_id', user.id)

    const { data: clientesData } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)

    const { data: cuotasData } = await supabase
      .from('cuotas')
      .select('*')
      .eq('user_id', user.id)

    setPrestamos(prestamosData || [])
    setClientes(clientesData || [])
    setCuotas(cuotasData || [])
    setLoading(false)
  }

  // Calcular métricas
  const prestamosActivos = prestamos?.filter(p => p.estado === 'activo').length || 0
  const totalPrestado = prestamos?.reduce((sum, p) => sum + parseFloat(String(p.monto_prestado)), 0) || 0
  const totalRecuperado = cuotas?.filter(c => c.estado === 'pagada')
    .reduce((sum, c) => sum + parseFloat(String(c.monto_pagado)), 0) || 0
  const gananciaIntereses = prestamos?.reduce((sum, p) => {
    const interes = (parseFloat(String(p.monto_prestado)) * parseFloat(String(p.interes_porcentaje))) / 100
    return sum + interes
  }, 0) || 0
  const clientesActivos = clientes?.length || 0
  const cuotasRetrasadas = cuotas?.filter(c => c.estado === 'retrasada').length || 0

  // Préstamos recientes
  const prestamosRecientes = prestamos?.slice(0, 5) || []

  // Datos para gráficos
  const prestamosData = {
    activos: prestamosActivos,
    pagados: prestamos?.filter(p => p.estado === 'pagado').length || 0,
    retrasados: prestamos?.filter(p => p.estado === 'retrasado').length || 0,
  }

  // Datos de frecuencias
  const frecuenciasData = [
    { name: 'Diario', value: prestamos?.filter(p => p.frecuencia_pago === 'diario').length || 0 },
    { name: 'Semanal', value: prestamos?.filter(p => p.frecuencia_pago === 'semanal').length || 0 },
    { name: 'Quincenal', value: prestamos?.filter(p => p.frecuencia_pago === 'quincenal').length || 0 },
    { name: 'Mensual', value: prestamos?.filter(p => p.frecuencia_pago === 'mensual').length || 0 },
  ].filter(f => f.value > 0)

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Cargando...</p>
        </div>
      </div>
    )
  }

  const currentPlan = getCurrentPlan()
  
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Vista general de tu gestión de créditos
          </p>
        </div>
        {currentPlan && (
          <Link href="/dashboard/subscription">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              currentPlan.slug === 'free' 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : currentPlan.slug === 'pro'
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : currentPlan.slug === 'business'
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
            }`}>
              <Crown className="h-5 w-5" />
              <div>
                <p className="text-xs font-medium opacity-80">Plan Actual</p>
                <p className="font-bold">{currentPlan.nombre}</p>
              </div>
            </div>
          </Link>
        )}
      </div>
      
      {/* Indicador de uso del plan */}
      {usageLimits && currentPlan && currentPlan.slug !== 'enterprise' && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Clientes</span>
                  <span className="text-sm font-bold text-gray-900">
                    {usageLimits.clientes.current} / {usageLimits.clientes.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      usageLimits.clientes.current >= usageLimits.clientes.limit 
                        ? 'bg-red-500' 
                        : usageLimits.clientes.current / usageLimits.clientes.limit > 0.8
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((usageLimits.clientes.current / usageLimits.clientes.limit) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Préstamos Activos</span>
                  <span className="text-sm font-bold text-gray-900">
                    {usageLimits.prestamos.current} / {usageLimits.prestamos.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      usageLimits.prestamos.current >= usageLimits.prestamos.limit 
                        ? 'bg-red-500' 
                        : usageLimits.prestamos.current / usageLimits.prestamos.limit > 0.8
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((usageLimits.prestamos.current / usageLimits.prestamos.limit) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            {(!usageLimits.clientes.canAdd || !usageLimits.prestamos.canAdd) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ Has alcanzado el límite de tu plan. <Link href="/dashboard/subscription" className="font-semibold underline">Actualiza tu plan</Link> para continuar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Préstamos Activos
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prestamosActivos}</div>
            <p className="text-xs text-muted-foreground">
              préstamos en curso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Prestado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPrestado, config.currency)}</div>
            <p className="text-xs text-muted-foreground">
              capital en circulación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recuperado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecuperado, config.currency)}</div>
            <p className="text-xs text-muted-foreground">
              pagos recibidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ganancia por Intereses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(gananciaIntereses, config.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              intereses generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesActivos}</div>
            <p className="text-xs text-muted-foreground">
              clientes registrados
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
            <div className="text-2xl font-bold text-red-600">{cuotasRetrasadas}</div>
            <p className="text-xs text-muted-foreground">
              requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Préstamos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Préstamos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {prestamosRecientes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay préstamos registrados aún.
            </p>
          ) : (
            <div className="space-y-4">
              {prestamosRecientes.map((prestamo) => (
                <div
                  key={prestamo.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {formatCurrency(prestamo.monto_prestado, config.currency)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {prestamo.numero_cuotas} cuotas • {prestamo.interes_porcentaje}% interés
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        prestamo.estado === 'activo'
                          ? 'bg-blue-100 text-blue-800'
                          : prestamo.estado === 'pagado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {prestamo.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      {(prestamos && prestamos.length > 0) && (
        <DashboardCharts 
          prestamosData={prestamosData}
          frecuenciasData={frecuenciasData}
        />
      )}
    </div>
  )
}

