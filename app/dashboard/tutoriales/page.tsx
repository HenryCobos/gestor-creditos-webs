'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, BookOpen, Clock, CheckCircle } from 'lucide-react'

interface Tutorial {
  id: number
  titulo: string
  descripcion: string
  videoId: string
  duracion: string
  categoria: string
}

const tutoriales: Tutorial[] = [
  {
    id: 1,
    titulo: 'Registrando un Cliente',
    descripcion: 'Aprende cómo agregar y gestionar clientes en el sistema de forma rápida y eficiente.',
    videoId: 'BH00mHpEJks',
    duracion: '5 min',
    categoria: 'Básico'
  },
  {
    id: 2,
    titulo: 'Registrando un Préstamo',
    descripcion: 'Descubre cómo crear préstamos, calcular intereses y generar cuotas automáticamente.',
    videoId: 'UbyH7fXrDGI',
    duracion: '7 min',
    categoria: 'Básico'
  },
  {
    id: 3,
    titulo: 'Área de Reportes y Exportación en PDF',
    descripcion: 'Genera reportes profesionales y exporta contratos y estados de cuenta en PDF.',
    videoId: 'wCKTyG10o2I',
    duracion: '6 min',
    categoria: 'Intermedio'
  },
  {
    id: 4,
    titulo: 'Configuración de la Moneda del Sistema',
    descripcion: 'Personaliza la moneda y otros ajustes del sistema según tu región y necesidades.',
    videoId: 'CsZyh9DCEcw',
    duracion: '4 min',
    categoria: 'Configuración'
  }
]

export default function TutorialesPage() {
  const [videoActivo, setVideoActivo] = useState<string>(tutoriales[0].videoId)
  const [tutorialSeleccionado, setTutorialSeleccionado] = useState<Tutorial>(tutoriales[0])

  const handleSeleccionarTutorial = (tutorial: Tutorial) => {
    setVideoActivo(tutorial.videoId)
    setTutorialSeleccionado(tutorial)
  }

  const getCategoriaColor = (categoria: string) => {
    const colores = {
      'Básico': 'bg-green-100 text-green-800',
      'Intermedio': 'bg-blue-100 text-blue-800',
      'Configuración': 'bg-purple-100 text-purple-800'
    }
    return colores[categoria as keyof typeof colores] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tutoriales</h1>
        <p className="text-gray-500 mt-1">
          Aprende a usar todas las funciones del sistema con nuestros video tutoriales
        </p>
      </div>

      {/* Banner Informativo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                ¡Bienvenido al Centro de Tutoriales!
              </h3>
              <p className="text-sm text-gray-600">
                Te recomendamos ver los tutoriales en orden para aprovechar al máximo el sistema.
                Cada video incluye ejemplos prácticos y consejos útiles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenedor Principal: Video + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Video Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {tutorialSeleccionado.titulo}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {tutorialSeleccionado.descripcion}
                  </CardDescription>
                </div>
                <Badge className={getCategoriaColor(tutorialSeleccionado.categoria)}>
                  {tutorialSeleccionado.categoria}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Reproductor de YouTube */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://www.youtube.com/embed/${videoActivo}?rel=0`}
                  title={tutorialSeleccionado.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Info del video */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Duración: {tutorialSeleccionado.duracion}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PlayCircle className="w-4 h-4" />
                  <span>Tutorial #{tutorialSeleccionado.id} de {tutoriales.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Tutoriales */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Todos los Tutoriales</CardTitle>
              <CardDescription>
                Haz clic para ver cada tutorial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tutoriales.map((tutorial) => (
                <button
                  key={tutorial.id}
                  onClick={() => handleSeleccionarTutorial(tutorial)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    tutorial.videoId === videoActivo
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tutorial.videoId === videoActivo
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tutorial.videoId === videoActivo ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-bold">{tutorial.id}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">
                        {tutorial.titulo}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getCategoriaColor(tutorial.categoria)}`}
                        >
                          {tutorial.categoria}
                        </Badge>
                        <span className="text-xs text-gray-500">{tutorial.duracion}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Card de Progreso */}
          <Card className="mt-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    ¿Necesitas más ayuda?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Si tienes dudas adicionales, contáctanos a través del soporte técnico.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

