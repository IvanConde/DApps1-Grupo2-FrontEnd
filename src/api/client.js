import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch (e) {
  // no-op: si no está instalado, usamos AsyncStorage
}

const api = axios.create({
  baseURL: "http://192.168.0.158:4000/api", // <- reemplazá TU_IP_LOCAL si hace falta
  timeout: 5000,
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

export default api;
