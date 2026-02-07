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
  ruta_id?: string | null // NUEVO: Vincular préstamo con ruta
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
  ruta?: Ruta // NUEVO: Relación con ruta
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
  registrado_por?: string | null // NUEVO: Quién registró el pago
  fecha_registro?: string | null // NUEVO: Cuándo se registró el pago
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

// =====================================================
// NUEVAS INTERFACES: Sistema de Roles y Rutas
// =====================================================

export type UserRole = 'admin' | 'cobrador'

export interface Organization {
  id: string
  owner_id: string
  nombre_negocio: string
  descripcion: string | null
  created_at: string
  updated_at: string
}

export interface UserRoleAssignment {
  id: string
  user_id: string
  organization_id: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  organization_id: string | null
  role: UserRole | null
  nombre_completo: string | null
  foto_perfil_url: string | null
  activo: boolean
  ultimo_acceso: string | null
  full_name: string | null
  subscription_status: string | null
  created_at: string
  updated_at: string
}

export interface Ruta {
  id: string
  organization_id: string
  nombre_ruta: string
  descripcion: string | null
  cobrador_id: string | null
  capital_inicial: number
  capital_actual: number
  estado: 'activa' | 'inactiva'
  color: string | null
  created_at: string
  updated_at: string
  // Relaciones
  cobrador?: Profile
  clientes_count?: number
  prestamos_count?: number
}

export interface RutaCliente {
  id: string
  ruta_id: string
  cliente_id: string
  fecha_asignacion: string
  activo: boolean
  created_at: string
}

export type TipoMovimientoCapital = 
  | 'ingreso' 
  | 'retiro' 
  | 'transferencia_entrada' 
  | 'transferencia_salida'
  | 'prestamo_entregado'
  | 'pago_recibido'

export interface MovimientoCapitalRuta {
  id: string
  ruta_id: string
  tipo_movimiento: TipoMovimientoCapital
  monto: number
  saldo_anterior: number
  saldo_nuevo: number
  ruta_origen_id: string | null
  ruta_destino_id: string | null
  prestamo_id: string | null
  pago_id: string | null
  realizado_por: string
  concepto: string
  fecha_movimiento: string
  created_at: string
  // Relaciones
  ruta?: Ruta
  ruta_origen?: Ruta
  ruta_destino?: Ruta
  realizador?: Profile
}

export type CategoriaGasto = 'gasolina' | 'mantenimiento' | 'comida' | 'transporte' | 'otro'

export interface Gasto {
  id: string
  organization_id: string
  ruta_id: string | null
  cobrador_id: string
  categoria: CategoriaGasto
  monto: number
  descripcion: string
  fecha_gasto: string
  comprobante_url: string | null
  aprobado: boolean
  aprobado_por: string | null
  fecha_aprobacion: string | null
  notas_admin: string | null
  created_at: string
  updated_at: string
  // Relaciones
  cobrador?: Profile
  ruta?: Ruta
  aprobador?: Profile
}

export type EstadoArqueo = 'cuadrado' | 'sobrante' | 'faltante'

export interface ArqueoCaja {
  id: string
  organization_id: string
  ruta_id: string
  cobrador_id: string
  fecha_arqueo: string
  dinero_esperado: number
  dinero_reportado: number
  diferencia: number
  estado: EstadoArqueo
  notas: string | null
  revisado_por: string | null
  fecha_revision: string | null
  created_at: string
  updated_at: string
  // Relaciones
  ruta?: Ruta
  cobrador?: Profile
  revisor?: Profile
}

interface AppState {
  // Estados existentes
  clientes: Cliente[]
  prestamos: Prestamo[]
  cuotas: Cuota[]
  pagos: Pago[]
  productos: Producto[]
  
  // NUEVOS: Estados para sistema de rutas
  rutas: Ruta[]
  gastos: Gasto[]
  arqueos: ArqueoCaja[]
  movimientosCapital: MovimientoCapitalRuta[]
  usuarios: Profile[] // Lista de usuarios de la organización
  
