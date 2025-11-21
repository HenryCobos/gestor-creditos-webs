# 📱 Botón Flotante de WhatsApp

## ✅ Implementado

Se ha agregado un botón flotante de WhatsApp que aparece en todas las páginas de tu aplicación.

---

## 🎨 Características

- ✅ **Flotante y fijo**: Siempre visible mientras haces scroll
- ✅ **Responsive**: Se adapta a móvil y desktop
- ✅ **Animado**: Efecto de pulso y hover suaves
- ✅ **Tooltip**: Mensaje de ayuda al pasar el mouse
- ✅ **Badge**: Indicador de notificación (1)
- ✅ **Posicionable**: Lado derecho o izquierdo
- ✅ **Mensaje predeterminado**: Se abre WhatsApp con texto prellenado

---

## 🔧 Configuración

### **Cambiar tu número de WhatsApp:**

Abre el archivo: `lib/config/whatsapp.ts`

```typescript
export const whatsappConfig = {
  // Cambia esto por tu número real
  phoneNumber: '51999999999', // 👈 EDITA AQUÍ
  
  // Mensaje que aparecerá en WhatsApp
  defaultMessage: '¡Hola! Tengo una consulta sobre Gestor de Créditos',
  
  // Posición: 'right' o 'left'
  position: 'right',
  
  // Mostrar badge rojo con "1"
  showBadge: true,
}
```

### **Formato del número:**

❌ **INCORRECTO:**
- `+51 999 999 999`
- `51-999-999-999`
- `(51) 999999999`

✅ **CORRECTO:**
- `51999999999` (código país + número, sin espacios ni símbolos)

**Ejemplos por país:**
- 🇵🇪 Perú: `51999999999`
- 🇲🇽 México: `5215512345678`
- 🇦🇷 Argentina: `5491112345678`
- 🇨🇴 Colombia: `573123456789`
- 🇪🇸 España: `34612345678`

---

## 🎨 Personalización Avanzada

### **Cambiar colores:**

Edita: `components/whatsapp-button.tsx`

```typescript
// Línea 62-63: Color del botón
className="... bg-[#25D366] hover:bg-[#20BA5A] ..."

// Cambiar a otro color (ejemplo: azul)
className="... bg-blue-600 hover:bg-blue-700 ..."
```

### **Cambiar posición:**

En `lib/config/whatsapp.ts`:

```typescript
position: 'left', // Para lado izquierdo
```

### **Ocultar el badge:**

```typescript
showBadge: false,
```

### **Cambiar mensaje predeterminado:**

```typescript
defaultMessage: 'Hola, quiero información sobre los planes',
```

---

## 📱 Vista Previa

### **Desktop:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                              ┌────┐ │
│                              │ WA │ │ ← Botón flotante
│                              └────┘ │
│                                 (1) │ ← Badge
└─────────────────────────────────────┘
```

### **Mobile:**
```
┌──────────────┐
│              │
│              │
│         ┌──┐ │
│         │WA│ │
│         └──┘ │
│          (1) │
└──────────────┘
```

---

## 🧪 Probar

1. **Abrir tu sitio:**
   ```
   http://localhost:3000
   ```

2. **Verás el botón** en la esquina inferior derecha

3. **Click en el botón** → Se abre WhatsApp con el mensaje prellenado

---

## 🎯 Funcionalidad

### **En Desktop:**
- Hover → Muestra tooltip "¿Necesitas ayuda?"
- Click → Abre WhatsApp Web en nueva pestaña

### **En Mobile:**
- Click → Abre la app de WhatsApp directamente
- Mensaje prellenado listo para enviar

---

## 🚀 Deploy

Los cambios ya están listos para deploy:

```bash
git add .
git commit -m "feat: Agregar botón flotante de WhatsApp"
git push origin main
```

---

## 📊 Mejoras Futuras (Opcionales)

### **1. Analytics:**
```typescript
const handleWhatsAppClick = () => {
  // Track en Google Analytics
  gtag('event', 'whatsapp_click', {
    event_category: 'engagement',
    event_label: 'WhatsApp Button'
  })
  
  // Abrir WhatsApp
  window.open(whatsappUrl, '_blank')
}
```

### **2. Horario de atención:**
```typescript
const isBusinessHours = () => {
  const now = new Date()
  const hour = now.getHours()
  return hour >= 9 && hour < 18 // 9 AM - 6 PM
}

// Mostrar mensaje diferente fuera de horario
message={isBusinessHours() 
  ? "¡Hola! Estoy disponible"
  : "¡Hola! Te responderé pronto"
}
```

### **3. Múltiples números:**
```typescript
// Diferentes números según la página
const whatsappNumber = {
  '/ventas': '51999999999',
  '/soporte': '51888888888',
  '/default': '51999999999'
}
```

---

## 🎨 Variantes de Diseño

### **Opción 1: Solo icono (actual)**
- Circular, verde WhatsApp
- Con efecto de pulso
- Badge de notificación

### **Opción 2: Con texto:**
```typescript
<button className="flex items-center gap-2 px-4 py-3">
  <MessageCircle />
  <span>¿Necesitas ayuda?</span>
</button>
```

### **Opción 3: Minimalista:**
```typescript
// Sin badge, sin pulso, solo icono
<button className="w-12 h-12 rounded-full bg-green-500">
  <MessageCircle className="h-6 w-6" />
</button>
```

---

## 📞 Soporte

Si necesitas personalizar más el botón, los archivos a editar son:

1. **Configuración:** `lib/config/whatsapp.ts`
2. **Componente:** `components/whatsapp-button.tsx`
3. **Layout:** `app/layout.tsx`

---

## ✅ Checklist

- [ ] Cambiar número de WhatsApp en `lib/config/whatsapp.ts`
- [ ] Personalizar mensaje predeterminado
- [ ] Probar en local
- [ ] Deploy a producción
- [ ] Probar en mobile
- [ ] Verificar que abre WhatsApp correctamente

---

**Estado:** ✅ Implementado y listo para usar  
**Archivos creados:** 3  
**Tiempo de implementación:** 5 minutos de configuración

