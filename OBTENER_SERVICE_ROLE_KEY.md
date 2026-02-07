# 📝 Cómo obtener el SUPABASE_SERVICE_ROLE_KEY

## 🔑 Pasos para obtener la Service Role Key:

1. **Ir a tu proyecto en Supabase:**
   - Abre https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navegar a Settings → API:**
   - En el menú lateral, haz clic en ⚙️ **Settings**
   - Luego haz clic en **API**

3. **Copiar la Service Role Key:**
   - Busca la sección "**Project API keys**"
   - Encontrarás dos keys:
     - **anon** / **public**: Ya la tienes como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role**: Esta es la que necesitas 🔐
   - Haz clic en el ícono de "ojo" para revelar la `service_role` key
   - Cópiala completa

4. **Agregar a `.env.local`:**
   - Abre tu archivo `.env.local`
   - Pega la key en `SUPABASE_SERVICE_ROLE_KEY=aqui_va_la_key`

## ⚠️ **MUY IMPORTANTE - SEGURIDAD:**

La **Service Role Key** tiene **privilegios de administrador completos** en tu base de datos:

- ✅ **SÍ:** Úsala solo en el servidor (API Routes de Next.js)
- ❌ **NO:** Nunca la expongas en el cliente
- ❌ **NO:** Nunca la subas a GitHub (ya está en `.gitignore`)
- ❌ **NO:** Nunca la compartas públicamente

## 🔒 **Agregar a Vercel (Producción):**

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (pega tu service role key aquí)
   - Environment: Production, Preview, Development
4. Haz clic en "Save"
5. Redeploy tu aplicación

## ✅ **Verificar que funciona:**

Después de agregar la key y reiniciar tu servidor de desarrollo:

1. Intenta crear un usuario desde `/dashboard/usuarios`
2. Si funciona correctamente, verás: "✅ Usuario creado correctamente"
3. Si hay error, revisa la consola del servidor

---

**Nota:** Después de agregar la key a `.env.local`, necesitas **reiniciar tu servidor de desarrollo** (Ctrl+C y `npm run dev` de nuevo).
