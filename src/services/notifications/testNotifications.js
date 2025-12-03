// src/services/notifications/testNotifications.js
// Panel de pruebas que interactúa con el BACKEND REAL
// Importalo temporalmente en cualquier screen para probar

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { 
  fetchAndShowNotifications, 
  isBackgroundTaskRegistered,
  registerBackgroundTask,
  unregisterBackgroundTask 
} from './index';
import * as Notifications from 'expo-notifications';
import api from '../../api/client';

export default function NotificationDebugPanel() {
  const [taskStatus, setTaskStatus] = React.useState('Verificando...');
  const [loading, setLoading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalMessage, setModalMessage] = React.useState('');
  const [modalButtons, setModalButtons] = React.useState([]);
  
  // Estados para los inputs
  const [classId, setClassId] = React.useState('15');
  const [newDate, setNewDate] = React.useState('2025-12-01');
  const [newTime, setNewTime] = React.useState('20:00:00');

  React.useEffect(() => {
    checkTaskStatus();
  }, []);

  const checkTaskStatus = async () => {
    const isRegistered = await isBackgroundTaskRegistered();
    setTaskStatus(isRegistered ? '✅ Registrada' : '❌ No registrada');
  };

  const showModalAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons);
    setShowModal(true);
  };

  const handleCheckPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    showModalAlert('Permisos', `Status: ${status}`);
  };

  const handleRegisterTask = async () => {
    const success = await registerBackgroundTask();
    if (success) {
      showModalAlert('Éxito', 'Background task registrada');
      checkTaskStatus();
    } else {
      showModalAlert('Error', 'No se pudo registrar la tarea');
    }
  };

  const handleUnregisterTask = async () => {
    const success = await unregisterBackgroundTask();
    if (success) {
      showModalAlert('Éxito', 'Background task desregistrada');
      checkTaskStatus();
    } else {
      showModalAlert('Error', 'No se pudo desregistrar la tarea');
    }
  };

  // ========== FUNCIONES QUE LLAMAN AL BACKEND REAL ==========

  // 1. Cancelar clase (DELETE /api/classes/:id)
  // El backend genera notificaciones class_cancelled para todos los usuarios con reservas
  const handleCancelClass = async () => {
    if (!classId) {
      showModalAlert('Error', 'Ingresá un ID de clase válido');
      return;
    }

    showModalAlert(
      '⚠️ Confirmar Cancelación',
      `¿Cancelar la clase ${classId}?\n\nEsto:\n• Generará notificaciones para TODOS los usuarios con reservas\n• Cancelará todas las reservas\n• Eliminará la clase del sistema`,
      [
        { text: 'No', onPress: () => setShowModal(false) },
        {
          text: 'Sí, cancelar',
          onPress: async () => {
            setShowModal(false);
            try {
              setLoading(true);
              await api.delete(`/classes/${classId}`);
              
              showModalAlert(
                '✅ Clase cancelada',
                'El backend generó las notificaciones.\n\n👉 Tocá "Consultar notificaciones" para verlas.',
                [
                  { 
                    text: 'Consultar ahora', 
                    onPress: () => { setShowModal(false); handleFetchNotifications(); }
                  },
                  { text: 'OK', onPress: () => setShowModal(false) }
                ]
              );
            } catch (error) {
              console.error('Error cancelando clase:', error);
              console.error('Error response:', error.response?.data);
              console.error('Error status:', error.response?.status);
              
              let errorMsg = 'No se pudo cancelar la clase.\n\n';
              
              if (error.response?.status === 500) {
                errorMsg += '❌ Error del servidor (500)\n\n';
                errorMsg += error.response?.data?.error || error.response?.data?.message || 'Error interno del servidor';
                errorMsg += '\n\nPosibles causas:\n• El ID de clase no existe\n• Error en la base de datos\n• Revisa los logs del backend';
              } else if (error.response?.status === 404) {
                errorMsg += '❌ Clase no encontrada\n\nVerificá que el ID de clase sea correcto';
              } else if (error.response?.status === 401) {
                errorMsg += '❌ No autenticado\n\nCerrá sesión y volvé a iniciar';
              } else {
                errorMsg += error.response?.data?.message || error.message || 'Error desconocido';
                errorMsg += '\n\nVerificá que:\n• El backend está corriendo\n• La URL es correcta\n• Tenés conexión a internet';
              }
              
              showModalAlert('❌ Error al Cancelar', errorMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 2. Reprogramar clase (PUT /api/classes/:id)
  // El backend genera notificaciones class_rescheduled para todos los usuarios con reservas
  const handleRescheduleClass = async () => {
    if (!classId || !newDate || !newTime) {
      showModalAlert('Error', 'Completá todos los campos:\n• ID de clase\n• Nueva fecha\n• Nueva hora');
      return;
    }

    showModalAlert(
      '📅 Confirmar Reprogramación',
      `¿Reprogramar la clase ${classId}?\n\nNuevo horario:\n${newDate} a las ${newTime}\n\nEsto generará notificaciones para TODOS los usuarios con reservas.`,
      [
        { text: 'Cancelar', onPress: () => setShowModal(false) },
        {
          text: 'Reprogramar',
          onPress: async () => {
            setShowModal(false);
            try {
              setLoading(true);
              await api.put(`/classes/${classId}`, {
                fecha: newDate,
                hora: newTime,
              });
              
              showModalAlert(
                '✅ Clase reprogramada',
                'El backend generó las notificaciones.\n\n👉 Tocá "Consultar notificaciones" para verlas.',
                [
                  { 
                    text: 'Consultar ahora', 
                    onPress: () => { setShowModal(false); handleFetchNotifications(); }
                  },
                  { text: 'OK', onPress: () => setShowModal(false) }
                ]
              );
            } catch (error) {
              console.error('Error reprogramando clase:', error);
              console.error('Error response:', error.response?.data);
              console.error('Error status:', error.response?.status);
              
              let errorMsg = 'No se pudo reprogramar la clase.\n\n';
              
              if (error.response?.status === 500) {
                errorMsg += '❌ Error del servidor (500)\n\n';
                errorMsg += error.response?.data?.error || error.response?.data?.message || 'Error interno del servidor';
                errorMsg += '\n\nPosibles causas:\n• El ID de clase no existe\n• Formato de fecha/hora inválido\n• Error en la base de datos\n• Revisa los logs del backend';
              } else if (error.response?.status === 404) {
                errorMsg += '❌ Clase no encontrada\n\nVerificá que el ID de clase sea correcto';
              } else if (error.response?.status === 400) {
                errorMsg += '❌ Datos inválidos\n\n';
                errorMsg += error.response?.data?.message || 'Verificá el formato:\n• Fecha: YYYY-MM-DD\n• Hora: HH:MM:SS';
              } else if (error.response?.status === 401) {
                errorMsg += '❌ No autenticado\n\nCerrá sesión y volvé a iniciar';
              } else {
                errorMsg += error.response?.data?.message || error.message || 'Error desconocido';
                errorMsg += '\n\nVerificá que:\n• El backend está corriendo\n• La URL es correcta\n• Tenés conexión';
              }
              
              showModalAlert('❌ Error al Reprogramar', errorMsg);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 3. Consultar y mostrar notificaciones pendientes del backend
  const handleFetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('[Test] Consultando notificaciones...');
      const count = await fetchAndShowNotifications();
      console.log('[Test] Notificaciones recibidas:', count);
      
      if (count === 0) {
        showModalAlert(
          '📭 Sin notificaciones', 
          'No hay notificaciones pendientes para tu usuario.\n\n💡 Para generar notificaciones:\n\n1️⃣ Asegurate de tener una reserva activa\n2️⃣ Cancelá o reprogramá esa clase\n3️⃣ Consultá nuevamente aquí\n\n⏰ O esperá a tener una clase reservada que empiece en ~1 hora'
        );
      } else {
        showModalAlert(
          '✅ Notificaciones recibidas', 
          `Se procesaron ${count} notificación(es).\n\n📱 Revisá tu bandeja de notificaciones del dispositivo.\n\n👆 Tocá una notificación para navegar al detalle.`
        );
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMsg = 'No se pudieron consultar las notificaciones.\n\n';
      
      if (error.response?.status === 500) {
        errorMsg += '❌ Error del servidor (500)\n\n';
        errorMsg += error.response?.data?.error || error.response?.data?.message || 'Error interno del servidor';
        errorMsg += '\n\nPosibles causas:\n• Error en la consulta SQL\n• Problema con la generación de recordatorios\n• Revisa los logs del backend';
      } else if (error.response?.status === 401) {
        errorMsg += '❌ No autenticado\n\n';
        errorMsg += 'Tu sesión expiró o no tenés un token válido.\n\nCerrá sesión y volvé a iniciar.';
      } else if (error.message?.includes('Network')) {
        errorMsg += '❌ Error de red\n\n';
        errorMsg += 'No se pudo conectar al backend.\n\nVerificá que:\n• El backend está corriendo\n• La URL es correcta (revisa src/api/client.js)\n• Tenés conexión a internet';
      } else {
        errorMsg += error.response?.data?.message || error.message || 'Error desconocido';
        errorMsg += '\n\nVerificá los logs de Metro para más detalles';
      }
      
      showModalAlert('❌ Error al Consultar', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Notificación local de prueba (sin backend)
  const handleTestLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Prueba Local',
        body: 'Esta es una notificación de prueba que NO viene del backend',
        data: { classId: parseInt(classId) || 1, test: true },
      },
      trigger: null,
    });
    showModalAlert('✅ Prueba local enviada', 'Esta notificación NO usa el backend, es solo para probar que las notificaciones funcionen.');
  };

  // 5. Verificar conexión con el backend
  const handleTestBackendConnection = async () => {
    try {
      setLoading(true);
      console.log('[Test] Verificando conexión con backend...');
      
      // Intentar obtener clases (endpoint público)
      const response = await api.get('/classes');
      console.log('[Test] Respuesta del backend:', response.status);
      
      showModalAlert(
        '✅ Conexión exitosa',
        `El backend está funcionando correctamente.\n\nStatus: ${response.status}\nClases disponibles: ${response.data?.length || 0}`
      );
    } catch (error) {
      console.error('[Test] Error conectando al backend:', error);
      console.error('[Test] Error response:', error.response?.data);
      
      let errorMsg = '';
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMsg = '❌ No se pudo conectar al backend\n\n';
        errorMsg += 'Verificá que:\n';
        errorMsg += '1. El servidor backend esté corriendo\n';
        errorMsg += '2. La URL en src/api/client.js sea correcta\n';
        errorMsg += '3. Estés en la misma red que el servidor';
      } else if (error.response?.status === 401) {
        errorMsg = '⚠️ Backend conectado pero no autenticado\n\n';
        errorMsg += 'El servidor está funcionando.\nCerrá sesión y volvé a iniciar.';
      } else if (error.response?.status) {
        errorMsg = `⚠️ Backend respondió con error ${error.response.status}\n\n`;
        errorMsg += error.response?.data?.message || 'Error desconocido';
      } else {
        errorMsg = '❌ Error desconocido\n\n' + error.message;
      }
      
      showModalAlert('Error de Conexión', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🔔 Centro de Pruebas de Notificaciones</Text>
        <Text style={styles.subtitle}>Interactúa con el BACKEND REAL</Text>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}

        {/* Estado del Background Task */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Background Task:</Text>
          <Text style={styles.statusValue}>{taskStatus}</Text>
        </View>

        {/* SECCIÓN 1: Configuración de datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Datos para Pruebas</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ID de Clase a modificar:</Text>
            <TextInput
              style={styles.input}
              value={classId}
              onChangeText={setClassId}
              keyboardType="numeric"
              placeholder="Ej: 15"
            />
            <Text style={styles.inputHint}>
              💡 Usá el ID de una clase que tengas reservada
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nueva Fecha (para reprogramar):</Text>
            <TextInput
              style={styles.input}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nueva Hora (para reprogramar):</Text>
            <TextInput
              style={styles.input}
              value={newTime}
              onChangeText={setNewTime}
              placeholder="HH:MM:SS"
            />
          </View>
        </View>

        {/* SECCIÓN 2: Acciones del Backend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Acciones del Backend</Text>
          <Text style={styles.sectionSubtitle}>
            Estas acciones llaman al backend y generan notificaciones REALES
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.buttonWarning]} 
            onPress={handleRescheduleClass}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📅 Reprogramar Clase</Text>
            <Text style={styles.buttonSubtext}>PUT /api/classes/{classId}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buttonDanger]} 
            onPress={handleCancelClass}
            disabled={loading}
          >
            <Text style={styles.buttonText}>❌ Cancelar Clase</Text>
            <Text style={styles.buttonSubtext}>DELETE /api/classes/{classId}</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity 
            style={[styles.button, styles.buttonPrimary]} 
            onPress={handleFetchNotifications}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔄 Consultar Notificaciones</Text>
            <Text style={styles.buttonSubtext}>GET /api/notifications</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            ℹ️ El recordatorio de 1h se genera automáticamente cuando el backend detecta clases próximas
          </Text>
        </View>

        {/* SECCIÓN 3: Prueba local */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Diagnóstico</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.buttonInfo]} 
            onPress={handleTestBackendConnection}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔌 Probar Conexión al Backend</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buttonInfo]} 
            onPress={handleTestLocalNotification}
          >
            <Text style={styles.buttonText}>📱 Notificación de Prueba Local</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            💡 Usa "Probar Conexión" primero si tenés errores 500
          </Text>
        </View>

        {/* SECCIÓN 4: Sistema */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configuración del Sistema</Text>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCheckPermissions}
          >
            <Text style={styles.buttonText}>🔐 Verificar Permisos</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity 
            style={[styles.button, styles.buttonSuccess]} 
            onPress={handleRegisterTask}
          >
            <Text style={styles.buttonText}>✅ Registrar Background Task</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buttonDanger]} 
            onPress={handleUnregisterTask}
          >
            <Text style={styles.buttonText}>❌ Desregistrar Background Task</Text>
          </TouchableOpacity>
        </View>

        {/* Guía de uso */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📖 Guía de Uso</Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>1. Preparación:</Text>{'\n'}
            • Reservá una clase desde la app{'\n'}
            • Anotá el ID de la clase{'\n\n'}
            
            <Text style={styles.bold}>2. Probar cancelación:</Text>{'\n'}
            • Ingresá el ID de la clase{'\n'}
            • Tocá "Cancelar Clase"{'\n'}
            • Tocá "Consultar Notificaciones"{'\n'}
            • Verás la notificación de cancelación{'\n'}
            • Al tocarla, te llevará al detalle{'\n\n'}
            
            <Text style={styles.bold}>3. Probar reprogramación:</Text>{'\n'}
            • Ingresá ID, nueva fecha y hora{'\n'}
            • Tocá "Reprogramar Clase"{'\n'}
            • Tocá "Consultar Notificaciones"{'\n'}
            • Verás la notificación con los cambios{'\n'}
            • Al tocarla, se abrirá un modal{'\n'}
            • Podés aceptar o cancelar la reserva{'\n\n'}
            
            <Text style={styles.bold}>4. Recordatorio 1 hora antes:</Text>{'\n'}
            • Se genera automáticamente por el backend{'\n'}
            • Reservá una clase que empiece en ~1 hora{'\n'}
            • El backend creará la notificación{'\n'}
            • Tocá "Consultar Notificaciones"{'\n'}
            • Al tocar el recordatorio, te lleva a Mis Reservas{'\n\n'}
            
            <Text style={styles.bold}>💡 Cómo probar el recordatorio fácilmente:</Text>{'\n'}
            • Opción A: Modificá la hora del sistema{'\n'}
            • Opción B: Creá una clase 1h en el futuro{'\n'}
            • Opción C: Pedile al backend que ajuste{'\n'}
            {'  '}la lógica temporalmente (30min en vez de 1h){'\n'}
            • Esperá 15 min y consultá notificaciones
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>

      {/* Modal genérico */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.text === 'No' || button.text === 'Cancelar' ? styles.modalButtonSecondary : styles.modalButtonPrimary
                  ]}
                  onPress={() => {
                    if (button.onPress) button.onPress();
                    else setShowModal(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>{button.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 10,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: 12,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontWeight: '600',
    color: '#666',
  },
  statusValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonInfo: {
    backgroundColor: '#5AC8FA',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  spacer: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  modalButtonSecondary: {
    backgroundColor: '#999',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

/* 
 * CENTRO DE PRUEBAS DE NOTIFICACIONES CON BACKEND REAL
 * 
 * Este panel permite probar el sistema completo de notificaciones:
 * 
 * FUNCIONALIDADES:
 * 1. Cancelar clase → Genera notificación class_cancelled
 * 2. Reprogramar clase → Genera notificación class_rescheduled
 * 3. Consultar notificaciones → Obtiene todas las pendientes del backend
 * 4. Recordatorio 1h → Se genera automáticamente por el backend
 * 
 * FLUJO DE PRUEBA:
 * 1. Reservá una clase desde la app
 * 2. Anotá el ID de la clase
 * 3. Cancelá o reprogramá la clase desde este panel
 * 4. El backend generará la notificación
 * 5. Consultá las notificaciones para verla
 * 6. Tocá la notificación para navegar al detalle
 * 
 * ⚠️ IMPORTANTE: Este panel es TEMPORAL. Removelo antes de producción.
 */
