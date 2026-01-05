'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useConfigStore } from '@/lib/config-store'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { uploadLogo, deleteLogo, validateLogoFile } from '@/lib/utils/logo-upload'
import { Palette, Building2, Image as ImageIcon, RotateCcw, DollarSign, Moon, Sun, Upload, X, Loader2 } from 'lucide-react'
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
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    companyName: config.companyName,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  })
  
  const [logoPreview, setLogoPreview] = useState<string | null>(config.companyLogo)
  const [logoUploading, setLogoUploading] = useState(false)

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
    updateConfig({
      ...formData,
      companyLogo: logoPreview || config.companyLogo,
    })
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
      setLogoPreview(null)
      toast({
        title: 'Configuración Restaurada',
        description: 'Se restauró la configuración por defecto',
      })
    }
  }

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar archivo
    const validation = validateLogoFile(file)
    if (!validation.valid) {
      toast({
        title: 'Error',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Subir logo
    setLogoUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado para subir el logo',
        variant: 'destructive',
      })
      setLogoUploading(false)
      return
    }

    const result = await uploadLogo(file, user.id)

    if (result.success && result.url) {
      updateConfig({ companyLogo: result.url })
      toast({
        title: 'Logo Subido',
        description: 'El logo se ha subido correctamente',
      })
    } else {
      toast({
        title: 'Error',
        description: result.error || 'No se pudo subir el logo',
        variant: 'destructive',
      })
      setLogoPreview(config.companyLogo)
    }

    setLogoUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLogoRemove = async () => {
    if (!config.companyLogo) return

    if (confirm('¿Estás seguro de eliminar el logo?')) {
      // Intentar eliminar del storage
      await deleteLogo(config.companyLogo)
      
      // Actualizar configuración
      updateConfig({ companyLogo: null })
      setLogoPreview(null)
      
      toast({
        title: 'Logo Eliminado',
        description: 'El logo se ha eliminado correctamente',
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

      {/* Configuración de Tema */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            <CardTitle>Tema de la Aplicación</CardTitle>
          </div>
          <CardDescription>
            Cambia entre tema claro, oscuro o sigue la preferencia de tu sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Modo de Tema</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Elige cómo quieres que se vea la aplicación
              </p>
            </div>
            <ThemeToggle />
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 border rounded-lg text-center space-y-2">
              <Sun className="h-8 w-8 mx-auto text-yellow-500" />
              <p className="font-medium">Claro</p>
              <p className="text-xs text-gray-500">Fondo blanco</p>
            </div>
            <div className="p-4 border rounded-lg text-center space-y-2 bg-gray-900 text-white">
              <Moon className="h-8 w-8 mx-auto text-blue-400" />
              <p className="font-medium">Oscuro</p>
              <p className="text-xs text-gray-400">Fondo oscuro</p>
            </div>
            <div className="p-4 border rounded-lg text-center space-y-2">
              <span className="text-2xl">💻</span>
              <p className="font-medium">Sistema</p>
              <p className="text-xs text-gray-500">Sigue tu sistema</p>
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

      {/* Logo de la Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <CardTitle>Logo de la Empresa</CardTitle>
          </div>
          <CardDescription>
            Sube el logo de tu empresa para personalizar el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vista Previa del Logo */}
          {logoPreview && (
            <div className="space-y-3">
              <Label>Vista Previa</Label>
              <div className="relative inline-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <img
                  src={logoPreview}
                  alt="Logo de la empresa"
                  className="max-h-32 max-w-full object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleLogoRemove}
                  disabled={logoUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Área de Subida */}
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Subir Logo</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
              <input
                ref={fileInputRef}
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
                disabled={logoUploading}
              />
              <div className="text-center space-y-3">
                {logoUploading ? (
                  <>
                    <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Subiendo logo...
                    </p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Haz clic para seleccionar un archivo o arrastra y suelta
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG, SVG o WebP (máx. 2MB)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Seleccionar Archivo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Información */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Recomendaciones:</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
              <li>Usa un logo con fondo transparente (PNG) para mejor resultado</li>
              <li>Dimensiones recomendadas: 200x200px o mayor</li>
              <li>El logo aparecerá en el header del dashboard</li>
            </ul>
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

