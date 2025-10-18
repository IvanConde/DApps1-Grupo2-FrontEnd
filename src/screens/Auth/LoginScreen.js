// src/screens/Auth/LoginScreen.js
import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { login as loginRequest } from "../../services/auth";
import api from "../../api/client"; // para validar token

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
      const token = await AsyncStorage.getItem("token");

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
    const token = await AsyncStorage.getItem("token");
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

    // ✅ No pases headers manuales. El interceptor ya envía Authorization: Bearer <token>
    const res = await api.get("/me");

    if (res.status === 200 && res.data?.user) {
      navigation.replace("Home");
    } else {
      await AsyncStorage.removeItem("token");
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
    <View style={{ flex: 1, padding: 20, justifyContent: "flex-start", gap: 12 }}>
      <Text
        variant="headlineMedium"
        style={{ marginBottom: 8, fontWeight: "600" }}
      >
        Iniciar sesión en RitmoFit
      </Text>

      <TextInput
        label="Email"
        mode="outlined"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {emailIsInvalid && (
        <HelperText type="error" visible={emailIsInvalid}>
          Ingresá un email válido.
        </HelperText>
      )}

      <TextInput
        ref={passwordRef}
        label="Contraseña"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {!!errorMsg && (
        <HelperText type="error" visible>
          {errorMsg}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={submitting}
        disabled={submitting}
      >
        Iniciar sesión
      </Button>

      {/* 4️⃣ Botón biométrico visible solo si hay token guardado */}
      {biometricAvailable && (
        <Button
          mode="outlined"
          icon="fingerprint"
          onPress={handleBiometricLogin}
          style={{ marginTop: 8 }}
        >
          Ingresar con biometría
        </Button>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <TouchableOpacity onPress={goToForgot}>
          <Text style={{ textDecorationLine: "underline" }}>
            Ha olvidado su contraseña
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToRegister}>
          <Text style={{ textDecorationLine: "underline" }}>Registrarse</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
