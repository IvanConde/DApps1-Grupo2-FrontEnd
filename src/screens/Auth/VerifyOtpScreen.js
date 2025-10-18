// src/screens/Auth/VerifyOtpScreen.js
import React, { useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyOtp } from "../../services/auth";

export default function VerifyOtpScreen({ route, navigation }) {
  const { email } = route.params; // viene del LoginScreen
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
        await AsyncStorage.setItem("token", data.token);
      }
      if (data?.user) {
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
      }

      setSuccessMsg("Código verificado con éxito. ¡Bienvenido!");
      setTimeout(() => {
        navigation.replace("Home");
      }, 1000);
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
  setCode(""); // 🔹 limpia el campo para que quede vacío

  try {
    const res = await fetch("http://10.0.2.2:4000/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) setSuccessMsg("Nuevo código enviado al correo.");
    else setErrorMsg(data.error || "Error reenviando código.");
  } catch {
    setErrorMsg("No se pudo reenviar el código. Reintentá más tarde.");
  }
};


  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "flex-start", gap: 12 }}>
      <Text variant="headlineMedium" style={{ fontWeight: "600", marginBottom: 10 }}>
        Verificar código OTP
      </Text>

      <Text style={{ marginBottom: 8 }}>
        Ingresá el código enviado a {email}
      </Text>

      <TextInput
        label="Código OTP"
        mode="outlined"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
      />

      {!!errorMsg && <HelperText type="error" visible>{errorMsg}</HelperText>}
      {!!successMsg && <HelperText type="info" visible>{successMsg}</HelperText>}

      <Button
        mode="contained"
        onPress={handleVerify}
        loading={submitting}
        disabled={submitting}
      >
        Confirmar código
      </Button>

      <Button mode="text" onPress={handleResend} disabled={submitting}>
        Reenviar código
      </Button>
    </View>
  );
}
