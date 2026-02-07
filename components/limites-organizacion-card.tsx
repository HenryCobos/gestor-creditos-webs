'use client'

import { useLimitesOrganizacion } from '@/lib/use-limites'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, Crown, Users, FileText } from 'lucide-react'

export function LimitesOrganizacionCard() {
  const { limites, loading, error } = useLimitesOrganizacion()

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
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !limites) {
    return null
  }

  const alertaNivelClientes = limites.porcentaje_clientes >= 90
  const alertaNivelPrestamos = limites.porcentaje_prestamos >= 90

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Plan: {limites.plan_nombre}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alertas */}
        {(alertaNivelClientes || alertaNivelPrestamos) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {alertaNivelClientes && alertaNivelPrestamos
                ? 'Alcanzaste el 90% del límite de clientes y préstamos'
                : alertaNivelClientes
                ? 'Alcanzaste el 90% del límite de clientes'
                : 'Alcanzaste el 90% del límite de préstamos'}
              . Considera actualizar tu plan.
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
          <Progress 
            value={limites.porcentaje_clientes} 
            className={
              limites.porcentaje_clientes >= 90 
                ? 'bg-red-200' 
                : limites.porcentaje_clientes >= 75 
                ? 'bg-yellow-200' 
                : ''
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{limites.clientes_disponibles} disponibles</span>
            <span>{limites.porcentaje_clientes.toFixed(0)}% usado</span>
          </div>
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
          <Progress 
            value={limites.porcentaje_prestamos}
            className={
              limites.porcentaje_prestamos >= 90 
                ? 'bg-red-200' 
                : limites.porcentaje_prestamos >= 75 
                ? 'bg-yellow-200' 
                : ''
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{limites.prestamos_disponibles} disponibles</span>
            <span>{limites.porcentaje_prestamos.toFixed(0)}% usado</span>
          </div>
        </div>

        {/* Estado */}
        {limites.puede_crear_cliente && limites.puede_crear_prestamo ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Puedes crear clientes y préstamos</span>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  )
}
