// App.js
import React, { useEffect, useRef, useState } from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";

import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/services/notifications';

export default function App() {
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const ASKED_FLAG = "askedPermissionsV3"; // cambialo si necesitás re-preguntar en una futura versión

    const askOnFirstLaunch = async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(ASKED_FLAG);
        if (alreadyAsked) return; // ya se pidió antes; no hacemos nada

        // 1) Cámara
        try {
          await Camera.requestCameraPermissionsAsync();
          // No hace falta guardar nada: seguimos igual aunque niegue
        } catch (e) {
          // ignoramos errores de permiso
        }

        // Marcamos que ya preguntamos
        await AsyncStorage.setItem(ASKED_FLAG, "1");
      } catch (e) {
        // En caso de error, no bloqueamos nada
      }
    };

    askOnFirstLaunch();

    // Registrar para notificaciones push
    registerForPushNotificationsAsync().catch(err => {
      console.error('Error registrando notificaciones:', err);
    });

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notificación recibida:', notification);
      setNotification(notification);
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notificación tocada:', response);
      // Aquí puedes navegar a una pantalla específica según el tipo de notificación
      const data = response.notification.request.content.data;
      if (data?.type === 'class-reminder') {
        // Navegar a mis reservas o detalle de clase
        console.log('Navegar a clase:', data.classId);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <PaperProvider>
      <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
