import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyReservations, cancelReservation } from '../../services/reservations';

const ClassUser = ({ navigation, route }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [cancelledData, setCancelledData] = useState(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLoadErrorModal, setShowLoadErrorModal] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');

  useEffect(() => {
    loadReservations();
  }, []);

  // Manejar parámetros de notificación de reprogramación
  useEffect(() => {
    if (route.params?.showRescheduleModal) {
      const {
        reservationId,
        classId,
        oldDate,
        oldTime,
        newDate,
        newTime,
        className,
        sede,
      } = route.params;
      
      console.log('[ClassUser] Recibido de notificación:', {
        oldDate, oldTime, newDate, newTime, className, sede
      });
      
      setRescheduleData({
        reservationId,
        classId,
        oldDate,
        oldTime,
        newDate,
        newTime,
        className: className || 'Clase',
        sede: sede || '',
      });
      setShowRescheduleModal(true);
      
      // Limpiar parámetros para evitar que se muestre nuevamente
      navigation.setParams({ showRescheduleModal: false });
    }
  }, [route.params]);

  // Manejar parámetros de notificación de cancelación
  useEffect(() => {
    if (route.params?.showCancelledModal) {
      const { className, sede, fecha, hora } = route.params;
      
      setCancelledData({
        className: className || 'Clase',
        sede: sede || '',
        fecha,
        hora,
      });
      setShowCancelledModal(true);
      
      // Limpiar parámetros
      navigation.setParams({ showCancelledModal: false });
    }
  }, [route.params]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMyReservations();
      
      // Marcar como expiradas las clases donde pasó la ventana de QR sin confirmar asistencia
      const now = new Date();
      data.forEach(item => {
        if (item.status === 'expirada' && item.attendance_status === 'not_attended') {
          try {
            const fechaClaseISO = item.fecha || item.class?.fecha;
            const horaClase = item.hora || item.class?.hora;
            
            if (fechaClaseISO && horaClase) {
              const fechaOnly = fechaClaseISO.split('T')[0];
              const horaOnly = horaClase.substring(0, 5);
              
              const parts = fechaOnly.split('-');
              const classDateTime = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2]),
                parseInt(horaOnly.substring(0, 2)),
                parseInt(horaOnly.substring(3, 5))
              );
              
              // Ventana termina 30 min después de la clase
              const thirtyMinAfter = new Date(classDateTime.getTime() + 30 * 60 * 1000);
              
              // Si ya pasaron los 30 min y no asistió, marcar como expirada
              if (now > thirtyMinAfter) {
                item.status = 'expirada';
              }
            }
          } catch (err) {
            console.error('Error validando expiración:', err);
          }
        }
      });
      
      // Orden: próximamente primero
      data.sort((a, b) => {
        // Parsear como hora local: YYYY-MM-DD + T + HH:MM:SS
        const partsA = a.fecha.split('-');
        const da = new Date(parseInt(partsA[0]), parseInt(partsA[1]) - 1, parseInt(partsA[2]), 
                            parseInt(a.hora.substring(0, 2)), parseInt(a.hora.substring(3, 5)));
        
        const partsB = b.fecha.split('-');
        const db = new Date(parseInt(partsB[0]), parseInt(partsB[1]) - 1, parseInt(partsB[2]),
                            parseInt(b.hora.substring(0, 2)), parseInt(b.hora.substring(3, 5)));
        
        return da - db;
      });
      setReservations(data);
    } catch (e) {
      setLoadErrorMessage(e.message || 'No se pudieron cargar tus reservas');
      setShowLoadErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  }, []);
  
  const isCancelable = (item) => {
    if (item.status !== 'confirmada') return false;

    try {
        const fechaClaseISO = item.fecha || item.class?.fecha;
        const horaClase = item.hora || item.class?.hora;

        if (!fechaClaseISO || !horaClase) {
        console.warn('Clase sin fecha u hora:', item);
        return false;
        }
        
        // Extraer solo la fecha (YYYY-MM-DD) del string ISO
        const fechaOnly = fechaClaseISO.split('T')[0];
        // Extraer solo HH:MM del horaClase (por si viene con segundos)
        const horaOnly = horaClase.substring(0, 5);
        
        // Parsear como hora local sin conversión UTC
        const parts = fechaOnly.split('-');
        const classDateTime = new Date(
          parseInt(parts[0]), 
          parseInt(parts[1]) - 1, 
          parseInt(parts[2]),
          parseInt(horaOnly.substring(0, 2)),
          parseInt(horaOnly.substring(3, 5))
        );
        const now = new Date();

        // Calcular el límite de cancelación: 2 horas antes de la clase
        const twoHoursBefore = new Date(classDateTime.getTime() - 2 * 60 * 60 * 1000);

        // Se puede cancelar si ahora estamos ANTES del límite de 2 horas
        return now.getTime() < twoHoursBefore.getTime();
    } catch (err) {
        console.error('Error parseando fecha/hora:', err);
        return false;
    }
  };

  const canScanQR = (item) => {
    // Puede escanear QR si:
    // 1. Está confirmada
    // 2. No ha escaneado aún (attendance_status === 'pending')
    // 3. Está en la ventana de tiempo (30m antes hasta 30min después)
    if (item.status !== 'confirmada' || item.attendance_status !== 'pending') return false;

    try {
      const fechaClaseISO = item.fecha || item.class?.fecha;
      const horaClase = item.hora || item.class?.hora;

      if (!fechaClaseISO || !horaClase) return false;
      
      const fechaOnly = fechaClaseISO.split('T')[0];
      const horaOnly = horaClase.substring(0, 5);
      
      // Parsear como hora local
      const parts = fechaOnly.split('-');
      const classDateTime = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(horaOnly.substring(0, 2)),
        parseInt(horaOnly.substring(3, 5))
      );
      const now = new Date();

      // Ventana: desde 30m antes hasta 30 min después
      const thirtyMinBefore = new Date(classDateTime.getTime() - 30 * 60 * 1000);
      const thirtyMinAfter = new Date(classDateTime.getTime() + 30 * 60 * 1000);

      return now >= thirtyMinBefore && now <= thirtyMinAfter;
    } catch (err) {
      console.error('Error validando ventana QR:', err);
      return false;
    }
  };

  const handleScanQR = (item) => {
    navigation.navigate('QRScanner', {
      reservationData: {
        reservation_id: item.reservation_id,
        class_id: item.id,
        class_name: item.name,
      }
    });
  };
  const handleCancel = (item) => {
    setCancelItem(item);
    setShowCancelConfirmModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelItem) return;
    
    try {
      setShowCancelConfirmModal(false);
      await cancelReservation(cancelItem.reservation_id);
      setSuccessMessage('Reserva cancelada exitosamente');
      setShowSuccessModal(true);
      onRefresh();
    } catch (e) {
      setErrorMessage(e.message || 'No se pudo cancelar la reserva');
      setShowErrorModal(true);
    } finally {
      setCancelItem(null);
    }
  };

  // Manejar aceptar reprogramación (mantener reserva)
  const handleAcceptReschedule = () => {
    setShowRescheduleModal(false);
    setSuccessMessage('Tu reserva se actualizó con el nuevo horario');
    setShowSuccessModal(true);
    onRefresh();
  };

  // Manejar cancelar reprogramación (eliminar reserva)
  const handleCancelReschedule = async () => {
    if (!rescheduleData?.reservationId) {
      setShowRescheduleModal(false);
      return;
    }

    try {
      await cancelReservation(rescheduleData.reservationId);
      setShowRescheduleModal(false);
      setSuccessMessage('Has cancelado tu reserva para esta clase reprogramada');
      setShowSuccessModal(true);
      onRefresh();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cancelar la reserva');
      setShowErrorModal(true);
      setShowRescheduleModal(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const formatTime = (timeStr) => timeStr?.substring(0, 5);

  const getDisciplineIcon = (discipline) => {
    switch ((discipline || '').toLowerCase()) {
      case 'funcional': return '💪';
      case 'yoga': return '🧘';
      case 'spinning': return '🚴';
      default: return '🏃';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ClassDetail', { 
        classId: item.id,
        fromMyReservations: true  // 👈 nuevo parámetro
        })}
        style={{ flex: 1 }}
      >
        <View style={styles.rowTop}>
          <Text style={styles.icon}>{getDisciplineIcon(item.discipline)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.discipline} • {item.sede}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.time}>{formatTime(item.hora)}</Text>
            <Text style={styles.date}>{formatDate(item.fecha)}</Text>
          </View>
        </View>

        <View style={styles.rowMid}>
          <Text style={styles.meta}>Profesor: {item.profesor}</Text>
          <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status}</Text>
        </View>
      </TouchableOpacity>

      {/* Botón Escanear QR - Solo si está en ventana de tiempo */}
      {canScanQR(item) && (
        <TouchableOpacity 
          style={styles.scanQRBtn} 
          onPress={() => handleScanQR(item)}
        >
          <Text style={styles.scanQRTxt}>📱 Escanear QR para confirmar asistencia</Text>
        </TouchableOpacity>
      )}

      {/* Mostrar si ya escaneó */}
      {item.attendance_status === 'attended' && (
        <View style={styles.attendedBadge}>
          <Text style={styles.attendedTxt}>✅ Asistencia confirmada</Text>
        </View>
      )}

      {/* Botón Cancelar - Solo si es cancelable */}
      {isCancelable(item) ? (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
          <Text style={styles.cancelTxt}>Cancelar reserva</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.disabledBtn}>
          <Text style={styles.disabledTxt}>
            {item.status !== 'confirmada' ? 'No cancelable' : 'No es posible cancelar esta clase'}
          </Text>
        </View>
      )}
    </View>
  );

  const badgeStyle = (status) => {
    switch (status) {
      case 'confirmada': return { backgroundColor: '#E8F5E9', color: '#1B5E20' };
      case 'cancelada': return { backgroundColor: '#FFEBEE', color: '#B71C1C' };
      case 'expirada':  return { backgroundColor: '#ECEFF1', color: '#37474F' };
      default:          return { backgroundColor: '#ECEFF1', color: '#37474F' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis reservas</Text>
        </View>

      {reservations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aún no tenés reservas.</Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Classes')}
          >
            <Text style={styles.linkTxt}>Ir al catálogo de clases</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(it) => `${it.reservation_id}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Botón volver al final */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      {/* Modal de reprogramación */}
      <Modal
        visible={showRescheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📅 Clase Reprogramada</Text>
            
            {rescheduleData && (
              <>
                <Text style={styles.modalClassName}>{rescheduleData.className}</Text>
                
                <View style={styles.modalDatesContainer}>
                  <View style={styles.modalDateBox}>
                    <Text style={styles.modalDateLabel}>Horario anterior:</Text>
                    <Text style={styles.modalDateValue}>
                      {formatDate(rescheduleData.oldDate)}
                    </Text>
                    <Text style={styles.modalTimeValue}>
                      {formatTime(rescheduleData.oldTime)}
                    </Text>
                  </View>
                  
                  <Text style={styles.modalArrow}>→</Text>
                  
                  <View style={styles.modalDateBox}>
                    <Text style={styles.modalDateLabel}>Nuevo horario:</Text>
                    <Text style={[styles.modalDateValue, styles.modalDateNew]}>
                      {formatDate(rescheduleData.newDate)}
                    </Text>
                    <Text style={[styles.modalTimeValue, styles.modalTimeNew]}>
                      {formatTime(rescheduleData.newTime)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.modalQuestion}>
                  ¿Qué deseas hacer con tu reserva?
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonAccept}
                    onPress={handleAcceptReschedule}
                  >
                    <Text style={styles.modalButtonText}>✅ Mantener Reserva</Text>
                    <Text style={styles.modalButtonSubtext}>Acepto el nuevo horario</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={handleCancelReschedule}
                  >
                    <Text style={styles.modalButtonText}>❌ Cancelar Reserva</Text>
                    <Text style={styles.modalButtonSubtext}>No me conviene el cambio</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de clase cancelada */}
      <Modal
        visible={showCancelledModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelledModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>❌ Clase Cancelada</Text>
            
            {cancelledData && (
              <>
                <View style={styles.cancelledIconContainer}>
                  <Text style={styles.cancelledIcon}>😔</Text>
                </View>
                
                <Text style={styles.modalClassName}>{cancelledData.className}</Text>
                
                {cancelledData.sede && (
                  <Text style={styles.cancelledSede}>{cancelledData.sede}</Text>
                )}
                
                {cancelledData.fecha && cancelledData.hora && (
                  <View style={styles.cancelledDateContainer}>
                    <Text style={styles.cancelledDate}>
                      {formatDate(cancelledData.fecha)} • {formatTime(cancelledData.hora)}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.cancelledMessage}>
                  Lo sentimos, esta clase ha sido cancelada por el gimnasio.
                </Text>
                
                <Text style={styles.cancelledSubtext}>
                  Tu reserva fue automáticamente cancelada.
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonAccept}
                    onPress={() => {
                      setShowCancelledModal(false);
                      navigation.navigate('Classes');
                    }}
                  >
                    <Text style={styles.modalButtonText}>🔍 Buscar Otra Clase</Text>
                    <Text style={styles.modalButtonSubtext}>Ir al catálogo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalButtonClose}
                    onPress={() => {
                      setShowCancelledModal(false);
                      onRefresh();
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de cancelación */}
      <Modal
        visible={showCancelConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelConfirmModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ⚠️
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
              Cancelar reserva
            </Text>
            {cancelItem && (
              <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
                ¿Querés cancelar tu reserva para "{cancelItem.name}" ({cancelItem.sede}) el {formatDate(cancelItem.fecha)} {formatTime(cancelItem.hora)}?
              </Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#ccc',
                  padding: 12,
                  borderRadius: 8,
                  marginRight: 10,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowCancelConfirmModal(false);
                  setCancelItem(null);
                }}
              >
                <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>
                  No
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#FF5252',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={confirmCancel}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  Sí, cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ✅
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#4CAF50' }}>
              Listo
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              {successMessage}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de error */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ❌
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#FF5252' }}>
              Error
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF5252',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de error de carga */}
      <Modal
        visible={showLoadErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoadErrorModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 25,
            width: '85%',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>
              ❌
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#FF5252' }}>
              Error
            </Text>
            <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
              {loadErrorMessage}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF5252',
                padding: 12,
                borderRadius: 8,
                width: '100%',
                alignItems: 'center'
              }}
              onPress={() => setShowLoadErrorModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4CAF50', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 24, marginRight: 10 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  meta: { fontSize: 13, color: '#666' },
  time: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  date: { fontSize: 12, color: '#666' },
  rowMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },

  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, textTransform: 'capitalize',
  },

  scanQRBtn: {
    marginTop: 10, 
    backgroundColor: '#4CAF50', 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scanQRTxt: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },

  attendedBadge: {
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  attendedTxt: {
    color: '#1B5E20',
    fontWeight: '700',
  },

  cancelBtn: {
    marginTop: 10, backgroundColor: '#FF5252', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  cancelTxt: { color: '#fff', fontWeight: '700' },

  disabledBtn: {
    marginTop: 10, backgroundColor: '#eee', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  disabledTxt: { color: '#777', fontWeight: '600' },

  backButton: {
    margin: 20,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#666', fontSize: 16, marginBottom: 10 },
  linkBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  linkTxt: { color: '#fff', fontWeight: '700' },

  // Estilos del modal de reprogramación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalClassName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  modalDateBox: {
    flex: 1,
    alignItems: 'center',
  },
  modalDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  modalDateNew: {
    color: '#4CAF50',
  },
  modalTimeNew: {
    color: '#4CAF50',
  },
  modalArrow: {
    fontSize: 24,
    color: '#4CAF50',
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  modalQuestion: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButtons: {
    gap: 12,
  },
  modalButtonAccept: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonCancel: {
    backgroundColor: '#FF5252',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  
  // Estilos para modal de clase cancelada
  cancelledIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelledIcon: {
    fontSize: 64,
  },
  cancelledSede: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  cancelledDateContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  cancelledDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelledMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
    lineHeight: 22,
  },
  cancelledSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonClose: {
    backgroundColor: '#999',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ClassUser;