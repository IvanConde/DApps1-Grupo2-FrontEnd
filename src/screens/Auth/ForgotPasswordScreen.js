// src/screens/Auth/ForgotPasswordScreen.js
import React, { useRef, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from "react-native";
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
import { requestOtp, verifyOtp, setPassword } from "../../services/auth";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState("request"); // request | verify | reset
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const codeRef = useRef(null);
  const passRef = useRef(null);
  const [showCodeSentModal, setShowCodeSentModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const emailInvalid = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());
  const canRequest = !!email && !emailInvalid;
  const canVerify = !!email && !!code;
  const canReset = newPassword.length >= 6;

  const handleRequest = async () => {
    setErrorMsg("");
    if (!canRequest) {
      setErrorMsg("Ingresá un email válido.");
      return;
    }
    setSubmitting(true);
    try {
      await requestOtp(email.trim()); // /request-otp
      setShowCodeSentModal(true);
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.response?.data?.message;
      if (e?.code === 'ECONNABORTED' || e?.code === 'ERR_NETWORK') {
        setErrorTitle("📡 Error de conexión");
        setErrorMessage("No se pudo conectar con el servidor. Verificá tu conexión a internet.");
        setShowErrorModal(true);
      } else {
        setErrorTitle("❌ Error");
        setErrorMessage(apiMsg || "No se pudo enviar el código. Intenta nuevamente.");
        setShowErrorModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setErrorMsg("");
    if (!canVerify) {
      setErrorMsg("Completá el email y el código.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await verifyOtp(email.trim(), code.trim()); // /verify-otp (devuelve token + user)
  if (data?.token) await storageSet("token", data.token);
  if (data?.user) await storageSet("user", JSON.stringify(data.user));
      setStep("reset");
      requestAnimationFrame(() => passRef.current?.focus());
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.response?.data?.message;
      const status = e?.response?.status;
      
      if (status === 400) {
        setErrorTitle("⏱️ Código inválido");
        setErrorMessage(apiMsg || "El código ingresado es incorrecto o expiró. Solicitá uno nuevo.");
        setShowErrorModal(true);
      } else {
        setErrorTitle("❌ Error");
        setErrorMessage(apiMsg || "No se pudo verificar el código. Intenta nuevamente.");
        setShowErrorModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setErrorMsg("");
    if (!canReset) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await setPassword(newPassword); // /set-password (requiere Bearer token)
      // Al cambiar la contraseña, invalidamos credenciales guardadas para evitar biométricos con token viejo
      try {
        await storageRemove("token");
        await storageRemove("user");
        await storageRemove("biometricEnabled");
      } catch (cleanupErr) {
        console.warn('No se pudieron limpiar credenciales guardadas:', cleanupErr?.message || cleanupErr);
      }
      // listo: password cambiada, podemos volver al Login
      setShowSuccessModal(true);
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.response?.data?.message;
      setErrorTitle("❌ Error");
      setErrorMessage(apiMsg || "No se pudo actualizar la contraseña. Intenta nuevamente.");
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => navigation.navigate("Login");

  const getStepInfo = () => {
    switch (step) {
      case 'request':
        return {
          icon: '🔐',
          title: 'Recuperar Acceso',
          subtitle: 'Te enviaremos un código a tu email'
        };
      case 'verify':
        return {
          icon: '📱',
          title: 'Verificar Código',
          subtitle: 'Ingresa el código que te enviamos'
        };
      case 'reset':
        return {
          icon: '🔑',
          title: 'Nueva Contraseña',
          subtitle: 'Crea una contraseña segura'
        };
      default:
        return { icon: '🔐', title: '', subtitle: '' };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <ScrollView style={styles.container}>
      {/* Header con estilo coherente */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{stepInfo.icon}</Text>
        <Text variant="headlineMedium" style={styles.title}>
          {stepInfo.title}
        </Text>
        <Text style={styles.subtitle}>
          {stepInfo.subtitle}
        </Text>
      </View>

      {/* Formulario en card */}
      <View style={styles.formCard}>
        {/* Paso 1: Solicitar código */}
        {step === "request" && (
          <>
            <Text style={styles.formTitle}>Solicitar Código</Text>
            <Text style={styles.instructionText}>
              Ingresa tu email y te enviaremos un código de recuperación
            </Text>
            
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
              {emailInvalid && (
                <HelperText type="error" visible={emailInvalid} style={styles.helperText}>
                  Ingresá un email válido.
                </HelperText>
              )}
            </View>

            {!!errorMsg && (
              <HelperText type="error" visible style={styles.errorText}>
                {errorMsg}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleRequest}
              loading={submitting}
              disabled={submitting}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              📤 Enviar código
            </Button>
          </>
        )}

        {/* Paso 2: Verificar código */}
        {step === "verify" && (
          <>
            <Text style={styles.formTitle}>Verificar Código</Text>
            <Text style={styles.instructionText}>
              Te enviamos un código a{'\n'}
              <Text style={styles.highlightText}>{email}</Text>
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={codeRef}
                label="🔢 Código de verificación"
                mode="outlined"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
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
              onPress={handleVerify}
              loading={submitting}
              disabled={submitting}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              ✅ Verificar código
            </Button>
          </>
        )}

        {/* Paso 3: Cambiar contraseña */}
        {step === "reset" && (
          <>
            <Text style={styles.formTitle}>Nueva Contraseña</Text>
            <Text style={styles.instructionText}>
              Código verificado para{'\n'}
              <Text style={styles.highlightText}>{email}</Text>
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={passRef}
                label="🔒 Nueva contraseña"
                mode="outlined"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#4CAF50"
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              <HelperText type="info" visible style={styles.helperText}>
                Mínimo 6 caracteres
              </HelperText>
            </View>

            {!!errorMsg && (
              <HelperText type="error" visible style={styles.errorText}>
                {errorMsg}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleReset}
              loading={submitting}
              disabled={submitting}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              🔄 Cambiar contraseña
            </Button>
          </>
        )}

        {/* Progreso visual */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: step === 'request' ? '33%' : step === 'verify' ? '66%' : '100%' }
            ]} />
          </View>
          <Text style={styles.progressText}>
            Paso {step === 'request' ? '1' : step === 'verify' ? '2' : '3'} de 3
          </Text>
        </View>
      </View>

      {/* Card de navegación */}
      <View style={styles.navigationCard}>
        <Text style={styles.navTitle}>¿Recordaste tu contraseña?</Text>
        <TouchableOpacity onPress={goToLogin} style={styles.navButton}>
          <Text style={styles.navButtonText}>🔑 Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de código enviado */}
      <Modal
        visible={showCodeSentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCodeSentModal(false);
          setStep("verify");
          requestAnimationFrame(() => codeRef.current?.focus());
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>📧</Text>
            <Text style={styles.modalTitle}>Código enviado</Text>
            <Text style={styles.modalMessage}>Revisá tu correo electrónico. El código es válido por 5 minutos.</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                setShowCodeSentModal(false);
                setStep("verify");
                requestAnimationFrame(() => codeRef.current?.focus());
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
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
              {errorTitle.includes('📡') ? '📡' : errorTitle.includes('⏱️') ? '⏱️' : '❌'}
            </Text>
            <Text style={styles.modalTitle}>
              {errorTitle.replace('📡', '').replace('⏱️', '').replace('❌', '').trim()}
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

      {/* Modal de contraseña actualizada */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Contraseña actualizada</Text>
            <Text style={styles.modalMessage}>Tu contraseña fue cambiada exitosamente. Ya podés iniciar sesión.</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>Ir a Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  highlightText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
  },
  helperText: {
    marginTop: 5,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  navigationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  navButton: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  navButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
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