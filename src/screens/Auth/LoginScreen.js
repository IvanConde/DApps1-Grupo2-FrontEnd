// src/screens/Auth/LoginScreen.js
import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, Alert, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
let SecureStore;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  console.warn('expo-secure-store no instalado. Ejecuta: expo install expo-secure-store');
}

const storageGet = async (key) => {
  if (SecureStore && SecureStore.getItemAsync) return await SecureStore.getItemAsync(key);
  return await AsyncStorage.getItem(key);
};
const storageSet = async (key, value) => {
  if (SecureStore && SecureStore.setItemAsync) return await SecureStore.setItemAsync(key, value);
  return await AsyncStorage.setItem(key, value);
};
const storageRemove = async (key) => {
  if (SecureStore && SecureStore.deleteItemAsync) return await SecureStore.deleteItemAsync(key);
  return await AsyncStorage.removeItem(key);
};
import * as LocalAuthentication from "expo-local-authentication";
import { login as loginRequest } from "../../services/auth";
import api from "../../api/client"; // para validar token
import { me as meRequest } from "../../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const passwordRef = useRef(null);

  const emailIsInvalid =
    email.length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());

  // === 1️⃣ Al cargar, verificar si el dispositivo tiene biometría y si hay token guardado ===
  useEffect(() => {
  let isMounted = true;

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
  const token = await storageGet("token");

      console.log("Biometría compatible:", compatible);
      console.log("Biometría registrada:", enrolled);
      console.log("Token almacenado:", token);

      // Si todo está OK y el componente sigue montado, mostramos el botón
      if (isMounted && compatible && enrolled && token) {
        setBiometricAvailable(true);
      }
    } catch (err) {
      console.log("Error chequeando biometría:", err);
      setBiometricAvailable(false);
    }
  };

  // 🔹 Esperar un poco para asegurar que AsyncStorage esté listo
  const timer = setTimeout(checkBiometricSupport, 500);

  return () => {
    isMounted = false;
    clearTimeout(timer);
  };
}, []);




  // === 2️⃣ Iniciar sesión normal (email + password) ===
  const handleLogin = async () => {
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Ingresá tu email y contraseña.");
      return;
    }
    if (emailIsInvalid) {
      setErrorMsg("El email no es válido.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginRequest(email.trim(), password);

      // 🔸 Ir siempre a verificación OTP luego del login correcto
      if (data?.user) {
        navigation.navigate("VerifyOtp", { email });
        return;
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg =
        err?.response?.data?.message || err?.response?.data?.error;

      if (status === 401) {
        setErrorMsg(apiMsg || "Email o contraseña incorrectos.");
        setPassword("");
        requestAnimationFrame(() => passwordRef.current?.focus());
      } else if (status === 403) {
        navigation.navigate("VerifyOtp", { email });
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
    if (!token) {
      Alert.alert("No hay sesión guardada", "Iniciá sesión normalmente una vez.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Autenticarse con biometría",
      fallbackLabel: "Usar contraseña",
    });

    if (!result.success) {
      Alert.alert("Autenticación cancelada", "No se pudo verificar tu identidad.");
      return;
    }

    // ✅ Usar la función centralizada me() que usa el interceptor y la ruta correcta
    const me = await meRequest();

    if (me?.user) {
      navigation.replace("Home");
    } else {
      await storageRemove("token");
      Alert.alert("Sesión inválida", "Tu sesión expiró. Iniciá sesión de nuevo.");
    }
  } catch (err) {
    console.error("Biometric login error:", err);
    Alert.alert("Error", "No se pudo iniciar sesión con biometría.");
  }
};


  const goToForgot = () => navigation.navigate("ForgotPassword");
  const goToRegister = () => navigation.navigate("Register");

  return (
    <ScrollView style={styles.container}>
      {/* Header con estilo coherente */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🏃‍♀️</Text>
        <Text variant="headlineMedium" style={styles.title}>
          Bienvenido a RitmoFit
        </Text>
        <Text style={styles.subtitle}>
          Tu entrenamiento ideal te está esperando
        </Text>
      </View>

      {/* Formulario en card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Iniciar Sesión</Text>

        <View style={styles.inputContainer}>
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
            <HelperText type="error" visible={emailIsInvalid} style={styles.errorText}>
              Ingresá un email válido.
            </HelperText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            ref={passwordRef}
            label="🔒 Contraseña"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
        </View>

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

        {/* Botón biométrico visible solo si hay token guardado */}
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

      {/* Card de navegación */}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 5,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    borderColor: '#4CAF50',
    marginBottom: 10,
  },
  biometricButtonLabel: {
    color: '#4CAF50',
    fontSize: 14,
  },
  navigationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  navButton: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  navButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  newUserText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
