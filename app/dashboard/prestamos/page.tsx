'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useStore, type Prestamo, type Cliente } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfigStore } from '@/lib/config-store'
import { PrestamoDetailDialog } from '@/components/prestamo-detail-dialog'
import { LimiteAlcanzadoDialog } from '@/components/limite-alcanzado-dialog'
import { PrestamoCardMobile } from '@/components/PrestamoCardMobile'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadOrganizationSubscription, loadOrganizationUsageLimits } from '@/lib/subscription-helpers'
import { getClientesInteligente, getPrestamosInteligente } from '@/lib/queries-con-roles'
import { 
  calculateLoanDetails, 
  calcularSiguienteFechaPago, 
  calcularNumeroCuotas,
  calcularTablaFrancesa,
  getNombreFrecuencia,
  type FrecuenciaPago,
  type TipoInteres,
  type TipoPrestamo,
  type TipoCalculoInteres
} from '@/lib/loan-calculations'
import { format, addMonths, addWeeks, addDays } from 'date-fns'
import type { Garantia } from '@/lib/store'

export default function PrestamosPage() {
  const [open, setOpen] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null)
  const [limiteDialogOpen, setLimiteDialogOpen] = useState(false)
  const [editingPrestamo, setEditingPrestamo] = useState<Prestamo | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const { clientes, setClientes, prestamos, setPrestamos, addPrestamo, updatePrestamo, deletePrestamo, productos, setProductos } = useStore()
  const { config } = useConfigStore()
  const { canAddPrestamo, setUserSubscription, setUsageLimits } = useSubscriptionStore()

  const [formData, setFormData] = useState({
    cliente_id: '',
    monto_prestado: '',
    interes_porcentaje: '',
    tipo_duracion: 'meses' as 'meses' | 'dias', // Tipo de duración
    numero_meses: '', // Duración en meses
    numero_dias: '', // Duración en días
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: '',
    frecuencia_pago: 'mensual' as FrecuenciaPago,
    tipo_interes: 'simple' as TipoInteres,
    tipo_prestamo: 'amortizacion' as TipoPrestamo,
    tipo_calculo_interes: 'por_periodo' as TipoCalculoInteres,
    excluir_domingos: false, // Nueva opción para excluir domingos del cronograma
    // Campos nuevos para Venta a Crédito
    producto_id: '',
    precio_contado: '',
    enganche: '',
    cargos_adicionales: '',
    descripcion_producto: '',
  })

  const [garantias, setGarantias] = useState<Array<{
    descripcion: string
    categoria: string
    valor_estimado: string
    fecha_vencimiento: string
    observaciones: string
  }>>([])

  const [calculatedDetails, setCalculatedDetails] = useState({
    interes: 0,
    montoTotal: 0,
    montoCuota: 0,
  })

  useEffect(() => {
    loadData()
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    const [subscription, limits] = await Promise.all([
      loadOrganizationSubscription(),
      loadOrganizationUsageLimits(),
    ])
    if (subscription) setUserSubscription(subscription)
    if (limits) setUsageLimits(limits)
  }

  useEffect(() => {
    // Calcular detalles del préstamo cuando cambian los valores
    const tieneMonto = formData.monto_prestado && !isNaN(parseFloat(formData.monto_prestado))
    const tieneInteres = formData.interes_porcentaje && !isNaN(parseFloat(formData.interes_porcentaje))
    const tieneDuracion = (formData.tipo_duracion === 'meses' && formData.numero_meses && !isNaN(parseFloat(formData.numero_meses))) ||
                          (formData.tipo_duracion === 'dias' && formData.numero_dias && !isNaN(parseFloat(formData.numero_dias)))
    
    if (tieneMonto && tieneInteres && tieneDuracion) {
      const monto = parseFloat(formData.monto_prestado)
      const interes = parseFloat(formData.interes_porcentaje)
      const meses = formData.tipo_duracion === 'meses' ? parseFloat(formData.numero_meses) : undefined
      const dias = formData.tipo_duracion === 'dias' ? parseFloat(formData.numero_dias) : undefined

      if (!isNaN(monto) && !isNaN(interes) && (meses !== undefined && meses > 0 || dias !== undefined && dias > 0)) {
        // Calcular número de cuotas basado en meses/días y frecuencia
        const numeroCuotas = calcularNumeroCuotas(meses, formData.frecuencia_pago, dias)
        
        const details = calculateLoanDetails({
          monto,
          interesPorcentaje: interes,
          numeroMeses: meses,
          numeroDias: dias,
          frecuenciaPago: formData.frecuencia_pago,
          tipoInteres: formData.tipo_interes,
          tipoPrestamo: formData.tipo_prestamo,
          tipoCalculoInteres: formData.tipo_calculo_interes,
        })
        setCalculatedDetails(details)
        
        // Calcular fecha_fin para modo solo intereses y empeño
        if ((formData.tipo_prestamo === 'solo_intereses' || formData.tipo_prestamo === 'empeño') && formData.fecha_inicio) {
          const [year, month, day] = formData.fecha_inicio.split('-').map(Number)
          const fechaInicio = new Date(year, month - 1, day)
          let fechaFin: Date
          
          if (formData.tipo_duracion === 'dias' && dias) {
            fechaFin = addDays(fechaInicio, dias)
          } else if (meses) {
            fechaFin = addMonths(fechaInicio, meses)
          } else {
            fechaFin = fechaInicio
          }
          
          setFormData(prev => ({
            ...prev,
            fecha_fin: format(fechaFin, 'yyyy-MM-dd')
          }))
        }
      }
    }
  }, [formData.monto_prestado, formData.interes_porcentaje, formData.numero_meses, formData.numero_dias, formData.tipo_duracion, formData.tipo_interes, formData.tipo_prestamo, formData.frecuencia_pago, formData.fecha_inicio, formData.tipo_calculo_interes])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Resolver rol real del usuario (prioriza user_roles dentro de organización)
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    let role: 'admin' | 'cobrador' = profile?.role === 'admin' ? 'admin' : 'cobrador'

    if (profile?.organization_id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      // En organizaciones, user_roles es fuente de verdad solo cuando existe.
      if (roleData?.role === 'admin' || roleData?.role === 'cobrador') {
        role = roleData.role
      }
    }

    setUserRole(role)

    try {
      // Cargar clientes usando función inteligente
      const clientesData = await getClientesInteligente()
      if (clientesData) {
        setClientes(clientesData)
      }

      // Cargar productos (para ventas a crédito) - query directa OK
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (productosData) {
        setProductos(productosData)
      }

      // Cargar préstamos usando función inteligente
      const prestamosData = await getPrestamosInteligente()
      
      // Enriquecer préstamos con datos del cliente
      if (prestamosData && clientesData) {
        const prestamosEnriquecidos = prestamosData.map(prestamo => ({
          ...prestamo,
          cliente: clientesData.find(c => c.id === prestamo.cliente_id)
        }))
        setPrestamos(prestamosEnriquecidos)
      } else {
        setPrestamos(prestamosData || [])
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleOpenDialog = () => {
    if (!canAddPrestamo()) {
      setLimiteDialogOpen(true)
      return
    }
    setEditingPrestamo(null)
    setOpen(true)
  }

  const handleEditPrestamo = async (prestamo: Prestamo) => {
    // Cargar garantías si es empeño
    let garantiasData: any[] = []
    if (prestamo.tipo_prestamo === 'empeño') {
      const { data } = await supabase
        .from('garantias')
        .select('*')
        .eq('prestamo_id', prestamo.id)
      garantiasData = data || []
    }

    // Determinar tipo de duración basado en fecha_fin o número de cuotas
    // Para simplificar, usaremos meses basado en número de cuotas y frecuencia
    const frecuencia = prestamo.frecuencia_pago || 'mensual'
    let tipoDuracion: 'meses' | 'dias' = 'meses'
    let numeroMeses = ''
    let numeroDias = ''

    // Calcular duración aproximada
    if (frecuencia === 'mensual') {
      tipoDuracion = 'meses'
      numeroMeses = prestamo.numero_cuotas.toString()
    } else if (frecuencia === 'semanal') {
      tipoDuracion = 'meses'
      numeroMeses = (prestamo.numero_cuotas / 4).toFixed(1)
    } else if (frecuencia === 'quincenal') {
      tipoDuracion = 'meses'
      numeroMeses = (prestamo.numero_cuotas / 2).toFixed(1)
    } else if (frecuencia === 'diario') {
      tipoDuracion = 'dias'
      numeroDias = prestamo.numero_cuotas.toString()
    }

    // Formatear fecha de inicio
    const fechaInicio = prestamo.fecha_inicio.split('T')[0] || format(new Date(), 'yyyy-MM-dd')
    const fechaFin = prestamo.fecha_fin ? prestamo.fecha_fin.split('T')[0] : ''

    setFormData({
      cliente_id: prestamo.cliente_id,
      monto_prestado: prestamo.monto_prestado.toString(),
      interes_porcentaje: prestamo.interes_porcentaje.toString(),
      tipo_duracion: tipoDuracion,
      numero_meses: numeroMeses,
      numero_dias: numeroDias,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      frecuencia_pago: prestamo.frecuencia_pago || 'mensual',
      tipo_interes: prestamo.tipo_interes || 'simple',
      tipo_prestamo: prestamo.tipo_prestamo || 'amortizacion',
      tipo_calculo_interes: prestamo.tipo_calculo_interes || 'por_periodo',
      excluir_domingos: prestamo.excluir_domingos || false,
      producto_id: prestamo.producto_id || '',
      precio_contado: prestamo.precio_contado?.toString() || '',
      enganche: prestamo.enganche?.toString() || '',
      cargos_adicionales: prestamo.cargos_adicionales?.toString() || '',
      descripcion_producto: prestamo.descripcion_producto || '',
    })

    // Cargar garantías en el formato del formulario
    if (garantiasData.length > 0) {
      setGarantias(garantiasData.map(g => ({
        descripcion: g.descripcion,
        categoria: g.categoria || '',
        valor_estimado: g.valor_estimado?.toString() || '',
        fecha_vencimiento: g.fecha_vencimiento ? g.fecha_vencimiento.split('T')[0] : '',
        observaciones: g.observaciones || '',
      })))
    } else {
      setGarantias([])
    }

    setEditingPrestamo(prestamo)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificar límite antes de crear (solo para nuevos préstamos)
    if (!editingPrestamo && !canAddPrestamo()) {
      setLimiteDialogOpen(true)
      setOpen(false)
      return
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Resolver ruta activa del cliente (si existe) para mantener capital por ruta consistente
    const { data: rutaClienteAsignada } = await supabase
      .from('ruta_clientes')
      .select('ruta_id')
      .eq('cliente_id', formData.cliente_id)
      .eq('activo', true)
      .order('fecha_asignacion', { ascending: false })
      .limit(1)
      .maybeSingle()

    const rutaAsignadaId =
      rutaClienteAsignada?.ruta_id ||
      editingPrestamo?.ruta_id ||
      null

    const monto = parseFloat(formData.monto_prestado)
    const interes = parseFloat(formData.interes_porcentaje)
    const meses = formData.tipo_duracion === 'meses' ? parseFloat(formData.numero_meses) : undefined
    const dias = formData.tipo_duracion === 'dias' ? parseFloat(formData.numero_dias) : undefined

    // Para préstamos abiertos la duración no es obligatoria
    if (formData.tipo_prestamo !== 'abierto') {
      if ((meses === undefined || isNaN(meses) || meses <= 0) && (dias === undefined || isNaN(dias) || dias <= 0)) {
        toast({
          title: 'Error de validación',
          description: `La duración en ${formData.tipo_duracion === 'meses' ? 'meses' : 'días'} debe ser mayor a 0`,
          variant: 'destructive',
        })
        return
      }
    }

    // Calcular número de cuotas basado en meses/días y frecuencia (0 para préstamos abiertos)
    const cuotas = formData.tipo_prestamo === 'abierto'
      ? 0
      : calcularNumeroCuotas(meses, formData.frecuencia_pago, dias)

    const { montoTotal, montoCuota } = calculateLoanDetails({
      monto,
      interesPorcentaje: interes,
      numeroMeses: meses,
      numeroDias: dias,
      frecuenciaPago: formData.frecuencia_pago,
      tipoInteres: formData.tipo_interes,
      tipoPrestamo: formData.tipo_prestamo,
      tipoCalculoInteres: formData.tipo_calculo_interes,
    })

    // Calcular fecha_fin si es modo solo intereses o empeño
    let fechaFin: string | null = null
    if (formData.tipo_prestamo === 'solo_intereses' || formData.tipo_prestamo === 'empeño') {
      const [year, month, day] = formData.fecha_inicio.split('-').map(Number)
      const fechaInicio = new Date(year, month - 1, day)
      let fechaFinDate: Date
      
      if (formData.tipo_duracion === 'dias' && dias) {
        fechaFinDate = addDays(fechaInicio, dias)
      } else if (meses) {
        fechaFinDate = addMonths(fechaInicio, meses)
      } else {
        fechaFinDate = fechaInicio
      }
      
      fechaFin = format(fechaFinDate, 'yyyy-MM-dd')
    }

    // Agregar hora al mediodía para evitar problemas de zona horaria
    const fechaInicioConHora = `${formData.fecha_inicio}T12:00:00`
    const fechaFinConHora = fechaFin ? `${fechaFin}T12:00:00` : null

    let prestamo: any
    let ultimoNumeroCuota = 0

    if (editingPrestamo) {
      // Actualizar préstamo existente
      const { data: updatedPrestamo, error: prestamoError } = await supabase
        .from('prestamos')
        .update({
          cliente_id: formData.cliente_id,
          ruta_id: rutaAsignadaId,
          monto_prestado: monto,
          interes_porcentaje: interes,
          numero_cuotas: cuotas,
          fecha_inicio: fechaInicioConHora,
          fecha_fin: fechaFinConHora,
          monto_total: montoTotal,
          frecuencia_pago: formData.frecuencia_pago,
          tipo_interes: formData.tipo_interes,
          tipo_prestamo: formData.tipo_prestamo,
          tipo_calculo_interes: formData.tipo_calculo_interes,
          excluir_domingos: formData.excluir_domingos,
          precio_contado: formData.tipo_prestamo === 'venta_credito' && formData.precio_contado ? parseFloat(formData.precio_contado) : null,
          enganche: formData.tipo_prestamo === 'venta_credito' && formData.enganche ? parseFloat(formData.enganche) : null,
          cargos_adicionales: formData.tipo_prestamo === 'venta_credito' && formData.cargos_adicionales ? parseFloat(formData.cargos_adicionales) : null,
          descripcion_producto: formData.tipo_prestamo === 'venta_credito' && formData.descripcion_producto ? formData.descripcion_producto : null,
        })
        .eq('id', editingPrestamo.id)
        .select(`
          *,
          cliente:clientes(*)
        `)
        .single()

      if (prestamoError) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el préstamo',
          variant: 'destructive',
        })
        return
      }

      prestamo = updatedPrestamo

      // Obtener todas las cuotas existentes con sus pagos
      const { data: cuotasExistentes } = await supabase
        .from('cuotas')
        .select('id, estado, monto_pagado, numero_cuota')
        .eq('prestamo_id', editingPrestamo.id)
        .order('numero_cuota', { ascending: true })

      // Identificar cuotas que no tienen pagos (monto_pagado === 0)
      // Estas son las que podemos eliminar y regenerar
      const cuotasSinPagos = cuotasExistentes?.filter(c => c.monto_pagado === 0) || []
      
      if (cuotasSinPagos.length > 0) {
        // Eliminar pagos asociados a estas cuotas primero (por si acaso)
        const cuotasIds = cuotasSinPagos.map(c => c.id)
        await supabase
          .from('pagos')
          .delete()
          .in('cuota_id', cuotasIds)

        // Eliminar las cuotas sin pagos
        await supabase
          .from('cuotas')
          .delete()
          .in('id', cuotasIds)
      }

      // Determinar el número de cuota desde donde empezar a crear nuevas
      // Si hay cuotas con pagos, empezar desde la siguiente a la última existente
      // Si no hay cuotas con pagos, empezar desde 1
      const cuotasConPagos = cuotasExistentes?.filter(c => c.monto_pagado > 0) || []
      ultimoNumeroCuota = cuotasConPagos.length > 0
        ? Math.max(...cuotasConPagos.map(c => c.numero_cuota))
        : 0

      // Validar que el nuevo número de cuotas no sea menor que las cuotas ya pagadas
      if (ultimoNumeroCuota > cuotas) {
        toast({
          title: 'Error',
          description: `No se puede reducir el número de cuotas a ${cuotas} porque ya hay ${ultimoNumeroCuota} cuota(s) con pagos registrados.`,
          variant: 'destructive',
        })
        return
      }
    } else {
      // Crear nuevo préstamo
      const { data: newPrestamo, error: prestamoError } = await supabase
        .from('prestamos')
        .insert([{
          user_id: user.id,
          cliente_id: formData.cliente_id,
          ruta_id: rutaAsignadaId,
          monto_prestado: monto,
          interes_porcentaje: interes,
          numero_cuotas: cuotas,
          fecha_inicio: fechaInicioConHora,
          fecha_fin: fechaFinConHora,
          monto_total: montoTotal,
          frecuencia_pago: formData.frecuencia_pago,
          tipo_interes: formData.tipo_interes,
          tipo_prestamo: formData.tipo_prestamo,
          tipo_calculo_interes: formData.tipo_calculo_interes,
          excluir_domingos: formData.excluir_domingos,
          precio_contado: formData.tipo_prestamo === 'venta_credito' && formData.precio_contado ? parseFloat(formData.precio_contado) : null,
          enganche: formData.tipo_prestamo === 'venta_credito' && formData.enganche ? parseFloat(formData.enganche) : null,
          cargos_adicionales: formData.tipo_prestamo === 'venta_credito' && formData.cargos_adicionales ? parseFloat(formData.cargos_adicionales) : null,
          descripcion_producto: formData.tipo_prestamo === 'venta_credito' && formData.descripcion_producto ? formData.descripcion_producto : null,
          estado: 'activo',
          capital_saldo: formData.tipo_prestamo === 'abierto' ? monto : null,
        }])
        .select(`
          *,
          cliente:clientes(*)
        `)
        .single()

      if (prestamoError) {
        toast({
          title: 'Error',
          description: 'No se pudo crear el préstamo',
          variant: 'destructive',
        })
        return
      }

      prestamo = newPrestamo
    }

    // Manejar garantías si es empeño
    if (formData.tipo_prestamo === 'empeño') {
      if (editingPrestamo) {
        // Eliminar garantías existentes y crear nuevas
        await supabase
          .from('garantias')
          .delete()
          .eq('prestamo_id', prestamo.id)
      }

      if (garantias.length > 0) {
        const garantiasToCreate = garantias
          .filter(g => g.descripcion.trim() !== '')
          .map(garantia => ({
            user_id: user.id,
            prestamo_id: prestamo.id,
            descripcion: garantia.descripcion,
            categoria: garantia.categoria || null,
            valor_estimado: garantia.valor_estimado ? parseFloat(garantia.valor_estimado) : null,
            fecha_vencimiento: garantia.fecha_vencimiento || null,
            observaciones: garantia.observaciones || null,
            estado: 'activo',
            numero_renovaciones: 0,
          }))

        if (garantiasToCreate.length > 0) {
          const { error: garantiasError } = await supabase
            .from('garantias')
            .insert(garantiasToCreate)

          if (garantiasError) {
            toast({
              title: 'Advertencia',
              description: editingPrestamo 
                ? 'Préstamo actualizado pero no se pudieron actualizar las garantías'
                : 'Préstamo creado pero no se pudieron crear las garantías',
              variant: 'destructive',
            })
          }
        }
      }
    }

    // Préstamo abierto: no genera cuotas fijas, solo guarda capital_saldo
    if (formData.tipo_prestamo === 'abierto') {
      await supabase
        .from('prestamos')
        .update({ capital_saldo: monto })
        .eq('id', prestamo.id)

      if (editingPrestamo) {
        updatePrestamo(prestamo.id, { ...prestamo, capital_saldo: monto })
        toast({ title: 'Éxito', description: 'Préstamo abierto actualizado correctamente.' })
      } else {
        addPrestamo({ ...prestamo, capital_saldo: monto })
        toast({ title: 'Éxito', description: 'Préstamo abierto creado. Los pagos se registrarán manualmente desde el detalle.' })
        loadSubscriptionData()
      }
      loadData()
      resetForm()
      return
    }

    // Para sistema francés: generar tabla de amortización completa
    const tablaFrancesa = formData.tipo_calculo_interes === 'frances'
      ? calcularTablaFrancesa(monto, interes, cuotas, formData.frecuencia_pago)
      : null

    // Crear cuotas automáticamente con la frecuencia seleccionada
    const cuotasToCreate = []
    // Parsear fecha localmente y ajustar para evitar desfase de zona horaria
    const [year, month, day] = formData.fecha_inicio.split('-').map(Number)
    // Crear fecha en UTC a partir de los componentes para evitar conversión a hora local que reste un día
    const fechaInicio = new Date(year, month - 1, day, 12, 0, 0) // Mediodía para evitar bordes de día

    // Array temporal para almacenar las fechas y detectar duplicados
    const fechasGeneradas: Date[] = []

    // Determinar desde qué cuota empezar (solo para edición)
    const inicioCuota = editingPrestamo && ultimoNumeroCuota > 0 
      ? ultimoNumeroCuota + 1 
      : 1

    // Para modo "solo intereses", cada cuota es solo el interés (excepto la última que incluye capital)
    // Para modo "amortización" o "empeño", cada cuota incluye capital + interés
    for (let i = inicioCuota; i <= cuotas; i++) {
      // Para la primera cuota, usar directamente la fecha de inicio para evitar problemas de zona horaria
      // Para las demás cuotas, calcular sumando períodos desde la fecha de inicio
      let fechaVencimiento: Date
      
      if (i === 1) {
        // Primera cuota: usa la fecha de inicio tal cual (sin conversiones)
        const [y, m, d] = formData.fecha_inicio.split('-').map(Number)
        fechaVencimiento = new Date(y, m - 1, d)
        
        // Si excluir domingos está activo, ajustar la primera cuota también
        if (formData.excluir_domingos && fechaVencimiento.getDay() === 0) {
          fechaVencimiento = addDays(fechaVencimiento, 1) // Mover al lunes
        }
      } else {
        // Cuotas 2 en adelante: calcular desde la ÚLTIMA fecha generada (no desde fechaInicio)
        // Esto evita duplicados cuando hay domingos en medio
        const ultimaFecha = fechasGeneradas[fechasGeneradas.length - 1]
        
        // Calcular la siguiente fecha según la frecuencia
        switch (formData.frecuencia_pago) {
          case 'diario':
            fechaVencimiento = addDays(ultimaFecha, 1)
            break
          case 'semanal':
            fechaVencimiento = addWeeks(ultimaFecha, 1)
            break
          case 'quincenal':
            fechaVencimiento = addWeeks(ultimaFecha, 2)
            break
          case 'mensual':
            fechaVencimiento = addMonths(ultimaFecha, 1)
            break
          default:
            fechaVencimiento = addMonths(ultimaFecha, 1)
        }
        
        // Si excluir domingos está activo, ajustar si cae en domingo
        if (formData.excluir_domingos && fechaVencimiento.getDay() === 0) {
          fechaVencimiento = addDays(fechaVencimiento, 1) // Mover al lunes
        }
      }

      // Verificar duplicados contra TODAS las fechas generadas (no solo la anterior)
      if (fechasGeneradas.length > 0) {
        const fechaVencimientoStr = format(fechaVencimiento, 'yyyy-MM-dd')
        
        // Verificar si esta fecha ya existe en el array
        let esDuplicado = fechasGeneradas.some(fecha => 
          format(fecha, 'yyyy-MM-dd') === fechaVencimientoStr
        )
        
        // Si hay duplicado, avanzar días hasta encontrar una fecha única
        while (esDuplicado) {
          fechaVencimiento = addDays(fechaVencimiento, 1)
          
          // Si excluir domingos está activo y el nuevo día es domingo, mover al lunes
          if (formData.excluir_domingos && fechaVencimiento.getDay() === 0) {
            fechaVencimiento = addDays(fechaVencimiento, 1)
          }
          
          // Verificar nuevamente si es duplicado
          const nuevaFechaStr = format(fechaVencimiento, 'yyyy-MM-dd')
          esDuplicado = fechasGeneradas.some(fecha => 
            format(fecha, 'yyyy-MM-dd') === nuevaFechaStr
          )
        }
      }

      // Guardar la fecha generada para comparación
      fechasGeneradas.push(fechaVencimiento)
      
      // Última cuota en modo "solo intereses" incluye el capital
      const esUltimaCuota = i === cuotas
      let montoCuotaFinal = montoCuota
      
      if (formData.tipo_prestamo === 'solo_intereses' && esUltimaCuota) {
        // Última cuota: interés + capital
        montoCuotaFinal = montoCuota + monto
      }

      // Convertir a string y agregar hora al mediodía para evitar problemas de zona horaria
      const fechaVencimientoString = format(fechaVencimiento, 'yyyy-MM-dd')
      const fechaVencimientoConHora = `${fechaVencimientoString}T12:00:00`
      
      // Para sistema francés: usar los valores de la tabla de amortización
      const filaFrancesa = tablaFrancesa ? tablaFrancesa[i - 1] : null
      const montoCuotaReal = filaFrancesa ? filaFrancesa.cuota : montoCuotaFinal

      cuotasToCreate.push({
        user_id: user.id,
        prestamo_id: prestamo.id,
        numero_cuota: i,
        monto_cuota: montoCuotaReal,
        monto_interes: filaFrancesa ? filaFrancesa.interes : null,
        monto_capital: filaFrancesa ? filaFrancesa.capital : null,
        fecha_vencimiento: fechaVencimientoConHora,
        estado: 'pendiente',
        monto_pagado: 0,
      })
    }

    const { error: cuotasError } = await supabase
      .from('cuotas')
      .insert(cuotasToCreate)

    if (cuotasError) {
      toast({
        title: 'Error',
        description: 'No se pudieron crear las cuotas',
        variant: 'destructive',
      })
      // Eliminar el préstamo si falló la creación de cuotas
      await supabase.from('prestamos').delete().eq('id', prestamo.id)
      return
    }

    // Decrementar stock si es venta a crédito con producto del catálogo
    if (formData.tipo_prestamo === 'venta_credito' && formData.producto_id && formData.producto_id !== '') {
      const producto = productos.find(p => p.id === formData.producto_id)
      if (producto && producto.stock > 0) {
        const { error: stockError } = await supabase
          .from('productos')
          .update({ stock: producto.stock - 1 })
          .eq('id', formData.producto_id)

        if (stockError) {
          console.error('Error actualizando stock:', stockError)
          toast({
            title: 'Advertencia',
            description: 'Préstamo creado pero no se pudo actualizar el stock del producto',
            variant: 'destructive',
          })
        }
      }
    }

    if (editingPrestamo) {
      updatePrestamo(prestamo.id, prestamo)
      toast({
        title: 'Éxito',
        description: `Préstamo actualizado correctamente. El cronograma de cuotas ha sido regenerado.`,
      })
    } else {
      addPrestamo(prestamo)
      const duracionTexto = formData.tipo_duracion === 'meses' && meses
        ? `${meses} mes${meses > 1 ? 'es' : ''}`
        : formData.tipo_duracion === 'dias' && dias
        ? `${dias} día${dias > 1 ? 's' : ''}`
        : ''
      
      toast({
        title: 'Éxito',
        description: `Préstamo creado con ${cuotas} cuotas ${getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}${cuotas > 1 ? 'es' : ''} ${duracionTexto ? `(${duracionTexto})` : ''}`,
      })
    }
    
    // Recargar límites y productos después de agregar
    if (!editingPrestamo) {
      loadSubscriptionData()
    }
    loadData() // Recargar también los productos para actualizar stock
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') {
      toast({
        title: 'Sin permisos',
        description: 'Solo el administrador puede eliminar préstamos.',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('¿Estás seguro de eliminar este préstamo? Se eliminarán también sus cuotas.')) return

    const { error, count } = await supabase
      .from('prestamos')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el préstamo',
        variant: 'destructive',
      })
    } else if (!count || count === 0) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para eliminar este préstamo.',
        variant: 'destructive',
      })
    } else {
      deletePrestamo(id)
      toast({
        title: 'Éxito',
        description: 'Préstamo eliminado correctamente',
      })
      // Recalcular límites de la organización después de eliminar
      await loadSubscriptionData()
    }
  }

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      monto_prestado: '',
      interes_porcentaje: '',
      tipo_duracion: 'meses',
      numero_meses: '',
      numero_dias: '',
      fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
      fecha_fin: '',
      frecuencia_pago: 'mensual',
      tipo_interes: 'simple',
      tipo_prestamo: 'amortizacion',
      tipo_calculo_interes: 'por_periodo',
      excluir_domingos: false,
      // Campos de venta a crédito
      producto_id: '',
      precio_contado: '',
      enganche: '',
      cargos_adicionales: '',
      descripcion_producto: '',
    })
    setGarantias([])
    setCalculatedDetails({
      interes: 0,
      montoTotal: 0,
      montoCuota: 0,
    })
    setEditingPrestamo(null)
    setOpen(false)
  }

  const addGarantia = () => {
    setGarantias([...garantias, {
      descripcion: '',
      categoria: '',
      valor_estimado: '',
      fecha_vencimiento: '',
      observaciones: '',
    }])
  }

  const removeGarantia = (index: number) => {
    setGarantias(garantias.filter((_, i) => i !== index))
  }

  const updateGarantia = (index: number, field: string, value: string) => {
    const updated = [...garantias]
    updated[index] = { ...updated[index], [field]: value }
    setGarantias(updated)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Gestiona los créditos otorgados</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button disabled={clientes.length === 0} onClick={handleOpenDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Préstamo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
              <DialogTitle>{editingPrestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}</DialogTitle>
              <DialogDescription>
                {editingPrestamo 
                  ? 'Actualiza los datos del préstamo. Las cuotas pendientes se regenerarán automáticamente.'
                  : 'Las cuotas se calcularán y crearán automáticamente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar min-h-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="tipo_prestamo">Tipo de Préstamo *</Label>
                  <Select
                    value={formData.tipo_prestamo}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo_prestamo: value as TipoPrestamo })
                      if (value !== 'empeño') {
                        setGarantias([])
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amortizacion">💰 Amortización (Capital + Interés)</SelectItem>
                      <SelectItem value="solo_intereses">📊 Solo Intereses (Capital al final)</SelectItem>
                      <SelectItem value="empeño">💎 Empeño (Con garantías)</SelectItem>
                      <SelectItem value="venta_credito">🛍️ Venta a Crédito (Con enganche)</SelectItem>
                      <SelectItem value="abierto">🔓 Préstamo Abierto (Sin cuotas fijas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cliente_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos específicos para Venta a Crédito */}
                {formData.tipo_prestamo === 'venta_credito' && (
                  <>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="producto_id">Seleccionar Producto *</Label>
                      <Select
                        value={formData.producto_id}
                        onValueChange={(value) => {
                          if (value === 'otro') {
                            setFormData({
                              ...formData,
                              producto_id: '',
                              descripcion_producto: '',
                              precio_contado: '',
                              monto_prestado: ''
                            })
                          } else {
                            const producto = productos.find(p => p.id === value)
                            if (producto) {
                              const enganche = parseFloat(formData.enganche) || 0
                              const montoFinanciar = producto.precio_contado - enganche
                              setFormData({
                                ...formData,
                                producto_id: value,
                                descripcion_producto: producto.nombre + (producto.descripcion ? ` - ${producto.descripcion}` : ''),
                                precio_contado: producto.precio_contado.toString(),
                                monto_prestado: montoFinanciar > 0 ? montoFinanciar.toString() : ''
                              })
                            }
                          }
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar del catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="otro">➕ Otro (producto no catalogado)</SelectItem>
                          {productos.filter(p => p.stock > 0).map((producto) => (
                            <SelectItem key={producto.id} value={producto.id}>
                              {producto.nombre} - {formatCurrency(producto.precio_contado, config.currency)} (Stock: {producto.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Selecciona del catálogo o elige "Otro" para productos no catalogados
                      </p>
                    </div>

                    {formData.producto_id === '' && formData.tipo_prestamo === 'venta_credito' && (
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="descripcion_producto">Descripción del Producto/Servicio *</Label>
                        <Input
                          id="descripcion_producto"
                          value={formData.descripcion_producto}
                          onChange={(e) =>
                            setFormData({ ...formData, descripcion_producto: e.target.value })
                          }
                          placeholder="Ej: Moto Honda XR 150, Sala 3 piezas..."
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="precio_contado">Precio de Contado *</Label>
                      <Input
                        id="precio_contado"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.precio_contado}
                        onChange={(e) => {
                          const precioContado = parseFloat(e.target.value) || 0
                          const enganche = parseFloat(formData.enganche) || 0
                          const montoFinanciar = precioContado - enganche
                          setFormData({ 
                            ...formData, 
                            precio_contado: e.target.value,
                            monto_prestado: montoFinanciar > 0 ? montoFinanciar.toString() : ''
                          })
                        }}
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Precio original del producto al contado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enganche">Enganche/Cuota Inicial *</Label>
                      <Input
                        id="enganche"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.enganche}
                        onChange={(e) => {
                          const precioContado = parseFloat(formData.precio_contado) || 0
                          const enganche = parseFloat(e.target.value) || 0
                          const montoFinanciar = precioContado - enganche
                          setFormData({ 
                            ...formData, 
                            enganche: e.target.value,
                            monto_prestado: montoFinanciar > 0 ? montoFinanciar.toString() : ''
                          })
                        }}
                        required
                      />
                      {formData.precio_contado && formData.enganche && (
                        <p className="text-xs text-green-700">
                          {((parseFloat(formData.enganche) / parseFloat(formData.precio_contado)) * 100).toFixed(1)}% del precio total
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="cargos_adicionales">Cargos Adicionales (Seguro, Comisiones, etc.)</Label>
                      <Input
                        id="cargos_adicionales"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cargos_adicionales}
                        onChange={(e) =>
                          setFormData({ ...formData, cargos_adicionales: e.target.value })
                        }
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">
                        Costos adicionales que se suman al monto a financiar
                      </p>
                    </div>

                    {formData.precio_contado && formData.enganche && (
                      <div className="col-span-2 bg-blue-50 p-3 rounded-lg space-y-1">
                        <p className="text-sm text-blue-900 font-medium">Cálculo de Financiamiento:</p>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p>Precio de contado: {formatCurrency(parseFloat(formData.precio_contado), config.currency)}</p>
                          <p>Enganche: -{formatCurrency(parseFloat(formData.enganche), config.currency)}</p>
                          {formData.cargos_adicionales && parseFloat(formData.cargos_adicionales) > 0 && (
                            <p>Cargos adicionales: +{formatCurrency(parseFloat(formData.cargos_adicionales), config.currency)}</p>
                          )}
                          <p className="font-semibold pt-1 border-t border-blue-200">
                            Monto a financiar: {formatCurrency(parseFloat(formData.monto_prestado || '0'), config.currency)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Campo de Monto Prestado (oculto para venta_credito, calculado automáticamente) */}
                {formData.tipo_prestamo !== 'venta_credito' && (
                  <div className="space-y-2">
                    <Label htmlFor="monto_prestado">Monto Prestado *</Label>
                    <Input
                      id="monto_prestado"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monto_prestado}
                      onChange={(e) =>
                        setFormData({ ...formData, monto_prestado: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {/* Tipo de cálculo solo aplica para Amortización */}
                {formData.tipo_prestamo === 'amortizacion' && (
                <div className="space-y-2">
                  <Label htmlFor="tipo_calculo_interes">Tipo de Cálculo de Interés *</Label>
                  <Select
                    value={formData.tipo_calculo_interes}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo_calculo_interes: value as TipoCalculoInteres })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="por_periodo">Por Mes (interés mensual × meses)</SelectItem>
                      <SelectItem value="global">Global (interés fijo sobre el total)</SelectItem>
                      <SelectItem value="frances">Sistema Francés (saldo decreciente)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.tipo_calculo_interes === 'global'
                      ? 'El interés se aplica una sola vez sobre el capital total'
                      : formData.tipo_calculo_interes === 'frances'
                      ? 'Cuota constante; el interés se calcula sobre el saldo restante y decrece cada período'
                      : 'El interés mensual se multiplica por el número de meses'}
                  </p>
                </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="interes_porcentaje">
                    {formData.tipo_calculo_interes === 'global' 
                      ? 'Interés Global (%) *'
                      : 'Interés Mensual (%) *'}
                  </Label>
                  <Input
                    id="interes_porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.interes_porcentaje}
                    onChange={(e) =>
                      setFormData({ ...formData, interes_porcentaje: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {formData.tipo_calculo_interes === 'global' 
                      ? `Interés fijo del ${formData.interes_porcentaje || 'X'}% sobre el capital total (independiente del tiempo). Se divide en ${formData.tipo_duracion === 'meses' ? (formData.numero_meses ? calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago) : 'N') : (formData.numero_dias ? calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias)) : 'N')} cuotas ${getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}${(formData.tipo_duracion === 'meses' && formData.numero_meses ? (calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago) > 1 ? 'es' : '') : (formData.tipo_duracion === 'dias' && formData.numero_dias ? (calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias)) > 1 ? 'es' : '') : ''))}`
                      : `Interés MENSUAL que se multiplicará por ${formData.tipo_duracion === 'meses' ? (formData.numero_meses || 'N') : (formData.numero_dias ? (parseFloat(formData.numero_dias) / 30).toFixed(1) : 'N')} mes${(formData.tipo_duracion === 'meses' && formData.numero_meses && parseFloat(formData.numero_meses) > 1) || (formData.tipo_duracion === 'dias' && formData.numero_dias && parseFloat(formData.numero_dias) > 30) ? 'es' : ''}. Luego se divide en ${formData.tipo_duracion === 'meses' ? (formData.numero_meses ? calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago) : 'N') : (formData.numero_dias ? calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias)) : 'N')} cuotas ${getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}${(formData.tipo_duracion === 'meses' && formData.numero_meses ? (calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago) > 1 ? 'es' : '') : (formData.tipo_duracion === 'dias' && formData.numero_dias ? (calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias)) > 1 ? 'es' : '') : ''))}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Duración *</Label>
                  <Select
                    value={formData.tipo_duracion}
                    onValueChange={(value: 'meses' | 'dias') =>
                      setFormData({ ...formData, tipo_duracion: value, numero_meses: value === 'meses' ? formData.numero_meses : '', numero_dias: value === 'dias' ? formData.numero_dias : '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meses">Meses</SelectItem>
                      <SelectItem value="dias">Días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_duracion === 'meses' ? (
                  <div className="space-y-2">
                    <Label htmlFor="numero_meses">Duración del Préstamo (meses) *</Label>
                    <Input
                      id="numero_meses"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.numero_meses}
                      onChange={(e) =>
                        setFormData({ ...formData, numero_meses: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-gray-500">
                      {formData.numero_meses && formData.frecuencia_pago ? (
                        <>
                          Número de cuotas calculado: <strong>{calcularNumeroCuotas(parseFloat(formData.numero_meses) || 0, formData.frecuencia_pago)}</strong> cuotas {getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}{calcularNumeroCuotas(parseFloat(formData.numero_meses) || 0, formData.frecuencia_pago) > 1 ? 'es' : ''}
                        </>
                      ) : (
                        'El número de cuotas se calculará automáticamente según la duración y frecuencia'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="numero_dias">Duración del Préstamo (días) *</Label>
                    <Input
                      id="numero_dias"
                      type="number"
                      step="1"
                      min="1"
                      value={formData.numero_dias}
                      onChange={(e) =>
                        setFormData({ ...formData, numero_dias: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-gray-500">
                      {formData.numero_dias && formData.frecuencia_pago ? (
                        <>
                          Número de cuotas calculado: <strong>{calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias) || 0)}</strong> cuotas {getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}{calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias) || 0) > 1 ? 'es' : ''}
                        </>
                      ) : (
                        'El número de cuotas se calculará automáticamente según la duración y frecuencia'
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_inicio: e.target.value })
                    }
                    required
                  />
                </div>

                {formData.tipo_prestamo === 'solo_intereses' && formData.fecha_fin && (
                  <div className="space-y-2">
                    <Label htmlFor="fecha_fin">Fecha de Vencimiento (Capital)</Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={formData.fecha_fin}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500">Calculada automáticamente</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="frecuencia_pago">Frecuencia de Pago *</Label>
                  <Select
                    value={formData.frecuencia_pago}
                    onValueChange={(value) =>
                      setFormData({ ...formData, frecuencia_pago: value as FrecuenciaPago })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="excluir_domingos"
                    checked={formData.excluir_domingos}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, excluir_domingos: checked === true })
                    }
                  />
                  <Label
                    htmlFor="excluir_domingos"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Excluir domingos del cronograma de cuotas
                  </Label>
                </div>

                {/* Tipo de interés (simple/compuesto) solo aplica para amortización por período */}
                {formData.tipo_prestamo !== 'abierto' && formData.tipo_calculo_interes !== 'frances' && (
                <div className="space-y-2">
                  <Label htmlFor="tipo_interes">Tipo de Interés *</Label>
                  <Select
                    value={formData.tipo_interes}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo_interes: value as TipoInteres })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="compuesto">Compuesto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}
              </div>

              {/* Préstamo Abierto — aviso informativo */}
              {formData.tipo_prestamo === 'abierto' && formData.monto_prestado && formData.interes_porcentaje && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm text-amber-900">Préstamo Abierto</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Capital inicial</p>
                      <p className="font-semibold text-amber-900">
                        {formatCurrency(parseFloat(formData.monto_prestado || '0'), config.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Interés mensual estimado</p>
                      <p className="font-semibold text-amber-900">
                        {formatCurrency(
                          parseFloat(formData.monto_prestado || '0') * parseFloat(formData.interes_porcentaje || '0') / 100,
                          config.currency
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    No se generarán cuotas automáticamente. Cada pago se registra manualmente desde el detalle del préstamo con el monto de interés y abono a capital que el cliente pague.
                  </p>
                </div>
              )}

              {calculatedDetails.montoTotal > 0 && formData.tipo_prestamo !== 'abierto' && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm text-blue-900">
                    Resumen del Préstamo
                    {formData.tipo_calculo_interes === 'frances' && (
                      <span className="ml-2 text-xs font-normal bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                        Sistema Francés
                      </span>
                    )}
                  </h4>
                  {formData.tipo_prestamo === 'solo_intereses' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Interés por Cuota</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(calculatedDetails.montoCuota || 0, config.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Capital a Pagar al Final</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(parseFloat(formData.monto_prestado || '0'), config.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Interés Total</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(calculatedDetails.interes, config.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Monto Total</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(calculatedDetails.montoTotal, config.currency)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Interés Total</p>
                          <p className="font-semibold text-blue-900">
                            {formatCurrency(calculatedDetails.interes, config.currency)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formData.tipo_calculo_interes === 'global' 
                              ? `${formData.interes_porcentaje}% global sobre capital`
                              : formData.tipo_duracion === 'meses'
                                ? `${formData.interes_porcentaje}% mensual × ${formData.numero_meses || 'N'} mes${formData.numero_meses && parseFloat(formData.numero_meses) > 1 ? 'es' : ''}`
                                : `${formData.interes_porcentaje}% mensual × ${formData.numero_dias ? (parseFloat(formData.numero_dias) / 30).toFixed(1) : 'N'} mes${formData.numero_dias && parseFloat(formData.numero_dias) > 30 ? 'es' : ''} (${formData.numero_dias || 'N'} días)`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Monto Total</p>
                          <p className="font-semibold text-blue-900">
                            {formatCurrency(calculatedDetails.montoTotal, config.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cuota {getNombreFrecuencia(formData.frecuencia_pago)}</p>
                          <p className="font-semibold text-blue-900">
                            {formatCurrency(calculatedDetails.montoCuota, config.currency)}
                          </p>
                          {(formData.tipo_duracion === 'meses' && formData.numero_meses) || (formData.tipo_duracion === 'dias' && formData.numero_dias) ? (
                            <p className="text-xs text-gray-500 mt-1">
                              {formData.tipo_duracion === 'meses'
                                ? calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago)
                                : calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias))} cuotas en total
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-blue-200 space-y-1">
                        <p className="text-xs text-gray-600">
                          <strong>Cálculo:</strong> {
                            formData.tipo_calculo_interes === 'global'
                              ? `$${parseFloat(formData.monto_prestado || '0').toFixed(2)} + ($${parseFloat(formData.monto_prestado || '0').toFixed(2)} × ${formData.interes_porcentaje}%) = ${formatCurrency(calculatedDetails.montoTotal, config.currency)}`
                              : formData.tipo_duracion === 'meses'
                                ? `$${parseFloat(formData.monto_prestado || '0').toFixed(2)} + ($${parseFloat(formData.monto_prestado || '0').toFixed(2)} × ${formData.interes_porcentaje}% mensual × ${formData.numero_meses || 'N'} mes${formData.numero_meses && parseFloat(formData.numero_meses) > 1 ? 'es' : ''}) = ${formatCurrency(calculatedDetails.montoTotal, config.currency)}`
                                : `$${parseFloat(formData.monto_prestado || '0').toFixed(2)} + ($${parseFloat(formData.monto_prestado || '0').toFixed(2)} × ${formData.interes_porcentaje}% mensual × ${formData.numero_dias ? (parseFloat(formData.numero_dias) / 30).toFixed(1) : 'N'} mes${formData.numero_dias && parseFloat(formData.numero_dias) > 30 ? 'es' : ''}) = ${formatCurrency(calculatedDetails.montoTotal, config.currency)}`
                          }
                        </p>
                        {((formData.tipo_duracion === 'meses' && formData.numero_meses) || (formData.tipo_duracion === 'dias' && formData.numero_dias)) && (
                          <p className="text-xs text-gray-500">
                            <strong>Cuotas:</strong> {formData.tipo_duracion === 'meses'
                              ? calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago)
                              : calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias))} cuotas {getNombreFrecuencia(formData.frecuencia_pago).toLowerCase()}{(formData.tipo_duracion === 'meses'
                              ? calcularNumeroCuotas(parseFloat(formData.numero_meses), formData.frecuencia_pago)
                              : calcularNumeroCuotas(undefined, formData.frecuencia_pago, parseFloat(formData.numero_dias))) > 1 ? 'es' : ''} de {formatCurrency(calculatedDetails.montoCuota, config.currency)} cada una
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sección de Garantías para Empeños */}
              {formData.tipo_prestamo === 'empeño' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Garantías/Colaterales</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGarantia}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Garantía
                    </Button>
                  </div>
                  
                  {garantias.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Agrega al menos una garantía para este empeño
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {garantias.map((garantia, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">Garantía {index + 1}</h5>
                            {garantias.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGarantia(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <Label>Descripción *</Label>
                              <Input
                                value={garantia.descripcion}
                                onChange={(e) => updateGarantia(index, 'descripcion', e.target.value)}
                                placeholder="Ej: Anillo de oro, iPhone 13, etc."
                                required
                              />
                            </div>
                            
                            <div>
                              <Label>Categoría</Label>
                              <Select
                                value={garantia.categoria}
                                onValueChange={(value) => updateGarantia(index, 'categoria', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="joyas">Joyas</SelectItem>
                                  <SelectItem value="electronica">Electrónica</SelectItem>
                                  <SelectItem value="vehiculo">Vehículo</SelectItem>
                                  <SelectItem value="electrodomesticos">Electrodomésticos</SelectItem>
                                  <SelectItem value="herramientas">Herramientas</SelectItem>
                                  <SelectItem value="otros">Otros</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Valor Estimado</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={garantia.valor_estimado}
                                onChange={(e) => updateGarantia(index, 'valor_estimado', e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <Label>Fecha de Vencimiento</Label>
                              <Input
                                type="date"
                                value={garantia.fecha_vencimiento}
                                onChange={(e) => updateGarantia(index, 'fecha_vencimiento', e.target.value)}
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Observaciones</Label>
                              <Input
                                value={garantia.observaciones}
                                onChange={(e) => updateGarantia(index, 'observaciones', e.target.value)}
                                placeholder="Notas adicionales..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
              
              {/* Footer fijo con botones */}
              <div className="flex-shrink-0 flex justify-end space-x-2 px-6 py-4 pt-4 border-t bg-gray-50/50">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">{editingPrestamo ? 'Actualizar Préstamo' : 'Crear Préstamo'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Primero debes agregar clientes para poder crear préstamos
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : prestamos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay préstamos registrados aún
            </p>
          ) : (
            <>
              {/* Vista Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Monto Prestado</TableHead>
                    <TableHead>Interés</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Cuotas</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {prestamos.map((prestamo) => (
                  <TableRow key={prestamo.id}>
                    <TableCell className="font-medium">
                      {prestamo.cliente?.nombre || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(prestamo.monto_prestado, config.currency)}</TableCell>
                    <TableCell>{prestamo.interes_porcentaje}% ({prestamo.tipo_interes || 'simple'})</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(prestamo.monto_total, config.currency)}
                    </TableCell>
                    <TableCell>{prestamo.numero_cuotas}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        prestamo.tipo_prestamo === 'empeño'
                          ? 'bg-purple-100 text-purple-800'
                          : prestamo.tipo_prestamo === 'solo_intereses'
                          ? 'bg-orange-100 text-orange-800'
                          : prestamo.tipo_prestamo === 'venta_credito'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prestamo.tipo_prestamo === 'empeño' ? 'Empeño' :
                         prestamo.tipo_prestamo === 'solo_intereses' ? 'Solo Interés' :
                         prestamo.tipo_prestamo === 'venta_credito' ? 'Venta a Crédito' :
                         'Amortización'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {getNombreFrecuencia(prestamo.frecuencia_pago || 'mensual')}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(prestamo.fecha_inicio)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prestamo.estado === 'activo'
                            ? 'bg-blue-100 text-blue-800'
                            : prestamo.estado === 'pagado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {prestamo.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPrestamo(prestamo)
                            setDetailDialogOpen(true)
                          }}
                          title="Ver detalles y cuotas"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPrestamo(prestamo)}
                          title="Editar préstamo"
                        >
                          <Pencil className="h-4 w-4 text-yellow-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={userRole !== 'admin'}
                          onClick={() => handleDelete(prestamo.id)}
                          title={userRole === 'admin' ? 'Eliminar préstamo' : 'Solo admin puede eliminar'}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Vista Móvil */}
            <div className="md:hidden space-y-3">
              {prestamos.map((prestamo) => (
                <PrestamoCardMobile
                  key={prestamo.id}
                  prestamo={{
                    id: prestamo.id,
                    cliente: prestamo.cliente ? {
                      nombre: prestamo.cliente.nombre,
                      dni: prestamo.cliente.dni
                    } : undefined,
                    monto_prestado: prestamo.monto_prestado,
                    interes_porcentaje: prestamo.interes_porcentaje,
                    monto_total: prestamo.monto_total,
                    numero_cuotas: prestamo.numero_cuotas,
                    fecha_inicio: prestamo.fecha_inicio,
                    estado: prestamo.estado,
                    ruta: prestamo.ruta ? {
                      nombre_ruta: prestamo.ruta.nombre_ruta,
                      color: prestamo.ruta.color || null
                    } : null
                  }}
                  currency={config.currency}
                  onView={() => {
                    setSelectedPrestamo(prestamo)
                    setDetailDialogOpen(true)
                  }}
                  onEdit={() => handleEditPrestamo(prestamo)}
                  onDelete={userRole === 'admin' ? () => handleDelete(prestamo.id) : undefined}
                />
              ))}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      <PrestamoDetailDialog
        prestamo={selectedPrestamo}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={loadData}
      />

      <LimiteAlcanzadoDialog
        open={limiteDialogOpen}
        onOpenChange={setLimiteDialogOpen}
        tipo="prestamos"
      />
    </div>
  )
}

