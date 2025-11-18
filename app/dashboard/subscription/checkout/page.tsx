'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Check, CreditCard } from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadPlans, upgradePlan } from '@/lib/subscription-helpers'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { plans, setPlans } = useSubscriptionStore()

  const planId = searchParams.get('plan')
  const period = searchParams.get('period') as 'monthly' | 'yearly' || 'monthly'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const plansData = await loadPlans()
    setPlans(plansData)
    setLoading(false)
  }

  const selectedPlan = plans.find(p => p.id === planId)
  const precio = period === 'monthly' ? selectedPlan?.precio_mensual : selectedPlan?.precio_anual

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  if (!selectedPlan) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Plan no encontrado</p>
        <Button onClick={() => router.push('/dashboard/subscription')}>
          Volver a Planes
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/subscription')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Suscripción</h1>
          <p className="text-gray-500 mt-1">Completa tu pago de forma segura</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumen del Plan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen de la Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{selectedPlan.nombre}</h3>
                <p className="text-sm text-gray-600">
                  Facturación {period === 'monthly' ? 'mensual' : 'anual'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${precio?.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  USD/{period === 'monthly' ? 'mes' : 'año'}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Características Incluidas:</h4>
              <ul className="space-y-2">
                {selectedPlan.limite_clientes === 0 ? (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Clientes ilimitados
                  </li>
                ) : (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Hasta {selectedPlan.limite_clientes} clientes
                  </li>
                )}
                {selectedPlan.limite_prestamos === 0 ? (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Préstamos ilimitados
                  </li>
                ) : (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Hasta {selectedPlan.limite_prestamos} préstamos
                  </li>
                )}
                {selectedPlan.caracteristicas.exportar_pdf && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Exportación PDF ilimitada
                  </li>
                )}
                {selectedPlan.caracteristicas.sin_marca_agua && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Sin marca de agua
                  </li>
                )}
                {selectedPlan.caracteristicas.recordatorios && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Recordatorios automáticos
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  Soporte {selectedPlan.caracteristicas.soporte}
                </li>
              </ul>
            </div>

            {period === 'yearly' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">
                  🎉 ¡Estás ahorrando ${(selectedPlan.precio_mensual * 12 - selectedPlan.precio_anual).toFixed(2)} USD al elegir pago anual!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Método de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Método de Pago
            </CardTitle>
            <CardDescription>
              Pago seguro procesado por PayPal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Procesando pago...</p>
              </div>
            ) : (
              <PayPalScriptProvider 
                options={{ 
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                  currency: "USD",
                  intent: "subscription",
                  vault: true,
                }}
              >
                <PayPalButtons
                  style={{ 
                    layout: "vertical",
                    color: "gold",
                    shape: "rect",
                    label: "subscribe",
                    height: 55
                  }}
                  forceReRender={[precio, selectedPlan.nombre, period]}
                  createSubscription={(data, actions) => {
                    // Obtener el Plan ID de PayPal según el período
                    const paypalPlanId = period === 'monthly' 
                      ? selectedPlan.caracteristicas?.paypal_plan_id_monthly 
                      : selectedPlan.caracteristicas?.paypal_plan_id_yearly
                    
                    if (!paypalPlanId) {
                      toast({
                        title: 'Error de Configuración',
                        description: 'Plan ID de PayPal no configurado. Contacta soporte.',
                        variant: 'destructive',
                      })
                      throw new Error('Plan ID not configured')
                    }

                    return actions.subscription.create({
                      plan_id: paypalPlanId,
                      application_context: {
                        shipping_preference: "NO_SHIPPING",
                        return_url: `${window.location.origin}/dashboard`,
                        cancel_url: `${window.location.origin}/dashboard/subscription`,
                      }
                    })
                  }}
                  onApprove={async (data, actions) => {
                    setProcessing(true)
                    
                    try {
                      // Guardar subscription_id de PayPal
                      const subscriptionId = data.subscriptionID || undefined
                      
                      const result = await upgradePlan(planId!, period, subscriptionId)
                      
                      if (result.success) {
                        toast({
                          title: '¡Suscripción Exitosa!',
                          description: `Has activado el plan ${selectedPlan.nombre}`,
                          duration: 5000,
                        })
                        
                        setTimeout(() => {
                          router.push('/dashboard')
                        }, 2000)
                      } else {
                        throw new Error(result.error)
                      }
                    } catch (error: any) {
                      toast({
                        title: 'Error al Activar Suscripción',
                        description: error?.message || 'No se pudo activar tu suscripción',
                        variant: 'destructive',
                      })
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  onCancel={() => {
                    toast({
                      title: 'Suscripción Cancelada',
                      description: 'Has cancelado el proceso de suscripción. Puedes intentarlo nuevamente cuando quieras.',
                    })
                  }}
                  onError={(err) => {
                    console.error('PayPal Error:', err)
                    toast({
                      title: 'Error de PayPal',
                      description: 'Hubo un problema al procesar la suscripción. Por favor intenta nuevamente.',
                      variant: 'destructive',
                    })
                  }}
                />
              </PayPalScriptProvider>
            )}

            <div className="mt-6 space-y-2 text-xs text-gray-500">
              <p>✓ Pago seguro con encriptación SSL</p>
              <p>✓ Garantía de devolución de 30 días</p>
              <p>✓ Cancela cuando quieras</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Cargando...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}

