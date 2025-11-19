import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { getNews } from '../../services/news';

// Helper: parse YYYY-MM-DD to local Date (avoids UTC shift)
const parseYMD = (dateString) => {
  if (!dateString) return null;
  const parts = String(dateString).split('-').map((p) => parseInt(p, 10));
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
};

const NewsItem = ({ item }) => {
  // Parse YYYY-MM-DD into a local Date to avoid UTC shift problems
  const parseYMD = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-').map((p) => parseInt(p, 10));
    if (parts.length < 3) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d);
  };

  const formatDate = (d) => {
    try {
      const date = typeof d === 'string' ? parseYMD(d) : d instanceof Date ? d : null;
      if (!date) return d || '';
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.metaRow}>
        {item.sede ? <Text style={styles.sede}>📍 {item.sede}</Text> : <Text />}
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.desc}>{item.description}</Text>
    </View>
  );
};

export default function NewsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getNews();
        if (!mounted) return;
        const items = data?.news || [];
        // Sort by date descending (newest first) using parseYMD
        const sorted = items.slice().sort((a, b) => {
          const da = parseYMD(a?.date) || new Date(0);
          const db = parseYMD(b?.date) || new Date(0);
          return db.getTime() - da.getTime();
        });
        setNews(sorted);
      } catch (err) {
        console.error('Error cargando novedades:', err);
        setError('No se pudieron cargar las novedades.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No hay novedades por el momento</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'left', 'right', 'top', 'bottom' ]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando novedades...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 20 }}>
              <NewsItem item={item} />
            </View>
          )}
          ListHeaderComponent={() => (
            <View style={styles.header}>
              <Text variant="headlineMedium" style={styles.headerTitle}>Novedades</Text>
              <Text style={styles.headerSubtitle}>Promociones, eventos y anuncios</Text>
            </View>
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.contentContainer}
          stickyHeaderIndices={[0]}
          ListFooterComponent={() => (
            <View style={styles.footerButtons}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#4CAF50' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { width: '100%', backgroundColor: '#4CAF50', paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  headerTitle: { color: '#fff', fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  loadingContainer: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  errorContainer: { padding: 30, alignItems: 'center' },
  errorText: { color: '#e53935' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, elevation: 3 },
  title: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  sede: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { fontSize: 12, color: '#999', marginBottom: 8 },
  desc: { fontSize: 14, color: '#555' },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#666' },
  footerButtons: { paddingHorizontal: 20, paddingTop: 20 },
  backButton: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  backButtonText: { color: '#666' },
  contentContainer: { backgroundColor: '#f5f5f5', paddingBottom: 30 },
});
