/**
 * Dashboard page for Sum-Arte.
 * 
 * Displays executive dashboard with budget execution metrics,
 * expenses by item, and project summaries using charts.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
 * Dashboard component.
 */
const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, proyectosData] = await Promise.all([
        getDashboardMetrics(),
        getProjects(),
      ]);
      setMetrics(metricsData);
      setProyectos(proyectosData);
    } catch (error) {
      toast.error('Error al cargar los datos del dashboard');
      console.error('Error:', error);
    } finally {
      setLoading(false);
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

  if (!metrics) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">No hay datos disponibles.</div>
      </div>
    );
  }

  // Prepare data for charts
  const gastosPorItemData = metrics.gastos_por_item.slice(0, 10).map(item => ({
    name: item.item.length > 20 ? item.item.substring(0, 20) + '...' : item.item,
    monto: item.monto,
  }));

  const proyectosData = metrics.proyectos.map(proyecto => ({
    name: proyecto.nombre.length > 15 ? proyecto.nombre.substring(0, 15) + '...' : proyecto.nombre,
    ejecutado: proyecto.porcentaje_ejecutado,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard Ejecutivo</h1>
        <Link to="/registrar-gasto" className="btn btn-primary">
          Nuevo Gasto +
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-bg-primary">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Presupuesto Total</h6>
              <h3 className="card-title">
                ${metrics.resumen_general.presupuesto_total.toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-success">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Monto Ejecutado</h6>
              <h3 className="card-title">
                ${metrics.resumen_general.monto_ejecutado.toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-info">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">Monto Disponible</h6>
              <h3 className="card-title">
                ${metrics.resumen_general.monto_disponible.toLocaleString('es-CL')}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-bg-warning">
            <div className="card-body">
              <h6 className="card-subtitle mb-2">% Ejecutado</h6>
              <h3 className="card-title">
                {metrics.resumen_general.porcentaje_ejecutado.toFixed(1)}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Gastos por Ítem (Top 10)</h5>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gastosPorItemData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString('es-CL')}`} />
                  <Legend />
                  <Bar dataKey="monto" fill="#0088FE" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Estado de Rendiciones</h5>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'En Rendición', value: metrics.estado_rendiciones.en_rendicion },
                      { name: 'Completados', value: metrics.estado_rendiciones.completados },
                      { name: 'Activos', value: metrics.estado_rendiciones.activos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Proyectos</h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-center">
                {proyectos.map((proyecto) => (
                  <ProjectCard project={proyecto} key={proyecto.id} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
