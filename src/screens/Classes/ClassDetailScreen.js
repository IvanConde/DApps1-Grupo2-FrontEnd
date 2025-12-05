/**
 * ClassDetailScreen.js
 * 
 * Pantalla de detalle de una clase individual del catálogo.
 * Muestra información completa de la clase y permite:
 * - Ver detalles (profesor, sede, horario, cupo)
 * - Crear nueva reserva (si hay cupo y no tiene reserva activa)
 * - Abrir ubicación en Google Maps
 * - Navegar de vuelta al catálogo o a "Mis Reservas"
 */

import React, { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { createReservation, getMyReservations } from '../../services/reservations';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClassById } from '../../services/classes';

const ClassDetailScreen = ({ route, navigation }) => {
  // Parámetro de navegación para saber si vengo de reservas o catalogo
  const { classId, fromMyReservations } = route.params || {};
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasReservation, setHasReservation] = useState(false);


  useEffect(() => {
    loadClassDetail();              // Cargar detalle de la clase desde API
    checkExistingReservation();     // Verificar si ya tiene reserva activa
  }, [classId]); // Se re-ejecuta si cambia el ID de clase

  /**
   * Carga el detalle de la clase desde el backend
   * GET /classes/:id
   * 
   * Si falla, muestra modal de error y vuelve atrás después de 2 segundos
   */
  const loadClassDetail = async () => {
    try {
      setLoading(true);
      const data = await getClassById(classId);
      setClassData(data);
    } catch (error) {
      setErrorTitle('❌ Error');
      setErrorMessage('No se pudo cargar el detalle de la clase');
      setShowErrorModal(true);
      console.error('Error cargando detalle:', error);
      setTimeout(() => navigation.goBack(), 2000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica si el usuario ya tiene una reserva activa para esta clase
   * GET /reservations/me
   * 
   * Filtra solo reservas con status !== 'cancelada'
   * Esto permite que después de cancelar, se pueda volver a reservar la misma clase
   * 
   */
  const checkExistingReservation = async () => {
    try {
      const myReservations = await getMyReservations();
      
      const hasReserved = myReservations.some(reservation => 
        reservation.id === parseInt(classId) && reservation.status !== 'cancelada'
      );
      
      setHasReservation(hasReserved);
    } catch (error) {
      console.error('Error verificando reservas:', error);
    }
  };

  // === FUNCIONES DE FORMATEO ===
  
  /**
   * Formatea fecha para mostrar: "mié, 04 dic 2025"
   * Usa formato corto para evitar textos largos que rompan el layout
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Extrae HH:MM de un string de tiempo
   * Input: "14:30:00" -> Output: "14:30"
   */
  const formatTime = (timeString) => {
    const time = timeString.substring(0, 5); // HH:MM
    return time;
  };

  /**
   * Retorna emoji correspondiente a cada disciplina
   */
  const getDisciplineIcon = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'funcional': return '💪';
      case 'yoga': return '🧘';
      case 'spinning': return '🚴';
      default: return '🏃';
    }
  };

  /**
   * Retorna color de tema según disciplina (para header y botón de reservar)
   */
  const getDisciplineColor = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'funcional': return '#FF5722';
      case 'yoga': return '#9C27B0';
      case 'spinning': return '#2196F3';
      default: return '#4CAF50';
    }
  };

// === ESTADOS DE MODALES Y RESERVA ===
const [showModal, setShowModal] = useState(false);           // Modal de confirmación de reserva
const [reserving, setReserving] = useState(false);           // Indica si está procesando la reserva
const [showSuccessModal, setShowSuccessModal] = useState(false);  // Modal de éxito
const [showErrorModal, setShowErrorModal] = useState(false);      // Modal de error
const [errorMessage, setErrorMessage] = useState('');        // Mensaje de error a mostrar
const [errorTitle, setErrorTitle] = useState('Error');       // Título del modal de error

/**
 * Validación antes de mostrar modal de confirmación
 * Verifica que haya cupo disponible
 */
const handleReserve = () => {
  if (classData.cupo <= 0) {
    setErrorTitle('⚠️ Sin cupo');
    setErrorMessage('No se puede reservar esta clase.');
    setShowErrorModal(true);
    return;
  }
  setShowModal(true);
};

/**
 * Confirma y crea la reserva en el backend
 * POST /reservations { class_id: X }
 * 
 * Validaciones del backend:
 * - Reserva con mínimo 1 hora de anticipación
 * - No superposición con otras reservas activas
 * - Cupo disponible
 * 
 * Al éxito:
 * - Actualizamos cupo local con el valor retornado
 * - Marca hasReservation = true para actualizar UI
 * - Muestra modal de éxito
 */
