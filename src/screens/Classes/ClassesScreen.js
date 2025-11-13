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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { getClasses, getDisciplines, getSedes } from "../../services/classes";

const ClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    disciplina: "",
    sede: "",
    fechaDesde: null, // Date o null
    fechaHasta: null, // Date o null
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pickers de fecha
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
    const date = d instanceof Date ? d : new Date(String(d).slice(0, 10));
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
      fechaDesde: null,
      fechaHasta: null,
    });
  };

  const clearDates = () => {
    setFilters((prev) => ({ ...prev, fechaDesde: null, fechaHasta: null }));
  };

  const formatDateHuman = (d) => {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(String(d).slice(0, 10));
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (d) => {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(String(d).slice(0, 10));
    if (isNaN(date.getTime())) return "";
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
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    setFilters((prev) => ({ ...prev, fechaDesde: start, fechaHasta: start }));
  };

  const quickRangeNext7 = () => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    setFilters((prev) => ({ ...prev, fechaDesde: start, fechaHasta: end }));
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
            {/* Disciplina */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Disciplina</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.disciplina}
                  onValueChange={(value) =>
                    setFilters({ ...filters, disciplina: value })
                  }
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

            {/* Sede */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sede</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.sede}
                  onValueChange={(value) =>
                    setFilters({ ...filters, sede: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Todas las sedes" value="" />
                  {sedes.map((sede) => (
                    <Picker.Item key={sede} label={sede} value={sede} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Rango de fechas */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Fecha (rango)</Text>

              <View style={styles.rangeRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateButtonLabel}>Desde</Text>
                  <Text style={styles.dateButtonValue}>
                    {filters.fechaDesde
                      ? formatDateShort(filters.fechaDesde)
                      : "—"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateButtonLabel}>Hasta</Text>
                  <Text style={styles.dateButtonValue}>
                    {filters.fechaHasta
                      ? formatDateShort(filters.fechaHasta)
                      : "—"}
                  </Text>
                </TouchableOpacity>
              </View>

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

              {/* Pickers nativos */}
              {showStartPicker && (
                <DateTimePicker
                  value={
                    filters.fechaDesde
                      ? new Date(filters.fechaDesde)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selected) => {
                    // En Android, siempre cierra; en iOS depende del display
                    setShowStartPicker(Platform.OS === "ios");
                    if (selected) {
                      // Si "hasta" existe y es menor que "desde" nueva, lo ajustamos
                      const end = filters.fechaHasta
                        ? new Date(filters.fechaHasta)
                        : null;
                      const newStart = new Date(
                        selected.getFullYear(),
                        selected.getMonth(),
                        selected.getDate()
                      );
                      let newEnd = end;
                      if (end && end < newStart) newEnd = newStart;
                      setFilters((prev) => ({
                        ...prev,
                        fechaDesde: newStart,
                        fechaHasta: newEnd || prev.fechaHasta,
                      }));
                    }
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={
                    filters.fechaHasta
                      ? new Date(filters.fechaHasta)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selected) => {
                    setShowEndPicker(Platform.OS === "ios");
                    if (selected) {
                      const start = filters.fechaDesde
                        ? new Date(filters.fechaDesde)
                        : null;
                      const newEnd = new Date(
                        selected.getFullYear(),
                        selected.getMonth(),
                        selected.getDate()
                      );
                      let newStart = start;
                      if (start && newEnd < start) newStart = newEnd;
                      setFilters((prev) => ({
                        ...prev,
                        fechaDesde: newStart || prev.fechaDesde,
                        fechaHasta: newEnd,
                      }));
                    }
                  }}
                />
              )}
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
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando clases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
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

      {/* Botón volver al final */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("Home")}
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
    maxHeight: "80%",
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
  filtersContent: { padding: 20 },
  filterGroup: { marginBottom: 20 },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  picker: { height: 50 },
  // Rango de fechas
  rangeRow: { flexDirection: "row", gap: 10 },
  dateButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonLabel: { fontSize: 12, color: "#666" },
  dateButtonValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginTop: 2,
  },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  quickChip: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  quickChipText: { color: "#333", fontWeight: "600", fontSize: 12 },
  // Footer acciones
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  clearButtonText: { color: "#666", fontWeight: "600" },
  applyButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontWeight: "600" },
  backButton: {
    margin: 20,
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
