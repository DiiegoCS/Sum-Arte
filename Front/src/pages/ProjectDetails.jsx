import React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; 

function ProjectDetails() {
  // Usa useParams() para obtener el 'id' de la URL
  const { id } = useParams();
  const [proyecto, setProyectos] = useState(null);

  useEffect(() => {
    fetch(`/api/proyectos/${id}/`)
      .then(response => response.json())
      .then(data => {
        console.log('Datos recibidos:', data);
        setProyectos(data);
      })
      .catch(error => {
        console.error('Error al cargar los proyectos:', error);
      });
  }, [ id ]);
  
  // Si el proyecto aún no ha cargado, muestra un mensaje
  if (!proyecto) {
    return <div>Cargando...</div>;
  }

  // Una vez que el proyecto carga, muestra los detalles
  return (
    <div className="container mt-4">
      {/* Título del Proyecto */}
      <h1 className="text-center mb-4">{proyecto.nombre_proyecto}</h1>
      <p className="text-center text-muted">Mostrando información para el proyecto con ID: {id}</p>
      
      {/* --- Fila de Tarjetas de Estadísticas --- */}
      <div className="row justify-content-center g-3 mt-4">

        {/* Tarjeta 1: Presupuesto Total */}
        <div className="col-md-4">
          <div className="card text-bg-light shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Presupuesto Total</h6>
              <p className="card-title fs-4 fw-bold">${parseFloat(proyecto.presupuesto_total).toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Monto Ejecutado */}
        <div className="col-md-4">
          <div className="card text-bg-light shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Monto Ejecutado</h6>
              <p className="card-title fs-4 fw-bold">${parseFloat(proyecto.monto_ejecutado_proyecto).toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Estado del Proyecto */}
        <div className="col-md-4">
          <div className="card text-bg-light shadow-sm">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Estado</h6>
              {/* capitalizamos la primera letra */}
              <p className="card-title fs-2 fw-bold">{proyecto.estado_proyecto.charAt(0).toUpperCase() + proyecto.estado_proyecto.slice(1)}</p>
            </div>
          </div>
        </div>

      </div>
      
      {/* Aquí irá la lista de transacciones */}
      
    </div>
  );
}

export default ProjectDetails;