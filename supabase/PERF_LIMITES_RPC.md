# Rendimiento: RPC `get_limites_organizacion`

Si en DevTools ves muchas llamadas lentas a `/api/limites-organizacion` (~2 s), el cliente está usando el **fallback** porque el RPC falló o no existe.

## Pasos (SQL Editor, en orden)

1. Ejecutar `DIAGNOSTICO_LIMITES_ORGANIZACION.sql`
2. Si hay error o sin filas: ejecutar `FIX_FUNCION_LIMITES_CORREGIDA.sql`
3. Verificar: `SELECT * FROM get_limites_organizacion();`

Con el RPC OK, la app usa la vía rápida y la cache en memoria (90 s) reduce refetch al navegar entre secciones.

Ver también: `lib/subscription-helpers.ts` → `fetchLimitesOrganizacionFromNetwork`.
