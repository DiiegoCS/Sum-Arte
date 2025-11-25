/**
 * Servicio de evidencias para el frontend de Sum-Arte.
 * 
 * Gestiona la carga, administración de archivos de evidencia y la vinculación de evidencias a transacciones.
 */

import api from './api';

/**
 * Sube un archivo de evidencia.
 * 
 * @param {number} proyectoId - ID del proyecto
 * @param {File} file - Archivo a subir
 * @param {string} nombreEvidencia - Nombre de la evidencia
 * @returns {Promise<Object>} Devuelve la evidencia creada
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
 * Obtiene todas las evidencias de un proyecto.
 * 
 * @param {number} proyectoId - ID del proyecto
 * @param {boolean} incluirEliminadas - Si incluir evidencias eliminadas (soft delete)
 * @returns {Promise<Array>} Devuelve una lista de evidencias
 */
export const getProjectEvidence = async (proyectoId, incluirEliminadas = false) => {
  const params = new URLSearchParams();
  params.append('proyecto', proyectoId);
  if (incluirEliminadas) {
    params.append('incluir_eliminadas', 'true');
  }
  const response = await api.get(`/evidencias/?${params.toString()}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene los datos de una evidencia específica por su ID.
 * 
 * @param {number} evidenceId - ID de la evidencia
 * @returns {Promise<Object>} Devuelve los datos de la evidencia
 */
export const getEvidence = async (evidenceId) => {
  const response = await api.get(`/evidencias/${evidenceId}/`);
  return response.data;
};

/**
 * Vincula una evidencia a una transacción.
 * 
 * @param {number} transactionId - ID de la transacción
 * @param {number} evidenceId - ID de la evidencia
 * @returns {Promise<Object>} Devuelve el vínculo creado
 */
export const linkEvidenceToTransaction = async (transactionId, evidenceId) => {
  const response = await api.post('/transacciones-evidencias/', {
    transaccion: transactionId,
    evidencia: evidenceId,
  });
  return response.data;
};

/**
 * Desvincula una evidencia de una transacción.
 * 
 * @param {number} linkId - ID del vínculo transacción-evidencia
 * @returns {Promise<void>}
 */
export const unlinkEvidenceFromTransaction = async (linkId) => {
  await api.delete(`/transacciones-evidencias/${linkId}/`);
};

/**
 * Obtiene todas las evidencias vinculadas a una transacción.
 * 
 * @param {number} transactionId - ID de la transacción
 * @returns {Promise<Array>} Devuelve una lista de evidencias vinculadas
 */
export const getTransactionEvidence = async (transactionId) => {
  const response = await api.get(`/transacciones-evidencias/?transaccion=${transactionId}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Realiza el borrado lógico (eliminación suave) de una evidencia.
 * 
 * @param {number} evidenceId - ID de la evidencia
 * @returns {Promise<Object>} Devuelve mensaje de confirmación
 */
export const deleteEvidence = async (evidenceId) => {
  const response = await api.delete(`/evidencias/${evidenceId}/`);
  return response.data;
};

/**
 * Restaura una evidencia que fue eliminada lógicamente.
 * 
 * @param {number} evidenceId - ID de la evidencia
 * @returns {Promise<Object>} Devuelve la evidencia restaurada
 */
export const restoreEvidence = async (evidenceId) => {
  const response = await api.post(`/evidencias/${evidenceId}/restaurar/`);
  return response.data;
};


