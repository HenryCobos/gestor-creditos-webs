'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getHotmartCheckoutUrl } from '@/lib/hotmart'
import { planHasTrial } from '@/lib/plan-offers'
import { Gift } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Star,
  TrendingUp,
  Users,
  MessageSquareQuote,
} from 'lucide-react'

const TESTIMONIOS = [
  {
    nombre: 'Carlos M.',
    cargo: 'Prestamista, Bogotá',
    texto: 'Antes llevaba todo en Excel. Ahora con el Pro tengo 40 clientes y no se me escapa ningún cobro. El plan se paga en 2 días de trabajo.',
    estrellas: 5,
  },
  {
    nombre: 'Lorena P.',
    cargo: 'Microfinanzas, Medellín',
    texto: 'Lo que más me gustó fue la tranquilidad. El PDF sin marca de agua le da seriedad a mi negocio. Mis clientes confían más.',
    estrellas: 5,
  },
  {
    nombre: 'Ramón G.',
    cargo: 'Prestamista, Lima',
    texto: 'Pasé del plan gratuito al Pro cuando llegué al límite. No lo pensé dos veces. El ROI es inmediato.',
    estrellas: 5,
  },
]

const PLANES = [
  {
    slug: 'pro',
    nombre: 'Plan Pro',
    precio: 19,
    precioAnual: 190,
    color: 'blue',
    beneficios: [
      '50 clientes activos',
      '50 préstamos activos',
      'PDFs sin marca de agua',
      'Soporte prioritario',
      'Historial 90 días',
    ],
  },
  {
    slug: 'business',
    nombre: 'Plan Business',
    precio: 49,
    precioAnual: 490,
    color: 'purple',
    beneficios: [
      '200 clientes activos',
      '200 préstamos activos',
      'Multi-usuario (hasta 3)',
      'Gestión de rutas',
      'API de integración',
      'Soporte 24/7',
    ],
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [planSeleccionado, setPlanSeleccionado] = useState<'pro' | 'business'>('pro')
  const [periodo, setPeriodo] = useState<'monthly' | 'yearly'>('monthly')
  const [interesPromedio, setInteresPromedio] = useState<number>(30)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
    })
  }, [])

  const planActual = PLANES.find(p => p.slug === planSeleccionado)!
  const precio = periodo === 'monthly' ? planActual.precio : planActual.precioAnual
  const clientes = planSeleccionado === 'pro' ? 50 : 200
  const ingresosEstimados = interesPromedio * clientes
  const diasPayback = Math.ceil((planActual.precio / ingresosEstimados) * 30)
  const ahorroAnual = planActual.precio * 12 - planActual.precioAnual

  const handleContinuar = () => {
    if (!user) return
    const url = getHotmartCheckoutUrl(planSeleccionado, periodo, user.email, user.id, {
      useTrial: planHasTrial(planSeleccionado, periodo),
    })
    if (url) {
      window.location.href = url
    } else {
      router.push(`/dashboard/subscription/checkout?plan=${planSeleccionado}&period=${periodo}`)
    }
  }

  const hasTrial = planHasTrial(planSeleccionado, periodo)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Elige tu plan</h1>
        <p className="text-gray-500">Gestiona más, gana más. Ve al paso siguiente.</p>
      </div>

      {/* Toggle mensual/anual */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setPeriodo('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => setPeriodo('yearly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${periodo === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Anual
          {ahorroAnual > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${periodo === 'yearly' ? 'bg-white text-blue-600' : 'bg-green-100 text-green-700'}`}>
              -${ahorroAnual} USD
            </span>
          )}
        </button>
      </div>

      {/* Selección de plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANES.map((plan) => (
          <button
            key={plan.slug}
            type="button"
            onClick={() => setPlanSeleccionado(plan.slug as 'pro' | 'business')}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              planSeleccionado === plan.slug
                ? plan.color === 'blue'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">{plan.nombre}</p>
              {planSeleccionado === plan.slug && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${plan.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className={`text-2xl font-bold ${plan.color === 'blue' ? 'text-blue-700' : 'text-purple-700'}`}>
              ${periodo === 'monthly' ? plan.precio : plan.precioAnual}
              <span className="text-sm font-normal text-gray-500">/{periodo === 'monthly' ? 'mes' : 'año'}</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {plan.beneficios.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Calculadora ROI */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-900">Calculadora de ROI</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-blue-800 font-medium">
                ¿Cuánto cobras de interés por cliente al mes? ($)
              </Label>
              <Input
                type="number"
                min={1}
                value={interesPromedio}
                onChange={(e) => setInteresPromedio(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 bg-white border-blue-200"
              />
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-500">Clientes con {planActual.nombre}</p>
                <p className="font-bold text-blue-700 text-lg">{clientes} clientes</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Ingresos estimados</p>
              <p className="font-bold text-green-700 text-lg">${ingresosEstimados.toLocaleString()}/mes</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Costo del plan</p>
              <p className="font-bold text-gray-700 text-lg">${planActual.precio}/mes</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200 text-center bg-green-50">
              <p className="text-xs text-gray-500 mb-1">Payback</p>
              <p className="font-bold text-green-700 text-lg">{diasPayback} días</p>
            </div>
          </div>
          <p className="text-xs text-blue-700 text-center">
            El plan se paga solo en {diasPayback} día{diasPayback !== 1 ? 's' : ''}. Todo lo demás es ganancia neta.
          </p>
        </CardContent>
      </Card>

      {/* Testimonios */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700 text-sm">Lo que dicen nuestros usuarios Pro</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TESTIMONIOS.map((t) => (
            <div key={t.nombre} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: t.estrellas }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 italic mb-3">"{t.texto}"</p>
              <p className="text-xs font-semibold text-gray-900">{t.nombre}</p>
              <p className="text-xs text-gray-500">{t.cargo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Garantía + CTA final */}
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Garantía de devolución de 7 días</p>
            <p className="text-xs text-green-700 mt-0.5">
              Si por cualquier motivo no estás satisfecho, Hotmart te reembolsa el 100% en los primeros 7 días. Sin preguntas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
          <Users className="w-4 h-4" />
          <span>97% de usuarios Pro recuperan la inversión en la primera semana</span>
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200"
          onClick={handleContinuar}
        >
          {hasTrial ? (
            <>
              <Gift className="w-5 h-5 mr-2 inline" />
              Probar 7 días gratis en Hotmart →
            </>
          ) : (
            <>Continuar al pago seguro →</>
          )}
          <ArrowRight className="w-5 h-5 ml-2 inline" />
        </Button>
        {planSeleccionado === 'pro' && periodo === 'monthly' && (
          <p className="text-center text-xs text-gray-500">
            El Plan Pro mensual no incluye trial. Anual sí incluye 7 días gratis.
          </p>
        )}
        <p className="text-center text-xs text-gray-400">
          Serás redirigido al checkout oficial de Hotmart. Pago 100% seguro.
        </p>
      </div>
    </div>
  )
}
