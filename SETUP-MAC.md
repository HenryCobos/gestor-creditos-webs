# Configurar el proyecto en Mac

El código vive en GitHub. La base de datos (Supabase) y el deploy (Vercel) están en la nube; no hace falta migrar servidor.

## 1. En Windows (antes de cambiar de PC)

1. Copia **`C:\Users\HENRY\gestor-creditos-webs\.env.local`** a un lugar seguro (USB, iCloud, 1Password, email a ti mismo cifrado, etc.).
2. No subas `.env.local` a GitHub (ya está en `.gitignore`).

## 2. En la Mac — requisitos

- [Node.js LTS](https://nodejs.org/) (v20 o v22)
- [Git](https://git-scm.com/)
- [Cursor](https://cursor.com/) (opcional pero recomendado)
- Cuenta de GitHub con acceso al repo

### GitHub (SSH recomendado)

```bash
ssh-keygen -t ed25519 -C "tu-email@gmail.com"
cat ~/.ssh/id_ed25519.pub
```

Pega la clave en GitHub → Settings → SSH and GPG keys → New SSH key.

## 3. Clonar e instalar

```bash
cd ~/Developer   # o la carpeta que uses
git clone git@github.com:HenryCobos/gestor-creditos-webs.git
cd gestor-creditos-webs
npm install
```

Si no usas SSH:

```bash
git clone https://github.com/HenryCobos/gestor-creditos-webs.git
```

## 4. Variables de entorno

```bash
cp .env.example .env.local
```

Abre `.env.local` y pega los valores del archivo que copiaste desde Windows (o desde Vercel → Project → Settings → Environment Variables).

Variables necesarias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

## 5. Probar en local

```bash
npm run dev
```

Abre http://localhost:3000 e inicia sesión.

## 6. Flujo de trabajo diario

```bash
git pull origin main          # traer cambios
# ... editar en Cursor ...
git add .
git commit -m "descripción"
git push origin main          # Vercel despliega automáticamente
```

## 7. Repo en GitHub

- **URL:** https://github.com/HenryCobos/gestor-creditos-webs
- **Rama principal:** `main`
- **Producción:** Vercel (deploy al hacer push a `main`)

## Notas

- No copies la carpeta del proyecto con USB/iCloud: pierdes historial Git y arrastras `node_modules` o `.next`.
- Scripts SQL en `supabase/` son de soporte; la app no los ejecuta sola.
- Si algo falla en Mac: `rm -rf node_modules .next && npm install`.
