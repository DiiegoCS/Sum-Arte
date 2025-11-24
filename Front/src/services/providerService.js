/**
 * Servicio de proveedores para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con proveedores.
 */

import api from './api';

/**
 * Obtiene todos los proveedores.
 * 
 * @returns {Promise<Array>} Devuelve una lista de proveedores
 */
export const getProviders = async () => {
  const response = await api.get('/proveedores/');
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene un proveedor específico por ID.
 * 
 * @param {number} providerId - ID del proveedor
 * @returns {Promise<Object>} Devuelve los datos del proveedor
 */
export const getProvider = async (providerId) => {
  const response = await api.get(`/proveedores/${providerId}/`);
  return response.data;
};

/**
 * Crea un nuevo proveedor.
 * 
 * @param {Object} providerData - Datos del proveedor a crear
 * @returns {Promise<Object>} Devuelve el proveedor creado
 */
export const createProvider = async (providerData) => {
  const response = await api.post('/proveedores/', providerData);
  return response.data;
};

/**
 * Actualiza los datos de un proveedor existente.
 * 
 * @param {number} providerId - ID del proveedor a actualizar
 * @param {Object} providerData - Datos actualizados del proveedor
 * @returns {Promise<Object>} Devuelve el proveedor actualizado
 */
export const updateProvider = async (providerId, providerData) => {
  const response = await api.patch(`/proveedores/${providerId}/`, providerData);
  return response.data;
};

/**
 * Elimina un proveedor.
 * 
 * @param {number} providerId - ID del proveedor a eliminar
 * @returns {Promise<void>}
 */
export const deleteProvider = async (providerId) => {
  await api.delete(`/proveedores/${providerId}/`);
};

