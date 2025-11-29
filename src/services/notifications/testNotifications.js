// src/services/notifications/testNotifications.js
// Componente de prueba para debugging del sistema de notificaciones
// Importalo temporalmente en cualquier screen para probar

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { 
  fetchAndShowNotifications, 
  isBackgroundTaskRegistered,
  registerBackgroundTask,
  unregisterBackgroundTask 
} from './index';
import * as Notifications from 'expo-notifications';

export default function NotificationDebugPanel() {
  const [taskStatus, setTaskStatus] = React.useState('Verificando...');

  React.useEffect(() => {
    checkTaskStatus();
  }, []);

  const checkTaskStatus = async () => {
    const isRegistered = await isBackgroundTaskRegistered();
    setTaskStatus(isRegistered ? '✅ Registrada' : '❌ No registrada');
  };

  const handleTestFetch = async () => {
    try {
      const count = await fetchAndShowNotifications();
      Alert.alert('Test completado', `Se procesaron ${count} notificaciones`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCheckPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    Alert.alert('Permisos', `Status: ${status}`);
  };

  const handleRegisterTask = async () => {
    const success = await registerBackgroundTask();
    if (success) {
      Alert.alert('Éxito', 'Background task registrada');
      checkTaskStatus();
    } else {
      Alert.alert('Error', 'No se pudo registrar la tarea');
    }
  };

  const handleUnregisterTask = async () => {
    const success = await unregisterBackgroundTask();
    if (success) {
      Alert.alert('Éxito', 'Background task desregistrada');
      checkTaskStatus();
    } else {
      Alert.alert('Error', 'No se pudo desregistrar la tarea');
    }
  };

  const handleTestLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test RitmoFit',
        body: 'Esta es una notificación de prueba local',
        data: { classId: 1, test: true },
      },
      trigger: null,
    });
    Alert.alert('Test', 'Notificación local enviada');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Debug de Notificaciones</Text>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Background Task:</Text>
        <Text style={styles.statusValue}>{taskStatus}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleTestFetch}>
        <Text style={styles.buttonText}>🔄 Consultar notificaciones ahora</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleTestLocalNotification}>
        <Text style={styles.buttonText}>📱 Mostrar notificación de prueba</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCheckPermissions}>
        <Text style={styles.buttonText}>🔐 Ver permisos</Text>
      </TouchableOpacity>

      <View style={styles.separator} />

      <TouchableOpacity style={[styles.button, styles.buttonSuccess]} onPress={handleRegisterTask}>
        <Text style={styles.buttonText}>✅ Registrar background task</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handleUnregisterTask}>
        <Text style={styles.buttonText}>❌ Desregistrar background task</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        💡 Tip: El background task se ejecuta cada 15 min automáticamente.
        En desarrollo, usá los botones de arriba para probar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  statusLabel: {
    fontWeight: '600',
  },
  statusValue: {
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  info: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

/* 
 * CÓMO USAR:
 * 
 * En cualquier screen (por ejemplo HomeScreen.js), importá y agregá:
 * 
 * import NotificationDebugPanel from '../../services/notifications/testNotifications';
 * 
 * // Dentro del JSX:
 * <NotificationDebugPanel />
 * 
 * Esto te permitirá probar el sistema sin esperar los 15 minutos del background task.
 */
