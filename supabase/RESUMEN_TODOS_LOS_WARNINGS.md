# Resumen: Corrección de Warnings de Seguridad Supabase

## Estado de todos los warnings detectados

| Tipo de Warning | Script SQL | Estado |
|---|---|---|
| Function Search Path Mutable | `FIX_SEARCH_PATH_WARNINGS.sql` | ✅ Listo para ejecutar |
| RLS Policy Always True | `FIX_RLS_ALWAYS_TRUE_WARNINGS.sql` | ✅ Listo para ejecutar |
| Public Can Execute SECURITY DEFINER Function | `FIX_PUBLIC_EXECUTE_WARNINGS.sql` | ✅ Listo para ejecutar |
| Signed-In Users Can Execute SECURITY DEFINER Function | `FIX_PUBLIC_EXECUTE_WARNINGS.sql` | ✅ Triggers internos cubiertos |
| Public Bucket Allows Listing | `FIX_STORAGE_BUCKET_WARNINGS.sql` | ✅ Listo para ejecutar |
| Leaked Password Protection Disabled | **VER INSTRUCCIONES ABAJO** | ⚙️ Solo Dashboard |

---

## Orden de ejecución recomendado

Ejecutar en Supabase → SQL Editor → Run, en este orden:

1. `FIX_SEARCH_PATH_WARNINGS.sql`
2. `FIX_PUBLIC_EXECUTE_WARNINGS.sql`
3. `FIX_RLS_ALWAYS_TRUE_WARNINGS.sql`
4. `FIX_STORAGE_BUCKET_WARNINGS.sql`

---

## ⚙️ Leaked Password Protection (solo Dashboard)

Este warning NO se puede corregir con SQL. Requiere activarlo en el Dashboard:

1. Ve a **Supabase Dashboard → Authentication → Settings**
2. Busca la sección **"Password Security"** o **"Security"**
3. Activa la opción **"Leaked Password Protection"**
4. Guarda los cambios

**¿Qué hace?** Supabase verifica las contraseñas nuevas contra la base de datos pública de contraseñas comprometidas [HaveIBeenPwned](https://haveibeenpwned.com/). Si un usuario intenta registrarse con una contraseña conocida como comprometida, se le impide usarla.

---

## Nota sobre "Signed-In Users Can Execute SECURITY DEFINER"

Supabase genera este warning para **todas** las funciones que `authenticated` puede ejecutar.

- **Funciones trigger** (`actualizar_capital_*`, `trg_recalcular_*`, etc.): ya cubiertos — se les revocó acceso a PUBLIC y a authenticated.
- **Funciones de la app** (`get_clientes_segun_rol`, `get_limites_organizacion`, etc.): mantenemos GRANT a `authenticated` porque la app las necesita, y estas funciones ya tienen validaciones internas con `auth.uid()`. El warning persiste pero es de prioridad baja e informativo.
