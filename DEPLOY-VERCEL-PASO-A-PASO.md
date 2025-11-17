# 🚀 Deploy a Vercel - Paso a Paso

## ⏱️ Tiempo estimado: 15 minutos

Sigue estos pasos exactamente como están escritos.

---

## PASO 1: Verificar que Tienes Todo (2 minutos)

### 1.1 Verificar que tengas Git instalado
Abre tu terminal (PowerShell) y ejecuta:
```bash
git --version
```

✅ Si ves algo como "git version 2.x.x" → Continúa al paso 1.2
❌ Si dice "comando no reconocido" → Instala Git: https://git-scm.com/download/win

### 1.2 Verificar que el proyecto funcione localmente
```bash
npm run dev
```

✅ Si abre en http://localhost:3000 → Bien!
❌ Si hay errores → Resuelve los errores primero

Presiona `Ctrl + C` para detener el servidor.

---

## PASO 2: Preparar el Proyecto (3 minutos)

### 2.1 Asegúrate de tener .gitignore
Ya debería existir, pero verifica que tenga esto:

```
.env.local
.env
node_modules
.next
.vercel
```

### 2.2 Inicializar Git (si no está inicializado)
```bash
git init
```

### 2.3 Agregar todos los archivos
```bash
git add .
```

### 2.4 Hacer el primer commit
```bash
git commit -m "Deploy inicial a produccion"
```

---

## PASO 3: Subir a GitHub (5 minutos)

### 3.1 Crear Repositorio en GitHub

1. **Abre tu navegador** y ve a: https://github.com/new

2. **Configura el repositorio:**
   - Repository name: `gestor-creditos-webs`
   - Description: "Sistema de gestión de préstamos y créditos"
   - ✅ Public (o Private si prefieres)
   - ❌ NO inicializar con README, .gitignore o license

3. **Haz clic en "Create repository"**

### 3.2 Conectar tu Proyecto con GitHub

Copia estos comandos (GitHub te los muestra también):

```bash
git remote add origin https://github.com/TU-USUARIO/gestor-creditos-webs.git
git branch -M main
git push -u origin main
```

⚠️ **Reemplaza `TU-USUARIO`** con tu usuario de GitHub.

**Ejemplo:**
```bash
git remote add origin https://github.com/juanperez/gestor-creditos-webs.git
git branch -M main
git push -u origin main
```

Te pedirá tu usuario y contraseña de GitHub. Ingrésalos.

✅ Si ves "100% uploaded" → ¡Perfecto! Continúa al paso 4

---

## PASO 4: Deploy en Vercel (5 minutos)

### 4.1 Crear Cuenta en Vercel

1. **Ve a:** https://vercel.com/signup
2. **Haz clic en "Continue with GitHub"**
3. **Autoriza Vercel** para acceder a tus repositorios

### 4.2 Importar tu Proyecto

1. **En Vercel, haz clic en "Add New..." → Project**

2. **Busca tu repositorio:** `gestor-creditos-webs`

3. **Haz clic en "Import"**

### 4.3 Configurar Variables de Entorno

Antes de hacer deploy, agrega estas variables:

**Haz clic en "Environment Variables"** y agrega una por una:

```
Nombre: NEXT_PUBLIC_SUPABASE_URL
Valor: [Tu URL de Supabase]
```

```
Nombre: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: [Tu Anon Key de Supabase]
```

```
Nombre: NEXT_PUBLIC_PAYPAL_CLIENT_ID
Valor: [Tu Client ID de PayPal PRODUCCIÓN]
```

```
Nombre: NEXT_PUBLIC_APP_URL
Valor: https://gestor-creditos-webs.vercel.app
```

⚠️ **Nota:** La URL exacta de tu proyecto aparecerá después del deploy. Si es diferente, la actualizamos después.

### 4.4 Deploy!

1. **Haz clic en "Deploy"**

2. **Espera 2-3 minutos** mientras Vercel construye tu proyecto

3. **¡Listo!** 🎉 Verás una pantalla con confeti

### 4.5 Copiar tu URL

Vercel te dará una URL como:
```
https://gestor-creditos-webs.vercel.app
```

o

```
https://gestor-creditos-webs-tu-usuario.vercel.app
```

**📋 COPIA ESTA URL** - La necesitarás para PayPal y Supabase.

---

## PASO 5: Actualizar Configuración (2 minutos)

### 5.1 Actualizar NEXT_PUBLIC_APP_URL en Vercel

Si la URL que te dio Vercel es diferente a la que pusiste en las variables:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Edita `NEXT_PUBLIC_APP_URL` con la URL correcta
4. Redeploy: Ve a "Deployments" → Menú de tres puntos → "Redeploy"

### 5.2 Actualizar URLs en Supabase

1. Ve a tu proyecto en Supabase
2. **Authentication** → **URL Configuration**
3. Agrega tu URL de Vercel a:
   - **Site URL:** `https://tu-proyecto.vercel.app`
   - **Redirect URLs:** `https://tu-proyecto.vercel.app/**`

---

## PASO 6: Verificar que Funcione (3 minutos)

### 6.1 Abrir tu App en Producción

Abre tu navegador y ve a: `https://tu-proyecto.vercel.app`

### 6.2 Pruebas Básicas

✅ La página carga correctamente
✅ Puedes ver la página de login
✅ Puedes ver la página de registro

### 6.3 Registrar Usuario de Prueba

1. Haz clic en "Crear Cuenta"
2. Registra un nuevo usuario
3. Verifica tu email
4. Inicia sesión
5. Ve al Dashboard

✅ Si todo funciona → ¡Perfecto! Ahora puedes crear los planes en PayPal

---

## 📋 Resumen: Tu URL para PayPal

Una vez completados estos pasos, tendrás:

**URL de tu aplicación:**
```
https://gestor-creditos-webs.vercel.app
```

**Para la imagen del producto en PayPal:**
```
https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=Gestor+Creditos
```

Ahora ya puedes crear los planes en PayPal usando estas URLs ✅

---

## 🆘 Solución de Problemas

### Error: "git no reconocido"
- Instala Git: https://git-scm.com/download/win
- Reinicia tu terminal

### Error: "npm no reconocido"
- Asegúrate de tener Node.js instalado
- Reinicia tu terminal

### Error al hacer push a GitHub
- Verifica tu usuario y contraseña
- Si usas 2FA, necesitas un Personal Access Token:
  - Ve a GitHub → Settings → Developer Settings → Personal Access Tokens
  - Generate new token → Usa ese token como contraseña

### Error en Vercel: "Build failed"
- Verifica que `npm run build` funcione localmente
- Revisa los logs en Vercel para ver el error específico
- Asegúrate de que las variables de entorno estén correctas

### La app carga pero no puedo iniciar sesión
- Verifica que hayas actualizado las URLs en Supabase
- Verifica que las variables de entorno estén correctas en Vercel

---

## ✅ Checklist Final

- [ ] Git instalado
- [ ] Proyecto subido a GitHub
- [ ] Cuenta de Vercel creada
- [ ] Proyecto deployado en Vercel
- [ ] Variables de entorno configuradas
- [ ] URLs actualizadas en Supabase
- [ ] App funcionando en producción
- [ ] URL lista para usar en PayPal

---

## 🎯 Siguiente Paso

Una vez que tengas tu URL de Vercel funcionando:

1. Ve a PayPal Business
2. Crea los 6 planes de suscripción
3. Usa tu URL de Vercel en el campo "URL del producto"
4. Copia los Plan IDs (P-...)
5. Actualiza Supabase con el script SQL

---

**¿Necesitas ayuda con algún paso específico? Avísame donde te atores y te ayudo.**

