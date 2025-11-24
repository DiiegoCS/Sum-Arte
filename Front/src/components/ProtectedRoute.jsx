/**
 * Componente de Ruta Protegida.
 * 
 * Encapsula las rutas que requieren autenticación.
 * Redirige al inicio de sesión si el usuario no está autenticado.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente ProtectedRoute.
 * 
 * @param {Object} props - Propiedades del componente
 * @param {ReactNode} props.children - Componentes hijos a renderizar si el usuario está autenticado
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Si la autenticación está cargando, se muestra un spinner de carga centrado
  if (loading) {
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

  // Si el usuario está autenticado, se renderizan los componentes hijos
  return children;
};

export default ProtectedRoute;


