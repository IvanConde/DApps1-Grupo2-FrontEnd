import client from '../../api/client';

export const createReservation = async (classId) => {
  try {
    const response = await client.post('/reservations', { class_id: classId });
    return response.data;
  } catch (error) {
    // No loggear como error si es un conflicto esperado (409) por superposición
    if (error.response?.status === 409) {
      // Propagar un mensaje claro para que el UI muestre alerta sin ruido en consola
      const message = error.response?.data?.error || 'La reserva se superpone con otra existente';
      throw new Error(message);
    }
    // Otros errores sí se loggean y se propagan con detalle
    console.error('Error creando reserva:', error);
    throw error.response?.data || { error: 'Error desconocido al crear reserva' };
  }
};

export const getMyReservations = async () => {
  try {
    const { data } = await client.get('/reservations/me');
    
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || 'Error obteniendo reservas');
    }
    throw new Error('Error de red obteniendo reservas');
  }
};

export const cancelReservation = async (reservationId) => {
  try {
    const { data } = await client.delete(`/reservations/${reservationId}`);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || 'Error cancelando reserva');
    }
    throw new Error('Error de red cancelando reserva');
  }
};

export const confirmAttendance = async (qrData) => {
  try {
    const { data } = await client.post('/reservations/confirm-attendance', qrData);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || 'Error confirmando asistencia');
    }
    throw new Error('Error de red confirmando asistencia');
  }
};

