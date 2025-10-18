import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getClasses, getDisciplines, getSedes } from '../../services/classes';

const ClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    disciplina: '',
    sede: '',
    fecha: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Opciones para filtros
  const [disciplines, setDisciplines] = useState([]);
  const [sedes, setSedes] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [classes, filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classesData, disciplinesData, sedesData] = await Promise.all([
        getClasses(),
        getDisciplines(),
        getSedes()
      ]);
      
      setClasses(classesData);
      setDisciplines(disciplinesData);
      setSedes(sedesData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las clases');
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...classes];

    if (filters.disciplina) {
      filtered = filtered.filter(c => c.discipline === filters.disciplina);
    }
    if (filters.sede) {
      filtered = filtered.filter(c => c.sede === filters.sede);
    }
    if (filters.fecha) {
      filtered = filtered.filter(c => c.fecha === filters.fecha);
    }

    // Ordenar por fecha y hora
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.fecha} ${a.hora}`);
      const dateB = new Date(`${b.fecha} ${b.hora}`);
      return dateA - dateB;
    });

    setFilteredClasses(filtered);
  };

  const clearFilters = () => {
    setFilters({
      disciplina: '',
      sede: '',
      fecha: ''
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
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

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => navigation.navigate('ClassDetail', { classId: item.id })}
    >
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.disciplineIcon}>{getDisciplineIcon(item.discipline)}</Text>
          <View style={styles.classTexts}>
            <Text style={styles.className}>{item.name}</Text>
            <Text style={styles.classDiscipline}>{item.discipline}</Text>
          </View>
        </View>
        <View style={styles.classTime}>
          <Text style={styles.timeText}>{formatTime(item.hora)}</Text>
          <Text style={styles.dateText}>{formatDate(item.fecha)}</Text>
        </View>
      </View>
      
      <View style={styles.classDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Profesor:</Text>
          <Text style={styles.detailValue}>{item.profesor}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Sede:</Text>
          <Text style={styles.detailValue}>{item.sede}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duración:</Text>
          <Text style={styles.detailValue}>{item.duracion} min</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cupos:</Text>
          <Text style={[styles.detailValue, item.cupo <= 5 && styles.lowCupo]}>
            {item.cupo} disponibles
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Filtrar Clases</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Disciplina</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.disciplina}
                  onValueChange={(value) => setFilters({...filters, disciplina: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Todas las disciplinas" value="" />
                  {disciplines.map((discipline) => (
                    <Picker.Item
                      key={discipline}
                      label={discipline}
                      value={discipline}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sede</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.sede}
                  onValueChange={(value) => setFilters({...filters, sede: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Todas las sedes" value="" />
                  {sedes.map((sede) => (
                    <Picker.Item
                      key={sede}
                      label={sede}
                      value={sede}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando clases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Clases</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filterButtonText}>🔍 Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredClasses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {classes.length === 0 ? 'No hay clases disponibles' : 'No hay clases que coincidan con los filtros'}
          </Text>
          {classes.length > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersButtonText}>Limpiar Filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {filteredClasses.length} clase{filteredClasses.length !== 1 ? 's' : ''} encontrada{filteredClasses.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <FlatList
            data={filteredClasses}
            renderItem={renderClassItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <FiltersModal />
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
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
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  disciplineIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  classTexts: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  classDiscipline: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  classTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  classDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  lowCupo: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    maxHeight: '80%',
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

export default ClassesScreen;