import client from '../../api/client';

// Obtener listado de clases con filtros opcionales
export const getClasses = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.disciplina) params.append('disciplina', filters.disciplina);
    if (filters.sede) params.append('sede', filters.sede);
    if (filters.fecha) params.append('fecha', filters.fecha);
    
    const queryString = params.toString();
    const url = `/classes${queryString ? `?${queryString}` : ''}`;
    
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo clases:', error);
    throw error;
  }
};

// Obtener detalle de una clase por ID
export const getClassById = async (classId) => {
  try {
    const response = await client.get(`/classes/${classId}`);
    return response.data;
  } catch (error) {
    // No loggear error para evitar ruido en consola cuando la clase no existe
    throw error;
  }
};

// Obtener disciplinas únicas (para filtros)
export const getDisciplines = async () => {
  try {
    const classes = await getClasses();
    const disciplines = [...new Set(classes.map(c => c.discipline))].filter(Boolean);
    return disciplines;
  } catch (error) {
    console.error('Error obteniendo disciplinas:', error);
    return [];
  }
};

// Obtener sedes únicas (para filtros)
export const getSedes = async () => {
  try {
    const classes = await getClasses();
    const sedes = [...new Set(classes.map(c => c.sede))].filter(Boolean);
    return sedes;
  } catch (error) {
    console.error('Error obteniendo sedes:', error);
    return [];
  }
};