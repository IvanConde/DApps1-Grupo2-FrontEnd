import client from '../../api/client';

// Obtener novedades (news)
export const getNews = async () => {
  try {
    const response = await client.get('/news');
    return response.data;
  } catch (error) {
    console.error('Error obteniendo novedades:', error);
    throw error;
  }
};
