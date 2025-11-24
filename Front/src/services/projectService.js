/**
 * Project service for Sum-Arte frontend.
 * 
 * Handles all project-related API calls.
 */

import api from './api';

/**
 * Get all projects for the current user.
 * 
 * @returns {Promise<Array>} List of projects
 */
export const getProjects = async () => {
  const response = await api.get('/proyectos/');
  return response.data;
};

/**
 * Get a specific project by ID.
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
export const getProject = async (projectId) => {
  const response = await api.get(`/proyectos/${projectId}/`);
  return response.data;
};

/**
 * Create a new project.
 * 
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export const createProject = async (projectData) => {
  const response = await api.post('/proyectos/', projectData);
  return response.data;
};

/**
 * Update a project.
 * 
 * @param {number} projectId - Project ID
 * @param {Object} projectData - Updated project data
 * @returns {Promise<Object>} Updated project
 */
export const updateProject = async (projectId, projectData) => {
  const response = await api.patch(`/proyectos/${projectId}/`, projectData);
  return response.data;
};

/**
 * Get budget items for a project.
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} List of budget items
 */
export const getBudgetItems = async (projectId) => {
  const response = await api.get(`/items-presupuestarios/?proyecto=${projectId}`);
  return response.data;
};

/**
 * Get subitems for a budget item.
 * 
 * @param {number} itemId - Budget item ID
 * @returns {Promise<Array>} List of subitems
 */
export const getSubitems = async (itemId) => {
  const response = await api.get(`/subitems-presupuestarios/?item_presupuesto=${itemId}`);
  return response.data;
};

/**
 * Get dashboard metrics for all projects.
 * 
 * @returns {Promise<Object>} Dashboard metrics
 */
export const getDashboardMetrics = async () => {
  const response = await api.get('/dashboard/metrics/');
  return response.data;
};

/**
 * Get metrics for a specific project.
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Project metrics
 */
export const getProjectMetrics = async (projectId) => {
  const response = await api.get(`/dashboard/proyecto/${projectId}/metrics/`);
  return response.data;
};

