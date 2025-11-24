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

  const value = {
    user,
    login,
    logout,
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


