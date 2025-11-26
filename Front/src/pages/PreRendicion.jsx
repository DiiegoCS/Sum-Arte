/**
 * Página de pre-rendición para Sum-Arte.
 * 
 * Muestra las validaciones de integridad (C008) antes de cerrar la rendición,
 * incluyendo errores y advertencias encontradas.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getPreRendicion } from '../services/projectService';
import { getTransactions } from '../services/transactionService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para mostrar la pre-rendición con validaciones.
 */
const PreRendicion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [proyecto, setProyecto] = useState(null);
  const [validacion, setValidacion] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  /**
   * Carga los datos del proyecto y la validación de pre-rendición.
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [proyectoData, validacionData, transaccionesData] = await Promise.all([
        getProject(id),
        getPreRendicion(id),
        getTransactions({ proyecto: id }),
      ]);

      // Extraer results si viene paginado
      const transaccionesList = Array.isArray(transaccionesData) 
        ? transaccionesData 
        : (transaccionesData.results || []);

      setProyecto(proyectoData);
      setValidacion(validacionData);
      setTransacciones(transaccionesList);
    } catch (error) {
      toast.error('Error al cargar los datos de pre-rendición');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navega a la página de cerrar rendición.
   */
  const handleContinuar = () => {
    navigate(`/proyecto/${id}/cerrar-rendicion`);
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!proyecto || !validacion) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">No se pudieron cargar los datos del proyecto.</div>
      </div>
    );
  }

  const { errores = [], advertencias = [], valido = false, resumen = {} } = validacion;

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Pre-Rendición: {proyecto.nombre_proyecto}</h1>
          <p className="text-muted">Validación de integridad antes de cerrar la rendición</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/proyecto/${id}`)}>
          Volver al Proyecto
        </button>
      </div>

      {/* Resumen de transacciones */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Resumen de Transacciones</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="text-center">
                <h3 className="text-primary">{resumen.total_transacciones || 0}</h3>
                <p className="text-muted mb-0">Total</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h3 className="text-warning">{resumen.pendientes || 0}</h3>
                <p className="text-muted mb-0">Pendientes</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h3 className="text-success">{resumen.aprobadas || 0}</h3>
                <p className="text-muted mb-0">Aprobadas</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <h3 className="text-danger">{resumen.rechazadas || 0}</h3>
                <p className="text-muted mb-0">Rechazadas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Errores críticos */}
      {errores.length > 0 && (
        <div className="card mb-4 border-danger">
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0">
              <i className="bi bi-x-circle me-2"></i>
              Errores que impiden cerrar la rendición
            </h5>
          </div>
          <div className="card-body">
            <ul className="list-unstyled mb-0">
              {errores.map((error, index) => (
                <li key={index} className="mb-2">
                  <span className="badge bg-danger me-2">✗</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Advertencias */}
      {advertencias.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning text-dark">
            <h5 className="mb-0">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Advertencias
            </h5>
          </div>
          <div className="card-body">
            <ul className="list-unstyled mb-0">
              {advertencias.map((advertencia, index) => (
                <li key={index} className="mb-2">
                  <span className="badge bg-warning text-dark me-2">⚠</span>
                  {advertencia}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Estado de validación */}
      <div className="card mb-4">
        <div className={`card-body text-center ${valido ? 'bg-success text-white' : 'bg-light'}`}>
          {valido ? (
            <>
              <h3 className="mb-3">
                <i className="bi bi-check-circle me-2"></i>
                Validación Exitosa
              </h3>
              <p className="mb-4">
                El proyecto cumple con todos los requisitos para cerrar la rendición.
              </p>
              <button
                className="btn btn-light btn-lg"
                onClick={handleContinuar}
              >
                Continuar para Cerrar Rendición
              </button>
            </>
          ) : (
            <>
              <h3 className="mb-3">
                <i className="bi bi-x-circle me-2"></i>
                Validación Fallida
              </h3>
              <p className="mb-4">
                El proyecto no cumple con los requisitos para cerrar la rendición.
                Por favor, corrija los errores antes de continuar.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/proyecto/${id}`)}
              >
                Volver al Proyecto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lista de transacciones pendientes */}
      {resumen.pendientes > 0 && (
        <div className="card">
          <div className="card-header">
            <h5>Transacciones Pendientes de Aprobación</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Monto</th>
                    <th>Documento</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {transacciones
                    .filter(t => t.estado_transaccion === 'pendiente')
                    .map((transaccion) => (
                      <tr key={transaccion.id}>
                        <td>{transaccion.fecha_registro}</td>
                        <td>{transaccion.proveedor_nombre || 'N/A'}</td>
                        <td>${parseFloat(transaccion.monto_transaccion || 0).toLocaleString('es-CL')}</td>
                        <td>{transaccion.nro_documento}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => navigate(`/proyecto/${id}`)}
                          >
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreRendicion;

