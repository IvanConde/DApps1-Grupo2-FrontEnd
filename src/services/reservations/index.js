import client from '../../api/client';

export const createReservation = async (classId) => {
  try {
    const response = await client.post('/reservations', { class_id: classId });
    return response.data;
  } catch (error) {
    console.error('Error creando reserva:', error);
    throw error.response?.data || { error: 'Error desconocido al crear reserva' };
  }
};

