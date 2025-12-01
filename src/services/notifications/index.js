// src/services/notifications/index.js
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import api from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Configuración de cómo se mostrarán las notificaciones cuando la app está en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Mantener por compatibilidad
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Solicita permisos para mostrar notificaciones locales
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Permisos de notificaciones denegados');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error solicitando permisos de notificaciones:', error);
    return false;
  }
}

/**
 * Obtiene notificaciones del backend y las muestra como notificaciones locales
 */
export async function fetchAndShowNotifications() {
  try {
    // Verificar si hay token antes de hacer la petición (intentar ambos storages)
    let token = null;
    try {
      // Intentar SecureStore primero
      const SecureStore = require('expo-secure-store');
      if (SecureStore?.getItemAsync) {
        token = await SecureStore.getItemAsync('token');
      }
    } catch (e) {
      // SecureStore no disponible
    }
    
    // Si no hay token en SecureStore, intentar AsyncStorage
    if (!token) {
      token = await AsyncStorage.getItem('token');
    }
    
    if (!token) {
      console.log('[Notifications] No hay usuario autenticado, omitiendo consulta');
      return 0;
    }
    
    console.log('[Notifications] 📡 Consultando notificaciones pendientes... (Token encontrado)');
    
    const response = await api.get('/notifications');
    const notifications = response.data || [];
    
    console.log(`[Notifications] ✅ Recibidas ${notifications.length} notificaciones:`, 
      JSON.stringify(notifications, null, 2));
    
    // Mostrar cada notificación localmente
    let shown = 0;
    for (const notif of notifications) {
      try {
        console.log(`[Notifications] 📬 Mostrando notificación ID ${notif.id}: "${notif.title}"`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notif.title || 'RitmoFit',
            body: notif.body || '',
            data: {
              ...notif.data,
              notificationId: notif.id,
              type: notif.type,
            },
          },
          trigger: null, // Mostrar inmediatamente
        });
        shown++;
        console.log(`[Notifications] ✅ Notificación ${notif.id} programada correctamente`);
      } catch (err) {
        console.error(`[Notifications] ❌ Error mostrando notificación ${notif.id}:`, err);
      }
    }
    
    console.log(`[Notifications] 🎯 Total mostradas: ${shown}/${notifications.length}`);
    return notifications.length;
  } catch (error) {
    console.error('[Notifications] ❌ Error fetching notifications:', error);
    console.error('[Notifications] Error details:', error.response?.data);
    // No lanzamos error para que el background task no falle
    return 0;
  }
}

/**
 * Registra la tarea en background que ejecutará el long polling cada 15 minutos
 */
export async function registerBackgroundTask() {
  try {
    // Definir la tarea
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
      try {
        console.log('[Background Task] Ejecutando verificación de notificaciones');
        await fetchAndShowNotifications();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[Background Task] Error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Registrar la tarea para ejecutarse cada 15 minutos
    const status = await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: 15 * 60, // 15 minutos en segundos
      stopOnTerminate: false, // Continuar después de cerrar la app
      startOnBoot: true, // Iniciar al reiniciar el dispositivo
    });
    
    console.log('[Notifications] Background task registrada:', status);
    await AsyncStorage.setItem('notificationsTaskRegistered', 'true');
    return true;
  } catch (error) {
    console.error('[Notifications] Error registrando background task:', error);
    return false;
  }
}

/**
 * Desregistra la tarea en background
 */
export async function unregisterBackgroundTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    await AsyncStorage.removeItem('notificationsTaskRegistered');
    console.log('[Notifications] Background task desregistrada');
    return true;
  } catch (error) {
    console.error('[Notifications] Error desregistrando background task:', error);
    return false;
  }
}

/**
 * Verifica si la tarea en background está registrada
 */
export async function isBackgroundTaskRegistered() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    return isRegistered;
  } catch (error) {
    console.error('[Notifications] Error verificando task registration:', error);
    return false;
  }
}

/**
 * Configura el listener para manejar cuando el usuario toca una notificación
 * @param {Function} navigationRef - Referencia de navegación de React Navigation
 */
export function setupNotificationResponseListener(navigationRef) {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    try {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Usuario tocó notificación:', data);
      
      // Navegar según el tipo de notificación
      if (data.type === 'rate_class' && data.historyId) {
        // Para notificaciones de calificar clase, ir directamente al historial
        // El HistoryScreen mostrará el botón de calificación si es elegible
        navigationRef.current?.navigate('History');
      } else if (data.classId) {
        navigationRef.current?.navigate('ClassDetail', {
          classId: data.classId,
          fromNotification: true,
        });
      } else if (data.reservationId) {
        // Si solo tenemos reservationId, ir a "Mis Reservas"
        navigationRef.current?.navigate('MyReservations');
      }
    } catch (error) {
      console.error('[Notifications] Error manejando respuesta de notificación:', error);
    }
  });
  
  return subscription;
}

/**
 * Inicializa el sistema completo de notificaciones
 * - Solicita permisos
 * - Configura el background task
 * - Hace una primera consulta inmediata
 */
export async function initializeNotificationSystem() {
  try {
    console.log('[Notifications] Inicializando sistema de notificaciones...');
    
    // 1. Solicitar permisos
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('[Notifications] No se obtuvieron permisos, sistema deshabilitado');
      return false;
    }
    
    // 2. Verificar si ya está registrada la tarea
    const alreadyRegistered = await isBackgroundTaskRegistered();
    if (!alreadyRegistered) {
      await registerBackgroundTask();
    } else {
      console.log('[Notifications] Background task ya estaba registrada');
    }
    
    // 3. Hacer una primera consulta inmediata
    await fetchAndShowNotifications();
    
    console.log('[Notifications] Sistema inicializado correctamente');
    return true;
  } catch (error) {
    console.error('[Notifications] Error inicializando sistema:', error);
    return false;
  }
}

/**
 * Hook personalizado para usar en componentes (opcional)
 */
export function useNotifications(navigationRef) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  React.useEffect(() => {
    let responseListener;
    
    const setup = async () => {
      // Inicializar sistema
      const success = await initializeNotificationSystem();
      setIsInitialized(success);
      
      // Configurar listener de respuestas
      if (navigationRef && success) {
        responseListener = setupNotificationResponseListener(navigationRef);
      }
    };
    
    setup();
    
    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [navigationRef]);
  
  return { isInitialized };
}
