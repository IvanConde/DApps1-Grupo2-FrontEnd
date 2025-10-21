import React, { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { createReservation } from '../../services/reservations';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { getClassById } from '../../services/classes';

const ClassDetailScreen = ({ route, navigation }) => {
  const { classId, fromMyReservations } = route.params || {};
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassDetail();
  }, [classId]);

  const loadClassDetail = async () => {
    try {
      setLoading(true);
      const data = await getClassById(classId);
      setClassData(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el detalle de la clase');
      console.error('Error cargando detalle:', error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const time = timeString.substring(0, 5); // HH:MM
    return time;
  };

  const getDisciplineIcon = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'funcional': return '💪';
      case 'yoga': return '🧘';
      case 'spinning': return '🚴';
      default: return '🏃';
    }
  };

  const getDisciplineColor = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'funcional': return '#FF5722';
      case 'yoga': return '#9C27B0';
      case 'spinning': return '#2196F3';
      default: return '#4CAF50';
    }
  };

const [showModal, setShowModal] = useState(false);
const [reserving, setReserving] = useState(false);

const handleReserve = () => {
  if (classData.cupo <= 0) {
    Alert.alert('Sin cupo disponible', 'No se puede reservar esta clase.');
    return;
  }
  setShowModal(true);
};

const confirmReservation = async () => {
  try {
    setReserving(true);
    const result = await createReservation(classData.id);
    Alert.alert('✅ Reserva confirmada', 'Tu reserva fue creada exitosamente.');
    setClassData({ ...classData, cupo: result.cupo_restante });
  } catch (error) {
    Alert.alert('Error', error.error || 'No se pudo crear la reserva.');
  } finally {
    setReserving(false);
    setShowModal(false);
  }
};


  const handleShowLocation = () => {
    // TODO: Implementar "Cómo llegar" (punto 7)
    Alert.alert('Próximamente', 'Función de navegación próximamente disponible');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró la clase</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const disciplineColor = getDisciplineColor(classData.discipline);

  return (
    
    <ScrollView style={styles.container}>
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
        classData.cupo > 0 ? (
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
    </ScrollView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dateTimeItem: {
    alignItems: 'center',
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