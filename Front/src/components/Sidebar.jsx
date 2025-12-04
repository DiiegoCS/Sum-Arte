/**
 * Sidebar component basado en el template Purple Admin
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'mdi-home',
      path: '/',
      exact: true
    },
    {
      id: 'projects',
      title: 'Proyectos',
      icon: 'mdi-folder',
      path: null,
      submenu: [
        {
          title: 'Crear Proyecto',
          path: '/crear-proyecto',
          icon: 'mdi-plus-circle'
        }
      ]
    },
    {
      id: 'transactions',
      title: 'Transacciones',
      icon: 'mdi-cash',
      path: '/registrar-gasto'
    },
    {
      id: 'users',
      title: 'Usuarios',
      icon: 'mdi-account-group',
      path: null,
      submenu: [
        {
          title: 'Invitar Usuario',
          path: '/Invitar-usuario',
          icon: 'mdi-account-plus'
        }
      ]
    }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`sidebar sidebar-offcanvas ${!isOpen ? 'active' : ''}`} id="sidebar">
      <ul className="nav">
        {/* Profile Section */}
        <li className="nav-item nav-profile">
          <Link to="/mi-perfil" className="nav-link">
            <div className="nav-profile-image">
              <img 
                src="https://via.placeholder.com/40" 
                alt="profile" 
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM3M2E3ZGYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              <span className="login-status online"></span>
            </div>
            <div className="nav-profile-text d-flex flex-column">
              <span className="font-weight-bold mb-2">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.username || 'Usuario'}
              </span>
              <span className="text-secondary text-small">
                {user?.email || 'Usuario'}
              </span>
            </div>
            <i className="mdi mdi-bookmark-check text-success nav-profile-badge"></i>
          </Link>
        </li>

        {/* Menu Items */}
        {menuItems.map((item) => {
          if (item.submenu) {
            const isExpanded = expandedMenus[item.id];
            return (
              <li key={item.id} className="nav-item">
                <a
                  className={`nav-link ${isExpanded ? '' : 'collapsed'}`}
                  onClick={() => toggleMenu(item.id)}
                  data-bs-toggle="collapse"
                  href={`#${item.id}`}
                  aria-expanded={isExpanded}
                  aria-controls={item.id}
                >
                  <span className="menu-title">{item.title}</span>
                  <i className="menu-arrow"></i>
                  <i className={`mdi ${item.icon} menu-icon`}></i>
                </a>
                <div 
                  className={`collapse ${isExpanded ? 'show' : ''}`} 
                  id={item.id}
                >
                  <ul className="nav flex-column sub-menu">
                    {item.submenu.map((subItem, index) => (
                      <li key={index} className="nav-item">
                        <Link 
                          className={`nav-link ${isActive(subItem.path) ? 'active' : ''}`}
                          to={subItem.path}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          } else {
            return (
              <li key={item.id} className="nav-item">
                <Link
                  className={`nav-link ${isActive(item.path, item.exact) ? 'active' : ''}`}
                  to={item.path}
                >
                  <span className="menu-title">{item.title}</span>
                  <i className={`mdi ${item.icon} menu-icon`}></i>
                </Link>
              </li>
            );
          }
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;

