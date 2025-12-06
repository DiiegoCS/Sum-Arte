/**
 * Contexto de autenticación para Sum-Arte.
 * 
 * Proporciona el estado de autenticación y los métodos asociados a toda la aplicación.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser, isAuthenticated } from '../services/authService';

const AuthContext = createContext(null);

/**
 * Componente AuthProvider que envuelve la aplicación.
 * 
 * @param {Object} props - Propiedades del componente
 * @param {ReactNode} props.children - Componentes hijos
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica si ya hay un usuario autenticado al cargar la aplicación
    const checkAuth = () => {
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Función para iniciar sesión.
   * 
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<void>}
   */
  const login = async (username, password) => {
    try {
      const userData = await authLogin(username, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Función para cerrar sesión.
   */
  const logout = () => {
    authLogout();
    setUser(null);
  };

  /**
   * Función para refrescar los datos del usuario actual.
   * Útil después de crear una organización o actualizar el perfil.
   * 
   * Actualiza desde localStorage (que puede haber sido actualizado manualmente)
   * o desde el token JWT si está disponible.
   */
  const refreshUser = async () => {
    try {
      if (isAuthenticated()) {
        // Primero intentar obtener desde localStorage (puede tener datos actualizados)
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          return currentUser;
        }
        
        // Si no hay datos en localStorage, intentar decodificar el token
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          try {
            const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
            const userData = {
              id: tokenPayload.user_id,
              username: tokenPayload.username,
              email: tokenPayload.email,
              organizacion_id: tokenPayload.organizacion_id,
              is_superuser: tokenPayload.is_superuser,
              usuario_principal: tokenPayload.usuario_principal || false,
            };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
          } catch (e) {
            console.error('Error al decodificar token:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error al refrescar usuario:', error);
    }
  };

  const value = {
    user,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para utilizar el contexto de autenticación.
 * 
 * @returns {Object} Valor del contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};


