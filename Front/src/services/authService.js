/**
 * Authentication service for Sum-Arte frontend.
 * 
 * Handles login, logout, token storage, and user session management.
 */

import api from './api';

/**
 * Login user with username and password.
 * 
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data and tokens
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/token/', {
      username,
      password,
    });

    const { access, refresh } = response.data;

    // Store tokens
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    // Decode token to get user info (simple base64 decode)
    const tokenPayload = JSON.parse(atob(access.split('.')[1]));
    
    // Store user info
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
 * Logout user and clear stored data.
 */
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

/**
 * Get current user from localStorage.
 * 
 * @returns {Object|null} User data or null if not logged in
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
 * Check if user is authenticated.
 * 
 * @returns {boolean} True if user has valid token
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

/**
 * Refresh access token.
 * 
 * @returns {Promise<string>} New access token
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
 * Verify token is valid.
 * 
 * @returns {Promise<boolean>} True if token is valid
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


