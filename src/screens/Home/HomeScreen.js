// src/screens/Home/HomeScreen.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    navigation.replace("Login");
  };

  const handleGoToProfile = () => {
    navigation.navigate("Profile");
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        🎉 Bienvenido a RitmoFit
      </Text>

      <Text style={styles.subtitle}>
        Ya iniciaste sesión correctamente.
      </Text>

      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          onPress={handleGoToProfile}
          style={styles.button}
          icon="account"
        >
          Mi Perfil
        </Button>

        <Button 
          mode="outlined" 
          onPress={handleLogout}
          style={styles.button}
        >
          Cerrar sesión
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 40,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  button: {
    marginBottom: 15,
  },
});
