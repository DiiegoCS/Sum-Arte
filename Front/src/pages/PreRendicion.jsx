/**
 * Página de pre-rendición para Sum-Arte.
 * 
 * Muestra las validaciones de integridad (C008) antes de cerrar la rendición,
 * incluyendo errores y advertencias encontradas.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject, getPreRendicion, descargarReporteEstado, descargarReporteRendicionOficial } from '../services/projectService';
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
  const [descargandoReporte, setDescargandoReporte] = useState(false);

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

  /**
   * Descarga el reporte de estado del proyecto.
   */
  const handleDescargarReporte = async (formato = 'pdf') => {
    try {
      setDescargandoReporte(true);
      await descargarReporteEstado(id, formato);
      toast.success(`Reporte ${formato.toUpperCase()} descargado exitosamente`);
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      toast.error('Error al descargar el reporte');
    } finally {
      setDescargandoReporte(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4 px-4">
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
      <div className="container-fluid mt-4 px-4">
        <div className="alert alert-warning">No se pudieron cargar los datos del proyecto.</div>
      </div>
    );
  }

  const { errores = [], advertencias = [], valido = false, resumen = {} } = validacion;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Page Header estilo template */}
      <div className="container">
        <div className="d-flex justify-content-between align-items-start flex-nowrap mb-2 flex-column flex-md-row gap-3">
          <div className="flex-grow-1" style={{ minWidth: '20rem' }}>
            <h3 className="page-title mb-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span className="page-title-icon bg-gradient-primary text-white me-2">
                <i className="mdi mdi-file-check"></i>
              </span>
              Pre-Rendición: {proyecto.nombre_proyecto}
            </h3>
            <nav aria-label="breadcrumb" className="mt-2">
              <ul className="breadcrumb mb-0 flex-wrap">
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to={`/proyecto/${id}`} className="text-decoration-none" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', display: 'inline-block' }}>{proyecto.nombre_proyecto}</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Pre-Rendición
                </li>
              </ul>
            </nav>
          </div>
          <div className="d-flex flex-wrap gap-4 flex-shrink-0">
            {/* Botón para descargar informe oficial (solo si el proyecto está cerrado/completado) */}
            {(proyecto.estado_proyecto === 'completado' || proyecto.estado_proyecto === 'cerrado') ? (
              <button
                className="btn btn-gradient-success"
                onClick={async () => {
                  try {
                    setDescargandoReporte(true);
                    await descargarReporteRendicionOficial(id);
                    toast.success('Informe oficial descargado exitosamente');
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Error al descargar el informe oficial');
                    console.error('Error:', error);
                  } finally {
                    setDescargandoReporte(false);
                  }
                }}
                disabled={descargandoReporte}
                title="Descargar informe oficial de rendición"
              >
                {descargandoReporte ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    <span className="d-md-inline">Generando...</span>
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-file-pdf-box me-2"></i>
                    <span className="d-none d-md-inline">Informe Final</span>
                    <span className="d-md-none">Final</span>
                  </>
                )}
              </button>
            ) : (
              <div className="btn-group" style={{ minWidth: '5rem' }}>
                <button
                  className="btn btn-gradient-primary"
                  onClick={() => handleDescargarReporte('pdf')}
                  disabled={descargandoReporte}
                  title="Descargar reporte en PDF"
                >
                  {descargandoReporte ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      <span className="d-md-inline">Generando...</span>
                    </>
                  ) : (
                    <>
                      <i className="mdi mdi-file-pdf me-2"></i>
                      <span className="d-none d-md-inline">PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-gradient-primary dropdown-toggle dropdown-toggle-split"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={descargandoReporte}
                >
                  <span className="visually-hidden">Toggle Dropdown</span>
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => handleDescargarReporte('excel')}
                      disabled={descargandoReporte}
                    >
                      <i className="mdi mdi-file-excel me-2"></i>
                      Excel
                    </button>
                  </li>
                </ul>
              </div>
            )}
            <button className="btn btn-gradient-info" onClick={() => navigate(`/proyecto/${id}`)}>
              <i className="mdi mdi-arrow-left me-2"></i>
              <span className="d-none d-md-inline">Volver al Proyecto</span>
              <span className="d-md-none">Volver</span>
            </button>
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
                Pendientes
                <i className="mdi mdi-clock mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">{resumen.pendientes || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-success card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Aprobadas
                <i className="mdi mdi-check-circle mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">{resumen.aprobadas || 0}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-danger card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Rechazadas
                <i className="mdi mdi-close-circle mdi-24px float-end"></i>
              </h4>
              <h2 className="mb-5">{resumen.rechazadas || 0}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Errores críticos */}
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
                      <strong>{error}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advertencias */}
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

      {/* Estado de validación */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className={`card-body text-center p-5 ${valido ? 'bg-gradient-success text-white' : 'bg-light'}`}>
              {valido ? (
                <>
                  <div className="mb-4">
                    <i className="mdi mdi-check-circle" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h3 className="mb-3">
                    Validación Exitosa
                  </h3>
                  <p className="mb-4">
                    El proyecto cumple con todos los requisitos para cerrar la rendición.
                  </p>
                  <button
                    className="btn btn-gradient-primary btn-lg"
                    onClick={handleContinuar}
                  >
                    <i className="mdi mdi-check-circle me-2"></i>
                    Continuar para Cerrar Rendición
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <i className="mdi mdi-close-circle text-danger" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h3 className="mb-3 text-danger">
                    Validación Fallida
                  </h3>
                  <p className="mb-4 text-muted">
                    El proyecto no cumple con los requisitos para cerrar la rendición.
                    Por favor, corrija los errores antes de continuar.
                  </p>
                  <button
                    className="btn btn-gradient-info"
                    onClick={() => navigate(`/proyecto/${id}`)}
                  >
                    <i className="mdi mdi-arrow-left me-2"></i>
                    Volver al Proyecto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de transacciones pendientes */}
      {resumen.pendientes > 0 && (
        <div className="row">
          <div className="col-12 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">
                  <i className="mdi mdi-clock-alert me-2"></i>
                  Transacciones Pendientes de Aprobación
                </h4>
                <div className="table-responsive">
                  <table className="table table-hover">
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
                                className="btn btn-sm btn-gradient-primary"
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
          </div>
        </div>
      )}
    </>
  );
};

export default PreRendicion;

