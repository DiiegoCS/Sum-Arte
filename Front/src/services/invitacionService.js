/**
 * Servicio de invitaciones para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con invitaciones de usuarios.
 */

import api from './api';

/**
 * Obtiene todas las invitaciones de la organización del usuario actual.
 * 
 * @returns {Promise<Array>} Devuelve una lista de invitaciones
 */
export const getInvitaciones = async () => {
  const response = await api.get('/invitaciones/');
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene la información de una invitación específica por ID.
 * 
 * @param {number} invitacionId - ID de la invitación
 * @returns {Promise<Object>} Devuelve los datos de la invitación
 */
export const getInvitacion = async (invitacionId) => {
  const response = await api.get(`/invitaciones/${invitacionId}/`);
  return response.data;
};

/**
 * Crea una nueva invitación de usuario.
 * 
 * @param {Object} invitacionData - Datos de la invitación a crear
 * @returns {Promise<Object>} Devuelve la invitación creada
 */
export const crearInvitacion = async (invitacionData) => {
  const response = await api.post('/invitaciones/', invitacionData);
  return response.data;
};

/**
 * Reenvía una invitación generando un nuevo token.
 * 
 * @param {number} invitacionId - ID de la invitación a reenviar
 * @returns {Promise<Object>} Devuelve la invitación actualizada
 */
export const reenviarInvitacion = async (invitacionId) => {
  const response = await api.post(`/invitaciones/${invitacionId}/reenviar/`);
  return response.data;
};

/**
 * Cancela una invitación pendiente.
 * 
 * @param {number} invitacionId - ID de la invitación a cancelar
 * @returns {Promise<Object>} Devuelve la invitación cancelada
 */
export const cancelarInvitacion = async (invitacionId) => {
  const response = await api.post(`/invitaciones/${invitacionId}/cancelar/`);
  return response.data;
};

/**
 * Acepta una invitación y crea el usuario.
 * 
 * @param {Object} datosAceptacion - Datos para aceptar la invitación
 * @param {string} datosAceptacion.token - Token de la invitación
 * @param {string} datosAceptacion.username - Nombre de usuario
 * @param {string} datosAceptacion.password - Contraseña
 * @param {string} datosAceptacion.password_confirm - Confirmación de contraseña
 * @param {string} datosAceptacion.first_name - Nombre (opcional)
 * @param {string} datosAceptacion.last_name - Apellido (opcional)
 * @returns {Promise<Object>} Devuelve confirmación de aceptación
 */
export const aceptarInvitacion = async (datosAceptacion) => {
  const response = await api.post('/usuarios/aceptar_invitacion/', datosAceptacion);
  return response.data;
};

