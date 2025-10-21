// src/screens/Auth/RegisterScreen.js
import React, { useState, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
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

  const goToLogin = () => navigation.navigate("Login");

  return (
    <ScrollView style={styles.container}>
      {/* Header con estilo coherente */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🌟</Text>
        <Text variant="headlineMedium" style={styles.title}>
          ¡Únete a RitmoFit!
        </Text>
        <Text style={styles.subtitle}>
          Crea tu cuenta y comienza tu aventura fitness
        </Text>
      </View>

      {/* Formulario en card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Crear Cuenta</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            label="👤 Nombre completo"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
        </View>

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

        <View style={styles.inputContainer}>
          <TextInput
            label="🔒 Contraseña"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
          {passwordTooShort && (
            <HelperText type="error" visible={passwordTooShort} style={styles.helperText}>
              Debe tener al menos 6 caracteres.
            </HelperText>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            ref={pass2Ref}
            label="🔐 Confirmar contraseña"
            mode="outlined"
            secureTextEntry
            value={password2}
            onChangeText={setPassword2}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
          {passwordsDontMatch && (
            <HelperText type="error" visible={passwordsDontMatch} style={styles.helperText}>
              Las contraseñas no coinciden.
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
          onPress={handleRegister}
          loading={submitting}
          disabled={submitting}
          style={styles.registerButton}
          labelStyle={styles.buttonLabel}
        >
          ✨ Crear mi cuenta
        </Button>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Al registrarte aceptas nuestros términos de uso y política de privacidad
          </Text>
        </View>
      </View>

      {/* Card de login */}
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
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 15,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  loginCard: {
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
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  loginButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});