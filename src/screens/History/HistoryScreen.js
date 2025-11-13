import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { getHistory } from '../../services/history';

const HistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    from: '',
    to: ''
  });
  const [selectedDates, setSelectedDates] = useState({});
  const [selectingDate, setSelectingDate] = useState(null); // 'from' | 'to' | null

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    updateSelectedDates(filters);
  }, [filters]);

  const loadHistory = async (customFilters = null) => {
    try {
      setLoading(true);
      const filtersToUse = customFilters || filters;
      const data = await getHistory(filtersToUse.from || filtersToUse.to ? filtersToUse : {});
      setHistory(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cargar el historial');
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  const onDateSelect = (day) => {
    const dateStr = day.dateString;
    
    if (selectingDate === 'from') {
      const newFilters = { ...filters, from: dateStr };
      // Si la fecha "desde" es posterior a la fecha "hasta", limpiar "hasta"
      if (filters.to && dateStr > filters.to) {
        newFilters.to = '';
      }
      setFilters(newFilters);
      updateSelectedDates(newFilters);
    } else if (selectingDate === 'to') {
      const newFilters = { ...filters, to: dateStr };
      // Si la fecha "hasta" es anterior a la fecha "desde", limpiar "desde"
      if (filters.from && dateStr < filters.from) {
        newFilters.from = '';
      }
      setFilters(newFilters);
      updateSelectedDates(newFilters);
    }
  };

  const updateSelectedDates = (currentFilters) => {
    const dates = {};
    
    if (currentFilters.from) {
      dates[currentFilters.from] = {
        selected: true,
        startingDay: true,
        color: '#4CAF50',
        textColor: 'white'
      };
    }
    
    if (currentFilters.to) {
      dates[currentFilters.to] = {
        selected: true,
        endingDay: true,
        color: '#4CAF50',
        textColor: 'white'
      };
    }
    
    // Marcar días entre las fechas seleccionadas
    if (currentFilters.from && currentFilters.to) {
      const start = new Date(currentFilters.from);
      const end = new Date(currentFilters.to);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr !== currentFilters.from && dateStr !== currentFilters.to) {
          dates[dateStr] = {
            selected: true,
            color: '#E8F5E8',
            textColor: '#2E7D32'
          };
        }
      }
      
      // Actualizar estilos de inicio y fin
      dates[currentFilters.from] = {
        selected: true,
        startingDay: true,
        color: '#4CAF50',
        textColor: 'white'
      };
      dates[currentFilters.to] = {
        selected: true,
        endingDay: true,
        color: '#4CAF50',
        textColor: 'white'
      };
    }
    
    setSelectedDates(dates);
  };

  const applyDateFilters = async () => {
    setShowFilters(false);
    await loadHistory(filters);
  };

  const clearFilters = async () => {
    const newFilters = { from: '', to: '' };
    setFilters(newFilters);
    setSelectedDates({});
    setSelectingDate(null);
    await loadHistory(newFilters);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'Seleccionar';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
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

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.disciplineInfo}>
          <Text style={styles.disciplineIcon}>
            {getDisciplineIcon(item.discipline)}
          </Text>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{item.name}</Text>
            <Text style={styles.discipline}>{item.discipline}</Text>
          </View>
        </View>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.time}>{formatTime(item.hora)}</Text>
          <Text style={styles.date}>{formatDate(item.fecha)}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👨‍🏫</Text>
            <Text style={styles.detailText}>Prof. {item.profesor}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{item.sede}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailText}>{item.duracion} min</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getDisciplineColor(item.discipline) }]}>
            <Text style={styles.statusText}>Asistida</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const FiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar por Rango de Fechas</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilters(false);
                setSelectingDate(null);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Selector de fechas */}
            <View style={styles.dateSelectors}>
              <View style={styles.dateSelector}>
                <Text style={styles.dateLabel}>Fecha desde:</Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    selectingDate === 'from' && styles.dateButtonActive
                  ]}
                  onPress={() => setSelectingDate('from')}
                >
                  <Text style={[
                    styles.dateButtonText,
                    selectingDate === 'from' && styles.dateButtonTextActive
                  ]}>
                    {formatDateShort(filters.from)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateSelector}>
                <Text style={styles.dateLabel}>Fecha hasta:</Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    selectingDate === 'to' && styles.dateButtonActive
                  ]}
                  onPress={() => setSelectingDate('to')}
                >
                  <Text style={[
                    styles.dateButtonText,
                    selectingDate === 'to' && styles.dateButtonTextActive
                  ]}>
                    {formatDateShort(filters.to)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Instrucciones */}
            {selectingDate && (
              <View style={styles.instructions}>
                <Text style={styles.instructionsText}>
                  {selectingDate === 'from' 
                    ? 'Selecciona la fecha de inicio en el calendario'
                    : 'Selecciona la fecha de fin en el calendario'
                  }
                </Text>
              </View>
            )}

            {/* Calendario */}
            {selectingDate && (
              <View style={styles.calendarContainer}>
                <Calendar
                  onDayPress={onDateSelect}
                  markedDates={selectedDates}
                  markingType="period"
                  theme={{
                    selectedDayBackgroundColor: '#4CAF50',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#4CAF50',
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#4CAF50',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#4CAF50',
                    monthTextColor: '#2d4150',
                    textDayFontFamily: 'System',
                    textMonthFontFamily: 'System',
                    textDayHeaderFontFamily: 'System',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13
                  }}
                  maxDate={new Date().toISOString().split('T')[0]}
                />
              </View>
            )}

            {/* Resumen de filtros */}
            {(filters.from || filters.to) && (
              <View style={styles.filterSummary}>
                <Text style={styles.filterSummaryTitle}>Filtros activos:</Text>
                {filters.from && (
                  <Text style={styles.filterSummaryText}>
                    Desde: {formatDateShort(filters.from)}
                  </Text>
                )}
                {filters.to && (
                  <Text style={styles.filterSummaryText}>
                    Hasta: {formatDateShort(filters.to)}
                  </Text>
                )}
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={applyDateFilters}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Header verde */}
        <View style={styles.header}>
          <Text style={styles.title}>Historial de Asistencias</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>🔍 Filtros</Text>
          </TouchableOpacity>
        </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>
            {loading ? 'Cargando...' : 'No hay asistencias en el rango de fechas seleccionado'}
          </Text>
          {(filters.from || filters.to) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersButtonText}>Limpiar Filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {history.length} asistencia{history.length !== 1 ? 's' : ''} encontrada{history.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.history_id.toString()}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Botón volver al final */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <FiltersModal />
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
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
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  filterButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  disciplineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  disciplineIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  discipline: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeInfo: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  filtersContent: {
    padding: 20,
    paddingBottom: 80,
  },
  dateSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateSelector: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#666',
  },
  dateButtonTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterSummary: {
    backgroundColor: '#F1F8E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  filterSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  filterSummaryText: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 4,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HistoryScreen;