/** Bloquea la UI con loader solo si no hay filas en cache (stale-while-revalidate). */
export function shouldBlockListLoader(refreshing: boolean, cachedCount: number): boolean {
  return refreshing && cachedCount === 0
}
