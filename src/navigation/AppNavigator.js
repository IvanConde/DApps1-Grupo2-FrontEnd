// src/navigation/AppNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/Auth/LoginScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import VerifyOtpScreen from "../screens/Auth/VerifyOtpScreen";
import HomeScreen from "../screens/Home/HomeScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import ClassesScreen from "../screens/Classes/ClassesScreen";
import ClassDetailScreen from "../screens/Classes/ClassDetailScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Iniciar sesión" }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: "Recuperar acceso" }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Crear cuenta" }}
      />
      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{ title: "Verificar código" }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }} // sin barra superior
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Mi Perfil" }}
      />
      <Stack.Screen
        name="Classes"
        component={ClassesScreen}
        options={{ headerShown: false }} // header personalizado
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={{ 
          headerShown: false, // header personalizado
          presentation: 'modal' // animación modal
        }}
      />
    </Stack.Navigator>
  );
}