  // Setters existentes
  setClientes: (clientes: Cliente[]) => void
  setPrestamos: (prestamos: Prestamo[]) => void
  setCuotas: (cuotas: Cuota[]) => void
  setPagos: (pagos: Pago[]) => void
  setProductos: (productos: Producto[]) => void
  
  // NUEVOS: Setters para rutas
  setRutas: (rutas: Ruta[]) => void
  setGastos: (gastos: Gasto[]) => void
  setArqueos: (arqueos: ArqueoCaja[]) => void
  setMovimientosCapital: (movimientos: MovimientoCapitalRuta[]) => void
  setUsuarios: (usuarios: Profile[]) => void
  
  // Acciones existentes
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
  
  // NUEVAS: Acciones para rutas
  addRuta: (ruta: Ruta) => void
  updateRuta: (id: string, ruta: Partial<Ruta>) => void
  deleteRuta: (id: string) => void
  addGasto: (gasto: Gasto) => void
  updateGasto: (id: string, gasto: Partial<Gasto>) => void
  deleteGasto: (id: string) => void
  addArqueo: (arqueo: ArqueoCaja) => void
  updateArqueo: (id: string, arqueo: Partial<ArqueoCaja>) => void
  addMovimientoCapital: (movimiento: MovimientoCapitalRuta) => void
}

export const useStore = create<AppState>((set) => ({
  // Estados iniciales existentes
  clientes: [],
  prestamos: [],
  cuotas: [],
  pagos: [],
  productos: [],
  
  // NUEVOS: Estados iniciales para rutas
  rutas: [],
  gastos: [],
  arqueos: [],
  movimientosCapital: [],
  usuarios: [],
  
  // Setters existentes
  setClientes: (clientes) => set({ clientes }),
  setPrestamos: (prestamos) => set({ prestamos }),
  setCuotas: (cuotas) => set({ cuotas }),
  setPagos: (pagos) => set({ pagos }),
  setProductos: (productos) => set({ productos }),
  
  // NUEVOS: Setters para rutas
  setRutas: (rutas) => set({ rutas }),
  setGastos: (gastos) => set({ gastos }),
  setArqueos: (arqueos) => set({ arqueos }),
  setMovimientosCapital: (movimientosCapital) => set({ movimientosCapital }),
  setUsuarios: (usuarios) => set({ usuarios }),
  
  // Acciones existentes
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
    
  // NUEVAS: Acciones para rutas
  addRuta: (ruta) =>
    set((state) => ({ rutas: [...state.rutas, ruta] })),
  updateRuta: (id, rutaUpdate) =>
    set((state) => ({
      rutas: state.rutas.map((r) =>
        r.id === id ? { ...r, ...rutaUpdate } : r
      ),
    })),
  deleteRuta: (id) =>
    set((state) => ({
      rutas: state.rutas.filter((r) => r.id !== id),
    })),
  addGasto: (gasto) =>
    set((state) => ({ gastos: [...state.gastos, gasto] })),
  updateGasto: (id, gastoUpdate) =>
    set((state) => ({
      gastos: state.gastos.map((g) =>
        g.id === id ? { ...g, ...gastoUpdate } : g
      ),
    })),
  deleteGasto: (id) =>
    set((state) => ({
      gastos: state.gastos.filter((g) => g.id !== id),
    })),
  addArqueo: (arqueo) =>
    set((state) => ({ arqueos: [...state.arqueos, arqueo] })),
  updateArqueo: (id, arqueoUpdate) =>
    set((state) => ({
      arqueos: state.arqueos.map((a) =>
        a.id === id ? { ...a, ...arqueoUpdate } : a
      ),
    })),
  addMovimientoCapital: (movimiento) =>
    set((state) => ({ 
      movimientosCapital: [...state.movimientosCapital, movimiento] 
    })),
}))

