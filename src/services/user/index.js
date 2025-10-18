import client from '../../api/client';

// Obtener perfil del usuario actual
export const getProfile = async () => {
  try {
    const response = await client.get('/users/me');
    return response.data;
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    throw error;
  }
};

// Actualizar perfil del usuario
export const updateProfile = async (userData) => {
  try {
    const response = await client.put('/users/me', userData);
    return response.data;
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    throw error;
  }
};