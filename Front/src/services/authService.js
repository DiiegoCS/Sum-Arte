/**
 * Servicio de autenticación para el frontend de Sum-Arte.
 * 
 * Gestiona el inicio/cierre de sesión, almacenamiento de tokens y manejo de sesión de usuario.
 */

import api from './api';

/**
 * Inicia sesión autenticando al usuario con nombre y contraseña.
 * 
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos del usuario y tokens
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/token/', {
      username,
      password,
    });

    const { access, refresh } = response.data;

    // Guarda los tokens en el almacenamiento local
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    // Decodifica el token para extraer información del usuario
    const tokenPayload = JSON.parse(atob(access.split('.')[1]));
    
    // Guarda la información del usuario en localStorage
    const userData = {
      id: tokenPayload.user_id,
      username: tokenPayload.username,
      email: tokenPayload.email,
      organizacion_id: tokenPayload.organizacion_id,
      is_superuser: tokenPayload.is_superuser,
    };
    localStorage.setItem('user', JSON.stringify(userData));

    return userData;
  } catch (error) {
    throw new Error(error.message || 'Error al iniciar sesión. Verifique sus credenciales.');
  }
};

/**
 * Cierra la sesión del usuario y elimina los datos almacenados.
 * 
 * Limpia completamente la sesión del usuario, incluyendo:
 * - Tokens de acceso y actualización
 * - Datos del usuario
 * - Cualquier otro dato relacionado con la sesión
 */
export const logout = () => {
  // Limpiar tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Limpiar datos del usuario
  localStorage.removeItem('user');
  
  // Limpiar cualquier otro dato de sesión que pueda existir
  // (por si acaso se agregaron otros datos en el futuro)
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('auth_') || key.startsWith('session_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

/**
 * Obtiene el usuario actual almacenado en localStorage.
 * 
 * @returns {Object|null} Devuelve los datos del usuario o null si no está logueado
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Verifica si el usuario está autenticado.
 * 
 * @returns {boolean} Devuelve true si hay un token válido
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

/**
 * Refresca el token de acceso usando el refresh token almacenado.
 * 
 * @returns {Promise<string>} Devuelve el nuevo token de acceso
 */
export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No hay token de actualización disponible.');
  }

  try {
    const response = await api.post('/token/refresh/', {
      refresh: refreshToken,
    });

    const { access } = response.data;
    localStorage.setItem('access_token', access);
    return access;
  } catch (error) {
    logout();
    throw new Error('Error al actualizar el token. Por favor, inicie sesión nuevamente.');
  }
};

/**
 * Verifica si el token es válido consultando la API.
 * 
 * @returns {Promise<boolean>} Devuelve true si el token es válido
 */
export const verifyToken = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return false;
  }

  try {
    await api.post('/token/verify/', {
      token,
    });
    return true;
  } catch (error) {
    return false;
  }
};


