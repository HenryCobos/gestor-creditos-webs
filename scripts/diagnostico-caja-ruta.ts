/**
 * Diagnóstico y corrección de caja por ruta (préstamos sin ruta_id + recalcular capital)
 *
 * Uso:
 *   npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA
 *   npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA --apply
 */

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2] || 'cristianfuchs10@gmail.com'
const nombreRuta = process.argv[3] || 'ANITA'
const apply = process.argv.includes('--apply')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('=== Diagnóstico caja por ruta ===')
  console.log(`Admin: ${email}`)
  console.log(`Ruta: ${nombreRuta}`)
  console.log(`Modo: ${apply ? 'APLICAR CAMBIOS' : 'solo lectura'}\n`)

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .eq('email', email)
    .single()

  if (profileErr || !profile?.organization_id) {
    console.error('❌ No se encontró perfil/org:', profileErr?.message)
    process.exit(1)
  }

  const orgId = profile.organization_id

  const { data: rutasOrg, error: rutasErr } = await supabase
    .from('rutas')
    .select('id, nombre_ruta, capital_inicial, capital_actual, estado')
    .eq('organization_id', orgId)

  if (rutasErr) {
    console.error('❌ Error cargando rutas:', rutasErr.message)
    process.exit(1)
  }

  console.log(`Rutas en org (${orgId}):`)
  rutasOrg?.forEach((r) =>
    console.log(`  - ${r.nombre_ruta} (${r.estado}) capital=${r.capital_actual}`)
  )

  const ruta =
    rutasOrg?.find((r) =>
      r.nombre_ruta.toLowerCase().includes(nombreRuta.toLowerCase())
    ) ?? null

  if (!ruta) {
    console.error(`❌ Ruta "${nombreRuta}" no encontrada en la org`)
    process.exit(1)
  }

  console.log('--- Ruta ---')
  console.log(JSON.stringify(ruta, null, 2))

  const { data: movs } = await supabase
    .from('movimientos_capital_ruta')
    .select('id, tipo_movimiento, monto, concepto, fecha_movimiento')
    .eq('ruta_id', ruta.id)
  console.log(`\nMovimientos capital: ${movs?.length ?? 0}`)
  movs?.forEach((m) =>
    console.log(`  - ${m.tipo_movimiento}: ${m.monto} (${m.concepto})`)
  )

  const { data: orgUserIds } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)

  const userIds = (orgUserIds || []).map((u) => u.id)

  const { data: prestamosOrg } = await supabase
    .from('prestamos')
    .select(
      'id, monto_prestado, ruta_id, estado, fecha_inicio, created_at, cliente_id, cliente:clientes(nombre)'
    )
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
    .in('estado', ['activo', 'pendiente'])
    .order('created_at', { ascending: true })

  const conRuta = (prestamosOrg || []).filter((p) => p.ruta_id === ruta.id)
  const sinRuta = (prestamosOrg || []).filter((p) => !p.ruta_id)
  const otraRuta = (prestamosOrg || []).filter(
    (p) => p.ruta_id && p.ruta_id !== ruta.id
  )

  const sum = (arr: { monto_prestado: number }[]) =>
    arr.reduce((s, p) => s + Number(p.monto_prestado), 0)

  console.log('\n--- Préstamos activos/pendientes org ---')
  console.log(`Total: ${prestamosOrg?.length ?? 0} | Suma: ${sum(prestamosOrg || [])}`)
  console.log(`En ruta ${nombreRuta}: ${conRuta.length} | Suma: ${sum(conRuta)}`)
  console.log(`Sin ruta_id: ${sinRuta.length} | Suma: ${sum(sinRuta)}`)
  console.log(`Otra ruta: ${otraRuta.length} | Suma: ${sum(otraRuta)}`)

  console.log('\nDetalle préstamos:')
  for (const p of prestamosOrg || []) {
    const cliente = (p.cliente as { nombre?: string } | null)?.nombre || '?'
    const enRuta =
      p.ruta_id === ruta.id
        ? 'EN_RUTA'
        : p.ruta_id
          ? 'OTRA_RUTA'
          : 'SIN_RUTA'
    console.log(
      `  [${enRuta}] ${cliente} | ${p.monto_prestado} | inicio ${p.fecha_inicio} | created ${p.created_at?.slice(0, 10)}`
    )
  }

  const { data: clientesRuta } = await supabase
    .from('ruta_clientes')
    .select('cliente_id')
    .eq('ruta_id', ruta.id)
    .eq('activo', true)

  const clienteIds = (clientesRuta || []).map((c) => c.cliente_id)
  console.log(`\nClientes activos en ruta: ${clienteIds.length}`)

  const huérfanosEnRuta = (prestamosOrg || []).filter(
    (p) => !p.ruta_id && clienteIds.includes(p.cliente_id)
  )

  console.log(
    `\nPréstamos sin ruta_id pero cliente en ${nombreRuta}: ${huérfanosEnRuta.length} | Suma: ${sum(huérfanosEnRuta)}`
  )
  huérfanosEnRuta.forEach((p) =>
    console.log(`  -> id ${p.id} | ${p.monto_prestado}`)
  )

  if (!apply) {
    console.log('\n⚠️  Modo lectura. Ejecuta con --apply para backfill y recalcular capital.')
    return
  }

  if (huérfanosEnRuta.length === 0) {
    console.log('\n✅ No hay préstamos huérfanos que corregir.')
  } else {
    console.log('\n--- Aplicando backfill ruta_id ---')
    for (const p of huérfanosEnRuta) {
      const { error } = await supabase
        .from('prestamos')
        .update({ ruta_id: ruta.id, updated_at: new Date().toISOString() })
        .eq('id', p.id)
      if (error) {
        console.error(`❌ Error actualizando ${p.id}:`, error.message)
      } else {
        console.log(`✅ préstamo ${p.id} -> ruta ${ruta.id}`)
      }
    }
  }

  console.log('\n--- Recalculando capital ---')
  const { data: nuevoCapital, error: rpcErr } = await supabase.rpc(
    'recalcular_capital_ruta',
    { p_ruta_id: ruta.id }
  )

  if (rpcErr) {
    console.error('❌ recalcular_capital_ruta:', rpcErr.message)
    console.log('Intentando cálculo manual...')

    const { data: rutaAfter } = await supabase
      .from('rutas')
      .select('capital_actual')
      .eq('id', ruta.id)
      .single()
    console.log('capital_actual en BD:', rutaAfter?.capital_actual)
  } else {
    console.log(`✅ Nuevo capital_actual: ${nuevoCapital}`)
  }

  // Historial capital inicial si falta
  if (Number(ruta.capital_inicial) > 0 && (movs?.length ?? 0) === 0) {
    console.log('\n--- Insertando movimiento capital inicial retroactivo ---')
    const { error: movErr } = await supabase.from('movimientos_capital_ruta').insert({
      ruta_id: ruta.id,
      tipo_movimiento: 'ingreso',
      monto: ruta.capital_inicial,
      saldo_anterior: 0,
      saldo_nuevo: ruta.capital_inicial,
      realizado_por: profile.id,
      concepto: 'Capital inicial de la ruta',
      fecha_movimiento: new Date().toISOString(),
    })
    if (movErr) {
      console.error('⚠️  No se pudo insertar movimiento:', movErr.message)
    } else {
      console.log('✅ Movimiento capital inicial registrado')
    }
  }

  const { data: rutaFinal } = await supabase
    .from('rutas')
    .select('capital_inicial, capital_actual')
    .eq('id', ruta.id)
    .single()

  console.log('\n--- Estado final ---')
  console.log(JSON.stringify(rutaFinal, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
