/**
 * Servicio de organizaciones para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con organizaciones.
 */

import api from './api';

/**
 * Obtiene todas las organizaciones disponibles.
 * 
 * @returns {Promise<Array>} Devuelve una lista de organizaciones
 */
export const getOrganizaciones = async () => {
  const response = await api.get('/organizaciones/');
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene la información de una organización específica por ID.
 * 
 * @param {number} organizacionId - ID de la organización
 * @returns {Promise<Object>} Devuelve los datos de la organización
 */
export const getOrganizacion = async (organizacionId) => {
  const response = await api.get(`/organizaciones/${organizacionId}/`);
  return response.data;
};

/**
 * Crea una nueva organización.
 * 
 * @param {Object} organizacionData - Datos de la organización a crear
 * @returns {Promise<Object>} Devuelve la organización creada
 */
export const createOrganizacion = async (organizacionData) => {
  const response = await api.post('/organizaciones/', organizacionData);
  return response.data;
};

/**
 * Actualiza los datos de una organización existente.
 * 
 * @param {number} organizacionId - ID de la organización a actualizar
 * @param {Object} organizacionData - Datos actualizados de la organización
 * @returns {Promise<Object>} Devuelve la organización actualizada
 */
export const updateOrganizacion = async (organizacionId, organizacionData) => {
  const response = await api.patch(`/organizaciones/${organizacionId}/`, organizacionData);
  return response.data;
};

/**
 * Verifica si un RUT está disponible para registro.
 * 
 * @param {string} rut - RUT a verificar
 * @returns {Promise<Object>} Devuelve {disponible: bool, rut: string, mensaje: string}
 */
export const verificarRUT = async (rut) => {
  const response = await api.get('/organizaciones/verificar_rut/', {
    params: { rut }
  });
  return response.data;
};

