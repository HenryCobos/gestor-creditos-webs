"use client"

import { create } from 'zustand'

export interface Cliente {
  id: string
  user_id: string
  nombre: string
  dni: string
  telefono: string | null
  direccion: string | null
  cuenta_bancaria: string | null
  created_at: string
  updated_at: string
}

export type TipoPrestamo = 'amortizacion' | 'solo_intereses' | 'empeño' | 'venta_credito'

export interface Prestamo {
  id: string
  user_id: string
  cliente_id: string
  monto_prestado: number
  interes_porcentaje: number
  numero_cuotas: number
  fecha_inicio: string
  fecha_fin?: string | null
  estado: 'activo' | 'pagado' | 'retrasado'
  monto_total: number
  frecuencia_pago: 'diario' | 'semanal' | 'quincenal' | 'mensual'
  tipo_interes: 'simple' | 'compuesto'
  tipo_prestamo: TipoPrestamo
  tipo_calculo_interes?: 'por_periodo' | 'global'
  dias_gracia?: number | null
  excluir_domingos?: boolean
  // Campos nuevos para Ventas a Crédito
  precio_contado?: number | null
  enganche?: number | null
  cargos_adicionales?: number | null
  descripcion_producto?: string | null
  producto_id?: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
  garantias?: Garantia[]
  abonos_capital?: AbonoCapital[]
}

export interface Garantia {
  id: string
  user_id: string
  prestamo_id: string
  descripcion: string
  categoria: string | null
  valor_estimado: number | null
  foto_url: string | null
  fecha_vencimiento: string | null
  estado: 'activo' | 'liquidado' | 'renovado' | 'recuperado'
  fecha_liquidacion: string | null
  monto_liquidacion: number | null
  fecha_renovacion: string | null
  numero_renovaciones: number
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface Cuota {
  id: string
  user_id: string
  prestamo_id: string
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: 'pendiente' | 'pagada' | 'retrasada'
  monto_pagado: number
  created_at: string
  updated_at: string
}

export interface Pago {
  id: string
  user_id: string
  cuota_id: string
  prestamo_id: string
  monto_pagado: number
  fecha_pago: string
  metodo_pago: string | null
  notas: string | null
  created_at: string
}

export interface AbonoCapital {
  id: string
  user_id: string
  prestamo_id: string
  monto_abonado: number
  saldo_anterior: number
  saldo_nuevo: number
  interes_recalculado: number | null
  fecha_abono: string
  metodo_pago: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  user_id: string
  codigo: string | null
  nombre: string
  categoria: string | null
  descripcion: string | null
  precio_contado: number
  precio_credito: number | null
  margen_credito: number | null
  stock: number
  stock_minimo: number
  foto_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface RenovacionEmpeno {
  id: string
  user_id: string
  prestamo_id: string
  garantia_id: string | null
  fecha_renovacion: string
  monto_intereses_pagados: number
  nueva_fecha_vencimiento: string
  dias_extendidos: number
  notas: string | null
  created_at: string
}

interface AppState {
  clientes: Cliente[]
  prestamos: Prestamo[]
  cuotas: Cuota[]
  pagos: Pago[]
  productos: Producto[]
  setClientes: (clientes: Cliente[]) => void
  setPrestamos: (prestamos: Prestamo[]) => void
  setCuotas: (cuotas: Cuota[]) => void
  setPagos: (pagos: Pago[]) => void
  setProductos: (productos: Producto[]) => void
  addCliente: (cliente: Cliente) => void
  updateCliente: (id: string, cliente: Partial<Cliente>) => void
  deleteCliente: (id: string) => void
  addPrestamo: (prestamo: Prestamo) => void
  updatePrestamo: (id: string, prestamo: Partial<Prestamo>) => void
  deletePrestamo: (id: string) => void
  addCuota: (cuota: Cuota) => void
  updateCuota: (id: string, cuota: Partial<Cuota>) => void
  addProducto: (producto: Producto) => void
  updateProducto: (id: string, producto: Partial<Producto>) => void
  deleteProducto: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  clientes: [],
  prestamos: [],
  cuotas: [],
  pagos: [],
  productos: [],
  setClientes: (clientes) => set({ clientes }),
  setPrestamos: (prestamos) => set({ prestamos }),
  setCuotas: (cuotas) => set({ cuotas }),
  setPagos: (pagos) => set({ pagos }),
  setProductos: (productos) => set({ productos }),
  addCliente: (cliente) =>
    set((state) => ({ clientes: [...state.clientes, cliente] })),
  updateCliente: (id, clienteUpdate) =>
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id === id ? { ...c, ...clienteUpdate } : c
      ),
    })),
  deleteCliente: (id) =>
    set((state) => ({
      clientes: state.clientes.filter((c) => c.id !== id),
    })),
  addPrestamo: (prestamo) =>
    set((state) => ({ prestamos: [...state.prestamos, prestamo] })),
  updatePrestamo: (id, prestamoUpdate) =>
    set((state) => ({
      prestamos: state.prestamos.map((p) =>
        p.id === id ? { ...p, ...prestamoUpdate } : p
      ),
    })),
  deletePrestamo: (id) =>
    set((state) => ({
      prestamos: state.prestamos.filter((p) => p.id !== id),
    })),
  addCuota: (cuota) =>
    set((state) => ({ cuotas: [...state.cuotas, cuota] })),
  updateCuota: (id, cuotaUpdate) =>
    set((state) => ({
      cuotas: state.cuotas.map((c) =>
        c.id === id ? { ...c, ...cuotaUpdate } : c
      ),
    })),
  addProducto: (producto) =>
    set((state) => ({ productos: [...state.productos, producto] })),
  updateProducto: (id, productoUpdate) =>
    set((state) => ({
      productos: state.productos.map((p) =>
        p.id === id ? { ...p, ...productoUpdate } : p
      ),
    })),
  deleteProducto: (id) =>
    set((state) => ({
      productos: state.productos.filter((p) => p.id !== id),
    })),
}))

