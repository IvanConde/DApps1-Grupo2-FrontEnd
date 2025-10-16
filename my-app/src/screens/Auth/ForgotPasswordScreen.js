// src/screens/Auth/ForgotPasswordScreen.js
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      setStep("verify");
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || e?.message || "No se pudo enviar el código.");
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
      if (data?.token) await AsyncStorage.setItem("token", data.token);
      if (data?.user) await AsyncStorage.setItem("user", JSON.stringify(data.user));
      setStep("reset");
      requestAnimationFrame(() => passRef.current?.focus());
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Código inválido o expirado.";
      setErrorMsg(msg);
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
      // listo: password cambiada, podemos volver al Login
      navigation.goBack();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "No se pudo actualizar la contraseña.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "flex-start", gap: 12 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 8, fontWeight: "600" }}>
        Recuperar acceso
      </Text>

      {step === "request" && (
        <>
          <TextInput
            label="Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {emailInvalid && (
            <HelperText type="error" visible>Ingresá un email válido.</HelperText>
          )}
          {!!errorMsg && <HelperText type="error" visible>{errorMsg}</HelperText>}
          <Button mode="contained" onPress={handleRequest} loading={submitting} disabled={submitting}>
            Enviar código
          </Button>
        </>
      )}

      {step === "verify" && (
        <>
          <Text style={{ opacity: 0.7 }}>Te enviamos un código a {email}</Text>
          <TextInput
            ref={codeRef}
            label="Código"
            mode="outlined"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          {!!errorMsg && <HelperText type="error" visible>{errorMsg}</HelperText>}
          <Button mode="contained" onPress={handleVerify} loading={submitting} disabled={submitting}>
            Verificar código
          </Button>
        </>
      )}

      {step === "reset" && (
        <>
          <Text style={{ opacity: 0.7 }}>Código verificado para {email}</Text>
          <TextInput
            ref={passRef}
            label="Nueva contraseña"
            mode="outlined"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          {!!errorMsg && <HelperText type="error" visible>{errorMsg}</HelperText>}
          <Button mode="contained" onPress={handleReset} loading={submitting} disabled={submitting}>
            Cambiar contraseña
          </Button>
        </>
      )}
    </View>
  );
}
