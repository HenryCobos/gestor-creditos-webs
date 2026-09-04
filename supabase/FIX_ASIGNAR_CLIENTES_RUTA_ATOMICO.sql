-- =====================================================================
-- FIX ESTRUCTURAL: Asignación atómica de clientes a ruta
-- =====================================================================
-- Problema que soluciona:
--   `handleAsignarClientes()` en app/dashboard/rutas/page.tsx hacía:
--     1) Desactivar TODAS las asignaciones activas de la ruta
--     2) Reactivar SOLO lo que había en el estado React `clientesRuta`
--   Estos eran pasos de red secuenciales, NO una transacción. Si el
--   estado `clientesRuta` estaba incompleto (p.ej. porque
--   `loadClientesRuta` no revisaba errores) o cualquier paso
--   intermedio fallaba, clientes que seguían vigentes quedaban
--   desactivados PARA SIEMPRE, y por el trigger
--   `trigger_asignar_prestamos_a_ruta`, sus préstamos quedaban con
--   ruta_id = NULL (huérfanos). Esto descuadraba la caja, los
--   conteos admin/cobrador y ocultaba nombres de cliente en préstamos.
--
-- Solución:
--   Una sola función SQL `set_clientes_ruta(p_ruta_id, p_cliente_ids)`
--   SECURITY DEFINER que hace TODO el diff (altas/bajas/movidos) en
--   una única transacción de Postgres, calculando el diff contra el
--   estado REAL de la base de datos (no un estado de React que puede
--   estar desactualizado). Se reemplaza el bucle manual del frontend
--   por una sola llamada RPC.
--
-- Además:
--   - Se agrega una tercera condición de visibilidad a
--     get_clientes_segun_rol() para cobradores: si un préstamo del
--     cliente es visible para el cobrador (por ruta_id), el cliente
--     también debe serlo, aunque su ruta_clientes esté desincronizado.
--   - Se agrega un índice único parcial para impedir que un cliente
--     quede activo en más de una ruta a la vez.
-- =====================================================================


-- =====================================================================
-- 0) Resolver duplicados existentes ANTES de crear el índice único.
-- =====================================================================
-- Si algún cliente quedó con más de una fila activo=true en
-- ruta_clientes (p.ej. activo en dos rutas a la vez, por el bug
-- original o porque el script de reparación de ANITA no se corrió
-- completo antes de este), el CREATE UNIQUE INDEX de más abajo falla
-- con "could not create unique index ... Key (cliente_id)=(...) is
-- duplicated". Este bloque lo resuelve automáticamente:
--   - Para cada cliente_id con >1 fila activo=true, conserva la MÁS
--     RECIENTE (por fecha_asignacion, luego created_at) y desactiva
--     el resto.
--   - Recalcula el capital de cada ruta que perdió una asignación por
--     esta limpieza, para que ninguna caja quede descuadrada.
--   - Es seguro correrlo más de una vez: si no hay duplicados, no
--     hace nada.
DO $$
DECLARE
  v_rutas_afectadas UUID[];
  v_duplicados_resueltos INT := 0;
  v_ruta_id UUID;
  v_capital NUMERIC;
BEGIN
  -- Se captura ruta_id directamente del RETURNING del propio UPDATE
  -- (no se vuelve a consultar el estado de la tabla después de
  -- modificarla, para evitar arrastrar filas inactivas antiguas que
  -- no tienen relación con esta limpieza).
  WITH duplicados AS (
    SELECT
      id,
      ruta_id,
      ROW_NUMBER() OVER (
        PARTITION BY cliente_id
        ORDER BY fecha_asignacion DESC NULLS LAST, created_at DESC
      ) AS rn
    FROM public.ruta_clientes
    WHERE activo = true
  ),
  desactivados AS (
    UPDATE public.ruta_clientes rc
    SET activo = false
    FROM duplicados d
    WHERE rc.id = d.id AND d.rn > 1
    RETURNING rc.ruta_id
  )
  SELECT
    COALESCE(array_agg(DISTINCT ruta_id), ARRAY[]::UUID[]),
    COUNT(*)
  INTO v_rutas_afectadas, v_duplicados_resueltos
  FROM desactivados;

  RAISE NOTICE 'Duplicados de ruta_clientes.activo=true resueltos: %', v_duplicados_resueltos;

  FOREACH v_ruta_id IN ARRAY v_rutas_afectadas
  LOOP
    SELECT public.recalcular_capital_ruta(v_ruta_id) INTO v_capital;
    RAISE NOTICE 'Capital recalculado para ruta %: %', v_ruta_id, v_capital;
  END LOOP;
END $$;

-- Verificación: debe devolver 0 filas antes de continuar con el índice.
SELECT cliente_id, COUNT(*) AS filas_activas
FROM public.ruta_clientes
WHERE activo = true
GROUP BY cliente_id
HAVING COUNT(*) > 1;


