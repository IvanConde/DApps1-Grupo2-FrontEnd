import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { getMyReservations, cancelReservation } from '../../services/reservations';

const ClassUser = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMyReservations();
      // Orden: próximamente primero
      data.sort((a, b) => {
        const da = new Date(`${a.fecha}T${a.hora}`);
        const db = new Date(`${b.fecha}T${b.hora}`);
        return da - db;
      });
      setReservations(data);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudieron cargar tus reservas');
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
        const classDate = new Date(fechaClaseISO);
        const now = new Date();

        console.log('Comparando clase:', classDate.toString(), '- Ahora:', now.toString());
        return classDate.getTime() > now.getTime();
    } catch (err) {
        console.error('Error parseando fecha/hora:', err);
        return false;
    }
    };
  const handleCancel = (item) => {
    Alert.alert(
      'Cancelar reserva',
      `¿Querés cancelar tu reserva para "${item.name}" (${item.sede}) el ${formatDate(item.fecha)} ${formatTime(item.hora)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(item.reservation_id);
              Alert.alert('Listo', 'Reserva cancelada');
              onRefresh();
            } catch (e) {
              Alert.alert('Error', e.message || 'No se pudo cancelar la reserva');
            }
          },
        },
      ]
    );
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

      {isCancelable(item) ? (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
          <Text style={styles.cancelTxt}>Cancelar reserva</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.disabledBtn}>
          <Text style={styles.disabledTxt}>
            {item.status !== 'confirmada' ? 'No cancelable' : 'Clase vencida'}
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  return (
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
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default ClassUser;