import client from '../../api/client';

export const getHistory = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.from) {
      params.append('from', filters.from);
    }
    
    if (filters.to) {
      params.append('to', filters.to);
    }
    
    const url = `/history${params.toString() ? `?${params.toString()}` : ''}`;
    const { data } = await client.get(url);
    
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || 'Error obteniendo historial');
    }
    throw new Error('Error de red obteniendo historial');
  }
};