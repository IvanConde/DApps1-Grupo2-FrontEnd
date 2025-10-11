// src/screens/Home/HomeScreen.js
import React from "react";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    navigation.replace("Login");
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text variant="headlineMedium" style={{ marginBottom: 12 }}>
        🎉 Bienvenido a RitmoFit
      </Text>

      <Text style={{ textAlign: "center", opacity: 0.7, marginBottom: 20 }}>
        Ya iniciaste sesión correctamente.
      </Text>

      <Button mode="contained" onPress={handleLogout}>
        Cerrar sesión
      </Button>
    </View>
  );
}
