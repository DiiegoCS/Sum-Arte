/**
 * Servicio de proyectos para el frontend de Sum-Arte.
 * 
 * Gestiona todas las llamadas a la API relacionadas con proyectos.
 */

import api from './api';

/**
 * Obtiene todos los proyectos asociados al usuario actual.
 * 
 * @returns {Promise<Array>} Devuelve una lista de proyectos
 */
export const getProjects = async () => {
  const response = await api.get('/proyectos/');
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene la información de un proyecto específico por ID.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Object>} Devuelve los datos del proyecto
 */
export const getProject = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/`);
  return response.data;
};

/**
 * Crea un nuevo proyecto.
 * 
 * @param {Object} projectData - Datos del proyecto a crear
 * @param {string} projectData.nombre_proyecto - Nombre del proyecto
 * @param {string} projectData.fecha_inicio_proyecto - Fecha de inicio (YYYY-MM-DD)
 * @param {string} projectData.fecha_fin_proyecto - Fecha de fin (YYYY-MM-DD)
 * @param {number} projectData.presupuesto_total - Presupuesto total
 * @param {string} projectData.estado_proyecto - Estado del proyecto (opcional)
 * @returns {Promise<Object>} Devuelve el proyecto creado
 */
export const createProject = async (projectData) => {
  const response = await api.post('/proyectos/', projectData);
  return response.data;
};

/**
 * Actualiza un proyecto existente.
 * 
 * @param {number} projectId - ID del proyecto a actualizar
 * @param {Object} projectData - Datos del proyecto a actualizar
 * @returns {Promise<Object>} Devuelve el proyecto actualizado
 */
export const updateProject = async (projectId, projectData) => {
  const response = await api.patch(`/proyectos/${projectId}/`, projectData);
  return response.data;
};

// Eliminadas las declaraciones duplicadas de createProject y updateProject para evitar errores y mejorar la mantenibilidad del código.

/**
 * Obtiene los ítems presupuestarios asociados a un proyecto.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Array>} Devuelve una lista de ítems presupuestarios
 */
export const getBudgetItems = async (projectId) => {
  const response = await api.get(`/items-presupuestarios/?proyecto=${projectId}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene los subítems asociados a un ítem presupuestario.
 * 
 * @param {number} itemId - ID del ítem presupuestario
 * @returns {Promise<Array>} Devuelve una lista de subítems
 */
export const getSubitems = async (itemId) => {
  const response = await api.get(`/subitems-presupuestarios/?item_presupuesto=${itemId}`);
  // La API devuelve datos paginados, extraemos el array de results
  return response.data.results || response.data;
};

/**
 * Obtiene las métricas del dashboard para todos los proyectos.
 * 
 * @returns {Promise<Object>} Devuelve las métricas del dashboard
 */
export const getDashboardMetrics = async () => {
  const response = await api.get('/dashboard/metrics/');
  return response.data;
};

/**
 * Obtiene las métricas específicas de un proyecto.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Object>} Devuelve las métricas del proyecto
 */
export const getProjectMetrics = async (projectId) => {
  const response = await api.get(`/dashboard/proyecto/${projectId}/metrics/`);
  return response.data;
};

/**
 * Valida la integridad del proyecto antes de cerrar la rendición (pre-rendición).
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Object>} Devuelve el resultado de la validación con errores y advertencias
 */
export const getPreRendicion = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/pre_rendicion/`);
  return response.data;
};

/**
 * Cierra la rendición del proyecto, bloqueando ediciones futuras.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Object>} Devuelve el proyecto con rendición cerrada
 */
export const cerrarRendicion = async (projectId) => {
  const response = await api.post(`/proyectos/${projectId}/cerrar_rendicion/`);
  return response.data;
};

/**
 * Obtiene el equipo de un proyecto (usuarios con sus roles).
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<Array>} Devuelve una lista de usuarios con sus roles
 */
export const getEquipoProyecto = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/equipo/`);
  return response.data;
};

/**
 * Agrega un usuario al equipo del proyecto con un rol específico.
 * 
 * @param {number} projectId - ID del proyecto
 * @param {number} usuarioId - ID del usuario
 * @param {number} rolId - ID del rol
 * @returns {Promise<Object>} Devuelve la confirmación y datos del equipo
 */
export const agregarUsuarioEquipo = async (projectId, usuarioId, rolId) => {
  const response = await api.post(`/proyectos/${projectId}/agregar_usuario_equipo/`, {
    usuario_id: usuarioId,
    rol_id: rolId
  });
  return response.data;
};

/**
 * Quita un usuario del equipo del proyecto.
 * 
 * @param {number} projectId - ID del proyecto
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>} Devuelve la confirmación
 */
