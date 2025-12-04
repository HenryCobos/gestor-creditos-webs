'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ActivarPlanProPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const activarPlan = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/verify-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'pro',
          period: 'monthly'
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Error al activar plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Activar Plan Profesional</CardTitle>
          <CardDescription>
            Activa manualmente el plan Pro después de tu compra en Hotmart
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={activarPlan}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              'Activar Plan Pro'
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg border-2 ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? '¡Plan Activado!' : 'Error'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message || result.error}
                  </p>
                  {result.plan && (
                    <p className="text-xs text-green-600 mt-2">
                      Plan: {result.plan.nombre} ({result.plan.slug})
                    </p>
                  )}
                  {result.details && (
                    <p className="text-xs text-red-600 mt-2">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Esta página activa el plan Pro manualmente</p>
            <p>• Úsala solo si el webhook de Hotmart no funcionó</p>
            <p>• Después de activar, recarga tu dashboard</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

