// src/screens/Auth/RegisterScreen.js
import React, { useState, useRef, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Snackbar,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { register as registerRequest } from "../../services/auth";

let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch (e) {
  console.warn(
    "expo-secure-store no instalado. Ejecuta: expo install expo-secure-store"
  );
}

const storageSet = async (key, value) => {
  if (SecureStore?.setItemAsync) return await SecureStore.setItemAsync(key, value);
  return await AsyncStorage.setItem(key, value);
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const pass2Ref = useRef(null);

  const emailInvalid = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsDontMatch = password2.length > 0 && password !== password2;

  useEffect(() => {
    let t;
    if (snackbarVisible) {
      t = setTimeout(() => {
        setSnackbarVisible(false);
        navigation.goBack();
      }, 2000);
    }
    return () => clearTimeout(t);
  }, [snackbarVisible]);

  const handleRegister = async () => {
    setErrorMsg("");
    if (!name || !email || !password || !password2)
      return setErrorMsg("Completá todos los campos.");
    if (emailInvalid) return setErrorMsg("El email no es válido.");
    if (passwordTooShort)
      return setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
    if (password !== password2) {
      setErrorMsg("Las contraseñas no coinciden.");
      requestAnimationFrame(() => pass2Ref.current?.focus());
      return;
    }

    setSubmitting(true);
    try {
      const data = await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Don't store token yet. Require OTP verification after registration.
      setShowSuccessModal(true);
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      
      if (status === 409) {
        setErrorTitle("⚠️ Email en uso");
        setErrorMessage(apiMsg || "Ese email ya está registrado. Intentá iniciar sesión.");
        setShowErrorModal(true);
      } else if (status === 400) {
        setErrorTitle("❌ Datos inválidos");
        setErrorMessage(apiMsg || "Los datos ingresados no son válidos. Revisá e intentá nuevamente.");
        setShowErrorModal(true);
      } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
        setErrorTitle("📡 Error de conexión");
        setErrorMessage("No se pudo conectar con el servidor. Verificá tu conexión a internet.");
        setShowErrorModal(true);
      } else {
        setErrorTitle("❌ Error");
        setErrorMessage(apiMsg || "No se pudo completar el registro. Intenta nuevamente.");
        setShowErrorModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => navigation.navigate("Login");

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌟</Text>
          <Text variant="headlineMedium" style={styles.title}>
            ¡Únete a RitmoFit!
          </Text>
          <Text style={styles.subtitle}>
            Crea tu cuenta y comienza tu aventura fitness
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Crear Cuenta</Text>

          <TextInput
            label="👤 Nombre completo"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />

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
          {emailInvalid && (
            <HelperText type="error" visible={emailInvalid}>
              Ingresá un email válido.
            </HelperText>
          )}

          <TextInput
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
                onPress={() => setShowPassword(!showPassword)}
                forceTextInputFocus={false}
              />
            }
          />
          {passwordTooShort && (
            <HelperText type="error" visible={passwordTooShort}>
              Debe tener al menos 6 caracteres.
            </HelperText>
          )}

          <TextInput
            ref={pass2Ref}
            label="🔐 Confirmar contraseña"
            mode="outlined"
            secureTextEntry={!showPassword2}
            value={password2}
            onChangeText={setPassword2}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
            right={
              <TextInput.Icon
                icon={showPassword2 ? "eye-off" : "eye"}
                onPress={() => setShowPassword2(!showPassword2)}
                forceTextInputFocus={false}
              />
            }
          />
          {passwordsDontMatch && (
            <HelperText type="error" visible={passwordsDontMatch}>
              Las contraseñas no coinciden.
            </HelperText>
          )}

          {!!errorMsg && (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMsg}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={submitting}
            disabled={submitting}
            style={styles.registerButton}
            labelStyle={styles.buttonLabel}
          >
            ✨ Crear mi cuenta
          </Button>

          <Text style={styles.infoText}>
            Al registrarte aceptas nuestros términos de uso y política de
            privacidad
          </Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>¿Ya tienes cuenta?</Text>
          <Text style={styles.loginSubtitle}>
            Inicia sesión con tu cuenta existente
          </Text>
          <TouchableOpacity onPress={goToLogin} style={styles.loginButton}>
            <Text style={styles.loginButtonText}>🔑 Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.replace("VerifyOtp", { email: email.trim() });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Registro exitoso</Text>
            <Text style={styles.modalMessage}>Se envió un código de verificación a tu correo. Revisá tu bandeja de entrada.</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.replace("VerifyOtp", { email: email.trim() });
              }}
            >
              <Text style={styles.modalButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              {errorTitle.includes('⚠️') ? '⚠️' : errorTitle.includes('📡') ? '📡' : '❌'}
            </Text>
            <Text style={styles.modalTitle}>
              {errorTitle.replace('⚠️', '').replace('📡', '').replace('❌', '').trim()}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        action={{
          label: "Iniciar sesión",
          onPress: goToLogin,
        }}
        style={styles.snackbar}
      >
        {snackbarMsg}
      </Snackbar>
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
  input: { backgroundColor: "#fff", marginBottom: 10 },
  errorText: { textAlign: "center", marginBottom: 15, fontSize: 14 },
  registerButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 15,
  },
  buttonLabel: { fontSize: 16, fontWeight: "bold" },
  infoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  loginCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 8,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  loginButtonText: { color: "#4CAF50", fontSize: 16, fontWeight: "bold" },
  snackbar: { backgroundColor: "#2e7d32" },
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
