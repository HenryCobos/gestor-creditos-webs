# 🔧 Arreglar Registros de Usuarios - Google Ads Campaign

## ⚠️ Problema Detectado

Los usuarios que se registran desde tu campaña de Google Ads pueden no tener perfiles correctamente creados en la base de datos, impidiendo que usen la aplicación.

## ✅ Solución en 3 Pasos

### **Paso 1: Ejecutar Script de Corrección**

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Abre el **SQL Editor** (menú lateral izquierdo)
3. Crea una nueva query
4. Copia TODO el contenido del archivo: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
5. Pégalo en el editor y haz clic en **RUN** o **F5**

**¿Qué hace este script?**
- ✅ Verifica que exista el plan gratuito
- ✅ Corrige el trigger para que SIEMPRE asigne plan gratuito a nuevos usuarios
- ✅ Repara todos los usuarios existentes que tengan problemas
- ✅ Verifica que todo esté funcionando

### **Paso 2: Verificar Resultados**

Después de ejecutar el script, deberías ver en los mensajes:

```
✅ Plan gratuito existe correctamente
✅ Trigger configurado correctamente
✅ Creados X perfiles faltantes
✅ Actualizados X perfiles sin plan
✅✅✅ TODO CORRECTO - Sistema listo para registros
```

Y una tabla mostrando todos tus usuarios con estado **"✅ OK"**

### **Paso 3: Probar con un Registro Nuevo**

1. Abre tu aplicación en modo incógnito
2. Regístrate con un nuevo email de prueba
3. Inicia sesión
4. Deberías ver el dashboard funcionando correctamente

---

## 📊 Monitoreo Continuo (Opcional pero Recomendado)

Para monitorear los registros de tu campaña en tiempo real:

1. Abre el archivo: `supabase/MONITOREO-registros-campana.sql`
2. Ejecuta la **primera query** (QUERY PRINCIPAL) cuando quieras ver todos los registros recientes
3. Ejecuta **ESTADÍSTICAS DE REGISTROS** para ver el rendimiento diario de tu campaña
4. Ejecuta **DETECTAR PROBLEMAS** si sospechas que algo anda mal

---

## 🎯 Queries Rápidas para Copiar/Pegar

### Ver últimos 20 registros y su estado:
```sql
SELECT 
  u.email,
  u.created_at as fecha_registro,
  pl.nombre as plan,
  CASE 
    WHEN p.id IS NULL THEN '❌ Sin perfil'
    WHEN p.plan_id IS NULL THEN '❌ Sin plan'
    ELSE '✅ OK'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY u.created_at DESC
LIMIT 20;
```

### Ver registros de hoy:
```sql
SELECT 
  u.email,
  u.created_at,
  pl.nombre as plan,
  (SELECT COUNT(*) FROM clientes WHERE user_id = u.id) as clientes_creados
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN planes pl ON p.plan_id = pl.id
WHERE DATE(u.created_at) = CURRENT_DATE
ORDER BY u.created_at DESC;
```

### Detectar problemas rápido:
```sql
SELECT COUNT(*) as usuarios_con_problemas
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL OR p.plan_id IS NULL;
```

Si el resultado es **0** = ¡Todo está bien! ✅

---

## ❓ FAQ

**P: ¿Esto afectará a usuarios ya registrados?**  
R: No, solo arregla los que tienen problemas. Los que ya están bien no se tocan.

**P: ¿Tengo que ejecutar esto cada vez que alguien se registra?**  
R: No, solo UNA VEZ. El script corrige el trigger para que funcione automáticamente de ahí en adelante.

**P: ¿Qué pasa con mi usuario de prueba de PayPal?**  
R: Nada, este script solo afecta el plan gratuito. Los usuarios de pago se manejan aparte.

**P: ¿Cuándo debo volver a ejecutar esto?**  
R: Solo si detectas que nuevos registros tienen problemas (ejecuta la query de "Detectar problemas rápido").

---

## 🆘 Si Algo Sale Mal

Si después de ejecutar el script sigues viendo problemas:

1. Ejecuta la query de "Detectar problemas rápido" (arriba)
2. Si muestra usuarios con problemas, copia el resultado
3. Verifica que el plan gratuito existe:
   ```sql
   SELECT * FROM planes WHERE slug = 'free';
   ```
4. Si no existe, ejecuta primero: `supabase/schema-subscriptions.sql`

---

## ✅ Checklist Final

Después de ejecutar todo, verifica:

- [ ] El script se ejecutó sin errores
- [ ] La query de verificación muestra 0 usuarios con problemas
- [ ] Probaste registrando un nuevo usuario y funciona
- [ ] El nuevo usuario puede ver el dashboard
- [ ] El nuevo usuario tiene límites del plan gratuito (5 clientes, 5 préstamos)

---

## 📞 Próximos Pasos

Una vez que esto esté funcionando:

1. ✅ Los registros de Google Ads funcionarán automáticamente
2. 🎯 Puedes enfocarte en optimizar tu campaña
3. 📊 Usa el script de monitoreo para ver conversiones
4. 💰 Cuando quieras, podemos configurar el webhook de PayPal para usuarios de pago

