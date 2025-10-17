// src/screens/Auth/RegisterScreen.js
import React, { useState, useRef } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { register as registerRequest } from "../../services/auth";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const pass2Ref = useRef(null);

  const emailInvalid =
    email.length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsDontMatch = password2.length > 0 && password !== password2;

  const handleRegister = async () => {
    setErrorMsg("");

    if (!name || !email || !password || !password2) {
      setErrorMsg("Completá todos los campos.");
      return;
    }
    if (emailInvalid) {
      setErrorMsg("El email no es válido.");
      return;
    }
    if (passwordTooShort) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setErrorMsg("Las contraseñas no coinciden.");
      // foco en confirmar contraseña
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

      if (data?.token) await AsyncStorage.setItem("token", data.token);
      if (data?.user) await AsyncStorage.setItem("user", JSON.stringify(data.user));

      // Más adelante: navigation.replace("AppTabs");
      // Por ahora, volvemos al Login con un estado OK (opcional)
      navigation.goBack();
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;

      if (status === 409) {
        setErrorMsg(apiMsg || "Ese email ya está registrado.");
      } else if (status === 400) {
        setErrorMsg(apiMsg || "Datos inválidos para registrarse.");
      } else {
        setErrorMsg(apiMsg || "No se pudo completar el registro.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "flex-start", gap: 12 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 8, fontWeight: "600" }}>
        Crear cuenta en RitmoFit
      </Text>

      <TextInput label="Nombre" mode="outlined" value={name} onChangeText={setName} />

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

      <TextInput
        label="Contraseña"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {passwordTooShort && (
        <HelperText type="error" visible>Debe tener al menos 6 caracteres.</HelperText>
      )}

      <TextInput
        ref={pass2Ref}
        label="Repetir contraseña"
        mode="outlined"
        secureTextEntry
        value={password2}
        onChangeText={setPassword2}
      />
      {passwordsDontMatch && (
        <HelperText type="error" visible>Las contraseñas no coinciden.</HelperText>
      )}

      {!!errorMsg && <HelperText type="error" visible>{errorMsg}</HelperText>}

      <Button mode="contained" onPress={handleRegister} loading={submitting} disabled={submitting}>
        Registrarse
      </Button>
    </View>
  );
}
