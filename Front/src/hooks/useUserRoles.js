/**
 * Hook personalizado para obtener y verificar roles del usuario en proyectos.
 * 
 * Proporciona funciones helper para verificar permisos basados en roles.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEquipoProyecto } from '../services/projectService';

/**
 * Hook para obtener los roles del usuario actual en un proyecto específico.
 * 
 * @param {number} projectId - ID del proyecto
 * @returns {Object} Objeto con roles del usuario y funciones helper
 */
export const useUserRoles = (projectId) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && user) {
      cargarRoles();
    } else {
      setRoles([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.id]);

  const cargarRoles = async () => {
    try {
      setLoading(true);
      const equipo = await getEquipoProyecto(projectId);
      const equipoList = Array.isArray(equipo) ? equipo : [];
      
      // Buscar el usuario actual en el equipo
      const usuarioEnEquipo = equipoList.find(
        miembro => miembro.usuario_id === user.id || miembro.usuario?.id === user.id
      );
      
      if (usuarioEnEquipo) {
        // Extraer los nombres de los roles
        // El backend devuelve roles como [{id: X, nombre: 'admin proyecto'}, ...]
        const nombresRoles = usuarioEnEquipo.roles?.map(rol => rol.nombre || rol.nombre_rol) || [];
        setRoles(nombresRoles);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error al cargar roles del usuario:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  // Funciones helper para verificar roles
  const hasRole = (roleName) => {
    return roles.includes(roleName);
  };

  const hasAnyRole = (roleNames) => {
    return roleNames.some(role => roles.includes(role));
  };

  const isAdminProyecto = () => {
    return hasRole('admin proyecto');
  };

  const isEjecutor = () => {
    return hasRole('ejecutor');
  };

  const isDirectivo = () => {
    return hasRole('directivo');
  };

  const isAuditor = () => {
    return hasRole('auditor');
  };

  // Funciones para verificar permisos específicos
  const canCreateTransaction = () => {
    return isAdminProyecto() || isEjecutor();
  };

  const canGenerateReports = () => {
    return isAdminProyecto() || isDirectivo();
  };

  const canCreateProject = () => {
    // Esto se verifica a nivel de organización, no de proyecto
    // Se maneja en el componente según el contexto
    return true; // Se verificará en el componente
  };

  const canViewReports = () => {
    // Todos los roles pueden ver informes generados
    return roles.length > 0;
  };

  return {
    roles,
    loading,
    hasRole,
    hasAnyRole,
    isAdminProyecto,
    isEjecutor,
    isDirectivo,
    isAuditor,
    canCreateTransaction,
    canGenerateReports,
    canCreateProject,
    canViewReports,
    refreshRoles: cargarRoles,
  };
};

/**
 * Hook para verificar si el usuario puede crear proyectos.
 * Esto se basa en tener rol de admin o directivo en al menos un proyecto de la organización.
 * 
 * @returns {Object} Objeto con permisos de creación de proyecto
 */
export const useCanCreateProject = () => {
  const { user } = useAuth();
  
  // Si es superusuario o usuario principal, puede crear proyectos
  const canCreate = () => {
    if (user?.is_superuser || user?.usuario_principal) {
      return true;
    }
    // Para otros usuarios, se verifica en el backend
    // Por ahora retornamos true y el backend validará
    return true;
  };

  return {
    canCreate: canCreate(),
  };
};

