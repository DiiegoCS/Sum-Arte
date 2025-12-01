/**
 * Página para invitar usuarios a la organización en Sum-Arte.
 * 
 * Permite a los usuarios de una organización invitar nuevos miembros
 * mediante email, con opción de sugerir nombre, apellido y username.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvitaciones, crearInvitacion, reenviarInvitacion, cancelarInvitacion } from '../services/invitacionService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente InviteUser.
 */
const InviteUser = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    nombre_sugerido: '',
    apellido_sugerido: '',
    username_sugerido: '',
  });

  const [invitaciones, setInvitaciones] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cargandoInvitaciones, setCargandoInvitaciones] = useState(true);

  useEffect(() => {
    cargarInvitaciones();
  }, []);

  /**
   * Carga la lista de invitaciones pendientes.
   */
  const cargarInvitaciones = async () => {
    try {
      setCargandoInvitaciones(true);
      const data = await getInvitaciones();
      setInvitaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar invitaciones:', error);
      toast.error('Error al cargar las invitaciones');
    } finally {
      setCargandoInvitaciones(false);
    }
  };

  /**
   * Maneja el cambio de cualquier campo del formulario.
   * @param {object} e Evento de React
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpia el error para el campo modificado
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Valida que todos los campos requeridos del formulario estén completos.
   * @returns {boolean} true si el formulario es válido, false de lo contrario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'El email no es válido';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Maneja el envío del formulario para crear la invitación.
   * @param {object} e Evento de React
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setLoading(true);

    try {
      const invitacionData = {
        email: formData.email.trim().toLowerCase(),
        nombre_sugerido: formData.nombre_sugerido.trim() || undefined,
        apellido_sugerido: formData.apellido_sugerido.trim() || undefined,
        username_sugerido: formData.username_sugerido.trim() || undefined,
      };

      await crearInvitacion(invitacionData);
      
      toast.success('Invitación enviada exitosamente');
      
      // Limpiar formulario
      setFormData({
        email: '',
        nombre_sugerido: '',
        apellido_sugerido: '',
        username_sugerido: '',
      });
      
      // Recargar lista de invitaciones
      await cargarInvitaciones();
    } catch (error) {
      console.error('Error al crear invitación:', error);
      
      // Manejar errores de validación del backend
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Errores de campo específico
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(key => {
            const mensaje = Array.isArray(errorData[key]) 
              ? errorData[key][0] 
              : errorData[key];
            setErrors(prev => ({ ...prev, [key]: mensaje }));
          });
        }
        
        const mensajeError = errorData.detail || 
                            errorData.error || 
                            errorData.mensaje || 
                            'Error al crear la invitación';
        toast.error(mensajeError);
      } else {
        toast.error('Error al crear la invitación. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el reenvío de una invitación.
   * @param {number} invitacionId - ID de la invitación
   */
  const handleReenviar = async (invitacionId) => {
    try {
      await reenviarInvitacion(invitacionId);
      toast.success('Invitación reenviada exitosamente');
      await cargarInvitaciones();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          'Error al reenviar la invitación';
      toast.error(mensajeError);
    }
  };

  /**
   * Maneja la cancelación de una invitación.
   * @param {number} invitacionId - ID de la invitación
   */
  const handleCancelar = async (invitacionId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta invitación?')) {
      return;
    }

    try {
      await cancelarInvitacion(invitacionId);
      toast.success('Invitación cancelada exitosamente');
      await cargarInvitaciones();
    } catch (error) {
      const mensajeError = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          'Error al cancelar la invitación';
      toast.error(mensajeError);
    }
  };

  /**
   * Formatea la fecha para mostrar.
   * @param {string} fechaISO - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Obtiene el badge de estado para una invitación.
   * @param {Object} invitacion - Objeto de invitación
   * @returns {JSX.Element} Badge con el estado
   */
  const getEstadoBadge = (invitacion) => {
    const estados = {
      'pendiente': { clase: 'bg-warning', texto: 'Pendiente' },
      'aceptada': { clase: 'bg-success', texto: 'Aceptada' },
      'expirada': { clase: 'bg-secondary', texto: 'Expirada' },
      'cancelada': { clase: 'bg-danger', texto: 'Cancelada' },
    };

    const estado = estados[invitacion.estado] || estados['pendiente'];
    return (
      <span className={`badge ${estado.clase} text-white`}>
        {estado.texto}
      </span>
    );
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Invitar Usuarios</h2>
        </div>
      </div>

      <div className="row">
        {/* Formulario de invitación */}
        <div className="col-md-6">
          <div className="card shadow mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Nueva Invitación</h5>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="usuario@ejemplo.com"
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="nombre_sugerido" className="form-label">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="nombre_sugerido"
                    name="nombre_sugerido"
                    value={formData.nombre_sugerido}
                    onChange={handleChange}
                    placeholder="Nombre del usuario"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="apellido_sugerido" className="form-label">
                    Apellido (opcional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="apellido_sugerido"
                    name="apellido_sugerido"
                    value={formData.apellido_sugerido}
                    onChange={handleChange}
                    placeholder="Apellido del usuario"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="username_sugerido" className="form-label">
                    Username sugerido (opcional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username_sugerido"
                    name="username_sugerido"
                    value={formData.username_sugerido}
                    onChange={handleChange}
                    placeholder="nombre_usuario"
                  />
                  <small className="form-text text-muted">
                    El usuario podrá elegir su propio username al aceptar la invitación.
                  </small>
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Enviando invitación...' : 'Enviar Invitación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Lista de invitaciones */}
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body">
              <h5 className="card-title mb-4">Invitaciones Enviadas</h5>
              
              {cargandoInvitaciones ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : invitaciones.length === 0 ? (
                <p className="text-muted text-center">No hay invitaciones enviadas</p>
              ) : (
                <div className="list-group">
                  {invitaciones.map((invitacion) => (
                    <div key={invitacion.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{invitacion.email}</strong>
                          {getEstadoBadge(invitacion)}
                        </div>
                        <div>
                          {invitacion.estado === 'pendiente' && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => handleReenviar(invitacion.id)}
                                title="Reenviar invitación"
                              >
                                Reenviar
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancelar(invitacion.id)}
                                title="Cancelar invitación"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="small text-muted">
                        <div>Invitado por: {invitacion.invitado_por_nombre || 'N/A'}</div>
                        <div>Fecha: {formatearFecha(invitacion.fecha_invitacion)}</div>
                        {invitacion.dias_restantes !== null && invitacion.dias_restantes !== undefined && (
                          <div>
                            Expira en: {invitacion.dias_restantes} día(s)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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

export default InviteUser;

