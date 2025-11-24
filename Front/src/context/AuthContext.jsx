/**
 * Authentication Context for Sum-Arte.
 * 
 * Provides authentication state and methods throughout the application.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser, isAuthenticated } from '../services/authService';

const AuthContext = createContext(null);

/**
 * AuthProvider component that wraps the application.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
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
   * Login function.
   * 
   * @param {string} username - User's username
   * @param {string} password - User's password
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
   * Logout function.
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
 * Hook to use authentication context.
 * 
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


