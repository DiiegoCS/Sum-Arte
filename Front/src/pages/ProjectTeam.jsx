/**
 * Página para gestionar el equipo de un proyecto en Sum-Arte.
 * 
 * Permite a los administradores de proyecto:
 * - Ver la lista de usuarios del equipo con sus roles
 * - Agregar usuarios al equipo
 * - Quitar usuarios del equipo
 * - Cambiar roles de usuarios
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipoProyecto, agregarUsuarioEquipo, quitarUsuarioEquipo, cambiarRolEquipo } from '../services/projectService';
import { getUsuarios } from '../services/userService';
import { getProject } from '../services/projectService';
import api from '../services/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente ProjectTeam.
 */
const ProjectTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [equipo, setEquipo] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agregandoUsuario, setAgregandoUsuario] = useState(false);
  const [formData, setFormData] = useState({
    usuario_id: '',
    rol_id: '',
  });

  useEffect(() => {
    cargarDatos();
  }, [id]);

  /**
   * Carga todos los datos necesarios.
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [proyectoData, equipoData, usuariosData, rolesData] = await Promise.all([
        getProject(id),
        getEquipoProyecto(id),
        getUsuarios(),
        api.get('/roles/').then(res => res.data.results || res.data),
      ]);

      setProyecto(proyectoData);
      setEquipo(Array.isArray(equipoData) ? equipoData : []);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos del equipo');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de campos del formulario.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Maneja el envío del formulario para agregar usuario.
   */
  const handleAgregarUsuario = async (e) => {
    e.preventDefault();

    if (!formData.usuario_id || !formData.rol_id) {
      toast.error('Por favor, selecciona un usuario y un rol');
      return;
    }

    setAgregandoUsuario(true);

    try {
      await agregarUsuarioEquipo(id, formData.usuario_id, formData.rol_id);
      toast.success('Usuario agregado al equipo exitosamente');
      setFormData({ usuario_id: '', rol_id: '' });
      await cargarDatos();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                          error.response?.data?.mensaje || 
                          error.message || 
                          'Error al agregar usuario al equipo';
      toast.error(mensajeError);
    } finally {
      setAgregandoUsuario(false);
    }
  };

  /**
   * Maneja la eliminación de un usuario del equipo.
   */
  const handleQuitarUsuario = async (usuarioId) => {
    if (!window.confirm('¿Estás seguro de que deseas quitar este usuario del equipo?')) {
      return;
    }

    try {
      await quitarUsuarioEquipo(id, usuarioId);
      toast.success('Usuario removido del equipo exitosamente');
      await cargarDatos();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                          error.response?.data?.mensaje || 
                          error.message || 
                          'Error al quitar usuario del equipo';
      toast.error(mensajeError);
    }
  };

  /**
   * Maneja el cambio de rol de un usuario.
   */
  const handleCambiarRol = async (usuarioId, nuevoRolId) => {
    if (!window.confirm('¿Estás seguro de que deseas cambiar el rol de este usuario? Esto eliminará todos sus roles actuales.')) {
      return;
    }

    try {
      await cambiarRolEquipo(id, usuarioId, nuevoRolId);
      toast.success('Rol del usuario actualizado exitosamente');
      await cargarDatos();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                          error.response?.data?.mensaje || 
                          error.message || 
                          'Error al cambiar el rol del usuario';
      toast.error(mensajeError);
    }
  };

  /**
   * Obtiene los usuarios que no están en el equipo.
   */
  const getUsuariosDisponibles = () => {
    const usuariosEnEquipo = equipo.map(miembro => miembro.usuario_id);
    return usuarios.filter(usuario => !usuariosEnEquipo.includes(usuario.id));
  };

  /**
   * Obtiene el badge de color para un rol.
   */
  const getRolBadgeClass = (rolNombre) => {
    const clases = {
      'admin proyecto': 'bg-primary',
      'ejecutor': 'bg-success',
      'auditor': 'bg-info',
      'directivo': 'bg-warning',
      'superadmin': 'bg-danger',
    };
    return clases[rolNombre] || 'bg-secondary';
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

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Equipo del Proyecto</h2>
              {proyecto && (
                <p className="text-muted mb-0">{proyecto.nombre_proyecto}</p>
              )}
            </div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/proyecto/${id}`)}
            >
              Volver al Proyecto
            </button>
          </div>
        </div>
      </div>

      {/* Formulario para agregar usuario */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-body">
              <h5 className="card-title mb-4">Agregar Usuario al Equipo</h5>
              <form onSubmit={handleAgregarUsuario}>
                <div className="row">
                  <div className="col-md-5 mb-3">
                    <label htmlFor="usuario_id" className="form-label">
                      Usuario <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="usuario_id"
                      name="usuario_id"
                      value={formData.usuario_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecciona un usuario</option>
                      {getUsuariosDisponibles().map(usuario => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.first_name || usuario.last_name 
                            ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim()
                            : usuario.username} ({usuario.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-5 mb-3">
                    <label htmlFor="rol_id" className="form-label">
                      Rol <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="rol_id"
                      name="rol_id"
                      value={formData.rol_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecciona un rol</option>
                      {roles.map(rol => (
                        <option key={rol.id} value={rol.id}>
                          {rol.nombre_rol}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2 mb-3 d-flex align-items-end">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={agregandoUsuario || getUsuariosDisponibles().length === 0}
                    >
                      {agregandoUsuario ? 'Agregando...' : 'Agregar'}
                    </button>
                  </div>
                </div>
                {getUsuariosDisponibles().length === 0 && (
                  <div className="alert alert-info mb-0">
                    Todos los usuarios de la organización ya están en el equipo.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Lista del equipo */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-body">
              <h5 className="card-title mb-4">Miembros del Equipo</h5>
              
              {equipo.length === 0 ? (
                <p className="text-muted text-center">No hay usuarios en el equipo</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Roles</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipo.map((miembro) => (
                        <tr key={miembro.usuario_id}>
                          <td>
                            <strong>{miembro.nombre_completo || miembro.username}</strong>
                            <br />
                            <small className="text-muted">@{miembro.username}</small>
                          </td>
                          <td>{miembro.email}</td>
                          <td>
                            {miembro.roles && miembro.roles.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {miembro.roles.map((rol, index) => (
                                  <span
                                    key={index}
                                    className={`badge ${getRolBadgeClass(rol.nombre)} text-white`}
                                  >
                                    {rol.nombre}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">Sin roles</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <select
                                className="form-select form-select-sm"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleCambiarRol(miembro.usuario_id, parseInt(e.target.value));
                                    e.target.value = ''; // Reset
                                  }
                                }}
                                title="Cambiar rol"
                                style={{ width: 'auto', minWidth: '150px' }}
                              >
                                <option value="">Cambiar rol...</option>
                                {roles.map(rol => (
                                  <option key={rol.id} value={rol.id}>
                                    {rol.nombre_rol}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleQuitarUsuario(miembro.usuario_id)}
                                title="Quitar del equipo"
                              >
                                Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ProjectTeam;

