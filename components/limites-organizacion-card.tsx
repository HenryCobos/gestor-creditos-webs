'use client'

import type { LimitesOrganizacion } from '@/lib/limites-organizacion-shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Users,
  FileText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  limites: LimitesOrganizacion | null
  loading: boolean
  onRetry?: () => void
  onUpgradePro?: () => void
  upgradingPro?: boolean
}

function getUrgencyLevel(pct: number): 'low' | 'medium' | 'high' | 'critical' {
  if (pct >= 100) return 'critical'
  if (pct >= 90) return 'high'
  if (pct >= 80) return 'medium'
  return 'low'
}

function ProgressBar({ pct }: { pct: number }) {
  const urgency = getUrgencyLevel(pct)
  const barColor =
    urgency === 'critical' || urgency === 'high'
      ? 'bg-red-500'
      : urgency === 'medium'
      ? 'bg-yellow-500'
      : 'bg-blue-500'
  const bgColor =
    urgency === 'critical' || urgency === 'high'
      ? 'bg-red-100'
      : urgency === 'medium'
      ? 'bg-yellow-100'
      : 'bg-gray-200'

  return (
    <div className={`w-full ${bgColor} rounded-full h-2`}>
      <div
        className={`${barColor} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export function LimitesOrganizacionCard({
  limites,
  loading,
  onRetry,
  onUpgradePro,
  upgradingPro = false,
}: Props) {
  const router = useRouter()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plan de la Organización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando límites...</p>
        </CardContent>
      </Card>
    )
  }

  if (!limites) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plan de la Organización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar los límites del plan. Intenta de nuevo.
          </p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const pctClientes = limites.porcentaje_clientes
  const pctPrestamos = limites.porcentaje_prestamos
  const urgenciaClientes = getUrgencyLevel(pctClientes)
  const urgenciaPrestamos = getUrgencyLevel(pctPrestamos)
  const hayAlertaAlta = urgenciaClientes === 'high' || urgenciaClientes === 'critical' ||
    urgenciaPrestamos === 'high' || urgenciaPrestamos === 'critical'
  const hayAlertaMedia = urgenciaClientes === 'medium' || urgenciaPrestamos === 'medium'
  const cuposClientesRestantes = limites.limite_clientes - limites.clientes_usados

  return (
    <Card className={hayAlertaAlta ? 'border-red-300' : hayAlertaMedia ? 'border-yellow-300' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Plan: {limites.plan_nombre}
          </span>
          {(hayAlertaAlta || hayAlertaMedia) && (
            <Button
              size="sm"
              variant={hayAlertaAlta ? 'destructive' : 'outline'}
              className="text-xs h-7"
              onClick={() => router.push('/dashboard/subscription')}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Actualizar plan
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Alerta crítica / alta */}
        {hayAlertaAlta && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {urgenciaClientes === 'critical'
                ? `Límite de clientes alcanzado (${limites.clientes_usados}/${limites.limite_clientes}). No puedes agregar más.`
                : urgenciaClientes === 'high'
                ? `Solo te quedan ${cuposClientesRestantes} cupo${cuposClientesRestantes !== 1 ? 's' : ''} de clientes. Actualiza antes de quedarte sin espacio.`
                : `Has usado el ${pctPrestamos.toFixed(0)}% de tu límite de préstamos.`}{' '}
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="underline font-bold hover:no-underline"
              >
                Ver planes →
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta media (80-89%) */}
        {!hayAlertaAlta && hayAlertaMedia && (
          <Alert className="border-yellow-300 bg-yellow-50">
            <Zap className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {urgenciaClientes === 'medium'
                ? `Te quedan ${cuposClientesRestantes} cupos de clientes. Actualiza pronto para no interrumpir tu operación.`
                : `Vas al ${pctPrestamos.toFixed(0)}% de uso de préstamos.`}{' '}
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="underline font-semibold hover:no-underline text-yellow-900"
              >
                Ver planes
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Clientes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Clientes</span>
            </div>
            <span className="text-sm font-bold">
              {limites.clientes_usados} / {limites.limite_clientes}
            </span>
          </div>
          <ProgressBar pct={pctClientes} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{limites.clientes_disponibles} disponibles</span>
            <span>{pctClientes.toFixed(0)}% usado</span>
          </div>
          {/* Nudge suave 50-79% */}
          {urgenciaClientes === 'low' && pctClientes >= 50 && (
            <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Con Plan Pro tendrías 50 clientes — 10× más capacidad.
            </p>
          )}
        </div>

        {/* Préstamos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="font-medium">Préstamos</span>
            </div>
            <span className="text-sm font-bold">
              {limites.prestamos_usados} / {limites.limite_prestamos}
            </span>
          </div>
          <ProgressBar pct={pctPrestamos} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{limites.prestamos_disponibles} disponibles</span>
            <span>{pctPrestamos.toFixed(0)}% usado</span>
          </div>
          {urgenciaPrestamos === 'low' && pctPrestamos >= 50 && (
            <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Plan Pro incluye 50 préstamos activos simultáneos.
            </p>
          )}
        </div>

        {/* Estado general */}
        {limites.puede_crear_cliente && limites.puede_crear_prestamo ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Puedes crear clientes y préstamos</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {!limites.puede_crear_cliente && !limites.puede_crear_prestamo
                  ? 'Límite alcanzado para clientes y préstamos'
                  : !limites.puede_crear_cliente
                  ? 'Límite de clientes alcanzado'
                  : 'Límite de préstamos alcanzado'}
              </span>
            </div>
            {onUpgradePro && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                onClick={onUpgradePro}
                disabled={upgradingPro}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {upgradingPro ? 'Redirigiendo...' : 'Activar Pro — $19/mes'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
