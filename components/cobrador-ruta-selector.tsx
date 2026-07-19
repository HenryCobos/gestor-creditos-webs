'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin } from 'lucide-react'
import {
  cargarRutasDelCobrador,
  getRutaActivaCobrador,
  resolverRutaActivaCobrador,
  setRutaActivaCobrador,
  type RutaCobradorOption,
} from '@/lib/ruta-activa-cobrador'

interface CobradorRutaSelectorProps {
  userId: string
  /** compact: sidebar desktop; full: mobile sheet */
  variant?: 'compact' | 'full'
}

export function CobradorRutaSelector({
  userId,
  variant = 'compact',
}: CobradorRutaSelectorProps) {
  const supabase = createClient()
  const [rutas, setRutas] = useState<RutaCobradorOption[]>([])
  const [rutaActiva, setRutaActiva] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { rutaId, rutas: lista } = await resolverRutaActivaCobrador(supabase, userId)
    setRutas(lista)
    setRutaActiva(rutaId || '')
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cobrador_ruta_activa_id' && e.newValue) {
        setRutaActiva(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleChange = (value: string) => {
    setRutaActiva(value)
    setRutaActivaCobrador(value)
  }

  if (loading) {
    return null
  }

  if (rutas.length === 0) {
    return (
      <div
        className={
          variant === 'compact'
            ? 'mt-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'
            : 'mb-4 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'
        }
      >
        <p className="text-xs text-amber-800 dark:text-amber-200">
          No tienes rutas activas asignadas. Contacta al administrador.
        </p>
      </div>
    )
  }

  const rutaActual = rutas.find((r) => r.id === rutaActiva) || rutas[0]

  if (rutas.length === 1) {
    return (
      <div
        className={
          variant === 'compact'
            ? 'mt-3 px-3 py-2 rounded-lg border border-border bg-muted/40'
            : 'mb-4 px-3 py-2 rounded-lg border border-border bg-muted/40'
        }
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Ruta activa</p>
            <p className="text-sm font-medium truncate">{rutaActual.nombre_ruta}</p>
          </div>
          {rutaActual.color && (
            <span
              className="ml-auto h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: rutaActual.color }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={variant === 'compact' ? 'mt-3 space-y-1.5' : 'mb-4 space-y-1.5'}>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Ruta activa
      </Label>
      <Select value={rutaActiva || getRutaActivaCobrador() || rutas[0].id} onValueChange={handleChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Seleccionar ruta" />
        </SelectTrigger>
        <SelectContent>
          {rutas.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.nombre_ruta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
