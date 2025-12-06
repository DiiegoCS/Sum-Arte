/**
 * Página de dashboard para Sum-Arte.
 * 
 * Muestra el dashboard ejecutivo con métricas de ejecución presupuestaria,
 * egresos por ítem y resumenes de proyectos usando gráficos.
 * También permite la navegación a la página de registro de gastos.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardMetrics, getProjects } from '../services/projectService';
import { toast, ToastContainer } from 'react-toastify';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ProjectCard from '../components/ProjectCard';

/**
 * Componente Dashboard.
 */
const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verificar si el usuario debe ser redirigido a crear organización
  useEffect(() => {
    if (user) {
      const debeCrearOrganizacion = 
        !user.organizacion_id && // No tiene organización asignada
        user.usuario_principal === true && // Es usuario principal
        user.is_superuser === false; // No es superusuario

      if (debeCrearOrganizacion) {
        navigate('/crear-organizacion', { replace: true });
        return;
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    // Solo cargar datos si el usuario no será redirigido
    if (user) {
      const debeCrearOrganizacion = 
        !user.organizacion_id &&
        user.usuario_principal === true &&
        user.is_superuser === false;

      if (!debeCrearOrganizacion) {
        loadData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, proyectosData] = await Promise.all([
        getDashboardMetrics(),
        getProjects(),
      ]);
      
      // Asegurar que los datos sean arrays
      setMetrics(metricsData);
      setProyectos(Array.isArray(proyectosData) ? proyectosData : []);
    } catch (error) {
      toast.error('Error al cargar los datos del dashboard');
      console.error('Error:', error);
      // Establecer valores por defecto en caso de error
      setMetrics(null);
      setProyectos([]);
    } finally {
      setLoading(false);
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

  if (!metrics) {
    return (
      <div className="container-fluid mt-4 px-4">
        <div className="alert alert-warning">No hay datos disponibles.</div>
      </div>
    );
  }

  // Prepara los datos para los gráficos
  // Asegurar que gastos_por_item sea un array
  const gastosPorItem = Array.isArray(metrics.gastos_por_item) 
    ? metrics.gastos_por_item 
    : [];
  const gastosPorItemData = gastosPorItem.slice(0, 10).map(item => ({
    name: item.item && item.item.length > 20 ? item.item.substring(0, 20) + '...' : (item.item || 'Sin nombre'),
    monto: item.monto || 0,
  }));

  // Asegurar que proyectos sea un array
  const proyectosMetrics = Array.isArray(metrics.proyectos) 
    ? metrics.proyectos 
    : [];
  const proyectosData = proyectosMetrics.map(proyecto => ({
    name: proyecto.nombre && proyecto.nombre.length > 15 ? proyecto.nombre.substring(0, 15) + '...' : (proyecto.nombre || 'Sin nombre'),
    ejecutado: proyecto.porcentaje_ejecutado || 0,
  }));

  // Colores del template Purple Admin para gráficos
  const PURPLE_COLORS = ['#9a55ff', '#da8cff', '#7b2cbf', '#c77dff', '#e0aaff'];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Page Header estilo template */}
      <div className="page-header">
        <h3 className="page-title">
          <span className="page-title-icon bg-gradient-primary text-white me-2">
            <i className="mdi mdi-speedometer"></i>
          </span>
          Dashboard Ejecutivo
        </h3>
        <nav aria-label="breadcrumb">
          <ul className="breadcrumb">
            <li className="breadcrumb-item active" aria-current="page">
              <span></span>Resumen General
              <i className="mdi mdi-alert-circle-outline icon-sm text-primary align-middle ms-1"></i>
            </li>
          </ul>
        </nav>
      </div>

      {/* Tarjetas de resumen estilo template con gradientes */}
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
                ${(metrics.resumen_general?.presupuesto_total || 0).toLocaleString('es-CL')}
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
                ${(metrics.resumen_general?.monto_ejecutado || 0).toLocaleString('es-CL')}
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
                ${(metrics.resumen_general?.monto_disponible || 0).toLocaleString('es-CL')}
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
                {(metrics.resumen_general?.porcentaje_ejecutado || 0).toFixed(1)}%
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Fila de gráficos estilo template */}
      <div className="row">
        <div className="col-md-7 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="clearfix">
                <h4 className="card-title float-start">Gastos por Ítem (Top 10)</h4>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gastosPorItemData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `$${value.toLocaleString('es-CL')}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}
                  />
                  <Legend />
                  <Bar dataKey="monto" fill="#9a55ff" name="Monto" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-5 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Estado de Rendiciones</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'En Rendición', value: metrics.estado_rendiciones?.en_rendicion || 0 },
                      { name: 'Completados', value: metrics.estado_rendiciones?.completados || 0 },
                      { name: 'Activos', value: metrics.estado_rendiciones?.activos || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      if (percent < 0.05) return '';
                      return `${name}: ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PURPLE_COLORS[index % PURPLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de proyectos */}
      <div className="row">
        <div className="col-12 grid-margin">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="card-title mb-0">Proyectos</h4>
                <span className="badge badge-gradient-primary">
                  {Array.isArray(proyectos) ? proyectos.length : 0} proyecto{proyectos.length !== 1 ? 's' : ''}
                </span>
              </div>
              {Array.isArray(proyectos) && proyectos.length > 0 ? (
                <div className="d-flex flex-wrap justify-content-start">
                  {proyectos.map((proyecto) => (
                    <ProjectCard project={proyecto} key={proyecto.id} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                  <p className="text-muted mb-0">No hay proyectos disponibles</p>
                  <Link to="/crear-proyecto" className="btn btn-primary mt-3">
                    <i className="bi bi-plus-circle me-2"></i>
                    Crear Primer Proyecto
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
