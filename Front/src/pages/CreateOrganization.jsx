/**
 * Página para crear una nueva organización en Sum-Arte.
 * 
 * Permite a los usuarios crear una organización con validación de RUT chileno
 * y asignación automática de la organización al usuario creador.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOrganizacion, verificarRUT } from '../services/organizacionService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente CreateOrganization.
 */
const CreateOrganization = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    nombre_organizacion: '',
    rut_organizacion: '',
    plan_suscripcion: 'mensual',
    fecha_inicio_suscripcion: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verificandoRUT, setVerificandoRUT] = useState(false);
  const [rutValido, setRutValido] = useState(null); // null: no verificado, true: válido, false: inválido

  // Si el usuario ya tiene organización, redirigir al dashboard
  useEffect(() => {
    if (user && user.id_organizacion) {
      toast.info('Ya perteneces a una organización.');
      navigate('/');
    }
  }, [user, navigate]);

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

    // Si se modifica el RUT, reinicia la validación
    if (name === 'rut_organizacion') {
      setRutValido(null);
    }
  };

  /**
   * Verifica la disponibilidad del RUT en tiempo real.
   * Se ejecuta cuando el usuario termina de escribir el RUT.
   */
  const handleRUTBlur = async () => {
    const rut = formData.rut_organizacion.trim();
    
    if (!rut) {
      setRutValido(null);
      return;
    }

    setVerificandoRUT(true);
    try {
      const resultado = await verificarRUT(rut);
      
      if (resultado.disponible) {
        setRutValido(true);
        setErrors(prev => ({ ...prev, rut_organizacion: null }));
        toast.success('RUT válido y disponible');
      } else {
        setRutValido(false);
        setErrors(prev => ({ ...prev, rut_organizacion: resultado.mensaje }));
        toast.error(resultado.mensaje);
      }
    } catch (error) {
      setRutValido(false);
      const mensajeError = error.response?.data?.mensaje || 
                          error.response?.data?.error || 
                          'Error al verificar el RUT';
      setErrors(prev => ({ ...prev, rut_organizacion: mensajeError }));
      toast.error(mensajeError);
    } finally {
      setVerificandoRUT(false);
    }
  };

  /**
   * Valida que todos los campos requeridos del formulario estén completos.
   * @returns {boolean} true si el formulario es válido, false de lo contrario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre_organizacion.trim()) {
      nuevosErrores.nombre_organizacion = 'El nombre de la organización es requerido';
    } else if (formData.nombre_organizacion.trim().length < 3) {
      nuevosErrores.nombre_organizacion = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.rut_organizacion.trim()) {
      nuevosErrores.rut_organizacion = 'El RUT es requerido';
    } else if (rutValido === false) {
      nuevosErrores.rut_organizacion = 'El RUT no es válido o ya está registrado';
    } else if (rutValido === null) {
      nuevosErrores.rut_organizacion = 'Por favor, verifica el RUT';
    }

    if (!formData.fecha_inicio_suscripcion) {
      nuevosErrores.fecha_inicio_suscripcion = 'La fecha de inicio es requerida';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Maneja el envío del formulario para crear la organización.
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
      const organizacionData = {
        nombre_organizacion: formData.nombre_organizacion.trim(),
        rut_organizacion: formData.rut_organizacion.trim(),
        plan_suscripcion: formData.plan_suscripcion,
        fecha_inicio_suscripcion: formData.fecha_inicio_suscripcion,
      };

      const organizacion = await createOrganizacion(organizacionData);
      
      toast.success('Organización creada exitosamente. Serás redirigido al dashboard.');
      
      // Nota: El backend asigna automáticamente la organización al usuario.
      // El token JWT se actualizará en el próximo login.
      // Por ahora, redirigimos al dashboard.
      
      // Redirigir al dashboard después de un breve delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error al crear organización:', error);
      
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
                            'Error al crear la organización';
        toast.error(mensajeError);
      } else {
        toast.error('Error al crear la organización. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-8 col-lg-12">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Sum-Arte</h2>
              <h5 className="text-center text-muted mb-4">Crear Organización</h5>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="nombre_organizacion" className="form-label">
                    Nombre de la Organización <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nombre_organizacion ? 'is-invalid' : ''}`}
                    id="nombre_organizacion"
                    name="nombre_organizacion"
                    value={formData.nombre_organizacion}
                    onChange={handleChange}
                    required
                    autoFocus
                    placeholder="Ej: Fundación Cultural Local"
                  />
                  {errors.nombre_organizacion && (
                    <div className="invalid-feedback">{errors.nombre_organizacion}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="rut_organizacion" className="form-label">
                    RUT de la Organización <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className={`form-control ${errors.rut_organizacion ? 'is-invalid' : ''} ${rutValido === true ? 'is-valid' : ''}`}
                      id="rut_organizacion"
                      name="rut_organizacion"
                      value={formData.rut_organizacion}
                      onChange={handleChange}
                      onBlur={handleRUTBlur}
                      required
                      placeholder="12345678-9"
                      maxLength={13}
                    />
                    {verificandoRUT && (
                      <span className="input-group-text">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      </span>
                    )}
                  </div>
                  {errors.rut_organizacion && (
                    <div className="invalid-feedback">{errors.rut_organizacion}</div>
                  )}
                  {rutValido === true && !errors.rut_organizacion && (
                    <div className="valid-feedback">RUT válido y disponible</div>
                  )}
                  <small className="form-text text-muted">
                    Formato: 12345678-9 (puedes incluir puntos)
                  </small>
                </div>

                <div className="mb-3">
                  <label htmlFor="plan_suscripcion" className="form-label">
                    Plan de Suscripción <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    id="plan_suscripcion"
                    name="plan_suscripcion"
                    value={formData.plan_suscripcion}
                    onChange={handleChange}
                    required
                  >
                    <option value="mensual">Mensual</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="fecha_inicio_suscripcion" className="form-label">
                    Fecha de Inicio de Suscripción <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${errors.fecha_inicio_suscripcion ? 'is-invalid' : ''}`}
                    id="fecha_inicio_suscripcion"
                    name="fecha_inicio_suscripcion"
                    value={formData.fecha_inicio_suscripcion}
                    onChange={handleChange}
                    required
                  />
                  {errors.fecha_inicio_suscripcion && (
                    <div className="invalid-feedback">{errors.fecha_inicio_suscripcion}</div>
                  )}
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || verificandoRUT}
                  >
                    {loading ? 'Creando organización...' : 'Crear Organización'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/')}
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

export default CreateOrganization;

