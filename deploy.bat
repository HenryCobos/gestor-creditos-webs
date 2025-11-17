@echo off
echo ================================================
echo    DEPLOY A VERCEL - Script Automatico
echo ================================================
echo.

echo [PASO 1/4] Verificando Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git no esta instalado
    echo Descargalo de: https://git-scm.com/download/win
    pause
    exit /b
)
echo Git instalado correctamente!
echo.

echo [PASO 2/4] Preparando el proyecto...
git init >nul 2>&1
git add .
git commit -m "Deploy inicial a produccion"
echo Proyecto preparado!
echo.

echo [PASO 3/4] Ahora necesitas hacer esto manualmente:
echo.
echo 1. Ve a GitHub: https://github.com/new
echo 2. Crea un repositorio llamado: gestor-creditos-webs
echo 3. Copia tu usuario de GitHub
echo.
set /p GITHUB_USER="Ingresa tu usuario de GitHub: "
echo.

echo Conectando con GitHub...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/%GITHUB_USER%/gestor-creditos-webs.git
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo ERROR al subir a GitHub.
    echo Verifica:
    echo - Que creaste el repositorio en GitHub
    echo - Tu usuario y contraseña sean correctos
    pause
    exit /b
)

echo.
echo ================================================
echo    CODIGO SUBIDO A GITHUB EXITOSAMENTE!
echo ================================================
echo.
echo [PASO 4/4] Ahora ve a Vercel:
echo.
echo 1. Abre: https://vercel.com/new
echo 2. Inicia sesion con GitHub
echo 3. Importa el repositorio: gestor-creditos-webs
echo 4. Agrega las variables de entorno (las tienes en .env.local)
echo 5. Haz clic en Deploy
echo.
echo En 2-3 minutos tendras tu URL!
echo.
pause

