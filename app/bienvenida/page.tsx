'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Bookmark, Mail, Copy, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function BienvenidaPage() {
  const [copied, setCopied] = useState(false)
  const [appUrl, setAppUrl] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setAppUrl(window.location.origin)
  }, [])

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl)
      setCopied(true)
      toast({
        title: '✅ URL Copiada',
        description: 'Puedes pegarla en un documento o notas',
      })
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar la URL',
        variant: 'destructive',
      })
    }
  }

  const handleAddToFavorites = () => {
    // Los métodos antiguos (sidebar, external) ya no funcionan en navegadores modernos
    // Mostrar instrucciones para todos los navegadores
    toast({
      title: '📌 Cómo agregar a favoritos:',
      description: 'Presiona Ctrl+D (Windows) o Cmd+D (Mac) para agregar esta página a favoritos',
      duration: 8000,
    })
  }

  const handleGoToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            ¡Cuenta Creada Exitosamente! 🎉
          </CardTitle>
          <p className="text-gray-600 text-lg">
            ¡Bienvenido a Gestor de Créditos!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Guarda esta URL - MUY IMPORTANTE */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Bookmark className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-lg mb-2">
                  ¡IMPORTANTE! Guarda este enlace
                </h3>
                <p className="text-amber-800 text-sm mb-3">
                  Para encontrar fácilmente la aplicación en el futuro:
                </p>
                
                {/* URL para copiar */}
                <div className="bg-white border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm text-gray-700 font-mono break-all">
                      {appUrl || 'Cargando...'}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUrl}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Botón para agregar a favoritos */}
                <Button
                  onClick={handleAddToFavorites}
                  variant="outline"
                  className="w-full mb-2 border-amber-300 hover:bg-amber-100"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Agregar a Favoritos
                </Button>

                <p className="text-xs text-amber-700 italic">
                  💡 También puedes presionar Ctrl+D (Windows) o Cmd+D (Mac) para guardar en favoritos
                </p>
              </div>
            </div>
          </div>

          {/* Beneficios del Plan Gratuito */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-green-900 text-lg mb-3">
              ✨ Tu Plan Gratuito Incluye:
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Hasta 5 clientes</span>
              </li>
              <li className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Hasta 5 préstamos activos</span>
              </li>
              <li className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Gestión completa de cuotas y pagos</span>
              </li>
              <li className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Reportes básicos</span>
              </li>
            </ul>
          </div>

          {/* Botón para continuar */}
          <div className="pt-4 space-y-3">
            <Button
              onClick={handleGoToLogin}
              className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              Iniciar Sesión Ahora →
            </Button>
            <p className="text-center text-sm text-gray-600">
              Tu cuenta está lista. Puedes empezar a usar la aplicación de inmediato 🚀
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

