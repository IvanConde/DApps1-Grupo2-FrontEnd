import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, ActivityIndicator } from 'react-native-paper';

const OfflineScreen = ({ onRetry, checking }) => {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <SafeAreaView style={styles.card} edges={['top', 'bottom']}>
        <Text variant="titleLarge" style={styles.title}>
          ¡Te quedaste sin conexión!
        </Text>
        <Text style={styles.subtitle}>
          No pudimos comunicarnos con RitmoFit. Verificá tu internet o reintenta la conexión.
        </Text>

        <View style={styles.statusBox}>
          {checking ? (
            <>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.statusText}>Buscando conexión...</Text>
            </>
          ) : (
            <Text style={styles.statusText}>Revisa tu conexión y probá nuevamente.</Text>
          )}
        </View>

        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.button}
          buttonColor="#4CAF50"
          disabled={checking}
        >
          {checking ? 'Reconectando...' : 'Volver a conectarme'}
        </Button>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1b1b1b',
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
    lineHeight: 20,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    borderRadius: 10,
  },
});

export default OfflineScreen;
