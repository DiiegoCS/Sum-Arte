import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';

function Dashboard() {
  const [proyectos, setProyectos] = useState([]);

  useEffect(() => {
    fetch('/api/proyectos/')
      .then(response => response.json())
      .then(data => {
        console.log('Datos recibidos:', data);
        setProyectos(data);
      })
      .catch(error => {
        console.error('Error al cargar los proyectos:', error);
      });
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Dashboard General</h1>
      <p className="text-center">Datos cargados desde la API de Django:</p>

      <Link to={`/registrar-gasto/`} className="btn btn-primary">Nuevo Gasto +</Link>

      <div className="d-flex flex-wrap justify-content-center">
        {proyectos.map(proyecto => (
          <ProjectCard project={proyecto} key={proyecto.id} />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;