/**
 * Cliente API centralizado para el frontend de Sum-Arte.
 * 
 * En este módulo se proporciona una instancia de axios configurada con:
 * - Gestión de token JWT
 * - Interceptores de solicitudes y respuestas
 * - Manejo de errores
 * - Configuración de URL base
 */

import axios from 'axios';

// Se crea una instancia de axios con la configuración base
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud: se agrega el token JWT a las solicitudes si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta: gestiona el refresh del token y maneja errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró (401) y no se está reintentando aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Se reintenta la solicitud original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si el refresh falla, se desconecta al usuario
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Se manejan otros errores
    if (error.response) {
      // El servidor respondió con un estado de error
      const errorData = error.response.data;
      let errorMessage = errorData?.error || 
                        errorData?.detail || 
                        errorData?.message ||
                        'Ha ocurrido un error en la solicitud.';
      
      // Si hay errores de validación de campos, formatearlos mejor
      if (error.response.status === 400 && typeof errorData === 'object') {
        // DRF devuelve errores de validación como objeto con campos
        const validationErrors = [];
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            validationErrors.push(`${key}: ${errorData[key].join(', ')}`);
          } else if (typeof errorData[key] === 'string') {
            validationErrors.push(`${key}: ${errorData[key]}`);
          }
        });
        
        if (validationErrors.length > 0) {
          errorMessage = validationErrors.join('; ');
        }
      }
      
      // Crear un error con más información
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = error.response.status;
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // La solicitud no recibió respuesta del servidor
      return Promise.reject(new Error('No se pudo conectar con el servidor.'));
    } else {
      // Ocurrió un error inesperado
      return Promise.reject(new Error('Ha ocurrido un error inesperado.'));
    }
  }
);

export default api;


