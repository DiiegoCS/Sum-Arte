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
 * @returns {Promise<Object>} Devuelve el proyecto creado
 */
export const createProject = async (projectData) => {
  const response = await api.post('/proyectos/', projectData);
  return response.data;
};

/**
 * Actualiza los datos de un proyecto existente.
 * 
 * @param {number} projectId - ID del proyecto a actualizar
 * @param {Object} projectData - Datos actualizados del proyecto
 * @returns {Promise<Object>} Devuelve el proyecto actualizado
 */
export const updateProject = async (projectId, projectData) => {
  const response = await api.patch(`/proyectos/${projectId}/`, projectData);
  return response.data;
};

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


