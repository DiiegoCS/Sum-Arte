/**
 * Servicio de transacciones para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con transacciones, incluyendo operaciones CRUD
 * y flujos de aprobación o rechazo.
 */

import api from './api';

/**
 * Obtiene todas las transacciones.
 * 
 * @param {Object} filters - Filtros opcionales (proyecto, estado_transaccion, etc.)
 * @returns {Promise<Array>} Retorna una lista de transacciones
 */
export const getTransactions = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });
  
  const response = await api.get(`/transacciones/?${params.toString()}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene una transacción específica según su ID.
 * 
 * @param {number} transactionId - ID de la transacción
 * @returns {Promise<Object>} Retorna los datos de la transacción
 */
export const getTransaction = async (transactionId) => {
  const response = await api.get(`/transacciones/${transactionId}/`);
  return response.data;
};

/**
 * Crea una nueva transacción.
 * 
 * @param {Object} transactionData - Datos de la transacción
 * @returns {Promise<Object>} Retorna la transacción creada
 */
export const createTransaction = async (transactionData) => {
  const response = await api.post('/transacciones/', transactionData);
  return response.data;
};

/**
 * Actualiza una transacción existente.
 * 
 * @param {number} transactionId - ID de la transacción
 * @param {Object} transactionData - Datos actualizados de la transacción
 * @returns {Promise<Object>} Retorna la transacción actualizada
 */
export const updateTransaction = async (transactionId, transactionData) => {
  const response = await api.patch(`/transacciones/${transactionId}/`, transactionData);
  return response.data;
};

/**
 * Elimina una transacción.
 * 
 * Solo disponible para administradores de proyecto.
 * Si la transacción está aprobada, se revierten los montos ejecutados.
 * 
 * @param {number} transactionId - ID de la transacción
 * @returns {Promise<Object>} Retorna mensaje de confirmación
 */
export const deleteTransaction = async (transactionId) => {
  const response = await api.delete(`/transacciones/${transactionId}/`);
  return response.data;
};

/**
 * Aprueba una transacción.
 * 
 * @param {number} transactionId - ID de la transacción
 * @returns {Promise<Object>} Retorna la transacción aprobada
 */
export const approveTransaction = async (transactionId) => {
  const response = await api.post(`/transacciones/${transactionId}/approve/`);
  return response.data;
};

/**
 * Rechaza una transacción.
 * 
 * @param {number} transactionId - ID de la transacción
 * @param {string} motivo - Motivo del rechazo (opcional)
 * @returns {Promise<Object>} Retorna la transacción rechazada
 */
export const rejectTransaction = async (transactionId, motivo = null) => {
  const response = await api.post(`/transacciones/${transactionId}/reject/`, {
    motivo,
  });
  return response.data;
};

/**
 * Obtiene las transacciones pendientes para aprobación.
 * 
 * @param {number} proyectoId - Filtro opcional por ID de proyecto
 * @returns {Promise<Array>} Retorna una lista de transacciones pendientes
 */
export const getPendingTransactions = async (proyectoId = null) => {
  const params = proyectoId ? `?proyecto=${proyectoId}` : '';
  const response = await api.get(`/transacciones/pendientes/${params}`);
  return response.data;
};


