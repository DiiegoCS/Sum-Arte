/**
 * Página de perfil de usuario para Sum-Arte.
 * 
 * Permite a los usuarios editar su información personal:
 * - Nombre y apellido
 * - Email
 * - Contraseña
 * 
 * No permite editar campos del sistema como username u organización.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMiPerfil, updateMiPerfil } from '../services/userService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Componente para mostrar y editar el perfil del usuario.
 */
const UserProfile = () => {
  const navigate = useNavigate();
  const { user: authUser, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: ''
  });
  const [errors, setErrors] = useState({});
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    cargarPerfil();
  }, []);

  /**
   * Carga los datos del perfil del usuario.
   */
  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const data = await getMiPerfil();
      setUserData(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        password: '',
        password_confirm: ''
      });
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      toast.error('Error al cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja los cambios en los campos del formulario.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Valida el formulario antes de enviar.
   */
  const validateForm = () => {
    const newErrors = {};
    
    // Validar email si se proporciona
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido.';
    }
    
    // Validar contraseñas si se proporcionan
    if (formData.password || formData.password_confirm) {
      if (!formData.password) {
        newErrors.password = 'Debe proporcionar una nueva contraseña.';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
      }
      
      if (!formData.password_confirm) {
        newErrors.password_confirm = 'Debe confirmar la nueva contraseña.';
      } else if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Las contraseñas no coinciden.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija los errores en el formulario');
      return;
    }
    
    setSaving(true);
    
    try {
      // Preparar datos para enviar (solo los que tienen valor)
      const updateData = {};
      
      if (formData.first_name !== (userData?.first_name || '')) {
        updateData.first_name = formData.first_name;
      }
      if (formData.last_name !== (userData?.last_name || '')) {
        updateData.last_name = formData.last_name;
      }
      if (formData.email !== (userData?.email || '')) {
        updateData.email = formData.email;
      }
      if (formData.password) {
        updateData.password = formData.password;
        updateData.password_confirm = formData.password_confirm;
      }
      
      // Si no hay cambios, no enviar
      if (Object.keys(updateData).length === 0) {
        toast.info('No hay cambios para guardar');
        setSaving(false);
        return;
      }
      
      const resultado = await updateMiPerfil(updateData);
      
      toast.success(resultado.mensaje || 'Perfil actualizado exitosamente');
      
      // Refrescar datos del usuario en el contexto
      await refreshUser();
      
      // Recargar perfil para mostrar datos actualizados
      await cargarPerfil();
      
      // Limpiar campos de contraseña
      setFormData(prev => ({
        ...prev,
        password: '',
        password_confirm: ''
      }));
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      
      // Manejar errores de validación del backend
      if (error.response?.data) {
        const backendErrors = error.response.data;
        
        // Si hay errores de campo específicos, mostrarlos
        const fieldErrors = {};
        Object.keys(backendErrors).forEach(key => {
          if (Array.isArray(backendErrors[key])) {
            fieldErrors[key] = backendErrors[key][0];
          } else if (typeof backendErrors[key] === 'string') {
            fieldErrors[key] = backendErrors[key];
          }
        });
        
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
        
        // Mostrar mensaje general si hay error no relacionado con campos
        const errorMessage = backendErrors.error || backendErrors.detail || 'Error al actualizar el perfil';
        toast.error(errorMessage);
      } else {
        toast.error('Error al actualizar el perfil');
      }
    } finally {
      setSaving(false);
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

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Mi Perfil</h1>
          <p className="text-muted">Gestiona tu información personal</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/')}
          disabled={saving}
        >
          Volver
        </button>
      </div>

      {/* Información del sistema (solo lectura) */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Información del Sistema</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label text-muted">Nombre de Usuario</label>
              <p className="form-control-plaintext">{userData?.username}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label text-muted">Organización</label>
              <p className="form-control-plaintext">
                {userData?.organizacion_nombre || 'Sin organización asignada'}
              </p>
            </div>
          </div>
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Esta información no puede ser modificada desde aquí. Contacta a un administrador si necesitas cambiarla.
          </small>
        </div>
      </div>

      {/* Formulario de edición */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Información Personal</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Nombre */}
              <div className="col-md-6 mb-3">
                <label htmlFor="first_name" className="form-label">
                  Nombre
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  disabled={saving}
                />
                {errors.first_name && (
                  <div className="invalid-feedback">{errors.first_name}</div>
                )}
              </div>

              {/* Apellido */}
              <div className="col-md-6 mb-3">
                <label htmlFor="last_name" className="form-label">
                  Apellido
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                  disabled={saving}
                />
                {errors.last_name && (
                  <div className="invalid-feedback">{errors.last_name}</div>
                )}
              </div>

              {/* Email */}
              <div className="col-md-12 mb-3">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu.email@ejemplo.com"
                  disabled={saving}
                />
                {errors.email && (
                  <div className="invalid-feedback">{errors.email}</div>
                )}
              </div>

              {/* Separador para cambio de contraseña */}
              <div className="col-12">
                <hr />
                <h6 className="mb-3">Cambiar Contraseña (Opcional)</h6>
                <small className="text-muted d-block mb-3">
                  Deja estos campos vacíos si no deseas cambiar tu contraseña.
                </small>
              </div>

              {/* Nueva Contraseña */}
              <div className="col-md-6 mb-3">
                <label htmlFor="password" className="form-label">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  disabled={saving}
                />
                {errors.password && (
                  <div className="invalid-feedback">{errors.password}</div>
                )}
              </div>

              {/* Confirmar Contraseña */}
              <div className="col-md-6 mb-3">
                <label htmlFor="password_confirm" className="form-label">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.password_confirm ? 'is-invalid' : ''}`}
                  id="password_confirm"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="Repite la contraseña"
                  disabled={saving}
                />
                {errors.password_confirm && (
                  <div className="invalid-feedback">{errors.password_confirm}</div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

