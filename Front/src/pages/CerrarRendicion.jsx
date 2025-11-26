/**
 * Página para cerrar la rendición de un proyecto en Sum-Arte.
 * 
 * Permite cerrar la rendición del proyecto, bloqueando ediciones futuras (C005, C011).
 * Requiere confirmación del usuario antes de proceder.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getPreRendicion, cerrarRendicion } from '../services/projectService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para cerrar la rendición de un proyecto.
 */
const CerrarRendicion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [proyecto, setProyecto] = useState(null);
  const [validacion, setValidacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  /**
   * Carga los datos del proyecto y la validación.
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [proyectoData, validacionData] = await Promise.all([
        getProject(id),
        getPreRendicion(id),
      ]);

      setProyecto(proyectoData);
      setValidacion(validacionData);
    } catch (error) {
      toast.error('Error al cargar los datos del proyecto');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cierre de la rendición.
   */
  const handleCerrarRendicion = async () => {
    if (!confirmado) {
      toast.warning('Debe confirmar que desea cerrar la rendición');
      return;
    }

    if (!validacion?.valido) {
      toast.error('No se puede cerrar la rendición. Hay errores que deben corregirse primero.');
      return;
    }

    setCerrando(true);

    try {
      const resultado = await cerrarRendicion(id);
      toast.success(resultado.message || 'Rendición cerrada exitosamente');
      
      // Redirigir al proyecto después de un breve delay
      setTimeout(() => {
        navigate(`/proyecto/${id}`);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Error al cerrar la rendición');
      console.error('Error:', error);
      setCerrando(false);
    }
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
          <h1>Cerrar Rendición: {proyecto.nombre_proyecto}</h1>
          <p className="text-muted">Acción final que bloquea ediciones futuras</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
          disabled={cerrando}
        >
          Volver a Pre-Rendición
        </button>
      </div>

      {/* Advertencia importante */}
      <div className="alert alert-warning" role="alert">
        <h5 className="alert-heading">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Advertencia Importante
        </h5>
        <p className="mb-0">
          Al cerrar la rendición, el proyecto quedará bloqueado para ediciones futuras.
          Esta acción no se puede deshacer. Asegúrese de que todos los datos estén correctos antes de continuar.
        </p>
      </div>

      {/* Resumen de validación */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Estado de Validación</h5>
        </div>
        <div className="card-body">
          {valido ? (
            <div className="alert alert-success mb-0">
              <i className="bi bi-check-circle me-2"></i>
              El proyecto cumple con todos los requisitos para cerrar la rendición.
            </div>
          ) : (
            <div className="alert alert-danger mb-0">
              <i className="bi bi-x-circle me-2"></i>
              El proyecto no cumple con los requisitos. Por favor, corrija los errores antes de continuar.
            </div>
          )}
        </div>
      </div>

      {/* Resumen de transacciones */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Resumen Final</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>Presupuesto Total:</strong>
              <p className="fs-4">${parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-CL')}</p>
            </div>
            <div className="col-md-6 mb-3">
              <strong>Monto Ejecutado:</strong>
              <p className="fs-4">${parseFloat(proyecto.monto_ejecutado_proyecto || 0).toLocaleString('es-CL')}</p>
            </div>
            <div className="col-md-6 mb-3">
              <strong>Total de Transacciones:</strong>
              <p className="fs-4">{resumen.total_transacciones || 0}</p>
            </div>
            <div className="col-md-6 mb-3">
              <strong>Transacciones Aprobadas:</strong>
              <p className="fs-4 text-success">{resumen.aprobadas || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Errores (si los hay) */}
      {errores.length > 0 && (
        <div className="card mb-4 border-danger">
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0">Errores que impiden cerrar la rendición</h5>
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

      {/* Advertencias (si las hay) */}
      {advertencias.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning text-dark">
            <h5 className="mb-0">Advertencias</h5>
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

      {/* Confirmación y botones de acción */}
      <div className="card">
        <div className="card-body">
          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="confirmarCierre"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              disabled={!valido || cerrando}
            />
            <label className="form-check-label" htmlFor="confirmarCierre">
              <strong>Confirmo que he revisado todos los datos y deseo cerrar la rendición.</strong>
              <br />
              <small className="text-muted">
                Esta acción bloqueará el proyecto para ediciones futuras y no se puede deshacer.
              </small>
            </label>
          </div>

          <div className="d-flex justify-content-between">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
              disabled={cerrando}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger btn-lg"
              onClick={handleCerrarRendicion}
              disabled={!valido || !confirmado || cerrando}
            >
              {cerrando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Cerrando...
                </>
              ) : (
                <>
                  <i className="bi bi-lock me-2"></i>
                  Cerrar Rendición
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CerrarRendicion;

