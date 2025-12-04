import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmAttendance } from '../../services/reservations';
import { getClassById } from '../../services/classes';

const QRScannerScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [classNameById, setClassNameById] = useState('');
  const { reservationData } = route.params || {};

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);

    try {
      // Parsear el JSON del QR
      const parsedData = JSON.parse(data);
      
      // Validar que tenga los campos necesarios
      if (!parsedData.classId || !parsedData.fecha || !parsedData.hora || !parsedData.sede) {
        Alert.alert(
          'QR Inválido', 
          'El código QR no contiene los datos correctos',
          [{ 
            text: 'Entendido', 
            onPress: () => {
              // Delay de 2 segundos antes de permitir escanear de nuevo
              setTimeout(() => setScanned(false), 2000);
            }
          }]
        );
        return;
      }

      // Intentar obtener nombre de clase por ID para validar que existe
      try {
        if (parsedData.classId) {
          const cls = await getClassById(parsedData.classId);
          if (cls?.name) {
            setClassNameById(cls.name);
            // Clase válida, mostrar modal de confirmación
            setQrData(parsedData);
            setShowConfirmModal(true);
          } else {
            // Clase sin nombre, rechazar
            setScanned(false);
            Alert.alert(
              'Clase no válida',
              'El código QR no corresponde a una clase válida en el sistema.',
              [{ text: 'Entendido', onPress: () => setScanned(false) }]
            );
          }
        }
      } catch (e) {
        // Error obteniendo clase (404 u otro), no es válida
        // NO resetear scanned=false aquí para evitar escaneos repetidos
        Alert.alert(
          'Clase no válida',
          'El código QR escaneado no corresponde a una clase activa en el sistema.',
          [{ 
            text: 'Entendido', 
            onPress: () => {
              // Delay de 2 segundos antes de permitir escanear de nuevo
              setTimeout(() => setScanned(false), 2000);
            }
          }]
        );
      }
      
    } catch (error) {
      let errorMessage = 'Error al procesar el QR';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error instanceof SyntaxError) {
        errorMessage = 'El código QR no tiene el formato correcto';
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'Reintentar',
          onPress: () => setScanned(false)
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => navigation.goBack()
        }
      ]);
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      setConfirming(true);
      
      // Enviar al backend para confirmar asistencia
      await confirmAttendance(qrData);
      
      setShowConfirmModal(false);
      
      Alert.alert(
        '¡Asistencia confirmada!',
        'Tu asistencia ha sido registrada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyReservations')
          }
        ]
      );
    } catch (error) {
      setShowConfirmModal(false);
      
      Alert.alert('Error', error.message || 'No se pudo confirmar la asistencia', [
        {
          text: 'Reintentar',
          onPress: () => setScanned(false)
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => navigation.goBack()
        }
      ]);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setQrData(null);
    setScanned(false);
  };

  // Parseo seguro de fecha local YYYY-MM-DD para evitar desfases por UTC
  const formatDate = (dateString) => {
    try {
      const ymd = (dateString || '').split('T')[0];
      const parts = ymd.split('-');
      if (parts.length !== 3) return dateString;
      const date = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    return timeString?.substring(0, 5) || timeString;
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Solicitando permisos de cámara...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>
            No se tiene acceso a la cámara.{'\n'}
            Por favor, habilita los permisos en la configuración.
          </Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Escanear QR de Asistencia</Text>
        <Text style={styles.subtitle}>
          Apuntá la cámara al código QR de la clase
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          style={styles.camera}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          {scanned ? 'Procesando...' : 'Posicioná el QR dentro del cuadro'}
        </Text>
        
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Check-in</Text>
            </View>

            {qrData && (
              <View style={styles.modalContent}>
                <Text style={styles.modalLabel}>📚 Clase</Text>
                <Text style={styles.modalValue}>{classNameById || qrData.className || qrData.name || 'Clase'}</Text>

                <View style={styles.divider} />

                <Text style={styles.modalLabel}>📅 Fecha</Text>
                <Text style={styles.modalValue}>{formatDate(qrData.fecha)}</Text>

                <View style={styles.divider} />

                <Text style={styles.modalLabel}>🕐 Horario</Text>
                <Text style={styles.modalValue}>{formatTime(qrData.hora)}</Text>

                <View style={styles.divider} />

                <Text style={styles.modalLabel}>📍 Sede</Text>
                <Text style={styles.modalValue}>{qrData.sede}</Text>

                {qrData.professor && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.modalLabel}>👤 Profesor</Text>
                    <Text style={styles.modalValue}>{qrData.professor}</Text>
                  </>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={handleCancelConfirmation}
                disabled={confirming}
              >
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmAttendance}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>✓ Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  footer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScannerScreen;
