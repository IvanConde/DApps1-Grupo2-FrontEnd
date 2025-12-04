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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      setErrorMessage('Por favor seleccioná una calificación');
      setShowErrorModal(true);
      return;
    }

    if (comment.length > 250) {
      setErrorMessage('El comentario no puede exceder 250 caracteres');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      await createOrUpdateRating(historyId, rating, comment.trim() || null);
      setSuccessMessage(existingRating ? 'Tu calificación ha sido actualizada' : 'Tu calificación ha sido guardada');
      setShowSuccessModal(true);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al guardar la calificación';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
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
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'position' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
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

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          >
            <View style={styles.classInfo}>
              <Text style={styles.className}>✨ {classData.name}</Text>
              <Text style={styles.classDetails}>
                📍 {classData.sede} • 👨‍🏫 {classData.profesor}
              </Text>
              <Text style={styles.classDetails}>
                📅 {(() => {
                  const parts = classData.fecha.split('-');
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  return d.toLocaleDateString('es-AR');
                })()} • 
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

    {/* Modal de error */}
    <Modal
      visible={showErrorModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowErrorModal(false)}
    >
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalContent}>
          <Text style={styles.errorModalEmoji}>❌</Text>
          <Text style={styles.errorModalTitle}>Error</Text>
          <Text style={styles.errorModalMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.errorModalButton}
            onPress={() => setShowErrorModal(false)}
          >
            <Text style={styles.errorModalButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Modal de éxito */}
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowSuccessModal(false);
        if (onRatingSubmitted) onRatingSubmitted();
        handleClose();
      }}
    >
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalContent}>
          <Text style={styles.errorModalEmoji}>🎉</Text>
          <Text style={styles.successModalTitle}>¡Gracias!</Text>
          <Text style={styles.errorModalMessage}>{successMessage}</Text>
          <TouchableOpacity
            style={styles.successModalButton}
            onPress={() => {
              setShowSuccessModal(false);
              if (onRatingSubmitted) onRatingSubmitted();
              handleClose();
            }}
          >
            <Text style={styles.errorModalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
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
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  errorModalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