-- =====================================================================
-- 1) Índice único parcial: un cliente solo puede estar activo en
--    UNA ruta a la vez. Blinda la integridad de datos a nivel de BD,
--    independientemente de bugs futuros en el código de la app.
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_ruta_clientes_cliente_unico_activo
ON public.ruta_clientes (cliente_id)
WHERE activo = true;


-- =====================================================================
-- 2) Función atómica: set_clientes_ruta
-- =====================================================================
-- Recibe la ruta y la lista COMPLETA y definitiva de cliente_id que
-- deben quedar asignados (activos) a esa ruta. Calcula el diff contra
-- ruta_clientes en tiempo real y aplica solo los cambios necesarios,
-- todo dentro de una única transacción (atómico por diseño: es una
-- sola función plpgsql, Postgres la ejecuta completa o no la ejecuta).
DROP FUNCTION IF EXISTS public.set_clientes_ruta(UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.set_clientes_ruta(
  p_ruta_id UUID,
  p_cliente_ids UUID[]
)
RETURNS TABLE (
  agregados INT,
  quitados INT,
  movidos INT,
  total_final INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_mi_role TEXT;
  v_mi_org UUID;
  v_ruta_org UUID;
  v_agregados INT := 0;
  v_quitados INT := 0;
  v_movidos INT := 0;
  v_total_final INT := 0;
BEGIN
  IF p_ruta_id IS NULL THEN
    RAISE EXCEPTION 'p_ruta_id es requerido';
  END IF;

  -- Normalizar NULL -> arreglo vacío (permite "quitar todos")
  IF p_cliente_ids IS NULL THEN
    p_cliente_ids := ARRAY[]::UUID[];
  END IF;

  -- ---------------------------------------------------------------
  -- Autorización: admin de la organización dueña de la ruta.
  -- Replica exactamente la lógica de checkPermissions() del frontend:
  -- profiles.role, con posible override en user_roles para la org.
  -- ---------------------------------------------------------------
  SELECT p.role, p.organization_id INTO v_mi_role, v_mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_mi_org IS NOT NULL THEN
    SELECT COALESCE(ur.role, v_mi_role) INTO v_mi_role
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.organization_id = v_mi_org
    LIMIT 1;
  END IF;

  SELECT r.organization_id INTO v_ruta_org
  FROM rutas r
  WHERE r.id = p_ruta_id;

  IF v_ruta_org IS NULL THEN
    RAISE EXCEPTION 'Ruta no encontrada: %', p_ruta_id;
  END IF;

  IF v_mi_role IS DISTINCT FROM 'admin' OR v_mi_org IS DISTINCT FROM v_ruta_org THEN
    RAISE EXCEPTION 'No tienes permisos de administrador sobre esta ruta';
  END IF;

  -- Validar que todos los clientes pertenezcan a la misma organización
  IF EXISTS (
    SELECT 1
    FROM unnest(p_cliente_ids) AS cid
    JOIN clientes c ON c.id = cid
    JOIN profiles cp ON cp.id = c.user_id
    WHERE cp.organization_id IS DISTINCT FROM v_ruta_org
  ) THEN
    RAISE EXCEPTION 'Uno o más clientes no pertenecen a la organización de la ruta';
  END IF;

  -- ---------------------------------------------------------------
  -- 1) MOVIDOS: clientes que están activos en OTRA ruta y ahora
  --    deben pasar a p_ruta_id. Se desactivan ahí y se activan/crean
  --    aquí en los pasos siguientes.
  -- ---------------------------------------------------------------
  WITH movidos AS (
    UPDATE ruta_clientes rc
    SET activo = false
    WHERE rc.activo = true
      AND rc.ruta_id <> p_ruta_id
      AND rc.cliente_id = ANY(p_cliente_ids)
    RETURNING rc.cliente_id
  )
  SELECT COUNT(*) INTO v_movidos FROM movidos;

  -- ---------------------------------------------------------------
  -- 2) QUITADOS: clientes que HOY están activos en p_ruta_id pero
  --    ya NO están en la lista deseada -> se desactivan.
  -- ---------------------------------------------------------------
  WITH quitados AS (
    UPDATE ruta_clientes rc
    SET activo = false
    WHERE rc.ruta_id = p_ruta_id
      AND rc.activo = true
      AND NOT (rc.cliente_id = ANY(p_cliente_ids))
    RETURNING rc.cliente_id
  )
  SELECT COUNT(*) INTO v_quitados FROM quitados;

  -- ---------------------------------------------------------------
  -- 3) AGREGADOS/REACTIVADOS: upsert de todos los cliente_id
  --    deseados hacia p_ruta_id con activo = true. No toca las filas
  --    que ya estaban activas y correctas (evita escrituras/trigger
  --    innecesarios).
  -- ---------------------------------------------------------------
  WITH agregados AS (
    INSERT INTO ruta_clientes (ruta_id, cliente_id, activo, fecha_asignacion)
    SELECT p_ruta_id, cid, true, NOW()
    FROM unnest(p_cliente_ids) AS cid
    ON CONFLICT (ruta_id, cliente_id)
    DO UPDATE SET activo = true
    WHERE ruta_clientes.activo IS DISTINCT FROM true
    RETURNING cliente_id
  )
  SELECT COUNT(*) INTO v_agregados FROM agregados;

  -- v_agregados incluye tanto altas nuevas como reactivaciones (incluye
  -- a los "movidos"); para el conteo de "agregados" reportado al usuario
  -- restamos los que ya contamos como movidos.
  v_agregados := GREATEST(v_agregados - v_movidos, 0);

  -- ---------------------------------------------------------------
  -- 4) Sincronizar préstamos activos/pendientes de los clientes
  --    finales hacia p_ruta_id (respaldo si el trigger no alcanzó,
  --    y para los que se estén moviendo desde otra ruta).
  -- ---------------------------------------------------------------
  UPDATE prestamos p
  SET ruta_id = p_ruta_id, updated_at = NOW()
  WHERE p.cliente_id = ANY(p_cliente_ids)
    AND p.estado IN ('activo', 'pendiente')
    AND (p.ruta_id IS NULL OR p.ruta_id <> p_ruta_id);

  -- Préstamos de los clientes QUITADOS de la ruta: si el cliente ya no
  -- pertenece a ninguna ruta activa, sus préstamos quedan sin ruta_id
  -- (comportamiento intencional, igual al trigger existente).
  UPDATE prestamos p
  SET ruta_id = NULL, updated_at = NOW()
  WHERE p.ruta_id = p_ruta_id
    AND p.estado IN ('activo', 'pendiente')
    AND NOT (p.cliente_id = ANY(p_cliente_ids))
    AND NOT EXISTS (
      SELECT 1 FROM ruta_clientes rc2
      WHERE rc2.cliente_id = p.cliente_id AND rc2.ruta_id = p_ruta_id AND rc2.activo = true
    );

  -- ---------------------------------------------------------------
  -- 5) Recalcular capital de la ruta con los datos ya corregidos.
  --    No modifica la fórmula, solo dispara el recálculo con los
  --    insumos correctos.
  -- ---------------------------------------------------------------
  PERFORM recalcular_capital_ruta(p_ruta_id);

  SELECT COUNT(*) INTO v_total_final
  FROM ruta_clientes
  WHERE ruta_id = p_ruta_id AND activo = true;

  RETURN QUERY SELECT v_agregados, v_quitados, v_movidos, v_total_final;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_clientes_ruta(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION public.set_clientes_ruta IS
  'Asigna atómicamente el conjunto definitivo de clientes a una ruta (altas, bajas y movidos en una sola transacción). Reemplaza el patrón desactivar-todo/reactivar del frontend.';


-- =====================================================================
-- 3) Defensa adicional en get_clientes_segun_rol(): si un préstamo es
--    visible para el cobrador (vía ruta_id), su cliente también debe
--    serlo, sin importar el estado de ruta_clientes. Elimina de raíz
--    la posibilidad de préstamos con "Cliente: -".
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_clientes_segun_rol()
RETURNS SETOF clientes
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mi_role TEXT;
  mi_org UUID;