const confirmReservation = async () => {
  try {
    setReserving(true);
    const result = await createReservation(classData.id);
    
    // Actualizar cupo local con el valor retornado por el backend
    setClassData({ ...classData, cupo: result.cupo_restante });
    
    setHasReservation(true);
    
    setShowModal(false);
    setShowSuccessModal(true);
  } catch (error) {
    const msg = error?.message || error?.error || 'No se pudo crear la reserva.';
    setErrorTitle('❌ Error');
    setErrorMessage(msg);
    setShowErrorModal(true);
  } finally {
    setReserving(false);
  }
};


  /**
   * Abre la URL de Google Maps en la aplicación o navegador
   * 
   * Usa Linking.openURL() directamente sin validar con canOpenURL()
   * porque en Android canOpenURL() requiere declarar schemes en AndroidManifest
   * y es muy restrictivo.
   * 
   * Comportamiento:
   * - Si tiene Google Maps instalado -> abre en la app
   * - Si no -> abre en el navegador
   */
  const handleShowLocation = async () => {
    const url = classData?.direccion;
    
    console.log('🗺️ [ClassDetail] Intentando abrir URL:', url);
    
    if (!url) {
      setErrorTitle('📍 Dirección no disponible');
      setErrorMessage('Esta clase no tiene enlace de ubicación configurado.');
      setShowErrorModal(true);
      return;
    }
    
    try {
      await Linking.openURL(url);
      console.log('🗺️ [ClassDetail] URL abierta exitosamente');
    } catch (e) {
      console.error('🗺️ [ClassDetail] Error abriendo URL:', e);
      setErrorTitle('❌ Error al abrir el mapa');
      setErrorMessage(`No se pudo abrir Google Maps. Verifica que tengas la aplicación instalada.\n\nURL: ${url}`);
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando detalle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
        <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró la clase</Text>
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

  const disciplineColor = getDisciplineColor(classData.discipline);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top', 'bottom']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header con degradado */}
      <View style={[styles.header, { backgroundColor: disciplineColor }]}>
        <View style={styles.headerContent}>
          <Text style={styles.disciplineIcon}>
            {getDisciplineIcon(classData.discipline)}
          </Text>
          <View style={styles.headerTexts}>
            <Text style={styles.className}>{classData.name}</Text>
            <Text style={styles.discipline}>{classData.discipline}</Text>
          </View>
        </View>
      </View>

      {/* Información principal */}
      <View style={styles.mainInfo}>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeItem}>
            <Text style={styles.dateTimeLabel}>Fecha</Text>
            <Text style={styles.dateTimeValue}>{formatDate(classData.fecha)}</Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Text style={styles.dateTimeLabel}>Hora</Text>
            <Text style={styles.dateTimeValue}>{formatTime(classData.hora)}</Text>
          </View>
        </View>

        <View style={styles.cupoContainer}>
          <View style={styles.cupoInfo}>
            <Text style={styles.cupoNumber}>{classData.cupo}</Text>
            <Text style={styles.cupoLabel}>cupos disponibles</Text>
          </View>
          <View style={[
            styles.cupoIndicator,
            classData.cupo <= 5 ? styles.cupoLow : styles.cupoGood
          ]} />
        </View>
      </View>

      {/* Detalles */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Detalles de la Clase</Text>
        
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>👨‍🏫</Text>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Profesor</Text>
                <Text style={styles.detailValue}>{classData.profesor}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Sede</Text>
                <Text style={styles.detailValue}>{classData.sede}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleShowLocation}
            >
              <Text style={styles.locationButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏱️</Text>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Duración</Text>
                <Text style={styles.detailValue}>{classData.duracion} minutos</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Información adicional */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Información Importante</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            • Llega 10 minutos antes del inicio de la clase
          </Text>
          <Text style={styles.infoText}>
            • Trae tu botella de agua y toalla
          </Text>
          <Text style={styles.infoText}>
            • Puedes cancelar hasta 2 horas antes
          </Text>
          <Text style={styles.infoText}>
            • Escanea el QR en recepción para confirmar asistencia
          </Text>
        </View>
      </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
      {/* ✅ Mostrar botón solo si NO venís desde Mis Reservas */}
      {!fromMyReservations && (
        hasReservation ? (
          <View style={styles.alreadyReservedButton}>
            <Text style={styles.alreadyReservedText}>✅ Ya tienes esta clase reservada</Text>
          </View>
        ) : classData.cupo > 0 ? (
          <TouchableOpacity
            style={[styles.reserveButton, { backgroundColor: disciplineColor }]}
            onPress={handleReserve}
          >
            <Text style={styles.reserveButtonText}>Reservar Clase</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fullButton}>
            <Text style={styles.fullButtonText}>Clase Completa</Text>
          </View>
        )
      )}

      <TouchableOpacity
        style={styles.backToListButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backToListButtonText}>
          {fromMyReservations ? 'Volver a Mis Reservas' : 'Volver al Catálogo'}
        </Text>
      </TouchableOpacity>
    </View>
          <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowModal(false)}
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
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Cupo disponible
          </Text>
          <Text style={{ fontSize: 15, color: '#555', marginBottom: 20 }}>
            ¿Deseas confirmar tu reserva?
          </Text>
          <Text style={{ fontSize: 14, color: '#777', marginBottom: 20 }}>
            {formatDate(classData.fecha)} – {formatTime(classData.hora)}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#4CAF50',
                padding: 10,
                borderRadius: 8,
                marginRight: 10,
                alignItems: 'center'
              }}
              onPress={confirmReservation}
              disabled={reserving}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {reserving ? 'Reservando...' : 'Aceptar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#ccc',
                padding: 10,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancelar</Text>
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
            Reserva confirmada
          </Text>
          <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
            Tu reserva fue creada exitosamente
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
            {errorTitle.includes('📍') ? '📍' : errorTitle.includes('⚠️') ? '⚠️' : '❌'}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#FF5252' }}>
            {errorTitle.replace(/[📍⚠️❌]/g, '').trim()}
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
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disciplineIcon: {
    fontSize: 48,
    marginRight: 20,
  },
  headerTexts: {
    flex: 1,
  },
  className: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  discipline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  mainInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTimeItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap'
  },
  cupoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cupoInfo: {
    alignItems: 'center',
    marginRight: 15,
  },
  cupoNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cupoLabel: {
    fontSize: 14,
    color: '#666',
  },
  cupoIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cupoGood: {
    backgroundColor: '#4CAF50',
  },
  cupoLow: {
    backgroundColor: '#FF5722',
  },
  detailsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 25,
    textAlign: 'center',
  },
  detailTexts: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  actionButtons: {
    margin: 20,
  },
  reserveButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullButton: {
    backgroundColor: '#ccc',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  fullButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alreadyReservedButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  alreadyReservedText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToListButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backToListButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClassDetailScreen;