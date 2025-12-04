/**
 * Barra de navegación para Sum-Arte - Estilo Purple Admin Template
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente Navbar adaptado al estilo Purple Admin.
 */
const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Inicializar Bootstrap dropdown cuando el componente se monte
    if (typeof window !== 'undefined' && window.bootstrap && dropdownRef.current) {
      const dropdownElement = dropdownRef.current;
      
      let dropdown = window.bootstrap.Dropdown.getInstance(dropdownElement);
      if (!dropdown) {
        dropdown = new window.bootstrap.Dropdown(dropdownElement);
      }
      
      const handleShown = () => setDropdownOpen(true);
      const handleHidden = () => setDropdownOpen(false);
      
      dropdownElement.addEventListener('shown.bs.dropdown', handleShown);
      dropdownElement.addEventListener('hidden.bs.dropdown', handleHidden);
      
      return () => {
        dropdownElement.removeEventListener('shown.bs.dropdown', handleShown);
        dropdownElement.removeEventListener('hidden.bs.dropdown', handleHidden);
        if (dropdown) {
          dropdown.dispose();
        }
      };
    }
  }, [user]);

  const handleLogout = () => {
    if (dropdownRef.current && window.bootstrap) {
      const dropdown = window.bootstrap.Dropdown.getInstance(dropdownRef.current);
      if (dropdown) {
        dropdown.hide();
      }
    }
    logout();
    navigate('/login');
  };

  const handleMinimize = () => {
    if (toggleSidebar) {
      toggleSidebar();
    }
  };

  return (
    <nav className="navbar default-layout-navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
      <div className="text-center navbar-brand-wrapper d-flex align-items-center justify-content-start">
        <Link className="navbar-brand brand-logo" to="/">
          <span className="fw-bold">Sum-Arte</span>
        </Link>
        <Link className="navbar-brand brand-logo-mini" to="/">
          <span className="fw-bold">SA</span>
        </Link>
      </div>
      <div className="navbar-menu-wrapper d-flex align-items-stretch">
        <button 
          className="navbar-toggler navbar-toggler align-self-center" 
          type="button" 
          onClick={handleMinimize}
        >
          <span className="mdi mdi-menu"></span>
        </button>
        <ul className="navbar-nav navbar-nav-right">
          {user && (
            <li className="nav-item nav-profile dropdown">
              <a 
                className="nav-link dropdown-toggle" 
                id="profileDropdown" 
                href="#" 
                data-bs-toggle="dropdown" 
                aria-expanded={dropdownOpen}
                ref={dropdownRef}
              >
                <div className="nav-profile-img">
                  <img 
                    src="https://via.placeholder.com/40" 
                    alt="image"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM3M2E3ZGYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                  <span className="availability-status online"></span>
                </div>
                <div className="nav-profile-text">
                  <p className="mb-1 text-black">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user?.username || 'Usuario'}
                  </p>
                </div>
              </a>
              <div 
                className={`dropdown-menu navbar-dropdown ${dropdownOpen ? 'show' : ''}`}
                aria-labelledby="profileDropdown"
              >
                <Link className="dropdown-item" to="/mi-perfil">
                  <i className="mdi mdi-account me-2 text-primary"></i> Mi Perfil
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={handleLogout}>
                  <i className="mdi mdi-logout me-2 text-primary"></i> Cerrar Sesión
                </button>
              </div>
            </li>
          )}
          <li className="nav-item nav-logout d-none d-lg-block">
            <button className="nav-link" onClick={handleLogout} title="Cerrar Sesión">
              <i className="mdi mdi-power"></i>
            </button>
          </li>
        </ul>
        <button 
          className="navbar-toggler navbar-toggler-right d-lg-none align-self-center" 
          type="button" 
          onClick={handleMinimize}
        >
          <span className="mdi mdi-menu"></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;