export const quitarUsuarioEquipo = async (projectId, usuarioId) => {
  const response = await api.delete(`/proyectos/${projectId}/equipo/${usuarioId}/`);
  return response.data;
};

/**
 * Cambia el rol de un usuario en el proyecto.
 * 
 * @param {number} projectId - ID del proyecto
 * @param {number} usuarioId - ID del usuario
 * @param {number} rolId - ID del nuevo rol
 * @returns {Promise<Object>} Devuelve la confirmación y datos del equipo
 */
export const cambiarRolEquipo = async (projectId, usuarioId, rolId) => {
  const response = await api.patch(`/proyectos/${projectId}/equipo/${usuarioId}/cambiar_rol/`, {
    rol_id: rolId
  });
  return response.data;
};

/**
 * Descarga el reporte de estado del proyecto en PDF o Excel.
 * 
 * @param {number} projectId - ID del proyecto
 * @param {string} formato - 'pdf' o 'excel' (default: 'pdf')
 * @returns {Promise<void>} Descarga el archivo
 */
export const descargarReporteEstado = async (projectId, formato = 'pdf') => {
  const response = await api.get(`/proyectos/${projectId}/reporte_estado/`, {
    params: { formato },
    responseType: 'blob'  // Importante para descargar archivos binarios
  });
  
  // Crear URL temporal para descargar el archivo
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Determinar extensión del archivo
  const extension = formato === 'excel' ? 'xlsx' : 'pdf';
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  link.setAttribute('download', `reporte_estado_${projectId}_${fecha}.${extension}`);
  
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Descarga el reporte oficial de rendición en PDF.
 * Solo disponible para proyectos cerrados/completados.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Promise<void>} Descarga el archivo PDF
 */
export const descargarReporteRendicionOficial = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/reporte_rendicion_oficial/`, {
    responseType: 'blob'  // Importante para descargar archivos binarios
  });
  
  // Crear URL temporal para descargar el archivo
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  link.setAttribute('download', `reporte_rendicion_oficial_${projectId}_${fecha}.pdf`);
  
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Crea un nuevo ítem presupuestario.
 * 
 * @param {Object} itemData - Datos del ítem
 * @param {number} itemData.proyecto - ID del proyecto
 * @param {string} itemData.nombre_item_presupuesto - Nombre del ítem
 * @param {number} itemData.monto_asignado_item - Monto asignado
 * @param {string} itemData.categoria_item - Categoría del ítem (opcional)
 * @returns {Promise<Object>} Devuelve el ítem creado
 */
export const createBudgetItem = async (itemData) => {
  const response = await api.post('/items-presupuestarios/', itemData);
  return response.data;
};

/**
 * Actualiza un ítem presupuestario existente.
 * 
 * @param {number} itemId - ID del ítem
 * @param {Object} itemData - Datos del ítem a actualizar
 * @returns {Promise<Object>} Devuelve el ítem actualizado
 */
export const updateBudgetItem = async (itemId, itemData) => {
  const response = await api.patch(`/items-presupuestarios/${itemId}/`, itemData);
  return response.data;
};

/**
 * Elimina un ítem presupuestario.
 * 
 * @param {number} itemId - ID del ítem a eliminar
 * @returns {Promise<void>}
 */
export const deleteBudgetItem = async (itemId) => {
  await api.delete(`/items-presupuestarios/${itemId}/`);
};

/**
 * Crea un nuevo subítem presupuestario.
 * 
 * @param {Object} subitemData - Datos del subítem
 * @param {number} subitemData.item_presupuesto - ID del ítem padre
 * @param {string} subitemData.nombre_subitem_presupuesto - Nombre del subítem
 * @param {number} subitemData.monto_asignado_subitem - Monto asignado
 * @param {string} subitemData.categoria_subitem - Categoría del subítem (opcional)
 * @returns {Promise<Object>} Devuelve el subítem creado
 */
export const createSubitem = async (subitemData) => {
  const response = await api.post('/subitems-presupuestarios/', subitemData);
  return response.data;
};

/**
 * Actualiza un subítem presupuestario existente.
 * 
 * @param {number} subitemId - ID del subítem
 * @param {Object} subitemData - Datos del subítem a actualizar
 * @returns {Promise<Object>} Devuelve el subítem actualizado
 */
export const updateSubitem = async (subitemId, subitemData) => {
  const response = await api.patch(`/subitems-presupuestarios/${subitemId}/`, subitemData);
  return response.data;
};

/**
 * Elimina un subítem presupuestario.
 * 
 * @param {number} subitemId - ID del subítem a eliminar
 * @returns {Promise<void>}
 */
export const deleteSubitem = async (subitemId) => {
  await api.delete(`/subitems-presupuestarios/${subitemId}/`);
};


