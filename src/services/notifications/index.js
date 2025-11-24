// src/services/notifications/index.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import client from '../../api/client';

// Configuración del comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registrar el dispositivo para recibir notificaciones push
 * @returns {Promise<string|null>} Push token o null si falla
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('No se obtuvieron permisos para notificaciones push');
      return null;
    }
    
    try {
      // Intentar obtener el projectId de app.json automáticamente
      const projectId = require('../../../app.json').expo?.extra?.eas?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined, // Usar projectId si existe, sino undefined para usar el default
      })).data;
      console.log('Push token obtenido:', token);
    } catch (error) {
      console.error('Error obteniendo push token:', error);
    }
  } else {
    console.log('Debe usar un dispositivo físico para notificaciones push');
  }

  return token;
}

/**
 * Enviar el push token al backend para guardarlo
 * @param {string} pushToken - Token de Expo Push Notifications
 */
export async function savePushTokenToBackend(pushToken) {
  try {
    if (!pushToken) {
      console.log('No hay push token para guardar');
      return;
    }

    const response = await client.post('/users/push-token', {
      pushToken,
      platform: Platform.OS,
    });
    
    console.log('Push token guardado en backend:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error guardando push token:', error);
    throw error;
  }
}

/**
 * Eliminar el push token del backend (para logout)
 */
export async function removePushTokenFromBackend() {
  try {
    await client.delete('/users/push-token');
    console.log('Push token eliminado del backend');
  } catch (error) {
    console.error('Error eliminando push token:', error);
  }
}

/**
 * Programar una notificación local (para testing)
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {number} seconds - Segundos hasta que se dispare
 */
export async function scheduleLocalNotification(title, body, seconds = 5) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'local' },
    },
    trigger: { seconds },
  });
}
