# 🚀 Guía Rápida - Resolver Email Bounce

## ⚡ 3 Pasos - 30 Minutos

---

## PASO 1: Limpiar Base de Datos (10 min)

### 📍 Ir a Supabase
```
https://supabase.com → Tu Proyecto → SQL Editor
```

### 🔍 Revisar emails inválidos
```sql
-- Copiar de: scripts/limpiar-emails-invalidos.sql

-- Ver emails de prueba
SELECT email FROM auth.users 
WHERE email ILIKE '%test%' OR email ILIKE '%prueba%';

-- Ver tasa de confirmación
SELECT 
  ROUND(COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric / 
  COUNT(*) * 100, 2) as tasa_percent
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 🗑️ Eliminar inválidos (opcional, con cuidado)
```sql
-- Solo si estás seguro
DELETE FROM auth.users
WHERE confirmed_at IS NULL
  AND (email ILIKE '%test%' OR email ILIKE '%prueba%');
```

---

## PASO 2: Desplegar Código (10 min)

### 💻 En tu terminal:
```bash
# Ver cambios
git status

# Agregar todo
git add .

# Commit
git commit -m "fix: Agregar validación de emails para prevenir bounces"

# Push (deploy automático si tienes Vercel conectado)
git push origin main
```

### ✅ Verificar deploy
```
- Ir a Vercel Dashboard
- Verificar que el deploy finalizó
- Ir a tu-app.vercel.app/register
- Probar validación
```

---

## PASO 3: Responder a Supabase (10 min)

### 📧 Email a: noreply@supabase.com

**Asunto:** Re: Email Sending Privileges for [tu-proyecto] at risk

**Cuerpo:**
```
Hola equipo de Supabase,

He implementado las siguientes correcciones:

✅ Validación estricta de emails en registro
✅ Bloqueé dominios de prueba (test.com, etc.)
✅ Detección de errores tipográficos
✅ Eliminé usuarios con emails inválidos
✅ Normalización de emails (lowercase/trim)

Estaré monitoreando las métricas.

Gracias,
[Tu Nombre]
```

---

## 🧪 PRUEBA RÁPIDA

### 1. Ve a `/register`

### 2. Prueba estos emails:

| Email | Resultado Esperado |
|-------|-------------------|
| `test@gmai.com` | ⚠️ "¿Quisiste decir gmail.com?" |
| `prueba@test.com` | ❌ "Por favor usa un email real" |
| `usuario@gmail.com` | ✅ "Email válido" |

### 3. Si ves los mensajes correctos: ✅ TODO LISTO

---

## 📊 VERIFICAR ÉXITO (Próximos 7 días)

### En Supabase SQL Editor:

```sql
-- Bounce rate debería bajar
-- Confirmation rate debería subir

SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) as confirmados,
  ROUND(COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::numeric / 
        COUNT(*) * 100, 2) as tasa_percent
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Objetivo: Tasa > 60%

---

## 🆘 AYUDA RÁPIDA

### Si algo no funciona:

#### ❌ Error al importar módulos
```bash
npm install
# o
yarn install
```

#### ❌ Componente Alert no existe
```bash
# Ya está creado en: components/ui/alert.tsx
# Si falta, verificar que se haya creado correctamente
```

#### ❌ Email sigue rebotando
1. Verificar que el código se desplegó
2. Limpiar más usuarios de base de datos
3. Considerar SMTP personalizado (ver SOLUCION-EMAIL-BOUNCE.md)

---

## 📱 Contacto

### Supabase
- Email: support@supabase.com
- Discord: https://discord.supabase.com

### Documentación
- `SOLUCION-EMAIL-BOUNCE.md` → Solución completa
- `ACCION-INMEDIATA-EMAIL-BOUNCE.md` → Checklist detallado
- `scripts/limpiar-emails-invalidos.sql` → Queries SQL

---

## ✅ CHECKLIST FINAL

- [ ] ✅ Base de datos limpiada
- [ ] ✅ Código desplegado
- [ ] ✅ Validación probada
- [ ] ✅ Email a Supabase enviado
- [ ] ⏳ Esperando respuesta (24-48h)
- [ ] ⏳ Monitoreando métricas (7 días)

---

## 🎯 Meta

**Bounce Rate < 5%**  
**Confirmation Rate > 60%**  
**Sin restricciones de Supabase**

---

**Última actualización:** Noviembre 2024  
**Tiempo total:** 30 minutos  
**Dificultad:** ⭐⭐ Fácil

