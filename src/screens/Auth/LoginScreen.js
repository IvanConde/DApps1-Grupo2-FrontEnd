// src/screens/Auth/LoginScreen.js
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { login as loginRequest, me as meRequest } from "../../services/auth";
import { initializeNotificationSystem } from "../../services/notifications";

let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch (e) {
  console.warn(
    "expo-secure-store no instalado. Ejecuta: expo install expo-secure-store"
  );
}

const storageGet = async (key) => {
  if (SecureStore?.getItemAsync) return await SecureStore.getItemAsync(key);
  return await AsyncStorage.getItem(key);
};
const storageSet = async (key, value) => {
  if (SecureStore?.setItemAsync) return await SecureStore.setItemAsync(key, value);
  return await AsyncStorage.setItem(key, value);
};
const storageRemove = async (key) => {
  if (SecureStore?.deleteItemAsync) return await SecureStore.deleteItemAsync(key);
  return await AsyncStorage.removeItem(key);
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const passwordRef = useRef(null);

  const emailIsInvalid =
    email.length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    let isMounted = true;
    const checkBiometricSupport = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const token = await storageGet("token");
        if (isMounted && compatible && enrolled && token)
          setBiometricAvailable(true);
      } catch {
        setBiometricAvailable(false);
      }
    };
    const timer = setTimeout(checkBiometricSupport, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email || !password)
      return setErrorMsg("Ingresá tu email y contraseña.");
    if (emailIsInvalid) return setErrorMsg("El email no es válido.");

    setSubmitting(true);
    try {
      const data = await loginRequest(email.trim(), password);
      
      // Guardar token y usuario ANTES de inicializar notificaciones
      if (data?.token) await storageSet("token", data.token);
      if (data?.user) await storageSet("user", JSON.stringify(data.user));
      
      if (data?.token) {
        // Esperar un momento para asegurar que el token esté guardado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Inicializar sistema de notificaciones después del login exitoso
        try {
          console.log('[Login] Inicializando notificaciones con token guardado');
          await initializeNotificationSystem();
        } catch (error) {
          console.error('[Login] Error inicializando notificaciones:', error);
          // No bloqueamos el login si falla la inicialización de notificaciones
        }
        navigation.replace("Home");
        return;
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      
      if (status === 401) {
        // Credenciales incorrectas - mostrar alert bonito
        setErrorTitle("🔒 Acceso denegado");
        setErrorMessage(apiMsg || "Email o contraseña incorrectos. Por favor verificá tus datos.");
        setShowErrorModal(true);
        setPassword("");
        requestAnimationFrame(() => passwordRef.current?.focus());
      } else if (status === 403) {
        // Cuenta no verificada
        setErrorTitle("⚠️ Verificación requerida");
        setErrorMessage(apiMsg || "Tu cuenta requiere verificación. Revisa tu correo para el código.");
        setShowErrorModal(true);
      } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
        // Error de conexión
        setErrorTitle("📡 Error de conexión");
        setErrorMessage("No se pudo conectar con el servidor. Verificá tu conexión a internet.");
        setShowErrorModal(true);
      } else {
        // Otros errores
        setErrorTitle("❌ Error");
        setErrorMessage(apiMsg || "Ocurrió un error al iniciar sesión. Intenta nuevamente.");
        setShowErrorModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const token = await storageGet("token");
      if (!token) {
        setErrorTitle("⚠️ No hay sesión guardada");
        setErrorMessage("Iniciá sesión normalmente una vez.");
        return setShowErrorModal(true);
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autenticarse con biometría",
        fallbackLabel: "Usar contraseña",
      });
      if (!result.success) {
        setErrorTitle("⚠️ Autenticación cancelada");
        setErrorMessage("No se pudo verificar tu identidad.");
        return setShowErrorModal(true);
      }
      const me = await meRequest();
      if (me?.user) {
        // Inicializar sistema de notificaciones después del login biométrico exitoso
        try {
          await initializeNotificationSystem();
        } catch (error) {
          console.error('[Login] Error inicializando notificaciones:', error);
        }
        navigation.replace("Home");
      } else {
        await storageRemove("token");
        setErrorTitle("⚠️ Sesión inválida");
        setErrorMessage("Tu sesión expiró. Iniciá sesión de nuevo.");
        setShowErrorModal(true);
      }
    } catch (err) {
      const status = err?.response?.status;
      
      // Si es 401 o 404, la sesión es inválida
      if (status === 401 || status === 404) {
        await storageRemove("token");
        setErrorTitle("⚠️ Sesión inválida");
        setErrorMessage("Tu sesión expiró o el usuario ya no existe. Iniciá sesión de nuevo.");
        setShowErrorModal(true);
      } else {
        setErrorTitle("❌ Error");
        setErrorMessage("No se pudo iniciar sesión con biometría.");
        setShowErrorModal(true);
      }
    }
  };

  const goToForgot = () => navigation.navigate("ForgotPassword");
  const goToRegister = () => navigation.navigate("Register");

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🏃‍♀️</Text>
          <Text variant="headlineMedium" style={styles.title}>
            Bienvenido a RitmoFit
          </Text>
          <Text style={styles.subtitle}>
            Tu entrenamiento ideal te está esperando
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          <TextInput
            label="📧 Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
          {emailIsInvalid && (
            <HelperText type="error" visible={emailIsInvalid}>
              Ingresá un email válido.
            </HelperText>
          )}

          <TextInput
            ref={passwordRef}
            label="🔒 Contraseña"
            mode="outlined"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword((p) => !p)}
                forceTextInputFocus={false}
              />
            }
          />

          {!!errorMsg && (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMsg}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={submitting}
            disabled={submitting}
            style={styles.loginButton}
            labelStyle={styles.buttonLabel}
          >
            🚀 Iniciar sesión
          </Button>

          {biometricAvailable && (
            <Button
              mode="outlined"
              icon="fingerprint"
              onPress={handleBiometricLogin}
              style={styles.biometricButton}
              labelStyle={styles.biometricButtonLabel}
            >
              👆 Ingresar con biometría
            </Button>
          )}
        </View>

        <View style={styles.navigationCard}>
          <Text style={styles.navTitle}>¿Necesitas ayuda?</Text>
          <TouchableOpacity onPress={goToForgot} style={styles.navButton}>
            <Text style={styles.navButtonText}>🔑 ¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.newUserText}>¿Nuevo en RitmoFit?</Text>
          <TouchableOpacity onPress={goToRegister} style={styles.registerButton}>
            <Text style={styles.registerButtonText}>✨ Crear cuenta nueva</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de error */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>
              {errorTitle.includes('🔒') ? '🔒' : 
               errorTitle.includes('⚠️') ? '⚠️' : 
               errorTitle.includes('📡') ? '📡' : '❌'}
            </Text>
            <Text style={styles.modalTitle}>
              {errorTitle.replace('🔒', '').replace('⚠️', '').replace('📡', '').replace('❌', '').trim()}
            </Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#FF5252' }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flex: 1 },
  header: {
    backgroundColor: "#4CAF50",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },
  headerIcon: { fontSize: 48, marginBottom: 10 },
  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontSize: 16,
  },
  formCard: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 25,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  input: { backgroundColor: "#fff", marginBottom: 10 },
  errorText: { textAlign: "center", marginBottom: 10, fontSize: 14 },
  loginButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 15,
  },
  buttonLabel: { fontSize: 16, fontWeight: "bold" },
  biometricButton: { borderColor: "#4CAF50", marginBottom: 10 },
  biometricButtonLabel: { color: "#4CAF50", fontSize: 14 },
  navigationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  navButton: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  navButtonText: { color: "#4CAF50", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 20 },
  newUserText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  registerButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
