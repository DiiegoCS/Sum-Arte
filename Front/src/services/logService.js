/**
 * Servicio de logs para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con logs de auditoría.
 */

import api from './api';

/**
 * Obtiene todos los logs de transacciones.
 * 
 * @param {Object} filters - Filtros opcionales
 * @param {number} filters.transaccion - ID de transacción
 * @param {number} filters.usuario - ID de usuario
 * @param {string} filters.accion_realizada - Tipo de acción
 * @param {number} filters.proyecto - ID de proyecto
 * @returns {Promise<Array>} Devuelve una lista de logs
 */
export const getLogs = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.transaccion) params.append('transaccion', filters.transaccion);
  if (filters.usuario) params.append('usuario', filters.usuario);
  if (filters.accion_realizada) params.append('accion_realizada', filters.accion_realizada);
  if (filters.proyecto) params.append('proyecto', filters.proyecto);
  
  const queryString = params.toString();
  const url = `/logs-transacciones/${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene los logs de una transacción específica.
 * 
 * @param {number} transaccionId - ID de la transacción
 * @returns {Promise<Array>} Devuelve una lista de logs de la transacción
 */
export const getLogsPorTransaccion = async (transaccionId) => {
  const response = await api.get(`/logs-transacciones/por_transaccion/?transaccion_id=${transaccionId}`);
  return response.data;
};

/**
 * Obtiene los logs de un proyecto específico.
 * 
 * @param {number} proyectoId - ID del proyecto
 * @returns {Promise<Array>} Devuelve una lista de logs del proyecto
 */
export const getLogsPorProyecto = async (proyectoId) => {
  const response = await api.get(`/logs-transacciones/?proyecto=${proyectoId}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

