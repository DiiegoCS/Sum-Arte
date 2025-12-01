/**
 * Barra de navegación para Sum-Arte.
 * 
 * Muestra enlaces de navegación y información del usuario con funcionalidad de cierre de sesión.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente Navbar.
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const collapseRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [collapseOpen, setCollapseOpen] = useState(false);

  useEffect(() => {
    // Inicializar Bootstrap dropdown cuando el componente se monte
    if (typeof window !== 'undefined' && window.bootstrap && dropdownRef.current) {
      const dropdownElement = dropdownRef.current;
      
      // Crear instancia de dropdown si no existe
      let dropdown = window.bootstrap.Dropdown.getInstance(dropdownElement);
      if (!dropdown) {
        dropdown = new window.bootstrap.Dropdown(dropdownElement);
      }
      
      // Funciones para manejar eventos
      const handleShown = () => setDropdownOpen(true);
      const handleHidden = () => setDropdownOpen(false);
      
      // Escuchar eventos de Bootstrap
      dropdownElement.addEventListener('shown.bs.dropdown', handleShown);
      dropdownElement.addEventListener('hidden.bs.dropdown', handleHidden);
      
      return () => {
        // Limpiar al desmontar
        dropdownElement.removeEventListener('shown.bs.dropdown', handleShown);
        dropdownElement.removeEventListener('hidden.bs.dropdown', handleHidden);
        if (dropdown) {
          dropdown.dispose();
        }
      };
    }
  }, [user]); // Re-ejecutar si el usuario cambia

  const handleLogout = () => {
    // Cerrar dropdown antes de hacer logout
    if (dropdownRef.current && window.bootstrap) {
      const dropdown = window.bootstrap.Dropdown.getInstance(dropdownRef.current);
      if (dropdown) {
        dropdown.hide();
      }
    }
    logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    setCollapseOpen(!collapseOpen);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Sum-Arte
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleCollapse}
          aria-controls="navbarNav"
          aria-expanded={collapseOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div 
          className={`collapse navbar-collapse ${collapseOpen ? 'show' : ''}`} 
          id="navbarNav" 
          ref={collapseRef}
        >
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/registrar-gasto">
                Registrar Gasto
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/Invitar-usuario">
                Invitar Usuario
              </Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            {user && (
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-white text-decoration-none p-0 border-0"
                  id="navbarDropdown"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded={dropdownOpen}
                  ref={dropdownRef}
                  style={{ background: 'none', boxShadow: 'none' }}
                >
                  {user.username}
                </button>
                <ul 
                  className={`dropdown-menu dropdown-menu-end ${dropdownOpen ? 'show' : ''}`}
                  aria-labelledby="navbarDropdown"
                >
                  <li>
                    <span className="dropdown-item-text">
                      <small>{user.email || 'Sin email'}</small>
                    </span>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/mi-perfil">
                      <i className="bi bi-person-circle me-2"></i>
                      Mi Perfil
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Cerrar Sesión
                    </button>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


