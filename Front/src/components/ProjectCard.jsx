import React from 'react';
import { Link } from 'react-router-dom';

function ProjectCard({ project }) {

  // Formatear el estado para mostrar
  const getEstadoDisplay = (estado) => {
    const estados = {
      'activo': 'Activo',
      'completado': 'Completado',
      'cerrado': 'Cerrado',
      'en_pausa': 'En Pausa',
      'inactivo': 'Inactivo'
    };
    return estados[estado] || estado;
  };

  // Calcular porcentaje ejecutado
  const porcentajeEjecutado = project.presupuesto_total > 0 
    ? ((project.monto_ejecutado_proyecto / project.presupuesto_total) * 100).toFixed(1)
    : 0;

  // Obtener clase de badge según estado (usando estilos del template)
  const getEstadoBadgeClass = (estado) => {
    const estados = {
      'activo': 'badge-gradient-success',
      'completado': 'badge-gradient-primary',
      'cerrado': 'badge-gradient-secondary',
      'en_pausa': 'badge-gradient-warning',
      'inactivo': 'badge-gradient-secondary'
    };
    return estados[estado] || 'badge-gradient-secondary';
  };

  return (
    <div className="card stretch-card grid-margin m-3" style={{ width: '20rem', transition: 'transform 0.2s, box-shadow 0.2s' }}>
      <div 
        className="card-body"
        onMouseEnter={(e) => {
          e.currentTarget.closest('.card').style.transform = 'translateY(-5px)';
          e.currentTarget.closest('.card').style.boxShadow = '0 0.5rem 1rem rgba(154, 85, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.closest('.card').style.transform = 'translateY(0)';
          e.currentTarget.closest('.card').style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
        }}
      >
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h5 className="card-title mb-0 flex-grow-1">{project.nombre_proyecto}</h5>
          <span className={`badge ${getEstadoBadgeClass(project.estado_proyecto)} ms-2`}>
            {getEstadoDisplay(project.estado_proyecto)}
          </span>
        </div>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">
              <i className="mdi mdi-wallet me-1"></i>
              Presupuesto
            </small>
            <strong>${parseFloat(project.presupuesto_total || 0).toLocaleString('es-CL')}</strong>
          </div>
          
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">
              <i className="mdi mdi-check-circle me-1"></i>
              Ejecutado
            </small>
            <strong className="text-success">
              ${parseFloat(project.monto_ejecutado_proyecto || 0).toLocaleString('es-CL')}
            </strong>
          </div>
          
          <div className="progress mb-2" style={{ height: '8px' }}>
            <div
              className={`progress-bar ${porcentajeEjecutado > 100 ? 'bg-gradient-danger' : porcentajeEjecutado > 80 ? 'bg-gradient-warning' : 'bg-gradient-success'}`}
              role="progressbar"
              style={{ width: `${Math.min(porcentajeEjecutado, 100)}%` }}
              aria-valuenow={porcentajeEjecutado}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          
          <small className="text-muted d-block text-end">
            {porcentajeEjecutado}% ejecutado
          </small>
        </div>
        
        <Link 
          to={`/proyecto/${project.id}`} 
          className="btn btn-gradient-primary w-100"
        >
          <i className="mdi mdi-eye me-2"></i>
          Ver Detalles
        </Link>
      </div>
    </div>
  );
}

export default ProjectCard;