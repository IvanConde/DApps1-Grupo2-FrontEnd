// App.js
import React, { useEffect } from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";

import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
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

  return (
    <PaperProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
