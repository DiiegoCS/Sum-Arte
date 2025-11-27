/**
 * Servicio de usuarios para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con usuarios.
 */

import api from './api';

/**
 * Obtiene todos los usuarios de la organización del usuario actual.
 * 
 * @returns {Promise<Array>} Devuelve una lista de usuarios
 */
export const getUsuarios = async () => {
  const response = await api.get('/usuarios/');
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene la información de un usuario específico por ID.
 * 
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>} Devuelve los datos del usuario
 */
export const getUsuario = async (usuarioId) => {
  const response = await api.get(`/usuarios/${usuarioId}/`);
  return response.data;
};

/**
 * Obtiene el perfil del usuario autenticado.
 * 
 * @returns {Promise<Object>} Devuelve los datos del perfil del usuario
 */
export const getMiPerfil = async () => {
  const response = await api.get('/usuarios/mi_perfil/');
  return response.data;
};

/**
 * Actualiza el perfil del usuario autenticado.
 * 
 * @param {Object} profileData - Datos del perfil a actualizar
 * @param {string} profileData.first_name - Nombre (opcional)
 * @param {string} profileData.last_name - Apellido (opcional)
 * @param {string} profileData.email - Email (opcional)
 * @param {string} profileData.password - Nueva contraseña (opcional)
 * @param {string} profileData.password_confirm - Confirmación de contraseña (opcional)
 * @returns {Promise<Object>} Devuelve el resultado de la actualización
 */
export const updateMiPerfil = async (profileData) => {
  const response = await api.patch('/usuarios/mi_perfil/', profileData);
  return response.data;
};

