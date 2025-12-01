// src/services/ratings/index.js
import api from '../../api/client';

/**
 * Crear o actualizar una calificación
 * @param {number} historyId - ID del historial de asistencia
 * @param {number} rating - Calificación (1-5)
 * @param {string} comment - Comentario opcional
 */
export const createOrUpdateRating = async (historyId, rating, comment = null) => {
  try {
    const response = await api.post('/ratings', {
      historyId,
      rating,
      comment
    });
    return response.data;
  } catch (error) {
    console.error('[Ratings] Error creating/updating rating:', error);
    throw error;
  }
};

/**
 * Obtener todas las calificaciones del usuario
 */
export const getMyRatings = async () => {
  try {
    const response = await api.get('/ratings/my-ratings');
    return response.data;
  } catch (error) {
    console.error('[Ratings] Error fetching my ratings:', error);
    throw error;
  }
};

/**
 * Verificar si puede calificar una clase (han pasado 24h)
 * @param {number} historyId - ID del historial
 */
export const canRateClass = async (historyId) => {
  try {
    const response = await api.get(`/ratings/can-rate/${historyId}`);
    return response.data;
  } catch (error) {
    console.error('[Ratings] Error checking if can rate:', error);
    throw error;
  }
};

/**
 * Obtener calificación por historial
 * @param {number} historyId - ID del historial
 */
export const getRatingByHistory = async (historyId) => {
  try {
    const response = await api.get(`/ratings/history/${historyId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // No hay calificación aún
    }
    console.error('[Ratings] Error fetching rating by history:', error);
    throw error;
  }
};

/**
 * Eliminar una calificación
 * @param {number} ratingId - ID de la calificación
 */
export const deleteRating = async (ratingId) => {
  try {
    const response = await api.delete(`/ratings/${ratingId}`);
    return response.data;
  } catch (error) {
    console.error('[Ratings] Error deleting rating:', error);
    throw error;
  }
};
