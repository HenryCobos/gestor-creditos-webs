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
  onClearFilters?: () => void
}

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
  onClearFilters,
}: SearchFilterBarProps) {
  const hasActiveFilters = estadoFilter || fechaDesde || fechaHasta || frecuenciaFilter || searchTerm

  return (
    <div className="space-y-4">
      {/* Búsqueda Principal */}
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

      {/* Filtros Avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filtro de Estado */}
        {onEstadoFilterChange && (
          <div className="space-y-2">
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

        {/* Filtro de Frecuencia (solo para préstamos) */}
        {filterType === 'prestamos' && onFrecuenciaFilterChange && (
          <div className="space-y-2">
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

        {/* Fecha Desde */}
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

        {/* Fecha Hasta */}
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

        {/* Botón Limpiar Filtros */}
        {hasActiveFilters && onClearFilters && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

