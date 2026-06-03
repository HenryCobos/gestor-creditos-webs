/**
 * Rangos por día de calendario local (inputs type="date").
 * Evita el desfase de parseISO + startOfDay que excluye cobros del día actual.
 */

export function rangoFechasLocales(desde: string, hasta: string) {
  const [yd, md, dd] = desde.split('-').map(Number)
  const [yh, mh, dh] = hasta.split('-').map(Number)
  const desdeDate = new Date(yd, md - 1, dd, 0, 0, 0, 0)
  const hastaDate = new Date(yh, mh - 1, dh, 23, 59, 59, 999)
  return { desde: desdeDate.toISOString(), hasta: hastaDate.toISOString() }
}

export function diaCalendarioLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function estaEnRangoCalendario(
  iso: string,
  desde: string,
  hasta: string
): boolean {
  const dia = diaCalendarioLocal(iso)
  return dia >= desde && dia <= hasta
}
