// @ts-nocheck
/**
 * Aplica fix fórmula contable de caja por fases (producción activa).
 *
 * Requiere DATABASE_URL en .env.local
 *
 * Uso:
 *   npx tsx scripts/apply-capital-formula-fix.ts D1
 *   npx tsx scripts/apply-capital-formula-fix.ts D2
 *   CONFIRM_RECALC_ALL=yes npx tsx scripts/apply-capital-formula-fix.ts D3
 *
 * Sin DATABASE_URL: ejecuta en Supabase → SQL Editor:
 *   supabase/FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D1.sql
 *   supabase/FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D2.sql
 *   supabase/FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D3.sql
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const phase = (process.argv[2] || '').toUpperCase()
const files: Record<string, string> = {
  D1: 'FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D1.sql',
  D2: 'FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D2.sql',
  D3: 'FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D3.sql',
}

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function main() {
  if (!files[phase]) {
    console.error('Uso: npx tsx scripts/apply-capital-formula-fix.ts D1|D2|D3')
    process.exit(1)
  }

  if (phase === 'D3' && process.env.CONFIRM_RECALC_ALL !== 'yes') {
    console.error('❌ D3 requiere confirmación explícita:')
    console.error('   CONFIRM_RECALC_ALL=yes npx tsx scripts/apply-capital-formula-fix.ts D3')
    process.exit(1)
  }

  const sqlPath = join(process.cwd(), 'supabase', files[phase])

  if (!databaseUrl) {
    console.error('❌ Falta DATABASE_URL o SUPABASE_DB_URL')
    console.error('   Ejecuta manualmente en Supabase → SQL Editor:')
    console.error(`   ${sqlPath}`)
    process.exit(1)
  }

  const sql = readFileSync(sqlPath, 'utf8')

  let pg: typeof import('pg')
  try {
    pg = await import('pg')
  } catch {
    console.error('❌ Instala pg: npm install pg')
    process.exit(1)
  }

  const client = new pg.default.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    console.log(`Aplicando ${phase}: ${files[phase]}...`)
    const result = await client.query(sql)
    if (result.rows?.length) {
      console.log('Resultado:')
      console.table(result.rows)
    }
    console.log(`✓ ${phase} aplicada`)
    if (phase === 'D2') {
      console.log('\nValida con:')
      console.log('  npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA')
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e)
  process.exit(1)
})
