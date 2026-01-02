'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useConfigStore } from '@/lib/config-store'
import { Palette, Building2, Image as ImageIcon, RotateCcw, DollarSign } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ConfiguracionPage() {
  const { config, updateConfig, resetConfig } = useConfigStore()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    companyName: config.companyName,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  })

  const currencies = [
    // Monedas Internacionales
    { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
    
    // América del Norte
    { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
    
    // América Central
    { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q' },
    { code: 'CRC', name: 'Colón Costarricense', symbol: '₡' },
    { code: 'PAB', name: 'Balboa Panameño', symbol: 'B/.' },
    { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$' },
    { code: 'HNL', name: 'Lempira Hondureño', symbol: 'L' },
    { code: 'DOP', name: 'Peso Dominicano', symbol: '$' },
    
    // América del Sur
    { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
    { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
    { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
    { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
    { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
    { code: 'UYU', name: 'Peso Uruguayo', symbol: '$' },
    { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲' },
    { code: 'BOB', name: 'Boliviano', symbol: 'Bs.' },
    { code: 'VES', name: 'Bolívar Venezolano', symbol: 'Bs.S.' },
  ]

  const handleSave = () => {
    updateConfig(formData)
    toast({
      title: 'Configuración Guardada',
      description: 'Los cambios se aplicarán en toda la aplicación',
    })
  }

  const handleReset = () => {
    if (confirm('¿Estás seguro de restaurar la configuración por defecto?')) {
      resetConfig()
      setFormData({
        companyName: 'Gestor de Créditos',
        primaryColor: '#3b82f6',
        accentColor: '#8b5cf6',
        currency: 'USD',
        currencySymbol: '$',
      })
      toast({
        title: 'Configuración Restaurada',
        description: 'Se restauró la configuración por defecto',
      })
    }
  }

  const colorPresets = [
    { name: 'Azul', primary: '#3b82f6', accent: '#8b5cf6' },
    { name: 'Verde', primary: '#10b981', accent: '#14b8a6' },
    { name: 'Rojo', primary: '#ef4444', accent: '#f97316' },
    { name: 'Púrpura', primary: '#8b5cf6', accent: '#a855f7' },
    { name: 'Rosa', primary: '#ec4899', accent: '#f43f5e' },
    { name: 'Naranja', primary: '#f97316', accent: '#fb923c' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Personaliza la apariencia de tu sistema</p>
      </div>

      {/* Información de la Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Información de la Empresa</CardTitle>
          </div>
          <CardDescription>
            Personaliza el nombre que aparece en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre de la Empresa</Label>
            <Input
              id="companyName"
              placeholder="Mi Empresa de Créditos"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <div className="bg-white p-4 rounded border">
              <h2 className="text-xl font-bold" style={{ color: formData.primaryColor }}>
                {formData.companyName || 'Nombre de tu empresa'}
              </h2>
              <p className="text-sm text-gray-600">Sistema de Gestión de Créditos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colores del Sistema */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Colores del Sistema</CardTitle>
          </div>
          <CardDescription>
            Personaliza los colores principales de la interfaz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets Rápidos */}
          <div className="space-y-3">
            <Label>Presets Rápidos</Label>
            <div className="grid grid-cols-3 gap-3">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      primaryColor: preset.primary,
                      accentColor: preset.accent,
                    })
                  }
                  className="flex items-center gap-3 p-3 border rounded-lg hover:border-gray-400 transition-colors"
                >
                  <div className="flex gap-1">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  <span className="text-sm font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Color Principal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Color de Acento</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData({ ...formData, accentColor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData({ ...formData, accentColor: e.target.value })
                  }
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
          </div>

          {/* Vista Previa de Colores */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <p className="text-sm text-gray-600 mb-2">Vista previa de elementos:</p>
            <div className="space-y-2">
              <button
                className="px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Botón Principal
              </button>
              <button
                className="px-4 py-2 rounded-md text-white font-medium ml-2"
                style={{ backgroundColor: formData.accentColor }}
              >
                Botón de Acento
              </button>
              <div className="flex gap-2 mt-2">
                <div
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Badge Principal
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: formData.accentColor }}
                >
                  Badge Acento
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Moneda */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Moneda del Sistema</CardTitle>
          </div>
          <CardDescription>
            Selecciona la moneda que se usará en toda la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => {
                const selectedCurrency = currencies.find(c => c.code === value)
                if (selectedCurrency) {
                  setFormData({
                    ...formData,
                    currency: value,
                    currencySymbol: selectedCurrency.symbol,
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Vista previa de montos:</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monto de Ejemplo:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: formData.currency,
                  }).format(1000)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Préstamo Grande:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: formData.currency,
                  }).format(50000)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo (Próximamente) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <CardTitle>Logo de la Empresa</CardTitle>
          </div>
          <CardDescription>
            Sube el logo de tu empresa (Próximamente)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              La función de subir logo estará disponible próximamente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar Valores por Defecto
        </Button>
        <Button onClick={handleSave} style={{ backgroundColor: formData.primaryColor }}>
          Guardar Configuración
        </Button>
      </div>
    </div>
  )
}

