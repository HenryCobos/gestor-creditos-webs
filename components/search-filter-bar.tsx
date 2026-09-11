"use client"

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import type { RutaFiltroOption } from '@/lib/load-rutas-filtro'
import { cn } from '@/lib/utils'

interface SearchFilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType?: 'prestamos' | 'cuotas' | 'clientes'
  estadoFilter?: string
  onEstadoFilterChange?: (value: string) => void
  fechaDesde?: string
  onFechaDesdeChange?: (value: string) => void
  fechaHasta?: string
  onFechaHastaChange?: (value: string) => void
  frecuenciaFilter?: string
  onFrecuenciaFilterChange?: (value: string) => void
  rutas?: RutaFiltroOption[]
  rutaFilter?: string
  onRutaFilterChange?: (value: string) => void
  showRutaFilter?: boolean
  allowSinRuta?: boolean
  allowTodasRutas?: boolean
  showEstadoChips?: boolean
  resultCount?: { filtered: number; total: number }
  onClearFilters?: () => void
}

const PRESTAMO_ESTADO_CHIPS = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'pagado', label: 'Pagados' },
  { value: 'retrasado', label: 'Retrasados' },
]

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  filterType = 'clientes',
  estadoFilter,
  onEstadoFilterChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  frecuenciaFilter,
  onFrecuenciaFilterChange,
  rutas = [],
  rutaFilter,
  onRutaFilterChange,
  showRutaFilter = false,
  allowSinRuta = false,
  allowTodasRutas = true,
  showEstadoChips = false,
  resultCount,
  onClearFilters,
}: SearchFilterBarProps) {
  const hasActiveFilters =
    (estadoFilter && estadoFilter !== 'todos') ||
    (rutaFilter && rutaFilter !== 'todos') ||
    (frecuenciaFilter && frecuenciaFilter !== 'todas') ||
    fechaDesde ||
    fechaHasta ||
    searchTerm

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder={
            filterType === 'clientes'
              ? 'Buscar por nombre, DNI, teléfono...'
              : filterType === 'prestamos'
              ? 'Buscar por cliente, monto...'
              : 'Buscar cuotas...'
          }
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {showEstadoChips && filterType === 'prestamos' && onEstadoFilterChange && (
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {PRESTAMO_ESTADO_CHIPS.map((chip) => (
            <Button
              key={chip.value}
              type="button"
              size="sm"
              variant={estadoFilter === chip.value ? 'default' : 'outline'}
              className="shrink-0 h-8 text-xs"
              onClick={() => onEstadoFilterChange(chip.value)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4">
        <div className="flex gap-3 overflow-x-auto pb-1 md:contents md:overflow-visible">
          {showRutaFilter && onRutaFilterChange && rutas.length > 0 && (
            <div className="space-y-2 min-w-[160px] shrink-0 md:min-w-0">
              <Label className="text-xs text-gray-600">Ruta</Label>
              <Select value={rutaFilter} onValueChange={onRutaFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {allowTodasRutas && <SelectItem value="todos">Todas las rutas</SelectItem>}
                  {allowSinRuta && <SelectItem value="sin_ruta">Sin ruta</SelectItem>}
                  {rutas.map((ruta) => (
                    <SelectItem key={ruta.id} value={ruta.id}>
                      {ruta.nombre_ruta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {onEstadoFilterChange && (
            <div
              className={cn(
                'space-y-2 min-w-[140px] shrink-0 md:min-w-0',
                showEstadoChips && 'hidden md:block'
              )}
            >
              <Label className="text-xs text-gray-600">Estado</Label>
              <Select value={estadoFilter} onValueChange={onEstadoFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filterType === 'prestamos' && (
                    <>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                      <SelectItem value="retrasado">Retrasado</SelectItem>
                    </>
                  )}
                  {filterType === 'cuotas' && (
                    <>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="retrasada">Retrasada</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === 'prestamos' && onFrecuenciaFilterChange && (
            <div className="space-y-2 min-w-[140px] shrink-0 md:min-w-0">
              <Label className="text-xs text-gray-600">Frecuencia</Label>
              <Select value={frecuenciaFilter} onValueChange={onFrecuenciaFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {onFechaDesdeChange && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => onFechaDesdeChange(e.target.value)}
            />
          </div>
        )}

        {onFechaHastaChange && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => onFechaHastaChange(e.target.value)}
            />
          </div>
        )}

        {hasActiveFilters && onClearFilters && (
          <div className="flex items-end">
            <Button variant="outline" onClick={onClearFilters} className="w-full">
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {resultCount && (
        <p className="text-xs text-muted-foreground">
          Mostrando {resultCount.filtered} de {resultCount.total}
        </p>
      )}
    </div>
  )
}
