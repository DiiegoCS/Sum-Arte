/**
 * Servicio de informes generados para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con informes generados.
 */

import api from './api';

/**
 * Obtiene todos los informes generados de un proyecto.
 * 
 * @param {number} proyectoId - ID del proyecto
 * @returns {Promise<Array>} Devuelve una lista de informes generados
 */
export const getInformesGenerados = async (proyectoId) => {
  const response = await api.get(`/informes/?proyecto=${proyectoId}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Descarga un informe generado.
 * 
 * @param {number} informeId - ID del informe
 * @param {string} nombreArchivo - Nombre del archivo del informe (opcional, se usa si está disponible)
 * @returns {Promise<void>}
 */
export const descargarInforme = async (informeId, nombreArchivo = null) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`/api/informes/${informeId}/descargar/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al descargar el informe');
  }

  // Usar el nombre del archivo proporcionado si está disponible
  let filename = nombreArchivo || `informe_${informeId}.pdf`;
  
  // Si no se proporcionó el nombre, intentar extraerlo del header Content-Disposition
  if (!nombreArchivo) {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      // Mejorar la extracción del nombre del archivo para manejar comillas correctamente
      // Soporta: filename="archivo.pdf" o filename=archivo.pdf o filename*=UTF-8''archivo.pdf
      let filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
      if (!filenameMatch) {
        // Intentar con formato más simple
        filenameMatch = contentDisposition.match(/filename=(.+)/i);
      }
      if (filenameMatch) {
        filename = filenameMatch[1].trim();
        // Remover comillas si las hay
        filename = filename.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  // Limpiar el nombre del archivo: remover cualquier carácter extra al final
  filename = filename.replace(/[_\s]+$/, '');

  // Crear un blob y descargarlo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

