/**
 * Layout component que envuelve el contenido con Sidebar y Navbar del template Purple Admin
 */

import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="container-scroller">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="container-fluid page-body-wrapper">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`main-panel ${!sidebarOpen ? 'sidebar-active' : ''}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;

