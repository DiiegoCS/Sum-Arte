/**
 * Página de detalles de proyecto para Sum-Arte.
 * 
 * Muestra información completa del proyecto incluyendo:
 * - Estadísticas del presupuesto
 * - Lista de transacciones con opciones de aprobación
 * - Ítems presupuestarios con barras de progreso
 * - Evidencias vinculadas a transacciones
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectMetrics } from '../services/projectService';
import { getTransactions, approveTransaction, rejectTransaction } from '../services/transactionService';
import { getProjectEvidence, getTransactionEvidence } from '../services/evidenceService';
import { getLogsPorProyecto } from '../services/logService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para mostrar los detalles de un proyecto.
 */
const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [proyecto, setProyecto] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transaccionesConEvidencias, setTransaccionesConEvidencias] = useState({});
  const [mostrarEvidencias, setMostrarEvidencias] = useState({});
  const [logs, setLogs] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoLogs, setCargandoLogs] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  /**
   * Carga todos los datos del proyecto.
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [proyectoData, transaccionesData, metricasData, evidenciasData] = await Promise.all([
        getProject(id),
        getTransactions({ proyecto: id }),
        getProjectMetrics(id),
        getProjectEvidence(id),
      ]);

      // Extraer results si viene paginado
      const transaccionesList = Array.isArray(transaccionesData) 
        ? transaccionesData 
        : (transaccionesData.results || []);
      const evidenciasList = Array.isArray(evidenciasData) 
        ? evidenciasData 
        : (evidenciasData.results || []);

      setProyecto(proyectoData);
      setTransacciones(transaccionesList);
      setMetricas(metricasData);
      setEvidencias(evidenciasList);

      // Cargar evidencias por transacción
      const evidenciasPorTransaccion = {};
      for (const transaccion of transaccionesList) {
        try {
          const evidenciasTrans = await getTransactionEvidence(transaccion.id);
          const evidenciasList = Array.isArray(evidenciasTrans) 
            ? evidenciasTrans 
            : (evidenciasTrans.results || []);
          evidenciasPorTransaccion[transaccion.id] = evidenciasList;
        } catch (error) {
          console.error(`Error al cargar evidencias de transacción ${transaccion.id}:`, error);
          evidenciasPorTransaccion[transaccion.id] = [];
        }
      }
      setTransaccionesConEvidencias(evidenciasPorTransaccion);
    } catch (error) {
      toast.error('Error al cargar los datos del proyecto');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja la aprobación de una transacción.
   */
  const handleAprobar = async (transaccionId) => {
    try {
      await approveTransaction(transaccionId);
      toast.success('Transacción aprobada exitosamente');
      cargarDatos(); // Recargar datos
    } catch (error) {
      toast.error(error.message || 'Error al aprobar la transacción');
      console.error('Error:', error);
    }
  };

  /**
   * Maneja el rechazo de una transacción.
   */
  const handleRechazar = async (transaccionId) => {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (!motivo) {
      return; // Usuario canceló
    }

    try {
      await rejectTransaction(transaccionId, motivo);
      toast.success('Transacción rechazada exitosamente');
      cargarDatos(); // Recargar datos
    } catch (error) {
      toast.error(error.message || 'Error al rechazar la transacción');
      console.error('Error:', error);
    }
  };

  /**
   * Alterna la visualización de evidencias para una transacción.
   */
  const toggleEvidencias = (transaccionId) => {
    setMostrarEvidencias(prev => ({
      ...prev,
      [transaccionId]: !prev[transaccionId]
    }));
  };

  /**
   * Carga el historial de logs del proyecto.
   */
  const cargarHistorial = async () => {
    if (mostrarHistorial && logs.length > 0) {
      // Si ya está cargado y visible, solo ocultar
      setMostrarHistorial(false);
      return;
    }

    try {
      setCargandoLogs(true);
      const logsData = await getLogsPorProyecto(id);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setMostrarHistorial(true);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar el historial de acciones');
    } finally {
      setCargandoLogs(false);
    }
  };

  /**
   * Formatea la fecha para mostrar.
   */
  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Obtiene el badge de color para una acción.
   */
  const getAccionBadgeClass = (accion) => {
    const clases = {
      'creacion': 'bg-success',
      'modificacion': 'bg-info',
      'aprobacion': 'bg-primary',
      'rechazo': 'bg-danger',
      'eliminacion': 'bg-dark',
    };
    return clases[accion] || 'bg-secondary';
  };

  /**
   * Formatea el tamaño del archivo en formato legible.
   */
  const formatearTamanio = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  if (!proyecto) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Proyecto no encontrado.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>{proyecto.nombre_proyecto}</h1>
          <p className="text-muted">Estado: {proyecto.estado_display || proyecto.estado_proyecto}</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Volver al Dashboard
          </button>
          {/* Botón para gestionar equipo */}
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(`/proyecto/${id}/equipo`)}
          >
            Gestionar Equipo
          </button>
          {/* Botón para pre-rendición (solo si el proyecto no está cerrado) */}
          {proyecto.estado_proyecto !== 'completado' && proyecto.estado_proyecto !== 'cerrado' && (
            <button 
              className="btn btn-primary" 
              onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
            >
              Pre-Rendición
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-bg-primary">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Presupuesto Total</h6>
              <h3 className="card-title">
                ${parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-success">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Monto Ejecutado</h6>
              <h3 className="card-title">
                ${parseFloat(proyecto.monto_ejecutado_proyecto || 0).toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-info">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Monto Disponible</h6>
              <h3 className="card-title">
                ${parseFloat((proyecto.presupuesto_total || 0) - (proyecto.monto_ejecutado_proyecto || 0)).toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-warning">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">% Ejecutado</h6>
              <h3 className="card-title">
                {metricas?.metricas_presupuesto?.porcentaje_ejecutado?.toFixed(1) || '0.0'}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Ítems presupuestarios con barras de progreso */}
      {metricas?.gastos_por_item && metricas.gastos_por_item.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>Ítems Presupuestarios</h5>
          </div>
          <div className="card-body">
            {metricas.gastos_por_item.map((item, index) => (
              <div key={index} className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>{item.nombre || item.item_id}</span>
                  <span>
                    ${parseFloat(item.monto_ejecutado || 0).toLocaleString('es-CL')} / 
                    ${parseFloat(item.monto_asignado || 0).toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="progress" style={{ height: '25px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${item.porcentaje_ejecutado || 0}%`,
                      backgroundColor: (item.porcentaje_ejecutado || 0) > 100 ? '#dc3545' : '#0d6efd'
                    }}
                    aria-valuenow={item.porcentaje_ejecutado || 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {(item.porcentaje_ejecutado || 0).toFixed(1)}%
                  </div>
                </div>
                <small className="text-muted">
                  Saldo disponible: ${parseFloat(item.saldo_disponible || 0).toLocaleString('es-CL')}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de transacciones */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Transacciones</h5>
          <span className="badge bg-secondary">{transacciones.length} transacciones</span>
        </div>
        <div className="card-body">
          {transacciones.length === 0 ? (
            <p className="text-muted">No hay transacciones registradas para este proyecto.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Monto</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Documento</th>
                    <th>Evidencias</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transacciones.map((transaccion) => {
                    const evidenciasTrans = transaccionesConEvidencias[transaccion.id] || [];
                    const mostrar = mostrarEvidencias[transaccion.id] || false;
                    
                    return (
                      <React.Fragment key={transaccion.id}>
                        <tr>
                          <td>{transaccion.fecha_registro}</td>
                          <td>{transaccion.proveedor_nombre || 'N/A'}</td>
                          <td>${parseFloat(transaccion.monto_transaccion || 0).toLocaleString('es-CL')}</td>
                          <td>
                            <span className={`badge ${transaccion.tipo_transaccion === 'egreso' ? 'bg-danger' : 'bg-success'}`}>
                              {transaccion.tipo_display || transaccion.tipo_transaccion}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              transaccion.estado_transaccion === 'aprobado' ? 'bg-success' :
                              transaccion.estado_transaccion === 'rechazado' ? 'bg-danger' :
                              'bg-warning'
                            }`}>
                              {transaccion.estado_display || transaccion.estado_transaccion}
                            </span>
                          </td>
                          <td>{transaccion.nro_documento}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => toggleEvidencias(transaccion.id)}
                            >
                              {transaccion.cantidad_evidencias !== undefined 
                                ? transaccion.cantidad_evidencias 
                                : evidenciasTrans.length} archivo(s)
                            </button>
                          </td>
                          <td>
                            {transaccion.estado_transaccion === 'pendiente' ? (
                              // Mostrar botones si puede_aprobar es true, o si no está definido (mostrar siempre para pendientes)
                              (transaccion.puede_aprobar !== false) ? (
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleAprobar(transaccion.id)}
                                  >
                                    Aprobar
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleRechazar(transaccion.id)}
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted small">Sin permisos</span>
                              )
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                        {mostrar && evidenciasTrans.length > 0 && (
                          <tr>
                            <td colSpan="8">
                              <div className="card bg-light">
                                <div className="card-body">
                                  <h6>Evidencias:</h6>
                                  <ul className="list-unstyled">
                                    {evidenciasTrans.map((evidencia) => (
                                      <li key={evidencia.id} className="mb-2">
                                        <a
                                          href={evidencia.archivo_url || evidencia.evidencia?.archivo_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-decoration-none"
                                        >
                                          📄 {evidencia.evidencia?.nombre_evidencia || evidencia.nombre_evidencia}
                                        </a>
                                        <span className="text-muted ms-2">
                                          ({formatearTamanio(evidencia.evidencia?.tamanio_archivo || evidencia.tamanio_archivo)})
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Historial de Acciones */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Historial de Acciones (Auditoría)</h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={cargarHistorial}
                disabled={cargandoLogs}
              >
                {cargandoLogs ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Cargando...
                  </>
                ) : mostrarHistorial ? (
                  'Ocultar Historial'
                ) : (
                  'Ver Historial'
                )}
              </button>
            </div>
            {mostrarHistorial && (
              <div className="card-body">
                {logs.length === 0 ? (
                  <p className="text-muted text-center mb-0">No hay registros de acciones para este proyecto.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover">
                      <thead>
                        <tr>
                          <th>Fecha y Hora</th>
                          <th>Usuario</th>
                          <th>Acción</th>
                          <th>Transacción</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <small>{formatearFecha(log.fecha_hora_accion)}</small>
                            </td>
                            <td>
                              {log.usuario_nombre_completo || log.usuario_nombre}
                              <br />
                              <small className="text-muted">@{log.usuario_nombre}</small>
                            </td>
                            <td>
                              <span className={`badge ${getAccionBadgeClass(log.accion_realizada)} text-white`}>
                                {log.accion_display || log.accion_realizada}
                              </span>
                            </td>
                            <td>
                              <small>
                                Doc: {log.transaccion_nro_documento || 'N/A'}
                                <br />
                                {log.proyecto_nombre && (
                                  <span className="text-muted">{log.proyecto_nombre}</span>
                                )}
                              </small>
                            </td>
                            <td>
                              {log.transaccion_monto ? (
                                <strong>${parseFloat(log.transaccion_monto).toLocaleString('es-CL')}</strong>
                              ) : (
                                <span className="text-muted">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
