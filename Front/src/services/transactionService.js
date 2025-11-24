/**
 * Transaction service for Sum-Arte frontend.
 * 
 * Handles all transaction-related API calls including CRUD operations
 * and approval/rejection workflows.
 */

import api from './api';

/**
 * Get all transactions.
 * 
 * @param {Object} filters - Optional filters (proyecto, estado_transaccion, etc.)
 * @returns {Promise<Array>} List of transactions
 */
export const getTransactions = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== null && filters[key] !== undefined) {
      params.append(key, filters[key]);
    }
  });
  
  const response = await api.get(`/transacciones/?${params.toString()}`);
  return response.data;
};

/**
 * Get a specific transaction by ID.
 * 
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
export const getTransaction = async (transactionId) => {
  const response = await api.get(`/transacciones/${transactionId}/`);
  return response.data;
};

/**
 * Create a new transaction.
 * 
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction
 */
export const createTransaction = async (transactionData) => {
  const response = await api.post('/transacciones/', transactionData);
  return response.data;
};

/**
 * Update a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @param {Object} transactionData - Updated transaction data
 * @returns {Promise<Object>} Updated transaction
 */
export const updateTransaction = async (transactionId, transactionData) => {
  const response = await api.patch(`/transacciones/${transactionId}/`, transactionData);
  return response.data;
};

/**
 * Delete a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<void>}
 */
export const deleteTransaction = async (transactionId) => {
  await api.delete(`/transacciones/${transactionId}/`);
};

/**
 * Approve a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<Object>} Approved transaction
 */
export const approveTransaction = async (transactionId) => {
  const response = await api.post(`/transacciones/${transactionId}/approve/`);
  return response.data;
};

/**
 * Reject a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @param {string} motivo - Rejection reason (optional)
 * @returns {Promise<Object>} Rejected transaction
 */
export const rejectTransaction = async (transactionId, motivo = null) => {
  const response = await api.post(`/transacciones/${transactionId}/reject/`, {
    motivo,
  });
  return response.data;
};

/**
 * Get pending transactions for approval.
 * 
 * @param {number} proyectoId - Optional project ID filter
 * @returns {Promise<Array>} List of pending transactions
 */
export const getPendingTransactions = async (proyectoId = null) => {
  const params = proyectoId ? `?proyecto=${proyectoId}` : '';
  const response = await api.get(`/transacciones/pendientes/${params}`);
  return response.data;
};

