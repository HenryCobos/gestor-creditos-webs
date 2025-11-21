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
    if (window.sidebar && window.sidebar.addPanel) {
      // Firefox
      window.sidebar.addPanel(document.title, window.location.href, '')
    } else if (window.external && ('AddFavorite' in window.external)) {
      // IE
      ;(window.external as any).AddFavorite(window.location.href, document.title)
    } else if (window.opera) {
      // Opera
      const a = document.createElement('a')
      a.setAttribute('href', window.location.href)
      a.setAttribute('title', document.title)
      a.setAttribute('rel', 'sidebar')
      a.click()
    } else {
      // Para navegadores modernos (Chrome, Safari, etc)
      toast({
        title: '📌 Cómo agregar a favoritos:',
        description: 'Presiona Ctrl+D (Windows) o Cmd+D (Mac) para agregar esta página a favoritos',
        duration: 8000,
      })
    }
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
          {/* Paso 1: Revisar Email */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 text-lg mb-1">
                  Paso 1: Revisa tu email
                </h3>
                <p className="text-blue-800 text-sm">
                  Te enviamos un correo de confirmación. Haz clic en el enlace para activar tu cuenta.
                  <br />
                  <span className="text-xs text-blue-600 italic">
                    Si no lo ves, revisa tu carpeta de spam
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Paso 2: Guarda esta URL - MUY IMPORTANTE */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Bookmark className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-lg mb-2">
                  Paso 2: ¡IMPORTANTE! Guarda este enlace
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
          <div className="pt-4">
            <Button
              onClick={handleGoToLogin}
              className="w-full text-lg py-6"
              size="lg"
            >
              Ir a Iniciar Sesión →
            </Button>
            <p className="text-center text-sm text-gray-500 mt-3">
              Después de activar tu cuenta por email, podrás iniciar sesión
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

