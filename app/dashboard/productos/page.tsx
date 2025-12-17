'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react'
import { useStore, type Producto } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function ProductosPage() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const { productos, setProductos, addProducto, updateProducto, deleteProducto } = useStore()
  const { config } = useConfigStore()

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    descripcion: '',
    precio_contado: '',
    precio_credito: '',
    margen_credito: '',
    stock: '',
    stock_minimo: '',
    activo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data: productosData, error } = await supabase
      .from('productos')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre', { ascending: true })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        variant: 'destructive',
      })
    } else {
      setProductos(productosData || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const precioContado = parseFloat(formData.precio_contado)
    const precioCredito = formData.precio_credito ? parseFloat(formData.precio_credito) : null
    const margenCredito = formData.margen_credito ? parseFloat(formData.margen_credito) : null
    const stock = parseInt(formData.stock)
    const stockMinimo = parseInt(formData.stock_minimo || '0')

    const productoData = {
      user_id: user.id,
      codigo: formData.codigo || null,
      nombre: formData.nombre,
      categoria: formData.categoria || null,
      descripcion: formData.descripcion || null,
      precio_contado: precioContado,
      precio_credito: precioCredito,
      margen_credito: margenCredito,
      stock: stock,
      stock_minimo: stockMinimo,
      activo: formData.activo,
    }

    if (editingProducto) {
      // Actualizar producto existente
      const { data, error } = await supabase
        .from('productos')
        .update(productoData)
        .eq('id', editingProducto.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el producto',
          variant: 'destructive',
        })
      } else {
        updateProducto(editingProducto.id, data)
        toast({
          title: 'Éxito',
          description: 'Producto actualizado correctamente',
        })
        resetForm()
      }
    } else {
      // Crear nuevo producto
      const { data, error } = await supabase
        .from('productos')
        .insert([productoData])
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo crear el producto',
          variant: 'destructive',
        })
      } else {
        addProducto(data)
        toast({
          title: 'Éxito',
          description: 'Producto creado correctamente',
        })
        resetForm()
      }
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto)
    setFormData({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      categoria: producto.categoria || '',
      descripcion: producto.descripcion || '',
      precio_contado: producto.precio_contado.toString(),
      precio_credito: producto.precio_credito?.toString() || '',
      margen_credito: producto.margen_credito?.toString() || '',
      stock: producto.stock.toString(),
      stock_minimo: producto.stock_minimo?.toString() || '0',
      activo: producto.activo,
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive',
      })
    } else {
      deleteProducto(id)
      toast({
        title: 'Éxito',
        description: 'Producto eliminado correctamente',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      categoria: '',
      descripcion: '',
      precio_contado: '',
      precio_credito: '',
      margen_credito: '',
      stock: '',
      stock_minimo: '',
      activo: true,
    })
    setEditingProducto(null)
    setOpen(false)
  }

  // Calcular precio a crédito automáticamente si se ingresa el margen
  const calcularPrecioCredito = () => {
    if (formData.precio_contado && formData.margen_credito) {
      const precioBase = parseFloat(formData.precio_contado)
      const margen = parseFloat(formData.margen_credito)
      const precioCredito = precioBase * (1 + margen / 100)
      setFormData({ ...formData, precio_credito: precioCredito.toFixed(2) })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-500 mt-1">Gestiona tu inventario para ventas a crédito</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                Información del producto para ventas a crédito
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código/SKU</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo: e.target.value })
                    }
                    placeholder="Ej: MOT-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Producto *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoria: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motos">Motos</SelectItem>
                      <SelectItem value="muebles">Muebles</SelectItem>
                      <SelectItem value="electrodomesticos">Electrodomésticos</SelectItem>
                      <SelectItem value="electronica">Electrónica</SelectItem>
                      <SelectItem value="vehiculos">Vehículos</SelectItem>
                      <SelectItem value="herramientas">Herramientas</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    rows={2}
                    placeholder="Descripción detallada del producto..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_contado">Precio de Contado *</Label>
                  <Input
                    id="precio_contado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_contado}
                    onChange={(e) =>
                      setFormData({ ...formData, precio_contado: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margen_credito">Margen a Crédito (%)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="margen_credito"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.margen_credito}
                      onChange={(e) =>
                        setFormData({ ...formData, margen_credito: e.target.value })
                      }
                      placeholder="Ej: 15"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={calcularPrecioCredito}
                      disabled={!formData.precio_contado || !formData.margen_credito}
                    >
                      Calcular
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Porcentaje adicional sobre el precio de contado
                  </p>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="precio_credito">Precio a Crédito</Label>
                  <Input
                    id="precio_credito"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_credito}
                    onChange={(e) =>
                      setFormData({ ...formData, precio_credito: e.target.value })
                    }
                    placeholder="Se calcula automáticamente con el margen"
                  />
                  {formData.precio_contado && formData.precio_credito && (
                    <p className="text-xs text-green-700">
                      Ganancia: {formatCurrency(
                        parseFloat(formData.precio_credito) - parseFloat(formData.precio_contado),
                        config.currency
                      )} ({((parseFloat(formData.precio_credito) / parseFloat(formData.precio_contado) - 1) * 100).toFixed(2)}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Actual *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                  <Input
                    id="stock_minimo"
                    type="number"
                    min="0"
                    value={formData.stock_minimo}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_minimo: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Alerta cuando el stock sea menor a este valor
                  </p>
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="activo" className="cursor-pointer font-normal">
                    Producto activo (visible para ventas)
                  </Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProducto ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : productos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-gray-500 mt-2">
                No hay productos registrados aún
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Agrega productos para poder crear ventas a crédito
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio Contado</TableHead>
                  <TableHead>Precio Crédito</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-mono text-sm">
                      {producto.codigo || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p>{producto.nombre}</p>
                        {producto.descripcion && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {producto.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {producto.categoria ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {producto.categoria}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(producto.precio_contado, config.currency)}
                    </TableCell>
                    <TableCell>
                      {producto.precio_credito ? (
                        <div>
                          <p>{formatCurrency(producto.precio_credito, config.currency)}</p>
                          {producto.margen_credito && (
                            <p className="text-xs text-green-700">+{producto.margen_credito}%</p>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={
                          producto.stock <= (producto.stock_minimo || 0)
                            ? 'text-red-700 font-semibold'
                            : producto.stock <= (producto.stock_minimo || 0) * 2
                            ? 'text-orange-700 font-semibold'
                            : ''
                        }>
                          {producto.stock}
                        </span>
                        {producto.stock <= (producto.stock_minimo || 0) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={producto.activo ? 'default' : 'secondary'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(producto)}
                          title="Editar producto"
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(producto.id)}
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