BEGIN
  -- Obtener rol y organización del usuario actual
  SELECT p.role, p.organization_id INTO mi_role, mi_org
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Si es admin, devolver todos los clientes de la organización
  IF mi_role = 'admin' THEN
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = mi_org
    ORDER BY c.created_at DESC;

  -- Si es cobrador, devolver:
  -- A) Sus propios clientes (creados por él)
  -- B) Clientes de sus rutas asignadas (ruta_clientes activo)
  -- C) Clientes cuyo préstamo ya es visible para él vía ruta_id
  --    (defensa contra desincronización de ruta_clientes)
  ELSIF mi_role = 'cobrador' THEN
    RETURN QUERY
    SELECT DISTINCT c.*
    FROM clientes c
    WHERE
      -- Sus propios clientes
      c.user_id = auth.uid()
      OR
      -- Clientes de sus rutas
      EXISTS (
        SELECT 1
        FROM ruta_clientes rc
        JOIN rutas r ON r.id = rc.ruta_id
        WHERE rc.cliente_id = c.id
          AND r.cobrador_id = auth.uid()
          AND rc.activo = true
      )
      OR
      -- Clientes con préstamos ya visibles para el cobrador por ruta_id
      EXISTS (
        SELECT 1
        FROM prestamos pr
        JOIN rutas r ON r.id = pr.ruta_id
        WHERE pr.cliente_id = c.id
          AND r.cobrador_id = auth.uid()
      )
    ORDER BY c.created_at DESC;

  -- Si no tiene rol, devolver solo sus propios clientes
  ELSE
    RETURN QUERY
    SELECT c.*
    FROM clientes c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clientes_segun_rol() TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
SELECT '✅ set_clientes_ruta creada, get_clientes_segun_rol actualizada, índice único parcial creado' AS resultado;
