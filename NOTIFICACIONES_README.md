# Sistema de Notificaciones RitmoFit - Frontend

## Descripción

Sistema de notificaciones implementado usando **long polling** con `expo-notifications` (notificaciones locales) y `expo-background-fetch` para ejecutar consultas periódicas cada 15 minutos.

## Características

✅ **Notificaciones locales** - Sin dependencias de servicios externos (Firebase, OneSignal, etc.)  
✅ **Long polling** - Consulta al backend cada 15 minutos en background  
✅ **Deep linking** - Navegación automática al detalle de clase/reserva al tocar la notificación  
✅ **3 tipos de notificaciones**:
- `reminder_1h` - Recordatorio 1 hora antes de una clase
- `class_rescheduled` - Notificación cuando se reprograma una clase
- `class_cancelled` - Notificación cuando se cancela una clase

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

Esto instalará las nuevas dependencias agregadas:
- `expo-notifications` (ya estaba instalada)
- `expo-task-manager@~13.0.1`
- `expo-background-fetch@~14.0.3`

### 2. Reconstruir el proyecto (Development Build)

Como estamos usando `expo-task-manager` y `expo-background-fetch`, necesitás un **development build** (NO funciona con Expo Go):

```bash
# Para Android
npx expo run:android

# Para iOS
npx expo run:ios
```

### 3. Configurar la URL del backend

Asegurate de que en `src/api/client.js` la `baseURL` apunte a tu servidor backend:

```javascript
baseURL: "http://TU_IP_LOCAL:4000/api",
```

## Cómo funciona

### Flujo de notificaciones

1. **Al iniciar la app** (`App.js`):
   - Solicita permisos de notificaciones
   - Registra el background task
   - Hace una primera consulta inmediata a `/api/notifications`
   - Configura el listener para manejar toques en notificaciones

2. **Cada 15 minutos** (background task):
   - Ejecuta `GET /api/notifications` con el JWT del usuario
   - Por cada notificación recibida, muestra una notificación local
   - Incluye el `data` de la notificación para deep linking

3. **Al tocar una notificación**:
   - Navega automáticamente a `ClassDetail` si hay `classId`
   - Navega a `MyReservations` si solo hay `reservationId`

### Estructura del código

```
src/services/notifications/
└── index.js          # Servicio principal de notificaciones

Funciones principales:
├── initializeNotificationSystem()      # Inicializa todo el sistema
├── fetchAndShowNotifications()         # Consulta y muestra notificaciones
├── registerBackgroundTask()            # Registra tarea de 15 min
├── setupNotificationResponseListener() # Configura deep linking
└── useNotifications()                  # Hook opcional para componentes
```

## Uso

### Inicialización (ya implementado en App.js)

```javascript
import { 
  initializeNotificationSystem, 
  setupNotificationResponseListener 
} from "./src/services/notifications";

// En el componente principal
useEffect(() => {
  let notificationListener;

  const setupNotifications = async () => {
    await initializeNotificationSystem();
    notificationListener = setupNotificationResponseListener(navigationRef);
  };

  setupNotifications();

  return () => {
    if (notificationListener) {
      notificationListener.remove();
    }
  };
}, []);
```

### Formato de respuesta del backend

El backend debe devolver un array JSON en `GET /api/notifications`:

```json
[
  {
    "id": 123,
    "type": "reminder_1h",
    "title": "Recordatorio de clase",
    "body": "Tenés tu clase de Funcional 18:00 en Palermo dentro de 1 hora.",
    "data": {
      "reservationId": 10,
      "classId": 5,
      "name": "Funcional 18:00",
      "discipline": "Funcional",
      "sede": "Palermo",
      "fecha": "2025-11-24",
      "hora": "18:00:00"
    },
    "created_at": "2025-11-24T16:55:00Z"
  }
]
```

## Testing

### Probar notificaciones en desarrollo

1. **Forzar una consulta inmediata**:
   Podés llamar manualmente a la función desde cualquier componente:
   
   ```javascript
   import { fetchAndShowNotifications } from '../services/notifications';
   
   // En un botón de prueba
   <Button onPress={fetchAndShowNotifications} title="Probar notificaciones" />
   ```

2. **Crear notificaciones de prueba en el backend**:
   - Reservá una clase que empiece en ~1 hora → Generará `reminder_1h`
   - Modificá una clase con `PUT /api/classes/:id` → Generará `class_rescheduled`
   - Eliminá una clase con `DELETE /api/classes/:id` → Generará `class_cancelled`

3. **Verificar logs**:
   Los logs del sistema aparecen con prefijos:
   - `[Notifications]` - Eventos del sistema de notificaciones
   - `[Background Task]` - Ejecución del polling de 15 min

### Probar background fetch en iOS

Para probar en iOS Simulator:
```bash
# En el menú Debug > Simulate Background Fetch
```

### Probar background fetch en Android

En Android, el sistema ejecutará la tarea automáticamente. Para forzar una ejecución:
```bash
adb shell cmd jobscheduler run -f <package-name> <job-id>
```

## Permisos necesarios

### Android (app.json / app.config.js)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM"
      ]
    }
  }
}
```

### iOS (app.json / app.config.js)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": [
          "fetch",
          "remote-notification"
        ]
      }
    }
  }
}
```

## Troubleshooting

### Las notificaciones no se muestran

1. Verificá que tenés permisos:
   ```javascript
   import * as Notifications from 'expo-notifications';
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Permisos:', status);
   ```

2. Verificá que el backend esté devolviendo notificaciones:
   ```bash
   curl -H "Authorization: Bearer TU_TOKEN" http://IP:4000/api/notifications
   ```

3. Revisá los logs en Metro bundler

### El background task no se ejecuta

1. Asegurate de estar usando un **development build** (no Expo Go)
2. Verificá que la tarea esté registrada:
   ```javascript
   import * as TaskManager from 'expo-task-manager';
   const isRegistered = await TaskManager.isTaskRegisteredAsync('BACKGROUND_NOTIFICATION_TASK');
   console.log('Task registrada:', isRegistered);
   ```

3. En Android, forzá la ejecución:
   ```bash
   adb shell cmd jobscheduler run -f com.yourapp <job-id>
   ```

### Error de autenticación en el background

El token JWT se obtiene automáticamente del interceptor de axios en `src/api/client.js`. Si el usuario cierra sesión, las consultas en background fallarán silenciosamente (sin crash).

## Mejoras futuras

- [ ] Agregar badge count (número de notificaciones no leídas)
- [ ] Implementar categorías de notificaciones (permite acciones rápidas)
- [ ] Agregar sonidos personalizados por tipo de notificación
- [ ] Implementar centro de notificaciones dentro de la app
- [ ] Permitir deshabilitar notificaciones por tipo

## Recursos

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Task Manager Docs](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Expo Background Fetch Docs](https://docs.expo.dev/versions/latest/sdk/background-fetch/)
