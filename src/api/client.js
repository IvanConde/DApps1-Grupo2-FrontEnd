import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from '@env';
import { notifyBackendOffline, notifyBackendOnline } from "../utils/networkEvents";

let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch (e) {
  // no-op: si no está instalado, usamos AsyncStorage
}

const api = axios.create({
  baseURL: API_BASE_URL || "http://192.168.0.158:4000/api", // Fallback si no hay .env
  timeout: 5000,
  // Evitar que axios muestre warnings en consola
  validateStatus: (status) => status < 600, // Acepta cualquier status < 600
});

async function getToken() {
  try {
    if (SecureStore && SecureStore.getItemAsync) {
      const t = await SecureStore.getItemAsync("token");
      if (t) return t;
    }
  } catch (e) {
    console.warn("Error leyendo token desde SecureStore", e);
  }
  try {
    return await AsyncStorage.getItem("token");
  } catch (e) {
    console.warn("Error leyendo token desde AsyncStorage", e);
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor de respuesta para convertir errores HTTP en rechazos controlados
api.interceptors.response.use(
  (response) => {
    // Si el status es error pero validateStatus lo aceptó, lo convertimos en rechazo
    if (response.status >= 400) {
      const error = new Error(response.data?.message || response.data?.error || 'Request failed');
      error.response = response;
      error.config = response.config;
      
      // No logear errores HTTP esperados ni errores de autenticación
      // Solo loguear errores inesperados del servidor (500+)
      if (response.status >= 500) {
        console.error('[API Server Error]', {
          url: response.config?.url,
          status: response.status,
          message: response.data?.error || response.data?.message
        });
      }
      
        notifyBackendOnline();
        return Promise.reject(error);
    }
    notifyBackendOnline();
    return response;
  },
  (error) => {
    // Errores de red o timeouts
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      // Error de red esperado - no loguear para evitar ruido en consola
      notifyBackendOffline();
    } else {
      // Otros errores inesperados sí se loguean
      console.error('[API Unexpected Error]', error.message);
      notifyBackendOnline();
    }
    
    return Promise.reject(error);
  }
);

export default api;
