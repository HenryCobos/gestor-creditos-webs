# 📸 Cómo Agregar Screenshots a la Landing Page

## 🎯 Paso a Paso

### 1. Tomar el Screenshot del Dashboard

1. **Abre tu dashboard en el navegador:**
   ```
   https://gestor-creditos-webs.vercel.app/dashboard
   ```

2. **Ajusta la ventana:**
   - Maximiza el navegador (pantalla completa)
   - Zoom al 100% (Ctrl + 0)
   - Oculta la barra de marcadores si está visible

3. **Toma el screenshot:**
   - **Opción 1:** Presiona `Windows + Shift + S` → Selecciona área
   - **Opción 2:** Usa la Herramienta de Recorte de Windows
   - **Opción 3:** Presiona `F12` → Click en los 3 puntos → More tools → Capture screenshot

### 2. Guardar la Imagen

1. **Guarda el screenshot con este nombre exacto:**
   ```
   dashboard-screenshot.png
   ```

2. **Guárdalo en esta carpeta:**
   ```
   C:\Users\HENRY\gestor-creditos-webs\public\dashboard-screenshot.png
   ```

3. **Formato recomendado:**
   - PNG (mejor calidad) ✅
   - Tamaño: 1920x1080px o mayor
   - No comprimir demasiado

### 3. Verificar que se Guardó Correctamente

Ejecuta en tu terminal:

```bash
dir public\dashboard-screenshot.png
```

Deberías ver el archivo listado.

### 4. Desplegar los Cambios

```bash
git add .
git commit -m "feat: Agregar screenshot real del dashboard"
git push origin main
```

Espera 2-3 minutos y visita:
```
https://gestor-creditos-webs.vercel.app
```

¡Tu screenshot real ahora aparecerá en la landing page! 🎉

---

## 📸 Screenshots Adicionales (Opcional)

Si quieres agregar más screenshots de otras secciones:

### Clientes
- Archivo: `public/clientes-screenshot.png`
- Página: `/dashboard/clientes`

### Préstamos
- Archivo: `public/prestamos-screenshot.png`
- Página: `/dashboard/prestamos`

### Reportes
- Archivo: `public/reportes-screenshot.png`
- Página: `/dashboard/reportes`

---

## ✅ Checklist

- [ ] Screenshot tomado en alta resolución
- [ ] Guardado en `public/dashboard-screenshot.png`
- [ ] Nombre del archivo correcto (sin espacios)
- [ ] Formato PNG
- [ ] Commit y push realizado
- [ ] Landing page actualizada en Vercel

---

## 🆘 Si Algo Sale Mal

**El screenshot no aparece:**
1. Verifica que el nombre sea exactamente `dashboard-screenshot.png`
2. Verifica que esté en la carpeta `public/`
3. Haz un hard refresh en el navegador (Ctrl + Shift + R)
4. Limpia caché de Vercel

**La imagen se ve pixelada:**
- Toma el screenshot en mayor resolución
- Usa formato PNG en lugar de JPG
- No comprimas la imagen

---

**¡Listo!** Tu landing page ahora mostrará tu dashboard real y se verá mucho más profesional. 🚀

