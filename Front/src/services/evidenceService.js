/**
 * Evidence service for Sum-Arte frontend.
 * 
 * Handles evidence file upload, management, and linking to transactions.
 */

import api from './api';

/**
 * Upload an evidence file.
 * 
 * @param {number} proyectoId - Project ID
 * @param {File} file - File to upload
 * @param {string} nombreEvidencia - Evidence name
 * @returns {Promise<Object>} Created evidence
 */
export const uploadEvidence = async (proyectoId, file, nombreEvidencia) => {
  const formData = new FormData();
  formData.append('proyecto', proyectoId);
  formData.append('archivo_evidencia', file);
  formData.append('nombre_evidencia', nombreEvidencia);
  formData.append('tipo_archivo', file.type);

  const response = await api.post('/evidencias/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get all evidence for a project.
 * 
 * @param {number} proyectoId - Project ID
 * @returns {Promise<Array>} List of evidence
 */
export const getProjectEvidence = async (proyectoId) => {
  const response = await api.get(`/evidencias/?proyecto=${proyectoId}`);
  return response.data;
};

/**
 * Get a specific evidence by ID.
 * 
 * @param {number} evidenceId - Evidence ID
 * @returns {Promise<Object>} Evidence data
 */
export const getEvidence = async (evidenceId) => {
  const response = await api.get(`/evidencias/${evidenceId}/`);
  return response.data;
};

/**
 * Link evidence to a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @param {number} evidenceId - Evidence ID
 * @returns {Promise<Object>} Created link
 */
export const linkEvidenceToTransaction = async (transactionId, evidenceId) => {
  const response = await api.post('/transacciones-evidencias/', {
    transaccion: transactionId,
    evidencia: evidenceId,
  });
  return response.data;
};

/**
 * Unlink evidence from a transaction.
 * 
 * @param {number} linkId - Transaction-Evidence link ID
 * @returns {Promise<void>}
 */
export const unlinkEvidenceFromTransaction = async (linkId) => {
  await api.delete(`/transacciones-evidencias/${linkId}/`);
};

/**
 * Get evidence linked to a transaction.
 * 
 * @param {number} transactionId - Transaction ID
 * @returns {Promise<Array>} List of linked evidence
 */
export const getTransactionEvidence = async (transactionId) => {
  const response = await api.get(`/transacciones-evidencias/?transaccion=${transactionId}`);
  return response.data;
};

/**
 * Soft delete evidence (logical deletion).
 * 
 * @param {number} evidenceId - Evidence ID
 * @returns {Promise<Object>} Updated evidence
 */
export const deleteEvidence = async (evidenceId) => {
  // Note: This should call a custom endpoint for soft delete
  // For now, we'll use a patch to mark as deleted
  const response = await api.patch(`/evidencias/${evidenceId}/`, {
    eliminado: true,
  });
  return response.data;
};

