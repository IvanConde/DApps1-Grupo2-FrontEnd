# 🚀 Instrucciones de Deployment - Sistema de Notificaciones

## Pasos para poner en marcha el sistema

### 1. Instalar nuevas dependencias

```bash
npm install
```

Esto instalará:
- `expo-task-manager@~13.0.1`
- `expo-background-fetch@~14.0.3`

### 2. Reconstruir la app (IMPORTANTE)

⚠️ **NO FUNCIONA CON EXPO GO** - Necesitás un Development Build porque usamos módulos nativos.

#### Android:
```bash
# Opción 1: Build local (requiere Android Studio)
npx expo run:android

# Opción 2: Build en la nube (requiere cuenta EAS)
npx eas build --profile development --platform android
```

#### iOS:
```bash
# Opción 1: Build local (requiere Xcode y Mac)
npx expo run:ios

# Opción 2: Build en la nube (requiere cuenta EAS)
npx eas build --profile development --platform ios
```

### 3. Verificar configuración del backend

En `src/api/client.js`, asegurate de que la URL apunte a tu servidor:

```javascript
baseURL: "http://TU_IP:4000/api",
```

**Para encontrar tu IP:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

### 4. Primera ejecución

Al abrir la app:
1. Se solicitarán permisos de notificaciones → **Aceptar**
2. El sistema se inicializará automáticamente
3. Se registrará el background task de 15 minutos
4. Se hará una primera consulta inmediata al backend

## 🧪 Testing

### Test 1: Notificación local de prueba

Agregá el panel de debug en `HomeScreen.js` (temporal):

```javascript
import NotificationDebugPanel from '../../services/notifications/testNotifications';

// En el JSX de HomeScreen:
<NotificationDebugPanel />
```

Usá el botón "📱 Mostrar notificación de prueba" para verificar que las notificaciones funcionen.

### Test 2: Consulta al backend

1. Presioná "🔄 Consultar notificaciones ahora"
2. Verificá en los logs de Metro si hay notificaciones
3. Deberías ver en consola: `[Notifications] Recibidas X notificaciones`

### Test 3: Recordatorio 1h antes

1. Reservá una clase que empiece en aproximadamente 1 hora
2. Esperá a que el background task se ejecute (o forzalo con el botón de debug)
3. Deberías recibir una notificación con el recordatorio

### Test 4: Clase reprogramada

Desde Postman o similar:

```bash
# PUT /api/classes/1
curl -X PUT http://TU_IP:4000/api/classes/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2025-12-01",
    "hora": "20:00:00"
  }'
```

Luego consultá notificaciones y deberías ver la notificación de reprogramación.

### Test 5: Deep linking

1. Recibí una notificación
2. Tocá en la notificación
3. La app debería abrirse y navegar automáticamente a `ClassDetail`

## 📋 Checklist de verificación

Antes de considerar el sistema funcionando, verificá:

- [ ] Los permisos de notificaciones están otorgados
- [ ] El background task está registrado (verificar con el panel de debug)
- [ ] Las notificaciones locales de prueba se muestran correctamente
- [ ] La consulta manual al backend trae notificaciones
- [ ] Al tocar una notificación, navega correctamente
- [ ] El backend responde correctamente en `/api/notifications`

## 🐛 Troubleshooting común

### "No se muestran notificaciones"

**Solución 1:** Verificar permisos
```javascript
import * as Notifications from 'expo-notifications';
const { status } = await Notifications.getPermissionsAsync();
console.log('Permisos:', status); // Debe ser 'granted'
```

**Solución 2:** Verificar que el backend esté corriendo
```bash
curl http://TU_IP:4000/api/notifications \
  -H "Authorization: Bearer TU_TOKEN"
```

### "Background task no se ejecuta"

**Causa:** Estás usando Expo Go  
**Solución:** Necesitás un development build (ver paso 2)

**Verificar registro:**
```javascript
import * as TaskManager from 'expo-task-manager';
const isRegistered = await TaskManager.isTaskRegisteredAsync('BACKGROUND_NOTIFICATION_TASK');
console.log('Registrada:', isRegistered); // Debe ser true
```

### "Error 401 en /api/notifications"

**Causa:** El token JWT expiró o no se está enviando  
**Solución:** Cerrá sesión y volvé a iniciar sesión

### "Las notificaciones llegan pero no navega al tocar"

**Causa:** El listener no está configurado correctamente  
**Solución:** Verificá que `App.js` tenga la referencia de navegación:

```javascript
const navigationRef = useRef(null);
<NavigationContainer ref={navigationRef}>
```

## 📱 Testing en dispositivos reales

### Android

1. Construí la APK:
```bash
npx eas build --profile development --platform android
```

2. Descargá e instalá la APK en tu dispositivo

3. Para testing de background:
```bash
# Conectá el dispositivo por USB
adb devices

# Verificá logs
adb logcat | grep -i "notifications"
```

### iOS

1. Construí la app:
```bash
npx eas build --profile development --platform ios
```

2. Instalá usando TestFlight o directamente desde Xcode

3. Para simular background fetch (solo en Simulator):
   - Debug > Simulate Background Fetch

## 🎯 Casos de uso para demostrar

### Demo 1: Recordatorio de clase
1. Creá una reserva para una clase que empiece en 1 hora
2. Esperá o forzá la consulta
3. Mostrá la notificación recibida
4. Tocá la notificación y mostrá que navega al detalle

### Demo 2: Clase reprogramada
1. Tené una clase reservada
2. Modificá la clase desde el backend (PUT)
3. Consultá notificaciones
4. Mostrá la notificación con los horarios viejos y nuevos

### Demo 3: Clase cancelada
1. Tené una clase reservada
2. Eliminá la clase desde el backend (DELETE)
3. Consultá notificaciones
4. Mostrá que la reserva fue cancelada

## 📊 Logs útiles para debugging

Todos los logs del sistema usan prefijos identificables:

```
[Notifications] Inicializando sistema de notificaciones...
[Notifications] Recibidas 3 notificaciones
[Notifications] Background task registrada
[Background Task] Ejecutando verificación de notificaciones
[App] Error configurando notificaciones: ...
```

Para ver solo logs de notificaciones en Metro:
```bash
# Los logs aparecerán automáticamente en la consola de Metro
```

## 🔄 Reinstalación limpia

Si tenés problemas persistentes:

```bash
# 1. Limpiar cache
npx expo start -c

# 2. Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# 3. Reconstruir
npx expo run:android  # o ios
```

## 📞 Soporte

Si tenés problemas, verificá:

1. **Logs de Metro** - Buscá errores en rojo
2. **Logs del backend** - Verificá que `/api/notifications` responda
3. **Permisos del sistema** - Settings > Apps > TuApp > Permissions
4. **Versión de Expo** - Asegurate de estar en SDK 54+

## ✅ Próximos pasos

Una vez que el sistema funcione:

1. Remové el `NotificationDebugPanel` de las screens
2. Considerá agregar un centro de notificaciones in-app
3. Implementá badge counters para notificaciones no leídas
4. Agregá preferencias de usuario para tipos de notificación

---

**¡El sistema está listo para usar!** 🎉
