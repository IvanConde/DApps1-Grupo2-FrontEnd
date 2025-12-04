// App.js
import React, { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { ConnectivityProvider, useConnectivity } from "./src/context/ConnectivityContext";
import OfflineScreen from "./src/screens/Offline/OfflineScreen";

const AppContent = ({ navigationRef }) => {
  const { isOffline, retryBackendConnection, checkingBackend } = useConnectivity();
  const wasOfflineRef = useRef(false);

  // Detectar cuando se recupera la conexión y navegar a Home
  useEffect(() => {
    if (wasOfflineRef.current && !isOffline) {
      // Se recuperó la conexión - navegar a Home
      if (navigationRef.current) {
        navigationRef.current.navigate('Home');
      }
    }
    wasOfflineRef.current = isOffline;
  }, [isOffline, navigationRef]);

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

  // Inicializar sistema completo de notificaciones (una sola vez)
  useEffect(() => {
    let notificationListener;

    const setupNotifications = async () => {
      try {
        // 1. Inicializar sistema (permisos + background task + primera consulta)
        const ok = await initializeNotificationSystem();
        console.log('[App] initializeNotificationSystem ->', ok ? 'ok' : 'no-perms-or-error');
        
        // 2. Configurar listener para cuando el usuario toque una notificación
        if (navigationRef.current) {
          notificationListener = setupNotificationResponseListener(navigationRef);
        }
        
        // 3. Iniciar long polling automático cada 15 minutos
        // (NO hace consulta inmediata porque initializeNotificationSystem ya lo hizo)
        startNotificationPolling();
        
        console.log('[App] Sistema de notificaciones configurado completamente');
      } catch (error) {
        console.error('[App] Error configurando notificaciones:', error);
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      // Detener polling al cerrar la app
      stopNotificationPolling();
    };
  }, [navigationRef]);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      {isOffline && (
        <OfflineScreen
          checking={checkingBackend}
          onRetry={retryBackendConnection}
        />
      )}
    </>
  );
};

export default function App() {
  const navigationRef = useRef(null);

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <ConnectivityProvider>
          <AppContent navigationRef={navigationRef} />
        </ConnectivityProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
