// src/screens/Auth/LoginScreen.js
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { login as loginRequest, me as meRequest } from "../../services/auth";

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
      // If login returns token + user, persist and go to Home
      if (data?.token) await storageSet("token", data.token);
      if (data?.user) await storageSet("user", JSON.stringify(data.user));
      if (data?.token) {
        navigation.replace("Home");
        return;
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (status === 401) {
        setErrorMsg(apiMsg || "Email o contraseña incorrectos.");
        setPassword("");
        requestAnimationFrame(() => passwordRef.current?.focus());
      } else if (status === 403) {
        // Previously this redirected to VerifyOtp. Now we show a clear message
        setErrorMsg(apiMsg || "Tu cuenta requiere verificación. Revisa tu correo para el código.");
      } else {
        setErrorMsg(apiMsg || "Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const token = await storageGet("token");
      if (!token)
        return Alert.alert(
          "No hay sesión guardada",
          "Iniciá sesión normalmente una vez."
        );
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autenticarse con biometría",
        fallbackLabel: "Usar contraseña",
      });
      if (!result.success)
        return Alert.alert(
          "Autenticación cancelada",
          "No se pudo verificar tu identidad."
        );
      const me = await meRequest();
      if (me?.user) navigation.replace("Home");
      else {
        await storageRemove("token");
        Alert.alert(
          "Sesión inválida",
          "Tu sesión expiró. Iniciá sesión de nuevo."
        );
      }
    } catch (err) {
      console.error("Biometric login error:", err);
      Alert.alert("Error", "No se pudo iniciar sesión con biometría.");
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
});
