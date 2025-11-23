import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'; // estilos
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import RegisterExpense from './pages/RegisterExpense';

function App() {
  
  // App ahora solo se encarga de definir las rutas
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Proyectos de Sum-Arte</h1> {/* Título principal */}
          
          <Routes>
            {/* Ruta principal "/" */}
            <Route path="/" element={<Dashboard />} />
            {/* Ruta para detalles del proyecto "/proyecto/:id" */}
            <Route path="/proyecto/:id" element={<ProjectDetails />} />
            {/* Ruta para registrar un nuevo gasto "/registrar-gasto" */}
            <Route path="/registrar-gasto/" element={<RegisterExpense />} />
          
          </Routes>

        </header>
      </div>
    </BrowserRouter>
  );
}

export default App;