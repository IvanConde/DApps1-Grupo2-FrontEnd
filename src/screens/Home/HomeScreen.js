// src/screens/Home/HomeScreen.js
import React, { useState, useEffect } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button } from "react-native-paper";
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
import { getClasses } from "../../services/classes";
import NotificationDebugPanel from "../../services/notifications/testNotifications";

export default function HomeScreen({ navigation }) {
  const DEBUG_UI = false; // Toggle para mostrar paneles de debug en Home
  const [todaysClasses, setTodaysClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    loadTodaysClasses();
    
    // Actualizar fecha/hora cada segundo
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Refrescar clases al volver a enfocar la pantalla Home
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadTodaysClasses();
    }, [])
  );

  const loadTodaysClasses = async () => {
    try {
      // Obtener fecha local en formato YYYY-MM-DD
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;  
          
      const filters = { fecha: localDate };
      const classes = await getClasses(filters);
      setTodaysClasses(classes.slice(0, 3)); // Solo mostrar las primeras 3
    } catch (error) {
      console.error('Error cargando clases del día:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
  await storageRemove("token");
  await storageRemove("user");
    navigation.replace("Login");
  };

  const handleGoToProfile = () => {
    navigation.navigate("Profile");
  };

  const handleGoToClasses = () => {
    navigation.navigate("Classes");
  };

  const handleGoToClassDetail = (classId) => {
    navigation.navigate("ClassDetail", { classId });
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5);
  };

  const handleGoToMyReservations = () => {
    navigation.navigate('MyReservations');
  };

  const handleGoToHistory = () => {
    navigation.navigate('History');
  };

  const handleGoToNews = () => {
    navigation.navigate('News');
  };

  const getDisciplineIcon = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'funcional': return '💪';
      case 'yoga': return '🧘';
      case 'spinning': return '🚴';
      default: return '🏃';
    }
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => handleGoToClassDetail(item.id)}
    >
      <View style={styles.classHeader}>
        <Text style={styles.classIcon}>{getDisciplineIcon(item.discipline)}</Text>
        <View style={styles.classInfo}>
          <Text style={styles.classTime}>{formatTime(item.hora)}</Text>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classSede}>{item.sede}</Text>
        </View>
        <View style={styles.cupoInfo}>
          <Text style={styles.cupoNumber}>{item.cupo}</Text>
          <Text style={styles.cupoLabel}>cupos</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            🎉 Bienvenido a RitmoFit
          </Text>
          <Text style={styles.subtitle}>
            ¡Encuentra tu clase perfecta!
          </Text>
        </View>

      {/* 🧪 PANEL DE PRUEBA DE NOTIFICACIONES - controlado por DEBUG_UI */}
      {DEBUG_UI && <NotificationDebugPanel />}

      {/* 🧪 TESTER DE FECHA/HORA DEL DISPOSITIVO - controlado por DEBUG_UI */}
      {DEBUG_UI && (
        <View style={styles.dateTimeTester}>
          <Text style={styles.testerTitle}>📅 Fecha/Hora del Dispositivo</Text>
          <View style={styles.testerContent}>
            <View style={styles.testerRow}>
              <Text style={styles.testerLabel}>Fecha:</Text>
              <Text style={styles.testerValue}>
                {currentDateTime.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.testerRow}>
              <Text style={styles.testerLabel}>Hora:</Text>
              <Text style={styles.testerValue}>
                {currentDateTime.toLocaleTimeString('es-AR')}
              </Text>
            </View>
            <View style={styles.testerRow}>
              <Text style={styles.testerLabel}>ISO:</Text>
              <Text style={styles.testerValueSmall}>
                {currentDateTime.toISOString()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Clases de hoy */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clases de Hoy</Text>
          <TouchableOpacity onPress={handleGoToClasses}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando clases...</Text>
          </View>
        ) : todaysClasses.length > 0 ? (
          <FlatList
            data={todaysClasses}
            renderItem={renderClassItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classesContainer}
          />
        ) : (
          <View style={styles.emptyClasses}>
            <Text style={styles.emptyText}>No hay clases programadas para hoy</Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={handleGoToClasses}
            >
              <Text style={styles.exploreButtonText}>Explorar Clases</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Acciones rápidas */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGoToClasses}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Catálogo de Clases</Text>
            <Text style={styles.actionSubtitle}>Explora todas las clases disponibles</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGoToProfile}
        >
          <Text style={styles.actionIcon}>👤</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Mi Perfil</Text>
            <Text style={styles.actionSubtitle}>Edita tu información personal</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGoToHistory}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Mi Historial</Text>
            <Text style={styles.actionSubtitle}>Revisa tus clases pasadas</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGoToNews}
        >
          <Text style={styles.actionIcon}>📰</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Novedades</Text>
            <Text style={styles.actionSubtitle}>Promociones y eventos</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleGoToMyReservations}
        >
          <Text style={styles.actionIcon}>🧾</Text>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Mis reservas</Text>
            <Text style={styles.actionSubtitle}>Consultá y cancelá tus turnos</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Botón logout */}
      <View style={styles.logoutSection}>
        <Button 
          mode="outlined" 
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Cerrar sesión
        </Button>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#4CAF50' },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 16,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  classesContainer: {
    paddingRight: 20,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  classTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  classSede: {
    fontSize: 14,
    color: '#666',
  },
  cupoInfo: {
    alignItems: 'center',
  },
  cupoNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cupoLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyClasses: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  exploreButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  quickActions: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  logoutButton: {
    borderColor: '#ddd',
  },
  
  // Estilos para el tester de fecha/hora
  dateTimeTester: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  testerContent: {
    gap: 8,
  },
  testerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 60,
  },
  testerValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  testerValueSmall: {
    fontSize: 11,
    color: '#666',
    flex: 1,
    fontFamily: 'monospace',
  },
});