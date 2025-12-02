// App.js
import React, { useEffect, useRef } from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";

import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  initializeNotificationSystem, 
  setupNotificationResponseListener,
  startNotificationPolling,
  stopNotificationPolling,
} from "./src/services/notifications";

export default function App() {
  const navigationRef = useRef(null);

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
  }, []);

  // Configurar listener de notificaciones y long polling
  useEffect(() => {
    let notificationListener;

    const setupNotificationListener = async () => {
      try {
        // Configurar el listener para cuando el usuario toque una notificación
        if (navigationRef.current) {
          notificationListener = setupNotificationResponseListener(navigationRef);
        }
        
        // Iniciar long polling automático cada 5 minutos
        startNotificationPolling();
        
        console.log('[App] Sistema de notificaciones configurado con long polling');
      } catch (error) {
        console.error('[App] Error configurando listener de notificaciones:', error);
      }
    };

    setupNotificationListener();

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      // Detener polling al cerrar la app
      stopNotificationPolling();
    };
  }, []);

  return (
    <PaperProvider>
      <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
