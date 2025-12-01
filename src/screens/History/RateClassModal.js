// src/screens/History/RateClassModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { createOrUpdateRating, getRatingByHistory } from '../../services/ratings';

export default function RateClassModal({ 
  visible, 
  onClose, 
  classData, 
  historyId,
  onRatingSubmitted 
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (visible && historyId) {
      loadExistingRating();
    }
  }, [visible, historyId]);

  const loadExistingRating = async () => {
    try {
      const existing = await getRatingByHistory(historyId);
      if (existing) {
        setExistingRating(existing);
        setRating(existing.rating);
        setComment(existing.comment || '');
        setCharCount(existing.comment?.length || 0);
      }
    } catch (error) {
      console.error('Error loading existing rating:', error);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    if (comment.length > 250) {
      Alert.alert('Error', 'El comentario no puede exceder 250 caracteres');
      return;
    }

    setLoading(true);
    try {
      await createOrUpdateRating(historyId, rating, comment.trim() || null);
      Alert.alert(
        '¡Gracias!',
        existingRating ? 'Tu calificación ha sido actualizada' : 'Tu calificación ha sido guardada',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onRatingSubmitted) onRatingSubmitted();
              handleClose();
            }
          }
        ]
      );
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al guardar la calificación';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Omitir calificación',
      '¿Estás seguro que no quieres calificar esta clase?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Omitir', 
          style: 'destructive',
          onPress: handleClose
        }
      ]
    );
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setCharCount(0);
    setExistingRating(null);
    onClose();
  };

  const handleCommentChange = (text) => {
    if (text.length <= 250) {
      setComment(text);
      setCharCount(text.length);
    }
  };

  if (!classData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingRating ? 'Editar Calificación' : 'Califica tu clase'}
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.classInfo}>
              <Text style={styles.className}>✨ {classData.name}</Text>
              <Text style={styles.classDetails}>
                📍 {classData.sede} • 👨‍🏫 {classData.profesor}
              </Text>
              <Text style={styles.classDetails}>
                📅 {new Date(classData.fecha).toLocaleDateString('es-AR')} • 
                ⏰ {classData.hora?.substring(0, 5)}
              </Text>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>¿Cómo fue tu experiencia?</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Text style={styles.star}>
                      {star <= rating ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && '😞 Muy mala'}
                  {rating === 2 && '😕 Mala'}
                  {rating === 3 && '😐 Regular'}
                  {rating === 4 && '😊 Buena'}
                  {rating === 5 && '🤩 Excelente'}
                </Text>
              )}
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>
                Cuéntanos más (opcional)
              </Text>
              <TextInput
                mode="outlined"
                placeholder="¿Qué te gustó o qué mejorarías?"
                value={comment}
                onChangeText={handleCommentChange}
                multiline
                numberOfLines={4}
                style={styles.commentInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#4CAF50"
                maxLength={250}
              />
              <Text style={styles.charCounter}>
                {charCount}/250 caracteres
              </Text>
            </View>

            <View style={styles.buttonsContainer}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || rating === 0}
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
              >
                {existingRating ? '💾 Actualizar' : '✅ Enviar Calificación'}
              </Button>

              {!existingRating && (
                <Button
                  mode="text"
                  onPress={handleSkip}
                  disabled={loading}
                  style={styles.skipButton}
                  labelStyle={styles.skipButtonLabel}
                >
                  No calificar ahora
                </Button>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  classInfo: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  classDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingSection: {
    marginTop: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 40,
  },
  ratingText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 10,
    fontWeight: '600',
  },
  commentSection: {
    marginTop: 25,
  },
  commentInput: {
    backgroundColor: '#fff',
    marginTop: 10,
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  buttonsContainer: {
    marginTop: 25,
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 5,
  },
  skipButtonLabel: {
    color: '#999',
    fontSize: 14,
  },
});
