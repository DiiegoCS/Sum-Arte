/**
 * Página para aceptar una invitación de usuario en Sum-Arte.
 * 
 * Permite a los usuarios aceptar una invitación mediante un token único,
 * creando su cuenta y uniéndose a la organización.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aceptarInvitacion, getInvitacion } from '../services/invitacionService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente AcceptInvitation.
 */
const AcceptInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });

  const [invitacion, setInvitacion] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [cargandoInvitacion, setCargandoInvitacion] = useState(true);
  const [errorInvitacion, setErrorInvitacion] = useState(null);

  useEffect(() => {
    if (token) {
      cargarInvitacion();
    } else {
      setErrorInvitacion('No se proporcionó un token de invitación válido.');
      setCargandoInvitacion(false);
    }
  }, [token]);

  /**
   * Carga la información de la invitación usando el token.
   */
  const cargarInvitacion = async () => {
    try {
      setCargandoInvitacion(true);
      // Intentar obtener la invitación desde el backend
      // Como no tenemos un endpoint directo por token, intentamos aceptar directamente
      // o podemos crear un endpoint GET /invitaciones/por_token/?token=xxx
      // Por ahora, solo validamos al intentar aceptar
      setCargandoInvitacion(false);
    } catch (error) {
      console.error('Error al cargar invitación:', error);
      setErrorInvitacion('Error al cargar la información de la invitación.');
      setCargandoInvitacion(false);
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

    // Validar coincidencia de contraseñas en tiempo real
    if (name === 'password_confirm' && formData.password) {
      if (value !== formData.password) {
        setErrors(prev => ({ ...prev, password_confirm: 'Las contraseñas no coinciden' }));
      } else {
        setErrors(prev => ({ ...prev, password_confirm: null }));
      }
    }
    if (name === 'password' && formData.password_confirm) {
      if (value !== formData.password_confirm) {
        setErrors(prev => ({ ...prev, password_confirm: 'Las contraseñas no coinciden' }));
      } else {
        setErrors(prev => ({ ...prev, password_confirm: null }));
      }
    }
  };

  /**
   * Valida que todos los campos requeridos del formulario estén completos.
   * @returns {boolean} true si el formulario es válido, false de lo contrario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.username.trim()) {
      nuevosErrores.username = 'El nombre de usuario es requerido';
    } else if (formData.username.trim().length < 3) {
      nuevosErrores.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!formData.password) {
      nuevosErrores.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!formData.password_confirm) {
      nuevosErrores.password_confirm = 'Debes confirmar la contraseña';
    } else if (formData.password !== formData.password_confirm) {
      nuevosErrores.password_confirm = 'Las contraseñas no coinciden';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Maneja el envío del formulario para aceptar la invitación.
   * @param {object} e Evento de React
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    if (!token) {
      toast.error('Token de invitación no válido');
      return;
    }

    setLoading(true);

    try {
      const datosAceptacion = {
        token: token,
        username: formData.username.trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
      };

      await aceptarInvitacion(datosAceptacion);
      
      toast.success('Invitación aceptada exitosamente. Redirigiendo al login...');
      
      // Redirigir al login después de un breve delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Error al aceptar invitación:', error);
      
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
                            'Error al aceptar la invitación';
        toast.error(mensajeError);
        
        // Si el token es inválido o expirado, mostrar mensaje específico
        if (mensajeError.includes('expirado') || mensajeError.includes('inválido')) {
          setErrorInvitacion(mensajeError);
        }
      } else {
        toast.error('Error al aceptar la invitación. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (cargandoInvitacion) {
    return (
      <div className="container">
        <div className="row justify-content-center mt-5">
          <div className="col-md-6">
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3">Cargando información de la invitación...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorInvitacion && !token) {
    return (
      <div className="container">
        <div className="row justify-content-center mt-5">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-body text-center">
                <h5 className="card-title text-danger">Error</h5>
                <p className="card-text">{errorInvitacion}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/login')}
                >
                  Ir al Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Sum-Arte</h2>
              <h5 className="text-center text-muted mb-4">Aceptar Invitación</h5>
              
              {errorInvitacion && (
                <div className="alert alert-danger" role="alert">
                  {errorInvitacion}
                </div>
              )}
              
              <p className="text-center text-muted mb-4">
                Completa el formulario para crear tu cuenta y unirte a la organización.
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Nombre de Usuario <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoFocus
                    placeholder="nombre_usuario"
                  />
                  {errors.username && (
                    <div className="invalid-feedback">{errors.username}</div>
                  )}
                  <small className="form-text text-muted">
                    El nombre de usuario debe ser único y tener al menos 3 caracteres.
                  </small>
                </div>

                <div className="mb-3">
                  <label htmlFor="first_name" className="form-label">
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="last_name" className="form-label">
                    Apellido
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Tu apellido"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Contraseña <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="password_confirm" className="form-label">
                    Confirmar Contraseña <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className={`form-control ${errors.password_confirm ? 'is-invalid' : ''}`}
                    id="password_confirm"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    required
                    placeholder="Repite la contraseña"
                  />
                  {errors.password_confirm && (
                    <div className="invalid-feedback">{errors.password_confirm}</div>
                  )}
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creando cuenta...' : 'Aceptar Invitación y Crear Cuenta'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/login')}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default AcceptInvitation;

