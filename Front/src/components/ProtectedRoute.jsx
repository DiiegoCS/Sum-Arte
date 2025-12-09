/**
 * Componente de Ruta Protegida.
 * 
 * Encapsula las rutas que requieren autenticación.
 * Redirige al inicio de sesión si el usuario no está autenticado.
 * Puede incluir verificación de permisos adicionales.
 */

import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserRoles } from '../hooks/useUserRoles';

/**
 * Componente ProtectedRoute.
 * 
 * @param {Object} props - Propiedades del componente
 * @param {ReactNode} props.children - Componentes hijos a renderizar si el usuario está autenticado
 * @param {Function} props.checkPermission - Función opcional para verificar permisos adicionales
 */
const ProtectedRoute = ({ children, checkPermission }) => {
  const { isAuthenticated, loading } = useAuth();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // Obtener proyectoId de params o searchParams
  const proyectoId = params.id || searchParams.get('proyecto');
  
  // Solo usar useUserRoles si hay un proyectoId y se necesita verificar permisos
  const shouldCheckRoles = checkPermission && proyectoId;
  const { 
    canCreateTransaction, 
    isAdminProyecto, 
    isDirectivo, 
    loading: loadingRoles 
  } = useUserRoles(shouldCheckRoles ? proyectoId : null);
  
  // Calcular permisos adicionales
  const canEditProject = proyectoId ? (isAdminProyecto() || isDirectivo()) : false;

  // Si la autenticación está cargando, se muestra un spinner de carga centrado
  if (loading || (shouldCheckRoles && loadingRoles)) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si el usuario no está autenticado, se redirige a la página de inicio de sesión
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay una función de verificación de permisos, se ejecuta
  if (checkPermission) {
    // Si no hay proyectoId, no se puede verificar el permiso específico del proyecto
    // En ese caso, permitir el acceso y dejar que el backend valide
    if (!proyectoId) {
      return children;
    }
    
    const hasPermission = checkPermission({ 
      canCreateTransaction, 
      canEditProject 
    });
    if (!hasPermission) {
      return (
        <div className="container-fluid mt-4 px-4">
          <div className="alert alert-danger">
            <h4 className="alert-heading">
              <i className="mdi mdi-alert-circle me-2"></i>
              Acceso Denegado
            </h4>
            <p>
              {checkPermission.toString().includes('canEditProject')
                ? 'No tiene permisos para editar proyectos. Solo los Administradores de Proyecto y Directivos pueden editar proyectos.'
                : 'No tiene permisos para acceder a esta página. Solo los Ejecutores y Administradores de Proyecto pueden registrar gastos.'}
            </p>
            <hr />
            <p className="mb-0">
              <a href="/" className="btn btn-primary">Volver al Dashboard</a>
            </p>
          </div>
        </div>
      );
    }
  }

  // Si el usuario está autenticado y tiene permisos, se renderizan los componentes hijos
  return children;
};

export default ProtectedRoute;


