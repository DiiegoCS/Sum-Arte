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
 * @param {number} page - Número de página (opcional)
 * @param {number} pageSize - Tamaño de página (opcional)
 * @param {Object} filters - Filtros adicionales (usuario, accion_realizada, ordenFecha)
 * @returns {Promise<Object>} Devuelve objeto con results, count, next, previous
 */
export const getLogsPorProyecto = async (proyectoId, page = null, pageSize = null, filters = {}) => {
  const params = new URLSearchParams();
  params.append('proyecto', proyectoId);
  
  if (page !== null) params.append('page', page);
  if (pageSize !== null) params.append('page_size', pageSize);
  if (filters.usuario) params.append('usuario', filters.usuario);
  if (filters.accion_realizada) params.append('accion_realizada', filters.accion_realizada);
  
  // Ordenamiento: DRF usa el parámetro 'ordering' con el nombre del campo
  // Prefijo '-' para orden descendente, sin prefijo para ascendente
  if (filters.ordenFecha) {
    const ordering = filters.ordenFecha === 'asc' ? 'fecha_hora_accion' : '-fecha_hora_accion';
    params.append('ordering', ordering);
  }
  
  const response = await api.get(`/logs-transacciones/?${params.toString()}`);
  // La API devuelve datos paginados
  return response.data;
};

