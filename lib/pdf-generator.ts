"use client"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface ClienteInfo {
  nombre: string
  dni: string
  telefono?: string
  direccion?: string
}

interface PrestamoInfo {
  id: string
  monto_prestado: number
  interes_porcentaje: number
  numero_cuotas: number
  fecha_inicio: string
  monto_total: number
  frecuencia_pago: string
  tipo_interes: string
}

interface PagoInfo {
  numero_cuota: number
  monto_cuota: number
  monto_pagado: number
  fecha_pago: string
  metodo_pago?: string
}

interface CuotaInfo {
  numero_cuota: number
  monto_cuota: number
  fecha_vencimiento: string
  estado: string
}

export function generarContratoPrestamo(
  cliente: ClienteInfo,
  prestamo: PrestamoInfo,
  companyName: string = 'Gestor de Créditos'
) {
  const doc = new jsPDF()
  
  // Encabezado
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 105, 20, { align: 'center' })
  
  doc.setFontSize(16)
  doc.text('CONTRATO DE PRÉSTAMO', 105, 30, { align: 'center' })
  
  // Línea separadora
  doc.setLineWidth(0.5)
  doc.line(20, 35, 190, 35)
  
  // Información del Prestamista
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('EL PRESTAMISTA:', 20, 45)
  doc.setFont('helvetica', 'normal')
  doc.text(`${companyName}`, 20, 52)
  doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 59)
  
  // Información del Cliente
  doc.setFont('helvetica', 'bold')
  doc.text('EL PRESTATARIO:', 20, 72)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nombre: ${cliente.nombre}`, 20, 79)
  doc.text(`DNI: ${cliente.dni}`, 20, 86)
  if (cliente.telefono) doc.text(`Teléfono: ${cliente.telefono}`, 20, 93)
  if (cliente.direccion) doc.text(`Dirección: ${cliente.direccion}`, 20, 100)
  
  // Detalles del Préstamo
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLES DEL PRÉSTAMO:', 20, 115)
  doc.setFont('helvetica', 'normal')
  
  const frecuencias: Record<string, string> = {
    diario: 'Diario',
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual'
  }
  
  doc.text(`Monto Prestado: $${prestamo.monto_prestado.toFixed(2)}`, 20, 122)
  doc.text(`Tasa de Interés: ${prestamo.interes_porcentaje}% (${prestamo.tipo_interes})`, 20, 129)
  doc.text(`Monto Total a Pagar: $${prestamo.monto_total.toFixed(2)}`, 20, 136)
  doc.text(`Número de Cuotas: ${prestamo.numero_cuotas}`, 20, 143)
  doc.text(`Frecuencia de Pago: ${frecuencias[prestamo.frecuencia_pago] || 'Mensual'}`, 20, 150)
  doc.text(`Fecha de Inicio: ${format(new Date(prestamo.fecha_inicio), 'dd/MM/yyyy')}`, 20, 157)
  doc.text(`Monto por Cuota: $${(prestamo.monto_total / prestamo.numero_cuotas).toFixed(2)}`, 20, 164)
  
  // Cláusulas
  doc.setFont('helvetica', 'bold')
  doc.text('CLÁUSULAS:', 20, 180)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  const clausulas = [
    '1. El PRESTATARIO se compromete a pagar el monto total del préstamo en las fechas establecidas.',
    '2. Los pagos se realizarán según la frecuencia acordada.',
    '3. En caso de mora, se aplicarán los cargos correspondientes según las leyes vigentes.',
    '4. El PRESTATARIO reconoce haber recibido el monto completo del préstamo.',
    '5. Ambas partes aceptan los términos y condiciones del presente contrato.',
  ]
  
  let yPos = 188
  clausulas.forEach((clausula) => {
    doc.text(clausula, 20, yPos, { maxWidth: 170 })
    yPos += 10
  })
  
  // Firmas
  doc.setFontSize(12)
  doc.line(40, 250, 90, 250)
  doc.text('Firma del Prestamista', 45, 257)
  
  doc.line(120, 250, 170, 250)
  doc.text('Firma del Prestatario', 125, 257)
  
  // Pie de página
  doc.setFontSize(8)
  doc.text(`ID del Préstamo: ${prestamo.id}`, 105, 285, { align: 'center' })
  
  // Guardar
  doc.save(`Contrato_${cliente.nombre.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export function generarReciboPago(
  cliente: ClienteInfo,
  pago: PagoInfo,
  companyName: string = 'Gestor de Créditos'
) {
  const doc = new jsPDF()
  
  // Encabezado
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 105, 20, { align: 'center' })
  
  doc.setFontSize(16)
  doc.text('RECIBO DE PAGO', 105, 30, { align: 'center' })
  
  // Línea separadora
  doc.setLineWidth(0.5)
  doc.line(20, 35, 190, 35)
  
  // Número de recibo y fecha
  doc.setFontSize(10)
  doc.text(`Recibo No: ${Date.now()}`, 150, 45)
  doc.text(`Fecha: ${format(new Date(pago.fecha_pago), 'dd/MM/yyyy HH:mm')}`, 150, 52)
  
  // Información del Cliente
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBIMOS DE:', 20, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(`${cliente.nombre}`, 20, 68)
  doc.text(`DNI: ${cliente.dni}`, 20, 75)
  
  // Detalles del Pago - Cuadro destacado
  doc.setFillColor(240, 240, 240)
  doc.rect(20, 90, 170, 60, 'F')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLES DEL PAGO', 105, 100, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cuota No: ${pago.numero_cuota}`, 30, 115)
  doc.text(`Monto de la Cuota: $${pago.monto_cuota.toFixed(2)}`, 30, 125)
  doc.text(`Monto Pagado: $${pago.monto_pagado.toFixed(2)}`, 30, 135)
  if (pago.metodo_pago) {
    doc.text(`Método de Pago: ${pago.metodo_pago}`, 30, 145)
  }
  
  // Monto en letras (simplificado)
  doc.setFont('helvetica', 'bold')
  doc.text('LA SUMA DE:', 20, 165)
  doc.setFont('helvetica', 'normal')
  doc.text(`${convertirNumeroALetras(pago.monto_pagado)} DÓLARES`, 20, 173)
  
  // Nota
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.text('Este recibo certifica el pago realizado según los términos acordados.', 20, 190)
  
  // Firma
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.line(130, 230, 180, 230)
  doc.text('Firma Autorizada', 140, 237)
  
  // Pie de página
  doc.setFontSize(8)
  doc.text(companyName, 105, 280, { align: 'center' })
  doc.text('Este documento es válido sin necesidad de firma', 105, 285, { align: 'center' })
  
  // Guardar
  doc.save(`Recibo_${cliente.nombre.replace(/\s+/g, '_')}_Cuota${pago.numero_cuota}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export function generarPlanPagos(
  cliente: ClienteInfo,
  prestamo: PrestamoInfo,
  cuotas: CuotaInfo[],
  companyName: string = 'Gestor de Créditos'
) {
  const doc = new jsPDF()
  
  // Encabezado
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 105, 15, { align: 'center' })
  
  doc.setFontSize(14)
  doc.text('PLAN DE PAGOS', 105, 25, { align: 'center' })
  
  // Información del Cliente
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cliente: ${cliente.nombre}`, 20, 35)
  doc.text(`DNI: ${cliente.dni}`, 20, 41)
  doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, 150, 35)
  
  // Resumen del Préstamo
  doc.setFontSize(10)
  doc.text(`Monto Prestado: $${prestamo.monto_prestado.toFixed(2)}`, 20, 52)
  doc.text(`Interés: ${prestamo.interes_porcentaje}%`, 85, 52)
  doc.text(`Total a Pagar: $${prestamo.monto_total.toFixed(2)}`, 135, 52)
  
  // Tabla de Cuotas
  autoTable(doc, {
    startY: 60,
    head: [['Cuota', 'Monto', 'Fecha Vencimiento', 'Estado']],
    body: cuotas.map(c => [
      c.numero_cuota,
      `$${c.monto_cuota.toFixed(2)}`,
      format(new Date(c.fecha_vencimiento), 'dd/MM/yyyy'),
      c.estado.toUpperCase()
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  })
  
  // Guardar
  doc.save(`PlanPagos_${cliente.nombre.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

// Función auxiliar para convertir números a letras (simplificada)
function convertirNumeroALetras(numero: number): string {
  const entero = Math.floor(numero)
  const decimal = Math.round((numero - entero) * 100)
  
  // Implementación simplificada
  return `${entero} CON ${decimal}/100`
}

// Exportar Reporte General
interface ReporteGeneralInfo {
  totalPrestado: number
  totalRecuperado: number
  totalPendiente: number
  gananciaIntereses: number
  prestamosActivos: number
  prestamosPagados: number
  cuotasPendientes: number
  cuotasRetrasadas: number
  clientesActivos: number
  fecha: string
}

export function generarReporteGeneral(
  reporte: ReporteGeneralInfo,
  companyName: string = 'Gestor de Créditos',
  currency: string = 'USD'
) {
  const doc = new jsPDF()
  
  // Función helper para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
  
  // Encabezado
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 105, 20, { align: 'center' })
  
  doc.setFontSize(16)
  doc.text('Reporte General', 105, 30, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${reporte.fecha}`, 105, 37, { align: 'center' })
  
  // Línea separadora
  doc.setLineWidth(0.5)
  doc.line(20, 42, 190, 42)
  
  let yPos = 52
  
  // Resumen Financiero
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Financiero', 20, yPos)
  yPos += 10
  
  // Tabla de métricas financieras
  const financialData = [
    ['Total Prestado', formatCurrency(reporte.totalPrestado)],
    ['Total Recuperado', formatCurrency(reporte.totalRecuperado)],
    ['Total Pendiente', formatCurrency(reporte.totalPendiente)],
    ['Ganancia por Intereses', formatCurrency(reporte.gananciaIntereses)],
  ]
  
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: financialData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Estadísticas Operacionales
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Estadísticas Operacionales', 20, yPos)
  yPos += 10
  
  const operationalData = [
    ['Préstamos Activos', reporte.prestamosActivos.toString()],
    ['Préstamos Pagados', reporte.prestamosPagados.toString()],
    ['Cuotas Pendientes', reporte.cuotasPendientes.toString()],
    ['Cuotas Retrasadas', reporte.cuotasRetrasadas.toString()],
    ['Clientes Activos', reporte.clientesActivos.toString()],
  ]
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Cantidad']],
    body: operationalData,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Indicadores de Rendimiento
  const totalEsperado = reporte.totalPrestado + reporte.gananciaIntereses
  const tasaRecuperacion = totalEsperado > 0 
    ? ((reporte.totalRecuperado / totalEsperado) * 100).toFixed(2)
    : '0.00'
  const promedioPrestamo = (reporte.prestamosActivos + reporte.prestamosPagados) > 0
    ? reporte.totalPrestado / (reporte.prestamosActivos + reporte.prestamosPagados)
    : 0
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicadores de Rendimiento', 20, yPos)
  yPos += 10
  
  const indicatorsData = [
    ['Tasa de Recuperación', `${tasaRecuperacion}%`],
    ['Promedio por Préstamo', formatCurrency(promedioPrestamo)],
    ['Total Préstamos', `${reporte.prestamosActivos + reporte.prestamosPagados}`],
  ]
  
  autoTable(doc, {
    startY: yPos,
    head: [['Indicador', 'Valor']],
    body: indicatorsData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  })
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      285,
      { align: 'center' }
    )
    doc.text(
      `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      105,
      290,
      { align: 'center' }
    )
  }
  
  // Guardar
  doc.save(`ReporteGeneral_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`)
}

// Exportar Reporte por Cliente
interface ReporteClienteInfo {
  cliente: {
    nombre: string
    dni: string
  }
  total_prestado: number
  total_pagado: number
  total_pendiente: number
  prestamos_activos: number
  cuotas_pendientes: number
  cuotas_retrasadas: number
  prestamos: Array<{
    monto_prestado: number
    interes_porcentaje: number
    monto_total: number
    numero_cuotas: number
    fecha_inicio: string
    estado: string
    frecuencia_pago: string
  }>
  fecha: string
}

export function generarReporteCliente(
  reporte: ReporteClienteInfo,
  companyName: string = 'Gestor de Créditos',
  currency: string = 'USD'
) {
  const doc = new jsPDF()
  
  // Función helper para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
  
  // Función helper para formatear fecha
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy')
  }
  
  // Función helper para nombre de frecuencia
  const getNombreFrecuencia = (frecuencia: string) => {
    const nombres: Record<string, string> = {
      diario: 'Diario',
      semanal: 'Semanal',
      quincenal: 'Quincenal',
      mensual: 'Mensual',
    }
    return nombres[frecuencia] || frecuencia
  }
  
  // Encabezado
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 105, 20, { align: 'center' })
  
  doc.setFontSize(16)
  doc.text('Reporte de Cliente', 105, 30, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${reporte.fecha}`, 105, 37, { align: 'center' })
  
  // Línea separadora
  doc.setLineWidth(0.5)
  doc.line(20, 42, 190, 42)
  
  let yPos = 52
  
  // Información del Cliente
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Información del Cliente', 20, yPos)
  yPos += 8
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nombre: ${reporte.cliente.nombre}`, 20, yPos)
  yPos += 6
  doc.text(`DNI: ${reporte.cliente.dni}`, 20, yPos)
  yPos += 12
  
  // Resumen Financiero
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Financiero', 20, yPos)
  yPos += 10
  
  const financialData = [
    ['Total Prestado', formatCurrency(reporte.total_prestado)],
    ['Total Pagado', formatCurrency(reporte.total_pagado)],
    ['Total Pendiente', formatCurrency(reporte.total_pendiente)],
  ]
  
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: financialData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Estadísticas
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Estadísticas', 20, yPos)
  yPos += 10
  
  const statsData = [
    ['Préstamos Activos', reporte.prestamos_activos.toString()],
    ['Cuotas Pendientes', reporte.cuotas_pendientes.toString()],
    ['Cuotas Retrasadas', reporte.cuotas_retrasadas.toString()],
  ]
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Cantidad']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right' },
    },
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Detalle de Préstamos
  if (reporte.prestamos && reporte.prestamos.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle de Préstamos', 20, yPos)
    yPos += 10
    
    const prestamosData = reporte.prestamos.map((prestamo) => [
      formatCurrency(prestamo.monto_prestado),
      `${prestamo.interes_porcentaje}%`,
      formatCurrency(prestamo.monto_total),
      prestamo.numero_cuotas.toString(),
      getNombreFrecuencia(prestamo.frecuencia_pago),
      formatDate(prestamo.fecha_inicio),
      prestamo.estado,
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Prestado', 'Int.', 'Total', 'Cuotas', 'Frec.', 'Inicio', 'Estado']],
      body: prestamosData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'right' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
    })
  }
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      285,
      { align: 'center' }
    )
    doc.text(
      `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      105,
      290,
      { align: 'center' }
    )
  }
  
  // Guardar
  doc.save(`ReporteCliente_${reporte.cliente.nombre.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`)
}

