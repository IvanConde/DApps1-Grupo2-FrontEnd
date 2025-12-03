import React, { useState, useEffect } from "react";
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
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { getClasses, getDisciplines, getSedes } from "../../services/classes";

// Helper para parsear fechas YYYY-MM-DD sin desplazamiento de zona horaria
const parseYMD = (dateString) => {
  if (!dateString) return null;
  const parts = String(dateString).slice(0, 10).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
};

const ClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    disciplina: "",
    sede: "",
    fechaDesde: "", // String YYYY-MM-DD
    fechaHasta: "", // String YYYY-MM-DD
  });
  const [showFilters, setShowFilters] = useState(false);

  // Para Calendar
  const [selectedDates, setSelectedDates] = useState({});
  const [selectingDate, setSelectingDate] = useState(null); // 'from' | 'to' | null
  
  // Para selectores personalizados
  const [showDisciplineSelector, setShowDisciplineSelector] = useState(false);
  const [showSedeSelector, setShowSedeSelector] = useState(false);

  // Opciones para filtros
  const [disciplines, setDisciplines] = useState([]);
  const [sedes, setSedes] = useState([]);

  useEffect(() => {
    const isFabric = global?.nativeFabricUIManager != null;
    if (
      Platform.OS === "android" &&
      !isFabric &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [classes, filters]);

  useEffect(() => {
    updateSelectedDates(filters);
  }, [filters]);

  const runDropdownAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classesData, disciplinesData, sedesData] = await Promise.all([
        getClasses(),
        getDisciplines(),
        getSedes(),
      ]);

      setClasses(classesData);
      setDisciplines(disciplinesData);
      setSedes(sedesData);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las clases");
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const normalizeDateOnly = (d) => {
    // Devuelve un Date a las 00:00 local del día dado (d puede ser string o Date)
    if (!d) return null;
    
    if (d instanceof Date) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    
    // Si es string YYYY-MM-DD, parsearlo como hora local
    const dateStr = String(d).slice(0, 10);
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  };

  const applyFilters = () => {
    let filtered = [...classes];

    if (filters.disciplina) {
      filtered = filtered.filter((c) => c.discipline === filters.disciplina);
    }
    if (filters.sede) {
      filtered = filtered.filter((c) => c.sede === filters.sede);
    }

    // Filtrado por rango de fechas (fechaDesde/fechaHasta)
    const from = normalizeDateOnly(filters.fechaDesde);
    const to = normalizeDateOnly(filters.fechaHasta);

    if (from || to) {
      filtered = filtered.filter((c) => {
        const cDate = normalizeDateOnly(c.fecha);
        if (!cDate) return false;
        if (from && cDate < from) return false;
        if (to && cDate > to) return false;
        return true;
      });
    }

    // Ordenar por fecha y hora (robusto)
    filtered.sort((a, b) => {
      const aDate = new Date(
        `${(a.fecha || "").slice(0, 10)} ${a.hora || "00:00"}`
      );
      const bDate = new Date(
        `${(b.fecha || "").slice(0, 10)} ${b.hora || "00:00"}`
      );
      return aDate - bDate;
    });

    setFilteredClasses(filtered);
  };

  const clearFilters = () => {
    setFilters({
      disciplina: "",
      sede: "",
      fechaDesde: "",
      fechaHasta: "",
    });
    setSelectedDates({});
    setSelectingDate(null);
    setShowDisciplineSelector(false);
    setShowSedeSelector(false);
  };

  const clearDates = () => {
    setFilters((prev) => ({ ...prev, fechaDesde: "", fechaHasta: "" }));
    setSelectedDates({});
  };

  // Función para manejar la selección de fechas en el Calendar
  const onDateSelect = (day) => {
    const dateStr = day.dateString; // YYYY-MM-DD

    if (selectingDate === 'from') {
      const newFilters = { ...filters, fechaDesde: dateStr };
      // Si la fecha "desde" es posterior a la fecha "hasta", limpiar "hasta"
      if (filters.fechaHasta && dateStr > filters.fechaHasta) {
        newFilters.fechaHasta = '';
      }
      setFilters(newFilters);
      updateSelectedDates(newFilters);
    } else if (selectingDate === 'to') {
      const newFilters = { ...filters, fechaHasta: dateStr };
      // Si la fecha "hasta" es anterior a la fecha "desde", limpiar "desde"
      if (filters.fechaDesde && dateStr < filters.fechaDesde) {
        newFilters.fechaDesde = '';
      }
      setFilters(newFilters);
      updateSelectedDates(newFilters);
    }
  };

  // Actualizar las fechas marcadas en el calendario
  const updateSelectedDates = (currentFilters) => {
    try {
      const dates = {};
      
      if (currentFilters.fechaDesde) {
        dates[currentFilters.fechaDesde] = {
          selected: true,
          startingDay: true,
          color: '#4CAF50',
          textColor: 'white'
        };
      }
      
      if (currentFilters.fechaHasta) {
        dates[currentFilters.fechaHasta] = {
          selected: true,
          endingDay: true,
          color: '#4CAF50',
          textColor: 'white'
        };
      }
      
      // Marcar días entre las fechas seleccionadas
      if (currentFilters.fechaDesde && currentFilters.fechaHasta) {
        const start = new Date(currentFilters.fechaDesde);
        const end = new Date(currentFilters.fechaHasta);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (dateStr !== currentFilters.fechaDesde && dateStr !== currentFilters.fechaHasta) {
            dates[dateStr] = {
              selected: true,
              color: '#E8F5E8',
              textColor: '#2E7D32'
            };
          }
        }

        // Actualizar estilos de inicio y fin
        dates[currentFilters.fechaDesde] = {
          selected: true,
          startingDay: true,
          color: '#4CAF50',
          textColor: 'white'
        };
        dates[currentFilters.fechaHasta] = {
          selected: true,
          endingDay: true,
          color: '#4CAF50',
          textColor: 'white'
        };
      }
      
      setSelectedDates(dates);
    } catch (err) {
      console.warn('Error updating selected dates:', err);
      setSelectedDates({});
    }
  };

  const formatDateHuman = (dateString) => {
    if (!dateString) return "";
    const date = parseYMD(dateString);
    if (!date || isNaN(date.getTime())) return "";
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'Seleccionar';
    
    // Parsear string YYYY-MM-DD como hora local
    const parts = dateString.split('-');
    if (parts.length !== 3) return 'Seleccionar';
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) return 'Seleccionar';
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString.substring(0, 5); // HH:MM
  };

  const getDisciplineIcon = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case "funcional":
        return "💪";
      case "yoga":
        return "🧘";
      case "spinning":
        return "🚴";
      default:
        return "🏃";
    }
  };

  const quickRangeToday = () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const newFilters = { ...filters, fechaDesde: dateStr, fechaHasta: dateStr };
    setFilters(newFilters);
    updateSelectedDates(newFilters);
  };

  const quickRangeNext7 = () => {
    const today = new Date();
    const start = today.toISOString().split("T")[0];
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().split("T")[0];
    const newFilters = { ...filters, fechaDesde: start, fechaHasta: endStr };
    setFilters(newFilters);
    updateSelectedDates(newFilters);
  };

  const renderClassItem = ({ item }) => (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => navigation.navigate("ClassDetail", { classId: item.id })}
    >
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.disciplineIcon}>
            {getDisciplineIcon(item.discipline)}
          </Text>
          <View style={styles.classTexts}>
            <Text style={styles.className}>{item.name}</Text>
            <Text style={styles.classDiscipline}>{item.discipline}</Text>
          </View>
        </View>
        <View style={styles.classTime}>
          <Text style={styles.timeText}>{formatTime(item.hora)}</Text>
          <Text style={styles.dateText}>{formatDateHuman(item.fecha)}</Text>
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
      onRequestClose={() => {
        setShowFilters(false);
        setSelectingDate(null);
        setShowDisciplineSelector(false);
        setShowSedeSelector(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar Clases</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilters(false);
                setSelectingDate(null);
                setShowDisciplineSelector(false);
                setShowSedeSelector(false);
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Disciplina */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Disciplina</Text>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  showDisciplineSelector && styles.selectorButtonActive
                ]}
                onPress={() => {
                  runDropdownAnimation();
                  const nextState = !showDisciplineSelector;
                  setShowDisciplineSelector(nextState);
                  if (showSedeSelector) {
                    setShowSedeSelector(false);
                  }
                }}
              >
                <Text style={[
                  styles.selectorButtonText,
                  filters.disciplina && styles.selectorButtonTextSelected
                ]}>
                  {filters.disciplina || 'Todas las disciplinas'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
              
              {/* Lista de opciones de disciplina */}
              {showDisciplineSelector && (
                <ScrollView style={styles.selectorOptions} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={styles.selectorOption}
                    onPress={() => {
                      runDropdownAnimation();
                      setFilters({ ...filters, disciplina: '' });
                      setShowDisciplineSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.selectorOptionText,
                      !filters.disciplina && styles.selectorOptionTextSelected
                    ]}>
                      Todas las disciplinas
                    </Text>
                  </TouchableOpacity>
                  {disciplines.map((discipline) => (
                    <TouchableOpacity
                      key={discipline}
                      style={styles.selectorOption}
                      onPress={() => {
                        runDropdownAnimation();
                        setFilters({ ...filters, disciplina: discipline });
                        setShowDisciplineSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        filters.disciplina === discipline && styles.selectorOptionTextSelected
                      ]}>
                        {discipline}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Sede */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sede</Text>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  showSedeSelector && styles.selectorButtonActive
                ]}
                onPress={() => {
                  runDropdownAnimation();
                  const nextState = !showSedeSelector;
                  setShowSedeSelector(nextState);
                  if (showDisciplineSelector) {
                    setShowDisciplineSelector(false);
                  }
                }}
              >
                <Text style={[
                  styles.selectorButtonText,
                  filters.sede && styles.selectorButtonTextSelected
                ]}>
                  {filters.sede || 'Todas las sedes'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
              
              {/* Lista de opciones de sede */}
              {showSedeSelector && (
                <ScrollView style={styles.selectorOptions} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={styles.selectorOption}
                    onPress={() => {
                      runDropdownAnimation();
                      setFilters({ ...filters, sede: '' });
                      setShowSedeSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.selectorOptionText,
                      !filters.sede && styles.selectorOptionTextSelected
                    ]}>
                      Todas las sedes
                    </Text>
                  </TouchableOpacity>
                  {sedes.map((sede) => (
                    <TouchableOpacity
                      key={sede}
                      style={styles.selectorOption}
                      onPress={() => {
                        runDropdownAnimation();
                        setFilters({ ...filters, sede: sede });
                        setShowSedeSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        filters.sede === sede && styles.selectorOptionTextSelected
                      ]}>
                        {sede}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Rango de fechas */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Fecha (rango)</Text>
              
              {/* Selector de fechas */}
              <View style={styles.dateSelectors}>
                <View style={styles.dateSelector}>
                  <Text style={styles.dateLabel}>Fecha desde:</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      selectingDate === 'from' && styles.dateButtonActive
                    ]}
                    onPress={() => {
                      setSelectingDate(selectingDate === 'from' ? null : 'from');
                    }}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectingDate === 'from' && styles.dateButtonTextActive
                    ]}>
                      {formatDateShort(filters.fechaDesde)}
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
                    onPress={() => {
                      setSelectingDate(selectingDate === 'to' ? null : 'to');
                    }}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectingDate === 'to' && styles.dateButtonTextActive
                    ]}>
                      {formatDateShort(filters.fechaHasta)}
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

              {/* Calendario - solo se muestra cuando hay selectingDate */}
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
                  />
                </View>
              )}

              {/* Accesos rápidos */}
              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={quickRangeToday}
                >
                  <Text style={styles.quickChipText}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={quickRangeNext7}
                >
                  <Text style={styles.quickChipText}>Próx. 7 días</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={clearDates}>
                  <Text style={styles.quickChipText}>Sin fecha</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción fijos al final con SafeAreaView */}
          <SafeAreaView edges={['bottom']} style={styles.filterActionsContainer}>
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
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando clases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
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
              {classes.length === 0
                ? "No hay clases disponibles"
                : "No hay clases que coincidan con los filtros"}
            </Text>
            {classes.length > 0 && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Limpiar Filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsText}>
                {filteredClasses.length} clase
                {filteredClasses.length !== 1 ? "s" : ""} encontrada
                {filteredClasses.length !== 1 ? "s" : ""}
              </Text>
            </View>

            <FlatList
              data={filteredClasses}
              renderItem={renderClassItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

      {/* Botón volver al final con SafeAreaView */}
      <SafeAreaView edges={['bottom']} style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <FiltersModal />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  header: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerActions: { flexDirection: "row" },
  filterButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  filterButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultsText: { fontSize: 14, color: "#666" },
  list: { flex: 1 },
  listContent: { padding: 20 },
  classCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  classInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  disciplineIcon: { fontSize: 24, marginRight: 12 },
  classTexts: { flex: 1 },
  className: { fontSize: 16, fontWeight: "bold", color: "#333" },
  classDiscipline: { fontSize: 14, color: "#666", marginTop: 2 },
  classTime: { alignItems: "flex-end" },
  timeText: { fontSize: 18, fontWeight: "bold", color: "#4CAF50" },
  dateText: { fontSize: 12, color: "#666", marginTop: 2 },
  classDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: { fontSize: 14, color: "#666", flex: 1 },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  lowCupo: { color: "#FF5722", fontWeight: "bold" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: { color: "#fff", fontWeight: "600" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: { fontSize: 24, color: "#666" },
  filtersContent: {
    padding: 20,
    paddingBottom: 80,
  },
  filterGroup: { 
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  // Selectores personalizados (disciplina/sede)
  selectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectorButtonTextSelected: {
    color: '#333',
    fontWeight: '600',
  },
  selectorArrow: {
    fontSize: 10,
    color: '#666',
  },
  selectorOptions: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectorOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Date selectors
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
  quickRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  quickChip: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  quickChipText: { color: "#333", fontWeight: "600", fontSize: 12 },
  // Footer acciones (ahora fijo al final del modal con SafeAreaView)
  filterActionsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  clearButtonText: { color: "#666", fontWeight: "600" },
  applyButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontWeight: "600" },
  backButtonContainer: {
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  backButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
});

export default ClassesScreen;
