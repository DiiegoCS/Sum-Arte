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
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject, getProjectMetrics, descargarReporteRendicionOficial } from '../services/projectService';
import { getTransactions, approveTransaction, rejectTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { getProjectEvidence, getTransactionEvidence } from '../services/evidenceService';
import { getLogsPorProyecto, getLogs } from '../services/logService';
import { getUsuarios } from '../services/userService';
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
  const [logsOriginales, setLogsOriginales] = useState([]); // Logs sin filtrar
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoLogs, setCargandoLogs] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [filtrosHistorial, setFiltrosHistorial] = useState({
    usuario: '',
    accion_realizada: '',
    ordenFecha: 'desc', // 'asc' o 'desc'
  });

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line
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
   * Maneja la edición de una transacción.
   */
  const handleEditar = (transaccionId) => {
    navigate(`/registrar-gasto/${transaccionId}`);
  };

  /**
   * Maneja la eliminación de una transacción.
   */
  const handleEliminar = async (transaccionId) => {
    const confirmacion = window.confirm(
      '¿Está seguro de que desea eliminar esta transacción? ' +
      'Si la transacción está aprobada, se revertirán los montos ejecutados del presupuesto.'
    );

    if (!confirmacion) {
      return; // Usuario canceló
    }

    try {
      await deleteTransaction(transaccionId);
      toast.success('Transacción eliminada exitosamente');
      cargarDatos(); // Recargar datos
    } catch (error) {
      toast.error(error.message || 'Error al eliminar la transacción');
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
    if (mostrarHistorial && logsOriginales.length > 0) {
      // Si ya está cargado y visible, solo ocultar
      setMostrarHistorial(false);
      return;
    }

    try {
      setCargandoLogs(true);

      const [logsData, usuariosData] = await Promise.all([
        getLogsPorProyecto(id),
        getUsuarios()
      ]);

      const logsList = Array.isArray(logsData) ? logsData : [];
      setLogsOriginales(logsList);
      aplicarFiltros(logsList, filtrosHistorial);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setMostrarHistorial(true);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar el historial de acciones');
    } finally {
      setCargandoLogs(false);
    }
  };

  /**
   * Aplica los filtros a los logs y actualiza el estado.
   */
  const aplicarFiltros = (logsAFiltrar, filtros) => {
    let logsFiltrados = [...logsAFiltrar];

    if (filtros.usuario) {
      logsFiltrados = logsFiltrados.filter(log =>
        log.usuario === parseInt(filtros.usuario)
      );
    }

    if (filtros.accion_realizada) {
      logsFiltrados = logsFiltrados.filter(log =>
        log.accion_realizada === filtros.accion_realizada
      );
    }

    logsFiltrados.sort((a, b) => {
      const fechaA = new Date(a.fecha_hora_accion);
      const fechaB = new Date(b.fecha_hora_accion);

      if (filtros.ordenFecha === 'asc') {
        return fechaA - fechaB;
      } else {
        return fechaB - fechaA;
      }
    });

    setLogs(logsFiltrados);
  };

  /**
   * Maneja el cambio de filtros.
   */
  const handleFiltroChange = (nombre, valor) => {
    const nuevosFiltros = {
      ...filtrosHistorial,
      [nombre]: valor
    };
    setFiltrosHistorial(nuevosFiltros);
    aplicarFiltros(logsOriginales, nuevosFiltros);
  };

  /**
   * Limpia todos los filtros.
   */
  const limpiarFiltros = () => {
    const filtrosLimpios = {
      usuario: '',
      accion_realizada: '',
      ordenFecha: 'desc'
    };
    setFiltrosHistorial(filtrosLimpios);
    aplicarFiltros(logsOriginales, filtrosLimpios);
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
   * Obtiene el badge de color para una acción (usando estilos del template).
   */
  const getAccionBadgeClass = (accion) => {
    const clases = {
      'creacion': 'badge-gradient-success',
      'modificacion': 'badge-gradient-info',
      'aprobacion': 'badge-gradient-primary',
      'rechazo': 'badge-gradient-danger',
      'eliminacion': 'badge-gradient-dark',
    };
    return clases[accion] || 'badge-gradient-secondary';
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
      <div className="container-fluid mt-4 px-4">
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
      <div className="container-fluid mt-4 px-4">
        <div className="alert alert-warning">Proyecto no encontrado.</div>
      </div>
    );
  }

  // Función para obtener el badge del estado (usando estilos del template)
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
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Page Header estilo template */}
      <div className="container">
        <div className="d-flex justify-content-between align-items-center flex-nowrap mb-2">
          <div className="flex-grow-1" style={{ minWidth: '10rem', marginRight: '1rem' }}>
            <h3 className="page-title mb-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span className="page-title-icon bg-gradient-primary text-white me-2">
                <i className="mdi mdi-folder"></i>
              </span>
              {proyecto.nombre_proyecto}
            </h3>
            <nav aria-label="breadcrumb" className="mt-2">
              <ul className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  <span className={`badge ms-2 ${getEstadoBadgeClass(proyecto.estado_proyecto)}`}></span>
                  {proyecto.estado_display || proyecto.estado_proyecto}
                </li>
              </ul>
            </nav>
          </div>
          <div className="d-flex flex-wrap gap-3 flex-shrink-0">
            <button
              className="btn btn-gradient-primary"
              onClick={() => navigate(`/proyecto/${id}/editar`)}
              title="Editar proyecto"
            >
              <i className="mdi mdi-pencil me-2"></i>
              Editar
            </button>
            <button
              className="btn btn-gradient-info"
              onClick={() => navigate(`/proyecto/${id}/equipo`)}
            >
              <i className="mdi mdi-account-group me-2"></i>
              Equipo
            </button>
            {proyecto.estado_proyecto !== 'completado' && proyecto.estado_proyecto !== 'cerrado' && (
              <button
                className="btn btn-gradient-warning"
                onClick={() => navigate(`/proyecto/${id}/pre-rendicion`)}
              >
                <i className="mdi mdi-file-check me-2"></i>
                Pre-Rendición
              </button>
            )}
            {(proyecto.estado_proyecto === 'completado' || proyecto.estado_proyecto === 'cerrado') && (
              <button
                className="btn btn-gradient-success"
                onClick={async () => {
                  try {
                    await descargarReporteRendicionOficial(id);
                    toast.success('Informe oficial descargado exitosamente');
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Error al descargar el informe oficial');
                    console.error('Error:', error);
                  }
                }}
                title="Descargar informe oficial de rendición"
              >
                <i className="mdi mdi-file-pdf-box me-2"></i>
                Informe Final
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas estilo template con gradientes */}
      <div className="row">
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-primary card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Presupuesto Total
                <i className="mdi mdi-wallet mdi-24px float-end"></i>
              </h4>
              <h4 className="mb-5">
                ${parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-CL')}
              </h4>
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
              <h4 className="mb-5">
                ${parseFloat(proyecto.monto_ejecutado_proyecto || 0).toLocaleString('es-CL')}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-info card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                Monto Disponible
                <i className="mdi mdi-piggy-bank mdi-24px float-end"></i>
              </h4>
              <h4 className="mb-5">
                ${parseFloat((proyecto.presupuesto_total || 0) - (proyecto.monto_ejecutado_proyecto || 0)).toLocaleString('es-CL')}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-md-3 stretch-card grid-margin">
          <div className="card bg-gradient-warning card-img-holder text-white">
            <div className="card-body">
              <img src="/src/assets/images/dashboard/circle.svg" className="card-img-absolute" alt="circle-image" style={{ right: '0', top: '0', opacity: '0.1' }} />
              <h4 className="font-weight-normal mb-3">
                % Ejecutado
                <i className="mdi mdi-chart-line mdi-24px float-end"></i>
              </h4>
              <h4 className="mb-5">
                {metricas?.metricas_presupuesto?.porcentaje_ejecutado !== undefined
                  ? metricas.metricas_presupuesto.porcentaje_ejecutado.toFixed(1)
                  : '0.0'}%
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Ítems presupuestarios */}
      {(metricas?.gastos_por_item && metricas.gastos_por_item.length > 0) && (
        <div className="row">
          <div className="col-12 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">
                  <i className="mdi mdi-format-list-bulleted me-2"></i>
                  Ítems Presupuestarios
                </h4>
                {metricas.gastos_por_item.map((item, index) => (
                  <div key={index} className="mb-4 pb-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">
                        <i className="bi bi-tag me-2 text-muted"></i>
                        {item.nombre || item.item_id}
                      </h6>
                      <div className="text-end">
                        <strong className="text-success">
                          ${parseFloat(item.monto_ejecutado || 0).toLocaleString('es-CL')}
                        </strong>
                        <span className="text-muted"> / </span>
                        <strong>
                          ${parseFloat(item.monto_asignado || 0).toLocaleString('es-CL')}
                        </strong>
                      </div>
                    </div>
                    <div className="progress mb-2" style={{ height: '28px' }}>
                      <div
                        className={`progress-bar ${
                          (item.porcentaje_ejecutado || 0) > 100
                            ? 'bg-gradient-danger'
                            : (item.porcentaje_ejecutado || 0) > 80
                            ? 'bg-gradient-warning'
                            : 'bg-gradient-success'
                        }`}
                        role="progressbar"
                        style={{
                          width: `${Math.min(item.porcentaje_ejecutado || 0, 100)}%`,
                        }}
                        aria-valuenow={item.porcentaje_ejecutado || 0}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <span className="px-2">
                          {(item.porcentaje_ejecutado || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="bi bi-wallet me-1"></i>
                        Saldo disponible:{" "}
                        <strong>
                          ${parseFloat(item.saldo_disponible || 0).toLocaleString('es-CL')}
                        </strong>
                      </small>
                      {(item.porcentaje_ejecutado || 0) > 100 && (
                        <span className="badge badge-gradient-danger">
                          <i className="mdi mdi-alert me-1"></i>
                          Sobregirado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de transacciones */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="card-title mb-0">
                  <i className="mdi mdi-receipt me-2"></i>
                  Transacciones
                </h4>
                <div className="d-flex align-items-center gap-5">
                  <span className="badge badge-gradient-primary">{transacciones.length} transacciones</span>
                  <button
                    className="btn btn-gradient-success"
                    onClick={() => navigate(`/registrar-gasto?proyecto=${id}`)}
                    title="Registrar nuevo gasto"
                  >
                    <i className="mdi mdi-plus-circle me-2"></i>
                    Nuevo Gasto
                  </button>
                </div>
              </div>
              {transacciones.length === 0 ? (
                <div className="text-center py-5">
                  <i className="mdi mdi-inbox fs-1 text-muted mb-3 d-block"></i>
                  <p className="text-muted mb-0">No hay transacciones registradas para este proyecto.</p>
                  <Link to="/registrar-gasto" className="btn btn-gradient-primary mt-3">
                    <i className="mdi mdi-plus-circle me-2"></i>
                    Registrar Primera Transacción
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th><i className="bi bi-calendar3 me-1"></i> Fecha</th>
                        <th><i className="bi bi-building me-1"></i> Proveedor</th>
                        <th><i className="bi bi-cash-coin me-1"></i> Monto</th>
                        <th><i className="bi bi-arrow-left-right me-1"></i> Tipo</th>
                        <th><i className="bi bi-info-circle me-1"></i> Estado</th>
                        <th><i className="bi bi-file-text me-1"></i> Documento</th>
                        <th><i className="bi bi-paperclip me-1"></i> Evidencias</th>
                        <th><i className="bi bi-gear me-1"></i> Acciones</th>
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
                                <span className={`badge ${transaccion.tipo_transaccion === 'egreso' ? 'badge-gradient-danger' : 'badge-gradient-success'}`}>
                                  {transaccion.tipo_display || transaccion.tipo_transaccion}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  transaccion.estado_transaccion === 'aprobado' ? 'badge-gradient-success' :
                                  transaccion.estado_transaccion === 'rechazado' ? 'badge-gradient-danger' :
                                  'badge-gradient-warning'
                                }`}>
                                  {transaccion.estado_display || transaccion.estado_transaccion}
                                </span>
                              </td>
                              <td>{transaccion.nro_documento}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => toggleEvidencias(transaccion.id)}
                                  title="Ver evidencias"
                                >
                                  <i className="bi bi-paperclip me-1"></i>
                                  {transaccion.cantidad_evidencias !== undefined
                                    ? transaccion.cantidad_evidencias
                                    : evidenciasTrans.length}
                                </button>
                              </td>
                              <td>
                                <div className="btn-group" role="group">
                                  {transaccion.estado_transaccion === 'pendiente' ? (
                                    <>
                                      {/* Botones de aprobar/rechazar - solo si puede_aprobar */}
                                      {transaccion.puede_aprobar && (
                                        <>
                                          <button
                                            className="btn btn-sm btn-gradient-success"
                                            onClick={() => handleAprobar(transaccion.id)}
                                            title="Aprobar transacción"
                                          >
                                            <i className="mdi mdi-check-circle me-1"></i>
                                            Aprobar
                                          </button>
                                          <button
                                            className="btn btn-sm btn-gradient-danger"
                                            onClick={() => handleRechazar(transaccion.id)}
                                            title="Rechazar transacción"
                                          >
                                            <i className="mdi mdi-close-circle me-1"></i>
                                            Rechazar
                                          </button>
                                        </>
                                      )}
                                      {/* Botones de editar/eliminar - solo si puede_editar_eliminar */}
                                      {transaccion.puede_editar_eliminar && (
                                        <>
                                          <button
                                            className="btn btn-sm btn-gradient-warning"
                                            onClick={() => handleEditar(transaccion.id)}
                                            title="Editar transacción"
                                          >
                                            <i className="mdi mdi-pencil me-1"></i>
                                            Editar
                                          </button>
                                          <button
                                            className="btn btn-sm btn-gradient-danger"
                                            onClick={() => handleEliminar(transaccion.id)}
                                            title="Eliminar transacción"
                                          >
                                            <i className="mdi mdi-delete me-1"></i>
                                            Eliminar
                                          </button>
                                        </>
                                      )}
                                      {/* Si no tiene ningún permiso */}
                                      {!transaccion.puede_aprobar && !transaccion.puede_editar_eliminar && (
                                        <span className="text-muted small">Sin permisos</span>
                                      )}
                                    </>
                                  ) : (
                                    // Para transacciones aprobadas o rechazadas, solo mostrar editar/eliminar si es admin
                                    transaccion.puede_editar_eliminar ? (
                                      <>
                                        <button
                                          className="btn btn-sm btn-gradient-warning"
                                          onClick={() => handleEditar(transaccion.id)}
                                          disabled={!transaccion.puede_editar}
                                          title={!transaccion.puede_editar ? 'Solo se pueden editar transacciones pendientes' : 'Editar transacción'}
                                        >
                                          <i className="mdi mdi-pencil me-1"></i>
                                          Editar
                                        </button>
                                        <button
                                          className="btn btn-sm btn-gradient-danger"
                                          onClick={() => handleEliminar(transaccion.id)}
                                          title="Eliminar transacción"
                                        >
                                          <i className="mdi mdi-delete me-1"></i>
                                          Eliminar
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                            {mostrar && evidenciasTrans.length > 0 && (
                              <tr>
                                <td colSpan="8">
                                  <div className="card bg-light border-0 shadow-sm my-2">
                                    <div className="card-body">
                                      <h6 className="mb-3">
                                        <i className="bi bi-paperclip me-2 text-primary"></i>
                                        Evidencias ({evidenciasTrans.length})
                                      </h6>
                                      <div className="row g-2">
                                        {evidenciasTrans.map((evidencia) => (
                                          <div key={evidencia.id} className="col-md-6">
                                            <div className="d-flex align-items-center p-2 bg-white rounded border">
                                              <i className="bi bi-file-earmark text-primary fs-5 me-2"></i>
                                              <div className="flex-grow-1">
                                                <a
                                                  href={evidencia.archivo_url || evidencia.evidencia?.archivo_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-decoration-none fw-medium"
                                                >
                                                  {evidencia.evidencia?.nombre_evidencia || evidencia.nombre_evidencia}
                                                </a>
                                                <br />
                                                <small className="text-muted">
                                                  {formatearTamanio(evidencia.evidencia?.tamanio_archivo || evidencia.tamanio_archivo)}
                                                </small>
                                              </div>
                                              <a
                                                href={evidencia.archivo_url || evidencia.evidencia?.archivo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-outline-primary ms-2"
                                                title="Abrir en nueva pestaña"
                                              >
                                                <i className="bi bi-box-arrow-up-right"></i>
                                              </a>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
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
        </div>
      </div>

      {/* Sección de Historial de Acciones */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="card-title mb-0">
                  <i className="mdi mdi-history me-2"></i>
                  Historial de Acciones (Auditoría)
                </h4>
                <button
                  className="btn btn-gradient-primary"
                  onClick={cargarHistorial}
                  disabled={cargandoLogs}
                >
                  {cargandoLogs ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Cargando...
                    </>
                  ) : mostrarHistorial ? (
                    <>
                      <i className="mdi mdi-eye-off me-2"></i>
                      Ocultar
                    </>
                  ) : (
                    <>
                      <i className="mdi mdi-eye me-2"></i>
                      Ver Historial
                    </>
                  )}
                </button>
              </div>
              {mostrarHistorial && (
                <div>
                  {/* Filtros */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label htmlFor="filtro-usuario" className="form-label form-label-sm">
                        <small>Filtrar por Usuario</small>
                      </label>
                      <select
                        id="filtro-usuario"
                        className="form-select form-select-sm"
                        value={filtrosHistorial.usuario}
                        onChange={e => handleFiltroChange('usuario', e.target.value)}
                      >
                        <option value="">Todos los usuarios</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.first_name || usuario.last_name
                              ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim()
                              : usuario.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="filtro-accion" className="form-label form-label-sm">
                        <small>Filtrar por Acción</small>
                      </label>
                      <select
                        id="filtro-accion"
                        className="form-select form-select-sm"
                        value={filtrosHistorial.accion_realizada}
                        onChange={e => handleFiltroChange('accion_realizada', e.target.value)}
                      >
                        <option value="">Todas las acciones</option>
                        <option value="creacion">Creación</option>
                        <option value="modificacion">Modificación</option>
                        <option value="aprobacion">Aprobación</option>
                        <option value="rechazo">Rechazo</option>
                        <option value="eliminacion">Eliminación</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="filtro-orden" className="form-label form-label-sm">
                        <small>Ordenar por Fecha</small>
                      </label>
                      <select
                        id="filtro-orden"
                        className="form-select form-select-sm"
                        value={filtrosHistorial.ordenFecha}
                        onChange={e => handleFiltroChange('ordenFecha', e.target.value)}
                      >
                        <option value="desc">Más recientes primero</option>
                        <option value="asc">Más antiguos primero</option>
                      </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      <button
                        className="btn btn-sm btn-outline-secondary w-100"
                        onClick={limpiarFiltros}
                        disabled={
                          !filtrosHistorial.usuario &&
                          !filtrosHistorial.accion_realizada &&
                          filtrosHistorial.ordenFecha === 'desc'
                        }
                      >
                        Limpiar Filtros
                      </button>
                    </div>
                  </div>

                  {/* Información de resultados */}
                  <div className="mb-2">
                    <small className="text-muted">
                      Mostrando {logs.length} de {logsOriginales.length} registro(s)
                      {(filtrosHistorial.usuario || filtrosHistorial.accion_realizada) && (
                        <span className="ms-2">
                          <span className="badge bg-info">
                            Filtros activos
                          </span>
                        </span>
                      )}
                    </small>
                  </div>

                  {logs.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                      <p className="text-muted mb-0">
                        {logsOriginales.length === 0
                          ? 'No hay registros de acciones para este proyecto.'
                          : 'No hay registros que coincidan con los filtros seleccionados.'}
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>
                              <i className="bi bi-calendar3 me-1"></i>
                              Fecha y Hora
                              {filtrosHistorial.ordenFecha === 'desc' ? ' ↓' : ' ↑'}
                            </th>
                            <th><i className="bi bi-person me-1"></i> Usuario</th>
                            <th><i className="bi bi-activity me-1"></i> Acción</th>
                            <th><i className="bi bi-receipt me-1"></i> Transacción</th>
                            <th><i className="bi bi-cash-coin me-1"></i> Monto</th>
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
                                <span className={`badge ${getAccionBadgeClass(log.accion_realizada)}`}>
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
                                  <strong>
                                    ${parseFloat(log.transaccion_monto).toLocaleString('es-CL')}
                                  </strong>
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
    </>
  );
};

export default ProjectDetails;
