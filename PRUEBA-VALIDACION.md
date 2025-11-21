# 🧪 Cómo Probar la Validación de Email

## ⚠️ IMPORTANTE: Reiniciar el Servidor

Si estás en desarrollo local, **DEBES reiniciar el servidor** para ver los cambios:

```bash
# Detener el servidor (Ctrl + C)
# Luego reiniciar:
npm run dev
# o
yarn dev
```

---

## 🔄 Si ya está en producción:

Necesitas desplegar los cambios:

```bash
git add .
git commit -m "fix: Deshabilitar botón cuando email es inválido"
git push origin main
```

Espera 2-3 minutos a que Vercel despliegue.

---

## ✅ Pasos para Probar

### 1. Abre tu navegador en modo incógnito
**¿Por qué?** Para evitar cache de JavaScript

- **Chrome/Edge:** Ctrl + Shift + N
- **Firefox:** Ctrl + Shift + P

### 2. Ve a la página de registro
```
http://localhost:3000/register
# o en producción:
https://tu-app.vercel.app/register
```

### 3. Prueba estos emails:

#### ❌ Test 1: Error tipográfico
```
Email: test@gmai.com
```

**Deberías ver:**
- ⚠️ Alerta amarilla/azul con: "Email inválido"
- 💡 Botón azul: "Usar: test@gmail.com"
- 🔒 Botón deshabilitado con texto: "Corrige el email para continuar"
- 📝 Mensaje abajo: "Por favor corrige el email para poder registrarte"

#### ❌ Test 2: Dominio de prueba
```
Email: usuario@test.com
```

**Deberías ver:**
- ❌ Alerta roja con: "Por favor usa un email real, no de prueba"
- 🔒 Botón deshabilitado
- **NO debe haber sugerencia** (porque test.com es inválido completamente)

#### ❌ Test 3: Otro error tipográfico
```
Email: juan@hotmai.com
```

**Deberías ver:**
- ⚠️ Alerta con: "Email inválido"
- 💡 Sugerencia: "Usar: juan@hotmail.com"
- 🔒 Botón deshabilitado

#### ✅ Test 4: Email válido
```
Email: usuario@gmail.com
```

**Deberías ver:**
- ✅ Checkmark verde con: "Email válido"
- ✅ Botón habilitado con texto: "Crear Cuenta"
- **NO hay alertas de error**

---

## 🐛 Si NO funciona:

### Opción 1: Limpiar cache del navegador
```
1. Presiona F12 (abrir DevTools)
2. Click derecho en el botón de recargar
3. Selecciona "Empty Cache and Hard Reload"
```

### Opción 2: Verificar que los archivos se guardaron
```bash
# Verificar el estado de Git
git status

# Deberías ver:
# modified:   app/register/page.tsx
```

### Opción 3: Verificar imports
Abre `app/register/page.tsx` y verifica que tenga estos imports:

```typescript
import { validateEmail, normalizeEmail } from '@/lib/utils/email-validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'
```

### Opción 4: Verificar errores en consola
```
1. Presiona F12
2. Ve a la pestaña "Console"
3. ¿Hay errores en rojo?
4. Compártelos si los hay
```

---

## 📸 Capturas Esperadas

### Cuando escribes `test@gmai.com`:

```
┌─────────────────────────────────────┐
│ Email                               │
│ ┌─────────────────────────────────┐ │
│ │ test@gmai.com                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ Email inválido                   │
│ ¿Quisiste decir test@gmail.com?    │
│ [Usar: test@gmail.com]              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Corrige el email para continuar │ │ ← DESHABILITADO
│ └─────────────────────────────────┘ │
│ Por favor corrige el email...      │
└─────────────────────────────────────┘
```

### Cuando corriges a `test@gmail.com`:

```
┌─────────────────────────────────────┐
│ Email                               │
│ ┌─────────────────────────────────┐ │
│ │ test@gmail.com                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✅ Email válido                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Crear Cuenta                    │ │ ← HABILITADO
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🎯 Resultado Final

**Cuando funcione correctamente:**

- ✅ NO podrás hacer clic en "Crear Cuenta" si el email es inválido
- ✅ Verás sugerencias para corregir errores tipográficos
- ✅ El botón solo se habilita con un email válido
- ✅ Los emails se bloquearán ANTES de llegar a Supabase
- ✅ ¡No más bounces! 🎉

---

## 📞 ¿Sigue sin funcionar?

Si después de reiniciar el servidor y limpiar el cache sigue sin funcionar, comparte:

1. ✅ ¿Reiniciaste el servidor? (Sí/No)
2. 📸 Captura de pantalla de `/register`
3. 🔍 Errores en la consola del navegador (F12 → Console)
4. 💻 ¿Estás en desarrollo o producción?

---

**Última actualización:** Noviembre 2024

