import React from 'react';
import { Link } from 'react-router-dom';

function ProjectCard({ project }) {
  return (
    // Clases de Bootstrap para la tarjeta
    <div className="card text-bg-dark m-2" style={{ width: '18rem' }}>
      <div className="card-body">
        <h5 className="card-title">{project.nombre_proyecto}</h5>
        <p className="card-text">Estado: {project.estado_proyecto}</p>
        <p className="card-text">Presupuesto: ${project.presupuesto_total}</p>
        <p className="card-text">Ejecutado: ${project.monto_ejecutado_proyecto}</p>
        <Link to={`/proyecto/${project.id}`} className="btn btn-primary">Ver Detalles</Link>
      </div>
    </div>
  );
}

export default ProjectCard;