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
import { getTransactionEvidence } from '../services/evidenceService';
import { getLogsPorProyecto, getLogs } from '../services/logService';
import { getUsuarios } from '../services/userService';
import { useUserRoles } from '../hooks/useUserRoles';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para mostrar los detalles de un proyecto.
 */
const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canCreateTransaction, isAdminProyecto, isDirectivo, hasAnyRole, loading: loadingRoles } = useUserRoles(id);
  
  // Verificar si el usuario puede editar el proyecto (Admin o Directivo)
  const canEditProject = isAdminProyecto() || isDirectivo();

  const [proyecto, setProyecto] = useState(null);
  const [transacciones, setTransacciones] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(5); // Cambiado a 5 por defecto
  const [totalTransacciones, setTotalTransacciones] = useState(0);
  const [cargandoTransacciones, setCargandoTransacciones] = useState(false);
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transaccionesConEvidencias, setTransaccionesConEvidencias] = useState({});
  const [mostrarEvidencias, setMostrarEvidencias] = useState({});
  const [cargandoEvidencias, setCargandoEvidencias] = useState({});
  const [logs, setLogs] = useState([]);
  const [paginaLogs, setPaginaLogs] = useState(1);
  const [pageSizeLogs, setPageSizeLogs] = useState(5);
  const [totalLogs, setTotalLogs] = useState(0);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoLogs, setCargandoLogs] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [filtrosHistorial, setFiltrosHistorial] = useState({
    usuario: '',
    accion_realizada: '',
    ordenFecha: 'desc', // 'asc' o 'desc'
  });

  useEffect(() => {
    cargarDatos(1, pageSize);
    // eslint-disable-next-line
  }, [id]);

  /**
   * Carga las transacciones paginadas para el proyecto.
   */
  const cargarTransacciones = async (page = pagina, size = pageSize) => {
    try {
      setCargandoTransacciones(true);
      const data = await getTransactions({
        proyecto: id,
        page,
        page_size: size,
      });

      // El backend devuelve datos paginados con estructura {count, next, previous, results}
      // Si viene como array, es porque no hay paginación (caso especial)
      const transaccionesList = Array.isArray(data)
        ? data
        : (data.results || []);

      // Validar que solo tenemos los resultados de la página actual
      if (transaccionesList.length > size) {
        console.warn(`Advertencia: Se recibieron ${transaccionesList.length} transacciones cuando se esperaban máximo ${size}`);
        // Limitar a los resultados de la página actual
        const inicio = (page - 1) * size;
        const fin = inicio + size;
        transaccionesList.splice(fin);
      }

      // Obtener el total del count si está disponible, sino usar la longitud de la lista
      const total = (!Array.isArray(data) && typeof data.count === 'number')
        ? data.count
        : (Array.isArray(data) ? data.length : transaccionesList.length);

      const totalPages = Math.max(1, Math.ceil((total || 0) / size));
      if (page > totalPages && totalPages > 0) {
        // Ajustar la página si quedó fuera de rango luego de eliminar/filtrar
        return cargarTransacciones(totalPages, size);
      }

      // Solo establecer las transacciones de la página actual
      setTransacciones(transaccionesList);
      setTotalTransacciones(total);
      setPagina(page);
      setPageSize(size);
    } catch (error) {
      toast.error('Error al cargar las transacciones');
      console.error('Error:', error);
    } finally {
      setCargandoTransacciones(false);
    }
  };

  /**
   * Carga todos los datos del proyecto.
   */
  const cargarDatos = async (page = pagina, size = pageSize) => {
    try {
      setLoading(true);
      const [proyectoData, metricasData] = await Promise.all([
        getProject(id),
        getProjectMetrics(id),
      ]);

      setProyecto(proyectoData);
      setMetricas(metricasData);
      await cargarTransacciones(page, size);
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
      cargarDatos(pagina, pageSize); // Recargar datos manteniendo la página
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
      cargarDatos(pagina, pageSize); // Recargar datos manteniendo la página
    } catch (error) {
      toast.error(error.message || 'Error al rechazar la transacción');
      console.error('Error:', error);
    }
  };

  /**
   * Maneja la edición de una transacción.
   */
  const handleEditar = (transaccionId) => {
    navigate(`/registrar-gasto?editar=${transaccionId}&proyecto=${id}`);
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
      cargarDatos(pagina, pageSize); // Recargar datos manteniendo la página
    } catch (error) {
      toast.error(error.message || 'Error al eliminar la transacción');
      console.error('Error:', error);
    }
  };

  /**
   * Cambia la página actual de transacciones.
   */
  const handlePageChange = (nuevaPagina) => {
    if (nuevaPagina < 1) return;
    const totalPaginas = Math.max(1, Math.ceil((totalTransacciones || 0) / pageSize));
    if (nuevaPagina > totalPaginas) return;
    cargarTransacciones(nuevaPagina, pageSize);
  };

  /**
   * Cambia la cantidad de transacciones por página.
   */
  const handlePageSizeChange = (nuevoSize) => {
    const size = Number(nuevoSize) || 10;
    cargarTransacciones(1, size);
  };

  /**
   * Carga las evidencias de una transacción específica (lazy load).
   */
  const fetchEvidenciasTransaccion = async (transaccionId) => {
    // Evitar llamadas duplicadas si ya se están cargando
    if (cargandoEvidencias[transaccionId]) {
      return;
    }

    // Si ya se cargaron, no volver a cargar
    if (transaccionesConEvidencias[transaccionId]) {
      return;
    }

    setCargandoEvidencias(prev => ({ ...prev, [transaccionId]: true }));

    try {
      const evidenciasTrans = await getTransactionEvidence(transaccionId);
      const evidenciasList = Array.isArray(evidenciasTrans)
        ? evidenciasTrans
        : (evidenciasTrans.results || []);

      setTransaccionesConEvidencias(prev => ({
        ...prev,
        [transaccionId]: evidenciasList
      }));
    } catch (error) {
      console.error(`Error al cargar evidencias de transacción ${transaccionId}:`, error);
      toast.error('No se pudieron cargar las evidencias de esta transacción');
      setTransaccionesConEvidencias(prev => ({
        ...prev,
        [transaccionId]: []
      }));
    } finally {
      setCargandoEvidencias(prev => ({ ...prev, [transaccionId]: false }));
    }
  };

  /**
   * Alterna la visualización de evidencias para una transacción.
   * Solo carga las evidencias cuando se expande (lazy load).
   */
  const toggleEvidencias = async (transaccionId) => {
    const siguienteEstado = !mostrarEvidencias[transaccionId];

    setMostrarEvidencias(prev => ({
      ...prev,
      [transaccionId]: siguienteEstado
    }));

    // Solo cargar evidencias si se está expandiendo Y no se han cargado antes
    if (siguienteEstado && !transaccionesConEvidencias[transaccionId]) {
      await fetchEvidenciasTransaccion(transaccionId);
    }
  };

  /**
   * Carga el historial de logs del proyecto con paginación.
   */
  const cargarHistorial = async (page = paginaLogs, size = pageSizeLogs, resetear = false) => {
    if (resetear && mostrarHistorial) {
      // Si se está reseteando y ya está visible, solo ocultar
      setMostrarHistorial(false);
      return;
    }

    try {
      setCargandoLogs(true);

      // Cargar usuarios solo la primera vez
      if (usuarios.length === 0) {
        const usuariosData = await getUsuarios();
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      }

      const logsData = await getLogsPorProyecto(id, page, size, filtrosHistorial);

      // El backend devuelve datos paginados con estructura {count, next, previous, results}
      const logsList = Array.isArray(logsData)
        ? logsData
        : (logsData.results || []);

      // Obtener el total del count si está disponible
      const total = (!Array.isArray(logsData) && typeof logsData.count === 'number')
        ? logsData.count
        : (Array.isArray(logsData) ? logsData.length : logsList.length);

      // Solo establecer los logs de la página actual
      setLogs(logsList);
      setTotalLogs(total);
      setPaginaLogs(page);
      setPageSizeLogs(size);
      setMostrarHistorial(true);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar el historial de acciones');
    } finally {
      setCargandoLogs(false);
    }
  };

  /**
   * Maneja el cambio de página en el historial.
   */
  const handlePageChangeLogs = (nuevaPagina) => {
    if (nuevaPagina < 1) return;
    cargarHistorial(nuevaPagina, pageSizeLogs);
  };

  /**
   * Cambia la cantidad de logs por página.
   */
  const handlePageSizeChangeLogs = (nuevoSize) => {
    const size = Number(nuevoSize) || 5;
    cargarHistorial(1, size);
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
    // Recargar desde el backend con los nuevos filtros, volviendo a la página 1
    if (mostrarHistorial) {
      cargarHistorial(1, pageSizeLogs);
    }
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
    // Recargar desde el backend sin filtros, volviendo a la página 1
    if (mostrarHistorial) {
      cargarHistorial(1, pageSizeLogs);
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

  const totalPaginas = Math.max(1, Math.ceil((totalTransacciones || 0) / pageSize));
  const indiceInicio = transacciones.length > 0 ? ((pagina - 1) * pageSize) + 1 : 0;
  const indiceFin = transacciones.length > 0 ? ((pagina - 1) * pageSize) + transacciones.length : 0;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Page Header estilo template */}
      <div className="container">
        <div className="d-flex justify-content-between align-items-center flex-nowrap mb-2">
          <div className="flex-grow-1" style={{ minWidth: '15rem', marginRight: '1rem' }}>
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
            {canEditProject && !loadingRoles && (
              <button
                className="btn btn-gradient-primary"
                onClick={() => navigate(`/proyecto/${id}/editar`)}
                title="Editar proyecto"
                name='editar-proyecto'
              >
                <i className="mdi mdi-pencil me-2"></i>
                Editar
              </button>
            )}
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
                  ? metricas.metricas_presupuesto.porcentaje_ejecutado.toFixed(2)
                  : '0.00'}%
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
                          {(item.porcentaje_ejecutado || 0).toFixed(2)}%
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
                  <span className="badge badge-gradient-primary">
                    {totalTransacciones} transacciones
                  </span>
                  {canCreateTransaction && !loadingRoles && (
                    <button
                      className="btn btn-gradient-success"
                      onClick={() => navigate(`/registrar-gasto?proyecto=${id}`)}
                      title="Registrar nuevo gasto"
                    >
                      <i className="mdi mdi-plus-circle me-2"></i>
                      Nuevo Gasto
                    </button>
                  )}
                </div>
              </div>
              {transacciones.length === 0 ? (
                <div className="text-center py-5">
                  <i className="mdi mdi-inbox fs-1 text-muted mb-3 d-block"></i>
                  <p className="text-muted mb-0">No hay transacciones registradas para este proyecto.</p>
                  {canCreateTransaction && !loadingRoles ? (
                    <Link to={`/registrar-gasto?proyecto=${id}`} className="btn btn-gradient-primary mt-3">
                      <i className="mdi mdi-plus-circle me-2"></i>
                      Registrar Primera Transacción
                    </Link>
                  ) : (
                    <p className="text-muted mt-3">
                      <i className="mdi mdi-information-outline me-2"></i>
                      Solo los Ejecutores y Administradores de Proyecto pueden registrar gastos.
                    </p>
                  )}
                </div>
              ) : (
                <>
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
                                        )}
                                        {/* Si no tiene ningún permiso */}
                                        {!transaccion.puede_aprobar && !transaccion.puede_editar_eliminar && (
                                          <span className="text-muted small">Sin permisos</span>
                                        )}
                                      </>
                                    ) : (
                                      // Para transacciones aprobadas o rechazadas, mostrar editar/eliminar si es admin
                                      // Al editar una transacción aprobada/rechazada, volverá a estado pendiente
                                      transaccion.puede_editar_eliminar ? (
                                        <>
                                          <button
                                            className="btn btn-sm btn-gradient-warning"
                                            onClick={() => handleEditar(transaccion.id)}
                                            title={transaccion.estado_transaccion !== 'pendiente' 
                                              ? 'Editar transacción (volverá a estado pendiente)' 
                                              : 'Editar transacción'}
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
                              {mostrar && (
                                <tr>
                                  <td colSpan="8">
                                    <div className="card bg-light border-0 shadow-sm my-2">
                                      <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                          <h6 className="mb-0">
                                            <i className="bi bi-paperclip me-2 text-primary"></i>
                                            Evidencias
                                          </h6>
                                          {typeof transaccion.cantidad_evidencias === 'number' && (
                                            <span className="badge bg-secondary">
                                              {transaccion.cantidad_evidencias} registradas
                                            </span>
                                          )}
                                        </div>

                                        {cargandoEvidencias[transaccion.id] ? (
                                          <div className="d-flex align-items-center">
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            <small>Cargando evidencias...</small>
                                          </div>
                                        ) : evidenciasTrans.length > 0 ? (
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
                                        ) : (
                                          <p className="text-muted mb-0">
                                            No hay evidencias registradas para esta transacción.
                                          </p>
                                        )}
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

                  <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-3">
                    <div className="d-flex align-items-center gap-2">
                      {cargandoTransacciones && (
                        <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                      )}
                      <small className="text-muted">
                        Mostrando {indiceInicio || 0}-{indiceFin || 0} de {totalTransacciones} transacciones
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <select
                        className="form-select form-select-sm w-auto"
                        value={pageSize}
                        onChange={e => handlePageSizeChange(e.target.value)}
                        disabled={cargandoTransacciones}
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handlePageChange(pagina - 1)}
                          disabled={pagina === 1 || cargandoTransacciones}
                        >
                          Anterior
                        </button>
                        <span className="btn btn-sm btn-outline-secondary disabled">
                          Página {pagina} de {totalPaginas}
                        </span>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handlePageChange(pagina + 1)}
                          disabled={pagina >= totalPaginas || cargandoTransacciones}
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </div>
                </>
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
                  onClick={() => cargarHistorial(1, pageSizeLogs, true)}
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

                  {logs.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                      <p className="text-muted mb-0">
                        No hay registros de acciones para este proyecto.
                      </p>
                    </div>
                  ) : (
                    <>
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

                      {/* Paginación de logs */}
                      {(() => {
                        const totalPaginasLogs = Math.max(1, Math.ceil((totalLogs || 0) / pageSizeLogs));
                        const indiceInicioLogs = totalLogs > 0 ? ((paginaLogs - 1) * pageSizeLogs) + 1 : 0;
                        const indiceFinLogs = Math.min(paginaLogs * pageSizeLogs, totalLogs);

                        return (
                          <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-3">
                            <div className="d-flex align-items-center gap-2">
                              {cargandoLogs && (
                                <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                              )}
                              <small className="text-muted">
                                Mostrando {indiceInicioLogs}-{indiceFinLogs} de {totalLogs} registro(s)
                                {(filtrosHistorial.usuario || filtrosHistorial.accion_realizada) && (
                                  <span className="ms-2">
                                    <span className="badge bg-info">Filtros activos</span>
                                  </span>
                                )}
                              </small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <select
                                className="form-select form-select-sm w-auto"
                                value={pageSizeLogs}
                                onChange={e => handlePageSizeChangeLogs(e.target.value)}
                                disabled={cargandoLogs}
                              >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                              </select>
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handlePageChangeLogs(paginaLogs - 1)}
                                  disabled={paginaLogs === 1 || cargandoLogs}
                                >
                                  Anterior
                                </button>
                                <span className="btn btn-sm btn-outline-secondary disabled">
                                  Página {paginaLogs} de {totalPaginasLogs}
                                </span>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handlePageChangeLogs(paginaLogs + 1)}
                                  disabled={paginaLogs >= totalPaginasLogs || cargandoLogs}
                                >
                                  Siguiente
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
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
