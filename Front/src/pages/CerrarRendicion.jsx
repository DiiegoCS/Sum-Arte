/**
 * Página para cerrar la rendición de un proyecto en Sum-Arte.
 * 
 * Permite cerrar la rendición del proyecto, bloqueando ediciones futuras (C005, C011).
 * Requiere confirmación del usuario antes de proceder.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getPreRendicion, cerrarRendicion, descargarReporteRendicionOficial } from '../services/projectService';
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
  const [descargandoReporte, setDescargandoReporte] = useState(false);

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
   * Descarga el reporte oficial de rendición.
   */
  const handleDescargarReporteOficial = async () => {
    try {
      setDescargandoReporte(true);
      await descargarReporteRendicionOficial(id);
      toast.success('Reporte oficial de rendición descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Error al descargar el reporte';
      toast.error(errorMsg);
    } finally {
      setDescargandoReporte(false);
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
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!proyecto || !validacion) {
    return (
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-warning">No se pudieron cargar los datos del proyecto.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { errores = [], advertencias = [], valido = false, resumen = {} } = validacion;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Page Header estilo template */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="page-title">
              <span className="page-title-icon bg-gradient-danger text-white me-2">
                <i className="mdi mdi-lock"></i>
              </span>
              Cerrar Rendición: {proyecto.nombre_proyecto}
            </h3>
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/" className="text-decoration-none">Dashboard</a>
                </li>
                <li className="breadcrumb-item">
                  <a href={`/proyecto/${id}`} className="text-decoration-none">{proyecto.nombre_proyecto}</a>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Cerrar Rendición
                </li>
              </ul>
            </nav>
          </div>
          <div className="d-flex gap-2">
            {(proyecto.estado_proyecto === 'completado' || proyecto.estado_proyecto === 'cerrado') && (
              <button
                className="btn btn-gradient-primary"
                onClick={handleDescargarReporteOficial}
                disabled={descargandoReporte}
                title="Descargar reporte oficial de rendición"
              >
                {descargandoReporte ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Generando...
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-file-pdf-box me-2"></i>
                    Reporte Oficial
                  </>
                )}
              </button>
            )}
            <button 
              className="btn btn-gradient-info" 
              onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
              disabled={cerrando}
            >
              <i className="mdi mdi-arrow-left me-2"></i>
              Volver a Pre-Rendición
            </button>
          </div>
        </div>
      </div>

      {/* Advertencia importante */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card border-warning">
            <div className="card-body bg-gradient-warning text-dark">
              <h4 className="card-title mb-3">
                <i className="mdi mdi-alert me-2"></i>
                Advertencia Importante
              </h4>
              <p className="mb-0">
                Al cerrar la rendición, el proyecto quedará bloqueado para ediciones futuras.
                Esta acción no se puede deshacer. Asegúrese de que todos los datos estén correctos antes de continuar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de validación */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-3">Estado de Validación</h4>
              {valido ? (
                <div className="alert alert-success mb-0">
                  <i className="mdi mdi-check-circle me-2"></i>
                  El proyecto cumple con todos los requisitos para cerrar la rendición.
                </div>
              ) : (
                <div className="alert alert-danger mb-0">
                  <i className="mdi mdi-close-circle me-2"></i>
                  El proyecto no cumple con los requisitos. Por favor, corrija los errores antes de continuar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de transacciones */}
      <div className="row">
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-primary card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Presupuesto Total
                <i className="mdi mdi-wallet mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">
                ${parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-CL')}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-success card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Monto Ejecutado
                <i className="mdi mdi-check-circle mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">
                ${parseFloat(proyecto.monto_ejecutado_proyecto || 0).toLocaleString('es-CL')}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-info card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Total Transacciones
                <i className="mdi mdi-receipt mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">{resumen.total_transacciones || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-warning card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Aprobadas
                <i className="mdi mdi-check-all mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">{resumen.aprobadas || 0}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Errores (si los hay) */}
      {errores.length > 0 && (
        <div className="row">
          <div className="col-12 grid-margin stretch-card">
            <div className="card border-danger">
              <div className="card-body bg-gradient-danger text-white">
                <h4 className="card-title mb-3">
                  <i className="mdi mdi-close-circle me-2"></i>
                  Errores que impiden cerrar la rendición
                </h4>
                <ul className="list-unstyled mb-0">
                  {errores.map((error, index) => (
                    <li key={index} className="mb-2 p-2 bg-white bg-opacity-20 rounded">
                      <i className="mdi mdi-alert-circle text-white me-2"></i>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advertencias (si las hay) */}
      {advertencias.length > 0 && (
        <div className="row">
          <div className="col-12 grid-margin stretch-card">
            <div className="card border-warning">
              <div className="card-body bg-gradient-warning text-dark">
                <h4 className="card-title mb-3">
                  <i className="mdi mdi-alert me-2"></i>
                  Advertencias
                </h4>
                <ul className="list-unstyled mb-0">
                  {advertencias.map((advertencia, index) => (
                    <li key={index} className="mb-2 p-2 bg-white bg-opacity-20 rounded">
                      <i className="mdi mdi-alert-circle text-dark me-2"></i>
                      {advertencia}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación y botones de acción */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
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
                  className="btn btn-gradient-secondary"
                  onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
                  disabled={cerrando}
                >
                  <i className="mdi mdi-close me-2"></i>
                  Cancelar
                </button>
                <button
                  className="btn btn-gradient-danger btn-lg"
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
                      <i className="mdi mdi-lock me-2"></i>
                      Cerrar Rendición
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CerrarRendicion;

