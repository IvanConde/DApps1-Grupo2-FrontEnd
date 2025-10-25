// src/screens/Auth/VerifyOtpScreen.js
import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
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
import { verifyOtp } from "../../services/auth";

export default function VerifyOtpScreen({ route, navigation }) {
  const { email } = route.params; // viene del LoginScreen
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => timer - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!code || code.trim().length === 0) {
      setErrorMsg("Ingresá el código recibido por correo.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await verifyOtp(email, code.trim());
      if (data?.token) {
        await storageSet("token", data.token);
      }
      if (data?.user) {
        await storageSet("user", JSON.stringify(data.user));
      }

      setSuccessMsg("¡Código verificado con éxito! Bienvenido a RitmoFit");
      setTimeout(() => {
        navigation.replace("Home");
      }, 1500);
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error || err?.response?.data?.message;
      if (status === 400) setErrorMsg(apiMsg || "Código inválido o expirado.");
      else setErrorMsg(apiMsg || "Error al verificar el código.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setCode("");

    try {
      const res = await fetch("http://10.0.2.2:4000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Nuevo código enviado al correo.");
        setTimer(60);
        setCanResend(false);
      } else {
        setErrorMsg(data.error || "Error reenviando código.");
      }
    } catch {
      setErrorMsg("No se pudo reenviar el código. Reintentá más tarde.");
    }
  };

  const goToLogin = () => navigation.navigate("Login");

  return (
    <ScrollView style={styles.container}>
      {/* Header con estilo coherente */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📱</Text>
        <Text variant="headlineMedium" style={styles.title}>
          Verificación OTP
        </Text>
        <Text style={styles.subtitle}>
          Confirma tu identidad con el código que te enviamos
        </Text>
      </View>

      {/* Formulario en card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Código de Verificación</Text>
        
        <View style={styles.emailContainer}>
          <Text style={styles.instructionText}>
            Ingresá el código enviado a
          </Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            label="🔢 Código OTP"
            mode="outlined"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
            maxLength={6}
          />
          <HelperText type="info" visible style={styles.helperText}>
            El código tiene 6 dígitos
          </HelperText>
        </View>

        {!!errorMsg && (
          <HelperText type="error" visible style={styles.errorText}>
            {errorMsg}
          </HelperText>
        )}

        {!!successMsg && (
          <HelperText type="info" visible style={styles.successText}>
            {successMsg}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={submitting}
          disabled={submitting || !!successMsg}
          style={styles.verifyButton}
          labelStyle={styles.buttonLabel}
        >
          {successMsg ? "✅ Verificado" : "🔐 Confirmar código"}
        </Button>

        {/* Sección de reenvío */}
        <View style={styles.resendContainer}>
          {!canResend ? (
            <Text style={styles.timerText}>
              Podrás solicitar un nuevo código en {timer} segundos
            </Text>
          ) : (
            <>
              <Text style={styles.resendText}>¿No recibiste el código?</Text>
              <TouchableOpacity 
                onPress={handleResend} 
                disabled={!!submitting}
                style={styles.resendButton}
              >
                <Text style={styles.resendButtonText}>📤 Reenviar código</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Tips card */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Consejos</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Revisa tu carpeta de spam o correo no deseado</Text>
          <Text style={styles.tipItem}>• El código expira en 5 minutos</Text>
          <Text style={styles.tipItem}>• Asegúrate de tener conexión a internet</Text>
        </View>
      </View>

      {/* Card de navegación */}
      <View style={styles.navigationCard}>
        <Text style={styles.navTitle}>¿Problemas para verificar?</Text>
        <TouchableOpacity onPress={goToLogin} style={styles.navButton}>
          <Text style={styles.navButtonText}>🔑 Volver al inicio de sesión</Text>
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
    marginBottom: 20,
  },
  emailContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 2,
  },
  helperText: {
    marginTop: 5,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  successText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    color: '#4CAF50',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  resendButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tipsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tipsList: {
    gap: 5,
  },
  tipItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
});